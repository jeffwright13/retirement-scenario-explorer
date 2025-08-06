export function calculateProjection(scenario) {
  const results = [];
  let balance = scenario.initial_balance || 100000;
  for (let month = 0; month < 12; month++) {
    const income = scenario.monthly_income || 0;
    const expenses = scenario.monthly_expenses || 0;
    balance += income - expenses;
    results.push({ month, balance });
  }
  return results;
}