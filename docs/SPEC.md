# Retirement Scenario Explorer — Feature Spec

_Living document. Update as features change. See `DECISIONS.md` for rationale on key
choices (once established). Organized by feature/user-facing domain rather than by
source file, so it stays accurate across internal refactors. Known gaps are noted
inline rather than glossed over — see `ISSUES.md` and `docs/AUDIT.md` for the full
backlog._

---

## 1. Scenario Data Model

A scenario is a single JSON object (keyed by a unique scenario ID) describing a
retirement plan to simulate. Full machine-readable schema:
`docs/scenario-schema.json`; narrative walkthrough and migration notes:
`docs/schema-documentation.md` and `docs/schema-readme.md`. This section covers the
primitives and their current (not just intended) behavior.

### 1.1 Core philosophy: everything is an asset

There are no separate `events[]`, `liabilities[]`, or `shocks[]` constructs. A
windfall, a one-time expense, a future account, or an emergency reserve are all
expressed as entries in `assets[]` — distinguished only by balance sign (negative =
planned future expense), `start_month` (when it becomes available), and
`min_balance` (a floor it can't be drawn below). See README § Key Insight for the
original rationale.

### 1.2 `plan` (required)

| Field | Type | Notes |
|---|---|---|
| `monthly_expenses` | number, required | Fixed monthly living cost, current dollars |
| `duration_months` | integer, required | Months to simulate |
| `inflation_schedule` | string | Reference into `rate_schedules{}` for inflation |
| `inflation_rate` | number | Legacy fixed-rate alternative to `inflation_schedule` |
| `stop_on_shortfall` | boolean, default `true` | Stop simulation when assets are depleted |
| `start_date` | date string | Optional, for display only |
| `tax_config` | object | Per-account-type tax rates: `tax_deferred` (default 0.22), `taxable` (default 0.15), `tax_free` (default 0) |

### 1.3 `assets[]` (required, min 1)

| Field | Type | Notes |
|---|---|---|
| `name` | string, required | Must be unique; referenced by `order[].account` |
| `balance` | number, required | Starting balance; **negative = planned future expense** |
| `type` | enum: `taxable` \| `tax_deferred` \| `tax_free`, default `taxable` | Drives which `tax_config` rate applies on withdrawal |
| `min_balance` | number, default 0 | Floor the asset can't be drawn below (emergency-fund pattern) |
| `return_schedule` | string | Reference into `rate_schedules{}` |
| `interest_rate` | number | Legacy fixed-rate alternative to `return_schedule` |
| `compounding` | enum: `monthly` \| `annual`, default `monthly` | |
| `start_month` | integer, default 0 | Month the asset becomes available — see §2.3 for activation mechanics |
| `notes` | string | Free text, display only |

Schema also defines `withdrawal_limit` and `early_withdrawal_penalty`, both
explicitly marked `Future:` — not implemented, not exposed in any UI.

### 1.4 `income[]` (optional)

| Field | Type | Notes |
|---|---|---|
| `name` | string, required | |
| `amount` | number, required | Monthly amount; negative = recurring expense |
| `start_month` | integer | 1 = first month |
| `stop_month` | integer | Omit for permanent income |
| `notes` | string | Display only |

Schema also defines `inflation_adjustment` and `tax_treatment` on income entries,
both marked `Future:` — not implemented.

### 1.5 `order[]` (optional) — withdrawal priority

| Field | Type | Notes |
|---|---|---|
| `account` | string, required | Must exactly match an `assets[].name` |
| `order` | integer, required | 1 = drawn first |
| `weight` | number | When multiple accounts share the same `order`, shortfall is split proportionally by weight (default weight 1 if omitted). See §2 for the mechanics. |
| `notes` | string | Display only |

A legacy `withdrawal_priority[]` field (`{account, priority}`) is still accepted by
the schema but superseded by `order[]`.

### 1.6 `deposits[]` (optional)

Recurring or one-time deposits into a named asset over a month range —
`{name, target, amount, start_month, stop_month}`. Implemented in the engine
(`timeaware-engine.js`, reads `scenario.deposits`) but not documented in the README's
"Common Scenarios" walkthrough or exposed in the Scenario Builder UI — currently a
JSON-only, power-user feature.

### 1.7 `rate_schedules{}` (optional)

Named, reusable rate definitions referenced by `plan.inflation_schedule` and
`assets[].return_schedule`. Four types, all implemented
(`scripts/rate-schedules.js`): `fixed` (flat annual rate), `sequence` (array of
annual rates by year offset), `map` (explicit start/stop year periods with a rate
each), `pipeline` (composable operations — the most flexible and least documented;
see `docs/schema-documentation.md` §3 for the operation list).

### 1.8 Known gaps in this layer

- **`ValidationService.validateAsset()` checks against a different vocabulary than
  the live schema.** It validates `asset.type` against
  `['401k', 'ira', 'roth_ira', 'savings', 'investment', 'pension', 'social_security']`
  and reads `asset.annual_growth_rate`, `plan.retirement_age`, `plan.life_expectancy`
  — none of which exist in `scenario-schema.json` or are read by the simulation
  engine (which uses `taxable`/`tax_deferred`/`tax_free`, `interest_rate`/
  `return_schedule`). This is wired into the live scenario-load path
  (`ScenarioController.js`), so it runs on every scenario — but its output
  (`result.warnings`/`result.suggestions`) is never rendered anywhere in the UI, so
  today the mismatch is silent/inert rather than user-visible. Only `result.errors`
  (missing `plan`/`assets`) has any observable effect. Worth fixing or removing
  before this validation path is ever surfaced to a user.

---

## 2. Simulation Engine

`scripts/timeaware-engine.js`, a single exported function
`simulateScenarioAdvanced(scenario)` (~630 lines, no class). This is the most
heavily tested file in the codebase (92% coverage) and the piece of business logic
that holds up best under scrutiny — with two real caveats documented in §2.5–2.6
below, both re-verified directly against the running code for this spec rather than
taken on faith from older notes.

### 2.1 The monthly loop

For each month from 0 to `duration_months - 1`:

1. Activate any delayed assets whose `start_month` is reached this month (§2.3)
2. Apply scheduled `deposits[]` targeting this month
3. Sum income (`getMonthlyIncome()`), compute inflation-adjusted
   `monthly_expenses`, derive `shortfall = expenses - income`
4. Cover the shortfall via withdrawal (§2.2) — iterates up to 5 passes to converge
   on a tax-inclusive gross withdrawal
5. Apply growth to every active asset (`interest_rate`/`return_schedule`, monthly or
   annual compounding) — skipped once auto-stop has triggered (§2.4)
6. Record the month's log (income, expenses, withdrawals, any leftover shortfall)
   and each asset's end-of-month balance into `balanceHistory`
7. Check the auto-stop condition (§2.4)

### 2.2 Withdrawal order and proportional (weighted) withdrawals

- `order[]` entries are grouped by `order` value and processed lowest-first; a group
  is fully exhausted before the next group is touched.
- Within a group: if any entry has a `weight`, withdrawal splits proportionally by
  weight (zero-weight entries are skipped entirely); with no weights, multiple
  available assets in the same group split evenly.
- Withdrawal is tax-aware: `TaxService.calculateGrossWithdrawal()` grosses up the
  requested net amount by the asset's type-specific rate from `plan.tax_config`
  (`gross = net / (1 - rate)`) before debiting the balance — a $4,000 net need
  against a default-rate (15%) taxable account actually debits ~$4,706.
- `min_balance` is a hard floor: available balance for withdrawal is always
  `balance - min_balance`. Proportional withdrawal additionally throttles an asset's
  weight downward as it nears its floor, so the last dollars in a weighted group
  don't overdraw one account ahead of another.

### 2.3 Delayed asset activation

Assets are split once at the start of the run: `start_month` falsy or `<= 1` ⇒
immediate; `start_month > 1` ⇒ delayed (held out of the active asset map entirely
until activation). Each month, `activateDelayedAssets()` checks for an exact match
(`start_month === currentMonth`, 1-based) and splices the asset in at full starting
balance, with no growth applied in its activation month — it starts compounding the
following month.

**Re-verified directly against the current engine** (re-running the exact scenario
from `INTEGRATION_TEST_ISSUES.md` Issue #2 — a $100,000 asset with `start_month:
12`): the asset activates at the correct month with its full balance and behaves
normally from there. The issue doc and the still-skipped test
(`tests/integration/timeaware-engine-real.test.js`) both describe this as
non-functional — that appears to be **stale**. The underlying logic has since been
fixed without the issue or test being updated. Recommend re-enabling the skipped
test and closing the issue rather than treating this as open work.

### 2.4 Auto-stop and shortfall handling

- `plan.stop_on_shortfall` (default `true`) and `plan.min_duration` (default 0) gate
  auto-stop.
- Each month past `min_duration`, if there's an uncovered shortfall **and** either no
  meaningful assets remain or the shortfall exceeds 1.5× total available assets, the
  simulation halts early — `actualDuration` is set and remaining months are simply
  never simulated.
- After auto-stop, asset growth is frozen: balances hold flat for any further
  recorded months instead of continuing to compound.

### 2.5 Negative-balance ("planned expense") assets — actual behavior

Per §1.1, a negative `balance` models a future one-time expense. In practice it's
just an asset with a negative number: never eligible for withdrawal (available
balance clamps to `Math.max(0, balance - min_balance)`, which is 0 for any negative
balance), and — unless it has its own `return_schedule`/`interest_rate` — it never
changes. It sits as a permanent negative line in `balanceHistory`, with no
month-specific cash-flow effect of its own.

**`INTEGRATION_TEST_ISSUES.md` Issue #1 ("$4,000 discrepancy") was re-verified
directly** by re-running its exact scenario. The test computes an "initial total"
from `balanceHistory[name][0]`, but that index holds the **end-of-month-1** balance
(after that month's withdrawal and growth) — there is no point in the engine's
return value that exposes a true pre-simulation total. In the issue's scenario, the
$4,000 monthly expense is withdrawn from the one positive (taxable) asset and
grossed up by the default 15% capital-gains rate to ~$4,706 — which alone accounts
for the bulk of the reported "discrepancy." This is not a bug in how negative
balances are summed; it's a test asserting against a balance snapshot that was never
meant to represent the pre-simulation total. Recommend fixing or removing the test's
assumption rather than touching the engine.

### 2.6 Missing required fields — actual behavior

Re-verified directly: a scenario missing `plan.duration_months` does not throw, and
does not fall back to any default duration either. `maxDuration` becomes
`undefined`, the main loop's condition (`month < maxDuration`) is immediately
false, and the function returns a fully-formed but **completely empty** result
(zero months, empty balance history) — no error, no warning. This is a third option
beyond the "strict validation vs. graceful defaults" framing in
`INTEGRATION_TEST_ISSUES.md` Issue #3: a malformed scenario currently fails silently
with an empty result, rather than either a helpful error or a usable default.

---

## 3. Scenario Selection & Builder

### 3.1 Choosing a scenario

One dropdown (`#scenario-dropdown`, populated by `UIController.populateScenarioDropdown()`)
with three `<optgroup>`s, backed by two independent services:

| Group | Source | Service |
|---|---|---|
| 🎓 Learning Examples | `data/examples/catalog.json` + per-example files | `ExamplesService` |
| 📚 Built-in Scenarios | `data/scenarios/*.json` (4 files: learning-journey, naive, realistic, roth) | `ContentService` |
| 💾 Custom Scenarios | `localStorage['retirement-explorer-user-scenarios']` | `ContentService` |

The three groups are unified at the UI layer into one picker, but there are two
separate, independently-loaded content systems underneath (`ExamplesService` and
`ContentService`) with different schemas (catalog entries have `id`/`level`/`title`;
built-in/custom scenarios are keyed objects matching `scenario-schema.json`). Not a
bug, but worth knowing before extending either system — they don't share code today.

### 3.2 Scenario Builder — templates and manual entry

A modal (`ScenarioBuilderUI`, `scripts/ui/ScenarioBuilderUI.js`) for constructing a
scenario without hand-writing JSON. `ScenarioBuilderService` converts between this
form representation and the real JSON schema in both directions.

- **3 built-in templates** (`getTemplates()`): Simple Retirement (one taxable
  account), With Social Security (adds a delayed income source), Multiple Accounts
  (401k + Roth IRA + taxable, demonstrating withdrawal order across account types).
- **3 tax presets** (buttons, not schema-driven): Conservative (12%/0%/0%), Moderate
  (22%/15%/0%), High Earner (32%/20%/0%) — set `tax_deferred`/`taxable`/`tax_free`
  directly.
- **Asset/income row management**: add/remove rows, each asset row carries `name`,
  `type`, `balance`, `returnRate`, `minBalance`, `startMonth`, and — internal to the
  form model only — a flat `order` (and optional `weight`) field. This flat
  per-asset `order` is a form-layer convenience; it gets correctly expanded into the
  schema's separate top-level `order[]` array on save (`convertFormToJson()`,
  ScenarioBuilderService.js:307) and correctly collapsed back via an `orderMap` when
  loading existing JSON into the form (`convertJsonToForm()`, line 388) — both
  directions go through this method correctly. The Copy flow does not use either of
  them (3.3).

### 3.3 Copy Existing Scenario

Lets a user pick any built-in or custom scenario as a starting point for the
builder. **Two parallel, near-duplicate implementations exist for this one
feature** — `ScenarioBuilderService.copyScenario()`/`convertScenarioToFormData()`
and `ScenarioBuilderController.copyScenario()`/`convertScenarioToFormData()` — both
registered as listeners on the same `scenario-builder:copy-scenario` event, so both
fire on every copy click:

- The **Controller's** path is the one that actually completes: it emits
  `scenario-builder:load-scenario-for-copy` → `ContentService` resolves the
  `builtin:`/`custom:` key, emits `scenario-builder:scenario-loaded-for-copy` → the
  Controller's own `convertScenarioToFormData()` builds the form data and emits
  `scenario-builder:ui-load-form`, which the UI is actually listening for.
- The **Service's** path is effectively dead: it emits `content:get-scenario` with
  an object payload (`{key, type}`), but `ContentService`'s handler for that event
  expects a plain string key, so the lookup silently fails and the path dead-ends
  before producing anything visible.

**Root cause of the `ISSUES.md` bug ("copying a scenario resets all Withdrawal
Order values to 1")**: both copies of `convertScenarioToFormData()` contain the
identical line `order: asset.order || 1`, reading an `order` property directly off
the raw JSON asset object. But per §1.5, withdrawal order is never stored on the
asset itself — it lives in the separate top-level `order[]` array, keyed by asset
`name`. Since a real asset object never has `.order`, this always evaluates to `1`
for every asset. The correct pattern already exists elsewhere in the same file —
`ScenarioBuilderService.convertJsonToForm()` (§3.2) builds an `orderMap` from the
real `order[]` array and looks up each asset by name — but the Copy feature's
`convertScenarioToFormData()` was written independently (twice) and never reuses
it. **Fix is mechanical**: delete one of the two duplicate implementations, and have
the survivor look up order/weight via the same `orderMap` pattern `convertJsonToForm()`
already uses, instead of reading a non-existent field.

### 3.4 JSON editor (direct path)

`UIController` also exposes a raw JSON textarea (`toggleJsonEditor()`,
`saveJsonChanges()`, `validateJson()`) as a third way to create/edit a scenario,
parallel to the Builder modal. Its "validation" (`validateJson()`,
`UIController.js:989`) only checks for the presence of `metadata`/`plan`/`assets`
keys via `try/catch` on `JSON.parse` — it does not call `ValidationService` and
knows nothing about the schema beyond those three top-level keys.

### 3.5 Custom scenario persistence

Saved scenarios live in `localStorage['retirement-explorer-user-scenarios']` as a
flat `{key: scenarioJSON}` map, managed entirely by `ContentService`
(`saveUserScenario`/`loadUserScenarios`/`deleteUserScenario`/`getUserScenariosFromStorage`).
No size limit or quota handling beyond whatever the browser enforces on
`localStorage` itself.

---

## 4. Results & Visualization

All of this lives in `UIController.js` (§ see `docs/AUDIT.md` §3 on why that's a
problem for testability) — `displaySimulationResults()` is the entry point, called
once a simulation completes, which fans out to chart rendering, the scenario
synopsis, tax summary, and withdrawal detail.

### 4.1 Chart

`renderChart()` → `prepareChartData()` builds traces for **Plotly** (loaded as a
global `<script>` tag, not an npm dependency — `renderChart()` checks
`typeof Plotly === 'undefined'` and bails with a console warning if it's missing).
Plots account balances over time from `balanceHistory`, with month-count-aware tick
spacing. `prepareChartData()` alone is ~250 lines (`UIController.js:1355-1606`) and
is the single largest contributor to the file's size and low test coverage (see
`docs/AUDIT.md` §3).

### 4.2 Scenario synopsis ("Key Assumptions")

`extractKeyAssumptions()` (`UIController.js:831`) builds the human-readable summary
shown alongside a loaded scenario — plan info, asset list, income list, rate
schedules, drawdown order.

**`ISSUES.md` Issue 2a, root-caused.** The income summary line does:
```js
if (income.start_month) details.push(`starts month ${income.start_month}`);
if (income.end_month) details.push(`ends month ${income.end_month}`);
```
The schema field is `stop_month` (§1.4) — `end_month` doesn't exist anywhere in the
scenario data model, so that condition is always false and the "ends month N" detail
never renders, regardless of whether the income source actually has a `stop_month`.
One-line fix: `income.end_month` → `income.stop_month`.

This same function also reads `scenario.plan?.retirement_age` and
`scenario.plan?.life_expectancy` (lines 843–848) — neither field exists in
`scenario-schema.json` either. This is the same orphaned-vocabulary pattern as `ValidationService` (§1.8) — and it's
not limited to those two files. A repo-wide check for five schema-less fields
(`retirement_age`, `life_expectancy`, `annual_growth_rate`, `initial_value`,
`end_month`) turned up references in **`ValidationService.js`, `UIController.js`,
`ScenarioController.js`, and `SimulationService.js`** — four files carrying remnants
of a scenario vocabulary that predates the current `scenario-schema.json` and was
never fully scrubbed when the schema changed. None of these fields exist in the
schema or are read by the simulation engine itself. Worth a dedicated cleanup pass
across all four files rather than fixing them one at a time as each is noticed.

### 4.3 Tax summary and withdrawal details

`displayTaxSummary()` and `displayWithdrawalDetails()` (`UIController.js:1778`,
`:1844`) aggregate the per-month `withdrawals[]` log entries the engine produces
(§2.2) into totals (gross/net/tax) and a collapsible per-withdrawal breakdown. These
read real engine output directly and were not found to have the vocabulary-mismatch
problem affecting §4.2.

### 4.4 Known gap: one-time income "windfalls" don't create a balance bump

**`ISSUES.md` Issue 3, root-caused.** Verified directly: a one-time `income[]` entry
large enough to exceed that month's expenses (e.g. a $400,000 inheritance modeled as
income rather than as an asset) produces `shortfall ≤ 0`, which simply skips
withdrawal for that month — **the surplus is discarded, not deposited anywhere.**
`income[]` can only ever offset `monthly_expenses`; it has no path into any asset's
balance. This is why the chart never shows the expected "bump": there's nothing in
the engine that would put one there. The schema's `deposits[]` (§1.6) is the correct
primitive for a one-time cash injection into a specific asset — the README's own
"Inheritance or Lump Sum Windfall" example (§ Common Scenarios) models it as an
**asset** with a `start_month`, not as `income[]`, for exactly this reason. The
fix here is documentation (steer users to the asset/deposit pattern) rather than an
engine change, unless "income that banks into an asset" is something we actually
want to support.

Relatedly, `simulateScenarioAdvanced()`'s return value includes
`windfallUsedAtMonth: scenario._windfallUsedAtMonth` (`timeaware-engine.js:627`), but
`_windfallUsedAtMonth` is never set anywhere in the codebase — this field is always
`undefined`. Vestigial; safe to remove unless it was a placeholder for a windfall
feature that was never finished.

---

## 5. Monte Carlo Analysis

Re-runs the loaded scenario many times against randomized investment returns
instead of one deterministic path, to estimate a probability of success rather than
a single outcome. This is the largest single feature by code volume — five files,
~3,650 lines (`MonteCarloService.js` 1026, `MonteCarloController.js` 1008,
`MonteCarloChart.js` 1473, `MonteCarloUI.js` 408, `ReturnModelService.js` 526) — and
already has four dedicated, thorough docs that this section deliberately does not
duplicate:

- `docs/MONTE_CARLO_IMPLEMENTATION.md` — architecture, component responsibilities,
  configuration options, extension points
- `docs/monte-carlo-analysis-guide.md` — end-user walkthrough, ADDITIVE vs. REPLACE
  mode, results interpretation, troubleshooting
- `docs/monte-carlo-technical-implementation.md` — statistical methodology, sequence
  risk, known limitations (no cross-asset correlation, no regime switching, normal
  distributions don't model fat tails)
- `docs/return-model-service-guide.md` — the three return models in detail

### 5.1 What this section adds

Just the load-bearing facts those docs don't centralize, plus one verified gap.

- **Return models** (`ReturnModelService.js`, shared with §1.7's `rate_schedules`):
  Simple Random (independent normal draws, no year-to-year correlation by design),
  Historical Bootstrap (resampling real historical years), Historical Sequence
  (replaying actual historical sequences to capture real sequence-of-returns risk).
- **Success criterion** (`MonteCarloService.calculateIndividualSuccess()`): a run
  "succeeds" if it survives at least `targetSurvivalMonths` (default 300 = 25
  years) **and** every asset with a `min_balance > 0` ends at or above that floor.
  Survival time alone is not sufficient if any `min_balance` is configured.
- **ADDITIVE vs. REPLACE mode**: ADDITIVE layers Monte Carlo volatility on top of a
  scenario's existing `rate_schedules`/`interest_rate` assumptions (default, safe for
  any scenario); REPLACE substitutes a uniform 7%/15%-volatility model for every
  asset regardless of its configured returns — useful for simple sensitivity
  analysis, not for scenarios that intentionally model asset-specific or
  sequence-based returns.

### 5.2 Known gap: "Expected income" insight ignores timing

**`ISSUES.md` Issue 2b, root-caused.** The Monte Carlo "Key Scenario Insights" panel
(`MonteCarloController.js:617`) computes:
```js
const totalMonthlyIncome = scenario.income.reduce((sum, inc) => sum + (inc.amount || 0), 0);
```
This naively sums every income source's `amount`, regardless of `start_month`/
`stop_month`. A scenario with part-time work ending at month 12 and Social Security
starting at month 84 would report a combined "Expected income" that's never actually
true at any single point in the simulation — the two never overlap. The other
insights in this same function (monthly expenses, total assets, duration) read
static scenario fields and aren't affected; only the income insight needs
timing-aware logic (e.g. report income active "now," or a range, rather than a flat
sum).

---

## 6. Export

There are three distinct export mechanisms in the live UI. After tracing all three
end to end, **none of them currently produce a fully correct single-scenario CSV
download** — two have real bugs, and the only correctly-implemented one is
permanently hidden by an unrelated bug in §7. This section corrects an earlier draft
of itself: §6.2 originally assumed the inline preview reused the engine's own CSV;
it doesn't.

### 6.1 "Centralized Export Toolbar" — correct logic, but unreachable

`#export-toolbar` (index.html, explicitly commented `<!-- Centralized Export
Toolbar -->`), driven by `ExportController.js`:

| Button | Method | Behavior |
|---|---|---|
| 📝 Edit Scenario Config | (JSON editor toggle) | Opens the JSON editor (§3.4) — works |
| 📄 Export Scenario Config | `exportScenarioConfiguration()` | Downloads the loaded scenario as JSON — works |
| 📊 Results | `exportScenarioResults()` → `generateSimulationCSV()` | Correctly prefers the engine's own pre-generated `csvText` (§2.1) — **but see §7.3: this button can never become visible**, due to a dead tab-tracking mechanism in `ExportController` itself |
| 🎲 Export MC Analysis | `exportMonteCarloResults()` → `generateMonteCarloCSV()` | Downloads Monte Carlo summary statistics — works, not tab-gated |
| 📈 Export MC Returns | `exportMonteCarloReturns()` → `generateMonteCarloReturnsCSV()` | Downloads raw per-run return sequences — works, not tab-gated |

### 6.2 Inline CSV preview toggle — reachable, but wrong data

`#toggle-csv-btn` (`UIController.toggleCsvExport()`) shows/hides a `<pre>` block
(`#csv-text`/`#csv-container`) populated by `populateCSVExport()` →
`convertResultsToCSV()` (`UIController.js:1690`) every time a single-scenario
simulation completes — this path **is** reachable (the button itself isn't gated on
the broken tab-tracking in §6.1).

**Newly found bug**: `convertResultsToCSV()` reads `month.assets` (expecting an
array to sum `.balance` from) to compute `Total Assets` and `Net Change` columns.
But per §2.1, a real per-month log entry is `{month, income, expenses,
withdrawals: [...], shortfall}` — there is no `.assets` field on it at all. Both
columns silently compute as `0` for every month; only `Month` and `Monthly Expenses`
are correct. This is the one CSV path users can actually reach today, and it's
wrong.

**Net result of §6.1 + §6.2 together: there is currently no way to get a fully
correct single-scenario CSV out of the live UI** — the correct implementation is
unreachable, and the reachable one has the wrong column data. Fixing either the
tab-tracking bug (§7.3) to surface the toolbar's Results button, or
`convertResultsToCSV()`'s field names, would resolve this; ideally both, with
`convertResultsToCSV()` deleted in favor of the toolbar's already-correct
`generateSimulationCSV()`.

### 6.3 Other dead UI and dead code found while writing this section

- **`#export-config-btn`** ("📄 Export Config", index.html:293) has **zero JavaScript
  binding anywhere in the codebase** — it renders, but clicking it does nothing.
  Almost certainly a leftover from before the "Centralized Export Toolbar"
  consolidation that was never removed.
- **`UIController.exportSingleResults()`** (line 2000) has **zero call sites**
  anywhere in the codebase — it's not bound to any button. The entire chain it would
  trigger (`ui:single-scenario-export-requested` → `main.js.handleSingleScenarioExport()`
  → `exportSingleScenarioCSV()`) is therefore unreachable from the current UI.
  **It also contains a real bug**, found while tracing it: `exportSingleScenarioCSV()`
  (`main.js:153`) reads `monthData.total_assets`, `.monthly_expenses`, `.net_income`,
  `.withdrawal_amount`, `.asset_growth` off each month's log entry — but the engine's
  actual per-month log shape (§2.1) is `{month, income, expenses, withdrawals: [...],
  shortfall}`. None of the five fields this function reads actually exist on that
  object, so every data column would be `0` if this path were ever wired up and run.
  Harmless today only because nothing calls it. Recommend deleting this whole dead
  chain (`exportSingleResults()`, `main.js`'s two export functions and the
  `setupExportHandlers()`/`handleSingleScenarioExport()` plumbing around them) rather
  than fixing the field names — §6.1's `ExportController` path already covers the
  same use case correctly and is the one actually in use.

---

## 7. Navigation & Workflow

Three controllers each nominally own a slice of "what's currently visible" —
`ModeController`, `WorkflowController`, `TabController`. Checking each against the
actual DOM (not just the JS) turned up a clear split: two are live, one is entirely
orphaned, and the orphaned one's fingerprints explain a live bug back in §6.

### 7.1 Mode (Scenario vs. Story) — live container, no way to switch

`#scenario-mode-container` and `#story-mode-container` both exist in `index.html`,
but the buttons that would toggle between them (`scenario-mode-btn`,
`story-mode-btn` — both expected by `ModeController.js`) **do not exist in the
current markup**; only `#story-exit-btn` does. Combined with `main.js` hard-blocking
the `mode:switch-to-story` event regardless (`BRIEF.md` → Deferred → Story Mode),
Story Mode is unreachable through three independent, redundant layers: no entry
button, a blocked event, and a `Proxy` stub standing in for the real controller.
Scenario Mode is the only state a user can ever reach — not because it was chosen as
the only mode, but because every other path is cut.

### 7.2 Workflow steps — live

`.workflow-steps` / `#workflow-step-1/2/3` with `data-step` attributes exist and
match `WorkflowController`'s `stepStates` exactly (step 1 active+unlocked by
default; steps 2–3 locked until `scenario:selected`/`simulation:completed` fire).
This is the real "where am I in the process" indicator users see.

### 7.3 Tabs — entirely dead, and it's why §6.1's Results button never appears

`TabController.js` (306 lines, 0% test coverage per `docs/AUDIT.md` §1) queries
`.tab-button`, `.tab-panel`, and `[data-tab="..."]` throughout. **None of these
exist anywhere in `index.html`** — not hidden, not renamed, just absent. Every
method (`switchToTab`, `enableTab`, `disableTab`, the `configure`/`single-analysis`/
`monte-carlo` cases in `handleTabSwitch`) operates on selectors that resolve to
nothing, and its one outbound event (`tab:changed`) has no listeners anywhere
either. It's still instantiated and initialized in `main.js` like any other
controller — unlike Story Mode, nothing here is flagged as disabled; it appears
no one has noticed this controller does nothing at all.

**This orphaned `.tab-button` class is also the root cause of §6.1's "Results"
export button being permanently hidden.** `ExportController.js` has its own,
separate listener for `.tab-button` clicks (to track `this.currentTab` for toolbar
visibility) — also dead, for the same reason. `this.currentTab` is initialized to
`'configure'` and can never change, so `updateToolbarVisibility()`'s check
(`this.currentTab === 'single-analysis'`) is permanently false and the Results
button never shows, regardless of whether a simulation has actually completed. Two
controllers, independently, both still listening for a CSS class that doesn't exist
— almost certainly both leftover from whatever the `configure`/`single-analysis`/
`monte-carlo` tab names describe, a layout that's evidently been replaced by §7.2's
workflow-step UI without either controller being updated or removed.

**Recommendation**: delete `TabController.js` entirely, and remove the dead
`.tab-button` listener and `currentTab` gating from `ExportController.js` (just gate
the Results button on `this.simulationResults !== null`, matching how the Monte
Carlo buttons are already gated). That one change fixes the export bug in §6.1 and
removes ~300 lines of fully inert code.

---

## 8. Story Mode

Not specified here — it isn't live (§7.1), and writing a feature-by-feature spec for
disabled functionality would drift out of sync with the moment it's actually picked
back up. See `docs/BRIEF.md` → Deferred → Story Mode for what it is, what's already
built (`StoryController.js`, `StoryEngineService.js`, `StoryUI.js`,
`data/stories/learning-journey.json`), and why it's blocked. When/if it's revived,
give it a real section here describing the chapter-progression model and narrative
data format, informed by what's actually still working in that code rather than
what was originally intended a year ago.

---

## 9. Out of Scope

See `docs/BRIEF.md` → Permanently Out of Scope for the full list (server-side/cloud
sync, user accounts, multi-user, live brokerage integration, tax filing/advice).
Not repeated here to avoid two documents drifting out of sync on the same list.
