# ISSUES TO RESOLVE

_Root causes below were identified while writing `docs/SPEC.md` (2026-06-22) by
tracing each symptom directly against the running code. See the cited SPEC.md
section for full detail._

### Issue 1: In Choose Your Scenario...Scenario Builder...Copy an Existing Scenario, when you copy a scenario to a new one, all Withdrawal Order values revert to 1

**Root cause (SPEC.md §3.3):** Two duplicate implementations of the copy feature
exist (`ScenarioBuilderService.convertScenarioToFormData()` and
`ScenarioBuilderController.convertScenarioToFormData()`); only the Controller's path
actually runs end-to-end. Both copies contain `order: asset.order || 1`, reading a
field that doesn't exist on a raw asset object — withdrawal order lives in a
separate top-level `order[]` array keyed by asset name. The correct lookup pattern
(an `orderMap` built from `order[]`) already exists in the same file,
`convertJsonToForm()`, and just needs to be reused instead of reimplemented.
**Fix is mechanical**: delete the dead Service-side duplicate; have the Controller's
`convertScenarioToFormData()` use the existing `orderMap` pattern.

### Issue 2a: In Test Scenario...<scenario>...Key Assumptions, a new income entry will simply state the start month, not the stop month if it exists

**Root cause (SPEC.md §4.2):** `extractKeyAssumptions()` (`UIController.js:831`)
checks `income.end_month` — the schema field is `stop_month`. `end_month` doesn't
exist anywhere in the data model, so the condition is always false. **One-line fix.**
Same function also reads `scenario.plan?.retirement_age`/`life_expectancy`, neither
of which exists in the schema either — see the cross-file note below.

### Issue 2b: In RiskAnalysis...Key Scenario Insights, "Expected income" doesn't break down incomes that have a start/end time

**Root cause (SPEC.md §5.2):** `MonteCarloController.js:617` sums every income
source's `amount` with no regard for `start_month`/`stop_month`. Two non-overlapping
income sources (e.g. part-time work ending month 12, Social Security starting month
84) get added together into a total that's never actually true at any point in the
simulation. Needs timing-aware logic, not a flat sum.

### Issue 3: When adding a one-time inheritance income (400k/1-month) to an existing scenario, and then re-running it, the resulting graph does NOT show a 400k "bump" like you'd expect it to.

**Root cause (SPEC.md §4.4), verified by direct simulation:** `income[]` can only
ever offset `monthly_expenses` for the month it's active; any surplus beyond that
month's expenses is silently discarded, not deposited into any asset. There's no
bug to fix in the engine — the README's own "Inheritance or Lump Sum Windfall"
example already models this correctly as an **asset** with a `start_month`, not as
income. This is a documentation/discoverability gap: steer users away from modeling
one-time windfalls as `income[]`.

## README has some Common Scenarios that need review.
### examples do not show if json is asset or income type
### example for "Inheritance or Lump Sum Windfall" should have an end date in the json?

---

## Found while writing docs/SPEC.md (2026-06-22) — not yet in any user-facing report

### Issue 4 (high impact): No way to get a correct single-scenario CSV export today

**SPEC.md §6.** Two paths exist; both are broken, for unrelated reasons:
- The toolbar's "📊 Results" button (`ExportController.exportScenarioResults()`) is
  correctly implemented but **can never become visible** — see Issue 5 below.
- The inline CSV preview (`toggle-csv-btn` → `UIController.convertResultsToCSV()`,
  line 1690) **is** reachable but computes wrong data: it reads `month.assets` to
  total balances, but the real per-month log object has no `.assets` field
  (`{month, income, expenses, withdrawals, shortfall}`). "Total Assets" and "Net
  Change" columns are always 0; only "Month" and "Monthly Expenses" are correct.

Recommend fixing Issue 5 to surface the correct toolbar button, and deleting
`convertResultsToCSV()`/`populateCSVExport()` in favor of it.

### Issue 5 (high impact, root cause of Issue 4): `TabController.js` is fully dead code, and it's silently breaking `ExportController` too

**SPEC.md §7.3.** `TabController.js` (306 lines, 0% test coverage) queries
`.tab-button` / `.tab-panel` / `[data-tab="..."]` — none of these exist anywhere in
`index.html`. Every method is a no-op against the current markup, and its one
outbound event (`tab:changed`) has no listeners. It's still instantiated in
`main.js` like any live controller; nothing flags it as disabled.

`ExportController.js` independently listens for the same dead `.tab-button` class to
track `this.currentTab` (initialized to `'configure'`, never updated). The Results
export button's visibility check (`currentTab === 'single-analysis'`) is therefore
permanently false — **the button can never appear**, regardless of whether a
simulation has run.

**Fix:** delete `TabController.js` entirely; in `ExportController.js`, remove the
dead `.tab-button` listener and gate the Results button on
`this.simulationResults !== null` only (matching how the Monte Carlo buttons are
already gated, correctly).

### Issue 6 (low impact, dead code): Stray dead button and dead export chain

**SPEC.md §6.3.**
- `#export-config-btn` (index.html:293, "📄 Export Config") has zero JS binding —
  clicking it does nothing. Leftover from before the toolbar was consolidated.
- `UIController.exportSingleResults()` has zero call sites (not bound to any
  button). The chain it would trigger (`main.js.exportSingleScenarioCSV()`) reads
  field names (`total_assets`, `net_income`, `withdrawal_amount`, `asset_growth`)
  that don't exist on the real per-month log object — every column would be 0 if
  this were ever wired up. Harmless only because it's unreachable. Recommend
  deleting the whole chain rather than fixing it; Issue 4/5's toolbar path already
  covers this correctly once fixed.
