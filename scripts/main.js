import { simulateScenario } from './engine.js';
import {
  renderChart,
  renderCsv,
  updateHeaderFromMetadata,
  selectText
} from './render.js';
import { exampleScenarios } from '../data/example-scenarios.js';

// Expose selectText for inline HTML buttons
window.selectText = selectText;

// Expose toggle function for getting started panel
window.toggleGettingStarted = function() {
  const panel = document.getElementById("getting-started-panel");
  panel.classList.toggle("collapsed");
};

// Auto-collapse getting started panel when simulation runs
function collapseGettingStarted() {
  const panel = document.getElementById("getting-started-panel");
  panel.classList.add("collapsed");
}

// Scenario dropdown functionality
document.getElementById("scenario-dropdown").addEventListener("change", (e) => {
  const scenarioKey = e.target.value;
  const loadBtn = document.getElementById("load-scenario-btn");
  const previewDiv = document.getElementById("scenario-preview");
  const descriptionP = document.getElementById("scenario-description");
  const jsonPreview = document.getElementById("scenario-json-preview");
  
  if (scenarioKey && exampleScenarios[scenarioKey]) {
    const scenario = exampleScenarios[scenarioKey];
    
    // Enable load button and show preview
    loadBtn.disabled = false;
    previewDiv.style.display = "block";
    descriptionP.textContent = scenario.description;
    jsonPreview.textContent = JSON.stringify(scenario.data, null, 2);
  } else {
    // Disable load button and hide preview
    loadBtn.disabled = true;
    previewDiv.style.display = "none";
  }
});

