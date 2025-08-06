document.getElementById('run-btn').addEventListener('click', () => {
  const jsonText = document.getElementById('json-input').value;
  let scenario;

  try {
    scenario = JSON.parse(jsonText);
  } catch (err) {
    alert("Invalid JSON: " + err.message);
    return;
  }

  // Handle legacy format
  if (scenario.withdrawal_priority && !scenario.order) {
    console.warn("⚠️ 'withdrawal_priority' is deprecated. Use 'order' instead.");
    scenario.order = scenario.withdrawal_priority.map(item => ({
      account: item.account,
      order: item.priority
    }));
  }

  // Sort by 'order'
  const orderedAccounts = scenario.order?.sort((a, b) => a.order - b.order) || [];
  console.log("Withdrawal Order:", orderedAccounts);

  // TODO: Replace with actual chart logic
  document.getElementById("chart-area").textContent = "Processed scenario: " + scenario.scenario_name;

  // Collapse input
  const jsonDiv = document.getElementById('json-container');
  jsonDiv.classList.remove('expanded');
  jsonDiv.classList.add('collapsed');
});

document.getElementById('toggle-json-btn').addEventListener('click', () => {
  const jsonDiv = document.getElementById('json-container');
  jsonDiv.classList.toggle('collapsed');
  jsonDiv.classList.toggle('expanded');
});
