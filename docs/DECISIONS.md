# Retirement Scenario Explorer — Decision Log

_Append-only. One entry per meaningful architectural or design choice. Format: date,
decision, rationale. Newest first._

_The entries dated 2025-08 and 2025-09 below are **reconstructed**, not contemporaneous
— this project kept no decision log during its original ~6-week build. Each is
flagged **(verified)** when its rationale is quoted/paraphrased directly from the
commit message that made the change, or **(inferred)** when the rationale is this
log's best reconstruction from commit content, timing, and the current code —
correct it or strike it if it doesn't match what actually happened._

---

## 2026-06-22 — Documentation baseline established: AUDIT.md, BRIEF.md, SPEC.md, ISSUES.md consolidation

**Decision:** Adopted the same documentation methodology used in `~/coding/krashen`
— `BRIEF.md` (stable facts), `SPEC.md` (living, feature-by-feature), `DECISIONS.md`
(this file), plus a one-time `docs/AUDIT.md` snapshot. `SPEC.md` is organized by
user-facing feature domain rather than by source file (durable across refactors),
written as a thin layer that links out to the project's existing deep-dive docs
(Monte Carlo, schema, return models) rather than duplicating them, and notes known
behavioral gaps inline rather than only describing intended behavior. Story Mode is
marked **Deferred** (not permanently cut) in `BRIEF.md`. `INTEGRATION_TEST_ISSUES.md`
(gitignored, untracked) was fully folded into `ISSUES.md` and deleted, so there's one
tracked issue log instead of two.
**Rationale:** The project was returned to after ~10 months idle with no living spec
and no decision log — this session's audit found real, previously-unverified claims
in the one informal issue doc that existed (two of three "open bugs" were already
fixed; nobody had checked). A single source of truth, checked against running code
rather than restated from memory, was worth the upfront cost. Story Mode was kept as
Deferred rather than Cut because it's a substantially-built, coherent feature
(chaptered narrative content already exists in `data/stories/`), not abandoned
scaffolding — see 2025-08-15 below for how it was disabled.

---

## 2025-09-17 — Coverage thresholds lowered to match actual coverage **(verified)**

**Decision:** `jest.config.js` thresholds dropped to whatever coverage already was
(`59f1e72`, `73816f6` — the two commits report different "current coverage" snapshots
hours apart, 51%/44%/53% vs. 28%/25%/30%, most likely measured before vs. after a
large batch of new source files landed in the same session and diluted the average).
**Rationale (from the commit message):** "Prevents GitHub Actions failures while
maintaining quality gates." This made CI pass again after a coverage dip, but set the
threshold to current reality instead of a target above it — see `docs/AUDIT.md` §1
for why this matters: the gate now can't catch further erosion, only wildly worse
collapse.

---

## 2025-09-16 — Tax-aware withdrawal system added **(verified)**

**Decision:** Introduced `TaxService` with configurable rates by account type
(`tax_deferred` 22%, `taxable` 15%, `tax_free` 0%) and reworked the engine's
withdrawal functions (`processWithdrawals`, `withdrawFromSingleAsset`,
`withdrawProportionally`) to gross up withdrawals so the *net* (after-tax) amount
covers the shortfall, rather than withdrawing the raw shortfall amount. Schema
gained `plan.tax_config`.
**Rationale (from the commit message):** "Fix critical accuracy gap where
tax-deferred accounts appeared to last longer than realistic" — modeling withdrawals
without taxes overstated how long tax-deferred accounts would actually last.
Explicitly called out as a breaking change to withdrawal amounts. This is the
mechanism documented in `docs/SPEC.md` §2.2, and the reason a $4,000 net need can
debit ~$4,706 gross from a taxable account.

---

## 2025-09-16 — Delayed asset (`start_month`) activation bug fixed **(verified)**

**Decision:** Fixed double-recording in balance history for delayed assets, using
an explicit `activatedThisMonthSet` to distinguish a just-activated asset (record
starting balance, no growth yet) from an already-active one, and corrected off-by-one
indexing in tests.
**Rationale (from the commit message):** Delayed assets were showing non-zero
balances before their activation month and balance-history arrays had the wrong
length. This is the fix that makes `docs/SPEC.md` §2.3 true today — and the reason
`INTEGRATION_TEST_ISSUES.md` Issue #2 (folded into `ISSUES.md` Issue 9) turned out to
already be resolved when re-verified in 2026-06: this commit fixed it, nine months
before that doc was written or read again.

---

## 2025-08-20 — Progressive learning examples added as a second, parallel content system **(verified fact; "parallel system" framing inferred)**

