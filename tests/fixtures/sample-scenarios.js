/**
 * Sample test data for retirement scenarios
 * Use these in your tests to avoid duplicating test data
 */

const sampleScenarios = {
  basicRetirement: {
    name: "Basic Retirement Test",
    plan: {
      monthly_expenses: 4000,
      duration_months: 24
    },
    rate_schedules: {
      conservative: { type: 'fixed', rate: 0.02 },
      moderate: { type: 'fixed', rate: 0.06 },
      aggressive: { type: 'fixed', rate: 0.08 }
    },
    assets: [
      { name: 'Savings', balance: 50000, min_balance: 10000, return_schedule: 'conservative' },
      { name: 'Investment', balance: 100000, min_balance: 0, return_schedule: 'moderate' },
      { name: 'Traditional IRA', balance: 75000, min_balance: 0, return_schedule: 'aggressive' }
    ],
    income: [
      { 
        name: 'Social Security', 
        start_month: 12, 
        amount: 2000
      }
    ]
  },

  complexScenario: {
    name: "Complex Scenario Test",
    plan: {
      monthly_expenses: 5800, // 5000 + 800
      duration_months: 36
    },
    rate_schedules: {
      conservative: { type: 'fixed', rate: 0.02 },
      moderate: { type: 'fixed', rate: 0.06 },
      aggressive: { type: 'fixed', rate: 0.08 }
    },
    assets: [
      { name: 'Savings', balance: 75000, min_balance: 15000, return_schedule: 'conservative' },
      { name: 'Investment', balance: 200000, min_balance: 0, return_schedule: 'moderate' },
      { name: 'Traditional IRA', balance: 150000, min_balance: 0, return_schedule: 'aggressive' },
      { name: 'Roth IRA', balance: 50000, min_balance: 0, return_schedule: 'aggressive' }
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
