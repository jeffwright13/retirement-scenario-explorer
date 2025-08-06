# 💰 retirement-scenario-explorer

📈 A browser-based tool for modeling and visualizing retirement financial scenarios. Built with HTML, CSS, and JavaScript. Inputs are scenario definitions in JSON format; outputs include dynamic charts showing cash flow, drawdowns, and asset balances over time. Designed to be composable, testable, and fully client-side.

A lightweight, browser-based tool for modeling and visualizing **retirement financial scenarios**. Built with HTML, CSS, and JavaScript — no backend, no installs.

## 🌟 Features

- Accepts input as structured JSON (e.g. assets, withdrawals, income)
- Dynamically computes projections over time
- Renders interactive charts (e.g., cash flow, asset drawdown)
- Modular and testable JavaScript logic
- Fully client-side — works offline, deployable via GitHub Pages
- Simple UI with clean separation between logic and presentation

## 📁 Project Structure

retirement-scenario-explorer/
├── index.html
├── styles/
│   └── main.css
├── scripts/
│   ├── main.js            # Handles user input/output
│   ├── engine.js          # Core retirement logic (pure functions)
│   └── chart.js           # Chart rendering (e.g. Plotly)
├── tests/
│   ├── engine.test.js     # Unit tests for engine
│   └── test-runner.html   # Simple Mocha/Chai test runner
├── data/
│   └── sample-scenario.json
├── README.md
├── .gitignore
└── package.json           # Optional: for JS testing libs like Jest or Mocha
