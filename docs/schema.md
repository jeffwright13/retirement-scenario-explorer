# 📄 JSON Scenario Input Schema (v0.1)

This document defines the expected input format for the `retirement-scenario-explorer` tool.

## 🧾 Top-Level Schema

```json
{
  "initial_balance": 100000,
  "monthly_income": 4000,
  "monthly_expenses": 3000,
  "start_date": "2025-01-01",
  "duration_months": 360,
  "events": [
    {
      "type": "withdrawal",
      "amount": 5000,
      "month": 18
    },
    {
      "type": "deposit",
      "amount": 10000,
      "month": 60
    }
  ],
  "metadata": {
    "title": "Base Case Retirement Model",
    "notes": "No Social Security yet, modest growth assumptions"
  }
}
```

---

## 🔍 Field Reference

### `initial_balance` (number, required)

Starting balance in dollars.

### `monthly_income` (number, required)

Recurring income applied every month.

### `monthly_expenses` (number, required)

Recurring monthly expenses.

### `start_date` (string, optional)

ISO 8601 date string (`YYYY-MM-DD`). Defaults to current date if omitted.

### `duration_months` (integer, optional)

Number of months to simulate. Defaults to 12 if omitted.

### `events` (array, optional)

List of one-time financial events.

Each event must include:

* `type`: "withdrawal" or "deposit"
* `amount`: Dollar amount
* `month`: Which month it occurs (0 = first month)

### `metadata` (object, optional)

Optional human-friendly metadata:

* `title`: Scenario title or label
* `notes`: Free-form notes or assumptions

---

## ✅ Minimal Valid Example

```json
{
  "initial_balance": 50000,
  "monthly_income": 3000,
  "monthly_expenses": 2500
}
```

---

## 🚧 Coming Enhancements

Future schema versions may include:

* Tax modeling
* Inflation assumptions
* Investment growth/returns
* Account-specific modeling (IRA, Roth, taxable)

---

*Last updated: v0.1 — 2025-08-05*
