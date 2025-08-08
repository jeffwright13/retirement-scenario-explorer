# 💰 Social Security Strategy Analysis Guide

*Using the Retirement Scenario Explorer to make informed SS timing and disability decisions*

---

## 🎯 The Big Social Security Questions

1. **When should I claim?** Age 62 vs 67 vs 70?
2. **Should I apply for disability?** And what if I get denied?
3. **Bridge strategies**: How do I survive the gap between retirement and Social Security?

Let's model these scenarios step by step.

---

## 📊 Part 1: Social Security Timing Comparison

**The Setup**: Maria, age 60, has $650k in retirement accounts. Her full Social Security benefit at 67 would be $2,800/month. She needs $6,500/month to live.

### Scenario A: Claim Early at 62 (75% of full benefit)

```json
{
  "metadata": {
    "title": "Maria - Claim SS at Age 62",
    "notes": "Early claiming: $2,100/month starting at age 62 (month 24)"
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
    {"account": "Taxable Investments", "order": 1},
    {"account": "401k/IRA", "order": 2}
  ]
}
```

**What happens:**
- **Ages 60-62**: Drawing $6,500/month from investments
- **Age 62+**: Drawing $4,400/month ($6,500 - $2,100 SS)
- **Total 24-month early draw**: $156,000

### Scenario B: Wait Until Full Retirement Age 67

```json
{
  "metadata": {
    "title": "Maria - Claim SS at Full Retirement (67)",
    "notes": "Normal claiming: $2,800/month starting at age 67 (month 84)"
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
    {"account": "Taxable Investments", "order": 1},
    {"account": "401k/IRA", "order": 2}
  ]
}
```

**What happens:**
- **Ages 60-67**: Drawing full $6,500/month for 84 months
- **Age 67+**: Drawing $3,700/month ($6,500 - $2,800 SS)
- **Total early draw**: $546,000

### Scenario C: Delay Until Age 70 (132% of full benefit)

```json
{
  "metadata": {
    "title": "Maria - Delay SS Until Age 70",
    "notes": "Delayed claiming: $3,696/month starting at age 70 (month 120)"
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
    {"account": "Taxable Investments", "order": 1},
    {"account": "401k/IRA", "order": 2}
  ]
}
```

**What happens:**
- **Ages 60-70**: Drawing full $6,500/month for 120 months  
- **Age 70+**: Drawing only $2,804/month ($6,500 - $3,696 SS)
- **Total early draw**: $780,000

### 🤔 The Analysis

**Run all three scenarios** and compare:

| Strategy | Monthly Draw After SS | Total Early Withdrawal | Risk Level |
|----------|----------------------|------------------------|------------|
| Age 62   | $4,400              | $156,000               | Lower      |
| Age 67   | $3,700              | $546,000               | Medium     |
| Age 70   | $2,804              | $780,000               | Higher     |

**Key Insight**: Delaying Social Security means drawing more from your investments early on, which could be risky if markets crash in those early years. But if your investments grow well, the higher lifetime SS benefit usually wins.

**The "Break-Even" Question**: At what point does the delayed strategy catch up? Generally around age 80-84, but this tool lets you see the full cash flow impact.

---

## 🏥 Part 2: Social Security Disability Decision

**The Setup**: Tom, age 58, has chronic health issues. He's considering applying for Social Security Disability Insurance (SSDI). His full retirement benefit would be $2,600/month at age 67.

### Scenario A: Get SSDI Approved

```json
{
  "metadata": {
    "title": "Tom - SSDI Approved",
    "notes": "SSDI pays full retirement benefit amount immediately, converts to regular SS at full retirement age"
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
    {"account": "Savings", "order": 1},
    {"account": "401k", "order": 2}
  ]
}
```

### Scenario B: SSDI Denied, Wait Until 62

```json
{
  "metadata": {
    "title": "Tom - SSDI Denied, Early SS at 62", 
    "notes": "No SSDI, must survive on assets until age 62, then reduced SS benefit"
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
    {"account": "Savings", "order": 1},
    {"account": "401k", "order": 2}
  ]
}
```

### Scenario C: SSDI Denied, Try to Work Part-Time

```json
{
  "metadata": {
    "title": "Tom - SSDI Denied, Part-Time Work Bridge",
    "notes": "Denied SSDI, works part-time until 67 to preserve assets"
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
    {"account": "Savings", "order": 1},
    {"account": "401k", "order": 2}
  ]
}
```

### 🎯 SSDI Analysis

**Compare the outcomes:**

