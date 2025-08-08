import { simulateScenario } from './engine.js';
import {
  renderChart,
  renderCsv,
  updateHeaderFromMetadata,
  selectText
} from './render.js';

// Expose selectText for inline HTML buttons
window.selectText = selectText;

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

      // Collapse JSON input and scroll to chart
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