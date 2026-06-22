# Codebase Audit — 2026-06-22

_One-time snapshot, not a living document. Performed by Claude (Sonnet 4.6) at the
project owner's request, ahead of deciding whether to improve or re-implement parts
of the codebase. Reflects the state of `main` as of this date; do not edit in place
as the code changes — superseded findings should be resolved (fixed, accepted, or
moved into `DECISIONS.md`/`ISSUES.md`), not updated here._

## Context

The codebase was originally built using GPT-5 roughly a year before this audit.
Git history confirms a single intensive build period: all 149 commits land in
August–September 2025, with no commits since. The project owner is now returning to
it and wants an outside read on architecture, test coverage/correctness, modularity,
documentation, and UI flow before deciding on next steps.

## Method

Static analysis only — no behavioral changes were made. Ran the existing test suite
and coverage report, read `main.js`/`EventBus.js` in full, sized every source and
test file, traced which controllers/services are actually wired into the app vs.
imported-but-stubbed, inspected `index.html` and the CSS layer, and reviewed git/tag
history.

---

## 1. Test coverage & correctness

The suite passes cleanly: **40 suites, 734 passing, 4 skipped, 0 failing.** But
coverage is bimodal, not uniformly weak:

| Layer | Coverage | Note |
|---|---|---|
| `scripts/timeaware-engine.js` (core financial engine) | 92% | Well tested |
| `scripts/ui/*` (3 files) | 98% | Well tested |
| `scripts/services/*` (avg) | ~70% | Mixed — `TaxService`/`ValidationService` near 100%, `StoryEngineService` and `ExamplesService` at **0%** |
| `scripts/controllers/*` (avg) | 32% | `TabController.js`, `StoryController.js` at **0%**; `ScenarioController.js` (511 lines, core simulation orchestration) at **8.7%**; `UIController.js` (2234 lines) at **22%** |

Things that matter more than the raw 53% overall number:

- **The CI coverage gate was lowered to match reality instead of driving improvement.**
  `jest.config.js` thresholds (40% branches / 50% functions / 50% lines / 50%
  statements) carry comments like `// Current: 44.46%, target: 50%` — the bar was set
  to wherever coverage already sat, in commit `73816f6 fix: adjust coverage
  thresholds to match current codebase reality`. That's a ratchet running backwards.
- **4 skipped integration tests correspond to 3 real, unresolved bugs**, documented in
  `INTEGRATION_TEST_ISSUES.md` (gitignored, never tracked):
  - `start_month` on assets is **documented in the schema but not implemented** —
    delayed assets never activate (`docs/scenario-schema.json` vs.
    `scripts/timeaware-engine.js`).
  - Negative-balance ("planned expense") assets are off by a fixed $4,000 in the
    initial-total calculation.
  - The engine silently applies defaults instead of throwing on missing required
    fields — an open design question (strict validation vs. graceful defaults), not
    just a bug.
  
  Rather than fix or formally accept these, the failing tests were skipped and left.
- **Passing tests don't always test the right thing.** `ISSUES.md` (the project
  owner's own untracked notes) reports that copying a scenario resets all Withdrawal
  Order values to 1 — and that's the most recently shipped feature (last two commits,
  "comprehensive copy scenario feature with enhanced UX"). `tests/integration/
  copy-scenario-workflow.test.js` (290 lines, all green) mentions `order` exactly
  once, in a fixture, and never asserts that order values survive a copy. Green
  tests gave false confidence here.

## 2. Architecture

The bones are sound: `scripts/core/EventBus.js` (118 lines) is a clean, minimal
pub/sub, and `scripts/main.js` wires up a textbook services → controllers → UI
layering with clear separation of concerns. This part holds up well a year later.

Two cracks:

- **`main.js` itself breaks the pattern it sets up.** The whole point of the
  EventBus is to avoid direct coupling between layers, but
  `handleSingleScenarioExport()` (`main.js:128`) reaches directly into
  `this.uiController.currentSimulationResults` instead of going through an event.
  It's the one place the "loose coupling via EventBus" architecture is violated, and
  it's in the orchestration root.
- **A disabled feature is stubbed with a `Proxy` hack instead of being finished or
  removed.** `main.js:98-110` replaces `StoryController` with a
  `new Proxy({}, ...)` that logs a warning on every method call, plus an event
  listener that force-reverts any attempt to switch into Story Mode back to Scenario
  Mode. Meanwhile `StoryController.js` (307 lines) and `StoryEngineService.js` (337
  lines) are still imported and instantiated as real services, and `StoryUI.js` (410
  lines, 100% test coverage) is still fully initialized — roughly 1,050 lines kept
  alive in service of a feature that's actively blocked from ever running.

