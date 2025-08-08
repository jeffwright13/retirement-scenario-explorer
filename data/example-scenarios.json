// data/example-scenarios.js
// Centralized location for all example scenarios
// Edit here to update both the guide documentation AND the dropdown

export const exampleScenarios = {
  "level1-simple": {
    title: "Level 1: Simple Drawdown",
    description: "Sarah has $120k in savings earning 2% annually. She needs $3,000/month to live. How long will her money last?",
    data: {
      "metadata": {
        "title": "Level 1: Simple Drawdown",
        "notes": "Sarah has $120k in savings earning 2% annually. She needs $3,000/month to live. How long will her money last?"
      },
      "plan": { 
        "monthly_expenses": 3000, 
        "duration_months": 48 
      },
      "income": [],
      "assets": [
        {
          "name": "Savings",
          "type": "taxable",
          "balance": 120000,
          "interest_rate": 0.02,
          "compounding": "monthly"
        }
      ],
      "order": [
        {
          "account": "Savings",
          "order": 1
        }
      ]
    }
  },

  "level2-income": {
    title: "Level 2: Adding Social Security",
    description: "Same Sarah, but Social Security starts in month 12. Watch the dramatic change in sustainability!",
    data: {
      "metadata": {
        "title": "Level 2: Adding Social Security",
        "notes": "Same Sarah, but Social Security of $1,800/month starts in month 12. Watch the dramatic change in sustainability!"
      },
      "plan": { 
        "monthly_expenses": 3000, 
        "duration_months": 120 
      },
      "income": [
        {
          "name": "Social Security",
          "amount": 1800,
          "start_month": 12
        }
      ],
      "assets": [
        {
          "name": "Savings",
          "type": "taxable", 
          "balance": 120000,
          "interest_rate": 0.02,
          "compounding": "monthly"
        }
      ],
      "order": [
        {
          "account": "Savings",
          "order": 1
        }
      ]
    }
  },

  "level3-multiple": {
    title: "Level 3: Multiple Assets",
    description: "Bob has savings and investments. Priority-based withdrawal strategy preserves higher-growth assets longer.",
    data: {
      "metadata": {
        "title": "Level 3: Multiple Assets and Withdrawal Priority",
        "notes": "Bob has savings and investments. He wants to preserve the higher-growth investments as long as possible by spending savings first."
      },
      "plan": { 
        "monthly_expenses": 4000, 
        "duration_months": 168 
      },
      "income": [
        {
          "name": "Social Security", 
          "amount": 2200,
          "start_month": 24
        }
      ],
      "assets": [
        {
          "name": "Savings",
          "type": "taxable",
          "balance": 50000,
          "interest_rate": 0.015,
          "compounding": "monthly"
        },
        {
          "name": "Investment Account", 
          "type": "taxable",
          "balance": 200000,
          "interest_rate": 0.06,
          "compounding": "monthly"
        }
      ],
      "order": [
        {
          "account": "Savings",
          "order": 1
        },
        {
          "account": "Investment Account",
          "order": 2
        }
      ]
    }
  },

  "ss-claim-62": {
    title: "Social Security: Claim at 62",
    description: "Maria claims early: $2,100/month (75% of full benefit) starting at age 62. Lower monthly benefit but immediate cash flow.",
    data: {
      "metadata": {
        "title": "Maria - Claim Social Security at Age 62",
        "notes": "Early claiming: $2,100/month (75% of full benefit) starting at age 62 (month 24). Compare with other timing strategies."
      },
      "plan": {
        "monthly_expenses": 6500,
        "duration_months": 360
      },
      "income": [
        {
          "name": "Social Security (Early)",
          "amount": 2100,
          "start_month": 24
        }
      ],
      "assets": [
        {
          "name": "401k/IRA",
          "type": "taxable",
          "balance": 450000,
          "interest_rate": 0.06,
          "compounding": "monthly"
        },
        {
          "name": "Taxable Investments",
          "type": "taxable", 
          "balance": 200000,
          "interest_rate": 0.055,
          "compounding": "monthly"
        }
      ],
      "order": [
        {
          "account": "Taxable Investments",
          "order": 1
        },
        {
          "account": "401k/IRA",
          "order": 2
        }
      ]
    }
  },

  "ss-claim-67": {
    title: "Social Security: Claim at 67",
    description: "Maria waits for full benefit: $2,800/month (100%) starting at age 67. More asset depletion early, but higher lifetime benefit.",
    data: {
      "metadata": {
        "title": "Maria - Claim Social Security at Full Retirement Age (67)",
        "notes": "Normal claiming: $2,800/month (100% of full benefit) starting at age 67 (month 84). Compare asset depletion with early/delayed strategies."
      },
      "plan": {
        "monthly_expenses": 6500,
        "duration_months": 360
      },
      "income": [
        {
          "name": "Social Security (Full)",
          "amount": 2800,
          "start_month": 84
        }
      ],
      "assets": [
        {
          "name": "401k/IRA",
          "type": "taxable",
          "balance": 450000,
          "interest_rate": 0.06,
          "compounding": "monthly"
        },
        {
          "name": "Taxable Investments",
          "type": "taxable",
          "balance": 200000,
          "interest_rate": 0.055,
          "compounding": "monthly"
        }
      ],
      "order": [
        {
          "account": "Taxable Investments",
          "order": 1
        },
        {
          "account": "401k/IRA",
          "order": 2
        }
      ]
    }
  },

  "ssdi-approved": {
    title: "SSDI: Approved",
    description: "Tom gets SSDI at 58: $2,600/month (full retirement amount) immediately. Financial game-changer.",
    data: {
      "metadata": {
        "title": "Tom - SSDI Approved",
        "notes": "SSDI pays full retirement benefit amount immediately ($2,600/month), converts to regular Social Security at full retirement age (67)."
      },
      "plan": {
        "monthly_expenses": 5200,
        "duration_months": 300
      },
      "income": [
        {
          "name": "SSDI",
          "amount": 2600,
          "start_month": 6,
          "stop_month": 107
        },
        {
          "name": "Social Security",
          "amount": 2600, 
          "start_month": 108
        }
      ],
      "assets": [
        {
          "name": "401k",
          "type": "taxable",
          "balance": 180000,
          "interest_rate": 0.055,
          "compounding": "monthly"
        },
        {
          "name": "Savings",
          "type": "taxable",
          "balance": 45000,
          "interest_rate": 0.02,
          "compounding": "monthly"
        }
      ],
      "order": [
        {
          "account": "Savings",
          "order": 1
        },
        {
          "account": "401k",
          "order": 2
        }
      ]
    }
  },

  "default": {
    title: "Default Example",
    description: "A balanced retirement scenario with multiple account types and Social Security.",
    data: {
      "metadata": {
        "title": "Retirement Drawdown Calculator"
      },
      "plan": {
        "monthly_expenses": 6000,
        "duration_months": 240
      },
      "income": [
        {
          "name": "Social Security",
          "amount": 3000,
          "start_month": 24
        }
      ],
      "assets": [
        {
          "name": "Savings",
          "type": "taxable",
          "balance": 100000,
          "interest_rate": 0.0375,
          "compounding": "monthly"
        },
        {
          "name": "Investment",
          "type": "taxable",
          "balance": 250000,
          "interest_rate": 0.06,
          "compounding": "monthly"
        },
        {
          "name": "Traditional IRA",
          "type": "taxable",
          "balance": 100000,
          "interest_rate": 0.06,
          "compounding": "monthly"
        },
        {
          "name": "Roth IRA",
          "type": "tax_free",
          "balance": 12000,
          "interest_rate": 0.06,
          "compounding": "monthly"
        }
      ],
      "order": [
        {
          "account": "Savings",
          "order": 1
        },
        {
          "account": "Investment",
          "order": 2
        },
        {
          "account": "Traditional IRA",
          "order": 3
        },
        {
          "account": "Roth IRA",
          "order": 4
        }
      ]
    }
  }
};