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

### Issue 8 (informational — INTEGRATION_TEST_ISSUES.md is stale)

Two of that doc's three "open bugs" were re-verified directly against current code
and appear to already be fixed, just never confirmed/closed:
- `assets[].start_month` activation **works correctly** today (re-ran the exact
  failing scenario from Issue #2; it passes).
- The "$4,000 negative-balance discrepancy" (Issue #1) isn't a real bug — the test
  reads `balanceHistory[name][0]` as a pre-simulation total when it's actually the
  end-of-month-1 balance, and doesn't account for the 15% capital-gains gross-up on
  the withdrawal that month.

The third (Issue #3, missing `plan.duration_months`) is real and arguably worse than
described: the scenario doesn't throw and doesn't get a default duration — it
silently returns a fully-empty result (zero months simulated, no error).
`INTEGRATION_TEST_ISSUES.md` itself is gitignored and not tracked in git; consider
whether it should be updated, replaced by this file, or deleted now that its content
is stale.
