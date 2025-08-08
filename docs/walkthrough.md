# 🎓 Retirement Scenario Explorer - Progressive Walkthrough

*A step-by-step guide to understanding retirement drawdown modeling*

---

## 🧠 The Core Process

Before we dive into examples, let's understand what happens **every single month** in the simulation:

```
📅 Month N:
1️⃣ Add any income for this month (Social Security, part-time work, etc.)
2️⃣ Calculate shortfall: monthly_expenses - income
3️⃣ If shortfall > 0: withdraw from assets (in priority order) to cover it
4️⃣ Apply monthly interest growth to all remaining asset balances
5️⃣ Record everything (income, expenses, withdrawals, new balances)
6️⃣ Move to next month and repeat
```

This simple loop runs for however many months you specify (`duration_months`), creating a complete financial projection.

---

## 📖 Chapter 1: The Simplest Possible Case

Let's start with a retiree who has no income and just one savings account.

**Scenario**: Sarah has $120,000 in savings earning 2% annually. She needs $3,000/month to live.

```json
{
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
  ]
}
```

**What happens month by month?**

- **Month 1**: Income = $0, Shortfall = $3,000
  - Withdraw $3,000 from Savings → Balance: $117,000
  - Apply interest: $117,000 × (1 + 0.02/12) = $117,195
- **Month 2**: Income = $0, Shortfall = $3,000  
  - Withdraw $3,000 from Savings → Balance: $114,195
  - Apply interest: $114,195 × 1.00167 = $114,385
- **Month 3**: Repeat...

**Key Insight**: Even with 2% growth, Sarah is withdrawing $3,000 but only earning ~$190/month in interest. Her balance drops by ~$2,810 net each month.

**Expected Outcome**: Sarah's money will last about 43-44 months (not quite 4 years).

---

## 📖 Chapter 2: Adding Income Changes Everything

Now let's see what happens when Sarah gets Social Security.

**Scenario**: Same Sarah, but Social Security of $1,800/month starts in month 12.

```json
{
  "plan": { 
    "monthly_expenses": 3000, 
    "duration_months": 48 
  },
  "income": [
    {
      "name": "Social Security",
      "amount": 1800,
      "start_month": 12
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
  ]
}
```

**What changes?**

- **Months 1-11**: Same as before - withdrawing $3,000/month
- **Month 12 onward**: Income = $1,800, Shortfall = only $1,200
  - Now only withdrawing $1,200/month instead of $3,000
  - Asset depletion slows dramatically

**Expected Outcome**: Sarah's money will last much longer - probably 15+ years instead of 3.5 years.

**Key Insight**: Income timing matters enormously. Starting Social Security even 1 year earlier could extend her financial runway by years.

---

## 📖 Chapter 3: Multiple Assets and Withdrawal Priority

Real retirees have multiple accounts. Let's see how priority-based withdrawals work.

**Scenario**: Bob has both a savings account and a higher-growth investment account. He wants to preserve the investments as long as possible.

```json
{
  "plan": { 
    "monthly_expenses": 4000, 
    "duration_months": 120 
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
    {"account": "Savings", "order": 1},
    {"account": "Investment Account", "order": 2}
  ]
}
```

**What happens?**

- **Months 1-23**: Need $4,000/month, no income
  - Priority 1: Drain "Savings" first ($50k ÷ $4k = ~12.5 months)
  - Priority 2: Then start hitting "Investment Account"
- **Month 24+**: Social Security kicks in, shortfall drops to $1,800/month
  - Investment account depletion slows way down

**Key Insight**: The `order` array lets you implement realistic withdrawal strategies. Common approaches:
- Spend cash/savings first (lower growth)
- Preserve tax-advantaged accounts longest (Roth IRA last)
- Spend taxable accounts before tax-deferred accounts

---

## 📖 Chapter 4: Life Events as Assets

