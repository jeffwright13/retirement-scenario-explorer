# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.
It combines with the same-named `CLAUDE.md` in `~/coding` (global preferences) to
define the specific behavior desired for this repo — this file wins on anything
project-specific; the global file governs everything else (git workflow, TDD, style).

## Project Overview

Retirement Scenario Explorer is a browser-based, client-side-only tool for modeling
retirement financial scenarios: assets, income streams, withdrawal order, and monthly
expenses (structured JSON) are run through a month-by-month simulation (the
"time-aware engine") to project balances, cash flow, and shortfalls. A Monte Carlo
mode re-runs the same scenario thousands of times against randomized returns to
estimate probability of success. No backend, no build step — plain HTML/CSS/JS.

Core design philosophy (see `docs/BRIEF.md`): **everything is an asset**. Windfalls,
one-time expenses, and reserves are modeled as time-aware `assets[]` with
positive/negative balances and `start_month`/`stop_month`, not as separate
`events[]`/`liabilities[]` constructs.

Single personal user (the developer's own retirement planning), public repo, no
adoption/onboarding push.

## Running the App

No build tools. Serve statically and open in a browser — `file://` is blocked because
`index.html` loads `scripts/main.js` as an ES module:

```bash
python3 -m http.server
# then open http://localhost:8000
```

## Testing

```bash
npm test              # jest, full suite
npm run test:unit      # tests/unit only
npm run test:integration
npm run test:coverage
npm run test:watch
```

Coverage is bimodal by design intent, not yet by achievement — `timeaware-engine.js`
and `scripts/ui/*` are well covered; `scripts/controllers/*` averages ~32% with some
files at 0%. See `docs/AUDIT.md` §1 before assuming a controller is safe to refactor
without adding tests first.

A `lint-staged` + `husky` pre-commit hook runs `jest --findRelatedTests` on staged
`.js` files.

## Architecture

**Entry point**: `scripts/main.js` constructs one `EventBus` and passes it into every
controller/service/UI component (constructor injection) — nothing imports another
component directly. See `scripts/core/EventBus.js`; it's a synchronous pub/sub
(`Map<event, callback[]>`), not a library. Event names follow a `domain:action`
convention (`scenario:selected`, `simulation:completed`) but the bus does no
namespace/wildcard matching — it's just a naming discipline.

**Layers**:
- `scripts/controllers/*` — orchestration: listen for UI-originated events, call
  services, emit result events. `ScenarioController`, `MonteCarloController`,
  `WorkflowController`, `UIController` (largest, ~2,234 lines, several
  responsibilities bundled — see `docs/AUDIT.md` §3 and the Backlog item in
  `docs/PLAN.md` for the planned split), plus `ExportController`,
  `InsightsController`, `ScenarioBuilderController`. `TabController` is dead code
  slated for removal (`ISSUES.md` #5).
- `scripts/services/*` — stateless-ish logic: `SimulationService`, `TaxService`,
  `ValidationService`, `ReturnModelService`, `MonteCarloService`, `ContentService`,
  `ExamplesService`, `ScenarioBuilderService`. `StoryEngineService` is built but
  disconnected (Story Mode is deferred, see `docs/BRIEF.md`/Backlog).
- `scripts/ui/*` + `scripts/components/*` — DOM rendering and Plotly chart
  components (`MonteCarloChart`), driven entirely by events in/out.
- `scripts/timeaware-engine.js` — the core month-by-month simulation engine. This is
  the most heavily tested file in the repo; changes here need a regression test
  first regardless of how small.

**Example flow** (scenario selection → render): user clicks a scenario in the UI →
`UIController` emits `scenario:select` → `ScenarioController` loads/validates and
emits `scenario:loaded`/`scenario:selected` → `UIController` (and others) react and
update the DOM. Emitter and listener never reference each other's classes.

## Project Documentation Conventions (this repo's specifics)

This repo follows the global `docs/` template (`BRIEF.md`/`SPEC.md`/`DECISIONS.md`)
plus two more documents, each with a distinct role — read the top of each before
adding to it:

- **`docs/BRIEF.md`** — stable: what/why/who/constraints. Rarely changes.
- **`docs/SPEC.md`** — living, organized by feature area (not by source file),
  describing actual current behavior including known gaps.
- **`docs/DECISIONS.md`** — append-only rationale log.
- **`docs/PLAN.md`** — versioned roadmap. Each version section covers goal, scope,
  file changes, done criteria; edit in place while a version is in progress, then
  leave it closed once shipped. The **Backlog** section at the end holds work that
  needs a decision before it can be scoped into a version — don't put mechanical,
  already-root-caused fixes there; those belong in the next appropriate version
  (see `ISSUES.md` #11 landing in v1.0.2 as precedent).
- **`ISSUES.md`** (repo root, not `docs/`) — root-caused bug/finding backlog, one
  `### Issue N` entry per item, numbered sequentially and never renumbered. Status
  is tagged inline (`OPEN`, `RESOLVED`, or untagged/default-open). Findings can come
  from a user-reported symptom (cite the SPEC.md section that root-caused it) or
  from direct code reading (say so, with a date) — both are valid, label which one
  it is.
- **`docs/AUDIT.md`** — a **frozen, one-time snapshot** (dated in its own header).
  Do not edit it as the code changes. New findings that would have belonged in an
  audit go into `ISSUES.md` and/or `docs/PLAN.md` Backlog instead; superseded
  findings in it get resolved elsewhere, not updated in place.

When a change closes an `ISSUES.md` item, mark it resolved in place (don't delete
the entry — the root-cause writeup has standing value) and update the citing
`docs/PLAN.md` done-criteria checkbox in the same commit.

## Current Known Gaps (as of last audit/plan pass)

- Story Mode (`StoryController`/`StoryEngineService`/`StoryUI`, ~1,050 lines) is
  fully built but disconnected behind a stub — deferred, not abandoned.
- `UIController.js` needs a split (display / chart-data prep / JSON editor / export
  / custom-scenario modal) — unscoped pending target module boundaries.
- CI coverage thresholds were lowered to match reality in 2025-09-17 rather than
  set as a target — direction (ratchet vs. static) is an open Backlog decision.

Don't treat any of the above as license to skip tests on adjacent code — it's
recorded debt, not an invitation to add more.