## 3. Modularity

File sizes tell the story plainly:

```
2234  scripts/controllers/UIController.js
1473  scripts/components/MonteCarloChart.js
1026  scripts/services/MonteCarloService.js
1008  scripts/controllers/MonteCarloController.js
 723  scripts/services/ContentService.js
 712  scripts/ui/ScenarioBuilderUI.js
 698  scripts/services/SimulationService.js
```

`UIController.js` is the standout problem — a god object with roughly 70 methods
doing: dropdown population, scenario-detail rendering, JSON editing, chart **data
prep** (not just rendering — `prepareChartData()` at line 1355), CSV conversion,
tax-summary display, withdrawal-detail display, custom-scenario modal management,
and localStorage CRUD for saved scenarios — all in one class. It's also why its own
coverage is only 22%: a class doing eight jobs is hard to unit-test as a whole.
Splitting it along those seams (chart data prep, JSON editor, export, custom-scenario
modal, tax/withdrawal display) would shrink it by 70%+ and make each piece
independently testable.

`MonteCarloChart`/`MonteCarloService`/`MonteCarloController` are large but more
defensible — Monte Carlo is a genuinely large feature area; worth a look once
`UIController` is handled.

## 4. State documentation

There is no `SPEC.md`, `DECISIONS.md`, `ARCHITECTURE.md`, or `BRIEF.md` anywhere in
the repo. `docs/` (12 files prior to this audit) is solid *feature-level*
documentation — Monte Carlo internals, return-model service, schema reference, story
integration — but nothing captures overall system state, what's known-working,
what's known-broken, or why a given design choice was made. The closest things to a
living issue log are `ISSUES.md` (untracked) and `INTEGRATION_TEST_ISSUES.md`
(gitignored) — both informal, neither part of the tracked project history, so neither
survives a fresh clone or shows up in `git log`.

**Versioning was never actually wired up.** `package.json`'s `version` field has been
`"1.0.0"` since the very first commit and has never changed since (confirmed via
`git log -p --follow -- package.json`). Separately, the repo has 13 lightweight git
tags (`v0.2` through `v0.11.0-rc.2`, plus `v0.9.1`) applied directly with `git tag`
during the August 2025 build — these track informal pre-1.0 progress but were never
synced with `package.json`, so the two version signals disagree and neither was ever
bumped with `npm version`. There's also a stray tag literally named `rm` (commit
`13106bf`, 2025-08-07) that looks like an accidental `git tag rm` rather than a real
release point — left untouched by this audit, flagged for the owner to decide.

## 5. UI flow

Three separate controllers each own a slice of "what's currently visible":
`ModeController` (Scenario vs. Story mode), `WorkflowController` (3-step guided
progression), `TabController` (tab switching within Scenario mode). That division
isn't inherently wrong, but combined with the half-disabled Story Mode, a
user-facing mode toggle exists for a mode that's hard-blocked the moment it's
selected (`mode:switch-to-story` immediately bounces back to
`mode:switch-to-scenario`, `main.js:107-110`). Removing Story Mode end-to-end would
cut a whole axis of state out of the UI flow, not just delete dead code — likely the
highest-leverage simplification available.

`index.html` (591 lines) and the CSS layer (13 files split by concern — themes,
layout, components, monte-carlo, scenario-builder, workflow, modals, variables,
utilities) are reasonably organized; the complexity is concentrated in the JS
controller layer, not the markup/styling.

---

## Prioritized recommendations

1. **Decide on Story Mode** — finish it or remove it end-to-end (3 files, ~1,050
   lines, the `main.js` Proxy hack, and a UI mode toggle that currently dead-ends).
2. **Fix or formally punt the 3 documented engine bugs** in
   `INTEGRATION_TEST_ISSUES.md` — especially `start_month`, since it's a
   schema-documented feature users would reasonably expect to work.
3. **Split `UIController.js`** — the single biggest modularity win, and its low test
   coverage is a direct consequence of its size.
4. **Write the test that would have caught the copy-scenario withdrawal-order bug**,
   then fix the bug (`ISSUES.md` issue 1).
5. **Establish a real documentation/versioning baseline** — `BRIEF.md`/`SPEC.md`/
   `DECISIONS.md` (and decide on `PLAN.md`), plus a consistent version number going
   forward via `npm version`. See `DECISIONS.md` once established for the resolution
   of the version-numbering question raised in §4 above.
