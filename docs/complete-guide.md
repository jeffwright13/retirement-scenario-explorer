# 🎓 Complete Retirement Scenario Modeling Guide

*A comprehensive step-by-step guide from basic concepts to advanced real-world modeling*

---

## 🧠 How the Simulation Works

Every month, the simulation follows this simple process:

```
📅 Month N:
1️⃣ Add any income for this month (Social Security, part-time work, etc.)
2️⃣ Calculate shortfall: monthly_expenses - income
3️⃣ If shortfall > 0: withdraw from assets (in priority order) to cover it
4️⃣ Apply monthly interest growth to all remaining asset balances
5️⃣ Record everything (income, expenses, withdrawals, new balances)
6️⃣ Move to next month and repeat
```

This loop runs for however many months you specify (`duration_months`), creating a complete financial projection.

---

## 📖 Level 1: The Simplest Case

**Scenario**: Sarah has $120,000 in savings earning 2% annually. She needs $3,000/month to live.

```json
{
  "metadata": {
    "title": "Level 1: Simple Drawdown",
    "notes": "Sarah has $120k in savings earning 2% annually. She needs $3,000/month to live. How long will her money last?"
  },
  "plan": { 
    "monthly_expenses": 3000, 
    "duration_months": 48 
  },
  "income": [],
  "assets": [
    {
      "name": "Savings",
      "type": "taxable",
      "balance": 120000,
      "interest_rate": 0.02,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Savings",
      "order": 1
    }
  ]
}
```

**What happens month by month:**
- **Month 1**: Income = $0, Shortfall = $3,000 → Withdraw $3,000 → Balance: $117,000 → Apply interest: $117,195
- **Month 2**: Income = $0, Shortfall = $3,000 → Withdraw $3,000 → Balance: $114,195 → Apply interest: $114,385
- **And so on...**

**Key Insight**: Even with 2% growth, Sarah withdraws $3,000 but only earns ~$190/month in interest. Net loss: ~$2,810/month.

**Expected Outcome**: Money lasts about 43-44 months (not quite 4 years).

---

## 📖 Level 2: Income Changes Everything

Same Sarah, but Social Security starts in month 12.

```json
{
  "metadata": {
    "title": "Level 2: Adding Social Security",
    "notes": "Same Sarah, but Social Security of $1,800/month starts in month 6. Watch the dramatic change in sustainability!"
  },
  "plan": { 
    "monthly_expenses": 3000, 
    "duration_months": 104
  },
  "income": [
    {
      "name": "Social Security",
      "amount": 1800,
      "start_month": 6
    }
  ],
  "assets": [
    {
      "name": "Savings",
      "type": "taxable", 
      "balance": 120000,
      "interest_rate": 0.02,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Savings",
      "order": 1
    }
  ]
}
```

**What changes:**
- **Months 1-11**: Same as before - withdrawing $3,000/month
- **Month 12 onward**: Income = $1,800, Shortfall = only $1,200 → Withdrawing $1,200/month instead of $3,000

**Expected Outcome**: Money lasts 8+ years instead of 3.5 years.

---

## 📖 Level 3: Multiple Assets and Withdrawal Strategy

Real retirees have multiple accounts with different characteristics.

```json
{
  "metadata": {
    "title": "Level 3: Multiple Assets and Withdrawal Priority",
    "notes": "Bob has savings and investments. He wants to preserve the higher-growth investments as long as possible by spending savings first."
  },
  "plan": { 
    "monthly_expenses": 4000, 
    "duration_months": 168 
  },
  "income": [
    {
      "name": "Social Security", 
      "amount": 2200,
      "start_month": 24
    }
  ],
  "assets": [
    {
      "name": "Savings",
      "type": "taxable",
      "balance": 50000,
      "interest_rate": 0.015,
      "compounding": "monthly"
    },
    {
      "name": "Investment Account", 
      "type": "taxable",
      "balance": 200000,
      "interest_rate": 0.06,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Savings",
      "order": 1
    },
    {
      "account": "Investment Account",
      "order": 2
    }
  ]
}
```

