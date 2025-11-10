export const TIMEFRAMES = {
  FIVE_MINUTES: 300000,        // 5 minutes
  ONE_HOUR: 3600000,           // 1 hour
  SIX_HOURS: 21600000,         // 6 hours
  TWENTY_FOUR_HOURS: 86400000, // 24 hours
  SEVEN_DAYS: 604800000        // 7 days
};

class PriceBuffer {
  constructor(retentionMs = 7 * 24 * 60 * 60 * 1000) {
    // Master list of every price tick we receive (trimmed by retention window)
    this.prices = [];
    // Global retention horizon (defaults to 7 days of data)
    this.retentionMs = retentionMs;

    // Different timeframes get their own bucket configuration.
    // Shorter timeframes use smaller buckets (better precision), while longer
    // timeframes use wider buckets (better performance). This keeps per-bucket
    // work O(1) while ensuring we never need to rescan the entire history.
    this.timeframes = {
      '5m': {
        duration: 300000,           // 5 minutes
        bucketDuration: 5000,       // 5-second buckets match our fetch cadence
        buckets: new Map()
      },
      '1h': {
        duration: 3600000,          // 1 hour worth of history
        bucketDuration: 60000,      // 1-minute buckets for higher fidelity
        buckets: new Map()          // Map<bucketStartMs, bucketSummary>
      },
      '6h': {
        duration: 21600000,         // 6 hours
        bucketDuration: 300000,     // 5-minute buckets strike a balance
        buckets: new Map()
      },
      '24h': {
        duration: 86400000,         // 24 hours
        bucketDuration: 600000,     // 10-minute buckets reduce bucket count
        buckets: new Map()
      },
      '7d': {
        duration: 604800000,        // 7 days
        bucketDuration: 3600000,    // 1-hour buckets keep map size manageable
        buckets: new Map()
      }
    };
  }

  getBucketKey(timestamp, bucketDuration) {
    // Align the timestamp to the start of its bucket. This ensures every data
    // point falling within the same time window hashes to the same key.
    return Math.floor(timestamp / bucketDuration) * bucketDuration;
  }

  addPrice(price, timestamp) {
    // Store the raw tick for downstream consumers that need full fidelity.
    this.prices.push({ price, timestamp });

    // Feed each timeframe-specific bucket map.
    Object.values(this.timeframes).forEach((timeframe) => {
      const bucketKey = this.getBucketKey(timestamp, timeframe.bucketDuration);

      // Lazily create the bucket structure when the first price lands in it.
      if (!timeframe.buckets.has(bucketKey)) {
        timeframe.buckets.set(bucketKey, {
          prices: [],     // Raw prices for potential future analysis
          max: -Infinity, // Track max/min incrementally for O(1) updates
          min: Infinity
        });
      }

      const bucket = timeframe.buckets.get(bucketKey);
      bucket.prices.push(price);

      // Incremental max/min keeps bucket updates O(1).
      if (price > bucket.max) bucket.max = price;
      if (price < bucket.min) bucket.min = price;

      // Remove buckets that fall completely outside the timeframe window.
      // Because we drop whole buckets (not individual points), there's no need
      // to recompute max/min — expired data simply disappears.
      const cutoff = timestamp - timeframe.duration;
      for (const [key] of timeframe.buckets) {
        if (key < cutoff) {
          timeframe.buckets.delete(key);
        }
      }
    });

    // Trim the master list to the global retention horizon. This maintains
    // chronological order and bounded memory usage.
    const masterCutoff = timestamp - this.retentionMs;
    while (this.prices.length && this.prices[0].timestamp < masterCutoff) {
      this.prices.shift();
    }
  }

  getHigh(timeframeMs) {
    // Select the timeframe configuration that best matches the requested window.
    const timeframe = this.getTimeframeConfig(timeframeMs);
    if (!timeframe) return null;

    // Scan the bucket summaries (Map values) — the number of buckets per
    // timeframe is constant, so this is effectively O(1).
    let globalMax = -Infinity;
    for (const bucket of timeframe.buckets.values()) {
      if (bucket.max > globalMax) {
        globalMax = bucket.max;
      }
    }

    return globalMax === -Infinity ? null : globalMax;
  }

  getLow(timeframeMs) {
    const timeframe = this.getTimeframeConfig(timeframeMs);
    if (!timeframe) return null;

    let globalMin = Infinity;
    for (const bucket of timeframe.buckets.values()) {
      if (bucket.min < globalMin) {
        globalMin = bucket.min;
      }
    }

    return globalMin === Infinity ? null : globalMin;
  }

  getTimeframeConfig(timeframeMs) {
    // Map the requested duration to one of the configured timeframes. In this
    // initial version we require an exact match; future iterations could choose
    // the closest window if desired.
    const timeframeKey = Object.keys(this.timeframes).find((key) => {
      return this.timeframes[key].duration === timeframeMs;
    });

    return timeframeKey ? this.timeframes[timeframeKey] : null;
  }

  getPrices() {
    return this.prices;
  }
}

export default PriceBuffer;