**Decision:** Added `ExamplesService` plus `data/examples/catalog.json` and 8
graduated example scenarios (beginner → advanced), merged into the same scenario
dropdown as built-in/custom scenarios via a third `<optgroup>`.
**Rationale (from the commit message):** Provide "a structured learning path for
retirement planning concepts from basic arithmetic validation to advanced dynamic
strategies" alongside the existing built-in scenarios. **(inferred)** This is the
origin of the two-independent-content-systems structure noted in `docs/SPEC.md`
§3.1 (`ExamplesService` + `ContentService`, different schemas, unified only at the
UI dropdown level) — at the time, bolting on a separate service was presumably the
fastest way to ship a curated curriculum without restructuring the existing
scenario-loading code.

---

## 2025-08-16 — Income field name bug fixed: `monthly_amount` → `amount` **(verified)**

**Decision:** Corrected 4 call sites across `UIController`, `ScenarioController`,
and `SimulationService` that read a non-existent `monthly_amount` field instead of
the schema's actual `amount`.
**Rationale (from the commit message):** "Aligns code with actual JSON schema
structure." **(inferred)** Notable in hindsight: this is the same class of bug —
display/orchestration code drifting from the schema's real field names — that
recurred later and was never fully eradicated. `docs/SPEC.md` §1.8/§4.2 (`ISSUES.md`
Issue 7) found the same pattern still live across four files a year later
(`retirement_age`, `life_expectancy`, `annual_growth_rate`, `initial_value`,
`end_month`). Fixing each occurrence as it's noticed, rather than once
systematically, appears to be how this keeps coming back.

---

## 2025-08-15 — Story Mode disabled, five days after shipping **(verified fact; rationale inferred)**

**Decision:** `main.js` replaced the real `StoryController` with a `Proxy` stub that
warns and no-ops, and force-reverted any `mode:switch-to-story` event back to
`mode:switch-to-scenario`. `StoryController.js`, `StoryEngineService.js`, and
`StoryUI.js` were left in place, fully built, just disconnected.
**Rationale (inferred):** Story Mode shipped 2025-08-10 (`bbfb5f3`); the architecture
refactor three days later (2025-08-13, `7d94e96`) ends with the note "Story Mode
overlay issues remain for next session." Two days after that, it was disabled rather
than fixed. The most likely read: a display/overlay bug interacting with the new
modular architecture wasn't worth resolving immediately, and disabling was faster
than debugging it under deadline pressure for what was, even then, a secondary mode
next to the core scenario-modeling tool. See `docs/BRIEF.md` → Deferred and
2026-06-22 above for the current status (kept as a real feature to finish, not
removed).

---

## 2025-08-13 — Event-driven service/controller/UI architecture established **(verified)**

**Decision:** Replaced the monolithic `main.js` with the `EventBus` + services
(`SimulationService`, `ContentService`, `ValidationService`) + controllers
(`UIController`, `ScenarioController`, `StoryController`) layering that the codebase
still uses today.
**Rationale (from the commit message):** "Refactored monolithic main.js into
event-driven modular architecture" alongside fixing chart rendering and an asset
calculation bug. This is the architectural foundation everything in `docs/BRIEF.md`
§Technology and `docs/SPEC.md` describes — and per `docs/AUDIT.md` §2, it has held up
well, with the notable exception of `main.js` itself later reaching directly into
`UIController` internals for export handling rather than going through the bus it
established here.

---

## 2025-08-11 — CSS restructured from a 2,200-line monolith into a modular system **(verified)**

**Decision:** Split `styles/main.css` into 7 purpose-specific files (later grown to
13) — variables, reset, layout, components, themes, utilities, etc.
**Rationale (from the commit message):** Explicitly "no functional changes,
improved maintainability." Unlike the JS controller layer (`docs/AUDIT.md` §3), this
modularization stuck — the CSS layer was found to be reasonably organized by concern
when audited a year later.

---

## 2025-08-06 — Withdrawal order model: `order[]` replaces `priority`/`withdrawal_priority` **(verified fact; rationale inferred)**

**Decision:** Scenarios now specify withdrawal sequencing via a top-level `order[]`
array (`{account, order, weight}`), superseding an earlier `priority`-based field.
The old field remains in the schema today as accepted-but-legacy
(`withdrawal_priority[]`, `docs/SPEC.md` §1.5).
**Rationale (inferred from the rename itself):** "Order" more directly describes
"which account gets drawn down first" than "priority," which could be read as
importance rather than sequence. This is also the earliest sign of the
"everything is an asset" / explicit-sequencing design that the rest of the schema
builds on.