**What happens:**
- **Months 1-23**: Need $4,000/month, no income
  - **Priority 1**: Drain "Savings" first ($50k ÷ $4k = ~12.5 months)
  - **Priority 2**: Then start hitting "Investment Account"
- **Month 24+**: Social Security kicks in → shortfall drops to $1,800/month

**Key Insight**: The `order` array implements withdrawal strategies:
- Spend cash/savings first (lower growth potential)
- Preserve high-growth investments longer
- Tax-optimized strategies (taxable before tax-deferred, Roth IRA last)

---

## 📖 Level 4: Modeling Large Expenses

If you you want to nodel large future expenses, use individual `income` entries, and give them a `stop_month` after defining their `start_month`.

```json
{
  "metadata": {
    "title": "Level 4: Two Large Expenses",
    "notes": "Carol anticipates a major home repair in years 3 (-$15k for a new kichen, paid all at once) and 5 (-$45k for a new roof, paid over three months)."
  },
  "plan": { 
    "monthly_expenses": 5000, 
    "duration_months": 180 
  },
  "income": [
    {
      "name": "Social Security",
      "amount": 2800, 
      "start_month": 12
    },
    {
      "name": "Kitchen",
      "amount": -15000,
      "start_month": 36,
      "stop_month": 36
    },
    {
      "name": "Roof",
      "amount": -15000,
      "start_month": 60,
      "stop_month": 62
    }
  ],
  "assets": [
    {
      "name": "Brokerage",
      "type": "taxable",
      "balance": 300000,
      "interest_rate": 0.05,
      "compounding": "monthly"
    }
    // {
    //   "name": "Roof Replacement",
    //   "type": "taxable", 
    //   "balance": -25000,
    //   "start_month": 36
    // },
    // {
    //   "name": "Inheritance",
    //   "type": "taxable",
    //   "balance": 150000,
    //   "start_month": 60,
    //   "interest_rate": 0.04,
    //   "compounding": "monthly"
    // }
  ],
  "order": [
    {
      "account": "Brokerage",
      "order": 1
    }
    // {
    //   "account": "Inheritance",
    //   "order": 2
    // }
  ]
}
```

**What happens:**
- **Months 1-35**: Withdrawing $5,000/month from Brokerage
- **Month 36**: 
  - Social Security starts (+$2,800 income)
  - Roof replacement hits (-$25,000 one-time expense)
  - **Net shortfall this month**: $5,000 - $2,800 + $25,000 = $27,200
- **Months 37-59**: Normal $2,200/month shortfall
- **Month 60**: Inheritance arrives (+$150,000 available for withdrawal)
- **Month 61+**: Two growing assets to draw from

**Key Insights**: 
- **Negative balances** model one-time expenses
- **`start_month`** times events precisely
- **Multiple assets** can have different growth rates

---

## 💰 Social Security Strategy Analysis

One of the biggest retirement decisions is **when to claim Social Security**. Let's model the three main strategies:

### Strategy A: Claim Early at Age 62 (75% of full benefit)

```json
{
  "metadata": {
    "title": "SS Strategy A: Claim at Age 62",
    "notes": "Maria claims early: $2,100/month (75% of full benefit) starting at age 62. Lower monthly benefit but immediate cash flow."
  },
  "plan": {
    "monthly_expenses": 6500,
    "duration_months": 360
  },
  "income": [
    {
      "name": "Social Security (Early)",
      "amount": 2100,
      "start_month": 24
    }
  ],
  "assets": [
    {
      "name": "401k/IRA",
      "type": "taxable",
      "balance": 450000,
      "interest_rate": 0.06,
      "compounding": "monthly"
    },
    {
      "name": "Taxable Investments",
      "type": "taxable", 
      "balance": 200000,
      "interest_rate": 0.055,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Taxable Investments",
      "order": 1
    },
    {
      "account": "401k/IRA",
      "order": 2
    }
  ]
}
```

