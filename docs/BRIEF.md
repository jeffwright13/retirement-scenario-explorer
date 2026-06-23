# Retirement Scenario Explorer — Project Brief

_Stable document: what this is, why it exists, who it's for, and hard constraints.
Update when the fundamentals change; not a changelog._

---

## What It Is

Retirement Scenario Explorer is a browser-based tool for modeling and visualizing
retirement financial scenarios. A scenario is structured JSON — assets, income
streams, withdrawal order, monthly expenses — and the tool runs a month-by-month
simulation (the "time-aware engine") to project account balances, cash flow, and
shortfalls over the plan's duration. Results render as interactive charts and export
to CSV/JSON. A Monte Carlo mode re-runs the same scenario thousands of times against
randomized return sequences to estimate a probability of success rather than a single
deterministic outcome.

The core design philosophy, stated in the README: **everything is an asset**.
Windfalls, one-time expenses, future accounts, and emergency reserves are all
expressed as time-aware `assets[]` with positive or negative balances, rather than
requiring separate `events[]` / `liabilities[]` / `shocks[]` constructs.

## Who It's For

A single personal user (the developer), used for actual retirement planning. The
repository is public on GitHub with issues and PRs open, but there's no active push
for adoption, onboarding polish, or hosted deployment.

## The Core Loop

1. User selects a scenario — a built-in example, a previously saved custom scenario,
   or one authored via the in-app Scenario Builder
2. User reviews/edits the scenario's assets, income, withdrawal order, and plan
   parameters (directly as JSON, or through the builder UI)
3. Tool runs the time-aware simulation: each month, sum income, subtract expenses,
   withdraw any shortfall from assets per the configured order, apply interest
   growth, record state
4. Results render as charts (balances, cash flow, drawdown) plus a financial/tax
   summary
5. User can switch to Monte Carlo mode to re-run the same scenario across many
   randomized return sequences and see a probability-of-success distribution instead
   of one outcome
6. Results export to CSV/JSON for external analysis

## Constraints (Hard)

- **Browser-only.** No backend, no build step, no bundler. Plain HTML/CSS/JS loaded
  via ES modules.
- **Requires a local web server to run.** Browsers block `file://` access to ES
  module `import`/`export`; there is no hosted deployment.
- **No accounts, no server-side state.** All persistence (saved custom scenarios) is
  `localStorage`, keyed under `retirement-explorer-user-scenarios`.
- **No telemetry or analytics.** Nothing leaves the browser.
- **Not financial advice.** Tax and modeling logic are simplifications for personal
  planning and learning, not a substitute for professional advice (see
  `docs/complete-guide.md`).

## Technology

- Vanilla HTML/CSS/JavaScript, ES modules, no framework.
- Event-driven internal architecture: a central `EventBus`
  (`scripts/core/EventBus.js`) decouples services (business logic) from controllers
  (orchestration) from UI (DOM rendering).
- Testing: Jest + jsdom, Babel for ES module transform. Husky pre-commit hook runs
  related tests via `lint-staged`.
- CI: GitHub Actions runs the test suite and coverage on push/PR against Node 18.x
  and 20.x; coverage uploads to Codecov.

## Permanently Out of Scope

- Server-side/cloud sync, user accounts, multi-user features
- Live brokerage/account data integration
- Tax filing or professional financial advice — modeling is illustrative for
  personal use, not authoritative (see Constraints above)

## Deferred (architecture must not foreclose)

- **Story Mode** — a guided educational narrative ("learning journey") that walks a
  user through retirement-planning concepts via staged chapters with narrative text
  and progressively complex scenarios (see `data/stories/learning-journey.json`).
  Substantially built (`StoryController.js`, `StoryEngineService.js`, `StoryUI.js`)
  but currently hard-disabled: `main.js` swaps in a `Proxy` stub in place of the real
  `StoryController` and blocks the mode-switch event. Treat as a real feature to
  finish, not dead code to delete — see `docs/AUDIT.md` §2 and §5 for the current
  state.
- Hosted/public deployment (e.g. GitHub Pages), if the audience ever broadens beyond
  personal use
