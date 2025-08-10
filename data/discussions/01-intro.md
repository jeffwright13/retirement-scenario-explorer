# Chapter 1 — Welcome & Orientation

## Why This Tool Exists
Most people think of retirement planning as “Do I have enough in my account?”  
In reality, it’s about:
- Understanding your **income sources**
- Knowing your **expenses**
- Planning for **change over time** (inflation, market returns, life events)

The **Retirement Scenario Explorer** lets you model these factors. You can create a simple plan in minutes, then progressively add complexity until it’s a realistic model of your own life.

---

## What You’ll Learn in This Chapter
- The main parts of the tool’s interface
- How to run a simulation
- How to read the chart
- How to make your very first scenario

---

## Quick Tour of the Interface

| Area | Purpose |
|------|---------|
| **Scenario Dropdown** | Lets you load pre-built example scenarios. |
| **JSON Editor** | Where you can paste or edit the scenario data. |
| **Run Simulation** | Runs the model with the current data. |
| **Chart Area** | Visual display of cash flow, asset balances, or other metrics over time. |

---

## Your First Scenario

Here’s a simple “toy” plan:
- Monthly income: \$3,000
- Monthly expenses: \$2,500
- One savings account earning 1% interest
- Duration: 10 years (120 months)

**JSON for the tool:**

```json
{
  "metadata": {
    "title": "Chapter 1 — My First Plan"
  },
  "plan": {
    "monthly_expenses": 2500,
    "duration_months": 120,
    "stop_on_shortfall": true
  },
  "income": [
    {
      "name": "Salary",
      "amount": 3000,
      "start_month": 0,
      "stop_month": 120
    }
  ],
  "assets": [
    {
      "name": "Savings Account",
      "type": "taxable",
      "balance": 5000,
      "interest_rate": 0.01
    }
  ]
}
