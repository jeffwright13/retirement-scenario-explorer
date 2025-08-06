export function calculateProjection(scenario) {
  const results = [];
  const months = scenario.duration_months || 12;

  // Use the first asset as the balance tracker for now
  const assets = scenario.assets || [];
  const income = scenario.monthly_income || 0;
  const expenses = scenario.monthly_expenses || 0;

  // Make a copy of balances so we don't mutate original
  const balances = assets.map(asset => ({ ...asset }));

  for (let month = 0; month < months; month++) {
    let net = income - expenses;

    // Apply interest monthly
    balances.forEach(asset => {
      if (asset.compounding === 'monthly') {
        asset.balance += asset.balance * (asset.interest_rate || 0) / 12;
      }
    });

    // Apply events that occur this month
    if (Array.isArray(scenario.events)) {
      scenario.events.forEach(event => {
        if (event.month === month) {
          const target = balances.find(a => a.name === (event.source || event.target));
          if (target) {
            if (event.type === 'withdrawal') target.balance -= event.amount;
            if (event.type === 'deposit') target.balance += event.amount;
          }
        }
      });
    }

    // Apply monthly surplus/deficit
    if (net !== 0) {
      // For now, apply to first asset only
      balances[0].balance += net;
    }

    // Sum of all assets this month
    const total = balances.reduce((sum, a) => sum + a.balance, 0);
    results.push({ month, balance: total });
  }

  return results;
}
