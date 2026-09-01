# Retirement Scenario Explorer — Implementation Plan

_Each version section covers: goal, scope, file changes, and done criteria. Update
in place while a version is in progress; once shipped, leave the section closed
and record any scope changes as a new entry rather than rewriting history — see
`DECISIONS.md`. The **Backlog** section at the end is the living list of work not
yet assigned to a version._

---

## v1.0.2 — Copy-scenario withdrawal order bug (PATCH) — SHIPPED

**Goal:** Fix `ISSUES.md` #1 in isolation rather than batched with the rest of the
originally-scoped v1.0.2 (see below) — shipped alone per a frequent-small-bumps
preference over batching mechanical fixes. The remaining originally-scoped items
moved to v1.0.3.

### Scope

1. **Copy-scenario withdrawal order bug (`ISSUES.md` #1).** Regression test added
   first (`ScenarioBuilderController.convertScenarioToFormData()` on a scenario with
   non-trivial `order[]`), confirmed red, then fixed by building an `orderMap` from
   `scenario.order[]` — the same pattern `ScenarioBuilderService.convertJsonToForm()`
   already used — instead of the broken `order: asset.order || 1`. Deleted the dead
   `ScenarioBuilderService.copyScenario()`/`convertScenarioToFormData()` duplicate
   and its orphaned `scenario-builder:copy-scenario` listener.

### Done criteria

- [x] Regression test added before the fix (red → green)
- [x] `npm test` passes (40 suites, 0 failing)
- [x] `ISSUES.md` #1 marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.2`)

---

## v1.0.3 — Income display missing stop_month (PATCH) — SHIPPED

**Goal:** Fix `ISSUES.md` #2a in isolation — same per-fix cadence as v1.0.2. The
remaining items originally batched into this version moved to v1.0.4.

### Scope

1. **Income display missing stop_month (`ISSUES.md` #2a).** Regression test added
   first for each of the two live duplicate implementations
   (`UIController.extractKeyAssumptions()`, used by the `scenario:data-changed`
   path, and `ScenarioController.extractKeyAssumptions()`, used by the
   `scenario:loaded` path — the `ScenarioController` test file didn't exist before
   this fix), confirmed both red, then changed `income.end_month` →
   `income.stop_month` in both.

### Done criteria

- [x] Regression test added before the fix, for both duplicate implementations
      (red → green)
- [x] `npm test` passes (41 suites, 0 failing)
- [x] `ISSUES.md` #2a marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.3`)

---

## v1.0.4 — Dead TabController and the export-button bug it causes (PATCH) — SHIPPED

**Goal:** Fix `ISSUES.md` #4/#5 in isolation — same per-fix cadence as v1.0.2/v1.0.3.
The remaining items originally batched into this version moved to v1.0.5.

### Scope

1. **Dead `TabController` and the export-button bug it causes (`ISSUES.md` #4, #5).**
   Regression test added first
   (`tests/unit/controllers/export-controller-results-visibility.test.js`, asserting
   the Results button becomes visible after `simulation:completed` with no tab
   dependency), confirmed red, then deleted `scripts/controllers/TabController.js`
   and its instantiation in `main.js`, removed `ExportController`'s dead
   `.tab-button` document-click listener and `currentTab` tracking, and changed the
   Results button's visibility check to `this.simulationResults !== null` alone.
   Issue 4's remaining half (deleting the broken inline `convertResultsToCSV()`/
   `populateCSVExport()` preview) was not in scope here — still open, moved to
   v1.0.5.

### Done criteria

- [x] Regression test added before the fix (red → green)
- [x] `npm test` passes (42 suites, 0 failing)
- [x] `ISSUES.md` #5 marked resolved; #4 marked partially resolved
- [x] Version bumped via `npm version patch` (→ `1.0.4`)

---

## v1.0.5 — Remaining dead export code removed (PATCH) — SHIPPED

**Goal:** Fix `ISSUES.md` #6 (plus the rest of #4) in isolation — same per-fix
cadence as v1.0.2–v1.0.4. The remaining items originally batched into this version
moved to v1.0.6.

### Scope

1. **Other confirmed-dead code (`ISSUES.md` #6), plus the rest of Issue 4.**
   Verified zero live call sites for each item first (including in test files —
   `main.test.js` had its own mock reimplementation of the dead export chain,
   tested only against itself; removed alongside the real code). Removed
   `#export-config-btn` from `index.html`; deleted
   `UIController.exportSingleResults()`; deleted `main.js`'s
   `setupExportHandlers()`/`handleSingleScenarioExport()`/
   `exportSingleScenarioCSV()`/`exportSingleScenarioJSON()`; removed
   `windfallUsedAtMonth` from `simulateScenarioAdvanced()`'s return value; deleted
   `UIController.convertResultsToCSV()`/`populateCSVExport()` and their fallback
   call site. Found while removing the last item: the "broken but reachable" inline
   CSV path was actually only reachable in the degenerate empty-result case, since
   `simulateScenarioAdvanced()` always returns a pre-generated `csvText` that the
   working `populateCSVFromText()` branch prefers — corrected in `ISSUES.md` #4.

### Done criteria

- [x] Zero live call sites confirmed for each deleted item before removal
- [x] `npm test` passes (42 suites, 0 failing; 6 dead-code-only tests removed
      alongside the code they tested)
- [x] Net negative diff (dead code removed, no replacement code)
- [x] `ISSUES.md` #4 (fully) and #6 marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.5`)

---

## v1.0.6 — Engine test cleanup and EventBus re-entrancy fix (PATCH) — SHIPPED

**Goal:** Fix every remaining `ISSUES.md` item that has a mechanical,
already-root-caused fix and no open design question. No new behavior, no schema
changes — pure correctness and cleanup. (Originally scoped as part of v1.0.2, then
v1.0.3, v1.0.4, v1.0.5; split out again once Issue 4/6 shipped alone — see
`DECISIONS.md`.) Unlike the previous four splits, both remaining items shipped
together in this pass — no further split was needed.

### Scope

1. **Close out resolved engine issues (`ISSUES.md` #8, #9).** Re-enabled the
   `start_month` test in `tests/integration/timeaware-engine-real.test.js` unmodified
   — it passed as-is, confirming Issue 9. The negative-balance test's original
   assertion (comparing a post-withdrawal total to the pre-simulation total) was
   itself the flaw Issue 8 diagnosed, so re-enabling it as-is would still fail —
   rewrote it to assert the real invariant instead (confirmed empirically first):
   negative-balance assets never change value across the whole simulation.
2. **`EventBus` re-entrancy during `emit()` (`ISSUES.md` #11).** Added
   `tests/unit/core/EventBus.test.js` (new file — no prior coverage), confirmed red
   (two `once()` listeners on the same event: only the first fired, the second was
   silently dropped — worse than the original write-up's "harmless" characterization,
   corrected in `ISSUES.md`), then fixed by snapshotting the array before iterating
   in `emit()`.

### Out of scope

Issue 2b (Monte Carlo income timing), Issue 7 (orphaned vocabulary), Issue 10
(missing-fields handling), Story Mode, the `UIController` split — see later
versions and Backlog below.

### Done criteria

- [x] Both scope items complete with a regression test added per item (red → green)
- [x] `npm test` passes (43 suites, 0 failing; skipped count 4 → 2, the remaining
      two correctly out of scope — rate schedules and Issue 10's deferred design
      question)
- [x] `ISSUES.md` updated: items 8, 9, 11 marked resolved with the commit/PR that
      fixed them
- [x] Version bumped via `npm version patch` (→ `1.0.6`)

---

## v1.0.7 — Monte Carlo expected-income timing fix (PATCH) — SHIPPED

**Goal:** Fix `ISSUES.md` #2b in isolation — same per-fix cadence as v1.0.2–v1.0.6.
The remaining items originally batched into this version moved to v1.0.8.

### Scope

1. **Monte Carlo "Expected income" ignores timing (`ISSUES.md` #2b).** Regression
   test added first (`tests/unit/controllers/monte-carlo-expected-income-timing.test.js`),
   confirmed red, then rewrote `MonteCarloController.generateScenarioInsights()`'s
   income block to sample concurrent income at every month a source starts or
   stops, using `utils.js`'s `getMonthlyIncome()` (the same function the real
   engine uses) rather than reimplementing the active/inactive logic. Reports a
   flat `$X/month` total when every sample matches, or `ranges from $X to
   $Y/month` otherwise — including surfacing real `$0` gaps between
   non-overlapping sources rather than hiding them.

### Done criteria

- [x] Regression test added before the fix (red → green)
- [x] `npm test` passes (44 suites, 0 failing)
- [x] `ISSUES.md` #2b marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.7`)

---

## v1.0.8 — Schema-vocabulary cleanup and README accuracy (PATCH) — SHIPPED

**Goal:** Fix the remaining display/calculation bugs and documentation gaps that
need a little more care than v1.0.2–v1.0.7's mechanical fixes, but still introduce
no new behavior or schema changes. (Originally scoped as part of v1.0.7; split out
once Issue 2b shipped alone — see `DECISIONS.md`.) All three items completed
together in this pass — like v1.0.6, no further split was needed.

### Scope

1. **Orphaned pre-schema vocabulary, four files (`ISSUES.md` #7).** Removed
   `retirement_age`/`life_expectancy` from `ValidationService.js`'s
   `validatePlan()`/`validateBusinessLogic()` and from
   `UIController.js`/`ScenarioController.js`'s `extractKeyAssumptions()` (all were
   always-`undefined` dead reads). Removed `annual_growth_rate` from
   `ValidationService.validateAsset()` with no replacement (not asked for). Replaced
   every `asset.initial_value ?? asset.balance` fallback with `asset.balance`
   directly across all four files — found along the way that
   `SimulationService.js`'s `metrics.totalInitialAssets` had no `.balance` fallback
   at all, so it was silently always `0` (feeds `ScenarioController`'s
   `generateRecommendations()`, itself unrendered — zero listeners on its output
   event — so not user-visible today, fixed anyway since the file was already in
   scope). Replaced the `401k`/`ira`/`roth_ira`/... type-vocabulary check with the
   schema's real enum (`taxable`/`tax_deferred`/`tax_free`). Added a regression test
   confirming all three real schema types produce zero warnings, and rewrote the
   existing `ValidationService.test.js` suite's fixtures (built almost entirely
   around `initial_value` and the old vocabulary).
2. **Windfall-income documentation gap (`ISSUES.md` #3).** Added an explicit
   warning to the README's "Common Scenarios" intro: a one-time windfall modeled as
   `income[]` only offsets that month's expenses and discards the rest, so
   one-time windfalls/deposits/expenses belong in `assets[]`.
3. **README example issues.** Labeled each "Common Scenarios" example **asset** or
   **income** in its heading. Settled the "should the windfall example have an end
   date?" question by checking the schema directly — `assets[]` has no `stop_month`
   field at all, so there's nothing to add; documented that explicitly instead of
   leaving the absence unexplained.

### Out of scope

Issue 10 (new `strict` behavior — v1.1.0), Story Mode, `UIController` split.

### Done criteria

- [x] Scope item 1 has a test written before the fix
- [x] `npm test` passes (44 suites, 0 failing)
- [x] README changes (items 2–3) reviewed for accuracy against current engine
      behavior (schema checked directly, not assumed)
- [x] `ISSUES.md` items 3, 7, and the README notes marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.8`)

---

## v1.0.9 — Add min_balance to the Scenario Builder's Add Asset form (PATCH)

**Goal:** Close `ISSUES.md` #14 — a genuinely missing UI field for an
already-schema-supported capability (`assets[].min_balance`), reported directly by
the project owner while building a real money-market scenario. No schema change;
`ScenarioBuilderService`'s form↔JSON conversion already supports `minBalance`
correctly.

### Scope

1. **Add a `min_balance` input to the Add Asset form.** In
   `ScenarioBuilderUI.renderAssets()`, add a labeled input (with help text framed
   like the existing emergency-fund-style suggestion in `ValidationService`) and
   read it in `collectFormData()` into `asset.minBalance`.
2. **Fix the copy-scenario mapping gap.** `ScenarioBuilderController.convertScenarioToFormData()`
   doesn't map `min_balance` at all — add `minBalance: asset.min_balance || 0`.
3. **Fix a second bug found in the same function:** it reads `asset.return_rate`
   (doesn't exist in the schema) instead of `asset.interest_rate` (the real field,
   already used correctly by `ScenarioBuilderService`) — copying a scenario with a
   real, non-default `interest_rate` silently reset it to the 7% default.

### Done criteria

- [x] Regression tests added before each fix (red → green): `renderAssets()`
      renders `minBalance`, `collectFormData()` reads it, `convertScenarioToFormData()`
      maps both `minBalance` and the corrected `interest_rate`
- [x] `npm test` passes (44 suites, 0 failing)
- [x] `ISSUES.md` #14 marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.9`)

---

## v1.0.10 — Version display in UI and console (PATCH)

**Goal:** Close `ISSUES.md` #15 — the deployed GitHub Pages instance shows no
version anywhere, making it hard to confirm a deploy picked up the latest code.
Ports the pattern already used in `~/coding/krashen` (same global `CLAUDE.md`
conventions). Treated as PATCH rather than MINOR since it's tooling/observability,
not a new scenario-modeling capability — also avoids colliding with the `v1.1.0`
slot already reserved below for Issue 10.

### Scope

1. **Version span in the UI.** Add `<span id="app-version">` next to the `<h1>`
   title in `index.html`, styled via a new `.app-version` rule in
   `styles/base.css`.
2. **Runtime fetch + console log.** At the bottom of `scripts/main.js`, `fetch
   ('./package.json')` (no build step in this project, so this is the only way to
   get the version into client-side JS without hardcoding it) and update the span
   plus log `💰 Retirement Scenario Explorer v${version} loaded` to the console,
   mirroring `krashen/js/app.js`'s pattern.

### Done criteria

- [x] `npm test` passes (44 suites, 0 failing; no regressions — this feature itself
      isn't unit-tested, consistent with this file's existing untested
      `debugContent()`/`debugEvents()` console helpers and with krashen's own
      untested implementation of the same pattern)
- [x] `ISSUES.md` #15 marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.10`)

---

## v1.0.11 — Fixes to v1.0.9/v1.0.10 found in live testing (PATCH)

**Goal:** `v1.0.9` and `v1.0.10` are already shipped/closed sections, so per this
file's own rule ("update in place while in progress... once shipped, leave the
section closed"), the two bugs the user found while actually using the deployed
site get their own version rather than editing those closed sections.

### Scope

1. **Min-balance field spans the full modal width (`ISSUES.md` #14 follow-up).**
   `.form-row` is a CSS grid (`repeat(auto-fit, minmax(250px, 1fr))`) that splits
   its width across however many `.form-group` children share the row — giving
   min-balance its own dedicated row meant its one column stretched to fill
   everything. Moved it into the same row as the "Subject to market volatility"
   checkbox so the grid divides the width between two fields, same as the other
   rows.
2. **Version indicator not updating, too prominent (`ISSUES.md` #15 follow-up).**
   Server-side, `package.json`/`index.html`/`main.js` were all verified consistent
   on the live site — most likely a stale cached `main.js` from an earlier deploy
   that day (before the fetch logic existed) paired with a freshly-cached
   `index.html` whose static placeholder never got updated. Made the failure mode
   debuggable (`console.warn` on fetch failure instead of silently swallowing) and
   switched to `new URL('package.json', document.baseURI)` for unambiguous
   resolution. Reduced `.app-version` from `0.9rem`/`opacity: 0.7` to
   `0.6rem`/`opacity: 0.4` per explicit user preference for less prominence.

### Done criteria

- [x] `npm test` passes
- [x] `ISSUES.md` #14 and #15 follow-up notes added
- [x] Version bumped via `npm version patch` (→ `1.0.11`)

---

## v1.0.12 — Chart min_balance trace mislabeled "Emergency Fund" (PATCH)

**Goal:** Close `ISSUES.md` #16. `UIController.prepareChartData()` unconditionally
labeled any asset's `min_balance` floor-line trace as "Emergency Fund," regardless
of what the reserve actually represents (e.g. a money-market minimum-balance
requirement). Relabeled to the accurate, general "Min Balance."

### Scope

1. **Relabel the trace.** Change `${assetName} (Emergency Fund)` → `${assetName}
   (Min Balance)` (trace `name`) and the matching `hovertemplate` string. Added a
   regression test calling `prepareChartData()` directly (a pure function, no
   `Plotly`/DOM dependency — unlike `renderChart()`, which had no prior test
   coverage at all).

### Done criteria

- [x] Regression test added before the fix (red → green)
- [x] `npm test` passes
- [x] `ISSUES.md` #16 marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.12`)

---

## v1.0.13 — Scenario dropdown sync fix and "Run Scenario" rename (PATCH)

**Goal:** Close `ISSUES.md` #18. Two related UI-consistency issues traced to one
root cause: `UIController`'s scenario dropdown never had its own `.value` kept in
sync with which scenario is actually active — it only looked correct when picked
directly from the dropdown, because the browser sets that visually for free.
Saving a scenario via the Builder resets the dropdown to its placeholder as a
side effect of the options list rebuilding, with nothing to re-select it
afterward, even though the real "scenario selected" state (and Tab 2's unlock)
were already correct.

### Scope

1. **Sync the dropdown to the real active scenario.** In
   `UIController.handleScenarioSelectedData()` (handles both `scenario:selected`
   and `content:scenario-data`), set `this.scenarioDropdown.value = data.key ||
   data.scenarioKey` — covers both payload shapes this handler receives. Added
   regression tests for both before fixing.
2. **Rename "Test Scenario" → "Run Scenario".** `index.html`'s step-2 title and
   comment — the tab's job is running the simulation and viewing results, matching
   the "🚀 Run Single Scenario" button already inside it.

### Done criteria

- [x] Regression tests added before the fix (red → green), covering both the
      `key` and `scenarioKey` payload shapes
- [x] `npm test` passes
- [x] `ISSUES.md` #18 marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.13`)

---

## v1.0.15 — Monte Carlo statistics/aggregation layer fix (PATCH)

**Goal:** Close `ISSUES.md` #20 and (partially) #21, found by the 2026-08-31
cross-analysis audit. Six independent sites in `MonteCarloService.js` read a
`.assets` field the real engine never produces, or read `shortfallMonths`/
`totalWithdrawals` at the wrong object depth — `finalBalance`, `maxDrawdown`,
`timeToDepletion`, VaR/CVaR, the "Final Balance Range" insight, and
per-trial survival-time tracking were all zero, null, or trivially constant
as a result. `keyScenarios` was always empty (a separate wrapper/inner
`returnSequence` mismatch), and success rate reported 100% for fully-depleted
`stop_on_shortfall: false` runs because survival was measured in months
simulated rather than months solvent. Same bug family, separate file:
`SimulationService.analyzeAssetDepletion()` read a nonexistent
`finalResult.balances`, so the "Asset Alert" depletion insight could never
fire.

### Scope

1. **Real-engine regression suite first (`ISSUES.md` #21).** Added
   `tests/fixtures/monte-carlo-real-fixtures.js` and
   `tests/integration/monte-carlo-real-engine-statistics.test.js` — 7 tests,
   each isolating one bug below, run through the real event-driven pipeline
   (`EventBus` + real `SimulationService`/`MonteCarloService`/
   `ReturnModelService`, no `.assets` fabrication). Confirmed all 7 red
   before any production fix.
2. **`MonteCarloService.js` statistics layer (`ISSUES.md` #20).** Added two
   shared helpers — `getTotalBalanceSeries()` and `getTotalWithdrawals()` —
   and rewired `extractMetrics()`, `calculateMaxDrawdownFromResults()`,
   `calculateTimeToDepletionFromResults()`, `calculateMaxDrawdownStats()`,
   `calculateVaR()`, `calculateCVaR()`, the "Final Balance Range" insight in
   `generateInsights()`, `calculateSurvivalStatistics()`,
   `calculateIndividualSuccess()`, `calculateIndividualSurvivalTime()`, and
   `identifyKeyPercentileScenarios()` off `.assets`/wrong-depth reads onto
   `balanceHistory` and the wrapper's real `metrics`/`returnSequence`
   fields.
3. **`SimulationService.analyzeAssetDepletion()`.** Now reads real per-asset
   final balances from `balanceHistory`, passed through by
   `generateInsights()` before it unwraps `results` to the monthly array.
   Guards negative-balance "planned expense" assets (`BRIEF.md` §1.1 idiom)
   from being flagged as depleted. Regression tests in
   `tests/unit/services/simulation-service-asset-depletion.test.js`.
4. **Two legacy Monte Carlo test fixtures corrected** (`ISSUES.md` #21):
   `monte-carlo.test.js` and `simulation-service-return-sequences.test.js`
   had their `.assets`-shaped mocks corrected to the real engine/wrapper
   shape. The other three files `ISSUES.md` #21 originally named needed
   decisions rather than a mechanical fix (two test a hand-written
   reimplementation that never calls production code; one tests a dead-code
   deletion candidate, `ISSUES.md` #28) — recorded as `PLAN.md` Backlog items
   rather than guessed at here.

### Out of scope

Migrating `monte-carlo-controller-csv.test.js`,
`monte-carlo-csv-success-logic.test.js`, and `survivorship-bias.test.js`
(Backlog); `ISSUES.md` #19 (the larger return-model architecture gap, needs
a design decision first); `ISSUES.md` #26, #27, #28 and the remaining
lower-severity findings from the same audit.

### Done criteria

- [x] Regression suite added first and confirmed red (7/7), then the fix
      applied (7/7 green)
- [x] `npm test` passes (46 suites, 748 passed, 2 skipped, no regressions)
- [x] `ISSUES.md` #20 marked resolved; #21 marked partially resolved with an
      accurate per-file breakdown of what's fixed vs. still needs a decision
- [x] Version bumped via `npm version patch` (→ `1.0.15`)

---

## v1.0.16 — Monte Carlo return randomization fix (PATCH)

**Goal:** Close `ISSUES.md` #19, reported live by the user (a Monte Carlo run
showing one trajectory near $900M burying every other line) and confirmed by
the user themselves with a fixed-seed test showing all three "Return Model"
options producing byte-identical results. Root cause: Monte Carlo drew one
constant random annual return per rate schedule per trial, with no
month-to-month variation — a single high draw compounded unchecked for the
whole horizon. Fix required three design decisions with no single correct
answer, put to the user directly (see `docs/DECISIONS.md` 2026-08-31):
randomization grouped by `investment_type`, drawn monthly (not annually), layered
additively on the scenario's own configured rate.

### Scope

1. **`scripts/rate-schedules.js`**: added a `type: 'monthly_values'` schedule
   (one rate per month index), reusing the engine's existing
   `RateScheduleManager` unchanged.
2. **`MonteCarloController.getDefaultVariableRanges()` → `getMarketDependentAssetConfig()`**:
   returns a descriptor list instead of a flat mean/stdDev map; no longer
   computes a mean (fixes the hardcoded-7%-baseline sub-bug); now includes
   `interest_rate`-only assets (fixes the "skipped entirely" sub-bug).
3. **`MonteCarloService.generateRandomScenario()` rewritten**: draws one
   shared monthly noise array per `investment_type` (`stdDev/√12` per
   month — the actual dispersion-scaling fix), layered additively onto each
   asset's real per-month rate (via a temporary `RateScheduleManager` loaded
   with the scenario's original schedules). Each trial's actual monthly
   rates are compounded into an annual sequence and attached directly to the
   result, replacing the `ReturnModelService` round-trip
   (`SimulationService.generateReturnSequences()`, removed) — fixes the
   "exported return sequence is a different draw than what was simulated"
   finding with no `ExportController.js` change needed.
4. **`MonteCarloUI.getDefaultVariableRanges()` deleted** — the hardcoded
   four-schedule-name override whose own comment admitted it existed to
   suppress this exact symptom by artificially shrinking volatility rather
   than fixing the mechanism.
5. Rewrote `tests/unit/controllers/monte-carlo-market-dependency.test.js`
   and `monte-carlo-investment-type.test.js` (shape change, same coverage,
   plus a new case for the interest_rate-only fix); deleted
   `tests/unit/services/simulation-service-return-sequences.test.js`
   (tested the removed round-trip); added
   `tests/unit/rate-schedules.test.js` (no prior coverage existed) and
   `tests/integration/monte-carlo-return-randomization.test.js` — the actual
   regression guard, confirmed red against the pre-fix code via a temporary
   revert (old API didn't even accept the new call signature), green after.

### Out of scope

Making the three `ReturnModelService` return models actually differ from
each other (deferred by user decision — see `DECISIONS.md`); REPLACE mode
(never implemented); `ISSUES.md` #26/#27/#28 and remaining lower-severity
findings from the same audit.

### Done criteria

- [x] Design decisions resolved with the user and recorded in
      `docs/DECISIONS.md` before implementation began
- [x] Regression test added first and confirmed red against the pre-fix
      code, then green after the fix
- [x] `npm test` passes, no regressions
- [x] `ISSUES.md` #19 marked resolved, including the live-browser
      confirmation
- [x] `docs/PLAN.md` Backlog entry for this decision removed (decision made,
      recorded in `DECISIONS.md`)
- [x] Version bumped via `npm version patch` (→ `1.0.16`)

---

## v1.0.17 — Fix double-division bug in v1.0.16 found in live testing (PATCH)

**Goal:** `v1.0.16` is already shipped/closed, so per this file's own rule this
follow-up gets its own version. The user retested the return-randomization fix
live with a fixed seed (1001) immediately after `v1.0.16` shipped and still
saw implausibly large outcomes ($60M/$50M/$25M/$9M trajectories).

### Scope

1. **`rate_schedules['monthly_values'].values[m]` was pre-divided by 12
   (`ISSUES.md` #19 follow-up).** `timeaware-engine.js`'s `getAssetReturns()`
   divides whatever `getRate()` returns by 12 unconditionally, for every
   schedule type — `v1.0.16`'s new `monthly_values` type broke that
   convention by storing an already-monthly value, so it got divided by 12 a
   second time. Fixed by storing `values[m] = baseAnnualRate + noise[m]`
   (annual-scale, matching every other type) and drawing noise at
   `stdDev·√12` so the engine's own `/12` produces the intended effective
   monthly-noise stdDev of `stdDev/√12`.
2. Verified via an isolated probe (not part of the automated suite) that the
   fix's remaining wide, right-skewed output — a real outlier is still
   possible for a long-horizon, undiversified, high-volatility stock
   scenario — is mathematically expected `√T·σ` dispersion, not a further
   bug. Documented in `ISSUES.md` #19's follow-up note with the probe
   numbers for future reference.

### Done criteria

- [x] Regression test added (deterministic, zero-volatility case), confirmed
      red against the `v1.0.16` code via a temporary revert, then green
- [x] `npm test` passes, no regressions
- [x] `ISSUES.md` #19 follow-up note added with the probe numbers
- [x] Version bumped via `npm version patch` (→ `1.0.17`)

---

## v1.0.18 — Fix inflation schedule mis-compounding (PATCH)

**Goal:** Close `ISSUES.md` #22, already root-caused during the 2026-08-31
cross-analysis audit but left unfixed at the time. Prompted back into scope
by writing `docs/study-guide.md`, which was about to tell the user "you'll
hit a live bug in Stage 5" as though that were expected behavior worth
studying, rather than fixing it before they got there.

### Scope

1. **`getInflationAdjustedExpenses()` (`timeaware-engine.js`).** Replaced
   `base × (1 + rate(month)/12)^month` (which raises the *current* month's
   rate to the power of total elapsed months, discarding every prior rate)
   with a running `cumulativeInflationMultiplier`, closure-scoped per
   simulation run, that multiplies in each month's own rate one call after
   it's current — the indexing needed to exactly reproduce the original,
   correct constant-rate formula while fixing the varying-rate case. The
   legacy `plan.inflation_rate` path is untouched.
2. Regression tests in `tests/integration/timeaware-engine-real.test.js`
   (new): the exact non-monotonic sequence from `ISSUES.md` #22's original
   writeup, confirmed red before the fix; a constant-rate case confirming no
   behavior change for Stage 3 and similar scenarios; and a direct check
   against the real `stage-5-full-complexity` scenario data (not just the
   synthetic test schedule).
3. Updated `docs/study-guide.md`'s Stage 3 and Stage 5 sections, which had
   been written to warn the user they'd hit this bug live.

### Done criteria

- [x] Regression test added first and confirmed red against the pre-fix
      code, then green after
- [x] `npm test` passes, no regressions
- [x] `ISSUES.md` #22 marked resolved
- [x] `docs/study-guide.md` updated to match the fix
- [x] Version bumped via `npm version patch` (→ `1.0.18`)

---

## v1.0.19 — Fix Social Security double-claim bug and revive two dead scenario files (PATCH)

**Goal:** Close `ISSUES.md` #33, found while the user was reading
`data/scenarios/realistic-scenarios.json` directly for study material. Two
scenarios there claimed Social Security both early and at full retirement
age simultaneously — a data bug, and one that models something that can't
happen in reality (SS claiming age is a single, effectively irrevocable
choice). Investigating it surfaced a second, unrelated finding: two of the
four files in `data/scenarios/` were never wired into the app at all,
apparently by oversight rather than design.

### Scope

1. **Fixed `data/scenarios/realistic-scenarios.json`.** Removed the
   erroneous "Early Social Security" entry from `early-retirement-baseline`
   and `tax-optimized-strategy` (neither had a `stop_month`, so it ran
   forever and stacked with "Full Social Security" from month 84 onward).
   Added `early-claiming-comparison`, a genuine early-vs-full-claiming
   comparison scenario.
2. **Wired `naive-scenarios.json` and `realistic-scenarios.json` into
   `ContentService.loadBuiltInScenarios()`'s `scenarioFiles` list.** 10 net
   new selectable scenarios in "Choose Scenario", including
   `sequence-risk-simulation` (naive-scenarios.json) and the new SS
   comparison scenario above. Treated as PATCH rather than MINOR since this
   corrects an apparent oversight (pre-existing, already-authored content
   simply never reachable) rather than adding new capability.
3. **Deliberately did not revive `data/scenarios/roth-scenarios.json`.**
   Confirmed it's an earlier, superseded draft of the Roth-conversion arc
   already refined into `learning-journey-scenarios.json`, sharing two key
   names with materially different content — loading it would silently
   overwrite two already-working scenarios. Left in place, unloaded,
   undeleted pending a decision on whether to delete it outright.
4. Regression test in `tests/unit/services/ContentService.test.js`: loads
   the real files from disk through a mocked `fetch`, asserts every built-in
   scenario file's keys load with zero collisions, and specifically guards
   against `roth-scenarios.json` (or any future colliding file) ever
   silently winning that overwrite.
5. Recorded a new Backlog item for modeling COLA increases on `income[]`
   sources — surfaced by this same investigation, out of scope for this fix.

### Done criteria

- [x] `npm test` passes, no regressions
- [x] Verified via direct simulation: neither fixed scenario's monthly
      income exceeds a single Social Security benefit at any point
- [x] `ISSUES.md` #33 marked resolved
- [x] `docs/PLAN.md` Backlog gets the COLA modeling entry
- [x] `docs/study-guide.md` updated to mention the newly-reachable scenarios
- [x] Version bumped via `npm version patch` (→ `1.0.19`)

---

## v1.0.20 — Clear the mechanical ISSUES.md backlog, part 1: engine and validation (PATCH)

**Goal:** User asked to clear out remaining low-hanging fruit across
`ISSUES.md` and `docs/PLAN.md` Backlog. Triaged the OPEN list into
mechanical fixes (no open design question) vs. genuine decisions still
needing one; this version covers the engine/validation-layer mechanical
fixes. See v1.0.21+ for the rest.

### Scope

1. **`ISSUES.md` #23** — `applyDeposits()`'s `ReferenceError` on a deposit
   targeting a new asset. One-line fix (`assetNames` → `allAssetNames`).
2. **`ISSUES.md` #24** — `deposits[].start_month` off-by-one vs.
   income/asset-activation. `applyDeposits(month)` → `applyDeposits(month + 1)`.
   Fixing this activated a dormant assertion in an existing test that had
   never actually run (its guard condition was always false under the old
   timing) — corrected that assertion to isolate the deposit's effect from
   concurrent withdrawal drag rather than asserting a raw dollar amount.
3. **`ISSUES.md` #27** — duplicate asset names corrupting `balanceHistory`.
   Added a duplicate-name check to `ValidationService.validateAssets()` and
   `ScenarioBuilderService.validateFormData()` (the live path), erroring
   rather than silently deduping.

### Done criteria

- [x] Each fix's regression test confirmed red against the pre-fix code via
      a temporary revert, then green
- [x] `npm test` passes, no regressions
- [x] `ISSUES.md` #23, #24, #27 marked resolved
- [x] Version bumped via `npm version patch` (→ `1.0.20`)

---

## v1.0.21 — Clear the mechanical ISSUES.md backlog, part 2: Monte Carlo dead code and config (PATCH)

**Goal:** Continuation of the low-hanging-fruit sweep (see `v1.0.20`) —
Monte Carlo dead-code deletion and small config/validation fixes.

### Scope

1. **`ISSUES.md` #28** — deleted the entire dead Monte Carlo export chain
   (`MonteCarloController.exportResults()`/`downloadJSON()`/`downloadCSV()`,
   ~270 lines) and the dead `MonteCarloChart.displayScenarioPathsChart()`/
   `drawScenarioPaths()`, plus their DOM bindings in `MonteCarloUI.js` and
   two test files that called the dead chain directly. Left
   `monte-carlo-csv-success-logic.test.js` alone (tests a reimplementation,
   not the real dead chain — tracked separately in Backlog).
2. **`ISSUES.md` #29** — `index.html`'s iterations input `max` now matches
   `MonteCarloService.defaultConfig.maxIterations` (1,000, not 10,000).
3. **`ISSUES.md` #30** — `ExportController.generateMonteCarloCSV()` now
   builds dynamic asset-name columns, mirroring
   `generateMonteCarloReturnsCSV()`'s existing approach, instead of four
   hardcoded names that zeroed out any differently-named asset.
4. **`ISSUES.md` #31, several sub-items**: `prepareChartData`'s income
   trace now shows for `start_month: 0` or omitted (was invisible);
   `TaxService`'s constructor and `updateTaxConfig()` now sanitize rates
   `>= 1` instead of letting `net / (1 - rate)` divide by zero or go
   negative; deleted `MonteCarloChart.exportData()`/`calculatePercentileData()`
   (both dead, and the latter's filtering approach was already flagged
   `// WRONG (survivorship bias)` in the project's own docs); trimmed
   `main.js`'s `new MonteCarloController(...)` call to its real
   one-parameter signature.

### Out of scope (left OPEN, needs a decision, not mechanical)

The four-validators consolidation; `duration_months` coercion (earmarked
for `v1.1.0`); engine console-log volume (touches many scattered sites in
the hot loop, more invasive than the rest of this pass).

### Done criteria

- [x] Each fix's regression test confirmed red against the pre-fix code via
      a temporary revert, then green
- [x] `npm test` passes, no regressions
- [x] `ISSUES.md` #28, #29, #30 marked resolved; #31 updated per sub-item
- [x] Version bumped via `npm version patch` (→ `1.0.21`)

---

## v1.1.0 — Opt-in strict scenario validation (MINOR)

**Goal:** Resolve `ISSUES.md` #10 (missing `plan.duration_months` silently returns
an empty result) by adding a genuinely new capability — an opt-in strict mode —
rather than changing default behavior. This is the one item in the near-term plan
that adds new behavior, hence the MINOR bump rather than PATCH.

### Scope

1. Add `simulateScenarioAdvanced(scenario, options = {})` with `{ strict = false }`.
   When `strict: true`, validate required fields (`plan.duration_months`,
   `plan.monthly_expenses`, `assets`) up front and throw a clear, specific error
   naming the missing field — write the test first (missing `duration_months` with
   `strict: true` throws; same input with `strict` omitted does not).
2. Default (`strict` omitted/`false`) behavior changes from today's silent
   empty-result to at minimum a console warning identifying which field was
   missing and that the simulation produced no months — still non-throwing, but no
   longer silent. Test: missing `duration_months`, default options, simulation
   returns empty result **and** a warning was logged.
3. Wire `strict` through any call sites that should reasonably default to it (e.g.
   the JSON editor's `validateJson()` path, which already does its own ad hoc
   validation per §3.4 — evaluate whether to route it through this instead).
4. Update `docs/scenario-schema.json`'s description of `required` fields if needed
   to mention the `strict` option exists, and update `docs/SPEC.md` §2.6 to
   describe the new behavior (it currently documents the old silent-empty-result
   behavior as a known gap — that gap is what this version closes).

### Out of scope

Changing what counts as "required" in the schema; validating anything beyond the
three fields named above; Story Mode; `UIController` split.

### Done criteria

- [ ] `strict: true` throws a specific, actionable error for each of the three
      required-field cases
- [ ] Default behavior (no `strict` option) no longer fails silently — at minimum
      warns
- [ ] `npm test` passes; new tests added for both strict and default paths
- [ ] `docs/SPEC.md` §2.6 and `ISSUES.md` #10 updated to reflect resolved status
- [ ] `docs/DECISIONS.md` gets an entry recording which option was chosen (hybrid)
      and why, per the design discussion preserved in `ISSUES.md` #10
- [ ] Version bumped via `npm version minor` (→ `1.1.0`)

---

## Backlog (not yet assigned to a version)

Unscoped on purpose — each needs a decision made before it can get a real version
section with file changes and done criteria.

- **Story Mode: finish or cut.** Currently Deferred per `docs/BRIEF.md`. ~1,050
  lines (`StoryController.js`, `StoryEngineService.js`, `StoryUI.js`) sit fully
  built but disconnected behind a `Proxy` stub in `main.js`. Needs a decision on
  whether this is worth finishing (fix whatever overlay/display issue got it
  disabled on 2025-08-15 — see `DECISIONS.md`) before it can be scoped.
- **`UIController.js` split.** 2,234 lines, ~70 methods, doing display, chart-data
  prep, JSON editing, export, tax/withdrawal display, and custom-scenario modal
  management in one class (`docs/AUDIT.md` §3). Needs the target module boundaries
  decided (the audit suggests: chart data prep, JSON editor, export, custom-scenario
  modal, tax/withdrawal display) before this becomes a real version with a file
  scaffold.
- **CI coverage-threshold direction.** Thresholds were lowered to match actual
  coverage in 2025-09-17 rather than set as a target to grow into
  (`DECISIONS.md`). Needs a decision on whether to set a ratchet (thresholds only
  ever move up, enforced in CI) and what the near-term target should be.
- **`EventBus` robustness gaps** (`ISSUES.md` #12, found 2026-07-01). No
  `offAll(callback)`/per-owner unsubscribe — only exact `(event, callback)` pairs
  via `off()`, or clearing an entire event for every subscriber via
  `removeAllListeners()`. Not causing a bug today since all 19 current subscribers
  are long-lived singletons wired up once in `main.js`, but it's a leak trap the
  first time a subscriber becomes short-lived. Needs a decision on whether to add
  the API now (cheap, small surface) or wait until a real short-lived subscriber
  needs it. The `once()`/`forEach` re-entrancy issue (`ISSUES.md` #11) is separate
  and mechanical — that one belongs in a PATCH version, not here.
- **Fix the skipped rate-schedule test** (`ISSUES.md` #13, found 2026-07-02).
  `tests/integration/timeaware-engine-real.test.js:262` fails if re-enabled as-is —
  same `balanceHistory[name][0]` misunderstanding Issue 8 already fixed elsewhere in
  this file. Needs a real invariant designed (e.g. computing the expected balance
  from the known fixed rate) rather than a mechanical index fix, so it's not
  scoped into a version yet.
- **`min_balance` last-resort drawdown at shortfall auto-stop** (`ISSUES.md` #17,
  `DECISIONS.md` 2026-07-02). Considered and declined for now — see the decision
  entry for the full rationale. Revisit only if this becomes a real need rather
  than a hypothetical; if so, the shape discussed was an opt-in toggle (e.g.
  `plan.deplete_reserves_at_end`) rather than changing default behavior.
- **Learning Examples: finish or cut** (`ISSUES.md` #26, found by cross-analysis
  audit 2026-08-31). Two independent defects currently make this dead: the dropdown
  code reads `window.app` where `main.js` assigns `window.retirementApp`, and —
  more fundamentally — all nine files in `data/examples/` use a third scenario
  schema (`accounts[]`/`events[]`) the engine can't run, directly contradicting
  `docs/BRIEF.md`'s "everything is an asset" philosophy. Needs a decision on
  whether the nine files get converted to the real schema (several, e.g.
  `sequence-of-returns-shocks`, would be genuinely useful teaching scenarios and
  a natural regression fixture for the Monte Carlo return-model fix above) or the
  whole path is removed, following the `TabController` precedent (`ISSUES.md` #5),
  before the wiring bug is even worth fixing.
- **Two Monte Carlo test files exercise a hand-written reimplementation
  instead of production code** (`ISSUES.md` #21, found 2026-08-31 while
  migrating that issue's other files to a real-engine fixture).
  `tests/unit/controllers/monte-carlo-csv-success-logic.test.js` defines its
  own local `calculateIndividualSuccess()` and never calls the real
  `MonteCarloService`/`MonteCarloController` for the logic it claims to
  test; `tests/unit/survivorship-bias.test.js` defines a whole parallel
  `TestMonteCarloService`/`createMockSimulation()` (explicit in its own
  docstring: "without requiring the full engine") and never imports the real
  `MonteCarloService`. Neither file can regress or protect against a
  regression in real code. Needs a decision per file: rewrite
  `monte-carlo-csv-success-logic.test.js` to call the real, now-fixed
  `calculateIndividualSuccess()` (it looks like a straightforward swap), and
  decide whether `survivorship-bias.test.js`'s statistical illustration
  (survivorship bias vs. min-balance discrete-jump behavior) is more valuable
  kept as a self-contained math demonstration or rebuilt against the real
  engine.
- **`tests/unit/controllers/monte-carlo-controller-csv.test.js`'s ~12
  fabricated-shape mock sites are not worth fixing until Issue 28 is
  resolved** (`ISSUES.md` #21/#28). The file calls the real
  `MonteCarloController.downloadCSV()`, but that method is Issue 28's dead
  export chain (unreachable from the live UI). Fix Issue 28 first, then
  either delete this file with the code it tests or migrate whatever
  remains.
- **Model COLA (Cost-of-Living Adjustment) increases on `income[]` sources**
  (`ISSUES.md` #33, found 2026-09-01 while fixing the Social Security
  double-claim bug there). `income[]` entries are a flat `amount` today —
  no growth mechanism at all, unlike `assets[]` (`return_schedule`/
  `interest_rate`). Real Social Security COLA is applied **annually** (every
  January, based on CPI-W), not on a fixed multi-year cycle — the percentage
  varies year to year and is sometimes 0% in low-inflation years. A pension
  or other income source might have a different adjustment cadence entirely,
  or none. Needs a decision on the mechanism before scoping: reuse the
  existing `rate_schedules{}` system (add e.g. `income[].cola_schedule`,
  mirroring `assets[].return_schedule` — consistent with how growth/inflation
  already work elsewhere) vs. a simpler flat `income[].cola_rate`. Either
  way this is opt-in per income entry, not a global behavior change — most
  existing scenarios model flat nominal income deliberately (pensions,
  fixed annuities) and shouldn't start growing without being asked to.
