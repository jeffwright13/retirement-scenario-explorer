# ISSUES TO RESOLVE

_Root causes below were identified while writing `docs/SPEC.md` (2026-06-22) by
tracing each symptom directly against the running code. See the cited SPEC.md
section for full detail._

### Issue 1 — RESOLVED: In Choose Your Scenario...Scenario Builder...Copy an Existing Scenario, when you copy a scenario to a new one, all Withdrawal Order values revert to 1

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

**Fixed in `fix/copy-scenario-withdrawal-order` (v1.0.2).** Regression test added
first (`tests/unit/controllers/ScenarioBuilderController.test.js`, "should preserve
real withdrawal order from the top-level order[] array"), confirmed red, then
`ScenarioBuilderController.convertScenarioToFormData()` was updated to build an
`orderMap` from `scenario.order[]` (same pattern as
`ScenarioBuilderService.convertJsonToForm()`). Deleted the dead
`ScenarioBuilderService.copyScenario()`/`convertScenarioToFormData()` duplicate and
its now-orphaned `scenario-builder:copy-scenario` listener (the Controller already
listens for the same event on the real path), along with the Service-side unit
tests that only existed to cover that dead code.

### Issue 2a — RESOLVED: In Test Scenario...<scenario>...Key Assumptions, a new income entry will simply state the start month, not the stop month if it exists

**Root cause (SPEC.md §4.2):** `extractKeyAssumptions()` (`UIController.js:831`)
checks `income.end_month` — the schema field is `stop_month`. `end_month` doesn't
exist anywhere in the data model, so the condition is always false. **One-line fix.**
Same function also reads `scenario.plan?.retirement_age`/`life_expectancy`, neither
of which exists in the schema either — see the cross-file note below.

**Fixed in `fix/income-stop-month-display` (v1.0.3).** The docstring on
`UIController.extractKeyAssumptions()` says "Same logic as
`ScenarioController.extractKeyAssumptions`" — that turned out to be true of the bug
too: `ScenarioController.js:307` had the identical `income.end_month` check, and
both are live (different event paths: `scenario:loaded` uses `ScenarioController`'s
copy, `scenario:data-changed` uses `UIController`'s own). Added a regression test for
each (`tests/unit/controllers/UIController.test.js` and the new
`tests/unit/controllers/ScenarioController.test.js`, which didn't exist before this
fix), confirmed both red, then changed `income.end_month` → `income.stop_month` in
both files. The `retirement_age`/`life_expectancy` orphaned-vocabulary note is
unrelated and still open — see Issue 7.

### Issue 2b — RESOLVED: In RiskAnalysis...Key Scenario Insights, "Expected income" doesn't break down incomes that have a start/end time

**Root cause (SPEC.md §5.2):** `MonteCarloController.js:617` sums every income
source's `amount` with no regard for `start_month`/`stop_month`. Two non-overlapping
income sources (e.g. part-time work ending month 12, Social Security starting month
84) get added together into a total that's never actually true at any point in the
simulation. Needs timing-aware logic, not a flat sum.

**Fixed in `fix/montecarlo-expected-income-timing` (v1.0.7).** Regression test
added first (`tests/unit/controllers/monte-carlo-expected-income-timing.test.js`),
confirmed red, then rewrote `generateScenarioInsights()`'s income block to sample
concurrent income at every month where a source starts or stops, using
`utils.js`'s `getMonthlyIncome()` — the same function the real engine uses — rather
than reimplementing the active/inactive logic. Reports a flat `$X/month` total when
every sample matches (the common case), or `ranges from $X to $Y/month` otherwise.
This correctly surfaces real gaps too: two sources with a dead zone between them
(e.g. part-time work ending month 12, Social Security starting month 84) now
report a `$0` floor for the gap rather than hiding it.

### Issue 3 — RESOLVED: When adding a one-time inheritance income (400k/1-month) to an existing scenario, and then re-running it, the resulting graph does NOT show a 400k "bump" like you'd expect it to.

**Root cause (SPEC.md §4.4), verified by direct simulation:** `income[]` can only
ever offset `monthly_expenses` for the month it's active; any surplus beyond that
month's expenses is silently discarded, not deposited into any asset. There's no
bug to fix in the engine — the README's own "Inheritance or Lump Sum Windfall"
example already models this correctly as an **asset** with a `start_month`, not as
income. This is a documentation/discoverability gap: steer users away from modeling
one-time windfalls as `income[]`.

**Fixed in `chore/orphaned-vocabulary-cleanup` (v1.0.8).** Added an explicit warning
to the README's "Common Scenarios" intro: a one-time windfall modeled as `income[]`
only offsets that month's `monthly_expenses` and silently discards the rest, so
one-time windfalls/deposits/expenses belong in `assets[]` instead.

## README has some Common Scenarios that need review. — RESOLVED (v1.0.8)
### examples do not show if json is asset or income type
Fixed: each "Common Scenarios" example now has an explicit **asset**/**income**
label in its heading.
### example for "Inheritance or Lump Sum Windfall" should have an end date in the json?
Settled by checking the schema directly: `assets[]` entries have no `stop_month`
field at all (`start_month` only) — there's no "end date" concept for assets to add.
This is correct as-is: once a windfall becomes active, it should remain part of the
portfolio indefinitely. Added a note in the README explaining this explicitly rather
than leaving the absence unexplained.

---

## Found while writing docs/SPEC.md (2026-06-22) — not yet in any user-facing report

### Issue 4 (high impact) — RESOLVED: No way to get a correct single-scenario CSV export today

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

**Partial update (2026-07-01):** Issue 5 is fixed — the toolbar button now becomes
visible and works correctly once a simulation completes. The second half of this
recommendation (deleting the broken inline `convertResultsToCSV()`/
`populateCSVExport()` preview in favor of the now-working toolbar button) was not in
scope for that fix and is still open.

**Fully resolved in `chore/dead-export-code-cleanup` (v1.0.5).** Deleted
`convertResultsToCSV()`/`populateCSVExport()` and the fallback call site in
`displaySimulationResults()` that invoked them. Correction while removing this: the
broken path was less "reachable" than originally described — `SimulationService`
only ever calls `simulateScenarioAdvanced()`, which unconditionally returns a
pre-generated `csvText` string, so the `if (data.results && data.results.csvText)`
branch (using the correct `populateCSVFromText()`) wins in every normal run. The
broken `else` branch was reachable only in the degenerate case of an empty
simulation result (`csvText === ''`, falsy) — narrower than "reachable but wrong,"
but still dead weight worth removing rather than fixing. The inline preview panel
itself (`toggle-csv-btn`, `populateCSVFromText()`) is unaffected and continues to
work correctly.

### Issue 5 (high impact, root cause of Issue 4) — RESOLVED: `TabController.js` is fully dead code, and it's silently breaking `ExportController` too

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

**Fixed in `fix/tab-controller-dead-code` (v1.0.4).** Regression test added first
(`tests/unit/controllers/export-controller-results-visibility.test.js`, asserting
the Results button becomes visible after `simulation:completed` with no tab
dependency), confirmed red, then deleted `TabController.js` and its instantiation
in `main.js`, removed `ExportController`'s dead `.tab-button` listener and
`currentTab` tracking, and changed the Results button's visibility check to
`this.simulationResults !== null` alone.

### Issue 6 (low impact, dead code) — RESOLVED: Stray dead button and dead export chain

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

**Fixed in `chore/dead-export-code-cleanup` (v1.0.5).** Verified zero live call
sites for each item before deleting (including in test files — `main.test.js` had
its own mock reimplementation of the whole dead chain, tested only against itself,
never against real `main.js`; that mock and its tests were removed too). Removed
`#export-config-btn` from `index.html`; deleted `UIController.exportSingleResults()`;
deleted `main.js`'s `setupExportHandlers()`/`handleSingleScenarioExport()`/
`exportSingleScenarioCSV()`/`exportSingleScenarioJSON()` and the constructor call
that wired it up; removed `windfallUsedAtMonth` from `simulateScenarioAdvanced()`'s
return value. Full suite passed unchanged throughout (42 suites, 0 failing) —
expected, since none of this code had any live callers.

### Issue 7 (medium impact, systemic) — RESOLVED: Orphaned pre-schema vocabulary across 4 files

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

**Partial update (2026-07-01):** the `end_month` occurrences in `UIController.js`
and `ScenarioController.js` are gone as a side effect of fixing Issue 2a (both were
changed to the real field, `income.stop_month`, not just deleted). The remaining
work — `retirement_age`/`life_expectancy` in those same two files,
`annual_growth_rate`/`initial_value` in `ValidationService.js`/`SimulationService.js`,
and the `ValidationService.validateAsset()` type-vocabulary mismatch — is still
open and still scoped as one cleanup pass in `docs/PLAN.md` v1.0.5.

**Fully resolved in `chore/orphaned-vocabulary-cleanup` (v1.0.8, after further
splits moved this from v1.0.5).** Removed `retirement_age`/`life_expectancy` from
`ValidationService.validatePlan()`/`validateBusinessLogic()` and from
`UIController.js`/`ScenarioController.js`'s `extractKeyAssumptions()` (both were
always-`undefined` dead reads). Removed `annual_growth_rate` handling from
`ValidationService.validateAsset()` (no replacement — no growth-rate validation was
asked for, just removal of the wrong-field check). Replaced every
`asset.initial_value ?? asset.balance` fallback with `asset.balance` directly across
all four files — found along the way that `SimulationService.js`'s
`metrics.totalInitialAssets` had no `.balance` fallback at all, meaning it was
silently always `0` in every real run (this fed into `ScenarioController.js`'s
`generateRecommendations()`, whose output turned out to have zero listeners
anywhere — unrendered, like `ValidationService`'s output, so not user-visible
today, but fixed anyway since it's the same file already in scope). Replaced
`ValidationService.validateAsset()`'s `401k`/`ira`/`roth_ira`/... vocabulary with
the schema's real enum (`taxable`/`tax_deferred`/`tax_free`). Added a regression
test asserting all three real schema types produce zero warnings. Updated the
existing `ValidationService.test.js` suite's fixtures throughout (was built almost
entirely around `initial_value` and the old type vocabulary).

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

**Closed out in `chore/reenable-resolved-engine-tests` (v1.0.6).** The skipped test
in `tests/integration/timeaware-engine-real.test.js` was fixed rather than just
re-enabled, since its original assertion (comparing a post-withdrawal total to the
pre-simulation total) was the actual flaw described above — re-enabling it as-is
would still fail. Confirmed empirically that the two negative-balance assets never
change value across the full 48-month simulation (each stays at exactly its input
balance), then rewrote the test to assert that real invariant directly instead of
the flawed total comparison.

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

**Closed out in `chore/reenable-resolved-engine-tests` (v1.0.6).** Removed `.skip` —
the test passed unmodified, confirming the engine behavior described above.

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

---

## Found by direct code reading of `scripts/core/EventBus.js` (2026-07-01) — not yet in any user-facing report

### Issue 11 — RESOLVED: `once()`'s self-unsubscribe mutates the same array `emit()` is iterating

**Root cause:** `emit()` (`EventBus.js:38`) calls `this.events.get(event).forEach(...)`
directly against the live array stored in the `Map`. `once()` (`EventBus.js:59-64`)
implements auto-unsubscribe by having its wrapper call `this.off(event, onceWrapper)`
from inside that same handler, which `splice`s that same array while `forEach` is
mid-iteration over it. Today this happens to be harmless — `splice` removing the
current index only risks skipping whichever handler comes immediately after a
`once()` listener in subscription order for that same `emit()` call, it doesn't
throw. But it's an accidental correctness property of `Array.prototype.forEach`,
not a designed guarantee, and any handler that calls `off()` for a different,
earlier-registered callback during the same emit has the identical exposure.
**Fix is mechanical:** snapshot before iterating —
`[...this.events.get(event)].forEach(...)` in `emit()`.

**Correction found while fixing (2026-07-01, v1.0.6):** the original write-up above
called this "harmless" but its own next sentence describes the actual bug —
"skipping whichever handler comes immediately after." A regression test confirmed
it directly: two `once()` listeners registered on the same event, only the first
ever fires; the second is silently dropped every time, not just in some edge case.
**Fixed** in `tests/unit/core/EventBus.test.js` (new file — `EventBus` had no test
coverage before this) and `EventBus.js:38`, exactly via the snapshot fix described
above.

### Issue 12 (low impact, design question): no way to unsubscribe all listeners a single component registered

**Root cause:** `off()` (`EventBus.js:76`) requires the exact `(event, callback)`
pair, and `removeAllListeners()` (`EventBus.js:93`) clears every listener for an
event, including other components'. There is no `offAll(callback)` or per-owner
handle. Every one of the 19 files holding an `eventBus` reference (`main.js`,
controllers, services, UI components) subscribes to several events in its
constructor; none of them currently need to unsubscribe because they're
long-lived singletons wired up once in `main.js`. This is not causing a bug today,
but it's a leak trap the moment any subscriber becomes short-lived (recreated per
render, per modal open, etc.) — see the `docs/PLAN.md` Backlog entry for the
design question of whether to add this now or wait until a component actually
needs it.

### Issue 13 (low impact, test-only): skipped rate-schedule test asserts the wrong invariant, same root cause as Issue 8

**Found while analyzing skipped tests (2026-07-02).** The remaining `it.skip` at
`tests/integration/timeaware-engine-real.test.js:262` ("should apply fixed rate
schedules correctly") fails if re-enabled as-is: it asserts
`investmentHistory[0] ≈ 100000` (the input balance), but `balanceHistory[name][0]`
is the balance **after month 1's** withdrawal and growth — the exact same
misunderstanding Issue 8 diagnosed and fixed elsewhere in this same file. Actual
value today is `99317.65`, not `100000`. The test's own comments ("this test will
reveal if rate schedules are being applied") show it was written as an exploratory
probe rather than a real spec, so fixing it means designing a real invariant (e.g.
computing the expected balance from the known 6% annual rate and comparing against
that), not just correcting an index — more than a mechanical re-enable. Not folded
into `v1.0.7` since it's unrelated to that version's scope; needs its own pass.

### Issue 14 (user-reported) — RESOLVED: No `min_balance` input in Scenario Builder's Add Asset form, plus a related copy-scenario mapping gap

**Reported 2026-07-02**, user building a real scenario with a money-market asset
that charges a fee below a $10,000 balance. `scripts/ui/ScenarioBuilderUI.js`'s
`renderAssets()` form template has inputs for name, account type, investment type,
balance, return rate, withdrawal order, and market-dependent — but no `min_balance`
input at all, and `collectFormData()` correspondingly never reads one. The layer
underneath is already fully wired for it — `ScenarioBuilderService.convertFormToJson()`/
`convertJsonToForm()` already convert `minBalance` ↔ `min_balance` correctly — so
this is purely a missing form field, not a schema or engine gap.

**Related gap found while investigating:** `ScenarioBuilderController.convertScenarioToFormData()`
(the function used when copying an existing scenario into the builder — see Issue 1,
the same duplicate-implementation pattern) also doesn't map `min_balance` at all, so
copying a scenario that already has a real `min_balance` set would silently drop it.

**Second bug found in the same function:** that same `convertScenarioToFormData()`
reads `asset.return_rate` for the form's return-rate field — that field doesn't
exist in `scenario-schema.json`; the real field is `interest_rate` (confirmed:
`ScenarioBuilderService`'s `convertFormToJson()`/`convertJsonToForm()` both correctly
use `interest_rate`). Copying a scenario with a real, non-default `interest_rate`
(e.g. a money-market asset at 4%) would silently reset it to the 7% default.

**Fix:** add a `min_balance` input to the Add Asset form and read it in
`collectFormData()`; add `minBalance: asset.min_balance || 0` to
`convertScenarioToFormData()`'s asset mapping; fix `asset.return_rate` →
`asset.interest_rate` in that same mapping.

**Fixed in `feature/asset-min-balance-ui` (v1.0.9).** Regression tests added first
(`ScenarioBuilderUI.test.js`: renders and collects `minBalance`;
`ScenarioBuilderController.test.js`: copy-scenario mapping preserves both
`minBalance` and the corrected `interest_rate`), confirmed red, then implemented.
Found while fixing: the existing `ScenarioBuilderController.test.js` test for this
function used `return_rate: 0.08` in its fixture — the *wrong* field name — and
only "passed" because the buggy code happened to read that same wrong name; fixed
the fixture to `interest_rate` once the real bug was corrected. A separate
integration test fixture used `return_rate: 0.07`, which coincidentally matched the
fallback default and wasn't asserted on, so it was harmless but updated for
consistency anyway. Verified the served file contains the new markup via a quick
local static server (Playwright/`chromium-cli` weren't available, and installing
Playwright for this would cut against this project's own stated preference to avoid
it for simple browser-only apps).

**Follow-up (2026-07-02, v1.0.11):** user reported the "Minimum Balance" field
spanned the full width of the modal instead of being bounded like the other
fields. Root cause: `.form-row` uses CSS grid
(`grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))`), which divides a
row's width across however many `.form-group` children it has — the min-balance
field was given its own dedicated `.form-row` with only one child, so that single
grid column stretched to fill the entire row. Fixed by moving it into the same
row as the "Subject to market volatility" checkbox instead of giving it a
dedicated row, so the grid splits the width between the two the same way it does
for the balance/return-rate/order row above it.

### Issue 15 (user-reported) — RESOLVED: No version indicator anywhere in the deployed (GitHub Pages) UI

**Reported 2026-07-02.** The user's GitHub Pages deployment shows no version
number anywhere in the UI, and nothing in the browser console confirms which
version actually loaded — makes it hard to tell whether a deploy picked up the
latest code. `~/coding/krashen` (a sibling project following the same global
`CLAUDE.md` conventions) already solves this: a `<span id="app-version">` next to
the app title, updated at runtime from `fetch('./package.json')`, plus a
`console.log` on load. This project had neither.

**Fix:** port the same pattern — add the version span next to the `<h1>` title,
fetch `package.json` at runtime (no build step in this project, so this is the only
way to get the version into client-side JS without hardcoding it and letting it
drift), and log it to the console in this project's existing emoji-prefixed log
style.

**Fixed in `feature/version-display` (v1.0.10).** Added `#app-version` span in
`index.html` next to the `<h1>`, a `.app-version` CSS rule in `styles/base.css`,
and a `fetch('./package.json')` block at the bottom of `scripts/main.js` that
updates the span and logs `💰 Retirement Scenario Explorer v${version} loaded` —
mirroring `krashen/js/app.js`'s pattern exactly. Not unit-tested: this is a
trivial, display-only fetch-and-log with no branching logic, consistent with how
this same file's existing `debugContent()`/`debugEvents()` console helpers are
untested, and matches krashen's own (untested) implementation of the same
pattern.

**Follow-up (2026-07-02, v1.0.11):** user reported the deployed page showed the
literal static placeholder `v?.?.?` instead of a real version, and asked for the
indicator to be less prominent. Server-side, every artifact checked out fine —
`package.json`, `index.html`, and `main.js` were all consistent on the live site
with matching timestamps, and manually re-fetching each returned exactly what was
expected — so the fetch failing in the browser is most likely explained by a
stale cached copy of `main.js` (from one of several deploys earlier that day,
before this feature existed) being served alongside a freshly-cached `index.html`
that already had the static placeholder baked in — nothing would ever update it in
that scenario. Since this couldn't be reproduced/confirmed directly (no
Playwright/`chromium-cli` available to drive a real browser), made the failure
mode debuggable instead of silently swallowed: `.catch(() => {})` → `.catch(error
=> console.warn(...))`, and switched the fetch target from the bare string
`'./package.json'` to `new URL('package.json', document.baseURI)` for unambiguous
resolution regardless of caching/base-URL edge cases. Also reduced `.app-version`
from `0.9rem`/`opacity: 0.7` to `0.6rem`/`opacity: 0.4` per the user's explicit
preference for something less in-your-face.

### Issue 16 (user-reported) — RESOLVED: Chart labels a `min_balance` reserve trace "Emergency Fund" even when it isn't one

**Reported 2026-07-02.** `UIController.prepareChartData()` labels the dashed
floor-line trace for any asset with `min_balance` set as `"${assetName} (Emergency
Fund)"` (trace `name`) and `"${assetName} Emergency Fund"` (hover text) —
unconditionally, regardless of what the reserve actually represents. A
money-market minimum-balance requirement isn't an emergency fund; the wording
assumed one specific use case for a general-purpose field.

**Fix:** relabel to `"${assetName} (Min Balance)"` / `"${assetName} Min Balance"`
— accurate for any reason an asset might have a floor (money-market minimum,
early-withdrawal-penalty threshold, or an actual emergency fund). Considered
making the label user-definable (a name/purpose field per asset) but that adds a
form field for a cosmetic label on a trace that isn't even in the chart legend
(`showlegend: false` — it only surfaces in hover tooltips), so not worth the extra
UI surface for now.

**Fixed in `fix/min-balance-chart-label`.** Regression test added first
(`tests/unit/controllers/UIController.test.js`, calling `prepareChartData()`
directly — it's a pure function returning the trace array, no `Plotly`/DOM
dependency, unlike `renderChart()` which calls it), confirmed red, then fixed
both the trace `name` and `hovertemplate` strings.

### Issue 17 (user-reported, design question) — CONSIDERED, DECLINED FOR NOW: should the shortfall auto-stop draw down `min_balance` reserves as a last resort?

**Reported 2026-07-02.** User noticed a scenario terminates (auto-stop on
shortfall) while assets still have real money sitting in their `min_balance`
reserves, untouched. Confirmed in `timeaware-engine.js`:
`withdrawFromSingleAsset()` treats `min_balance` as a hard floor withdrawals can
never cross ("Asset is protected by min_balance — cannot withdraw"), and the
auto-stop condition fires when there's a shortfall and no assets have any balance
available *above* their floors — regardless of how much sits below those floors.
User's framing: at that point the user is "at the end of their rope" and would
realistically spend that money too, so should the engine draw it down as a final
resort before stopping (possibly behind an opt-in toggle, since it would change
what `min_balance` means at the boundary)?

**Decision: leave current behavior as-is for now** (see `DECISIONS.md`). Not
implementing a toggle at this time — revisit if it becomes a real need.

### Issue 18 (user-reported) — RESOLVED: "Choose Scenario" dropdown doesn't reflect the active scenario when it wasn't picked from the dropdown itself, and "Test Scenario" tab should read "Run Scenario"

**Reported 2026-07-02.** User noticed the "Choose Scenario" dropdown correctly
shows the picked scenario's title when you select one *from the dropdown*, but
stays on the placeholder text after creating a scenario via the Scenario Builder
— even though "Scenario Details" populates correctly and Tab 2 unlocks either
way. Looked like two different mechanisms tracking similar state differently.

**Root cause, traced fully:** it's one mechanism, not two. `UIController`'s
`populateScenarioDropdown()` rebuilds the `<select>`'s entire `<option>` list from
scratch whenever the scenarios list refreshes (which happens on
`scenarios:loaded`, fired whenever a scenario is saved) — and never marks any
option `selected`. A `<select>` with nothing explicitly selected defaults to its
first option, which is the `"Choose Scenario"` placeholder — so saving a scenario
resets the dropdown as a side effect. Meanwhile, the real "is a scenario active"
state (`ScenarioController.selectScenario()` → `scenario:selected`, which
`WorkflowController` uses to unlock Tab 2 and `UIController` uses to populate
"Scenario Details") is a completely separate signal that was never wired back to
the dropdown's own `.value`. Picking a scenario *from* the dropdown only "worked"
because the browser sets the visible text natively as part of that click — nothing
was actually keeping it in sync.

**Fix:** `ScenarioController.js` already emits the scenario's key in the
`scenario:selected` payload (`data.key`); `UIController.handleScenarioSelectedData()`
(which handles both `scenario:selected` and `content:scenario-data` — the latter
names the field `scenarioKey` instead of `key`) now sets
`this.scenarioDropdown.value = data.key || data.scenarioKey` whenever either
fires. Since this now updates from the same event that unlocks Tab 2, the two
should always appear in sync going forward.

**Also fixed:** renamed the "Test Scenario" tab/step title to "Run Scenario" —
the tab's actual job is executing the simulation and viewing results, which "Run"
states plainly (and matches the "🚀 Run Single Scenario" button already inside
it); "Test" read more like a QA/validation step.

**Fixed in `fix/scenario-dropdown-sync-and-rename`.** Regression tests added
first (`tests/unit/controllers/UIController.test.js`, covering both the `key` and
`scenarioKey` payload shapes), confirmed red, then fixed.

---

## Found by cross-analysis audit of two independent repository assessments (2026-08-31) — not yet in any user-facing report

_Two independent read-only assessments (Claude Opus, SWE-1.7) were each run against
commit `f4e3b4d` without seeing the other's output, then cross-audited against each
other and directly against the running code — every finding below was independently
re-verified by reading the cited source and, where practical, tracing the execution
path, not just copied from either report. Full detail, reproduction reasoning, and
the two source assessments are preserved outside this file; the entries below are
the root-caused summary. All Monte Carlo findings are new; none were previously in
this file._

### Issue 19 (critical impact) — RESOLVED: Monte Carlo "Return Model" selection has no effect on any simulated outcome, and the surrounding config layer has four separate bugs compounding it

**Root cause.** `ReturnModelService.generateReturns()` produces per-period return
sequences and emits `returnmodel:returns-generated`, but nothing ever writes them
into the scenario the engine actually simulates — `getAssetReturns()`
(`timeaware-engine.js:372-380`) reads only `asset.return_schedule`/`interest_rate`.
The only randomization that actually reaches the engine is
`MonteCarloService.generateRandomScenario()` (`:279-290`) mutating
`rate_schedules.<key>.rate` on `type: 'fixed'` schedules — a single constant annual
return per trial (no sequence-of-returns risk within a trial). Selecting Simple
Random, Historical Bootstrap, or Historical Sequence in the UI produces identical
simulated outcomes under a fixed seed.

**Four compounding bugs in the same subsystem:**
- `MonteCarloUI.getConfigurationFromUI()` (`MonteCarloUI.js:261-298`) hardcodes
  `config.variableRanges` for exactly four schedule names (comment cites
  `jeffs-learning-journey-scenarios.json`, which doesn't exist in `data/`), and
  `MonteCarloController.startAnalysis()` (`:183-186`) merges these **over** the
  controller's own correct, asset-aware ranges — so the UI's hardcoded ±2%/±2.5%
  volatility wins even for equity holdings that should vary far more, and two of
  the four names create orphaned `rate_schedules` entries referenced by no asset.
- `MonteCarloController.getDefaultVariableRanges()` (`:247`) falls back to a
  hardcoded 7% baseline mean for any `sequence`/`pipeline`-type rate schedule,
  since those types have no top-level `.rate` field (`rate-schedules.js:61-80`) —
  confirmed by direct read of `RateSchedule.calculateTypedRate()`.
- The same function requires **both** `market_dependent === true` **and**
  `asset.return_schedule` (`:243`) — any asset using the legacy `interest_rate`
  field is skipped entirely, so an `interest_rate`-only scenario gets zero variable
  ranges and a fully degenerate Monte Carlo (every trial identical) reported as a
  confident success rate.
- The "Export MC Returns" CSV (live path: `ExportController.js:514`,
  `resultItem.returnSequence || resultItem.result?.returnSequence`) exports
  `SimulationService.generateReturnSequences()`'s output, seeded independently
  (`seed: Math.floor(Math.random() * 1000000)`, `SimulationService.js:175`) from
  the Monte Carlo run's own seed — so the exported "return sequence" for a given
  trial is not the sequence that actually produced that trial's result.

Separately, `HistoricalBootstrapModel.loadHistoricalData()`'s `bond` array
(`ReturnModelService.js:369-380`) is a repeating 5-value cycle, not 97 distinct
historical years like its `stock` sibling — currently moot for simulated outcomes
(none of this service's output reaches the engine, per above), but the docs
(`docs/return-model-service-guide.md`) claim real 1926–2023 coverage for both.

**Expected behavior, and source of expectation:** `docs/monte-carlo-technical-implementation.md`
and `docs/return-model-service-guide.md` describe the three return models as
materially affecting simulated returns and preserving sequence risk / cross-asset
correlation; `docs/SPEC.md` §5.1 describes ADDITIVE/REPLACE modes as implemented.

**Live-browser confirmation (2026-08-31, user-reported):** running the real
Monte Carlo UI produced a single trajectory ending near $900M, burying every
other line at the noise floor — the live symptom of the constant-per-trial
return with no monthly variation described above. The user then set a fixed
seed (1001) and reran all three "Return Model" options: **byte-identical
results across all three**, directly confirming the root cause outside of
code tracing or a headless probe — the one live-browser check neither the
Claude nor SWE-1.7 source assessment had performed.

**Fixed in `fix/monte-carlo-return-randomization`, per user decisions on the
redesign (grouping by `investment_type`, monthly draws for real
sequence-of-returns risk, ADDITIVE semantics layering noise on the
scenario's own configured rate):**

- **`scripts/rate-schedules.js`**: added a `type: 'monthly_values'` schedule
  (one rate per month index), reusing the engine's existing
  `RateScheduleManager`/`getAssetReturns()` unchanged.
- **`MonteCarloController.getDefaultVariableRanges()`** replaced with
  **`getMarketDependentAssetConfig()`**, returning a descriptor list
  (`{assetName, scheduleName, isLegacyInterestRate, baseInterestRate,
  investmentType, stdDev}`) instead of a flat mean/stdDev map. No longer
  computes a mean at all — fixes the hardcoded-7%-baseline sub-bug as a side
  effect of not needing one. Now includes `interest_rate`-only assets (fixes
  the "skipped entirely, degenerate MC" sub-bug) by synthesizing a schedule
  name for them.
- **`MonteCarloService.generateRandomScenario()`** rewritten: for each
  `investment_type` group, draws **one shared monthly noise array**
  (`stdDev / √12` per month — the actual dispersion-scaling fix, replacing
  the old `T·σ` blowup with the correct `√T·σ`), then layers it additively
  onto each asset's *real* per-month rate (evaluated via a temporary
  `RateScheduleManager` loaded with the scenario's original schedules, so
  `fixed`/`sequence`/`map`/`pipeline` are all honored correctly). Same-type
  assets move together (correlated); different-type assets vary
  independently.
- **`MonteCarloUI.getDefaultVariableRanges()` deleted** (`:261-298`) — the
  hardcoded four-schedule-name override whose own comment admitted it
  existed to suppress this exact symptom ("prevents 20%+ return outliers
  that cause hockey stick curves") by artificially shrinking volatility,
  rather than fixing the mechanism. `getConfigurationFromUI()` no longer
  contributes a variable-ranges field at all; the controller is now the sole
  source of truth.
- **Exported return sequence now reflects what was actually simulated**: each
  trial's monthly rates are compounded into an annual sequence and attached
  directly to the result, replacing the old `ReturnModelService` round-trip
  (`SimulationService.generateReturnSequences()`, seeded independently of
  the trial) — fixing the separate "exported CSV shows a different random
  draw than what ran" finding as a byproduct, with no change needed in
  `ExportController.js` since the shape is unchanged.

**Explicitly out of scope, by user decision:** making the three
`ReturnModelService` models (Simple Random / Historical Bootstrap /
Historical Sequence) actually differ from each other — the dropdown remains
selectable but all three now produce statistically-equivalent (correctly
dispersed) results, same as before this fix but for a different reason.
REPLACE mode (never implemented, not wired to any UI control). The synthetic
bond data noted above is unaffected and still moot.

**Regression tests**, all in `tests/integration/monte-carlo-return-randomization.test.js`
(new) plus `tests/unit/rate-schedules.test.js` (new, no prior test file
existed for `rate-schedules.js`): confirmed same-type assets share one noise
sequence (differ only by their own base-rate offset, at every month); and a
realistic 18%-volatility stock scenario's `max/median` final-balance ratio
across 60 seeded trials stays under 50 — confirmed this specific assertion
throws/fails against the pre-fix code (old API doesn't even accept the new
call signature) via a temporary revert, then passes after. Also rewrote the
~12 call sites across `tests/unit/controllers/monte-carlo-market-dependency.test.js`
and `monte-carlo-investment-type.test.js` (shape change, same coverage) and
deleted `tests/unit/services/simulation-service-return-sequences.test.js`
(tested the removed `ReturnModelService` round-trip entirely).

**Follow-up correction (2026-08-31, found immediately after the fix above via
live user testing with seed 1001):** the fix's `rate_schedules[x].values[m]`
was stored **pre-divided by 12** (`baseAnnualRate/12 + noise[m]`), but
`timeaware-engine.js`'s `getAssetReturns()` divides *whatever* `getRate()`
returns by 12 **unconditionally**, for every schedule type — every other
type (`fixed`/`sequence`/`map`) stores an annual rate and relies on that
single `/12`. The `monthly_values` type broke that convention, so its
already-monthly value got divided by 12 a *second* time — both the mean and
the noise term ended up 12× too small. This alone doesn't fully explain why
the user still saw large ($60M/$50M/$25M/$9M) outcomes with the doubly-shrunk
rate in place; a probe against a comparable scenario (25-year horizon, $900K
start, 18% stock volatility, seed 1001, 200 trials) after the fix produced
median $214K / p90 $4.3M / max $28.3M — a wide, right-skewed spread with a
real outlier is **expected, mathematically correct behavior** for
undiversified, long-horizon, high-volatility equity exposure (√T·σ
dispersion is still substantial at T=300 months), not a remaining bug.
**Fixed** by storing `values[m] = baseAnnualRate + noise[m]` (annual-scale,
undivided) and drawing noise at `stdDev·√12` so the engine's own `/12`
produces the intended effective monthly-noise stdDev of `stdDev/√12`.
Regression test in `tests/integration/monte-carlo.test.js` (zero-volatility,
fully deterministic case, confirmed red against the pre-fix code via a
temporary revert — `0.07/12` instead of `0.07` — then green).

### Issue 20 (high impact) — RESOLVED: Monte Carlo statistics/aggregation layer reads engine output at the wrong field name or object depth, zeroing or nulling most reported metrics

**Root cause, same class as the already-resolved Issue #4/#6/#7 `.assets` bug,
found here in the Monte Carlo statistics layer specifically (never previously
audited for it).** The engine's per-month log is `{month, income, expenses,
withdrawals, shortfall}` — no `.assets` field exists anywhere in its output.
`MonteCarloService.extractMetrics()` (`:445-488`) reads `lastMonth.assets` for
`finalBalance` (always `0`), and the same assumption breaks
`calculateMaxDrawdownFromResults()`, `calculateTimeToDepletionFromResults()`,
`calculateVaR()`, `calculateCVaR()`, and the "Final Balance Range" insight. Separately
and independently, the same function reads `result.results.shortfallMonths`/
`result.results.totalWithdrawals` (`:476-477`) — but `shortfallMonths` is actually
computed into the sibling `result.metrics.shortfallMonths`
(`SimulationService.js:598`), and `totalWithdrawals` isn't precomputed anywhere.
Both default to `0` regardless of the fix to the `.assets` bug above — this is a
second, distinct defect in the same function, not a symptom of the first.

**Two more downstream consequences of the same root cause:**
- `identifyKeyPercentileScenarios()` (`:361-423`) reads `result.returnSequence`
  from each *wrapper* object, but the sequence is attached to the *inner* `result`
  (i.e. the real path is `wrapper.result.returnSequence`) — the filter drops every
  item, so `analysis.keyScenarios` is always empty.
- `calculateIndividualSuccess()` (`:665-680`) defines survival as
  `timeawareResults.length` (months *simulated*, not months *solvent*) because the
  intended solvency check also depends on the broken `.assets` read above. With
  `plan.stop_on_shortfall: false`, nothing ever shortens that array, so success
  rate becomes unconditionally 100% even for trials that end at $0.
- `SimulationService.analyzeAssetDepletion()` (`:339-359`) reads
  `finalResult.balances`, also nonexistent — the "Asset Alert" depletion insight
  can never fire.

**Expected behavior:** `docs/SPEC.md` §5 describes final-balance percentiles, max
drawdown, VaR/CVaR, key-percentile scenarios, and the success criterion ("survives
... **and** every asset with `min_balance > 0` ends at or above that floor") as
working outputs.

**Fix:** one shared accessor reading `result.results.balanceHistory` (the field
every one of these sites should be using — already used correctly by
`calculateIndividualFinalBalance()` and `MonteCarloChart.extractBalanceTrajectory()`),
called from all affected sites, plus the `result.metrics.shortfallMonths` correction
and the `wrapper.result.returnSequence` correction. Blocked on Issue 21 first so the
fix is actually tested.

**Fixed in `fix/monte-carlo-statistics-layer`, after Issue 21's real-engine
regression suite was written first and confirmed red (7/7 failing, one bug per
assertion below).** Added two shared helpers to `MonteCarloService.js` —
`getTotalBalanceSeries(balanceHistory, monthCount)` (a total-balance-per-month
series from the real `balanceHistory` shape) and `getTotalWithdrawals(monthlyResults)`
(sums each month's `withdrawals[].grossAmount`, since no precomputed total exists
anywhere) — and rewired every site that read `month.assets` or the wrong object
depth to use them: `extractMetrics()` (`finalBalance`, `shortfallMonths` now from
`result.metrics.shortfallMonths`, `totalWithdrawals`), `calculateMaxDrawdownFromResults()`,
`calculateTimeToDepletionFromResults()`, `calculateVaR()`, `calculateCVaR()`,
`calculateMaxDrawdownStats()`, the "Final Balance Range" insight in
`generateInsights()`, and `identifyKeyPercentileScenarios()` (both the
`wrapper.result.returnSequence` fix and sourcing `finalBalance` from the
already-correct `calculateIndividualFinalBalance()`-derived wrapper field).

**One correction to the original write-up above, found while fixing:**
`calculateIndividualSuccess()` does **not** actually read `.assets` in its
primary path — it already used `balanceHistory` correctly for the
`min_balance` floor check. The real mechanism was narrower: "survival" was
defined as `timeawareResults.length` (months *simulated*), and the
`min_balance` check was the *only* solvency check, so it was silently skipped
whenever no asset had `min_balance` configured (the common case) — same
practical bug (100% success rate for a fully-depleted, `stop_on_shortfall: false`
run), different exact code path than described above. Fixed by having
`calculateIndividualSuccess()` derive `survivalTime` from the now-corrected
`calculateIndividualSurvivalTime()` (itself switched from `.assets` to
`balanceHistory`) instead of the raw month count, so "survived N months" now
consistently means "solvent for N months" everywhere it's used —
`calculateSurvivalStatistics()` was also simplified to reuse this same
per-trial value instead of independently re-deriving it a third time.

**Also fixed, same pass:** `SimulationService.analyzeAssetDepletion()` read
`finalResult.balances` (nonexistent — per-month log entries have no
`.balances` field) — same bug family, different file. `generateInsights()`
now captures `balanceHistory` before unwrapping `results` to the monthly
array, and passes it through so `analyzeAssetDepletion()` can read real
per-asset final balances. Also added an `initialBalance <= 0` guard for
negative-balance "planned future expense" assets (`BRIEF.md` idiom) — without
it, an inert negative-balance asset's unchanged final balance is always below
`initialBalance * 0.05` (since both are negative), which would have flagged
every such asset as "depleted" on every run. Regression tests in
`tests/unit/services/simulation-service-asset-depletion.test.js` (new, 3
tests — confirmed red before the fix via a temporary revert, green after).

**Regression tests:** `tests/integration/monte-carlo-real-engine-statistics.test.js`
(new, added by Issue 21's fix below) — 7 tests, one per bug described above, all
run the real event-driven pipeline (`EventBus` + real `SimulationService` +
real `MonteCarloService` + real `ReturnModelService`) with no fabricated
`.assets` shapes anywhere. Confirmed red before the fix, green after. Full suite:
46 suites / 748 passed / 2 skipped, no regressions anywhere (see Issue 21 for
the legacy test files' individual status).

### Issue 21 (test quality, high impact — the reason Issue 20 shipped invisibly through 44 green suites) — RESOLVED (partially): a real-engine regression suite now exists; the four legacy mock-based files are not yet migrated

`tests/integration/monte-carlo.test.js` (`:166-168`, `:393`),
`tests/unit/services/simulation-service-return-sequences.test.js` (`:90`, `:117`),
`tests/unit/controllers/monte-carlo-controller-csv.test.js` (12 sites), and
`tests/unit/controllers/monte-carlo-csv-success-logic.test.js` (`:93`) all
hand-write `results: [{ assets: { investment: 1000000 } }]` or similar — a shape
`simulateScenarioAdvanced()` never emits. `tests/unit/survivorship-bias.test.js`
(`:19`) uses its own `createMockSimulation()` rather than the real engine, so the
survivorship-bias behavior it documents is never checked against production code
either. This single fixture choice is why the six-plus statistics bugs in Issue 20
pass CI today. **Fix:** add one shared fixture built by actually calling
`simulateScenarioAdvanced()` on a small scenario, and use it in place of hand-written
month objects — do this before or alongside Issue 20 so the fix is provably correct.

**Partially fixed in `fix/monte-carlo-statistics-layer`.** Added
`tests/fixtures/monte-carlo-real-fixtures.js` (two scenario builders —
`createSolventScenario()`, which declines but never depletes, and
`createDepletingScenario()`, which depletes ~month 32-34 of a 60-month run —
plus `runRealMonteCarloAnalysis()`, a helper that wires a real `EventBus` +
`SimulationService` + `MonteCarloService` + `ReturnModelService` together and
resolves with the real `montecarlo:completed` payload) and a new suite,
`tests/integration/monte-carlo-real-engine-statistics.test.js`, built entirely
on it — no `.assets` fabrication anywhere. This is the "one shared fixture"
called for above, and it's what proved and now guards Issue 20's fix.

**Scope note, updated after inspecting all five files individually — they
split into three different situations, not one:**

- **`monte-carlo.test.js`** (`:166-168`, `:393`) and
  **`simulation-service-return-sequences.test.js`** (`:90`, `:117`) — fixed.
  Both `.assets`-shaped mocks corrected to real per-month log shape
  (`{month, income, expenses, withdrawals, shortfall}`) with `shortfallMonths`
  moved onto a `metrics` sibling, matching the real `SimulationService`
  wrapper. Neither file's assertions actually checked numeric statistics
  values (they check event firing and structural shape only), so this was a
  pure honesty fix, not a behavior change — confirmed by re-running both
  files after the edit (still green).
- **`monte-carlo-controller-csv.test.js`** (12 sites) — **not fixed, and not
  worth fixing yet.** It calls the real `MonteCarloController.downloadCSV()`,
  but that method is the dead export chain identified in Issue 28 below
  (unreachable from the live UI — `MonteCarloUI.js:84` binds to a DOM id that
  doesn't exist). Correcting its dozen mock sites would be wasted effort if
  Issue 28's recommended fix (delete the dead chain and its tests) is taken.
  Resolve Issue 28 first, then either delete this file with the code it tests
  or migrate what's left.
- **`monte-carlo-csv-success-logic.test.js`** (`:63-83` and throughout) and
  **`survivorship-bias.test.js`** (`:19-84`) — **a different, previously
  undocumented problem: both test a hand-written reimplementation, not
  production code.** The first defines its own local `calculateIndividualSuccess()`
  helper and never calls `MonteCarloController`/`MonteCarloService` for the
  logic under test; the second defines a whole parallel `TestMonteCarloService`/
  `createMockSimulation()` (explicit in its own docstring: "without requiring
  the full engine") and never imports the real `MonteCarloService` at all.
  Correcting either file's fabricated shapes would be cosmetic only — neither
  file exercises real code, so neither can regress or protect against a
  regression in it. `survivorship-bias.test.js`'s statistical illustration
  (survivorship bias vs. min-balance discrete-jump behavior) may be
  legitimately more useful as a self-contained math demonstration than as a
  real-engine test; `monte-carlo-csv-success-logic.test.js`'s reimplementation
  looks like it should just call the real, now-fixed
  `MonteCarloService.calculateIndividualSuccess()` instead. Needs a decision
  per file, not a mechanical fix — see `docs/PLAN.md` Backlog.

### Issue 22 (medium impact) — OPEN: time-varying inflation schedules mis-compound; nominal expenses can decrease

**Root cause.** `getInflationAdjustedExpenses(month)` (`timeaware-engine.js:356-369`)
computes `base × (1 + rate(month)/12)^month` — it raises the *current* month's rate
to the power of *total elapsed months*, discarding every prior rate rather than
accumulating them. For any `inflation_schedule` of type `sequence` with a
non-monotonic rate array (e.g. `data/scenarios/learning-journey-scenarios.json`'s
`stage-5-full-complexity`, schedule `[0.035, 0.04, 0.05, 0.045, 0.03, 0.025, 0.03, 0.035]`),
nominal monthly expenses **decrease** every time the schedule steps down (verified:
decreases at month indices 36, 48, 60, 96 in that scenario), understating expenses
and making affected plans look more solvent than they are. The legacy constant
`inflation_rate` path is unaffected (different, correct formula), but every shipped
scenario using a non-`fixed` inflation schedule hits this.

**Fix:** accumulate a running `expenseMultiplier`, multiplying by `(1 +
rate(month)/12)` each month, instead of recomputing a power from a single sampled
rate. **Regression test first:** with the sequence above, assert
`results[i].expenses >= results[i-1].expenses` for all `i` (currently fails).

### Issue 23 (medium impact) — OPEN: `applyDeposits()` throws `ReferenceError: assetNames is not defined` for any deposit targeting an asset that doesn't already exist

**Root cause.** `applyDeposits()` auto-creates a target asset for a `deposits[]`
entry whose `target` isn't in `assets[]`, then calls `assetNames.push(targetName)`
— but the module's actual binding is `allAssetNames` (`timeaware-engine.js:300`);
`assetNames` is declared nowhere and this throws unconditionally as a `ReferenceError`
on read. Effect: the whole simulation aborts (`simulation:error`), and in Monte
Carlo mode every trial fails. `deposits[]` has zero test coverage today, which is
why this survives a green suite (coverage report flags `338-348` as uncovered).
**Fix:** `allAssetNames.push(targetName)`. **Regression test first:** a `deposits[]`
entry with a novel `target`, assert the simulation completes and the new asset
appears in `balanceHistory`.

### Issue 24 (low-medium impact) — OPEN: `deposits[].start_month` fires one month later than income/asset-activation for the same value

**Root cause.** The main loop calls `applyDeposits(month)` with the 0-based
counter, while `getMonthlyIncome()` and delayed-asset activation both compare
against `month + 1` (`timeaware-engine.js:404-418` vs `:328-333`). A deposit and an
income source sharing `start_month: 3` land in different simulated months.
`scenario-schema.json`'s `deposits[].start_month` uses the same 1-based vocabulary
("Month when deposits begin", `minimum: 1`) as `income[].start_month`. **Fix:**
`applyDeposits(month + 1)`. **Regression test first:** shared `start_month` across
a deposit and an income source, assert they take effect in the same month index
(currently they don't — zero existing coverage for `deposits[]` timing).

### Issue 25 (medium impact, documented-vs-actual) — OPEN: `compounding: 'annual'` is documented — including in the engine's own monthly-loop spec — but never implemented

**Root cause.** `getAssetReturns()` (`timeaware-engine.js:372-380`) always returns
`rate / 12` and never branches on `asset.compounding`; every asset compounds
monthly regardless of this field. This isn't just an unmarked schema row:
`docs/SPEC.md` §1.3 lists `compounding: monthly | annual` with **no** `Future:`
marker — unlike the two genuinely-unimplemented sibling fields on the next line
(`withdrawal_limit`, `early_withdrawal_penalty`), which are explicitly marked
`Future:` — and §2.1 step 5 states the monthly loop "Apply[ies] growth to every
active asset (`interest_rate`/`return_schedule`, monthly **or annual compounding**)."
`ScenarioBuilderService.js:280` also writes `compounding: 'monthly'` onto every
asset it creates, as if the field is consumed downstream. Compounding this:
`tests/unit/timeaware-engine-comprehensive.test.js:78-108` "tests" annual
compounding via a **locally reimplemented** helper function that never calls the
real engine, so the suite gives false confidence that this documented feature
works. **Fix:** either implement the branch (track month-of-year, apply `(1 + rate)
- 1` once per 12 months for `annual`), or mark the field `Future:` in both
`scenario-schema.json` and `docs/SPEC.md` §1.3/§2.1 and fix the misleading test —
the doc fix is smaller but the test is actively misleading either way.

### Issue 26 (medium impact) — OPEN: "Learning Examples" dropdown group is unreachable, and its underlying files use a third, unrunnable scenario schema

**Root cause, two independent defects on one feature.**
`UIController.populateScenarioDropdown()` reads `window.app?.getExamplesCatalog()`
(`:478-501`), but `main.js:299` assigns `window.retirementApp`, never `window.app`
— the optional chain silently yields `[]`, so the "🎓 Learning Examples" `<optgroup>`
(documented in `docs/SPEC.md` §3.1) never appears. `ScenarioController.selectScenario()`
calls `window.app.loadExample(exampleId)` with no optional chaining, which would
throw if ever reached. Even fixing the wiring exposes a worse problem: all nine
files in `data/examples/` are shaped `{metadata, assumptions, accounts[], events[]}`
— not `{plan, assets[], order[], income[]}` — and `ExamplesService` performs no
conversion. The engine's first read is `scenario.plan.duration_months`, which would
throw `TypeError` on this shape. This directly contradicts `docs/BRIEF.md`'s core
"everything is an asset" philosophy — the examples are built on the very `events[]`
model the project rejected. `ExamplesService.js` is at 0% test coverage, consistent
with the feature being unreachable. **This needs a decision (convert the nine files
vs. delete the feature, following the `TabController` precedent, Issue #5) before
it can be fixed** — see `docs/PLAN.md` Backlog. Not scoped into a version yet.

### Issue 27 (medium impact, validation gap) — OPEN: duplicate asset names silently corrupt `balanceHistory` array alignment

**Root cause.** `balanceHistory` is keyed by `asset.name` (a plain object, so
`timeaware-engine.js:317/320/347` naturally dedupe on assignment), but the growth
loop iterates `allAssetNames` (`:300`, `allAssets.map(a => a.name)`, **not**
deduplicated) — so two assets sharing a name push two entries per month into the
same `balanceHistory` array. The array ends up twice the length of the actual
recorded months; `prepareChartData` and the CSV writer both index it by month
number, so the chart and CSV silently show the drawdown at half speed with every
value duplicated. `scenario-schema.json` documents `name` as "Must be unique," but
nothing enforces it — not `ValidationService`, not `ScenarioBuilderService`, not
the engine. **Fix:** add a duplicate-name error to `ValidationService.validateAssets()`
(and `ScenarioBuilderService.validateFormData()`, which is actually live) rather
than a silent engine-level `Set()` dedupe, so the user learns their scenario is
wrong instead of getting a masked symptom.

### Issue 28 (medium impact, dead code) — OPEN: a cluster of heavily-tested Monte Carlo chart/export code is entirely unreachable from the live UI

**Root cause, same pattern as Issue #5/#6.** `MonteCarloUI.js:84` binds its export
handler to `document.getElementById('export-monte-carlo')` — but `index.html` has
no element with that id (only `export-monte-carlo-results` and
`export-monte-carlo-returns`, both bound separately by the live `ExportController`).
`this.exportButton` is always `null`, so `MonteCarloController.exportResults()` →
`downloadJSON()`/`downloadCSV()` (`:728-997`, ~215 lines) can never run — despite
being the most heavily tested Monte Carlo export code in the repo
(`tests/unit/controllers/monte-carlo-controller-csv.test.js`,
`monte-carlo-csv-success-logic.test.js`, `tests/integration/csv-export-success-fix.test.js`).
Separately, `MonteCarloChart.drawScenarioPaths()` (`:1274-1293`) destructures
`{ result }` from each sampled wrapper and calls `this.extractBalanceTrajectory(result)`
— but that method expects the *outer* wrapper (`.result.results...`,
`:586-609`), so it always returns an empty trajectory. This function is also dead:
`displayScenarioPathsChart`, its only caller, is never invoked from the live
`displayMonteCarloCharts()` dispatcher, and `index.html` has no matching canvas
element. **Fix:** delete both dead chains and their dedicated test files, following
the Issue #6 precedent (verify `ExportController`'s live export path already covers
the need — it does, per `docs/SPEC.md` §6.1).

### Issue 29 (low-medium impact) — OPEN: Monte Carlo iterations silently clamp to 1,000 while the UI advertises up to 10,000, with no warning shown to the user

`index.html:403` — `<input id="monte-carlo-iterations" min="100" max="10000">` —
but `MonteCarloService.defaultConfig.maxIterations` is `1000`
(`MonteCarloService.js:19`), and `runAnalysis()` silently clamps
(`:65-68`, `console.warn` only) with no UI feedback. Requesting 5,000 iterations
silently runs 1,000. Separately, `MonteCarloUI.validateConfiguration()` — which
would reject out-of-range iterations/seeds — has zero call sites in `scripts/`
despite being directly tested (`tests/unit/ui/MonteCarloUI.test.js:287-291`).
**Fix:** either set `max="1000"` in `index.html` to match the real cap (smaller),
or wire `validateConfiguration()` into `handleRunAnalysis()` and surface the
result.

### Issue 30 (low impact, export correctness) — OPEN: Monte Carlo trajectory CSV hardcodes four specific asset-name columns

`ExportController.generateMonteCarloCSV()` builds real per-asset balances into
`monthData.assets` keyed by actual name, then emits a fixed header
(`:446`, `['Scenario','Month','Total_Balance','Savings','Investment','Traditional_IRA','Roth_IRA']`)
and reads only those four literal keys. Any scenario with differently-named assets
— including every `realistic-scenarios.json` scenario ("High-Yield Savings",
"Brokerage Investment") and every Scenario Builder output — exports four columns of
`0.00`; `Total_Balance` stays correct, so the file looks plausible at a glance.
The sibling function `generateMonteCarloReturnsCSV()` already builds dynamic
columns from the real asset-name union — same fix, mirror it here.

### Issue 31 (informational, grab-bag) — OPEN: minor Monte Carlo/validation findings from the same audit, not yet worth individual issues

- `MonteCarloController.downloadCSV()` labels annual return sequences with a
  `Month` header (`:915`/`:929`); the live `ExportController` correctly says `Year`
  — moot once Issue 28 deletes the dead chain.
- `prepareChartData` (`UIController.js:1503-1504`) skips an income trace when
  `start_month` is falsy (`0`), even though the engine defaults and simulates it
  from month 1 — income active from month 1 is invisible on the chart.
- A `tax_config` rate `>= 1` divides by zero (`net / (1 - rate)` → `Infinity`);
  `TaxService.validateTaxConfig()` would catch it but is `static` and never called
  from `scripts/`.
- Four independent scenario validators exist with different rules
  (`ValidationService.validateScenario`, `SimulationService.validateScenario`,
  `ScenarioBuilderService.validateFormData`, `ContentService.validateScenario`);
  two of the four (`ValidationService`'s and `SimulationService`'s) have zero live
  listeners/callers.
- `MonteCarloChart.calculatePercentileData()` filters out ended trajectories,
  while the live `createPlotlyChart()` path correctly pads them with `0` — the
  project's own `docs/survivorship-bias-vs-min-balance-behavior.md` labels the
  filtering approach `// WRONG (survivorship bias)`. Latent only because the
  filtering function's sole caller, `exportData()`, has zero call sites.
- `MonteCarloService.returnSequences` (a `Map`) is never cleared between runs;
  grows by one entry per trial for the page's lifetime.
- `new MonteCarloController(eventBus, monteCarloService, monteCarloChart, monteCarloUI)`
  passes four arguments to a one-parameter constructor (`main.js`) — misleading
  about the real dependency graph, though harmless (extra args are ignored).
- `duration_months: -5` returns `actualDuration: -5` with zero simulated months and
  no error; `duration_months: "12"` (string) silently works via coercion.
- At default settings (1,000 iterations), per-trial `console.log` volume inside the
  engine's monthly loop plus an unconditional 50ms `await` per trial in
  `generateReturnSequences()` (work already complete on a synchronous event bus)
  combine for on the order of 10⁵–10⁶ console writes and roughly a minute of pure
  waiting per Monte Carlo run — worth a debug-flag gate and dropping the sleep,
  independent of the correctness fixes above.
