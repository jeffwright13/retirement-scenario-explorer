# Study Guide — Learning Retirement Math Through This Codebase

This is a reading path through the app's own built-in scenarios, written for
understanding the underlying financial mechanics and the code that implements
them — not a user-facing feature doc. It exists because the "Built-in
Scenarios" dropdown already contains a genuinely well-designed graduated
curriculum (`data/scenarios/learning-journey-scenarios.json`, the only
scenario file `ContentService.js` actually loads — `naive-scenarios.json`,
`realistic-scenarios.json`, and `roth-scenarios.json` also exist in that
directory but aren't wired into the app; ignore them for this guide, and see
the note at the end) — it just never had prose tying each stage to the
concept it teaches or the code that implements it. This fills that gap.

**How to use this:** for each stage, (1) load it via "Choose Scenario" →
"Run Single Scenario" and look at the chart, (2) read the scenario's raw JSON
in `data/scenarios/learning-journey-scenarios.json` alongside it, (3) read
the cited code, (4) come back and try to predict what the *next* stage will
change before you look. The whole point of the sequence is that each stage
changes exactly one thing from the last.

Read `docs/scenario-schema.json` and `docs/SPEC.md` §1 once before starting —
this guide assumes you know the shape of `plan`/`assets`/`income`/`order`,
not what each field does in detail.

---

## Stage 1: No Growth Model

**Concept.** The floor everything else builds on: pure arithmetic depletion.
No growth, no inflation, no income — just `balance -= monthly_expenses` every
month until it hits zero. This is "money under the mattress," and it's the
baseline every later stage should visibly improve on.

**Code.** The whole monthly loop lives in `simulateScenarioAdvanced()`,
`scripts/timeaware-engine.js:261` onward — read the numbered steps in the
loop body once, they're the skeleton every other stage hangs off of. With no
`return_schedule`/`interest_rate` on the asset, `getAssetReturns()`
(`:372-380`) returns `0` every month, so step 5 ("apply growth") is a no-op.
Withdrawals happen in `processWithdrawals`/`withdrawFromSingleAsset`
(`:100-144`).