- `simulateScenarioAdvanced()` returns `windfallUsedAtMonth:
  scenario._windfallUsedAtMonth`, a field that's never set anywhere. Vestigial.

### Issue 7 (medium impact, systemic): Orphaned pre-schema vocabulary across 4 files

**SPEC.md §1.8, §4.2.** Five fields appear in display/validation code but exist in
neither `scenario-schema.json` nor anything the simulation engine reads:
`retirement_age`, `life_expectancy`, `annual_growth_rate`, `initial_value`,
`end_month`. Found in **`ValidationService.js`, `UIController.js`,
`ScenarioController.js`, and `SimulationService.js`**. `ValidationService.validateAsset()`
in particular checks `asset.type` against a vocabulary (`401k`, `ira`, `roth_ira`...)
that doesn't match the schema's `taxable`/`tax_deferred`/`tax_free` at all — though
since its output (`warnings`/`suggestions`) is never rendered anywhere, this
particular mismatch is currently silent rather than user-visible. Recommend one
dedicated cleanup pass across all four files rather than fixing occurrences
one-by-one as each is tripped over.

### Issue 8 — RESOLVED: negative-balance asset "$4,000 discrepancy" (folded in from `INTEGRATION_TEST_ISSUES.md` Issue #1)

**Original report:** for the scenario below, mathematical total is
`200000 - 50000 - 25000 = 125000`, but the integration test computed `121000` from
`balanceHistory`, an unexplained $4,000 gap.

```js
const scenario = {
  plan: { monthly_expenses: 4000, duration_months: 48 },
  assets: [
    { name: "Savings", balance: 200000, min_balance: 0 },
    { name: "Future Home Purchase", balance: -50000, min_balance: 0 },
    { name: "Future Car Purchase", balance: -25000, min_balance: 0 }
  ],
  order: [
    { account: "Savings", order: 1 },
    { account: "Future Home Purchase", order: 2 },
    { account: "Future Car Purchase", order: 3 }
  ]
};
```

**Verified directly (SPEC.md §2.5) — not a bug.** The test's `initialTotal` reads
`balanceHistory[name][0]`, which is each asset's balance **after month 1's**
withdrawal and growth, not the pre-simulation starting balance — there's no point in
the engine's return value that exposes a true pre-simulation total. The $4,000
expense withdrawn from `Savings` (a taxable account) is grossed up by the default
15% capital-gains rate to ~$4,706, which alone accounts for nearly all of the
reported gap (re-running it today gives `120294.12`, not exactly the original
`121000`, consistent with this being a withdrawal-timing artifact rather than a
fixed, reproducible miscalculation). The negative-balance assets themselves are
untouched and behave exactly as designed (§1.1/§2.5: inert markers, never withdrawn
from, no month-specific effect). **No engine change needed.**

### Issue 9 — RESOLVED: `assets[].start_month` delayed activation (folded in from `INTEGRATION_TEST_ISSUES.md` Issue #2)

**Original report:** an asset with `start_month: 12` was expected to stay at 0
balance through month 11 and become available at month 12, but reportedly stayed at
0 forever — feature documented in the schema but apparently unimplemented.

```js
const scenario = {
  plan: { monthly_expenses: 3000, duration_months: 24 },
  assets: [
    { name: 'Immediate', balance: 50000, min_balance: 0, start_month: 0 },
    { name: 'Delayed', balance: 100000, min_balance: 0, start_month: 12 }
  ],
  order: [
    { account: 'Immediate', order: 1 },
    { account: 'Delayed', order: 2 }
  ]
};
```

**Verified directly (SPEC.md §2.3) — already fixed, just never confirmed.**
Re-running this exact scenario today: `Delayed` activates precisely at month 12
with its full $100,000 balance and behaves normally afterward. The corresponding
test is still marked `skip` in `tests/integration/timeaware-engine-real.test.js`.
**Action: re-enable that test rather than touching the engine.**

### Issue 10 — OPEN (design decision): missing `plan.duration_months` fails silently rather than erroring or defaulting (folded in from `INTEGRATION_TEST_ISSUES.md` Issue #3)

**Original report:** a scenario missing the required `duration_months` field was
expected to throw, but the engine "uses graceful defaults" instead — framed as an
open design choice between strict validation and graceful defaults.

```js
const incompleteScenario = {
  plan: { monthly_expenses: 4000 }, // missing duration_months
  assets: [{ name: 'Test', balance: 100000 }]
};
```

**Verified directly (SPEC.md §2.6) — real, and worse than originally described.**
The engine neither throws nor applies any default duration. `maxDuration` becomes
`undefined`, the main loop's condition (`month < maxDuration`) is immediately
false, and `simulateScenarioAdvanced()` returns a fully-formed but **completely
empty** result — zero months, empty balance history, no error, no warning. This is
a third outcome beyond the two originally considered, and arguably the worst of the
three: a malformed scenario produces no feedback at all.

**Design decision still genuinely open** — preserved from the original report since
it's still unresolved:

- **Option A — Strict validation.** Throw on missing required fields
  (`plan.duration_months`, `assets`, etc.). Pros: clear errors, fail-fast, easier
  debugging. Cons: less forgiving for quick experimentation with partial scenarios.
- **Option B — Graceful defaults.** Fill in sensible defaults (e.g.
  `duration_months: 120`) so partial scenarios still run. Pros: friendlier for
  learning/prototyping. Cons: can mask real configuration mistakes; schema
  compliance becomes optional in practice.
- **Option C — Hybrid.** An opt-in `strict` flag on `simulateScenarioAdvanced(scenario, { strict })`:
  throws when `true`, applies defaults when `false`/omitted.

Whatever is chosen, the one outcome that should be ruled out is the current one —
silent, empty, unexplained results — since it's strictly worse than either option on
the table for both the strict- and forgiving-UX cases.
