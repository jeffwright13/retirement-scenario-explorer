import { calculateProjection } from './engine.js';
import { renderChart } from './chart.js';

window.runScenario = function () {
  console.log("✅ runScenario called");

  const input = document.getElementById('scenario-input').value;
  const status = document.getElementById('status-message');

  try {
    const scenario = JSON.parse(input);
    const results = calculateProjection(scenario);
    renderChart(results);

    showStatus('✅ Scenario loaded and executing...', 'green');
  } catch (e) {
    showStatus('❌ Invalid JSON input', 'red');
  }
};

function showStatus(message, color) {
  const status = document.getElementById('status-message');
  status.textContent = message;
  status.style.color = color;
  status.style.opacity = '1';

  // Start fade out after 3 seconds
  setTimeout(() => {
    status.style.transition = 'opacity 1s ease-out';
    status.style.opacity = '0';
  }, 3000);
}