### Strategy B: Wait Until Full Retirement Age (67)

```json
{
  "metadata": {
    "title": "SS Strategy B: Claim at Full Retirement Age (67)",
    "notes": "Maria waits for full benefit: $2,800/month (100%) starting at age 67. More asset depletion early, but higher lifetime benefit."
  },
  "plan": {
    "monthly_expenses": 6500,
    "duration_months": 360
  },
  "income": [
    {
      "name": "Social Security (Full)",
      "amount": 2800,
      "start_month": 84
    }
  ],
  "assets": [
    {
      "name": "401k/IRA",
      "type": "taxable",
      "balance": 450000,
      "interest_rate": 0.06,
      "compounding": "monthly"
    },
    {
      "name": "Taxable Investments",
      "type": "taxable",
      "balance": 200000,
      "interest_rate": 0.055,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Taxable Investments",
      "order": 1
    },
    {
      "account": "401k/IRA",
      "order": 2
    }
  ]
}
```

### Strategy C: Delay Until Age 70 (132% of full benefit)

```json
{
  "metadata": {
    "title": "SS Strategy C: Delay Until Age 70",
    "notes": "Maria delays for maximum benefit: $3,696/month (132%) starting at age 70. Highest monthly benefit but maximum early asset depletion."
  },
  "plan": {
    "monthly_expenses": 6500,
    "duration_months": 360
  },
  "income": [
    {
      "name": "Social Security (Delayed)",
      "amount": 3696,
      "start_month": 120
    }
  ],
  "assets": [
    {
      "name": "401k/IRA",
      "type": "taxable",
      "balance": 450000,
      "interest_rate": 0.06,
      "compounding": "monthly"
    },
    {
      "name": "Taxable Investments",
      "type": "taxable",
      "balance": 200000,
      "interest_rate": 0.055,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Taxable Investments",
      "order": 1
    },
    {
      "account": "401k/IRA",
      "order": 2
    }
  ]
}
```

### Strategy Comparison

| Strategy | Monthly Draw After SS | Early Asset Depletion | Risk Level |
|----------|----------------------|----------------------|------------|
| Age 62   | $4,400              | $156,000 (2 years)   | Lower      |
| Age 67   | $3,700              | $546,000 (7 years)   | Medium     |
| Age 70   | $2,804              | $780,000 (10 years)  | Higher     |

**Analysis**: Run all three scenarios and compare the asset balance curves. The "best" strategy depends on:
- Life expectancy (break-even typically around age 80-84)
- Risk tolerance (early markets crashes hurt delayed strategies more)
- Other income sources
- Health considerations

---

## 🏥 Social Security Disability Decision Analysis

For those with health issues, SSDI can be life-changing financially.

### Scenario A: SSDI Approved

```json
{
  "metadata": {
    "title": "SSDI Approved",
    "notes": "Tom gets SSDI at 58: $2,600/month (full retirement amount) immediately, converts to regular SS at 67. Financial game-changer."
  },
  "plan": {
    "monthly_expenses": 5200,
    "duration_months": 300
  },
  "income": [
    {
      "name": "SSDI",
      "amount": 2600,
      "start_month": 6,
      "stop_month": 107
    },
    {
      "name": "Social Security",
      "amount": 2600, 
      "start_month": 108
    }
  ],
  "assets": [
    {
      "name": "401k",
      "type": "taxable",
      "balance": 180000,
      "interest_rate": 0.055,
      "compounding": "monthly"
    },
    {
      "name": "Savings",
      "type": "taxable",
      "balance": 45000,
      "interest_rate": 0.02,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Savings",
      "order": 1
    },
    {
      "account": "401k",
      "order": 2
    }
  ]
}
```

### Scenario B: SSDI Denied, Early Retirement at 62

