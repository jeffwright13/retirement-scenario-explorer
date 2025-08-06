import { calculateProjection } from './engine.js';
import { renderChart } from './chart.js';

window.runScenario = function () {
  const input = document.getElementById('scenario-input').value;
  try {
    const scenario = JSON.parse(input);
    const results = calculateProjection(scenario);
    renderChart(results);
  } catch (e) {
    alert('Invalid JSON input');
  }
}