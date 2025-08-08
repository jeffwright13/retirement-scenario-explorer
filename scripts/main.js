import { simulateScenario } from './engine.js';
import {
  renderChart,
  renderCsv,
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
        title: "Basic Retirement Example",
        description: "Basic retirement scenario (fallback)",
        plan: { monthly_expenses: 6000, duration_months: 240 },
        income: [{ name: "Social Security", amount: 3000, start_month: 24 }],
        assets: [{ name: "Savings", type: "taxable", balance: 300000, interest_rate: 0.05, compounding: "monthly" }],
        order: [{ account: "Savings", order: 1 }]
      }
    };
  }
}

// Helper function to add comments to template JSON
function addCommentsToJson(jsonText) {
  return jsonText
    .replace('"monthly_expenses": 5000,', '"monthly_expenses": 5000,  // Your monthly living expenses')
    .replace('"duration_months": 360', '"duration_months": 360     // How many months to simulate (30 years = 360)')
    .replace('"name": "Social Security",', '"name": "Social Security",     // Name this income source')
    .replace('"amount": 2500,', '"amount": 2500,               // Monthly amount')
    .replace('"start_month": 24', '"start_month": 24             // When it starts (0 = immediately)')
    .replace('"name": "Savings",', '"name": "Savings",            // Account name')
    .replace('"type": "taxable",', '"type": "taxable",            // "taxable", "tax_free", or other')
    .replace('"balance": 100000,', '"balance": 100000,            // Starting balance')
    .replace('"interest_rate": 0.03,', '"interest_rate": 0.03,        // Annual growth rate (3% = 0.03)')
    .replace('"compounding": "monthly"', '"compounding": "monthly"      // "monthly" or "annual"')
    .replace('"account": "Savings",', '"account": "Savings",         // Which account to withdraw from')
    .replace('"order": 1', '"order": 1                    // Priority (1 = first, 2 = second, etc.)')
    .replace('"name": "Investment Account",', '"name": "Investment Account", // Account name')
    .replace('"balance": 200000,', '"balance": 200000,            // Starting balance')
    .replace('"interest_rate": 0.06,', '"interest_rate": 0.06,        // Annual growth rate (6% = 0.06)')
    .replace('"account": "Investment Account",', '"account": "Investment Account", // Which account to withdraw from')
    .replace('"order": 2', '"order": 2                    // Priority (1 = first, 2 = second, etc.)');
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
   
   // Show complete scenario structure including key name
   const completeScenario = { [scenarioKey]: scenario };
   let jsonText = JSON.stringify(completeScenario, null, 2);

   // Add helpful comments for template scenarios
   if (scenarioKey === 'full-template') {
     jsonText = addCommentsToJson(jsonText);
   }

   jsonPreview.textContent = jsonText;
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
   
   // Load complete scenario structure including key name
   const completeScenario = { [scenarioKey]: scenario };
   let jsonText = JSON.stringify(completeScenario, null, 2);

   // Add helpful comments for template scenarios
   if (scenarioKey === 'full-template') {
     jsonText = addCommentsToJson(jsonText);
   }

   document.getElementById("json-input").value = jsonText;
   
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
     let parsedData;

     try {
       parsedData = JSON.parse(jsonText);
     } catch (err) {
       alert("Invalid JSON: " + err.message);
       return;
     }

     // Handle both formats: complete scenario object or direct scenario data
     let scenario;
     if (parsedData.plan && parsedData.assets) {
       // Direct scenario data (legacy format)
       scenario = parsedData;
     } else {
       // Complete scenario object - extract the first scenario
       const scenarioKey = Object.keys(parsedData)[0];
       scenario = parsedData[scenarioKey];
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
     const simulationResult = simulateScenario(scenario);
     console.log("Running simulation with scenario:", scenario);
     console.log("Simulation result:", simulationResult);

     window._scenarioResult = simulationResult; // for debug visibility
     const { results, balanceHistory, csvText, windfallUsedAtMonth } = simulationResult;

     // Render the CSV and the chart - use scenario title directly
     renderCsv(csvText);
     renderChart(results, balanceHistory, scenario.title || "Retirement Simulation", {windfallUsedAtMonth});

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