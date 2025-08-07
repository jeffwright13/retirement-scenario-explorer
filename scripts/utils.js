/**
 * Calculates total income for a given month.
 *
 * Iterates through all income sources in the scenario and adds up the monthly
 * amounts for any sources that are active during the given month.
 * An income source is considered active if:
 *  - Its start_month is less than or equal to the current month
 *  - Its stop_month is either undefined (i.e., never stops) or not yet reached
 *
 * @param {Array} incomeArray - List of income sources from the scenario
 * @param {number} currentMonth - The month to evaluate (e.g., 0 = month 1)
 * @returns {number} Total income for that month
 */
  export function getMonthlyIncome(incomeArray, currentMonth) {
    return incomeArray.reduce((total, source) => {
      const start = Number.isFinite(source.start_month) ? source.start_month : 0;
      const end =
        Number.isFinite(source.end_month) ? source.end_month :
        Number.isFinite(source.stop_month) ? source.stop_month :
        Number.POSITIVE_INFINITY; // recurring if no end/stop
  
      if (currentMonth >= start && currentMonth <= end) {
        const amt = typeof source.amount === "number" ? source.amount : 0;
        return total + amt;
      }
      return total;
    }, 0);
  }
