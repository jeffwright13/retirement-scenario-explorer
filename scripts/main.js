import { simulateScenario } from './engine.js';
import {
  renderChart,
  renderCsv,
  updateHeaderFromMetadata
} from './render.js';


// Toggle visibility of the JSON input panel
document.getElementById("toggle-json-btn").addEventListener("click", () => {
  const jsonDiv = document.getElementById("json-container");
  jsonDiv.classList.toggle("collapsed");
  jsonDiv.classList.toggle("expanded");
});

// Toggle visibility of the CSV output panel
document.getElementById("toggle-csv-btn").addEventListener("click", () => {
  const csvDiv = document.getElementById("csv-container");
  csvDiv.classList.toggle("collapsed");
  csvDiv.classList.toggle("expanded");
});


// "Run Simulation" button handler
document.getElementById("run-btn").addEventListener("click", () => {

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
  // const { results, balanceHistory } = simulateScenario(scenario);
  const { results, balanceHistory, csvText } = simulateScenario(scenario);

  // Generate x-axis date labels for each month
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();

  // Render the chart
  renderChart(results, balanceHistory, scenario.metadata?.title);

  // Collapse JSON input and scroll to chart
  document.getElementById("json-container").classList.remove("expanded");
  document.getElementById("json-container").classList.add("collapsed");
  document.getElementById("chart-area").scrollIntoView({ behavior: "smooth" });
});
