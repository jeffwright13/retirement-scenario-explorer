export function simulateScenario(scenario) {
  const assets = JSON.parse(JSON.stringify(scenario.assets));
  const drawOrder = scenario.order?.sort((a, b) => a.order - b.order) || [];
  const assetMap = Object.fromEntries(assets.map((a) => [a.name, a]));

  const results = [];

  for (let month = 0; month < scenario.plan.duration_months; month++) {
    const income = scenario.income?.reduce((total, source) => {
      if (
        source.start_month <= month &&
        (source.stop_month === undefined || source.stop_month >= month)
      ) {
        return total + source.amount;
      }
      return total;
    }, 0) || 0;

    let expenses = scenario.plan.monthly_expenses;
    let drawdownNeeded = expenses - income;

    for (const draw of drawOrder) {
      if (drawdownNeeded <= 0) break;
      const asset = assetMap[draw.name];
      const amount = Math.min(drawdownNeeded, asset.balance);
      asset.balance -= amount;
      drawdownNeeded -= amount;
    }

    for (const asset of Object.values(assetMap)) {
      if (asset.interest_rate) {
        asset.balance *= 1 + asset.interest_rate / 12;
      }
    }

    results.push({
      month,
      income,
      expenses,
      drawdownNeeded,
      assets: Object.fromEntries(
        Object.entries(assetMap).map(([name, a]) => [name, a.balance])
      ),
    });
  }

  return results;
}