This is where the model gets clever. Life events (windfalls, expenses, inheritances) are just "assets" that activate at specific times.

**Scenario**: Carol gets an inheritance in year 5, but also has a major home repair in year 3.

```json
{
  "plan": { 
    "monthly_expenses": 5000, 
    "duration_months": 180 
  },
  "income": [
    {
      "name": "Social Security",
      "amount": 2800, 
      "start_month": 36
    }
  ],
  "assets": [
    {
      "name": "Brokerage",
      "type": "taxable",
      "balance": 300000,
      "interest_rate": 0.05,
      "compounding": "monthly"
    },
    {
      "name": "Roof Replacement",
      "type": "taxable", 
      "balance": -25000,
      "start_month": 36
    },
    {
      "name": "Inheritance",
      "type": "taxable",
      "balance": 150000,
      "start_month": 60,
      "interest_rate": 0.04,
      "compounding": "monthly"
    }
  ]
}
```

**What happens?**

- **Months 1-35**: Withdrawing $5,000/month from Brokerage
- **Month 36**: 
  - Social Security starts (+$2,800 income)
  - Roof replacement hits (-$25,000 one-time expense)
  - Net shortfall for this month: $5,000 - $2,800 + $25,000 = $27,200
- **Months 37-59**: Normal $2,200/month shortfall
- **Month 60**: Inheritance arrives (+$150,000 to available assets)
- **Month 61+**: Now has two growing assets to draw from

**Key Insights**: 
- Negative balances model one-time expenses
- `start_month` lets you time events precisely
- Multiple assets can have different growth rates (inheritance might be more conservative)

---

## 📖 Chapter 5: Complex Real-World Scenario

Let's put it all together with a realistic case similar to your situation.

**Scenario**: Dave, 60, was recently laid off. Considering early retirement vs. job hunting.

```json
{
  "metadata": {
    "title": "Dave's Early Retirement Analysis",
    "notes": "Laid off at 60, evaluating early retirement feasibility"
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
    {"account": "Emergency Fund", "order": 1},
    {"account": "Taxable Investments", "order": 2}, 
    {"account": "Traditional 401k", "order": 3},
    {"account": "Roth IRA", "order": 4}
  ]
}
```

**This models**:
- **Immediate situation**: Living off emergency fund initially
- **Bridge income**: Some consulting work for 1 year to ease transition  
- **Social Security timing**: Starting at 62 (24 months from now)
- **Asset priority**: Spend taxable first, preserve Roth longest
- **Future expense**: Car replacement in 7 years
- **Growth assumptions**: Different rates for different asset types

**Expected questions this answers**:
- Can Dave make it 25 years without returning to full-time work?
- How much does delaying Social Security to 67 help?
- What if consulting income is higher/lower/longer?
- How sensitive is the plan to market performance?

---

## 🎯 Next Steps

Now that you understand the progression from simple to complex:

1. **Start simple**: Model your basic situation first
2. **Add complexity gradually**: Layer in income timing, multiple assets, life events
3. **Test variations**: Change Social Security timing, asset allocation, expense levels
4. **Stress test**: What if market returns are lower? Expenses higher?

The beauty of this model is that **everything is an asset that appears at some time with some growth rate**. This simple abstraction can model incredibly complex real-life scenarios.

**Remember**: This is a projection tool, not a crystal ball. Use it to understand trends, test scenarios, and make informed decisions - but always plan for uncertainty!

---

## 🔧 Pro Tips

- **Month numbering**: The tool uses 0-based indexing internally (month 0 = first month), but displays 1-based in CSV (Month 1, 2, 3...)
- **Interest compounding**: Monthly compounding means annual rate ÷ 12, applied each month
- **Withdrawal logic**: Assets are drained completely in priority order before moving to the next priority
- **CSV export**: Great for further analysis in spreadsheets - you can create your own charts, pivot tables, etc.

Ready to model your own scenario? Start with Chapter 1 and work your way up!