```json
{
  "metadata": {
    "title": "SSDI Denied - Early SS at 62", 
    "notes": "Tom's SSDI denied. Must survive 4 years on assets alone, then reduced SS benefit ($1,950 = 75% of full). Much harder path."
  },
  "plan": {
    "monthly_expenses": 5200,
    "duration_months": 300
  },
  "income": [
    {
      "name": "Social Security (Early)",
      "amount": 1950,
      "start_month": 48
    }
  ],
  "assets": [
    {
      "name": "401k",
      "type": "taxable", 
      "balance": 180000,
      "interest_rate": 0.055,
      "compounding": "monthly"
    },
    {
      "name": "Savings",
      "type": "taxable",
      "balance": 45000,
      "interest_rate": 0.02,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Savings",
      "order": 1
    },
    {
      "account": "401k",
      "order": 2
    }
  ]
}
```

### Scenario C: SSDI Denied, Part-Time Work Bridge

```json
{
  "metadata": {
    "title": "SSDI Denied - Part-Time Work Bridge",
    "notes": "Tom's SSDI denied but he manages part-time work ($2,200/month) until full retirement at 67. Preserves more assets."
  },
  "plan": {
    "monthly_expenses": 5200,
    "duration_months": 300
  },
  "income": [
    {
      "name": "Part-Time Work",
      "amount": 2200,
      "start_month": 6,
      "stop_month": 107
    },
    {
      "name": "Social Security (Full)",
      "amount": 2600,
      "start_month": 108
    }
  ],
  "assets": [
    {
      "name": "401k",
      "type": "taxable",
      "balance": 180000,
      "interest_rate": 0.055,
      "compounding": "monthly"
    },
    {
      "name": "Savings", 
      "type": "taxable",
      "balance": 45000,
      "interest_rate": 0.02,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Savings",
      "order": 1
    },
    {
      "account": "401k",
      "order": 2
    }
  ]
}
```

**Key Insights:**
- **SSDI approval** = getting your full Social Security benefit 9 years early (huge financial win)
- **SSDI denial** forces difficult choices: reduced benefits or continued work with health limitations
- **Application process** takes 6+ months of living on assets

---

## 🌉 Early Retirement Bridge Strategies

Want to retire before Social Security? You need a bridge strategy.

### Bridge Strategy: Conservative Asset Allocation

```json
{
  "metadata": {
    "title": "Early Retirement Bridge - Bond Tent Strategy", 
    "notes": "Shift to conservative assets during early retirement to reduce sequence-of-returns risk. Bonds first, then stocks, preserve 401k growth."
  },
  "plan": {
    "monthly_expenses": 6000,
    "duration_months": 240
  },
  "income": [
    {
      "name": "Social Security",
      "amount": 2800,
      "start_month": 84
    }
  ],
  "assets": [
    {
      "name": "Bond Ladder (5yr)",
      "type": "taxable",
      "balance": 200000,
      "interest_rate": 0.025,
      "compounding": "monthly"
    },
    {
      "name": "Conservative Stocks",
      "type": "taxable", 
      "balance": 300000,
      "interest_rate": 0.045,
      "compounding": "monthly"
    },
    {
      "name": "401k (Aggressive)",
      "type": "taxable",
      "balance": 200000,
      "interest_rate": 0.07,
      "compounding": "monthly"
    }
  ],
  "order": [
    {
      "account": "Bond Ladder (5yr)",
      "order": 1
    },
    {
      "account": "Conservative Stocks",
      "order": 2
    },
    {
      "account": "401k (Aggressive)",
      "order": 3
    }
  ]
}
```

---

## 💼 Complex Real-World Scenario

Let's put it all together with a realistic layoff situation.

