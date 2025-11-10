/**
 * Rolling Volatility Calculator
 *
 * Uses incremental statistics to calculate volatility in O(1) time rather than
 * O(n) recalculation. Tracks sum of returns and sum of squared returns, updating
 * them as prices are added/removed from the window.
 *
 * This is critical for performance since volatility is calculated every 5 seconds
 * for 5 timeframes × 7 tokens = 35 calculations per cycle.
 */

// Timeframe durations in milliseconds
const VOLATILITY_TIMEFRAMES = {
  FIVE_MINUTES: 300000,
  ONE_HOUR: 3600000,
  SIX_HOURS: 21600000,
  TWENTY_FOUR_HOURS: 86400000,
  SEVEN_DAYS: 604800000
};

/**
 * Rolling Volatility Tracker
 * Maintains running statistics for a specific timeframe
 */
class VolatilityTracker {
  constructor(timeframeMs) {
    this.timeframeMs = timeframeMs;
    this.returns = [];          // Store returns with timestamps for expiration
    this.sumReturns = 0;        // Σr - sum of all returns
    this.sumSquaredReturns = 0; // Σr² - sum of squared returns
    this.initialized = false;   // Tracks whether initial population has occurred
  }

  /**
   * Initialize tracker with existing price data from buffer
   * This runs ONCE on first calculation to populate the tracker with historical data
   * @param {Array} prices - Array of {price, timestamp} objects from buffer
   */
  initialize(prices) {
    if (this.initialized || !prices || prices.length < 2) return;

    const now = Date.now();
    const cutoff = now - this.timeframeMs;

    // Filter to relevant timeframe
    const relevantPrices = prices.filter(p => p.timestamp >= cutoff);

    if (relevantPrices.length < 2) return;

    // Calculate all returns and populate tracker
    for (let i = 1; i < relevantPrices.length; i++) {
      const logReturn = Math.log(relevantPrices[i].price / relevantPrices[i - 1].price);

      this.returns.push({
        return: logReturn,
        timestamp: relevantPrices[i].timestamp
      });

      this.sumReturns += logReturn;
      this.sumSquaredReturns += logReturn * logReturn;
    }

    this.initialized = true;
  }

  /**
   * Add a new price point and update statistics
   * @param {number} price - New price
   * @param {number} timestamp - Timestamp in milliseconds
   * @param {number} previousPrice - Previous price for calculating return
   */
  addPrice(price, timestamp, previousPrice) {
    if (!previousPrice || previousPrice <= 0) return;

    // Calculate log return
    const logReturn = Math.log(price / previousPrice);

    // Add to our tracked returns
    this.returns.push({ return: logReturn, timestamp });

    // Update running sums (O(1) operation)
    this.sumReturns += logReturn;
    this.sumSquaredReturns += logReturn * logReturn;

    // Remove expired returns
    this.removeExpiredReturns(timestamp);
  }

  /**
   * Remove returns that fall outside the timeframe window
   * @param {number} currentTimestamp - Current time in milliseconds
   */
  removeExpiredReturns(currentTimestamp) {
    const cutoff = currentTimestamp - this.timeframeMs;

    // Remove old returns and update sums
    while (this.returns.length > 0 && this.returns[0].timestamp < cutoff) {
      const expired = this.returns.shift();
      this.sumReturns -= expired.return;
      this.sumSquaredReturns -= expired.return * expired.return;
    }
  }

  /**
   * Calculate current annualized volatility
   * @returns {number|null} - Volatility as percentage, or null if insufficient data
   */
  getVolatility() {
    const n = this.returns.length;

    // Need at least 2 returns
    if (n < 2) return null;

    // Calculate mean: μ = Σr / n
    const mean = this.sumReturns / n;

    // Calculate variance: σ² = (Σr² / n) - μ²
    const variance = (this.sumSquaredReturns / n) - (mean * mean);

    // Variance can't be negative (but might be due to floating point errors)
    if (variance < 0) return null;

    // Standard deviation: σ = √σ²
    const stdDev = Math.sqrt(variance);

    // Annualize: multiply by √(periods per year)
    const msPerYear = 365 * 24 * 60 * 60 * 1000;
    const periodsPerYear = msPerYear / this.timeframeMs;
    const annualizedVol = stdDev * Math.sqrt(periodsPerYear);

    // Return as percentage
    return annualizedVol * 100;
  }

  /**
   * Get the number of data points in the current window
   * @returns {number}
   */
  getDataPointCount() {
    return this.returns.length;
  }

  /**
   * Check if tracker has been initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
}

/**
 * Helper function to validate if volatility is within reasonable bounds
 * @param {number} volatility - Calculated volatility percentage
 * @returns {boolean} - True if volatility seems reasonable
 */
function isValidVolatility(volatility) {
  return volatility !== null && volatility > 0 && volatility < 2000;
}

export { VolatilityTracker, isValidVolatility, VOLATILITY_TIMEFRAMES };