| Scenario | Monthly Shortfall | Asset Preservation | Risk |
|----------|------------------|-------------------|------|
| SSDI Approved | $2,600 (ages 58-67) | Excellent | Low |
| SSDI Denied → Early SS | $3,250 (ages 62+) | Poor | High |
| SSDI Denied → Part-Time | $3,000 (until 67) | Moderate | Medium |

**Key Insights:**
- **SSDI approval** is financially equivalent to winning the lottery - you get your full benefit 9 years early
- **SSDI denial** forces difficult choices: early retirement with reduced benefits, or continuing to work with health limitations
- **The application process** itself takes 6+ months, during which you're drawing from assets

---

## 🌉 Part 3: Bridge Strategies for Early Retirement

**The Challenge**: You want to retire before Social Security kicks in. How do you bridge the gap?

### Strategy 1: The "Roth Conversion Ladder"

```json
{
  "metadata": {
    "title": "Bridge Strategy - Roth Conversions",
    "notes": "Convert 401k to Roth during low-income years, live off taxable accounts"
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
      "name": "Taxable Brokerage",
      "type": "taxable",
      "balance": 300000,
      "interest_rate": 0.055,
      "compounding": "monthly"
    },
    {
      "name": "401k (Pre-Conversion)",
      "type": "taxable",
      "balance": 400000,
      "interest_rate": 0.06,
      "compounding": "monthly"
    },
    {
      "name": "Annual Roth Conversion",
      "type": "tax_free",
      "balance": 40000,
      "start_month": 12,
      "interest_rate": 0.06,
      "compounding": "monthly"
    },
    {
      "name": "Annual Roth Conversion",
      "type": "tax_free",
      "balance": 40000,
      "start_month": 24,
      "interest_rate": 0.06,
      "compounding": "monthly"
    }
  ],
  "order": [
    {"account": "Taxable Brokerage", "order": 1},
    {"account": "401k (Pre-Conversion)", "order": 2}
  ]
}
```

**Note**: This is a simplified model. Real Roth conversions have 5-year waiting periods and complex tax implications.

### Strategy 2: The "Bond Tent"

```json
{
  "metadata": {
    "title": "Bridge Strategy - Bond Tent", 
    "notes": "Shift to conservative assets during early retirement years to reduce sequence risk"
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
    {"account": "Bond Ladder (5yr)", "order": 1},
    {"account": "Conservative Stocks", "order": 2},
    {"account": "401k (Aggressive)", "order": 3}
  ]
}
```

---

## 🧮 Running Your Analysis

### Step 1: Model Your Base Case
Start with your current situation and normal retirement timing.

### Step 2: Create Variants
- Social Security at 62, 67, 70
- SSDI approval vs denial scenarios
- Different bridge strategies

### Step 3: Compare Key Metrics
- **Asset preservation**: How much is left at age 75? 85?
- **Risk tolerance**: Which strategy survives a market crash?
- **Break-even analysis**: When do delayed strategies catch up?

### Step 4: Stress Test
- What if market returns are 2% lower?
- What if expenses are $500/month higher?
- What if you live to 95 instead of 85?

---

## 📋 Decision Framework

**Choose Early Social Security (62) if:**
- Health concerns suggest shorter lifespan
- You need the cash flow certainty
- Market crash risk scares you more than longevity risk

**Choose Normal Retirement (67) if:**
- You're healthy with average life expectancy
- You have adequate bridge assets
- You want balanced risk/reward

**Choose Delayed Social Security (70) if:**
- Family longevity history is strong
- You have substantial other assets
- You want maximum inflation-protected income

**Apply for SSDI if:**
- Your condition truly prevents substantial work
- You have medical documentation
- You can survive the application period financially

---

## 💡 Pro Tips

1. **SSDI vs Early SS**: SSDI pays your full retirement amount; early SS is reduced forever
2. **Working while on SSDI**: Strict income limits apply ($1,470/month in 2024)
3. **Spousal benefits**: These add another layer of complexity not modeled here
4. **Tax implications**: SS benefits may be taxable depending on other income
5. **State taxes**: Some states tax Social Security, others don't

**Remember**: This tool shows cash flow, but Social Security decisions also involve taxes, Medicare timing, and spousal considerations. Use these scenarios as a starting point for deeper analysis with a financial planner.

---

## 🔄 Next Steps

1. Model your specific numbers using these templates
2. Create at least 3 scenarios (early/normal/delayed SS)
3. If health issues exist, model the SSDI approval/denial scenarios
4. Share results with your spouse/financial advisor
5. Consider tax implications and other factors not captured here

The key insight: **Small differences in timing can have massive impacts on your financial future.** This tool helps you see those impacts clearly before making irreversible decisions.