```json
{
  "metadata": {
    "title": "Real-World: Early Retirement After Layoff",
    "notes": "Dave, 60, laid off 7 weeks ago. Evaluating early retirement vs job hunting. Includes bridge consulting, multiple asset types, future car expense."
  },
  "plan": {
    "monthly_expenses": 7500,
    "duration_months": 300
  },
  "income": [
    {
      "name": "Consulting Work",
      "amount": 3000,
      "start_month": 6,
      "stop_month": 18
    },
    {
      "name": "Social Security",
      "amount": 2400,
      "start_month": 24
    }
  ],
  "assets": [
    {
      "name": "Emergency Fund",
      "type": "taxable",
      "balance": 40000,
      "interest_rate": 0.01,
      "compounding": "monthly"
    },
    {
      "name": "Taxable Investments", 
      "type": "taxable",
      "balance": 450000,
      "interest_rate": 0.055,
      "compounding": "monthly"
    },
    {
      "name": "Traditional 401k",
      "type": "taxable",
      "balance": 380000,
      "interest_rate": 0.06,
      "compounding": "monthly"
    },
    {
      "name": "Roth IRA",
      "type": "tax_free", 
      "balance": 75000,
      "interest_rate": 0.06,
      "compounding": "monthly"
    },
    {
      "name": "Car Replacement",
      "type": "taxable",
      "balance": -35000,
      "start_month": 84
    }
  ],
  "order": [
    {
      "account": "Emergency Fund",
      "order": 1
    },
    {
      "account": "Taxable Investments",
      "order": 2
    }, 
    {
      "account": "Traditional 401k",
      "order": 3
    },
    {
      "account": "Roth IRA",
      "order": 4
    }
  ]
}
```

**This models:**
- **Immediate situation**: Living off emergency fund initially
- **Bridge income**: Some consulting for 1 year to ease transition  
- **Social Security timing**: Starting at 62 (realistic for layoff situation)
- **Asset priority**: Tax-efficient withdrawal sequence
- **Future expense**: Car replacement in 7 years
- **Growth assumptions**: Different rates for different asset types

---

## 🎯 How to Use This Guide

### 1. Start Simple
Copy the Level 1 scenario and modify the numbers to match your basic situation.

### 2. Add Complexity Gradually
- Level 2: Add your income sources (Social Security, pensions, part-time work)
- Level 3: Model multiple accounts with withdrawal priorities
- Level 4: Add windfalls and major expenses

### 3. Compare Scenarios
Create variants to test:
- Different Social Security timing
- SSDI approval vs denial
- Various bridge strategies
- Optimistic vs pessimistic market returns

### 4. Stress Test
- What if returns are 2% lower?
- What if expenses are $500/month higher?
- What if a market crash happens in year 2-3?

### 5. Make Informed Decisions
Use the insights to:
- Choose Social Security timing
- Plan withdrawal strategies
- Build appropriate emergency reserves
- Decide on early retirement feasibility

---

## 💡 Key Insights

1. **Everything is an asset** - Windfalls, expenses, future accounts can all be modeled as assets with timing and growth properties

2. **Timing matters enormously** - Small changes in Social Security timing or income duration can extend financial runway by years

3. **Withdrawal order affects outcomes** - Tax-efficient strategies preserve wealth longer

4. **Early years are critical** - Sequence of returns risk means early market crashes hurt more than later ones

5. **Income trumps assets** - Even small amounts of reliable income dramatically improve sustainability

---

## 🚧 Limitations to Remember

This tool shows **cash flow projections**, but doesn't model:
- **Tax implications** (withdrawals shown gross, not net)
- **Inflation** (expenses stay constant in real dollars)
- **Market volatility** (returns are smoothed monthly)
- **Required minimum distributions**
- **Healthcare cost changes**
- **Longevity uncertainty**

Use these scenarios as a **starting point** for deeper analysis with financial professionals.

---

## 🔧 Pro Tips

- **Month numbering**: Tool uses 0-based indexing (month 0 = first month)
- **Interest compounding**: Annual rate ÷ 12, applied monthly  
- **CSV export**: Great for spreadsheet analysis and custom charts
- **Order matters**: Assets drain completely in priority order
- **Negative balances**: Perfect for modeling one-time expenses
- **Start months**: Use to time events precisely

Ready to model your retirement? Start with Level 1 and work your way up to your real situation! 🚀