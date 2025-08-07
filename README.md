# 💰 Retirement Scenario Explorer

📈 A lightweight, browser-based tool for modeling and visualizing **retirement financial scenarios**.  
Built with plain HTML, CSS, and JavaScript — **no backend**, no installs, and no build tools required.

⚠️ **Important:** To use this tool, you must run it via a local web server.  
Modern browsers block `file://` access for local JS modules and `import`/`export` syntax.

You can start a local server using:

```bash
# Python 3
python3 -m http.server
# Then open http://localhost:8000 in your browser
```

---

## 🌟 Features

- Accepts structured JSON input (assets, income, withdrawal rules, etc.)
- Dynamically computes retirement projections month-by-month
- Renders interactive charts (cash flow, drawdowns, balances)
- CSV export for deeper spreadsheet analysis
- 100% client-side — works offline and respects your privacy
- Modular, clean JavaScript codebase (no frameworks)

---

## 📁 Project Structure

```bash
retirement-scenario-explorer/
├── index.html
├── styles/
│   └── main.css
├── scripts/
│   ├── main.js            # Handles user input/output
│   ├── engine.js          # Core retirement logic (pure functions)
│   ├── render.js          # DOM + chart rendering only
│   └── utils.js           # Small utility functions
├── tests/
│   ├── engine.test.js     # Unit tests for engine
│   └── test-runner.html   # Simple Mocha/Chai test runner
├── data/
│   └── sample-scenario.json
├── README.md
├── .gitignore
└── package.json           # Optional: for JS testing libs like Jest or Mocha
```

---

## 🧠 Modeling Real-Life Retirement Scenarios

The `retirement-scenario-explorer` uses a streamlined but powerful financial simulation model. While it does not currently support a separate `events[]` or `phases[]` system, it can model **complex real-life situations** using only:

- `assets[]` – accounts, reserves, windfalls, and even negative-balance shocks
- `income[]` – steady or phased monthly income streams
- `plan.monthly_expenses` – base living costs

Everything else can be expressed through these primitives.

---

### ✅ Common Scenarios and How to Model Them

#### 📦 Inheritance or Lump Sum Windfall
```json
{
  "name": "Inherited Trust",
  "type": "taxable",
  "balance": 250000,
  "start_month": 60,
  "interest_rate": 0.04
}
```

#### 🏠 Home Sale (one-time deposit)
```json
{
  "name": "Home Sale Proceeds",
  "type": "taxable",
  "balance": 180000,
  "start_month": 120
}
```

#### 🔧 Roof Replacement (one-time expense)
```json
{
  "name": "Roof Replacement",
  "type": "taxable",
  "balance": -25000,
  "start_month": 150
}
```

#### 🆘 Emergency Fund (fallback source)
```json
{
  "name": "Emergency Fund",
  "type": "taxable",
  "balance": 50000,
  "interest_rate": 0.00
}
```

#### 🧑‍💼 Variable or Phased Income (multiple entries)
```json
[
  {
    "name": "Part-Time Work",
    "amount": 2000,
    "start_month": 0,
    "stop_month": 12
  },
  {
    "name": "Part-Time Work",
    "amount": 1500,
    "start_month": 13,
    "stop_month": 24
  }
]
```

#### 🐶 Getting a Dog (startup and recurring cost)
```json
{
  "name": "Dog Setup",
  "type": "taxable",
  "balance": -2000,
  "start_month": 36
}
```

(Recurring monthly costs should be added into `monthly_expenses` manually or approximated as a drawdown margin.)

---

### 🧩 Key Insight

> **Everything is an asset.**  
> Windfalls, one-time expenses, future accounts, emergency reserves — they can all be expressed as time-aware `assets[]` with either positive or negative balances and flexible interest behavior.

This flexible design avoids the need for separate `events[]`, `liabilities[]`, or `shocks[]` sections — while remaining easy to understand, test, and extend.

---

### 🛠 Future Feature Ideas (Not Yet Implemented)

- Support for `monthly_expenses[]` as time-varying intervals
- Scenario branching (optimistic vs pessimistic paths)
- Asset liquidity constraints or early withdrawal penalties
- Tax treatment simulation (pre-tax, Roth, capital gains)

---

## 🔄 Processing Loop Overview

The core simulation is implemented as a monthly loop that progresses through the entire duration of the retirement plan.

### Pseudocode Summary:
```javascript
for each month in duration:
    1. Sum income for this month
    2. Subtract expenses to determine shortfall
    3. Withdraw funds from assets using drawdown order
    4. Apply interest growth to all assets
    5. Record state (balances, income, shortfall) for this month
```

Each asset may have:
- A `start_month` that determines when it becomes active
- A balance that grows monthly (if `interest_rate` > 0)
- A withdrawal limit of the current balance

CSV output and charts are generated based on these monthly records.

---

## 📄 License

[MIT](./LICENSE) — open source, no restrictions.

---

## 💡 Feedback / Contributions

I welcome modeling suggestions and PRs — especially new sample scenarios! Open an issue or fork the repo.