/**
 * Sample test data for retirement scenarios
 * Use these in your tests to avoid duplicating test data
 */

const sampleScenarios = {
  basicRetirement: {
    name: "Basic Retirement Test",
    assets: [
      { name: 'Savings', initial_balance: 50000, min_balance: 10000 },
      { name: 'Investment', initial_balance: 100000, min_balance: 0 },
      { name: 'Traditional IRA', initial_balance: 75000, min_balance: 0 }
    ],
    income: [
      { 
        name: 'Social Security', 
        start_month: 12, 
        amount: 2000,
        stop_month: null // Ongoing
      }
    ],
    expenses: [
      { name: 'Living Expenses', amount: 4000, frequency: 'monthly' }
    ]
  },

  complexScenario: {
    name: "Complex Scenario Test",
    assets: [
      { name: 'Savings', initial_balance: 75000, min_balance: 15000 },
      { name: 'Investment', initial_balance: 200000, min_balance: 0 },
      { name: 'Traditional IRA', initial_balance: 150000, min_balance: 0 },
      { name: 'Roth IRA', initial_balance: 50000, min_balance: 0 }
    ],
    income: [
      { 
        name: 'Social Security', 
        start_month: 24, 
        amount: 2500 
      },
      { 
        name: 'Pension', 
        start_month: 12, 
        amount: 1200 
      }
    ],
    expenses: [
      { name: 'Living Expenses', amount: 5000, frequency: 'monthly' },
      { name: 'Healthcare', amount: 800, frequency: 'monthly' }
    ]
  }
};

const sampleResults = {
  threeMonthResults: [
    { month: 1, totalAssets: 225000, monthlyExpenses: 4000 },
    { month: 2, totalAssets: 221000, monthlyExpenses: 4000 },
    { month: 3, totalAssets: 217000, monthlyExpenses: 4000 }
  ],

  sixMonthResults: [
    { month: 1, totalAssets: 425000, monthlyExpenses: 5800 },
    { month: 2, totalAssets: 419200, monthlyExpenses: 5800 },
    { month: 3, totalAssets: 413400, monthlyExpenses: 5800 },
    { month: 4, totalAssets: 407600, monthlyExpenses: 5800 },
    { month: 5, totalAssets: 401800, monthlyExpenses: 5800 },
    { month: 6, totalAssets: 396000, monthlyExpenses: 5800 }
  ]
};

const sampleBalanceHistory = {
  basic: {
    'Savings': [50000, 46000, 42000],
    'Investment': [100000, 102000, 104000],
    'Traditional IRA': [75000, 73000, 71000]
  },

  complex: {
    'Savings': [75000, 70200, 65400, 60600, 55800, 51000],
    'Investment': [200000, 204000, 208000, 212000, 216000, 220000],
    'Traditional IRA': [150000, 147000, 144000, 141000, 138000, 135000],
    'Roth IRA': [50000, 51000, 52000, 53000, 54000, 55000]
  }
};

module.exports = {
  sampleScenarios,
  sampleResults,
  sampleBalanceHistory
};
