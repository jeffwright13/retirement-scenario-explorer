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

## v1.0.7 — Income-display correctness and schema-vocabulary cleanup (PATCH)

**Goal:** Fix the remaining display/calculation bugs that need a little more care
than v1.0.2–v1.0.6's mechanical fixes, but still introduce no new behavior or schema
changes.

### Scope

1. **Monte Carlo "Expected income" ignores timing (`ISSUES.md` #2b).** Replace the
   naive `reduce((sum, inc) => sum + inc.amount, 0)` in `MonteCarloController.js`
   with logic that reports income honestly given it varies over time — e.g. "income
   ranges from $X to $Y/month across the simulation" or "$X/month initially,
   changing at month N" rather than a single static total. Write the test first
   with two non-overlapping income sources and assert the insight text does not
   claim a combined total that's never actually concurrent.
2. **Orphaned pre-schema vocabulary, four files (`ISSUES.md` #7).** Remove
   `retirement_age`, `life_expectancy`, `annual_growth_rate`, and `initial_value`
   handling from `ValidationService.js`, `UIController.js`, `ScenarioController.js`,
   and `SimulationService.js` — none of these fields exist in `scenario-schema.json`
   or are read by the engine. (`end_month` was the fifth orphaned field originally
   scoped here; it's already gone from `UIController.js`/`ScenarioController.js` as
   of v1.0.3's Issue 2a fix, which changed it to the real field, `stop_month`.) In
   `ValidationService.validateAsset()`, replace the `401k`/`ira`/`roth_ira`/...
   type-vocabulary check with the schema's real enum
   (`taxable`/`tax_deferred`/`tax_free`). Since this validation's output is
   currently unrendered (§ SPEC.md §1.8), this is safe to fix without any UI risk —
   but add a test confirming a real scenario (using the actual schema vocabulary)
   produces zero warnings, so the next person doesn't reintroduce the mismatch.
3. **Windfall-income documentation gap (`ISSUES.md` #3).** No code change — update
   the README's "Common Scenarios" section to explicitly warn that one-time income
   exceeding that month's expenses is discarded, not banked, and reinforce that a
   one-time windfall belongs in `assets[]` (as the existing "Inheritance or Lump Sum
   Windfall" example already correctly shows), not `income[]`.
4. **README example issues** (from `ISSUES.md`'s original notes): annotate each
   "Common Scenarios" example with whether it's an asset or income entry, and add
   an end date/duration note to the "Inheritance or Lump Sum Windfall" example where
   relevant.

### Out of scope

Issue 10 (new `strict` behavior — v1.1.0), Story Mode, `UIController` split.

### Done criteria

- [ ] Scope items 1–2 each have a test written before the fix
- [ ] `npm test` passes
- [ ] README changes (items 3–4) reviewed for accuracy against current engine
      behavior, not just old assumptions
- [ ] `ISSUES.md` items 2b, 3, and the two README notes marked resolved
- [ ] Version bumped via `npm version patch` (→ `1.0.7`)

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
