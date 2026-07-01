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
