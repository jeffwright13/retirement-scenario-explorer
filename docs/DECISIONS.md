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

## 2026-09-01 — `docs/PLAN.md`'s Backlog is the single current-status source of truth; `ISSUES.md` holds root-cause detail only

**Decision:** Stopped duplicating full write-ups in both `ISSUES.md` and
`docs/PLAN.md`'s Backlog section. Going forward: `ISSUES.md` is the sole place
for root-cause investigation and fix detail, numbered and never renumbered;
`docs/PLAN.md`'s Backlog section is a dated, current-status index of exactly
which `ISSUES.md` numbers are open and awaiting a decision, kept in sync with
`ISSUES.md`'s actual OPEN list, with short pointers rather than restated
paragraphs. `docs/BRIEF.md` also got a factual correction in the same pass (see
below).

**Rationale:** A user review of the docs found two concrete symptoms of drift:
`docs/PLAN.md`'s Backlog entries had grown to duplicate multi-paragraph content
already in `ISSUES.md` almost verbatim, and two currently-OPEN `ISSUES.md`
items (#32's remaining findings, #36) had no Backlog entry at all — the two
files had silently fallen out of sync with each other. Reviewed
`~/coding/chronicle-weaver` and `~/coding/krashen` (per-repo `docs/` convention
shared across this user's active projects) for how they avoid this: neither
keeps a separate root-level issues file at all -- `krashen/docs/PLAN.md`
instead keeps one dated "Current backlog (as of DATE)" section as the sole
current-status source of truth, explicitly marking older per-version
"deferred"/"known issues" lists as stale historical snapshots not to be
trusted or edited in place, with short one-line pointers out to a dedicated
subsection for anything that needs more detail. This repo's `ISSUES.md` format
(numbered, root-caused, referenced by number from dozens of test names and
code comments across the codebase) is more mature on the detail axis than
either of those repos and not worth abandoning or renumbering -- so rather
than fully merging issue-tracking into `PLAN.md` the way `krashen`/
`chronicle-weaver` do, this adopts their *single-current-list* discipline
while keeping `ISSUES.md` as the detail store `PLAN.md`'s Backlog points into,
which is what `CLAUDE.md`'s existing (but previously unenforced) description
of the two files already implied. Backlog *content* decisions (#10, #12, #13,
#17, #26, #31's remaining sub-items, #32's remaining findings, #36) were
explicitly left unresolved in this pass -- this is a documentation-process
fix, not a decision on any of them.

## 2026-09-01 — `docs/BRIEF.md` corrected: GitHub Pages hosting is not deferred, it's been live for a year

**Decision:** Removed the "Deferred" bullet "Hosted/public deployment (e.g.
GitHub Pages), if the audience ever broadens beyond personal use," and added a
factual note under "Who It's For" instead: a live mirror is hosted on GitHub
Pages, kept for the developer's own convenience (checking a scenario without
running a local server), not as an onboarding/adoption path.

**Rationale:** Checked the actual GitHub Pages build history while fixing an
unrelated version-display staleness issue this session: the earliest recorded
Pages build is from **2025-09-09** — nine months before `docs/BRIEF.md` was
even written (`DECISIONS.md` 2026-06-22, "Documentation baseline
established"). The "Deferred" framing was never accurate; it described a
future state that had already happened before the sentence was written. Also
surfaced a separate, real operational issue while investigating this — Pages'
auto-build-on-push has stopped firing reliably — recorded as `ISSUES.md` #37
rather than duplicated here, since it's not yet root-caused and still open.

**Decision:** Replaced the Single Scenario chart's `tickformat: '$,.0f'` (exact
dollars, e.g. `$800,000`, never abbreviates) and the Monte Carlo chart's manual
`value / 1000` + hardcoded `ticksuffix: 'K'` (didn't rescale past a million,
e.g. `$4000K`) with the same convention on both: raw dollar values in the
trace/percentile data, `yaxis: { tickprefix: '$', tickformat: '.2~s' }` for the
tick labels. Verified the exact output against real `d3-format`: `800000 ->
"800k"`, `4000000 -> "4M"`, `1234567 -> "1.2M"`.

**Rationale:** User-reported disparity (`ISSUES.md` #35) -- the two charts
formatted the same kind of value two different clunky ways, and neither
auto-scaled. `.2~s` was chosen after confirming its actual output with a
scratch `d3-format` install rather than assuming d3's SI-prefix behavior from
memory, since precision/rounding specifics there are easy to get wrong.

## 2026-09-01 — Monte Carlo chart's X-axis stays relative years, not calendar dates

**Decision:** Kept `xaxis.title: 'Years from Simulation Start'` with relative
year values (`0, 1, 2, ...`) rather than converting to calendar years/dates
via `plan.start_date` the way the Single Scenario chart's X-axis now does.

**Rationale:** Put directly to the user as a design choice (`ISSUES.md` #35):
a probability-of-success distribution across thousands of trials is about "how
many years does this last," not a specific calendar date, and calendar labels
would clutter a 20-30 year axis. User confirmed relative years over calendar
years.

## 2026-09-01 — Single Scenario chart's legend anchors inside the plot's top-right corner, matching Monte Carlo, trading a small overlap risk for full-width plotting area

**Decision:** Single Scenario chart's `legend` now sets `{x: 1, y: 1, xanchor:
'right', yanchor: 'top'}` (floating inside the plot, top-right corner) instead
of Plotly's default outside-plot placement, which reserved a dedicated margin
strip on the right whether or not it was actually needed.

**Rationale:** User-reported disparity (`ISSUES.md` #35): the Monte Carlo
chart already used this inside-corner placement and filled its full container
width as a result; Single Scenario's default outside placement made its
plotting area narrower for no functional reason. Confirmed with the user this
fits Single Scenario's typical curve shape -- nearly every scenario's asset
balances trend toward zero as time increases, so the top-right corner is
reliably empty late in the timeline, the same condition Monte Carlo's charts
already relied on. Traded off against a real but accepted risk: on a chart
where a curve stays high into the top-right (an atypical scenario), the
floating legend could overlap data -- accepted since it's the exception, not
the common case.

## 2026-09-01 — `plan.start_date` parses a bare `YYYY-MM-DD` as a local calendar date, not via `new Date(str)`

**Decision:** `UIController.resolveScenarioStartDate()` hand-parses a
`YYYY-MM-DD` string into year/month/day components (`new Date(year, month - 1,
day)`) instead of passing it straight to `new Date(str)`.

**Rationale:** `ISSUES.md` #34 wired the previously-dead `plan.start_date`
field into chart/withdrawal-detail date labels for the first time. The first
implementation used `new Date(str)` directly and its own regression test
caught the bug before it shipped: `new Date('2033-01-01')` parses as UTC
midnight, which silently renders as December 2032 in any timezone behind UTC
(caught the test asserting `2033-01-01` renders as `01-33` failing with
`12-32` instead). Worth recording since this is a generic JS date-parsing
footgun, not specific to this field -- any future code parsing a bare
date-only string in this codebase should use the same local-date construction
rather than re-discovering this bug.

## 2026-09-01 — `compounding: 'annual'` gets the doc-honesty fix, not a real implementation

**Decision:** For `ISSUES.md` #25 (`compounding: 'annual'` documented in the
schema and `docs/SPEC.md` but never implemented -- the engine always compounds
monthly), marked the field `Future:` in both `docs/scenario-schema.json` and
`docs/SPEC.md` and rewrote the test that had been asserting a local
reimplementation of annual compounding (giving false confidence the real
feature worked) to instead assert the real engine's actual no-op behavior via
`simulateScenarioAdvanced`.

**Rationale:** Building real annual compounding (tracking month-of-year,
applying `(1 + rate) - 1` once per 12 months) was flagged to the user as the
available alternative but not chosen -- confirmed via `grep` that no live
scenario file under `data/` uses `compounding: 'annual'`, so the doc-honesty
fix changes no runtime behavior for any real scenario today, and building the
real feature can happen later if a scenario actually needs it.

---

## 2026-08-31 — Monte Carlo return randomization: grouped by investment_type, drawn monthly, layered additively on the scenario's own configured rate

**Decision:** Fixing `ISSUES.md` #19 (Monte Carlo drew one constant random
annual return per rate schedule per trial — no month-to-month variation, so
a single unlucky-high draw compounded unchecked for the whole horizon,
observed live by the user as a single trajectory ending near $900M). Three
open design questions were resolved by the user rather than assumed:

1. **Randomization is grouped by `investment_type`** (stocks/bonds/mixed/...),
   not per individual asset — same-type holdings move together within a
   trial (correlated), matching how the existing volatility defaults already
   work per type.
2. **Returns are drawn monthly**, not annually with interpolation — this is
   the actual mechanism fix: dispersion now scales with `√T·σ` instead of
   `T·σ`, and real sequence-of-returns risk (mixed good/bad months within a
   trial) is representable for the first time.
3. **ADDITIVE mode means layering Monte Carlo noise on top of the scenario's
   own configured rate** (from `return_schedule` or `interest_rate`), not
   replacing it with a generic model — a scenario's own assumptions stay the
   anchor.

**Rationale:** These three questions had no single objectively-correct
answer (`docs/PLAN.md`'s prior Backlog entry for this issue listed them as
exactly that — decisions needed before a fix could be scoped), so they were
put to the user directly rather than guessed at. Per-type grouping was
already implicit in how `getVolatilityForAsset()` assigns volatility, so it
extends an existing convention rather than introducing a new one. Monthly
draws are the only option of the three that actually resolves the reported
bug's root cause (the annual-with-interpolation alternative would still
allow one bad interpolated year to dominate, just less severely). ADDITIVE
was already the documented default behavior (`docs/monte-carlo-analysis-guide.md`);
REPLACE mode remains unimplemented and out of scope, since it was never
wired to any UI control and no code implemented it before this fix either.

**Explicitly deferred:** making the three `ReturnModelService` return models
(Simple Random / Historical Bootstrap / Historical Sequence) actually
produce different results — a separate, larger effort. This fix makes Monte
Carlo dispersion correct regardless of which model is selected in the UI;
the dropdown remains cosmetic in the sense that all three still produce
statistically-equivalent output.

---

## 2026-07-02 — `min_balance` stays a hard floor even at shortfall auto-stop; no last-resort drawdown

**Decision:** When a scenario auto-stops due to shortfall (`ISSUES.md` #17), assets
still holding balance below their `min_balance` reserve are left untouched — the
engine does not draw down into those reserves as a last resort before stopping,
even though at that point the user would realistically be spending that money
too. Considered adding an opt-in toggle (e.g. `plan.deplete_reserves_at_end`) that
would allow the auto-stop path specifically to ignore the floor, but declined for
now.
**Rationale:** `min_balance` is a single field used for genuinely different
purposes — a money-market minimum-balance requirement, an early-withdrawal-penalty
threshold, or an actual emergency fund — and a toggle that changes what the floor
means specifically at the moment the simulation is about to end would make the
field's meaning conditional on how the scenario plays out, which is more
complexity than the current, clear "it's a floor, full stop" semantics justify
until there's a concrete need for it. Revisit if this becomes a real blocker
rather than a hypothetical.

---

## 2026-07-02 — v1.0.8 shipped all three remaining items together, no further split

**Decision:** Like `v1.0.6`, all three items batched into `v1.0.8` (orphaned
vocabulary cleanup, the windfall documentation gap, and the README example labels)
were completed in this pass, so they shipped together rather than being split
further.
**Rationale:** Confirms the v1.0.6 entry's point wasn't a one-off: shipping
everything scoped in a version together is fine when it's actually all done: the
per-fix cadence is about not holding a release on unfinished work, not a ceiling on
how much can go into one release.

Also recorded here: while removing `asset.initial_value` fallbacks, found that
`SimulationService.js`'s `metrics.totalInitialAssets` had no `.balance` fallback at
all (only `initial_value`), meaning it silently evaluated to `0` in every real run.
Traced its only consumer, `ScenarioController.generateRecommendations()`, and found
its output event has zero listeners anywhere in the codebase — unrendered, so this
was never user-visible, unlike Issue 5's `TabController` finding which did have a
live, visible effect. Fixed anyway since the file was already in scope, but not
worth its own `ISSUES.md` entry given no observable impact.

---

## 2026-07-02 — v1.0.7 shipped as a single-issue patch; batched scope split into v1.0.8

**Decision:** Same pattern as the earlier splits: `docs/PLAN.md`'s v1.0.7 batched
four `ISSUES.md` items. Only Issue 2b (Monte Carlo expected-income timing) was
fixed in this pass, so `1.0.7` shipped with just that fix, and the remaining three
items (Issue 7's vocabulary cleanup, Issue 3 and the README example notes) moved
into a new `v1.0.8`. `v1.1.0` (MINOR, strict validation) needed no renumbering,
since MINOR bumps aren't tied to how many patches precede them.
**Rationale:** Continues the per-fix bump cadence from the entries below.

---

## 2026-07-01 — v1.0.6 shipped both remaining items together, no further split

**Decision:** `docs/PLAN.md`'s v1.0.6 batched two `ISSUES.md` items (closing out
Issues 8/9's resolved-engine tests, and the `EventBus` re-entrancy fix for Issue
11). Unlike the four prior versions, both were completed and shipped together as
`1.0.6` — no further split was needed, since neither item was left over.
**Rationale:** The per-fix cadence established in the entries below was never a
rule against shipping more than one item per release — it was specifically about
not holding a release hostage to unfinished work. When all scoped items in a
version are actually done in one pass, shipping them together is the same
principle, not an exception to it.

**Also recorded here:** while fixing Issue 11, found that its own original
write-up in `ISSUES.md` mischaracterized severity — it called the bug "harmless"
in one sentence while describing the actual failure (a skipped sibling handler) in
the next. A regression test confirmed the second `once()` listener on the same
event was silently dropped every time, not an edge case. Corrected in `ISSUES.md`
rather than left standing.

---

## 2026-07-01 — v1.0.5 shipped as a single-issue patch; batched scope split into v1.0.6

**Decision:** Same pattern again: `docs/PLAN.md`'s v1.0.5 (after the previous split)
batched three `ISSUES.md` items. Only Issues 4 (fully now)/6 — the remaining dead
export code (`#export-config-btn`, `UIController.exportSingleResults()`, the
`main.js` export chain, the vestigial `windfallUsedAtMonth` field, and the broken
inline `convertResultsToCSV()`/`populateCSVExport()` preview) — were removed in this
pass, so `1.0.5` shipped with just that cleanup. The remaining two items (closing
out Issues 8/9, the `EventBus` re-entrancy fix for Issue 11) moved into a new
`v1.0.6`, renumbering the old `v1.0.6` — income-display/vocabulary cleanup — to
`v1.0.7`.
**Rationale:** Continues the per-fix bump cadence from the entries below. Also
worth recording: while removing the dead CSV preview, found that `ISSUES.md` #4's
original description overstated how "reachable" the broken code path was —
`simulateScenarioAdvanced()` always returns a pre-generated `csvText`, so the
correct `populateCSVFromText()` branch wins in every normal run; the broken
fallback was only live in the degenerate empty-result case. Corrected in
`ISSUES.md` rather than left standing, since the next person reading it would
otherwise overestimate the original bug's real-world impact.

---

## 2026-07-01 — v1.0.4 shipped as a single-issue patch; batched scope split into v1.0.5

**Decision:** Same pattern again: `docs/PLAN.md`'s v1.0.4 (after the previous split)
batched four `ISSUES.md` items. Only Issues 4 (partially)/5 (fully) — the dead
`TabController` and the export-button visibility bug it caused — were fixed in this
pass, so `1.0.4` shipped with just that fix. The remaining three items moved into a
new `v1.0.5` (renumbering the old `v1.0.5` — income-display/vocabulary cleanup — to
`v1.0.6`), and Issue 4's still-open half (deleting the broken inline CSV preview)
was folded into `v1.0.5`'s dead-code item alongside Issue 6, since both are the same
kind of confirmed-dead-code removal.
**Rationale:** Continues the per-fix bump cadence from the two entries below.

---

## 2026-07-01 — v1.0.3 shipped as a single-issue patch; batched scope split into v1.0.4

**Decision:** Same pattern as the v1.0.2 split below: `docs/PLAN.md`'s v1.0.3
(after the previous split) batched five `ISSUES.md` items. Only Issue 2a (income
display missing `stop_month`) was fixed in this pass, so `1.0.3` shipped with just
that fix, and the remaining four items moved into a new `v1.0.4` (renumbering the
old `v1.0.4` — income-display/vocabulary cleanup — to `v1.0.5`).
**Rationale:** Confirms the per-fix bump cadence established in the entry below is
the ongoing convention for this project, not a one-time exception.

---

## 2026-07-01 — v1.0.2 shipped as a single-issue patch; batched scope split into v1.0.3

**Decision:** `docs/PLAN.md`'s original v1.0.2 batched six `ISSUES.md` items
(1, 2a, 4, 5, 6, 8, 9, 11) into one patch release. Only Issue 1 (copy-scenario
withdrawal order bug) was actually fixed in this pass; rather than hold the release
until all six landed, `1.0.2` shipped with just that one fix, and the remaining five
items were moved into a new `v1.0.3` section (renumbering the old `v1.0.3` —
income-display/vocabulary cleanup — to `v1.0.4`; `v1.1.0` is unaffected since MINOR
bumps aren't tied to how many patches precede them).
**Rationale:** The global `~/coding/CLAUDE.md` preference is "frequent small bumps
over rare large ones," which cuts against `PLAN.md`'s batching-by-default habit for
mechanical fixes. Asked directly, the project owner chose to bump per-fix going
forward rather than wait for a full batch — this entry records that the batching
in `PLAN.md`'s version sections is a planning convenience, not a release-cadence
rule.

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