**Try this:** hand-calculate month 12's balance yourself (`starting_balance -
12 × monthly_expenses`) and check it against the chart. It should match
exactly — there's no compounding to fudge the number yet.

---

## Stage 2: With Growth Model

**Concept.** Compound growth partially offsetting withdrawals — the entire
reason "invest it" beats "keep it in cash" over a long horizon, even before
inflation enters the picture.

**Code.** `getAssetReturns(asset, month)` (`timeaware-engine.js:372-380`)
now returns `rate / 12` — a fixed *annual* rate divided into a flat monthly
rate. Growth is applied in the main loop's step 5, `:494` (`monthlyGrowthRate
= getAssetReturns(...)`).

**Gotcha worth knowing about while you're in this code:** `assets[].compounding`
(`monthly`/`annual`) is documented in `docs/scenario-schema.json` and even
described as implemented in `docs/SPEC.md` §2.1 — but `getAssetReturns()`
never actually reads it (`ISSUES.md` #25, still open). Every asset compounds
monthly regardless of what `compounding` says. Not something you did wrong if
your hand math assuming "annual compounding" doesn't match the chart.

**Try this:** compare the ending balance to Stage 1's. The gap between them,
divided by the number of years, is roughly what this rate is worth to you
annually — a concrete feel for what a "6.5% return" actually buys over a real
withdrawal horizon, not just an abstract percentage.

---

## Stage 3: With Inflation Model

**Concept.** Nominal vs. real dollars. `monthly_expenses` is defined in
today's dollars; the engine has to inflate it forward so month 200's expense
figure reflects month 200's purchasing power, not month 0's.

**Code.** `getInflationAdjustedExpenses(month)` (`timeaware-engine.js:356-369`).
This scenario uses `inflation_schedule: "realistic_inflation"`, a `type:
"fixed"` rate schedule at 3.5% (`rate_schedules.realistic_inflation` in the
JSON) — a constant rate, applied every month.

**Note for later:** this specific stage is *not* affected by it, but the same
function has a real, currently-open bug (`ISSUES.md` #22) for **non-constant**
inflation schedules (`type: "sequence"`) — it mis-compounds badly enough that
nominal expenses can visibly *decrease* over time, which is financially
nonsensical. You'll hit this directly in Stage 5 below; flagging it here so
you're not caught off guard mid-stage.

**Try this:** verify month 60's expense figure by hand:
`8000 × (1 + 0.035/12)^60`. This is the same formula the legacy
`plan.inflation_rate` path uses (`:407` vs `:413` — worth comparing the two
code paths directly; they're not quite the same shape, which is itself a
useful thing to notice).

---

## Stage 4a: Social Security Income

**Concept.** Guaranteed income directly offsetting the monthly shortfall,
timed to a specific `start_month` — the first stage where the withdrawal
burden on your assets actually *drops*, not just grows slower.

**Code.** `getMonthlyIncome(sources, month)` in `scripts/utils.js` sums every
active income source for that month (1-based, inclusive `[start_month,
stop_month]`, missing `stop_month` = runs forever). The main loop computes
`shortfall = monthlyExpenses - income` (`timeaware-engine.js:418`) *before*
any withdrawal happens — income directly reduces what has to come out of your
assets that month, dollar for dollar.

**Connects to something we found earlier this session:** `income[]` can
*only* ever offset that same month's expenses — a large one-time `income[]`
entry (like an inheritance) that exceeds that month's expenses has its
surplus silently discarded, not banked anywhere (`ISSUES.md` #3). That's why
Social Security works cleanly here (it's recurring and roughly matches
monthly expenses in size) but a lump sum needs to be modeled as an `assets[]`
entry instead — see the README's "Inheritance or Lump Sum Windfall" example.
Worth re-reading that distinction now that you've seen both mechanisms in
action.

**Try this:** find the exact month SS starts (`start_month: 24` here) and
look at the shortfall/withdrawal figures immediately before and after in the
CSV export. The jump should be visible and match the SS amount almost
exactly.

---

## Stage 4b: Social Security Disability Income

**Concept.** Same mechanism as 4a — this stage isn't teaching new code, it's
teaching that *timing* is the whole lever. SSDI here starts at `start_month:
6` instead of `24`, and the amount differs (`$3,650` vs `$2,442`). Compare
the two scenarios' charts side by side: same mechanism, different real-world
eligibility rules, materially different outcome.

**Try this:** this is the cheapest stage to skip the code for and just
compare JSON — diff the `income[]` blocks of 4a and 4b directly. That's the
entire concept in one file comparison.

---

## Stage 5: Full Complexity

**Concept.** Two new ideas at once: (1) withdrawal **order** across multiple
accounts with different tax treatment, and (2) tax-aware gross-up — pulling
enough *gross* out of a taxable/tax-deferred account to net the amount you
actually need after tax.

**Code.**
- `order[]` groups accounts by priority; a group is fully exhausted before
  the next is touched (`docs/SPEC.md` §2.2 has the full mechanics — read
  that section, not just the code, it's a good summary). This scenario's
  order is Savings → Investment → Traditional IRA → Roth IRA — a textbook
  "spend taxable first, let tax-advantaged accounts keep compounding" ladder.
- The gross-up math is `TaxService.calculateGrossWithdrawal()`: `gross = net
  / (1 - rate)`, using `plan.tax_config`'s per-type rate (`tax_deferred`
  0.22, `taxable` 0.15, `tax_free` 0 by default). Trace one withdrawal by
  hand: if you need $1,000 net from a `tax_deferred` account, the engine
  pulls `1000 / (1 - 0.22) = $1,282.05` gross.

**You will hit `ISSUES.md` #22 directly here.** This stage's
`variable_inflation` schedule is a `type: "sequence"` with a non-monotonic
rate array (`[0.035, 0.04, 0.05, 0.045, 0.03, 0.025, 0.03, 0.035]`) — exactly
the shape that trips the mis-compounding bug. If you hand-calculate expected
inflation-adjusted expenses at a few different months and they don't match
what the chart shows — even *decrease* at some points — that's not you
misunderstanding the code, that's the live bug. Good exercise: find the exact
month(s) where nominal expenses decrease.

Also worth noticing: `market_growth` (the "Investment" account's schedule) is
also a `sequence` type with a **-15% year** baked in — a scripted market
crash. Watch what withdrawal order does to protect (or fail to protect) the
accounts still growing when that hits.

---

## Stage 6: The Workable Solution (Hard Choices Pay Off)

**Concept.** Everything so far has been deterministic — one fixed path
through time. This is the stage where you should stop trusting a single
"looks fine" run and actually run **Monte Carlo** on it (there's no dedicated
built-in MC scenario; run this one through "Monte Carlo Analysis" yourself).
The point isn't the specific numbers here — it's the mental shift: a plan
that survives one deterministic run can still fail the majority of the time
under real return variability, and vice versa.

**What changed from Stage 5, concretely:** lower `monthly_expenses` ($8,500 →
$5,500), higher starting balances across the board, SS timing pulled
earlier — i.e., this stage is Stage 5 *after* making the "hard choices" the
title references, not new mechanics.

**Code — and this is the freshest part of the codebase to read right now:**
`scripts/services/MonteCarloService.js` + `scripts/controllers/MonteCarloController.js`.
As of today (`v1.0.17`), this correctly models real month-to-month
sequence-of-returns risk, grouped by `investment_type` — read
`MonteCarloService.generateRandomScenario()` and its doc comment, it directly
explains *why* returns are drawn monthly rather than once per trial, which is
the single most important Monte Carlo concept in this whole codebase (and
was, until today, actually broken — see `ISSUES.md` #19 if you want the full
story of what was wrong and why, including the exact math for why dispersion
has to scale with `√T` and not `T`).

**Try this:** run the same scenario through Monte Carlo with a fixed seed
twice, once at `investment_type: "stocks"` (18% volatility) and once at
`"bonds"` (8%) for the market-dependent asset, and compare the spread of
outcomes. That's a hands-on feel for what "volatility" costs you in plan
reliability, not just average return.

---

## The Roth Conversion Arc: Baseline → Status Quo → Tax-Smart Conversions → Post-Conversion Years

These four are a separate teaching arc from Stage 1-6, about tax-bucket
management rather than simulation mechanics. Run all four in sequence; they
tell one continuous story with the same underlying household.

**Concept.** A "Roth conversion" means deliberately moving money from a
tax-deferred account (taxed on withdrawal) to a tax-free account (already
taxed, grows tax-free forever after) — paying tax now, on your terms, instead
of later, possibly at a worse rate or under RMD pressure. `Status Quo - No
Conversions` never does this; `Tax-Smart Roth Conversion Strategy` does it
deliberately over 2026-2032; `Post-Conversion Years` picks up the story
afterward with the conversions already complete.

**Code — and this is the part worth studying closely, because the schema has
no first-class "transfer between accounts" primitive, so this scenario builds
one out of two existing mechanisms:**
- `deposits[]` (7 entries, one per conversion year) pours money into
  `"Converted Roth Account"` over each 12-month window — e.g. `{name: "2026
  Roth Conversion", target: "Converted Roth Account", amount: 2917,
  start_month: 13, stop_month: 24}` ($2,917 × 12 ≈ $35K that year). See
  `applyDeposits()` in `timeaware-engine.js` for the mechanism.
- The **source** side — money actually leaving the Traditional IRA — is
  *not* dynamically modeled at all. Notice the asset is literally named
  `"Traditional IRA (Reduced)"`: its starting balance ($320K) was hand-computed
  by the scenario's author to already reflect the eventual $215K in
  conversions, rather than the simulation moving money out of it in real time.
  This is a real modeling limitation worth internalizing, not a code bug —
  there's no "transfer" primitive, so any scenario doing this has to fake the
  source side by pre-adjusting a starting balance.
- The tax cost of each conversion is modeled as a **negative-amount income
  entry** (`{name: "Conversion Tax Payment 2026", amount: -358, start_month:
  13, stop_month: 24}`) — a legitimate, documented use of `income[].amount`
  (`docs/SPEC.md` §1.4: negative = recurring expense), here standing in for
  "the extra tax bill this conversion year creates."

**Try this:** total up the seven deposit amounts × their durations — that's
the $215K actually converted. Then check that `320000 + 215000 ≈` the
`Baseline`/`Status Quo` scenarios' Traditional IRA balance (`$300K`/`$320K`)
— confirming the "(Reduced)" naming really does represent "after $215K
converted out," by hand, not just by the label.

---

## A note on the orphaned scenario files

`data/scenarios/naive-scenarios.json`, `realistic-scenarios.json`, and
`roth-scenarios.json` all exist on disk but aren't loaded by
`ContentService.js` — only `learning-journey-scenarios.json` is (confirmed by
`grep` across `scripts/`). `roth-scenarios.json` in particular contains an
earlier draft of the same Roth-conversion arc covered above, under slightly
different key names — don't confuse the two if you go looking; the live one
is the one embedded in `learning-journey-scenarios.json`. This wasn't
previously called out in `ISSUES.md`; if it's worth cleaning up (delete the
dead files, or wire them in if they have content worth keeping) that's a
separate, small decision for later — not blocking for this guide's purpose.
