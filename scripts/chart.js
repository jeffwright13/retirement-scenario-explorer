export function renderChart(data) {
  const labels = data.map(d => `Month ${d.month}`);
  const values = data.map(d => d.balance);
  const container = document.getElementById('chart-area');
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Balance Over Time',
        data: values,
        borderColor: 'blue',
        fill: false,
      }]
    }
  });
}