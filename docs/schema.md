# 📄 JSON Scenario Input Schema (v0.2)

This document defines the expected input format for the `retirement-scenario-explorer` tool.

## 🦾 Top-Level Schema

```json
{
  "assets": [
    {
      "name": "IRA",
      "type": "tax_deferred",
      "balance": 150000,
      "interest_rate": 0.05,
      "compounding": "monthly",
      "withdrawal_priority": 1
    },
    {
      "name": "Brokerage",
      "type": "taxable",
      "balance": 100000,
      "interest_rate": 0.04,
      "compounding": "monthly",
      "withdrawal_priority": 2
    },
    {
      "name": "Savings",
      "type": "tax_free",
      "balance": 25000,
      "interest_rate": 0.015,
      "compounding": "monthly",
      "withdrawal_priority": 3
    }
  ],
  "monthly_income": 4000,
  "monthly_expenses": 3000,
  "start_date": "2025-01-01",
  "duration_months": 360,
  "events": [
    {
      "type": "withdrawal",
      "amount": 5000,
      "month": 18,
      "source": "Brokerage"
    },
    {
      "type": "deposit",
      "amount": 10000,
      "month": 60,
      "target": "IRA"
    }
  ],
  "metadata": {
    "title": "Base Case Retirement Model",
    "notes": "Includes multiple account types and interest accrual"
  }
}
```

---

## 🔍 Field Reference

### `assets` (array, required)

List of financial accounts or holdings.

Each asset must include:

* `name`: User-friendly name of the asset
* `type`: One of `"taxable"`, `"tax_deferred"`, `"tax_free"`
* `balance`: Starting balance
* `interest_rate`: Annual return rate (decimal)
* `compounding`: Either `"monthly"` or `"annual"`
* `withdrawal_priority`: Integer priority used when drawing down (lower = first)

### `monthly_income` (number, required)

Recurring income applied every month (e.g., pension, rental income).

### `monthly_expenses` (number, required)

Total recurring monthly expenses.

### `start_date` (string, optional)

ISO 8601 date string (`YYYY-MM-DD`). Defaults to current date if omitted.

### `duration_months` (integer, optional)

Number of months to simulate. Defaults to 12 if omitted.

### `events` (array, optional)

List of one-time financial transactions. Each must include:

* `type`: "withdrawal" or "deposit"
* `amount`: Dollar amount
* `month`: 0-indexed month when it occurs
* `source` or `target`: Asset name to draw from or deposit into

### `metadata` (object, optional)

Optional metadata for labeling and notes:

* `title`: Scenario title
* `notes`: Freeform descriptive notes

---

## ✅ Sample Scenario JSON Files

### Scenario 1 — Basic Growth

```json
{
  "assets": [
    {
      "name": "Brokerage",
      "type": "taxable",
      "balance": 100000,
      "interest_rate": 0.05,
      "compounding": "monthly",
      "withdrawal_priority": 1
    }
  ],
  "monthly_income": 4000,
  "monthly_expenses": 3500,
  "duration_months": 24,
  "metadata": {
    "title": "Basic Growth with Surplus",
    "notes": "Models a simple growing portfolio with $500/month net savings."
  }
}
```

### Scenario 2 - Flat expenses w/ Withdrawal Event

```json
{
  "assets": [
    {
      "name": "IRA",
      "type": "tax_deferred",
      "balance": 120000,
      "interest_rate": 0.04,
      "compounding": "monthly",
      "withdrawal_priority": 1
    }
  ],
  "monthly_income": 0,
  "monthly_expenses": 3000,
  "duration_months": 36,
  "events": [
    {
      "type": "withdrawal",
      "amount": 15000,
      "month": 12,
      "source": "IRA"
    }
  ],
  "metadata": {
    "title": "IRA Drawdown with One-Time Expense",
    "notes": "Simulates no income and one-time withdrawal at month 12."
  }
}
```

### Scenario 3 — Multiple Assets with Interest

```json
{
  "assets": [
    {
      "name": "Roth IRA",
      "type": "tax_free",
      "balance": 50000,
      "interest_rate": 0.06,
      "compounding": "monthly",
      "withdrawal_priority": 2
    },
    {
      "name": "Savings",
      "type": "taxable",
      "balance": 20000,
      "interest_rate": 0.02,
      "compounding": "monthly",
      "withdrawal_priority": 1
    }
  ],
  "monthly_income": 1000,
  "monthly_expenses": 2500,
  "duration_months": 18,
  "metadata": {
    "title": "Multiple Asset Test",
    "notes": "Draws from savings first, then Roth IRA."
  }
}
```

---

## 🚧 Coming Enhancements

Future schema versions may support:

* Realistic tax withholding and annual tax filing logic
* Required Minimum Distributions (RMDs)
* Account conversion events (e.g. Roth conversion)
* Inflation-adjusted income and expenses
* Social Security and Medicare modeling

---

*Last updated: v0.2 — 2025-08-05*
