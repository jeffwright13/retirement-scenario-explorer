import { simulateScenario } from './engine.js';
import {
  renderChart,
  renderCsv,
  updateHeaderFromMetadata,
  selectText
} from './render.js';

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

// Load scenarios from JSON file
let exampleScenarios = {};

async function loadScenarios() {
  try {
    const response = await fetch('data/example-scenarios.json');
    exampleScenarios = await response.json();
  } catch (error) {
    console.error('Failed to load scenarios:', error);
    // Fallback scenarios if file load fails
    exampleScenarios = {
      "default": {
        title: "Default Example",
        description: "Basic retirement scenario (fallback)",
        data: {
          "metadata": { "title": "Basic Retirement Example" },
          "plan": { "monthly_expenses": 6000, "duration_months": 240 },
          "income": [{ "name": "Social Security", "amount": 3000, "start_month": 24 }],
          "assets": [{ "name": "Savings", "type": "taxable", "balance": 300000, "interest_rate": 0.05, "compounding": "monthly" }],
          "order": [{ "account": "Savings", "order": 1 }]
        }
      }
    };
  }
}

// Initialize scenarios when page loads
document.addEventListener('DOMContentLoaded', loadScenarios);

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