// Enhanced example scenarios with better metadata
const exampleScenarios = {
  "level1-simple": {
    title: "Level 1: Simple Drawdown",
    description: "Basic scenario: $120k savings, $3k/month expenses, 2% growth. See how long money lasts with no income.",
    data: {
      "metadata": {
        "title": "Level 1: Simple Asset Drawdown",
        "notes": "Sarah, 60, has $120,000 in savings earning 2% annually. She needs $3,000/month for living expenses. No other income sources. How long will her money last?"
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
  },

  "level2-income": {
    title: "Level 2: Adding Social Security",
    description: "Same scenario but Social Security starts in month 12. Watch the dramatic sustainability improvement!",
    data: {
      "metadata": {
        "title": "Level 2: Impact of Social Security Income",
        "notes": "Same Sarah, but Social Security of $1,800/month begins in month 12 (year 1). This reduces her monthly shortfall from $3,000 to just $1,200. See how income timing dramatically affects sustainability."
      },
      "plan": { 
        "monthly_expenses": 3000, 
        "duration_months": 120 
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
      ],
      "order": [
        {
          "account": "Savings",
          "order": 1
        }
      ]
    }
  },

  "level3-multiple": {
    title: "Level 3: Multiple Assets & Withdrawal Priority",
    description: "Bob has low-yield savings and high-yield investments. Strategic withdrawal order preserves growth longer.",
    data: {
      "metadata": {
        "title": "Level 3: Strategic Asset Withdrawal Priority",
        "notes": "Bob, 62, has $50k in savings (1.5% growth) and $200k investments (6% growth). He spends savings first to preserve higher-growth assets longer. Social Security starts in month 24. Compare this strategy to spending investments first."
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
  },

  "ss-claim-62": {
    title: "Social Security: Early Claiming at 62",
    description: "Maria claims at 62 for immediate income but reduced monthly benefit. Compare with delayed claiming strategies.",
    data: {
      "metadata": {
        "title": "SS Strategy A: Early Claiming at Age 62",
        "notes": "Maria, 60, retires with $650k total assets. She claims Social Security early at 62 (month 24) receiving $2,100/month (75% of full benefit). This provides immediate cash flow but permanent benefit reduction. Monthly shortfall: $4,400 after SS starts."
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
  },

  "ss-claim-67": {
    title: "Social Security: Full Retirement Age (67)",
    description: "Maria waits for full benefit: higher monthly amount but more early asset depletion. Compare the trade-offs.",
    data: {
      "metadata": {
        "title": "SS Strategy B: Full Retirement Age Claiming (67)",
        "notes": "Same Maria waits until full retirement age (month 84) to claim $2,800/month (100% benefit). Higher monthly amount but requires 7 years of full asset drawdown ($6,500/month). Monthly shortfall: $3,700 after SS starts."
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
  },

  "ssdi-approved": {
    title: "SSDI Success Story",
    description: "Tom gets SSDI approval: immediate full retirement benefit at 58. This is the best-case financial scenario.",
    data: {
      "metadata": {
        "title": "SSDI Approved: The Financial Game-Changer",
        "notes": "Tom, 58, successfully gets SSDI approval and receives his full retirement benefit ($2,600/month) immediately - 9 years early! This converts to regular Social Security at 67. With $225k in assets and $5,200 monthly expenses, his shortfall drops to just $2,600/month."
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
  },

  "default": {
    title: "Balanced Portfolio Example",
    description: "Multi-account retirement scenario with strategic withdrawal order and Social Security timing.",
    data: {
      "metadata": {
        "title": "Balanced Retirement Portfolio Strategy",
        "notes": "Balanced scenario with 4 account types: Emergency savings (3.75%), Growth investments (6%), Traditional IRA (6%), and Roth IRA (6%). Social Security starts at month 24. Withdrawal priority preserves tax-advantaged accounts longest."
      },
      "plan": {
        "monthly_expenses": 6000,
        "duration_months": 240
      },
      "income": [
        {
          "name": "Social Security",
          "amount": 3000,
          "start_month": 24
        }
      ],
      "assets": [
        {
          "name": "Savings",
          "type": "taxable",
          "balance": 100000,
          "interest_rate": 0.0375,
          "compounding": "monthly"
        },
        {
          "name": "Investment",
          "type": "taxable",
          "balance": 250000,
          "interest_rate": 0.06,
          "compounding": "monthly"
        },
        {
          "name": "Traditional IRA",
          "type": "taxable",
          "balance": 100000,
          "interest_rate": 0.06,
          "compounding": "monthly"
        },
        {
          "name": "Roth IRA",
          "type": "tax_free",
          "balance": 12000,
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
          "account": "Investment",
          "order": 2
        },
        {
          "account": "Traditional IRA",
          "order": 3
        },
        {
          "account": "Roth IRA",
          "order": 4
        }
      ]
    }
  }
};

// Load scenario button
document.getElementById("load-scenario-btn").addEventListener("click", () => {
  const scenarioKey = document.getElementById("scenario-dropdown").value;
  
  if (scenarioKey && exampleScenarios[scenarioKey]) {
    const scenario = exampleScenarios[scenarioKey];
    
    // Load JSON into textarea
    document.getElementById("json-input").value = JSON.stringify(scenario.data, null, 2);
    
    // Show JSON container if collapsed
    const jsonContainer = document.getElementById("json-container");
    if (jsonContainer.classList.contains("collapsed")) {
      jsonContainer.classList.remove("collapsed");
      jsonContainer.classList.add("expanded");
    }
    
    // Scroll to JSON area
    jsonContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    
    // Reset dropdown
    document.getElementById("scenario-dropdown").value = "";
    document.getElementById("load-scenario-btn").disabled = true;
    document.getElementById("scenario-preview").style.display = "none";
  }
});

// Toggle visibility of the JSON input panel
document.getElementById("toggle-json-btn").addEventListener("click", () => {
  const jsonDiv = document.getElementById("json-container");
  jsonDiv.classList.toggle("collapsed");
  jsonDiv.classList.toggle("expanded");
});

// Toggle visibility of the CSV output panel
document.getElementById("toggle-csv-btn").addEventListener("click", () => {
  const csvSection = document.getElementById("csv-section");
  const csvDiv = document.getElementById("csv-container");
  
  csvSection.classList.toggle("collapsed");
  csvDiv.classList.toggle("collapsed");
});

// "Run Simulation" button handler with loading state
document.getElementById("run-btn").addEventListener("click", () => {
  const runButton = document.getElementById("run-btn");
  
  // Add loading state
  runButton.classList.add("loading");
  runButton.textContent = "Running...";
  runButton.disabled = true;

  // Small delay to show loading state (makes it feel more responsive)
  setTimeout(() => {
    try {
      // Read and parse scenario JSON from the input box
      const jsonText = document.getElementById("json-input").value;
      let scenario;

      try {
        scenario = JSON.parse(jsonText);
      } catch (err) {
        alert("Invalid JSON: " + err.message);
        return;
      }

      // Convert legacy field (withdrawal_priority) to new format (order)
      if (scenario.withdrawal_priority && !scenario.order) {
        console.warn("⚠️ 'withdrawal_priority' is deprecated. Use 'order' instead.");
        scenario.order = scenario.withdrawal_priority.map((item) => ({
          account: item.account,
          order: item.priority,
        }));
      }

      // Run the simulation and unpack the result
      updateHeaderFromMetadata(scenario.metadata);
      const simulationResult = simulateScenario(scenario);
      console.log("Running simulation with scenario:", scenario);
      console.log("Simulation result:", simulationResult);

      window._scenarioResult = simulationResult; // for debug visibility
      const { results, balanceHistory, csvText, windfallUsedAtMonth } = simulationResult;

      // Render the CSV and the chart
      renderCsv(csvText);
      renderChart(results, balanceHistory, scenario.metadata?.title, {windfallUsedAtMonth});

      // Collapse getting started panel and JSON input, then scroll to chart
      collapseGettingStarted();
      document.getElementById("json-container").classList.remove("expanded");
      document.getElementById("json-container").classList.add("collapsed");
      document.getElementById("chart-area").scrollIntoView({ behavior: "smooth" });

    } finally {
      // Remove loading state
      runButton.classList.remove("loading");
      runButton.textContent = "Run Simulation";
      runButton.disabled = false;
    }
  }, 100); // Small delay to show loading state
});