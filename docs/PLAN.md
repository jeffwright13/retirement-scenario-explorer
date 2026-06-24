# Retirement Scenario Explorer — Implementation Plan

_Each version section covers: goal, scope, file changes, and done criteria. Update
in place while a version is in progress; once shipped, leave the section closed
and record any scope changes as a new entry rather than rewriting history — see
`DECISIONS.md`. The **Backlog** section at the end is the living list of work not
yet assigned to a version._

---

## v1.0.2 — Bug fixes and dead-code removal (PATCH)

**Goal:** Fix every `ISSUES.md` item that has a mechanical, already-root-caused fix
and no open design question, and delete the code already confirmed dead. No new
behavior, no schema changes — pure correctness and cleanup.

### Scope

1. **Copy-scenario withdrawal order bug (`ISSUES.md` #1).** Write a regression test
   first — `copyScenario()` on a scenario with non-trivial `order[]` (not all `1`s)
   should produce form data whose assets retain their real order/weight — watch it
   fail, then fix it. Delete `ScenarioBuilderService.copyScenario()`/
   `convertScenarioToFormData()` (the dead duplicate). In
   `ScenarioBuilderController.convertScenarioToFormData()`, replace
   `order: asset.order || 1` with the existing `orderMap`-based lookup already used
   by `ScenarioBuilderService.convertJsonToForm()`.
2. **Income display missing stop_month (`ISSUES.md` #2a).** One-line fix in
   `extractKeyAssumptions()`: `income.end_month` → `income.stop_month`. Add a test
   asserting an income entry with a `stop_month` renders an "ends month N" detail.
3. **Dead `TabController` and the export-button bug it causes (`ISSUES.md` #4, #5).**
   Delete `scripts/controllers/TabController.js` and its instantiation in `main.js`.
   In `ExportController.js`, remove the dead `.tab-button` document-click listener
   and the `currentTab` tracking it feeds; gate the "📊 Results" button on
   `this.simulationResults !== null` alone (matching the Monte Carlo buttons' already-
   correct gating). Add a test asserting the Results button becomes visible after
   `simulation:completed` fires, with no dependency on any tab state.
4. **Other confirmed-dead code (`ISSUES.md` #6).** Remove `#export-config-btn` from
   `index.html` (zero JS binding). Delete `UIController.exportSingleResults()`,
   `main.js`'s `setupExportHandlers()`/`handleSingleScenarioExport()`/
   `exportSingleScenarioCSV()`/`exportSingleScenarioJSON()` (zero call sites,
   superseded by the now-fixed `ExportController` path). Remove
   `windfallUsedAtMonth: scenario._windfallUsedAtMonth` from
   `simulateScenarioAdvanced()`'s return value (never set).
5. **Close out resolved engine issues (`ISSUES.md` #8, #9).** Re-enable the
   `start_month` test in `tests/integration/timeaware-engine-real.test.js` (confirm
   it passes against current code). For the negative-balance test, fix its assertion
   to read the true pre-simulation total (sum of `asset.balance` from the input
   scenario) rather than `balanceHistory[name][0]`, or remove the assertion if it no
   longer makes a meaningful claim — re-enable either way.

### Out of scope

Issue 2b (Monte Carlo income timing), Issue 7 (orphaned vocabulary), Issue 10
(missing-fields handling), Story Mode, the `UIController` split — see later
versions and Backlog below.

### Done criteria

- [ ] All 5 scope items above complete with a regression test added per item
      before the fix (red → green)
- [ ] `npm test` passes, suite count reflects new tests added, no skipped tests
      remain from items 1–5 in this scope
- [ ] `~300` lines removed (`TabController.js` + the dead export chain) with no
      replacement code — net negative diff
- [ ] `ISSUES.md` updated: items 1, 2a, 4, 5, 6, 8, 9 marked resolved with the
      commit/PR that fixed them
- [ ] `DECISIONS.md` updated if any fix took a different approach than scoped above
- [ ] Version bumped via `npm version patch` (→ `1.0.2`)

---

## v1.0.3 — Income-display correctness and schema-vocabulary cleanup (PATCH)

**Goal:** Fix the remaining display/calculation bugs that need a little more care
than v1.0.2's mechanical fixes, but still introduce no new behavior or schema
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
   `retirement_age`, `life_expectancy`, `annual_growth_rate`, `initial_value`, and
   `end_month` handling from `ValidationService.js`, `UIController.js`,
   `ScenarioController.js`, and `SimulationService.js` — none of these fields exist
   in `scenario-schema.json` or are read by the engine. In
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
- [ ] Version bumped via `npm version patch` (→ `1.0.3`)

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
