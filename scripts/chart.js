export function renderChart(data) {
  const months = data.map(d => `Month ${d.month}`);
  const balances = data.map(d => d.balance);

  const trace = {
    x: months,
    y: balances,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Balance',
    line: { color: 'blue' }
  };

  const layout = {
    title: 'Balance Over Time',
    xaxis: { title: 'Month' },
    yaxis: { title: 'Balance ($)' }
  };

  Plotly.newPlot('chart-area', [trace], layout);
}
