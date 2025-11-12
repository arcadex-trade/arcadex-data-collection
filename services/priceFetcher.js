import axios from 'axios';
import { config } from '../config.js';
import { savePriceData, savePriceTick } from './database/schema.js';
import PriceBuffer, { TIMEFRAMES } from './priceBuffer.js';
import { VolatilityTracker, VOLATILITY_TIMEFRAMES } from './volatilityCalc.js';

const TOKENS = {
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  POPCAT: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
  PNUT: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
  MOODENG: "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY",
  FARTCOIN: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
  TROLL: "5UUH9RTDiSpq6HKS6bp4NdU9PNJpXRXuiw6ShBTBhgH2"
};

class PriceFetcher {
  constructor() {
    this.priceData = {};
    this.lastJupiterFetch = 0;
    this.lastDexScreenerFetch = 0;
    // Initialize price buffers - one per token for tracking highs/lows/volatility
    this.priceBuffers = {};
    // Initialize volatility trackers - one per token per timeframe
    this.volatilityTrackers = {};
    Object.keys(TOKENS).forEach(symbol => {
      this.priceBuffers[symbol] = new PriceBuffer();
      this.volatilityTrackers[symbol] = {
        [VOLATILITY_TIMEFRAMES.FIVE_MINUTES]: new VolatilityTracker(VOLATILITY_TIMEFRAMES.FIVE_MINUTES),
        [VOLATILITY_TIMEFRAMES.ONE_HOUR]: new VolatilityTracker(VOLATILITY_TIMEFRAMES.ONE_HOUR),
        [VOLATILITY_TIMEFRAMES.SIX_HOURS]: new VolatilityTracker(VOLATILITY_TIMEFRAMES.SIX_HOURS),
        [VOLATILITY_TIMEFRAMES.TWENTY_FOUR_HOURS]: new VolatilityTracker(VOLATILITY_TIMEFRAMES.TWENTY_FOUR_HOURS),
        [VOLATILITY_TIMEFRAMES.SEVEN_DAYS]: new VolatilityTracker(VOLATILITY_TIMEFRAMES.SEVEN_DAYS)
      };
      console.log(`Initialized price buffer for ${symbol}`);
    });
  }

  async fetchJupiterPrices() {
    try {
      const mints = Object.values(TOKENS).join(',');
      const response = await axios.get(`${config.jupiter}?ids=${mints}`);
      
      console.log('Jupiter API response received');
      console.log('Response structure:', JSON.stringify(response.data, null, 2));
      
      const pricesMap = {};
      Object.entries(TOKENS).forEach(([symbol, mint]) => {
        // Jupiter v3 structure is response.data[mint], not response.data.data[mint]
        if (response.data[mint]) {
          pricesMap[symbol] = {
            price: response.data[mint].usdPrice,  // Changed from .price to .usdPrice
            timestamp: Date.now()
          };
          console.log(`${symbol}: $${response.data[mint].usdPrice}`);
        } else {
          console.log(`${symbol}: No price data from Jupiter`);
        }
      });

      this.lastJupiterFetch = Date.now();
      return pricesMap;
    } catch (error) {
      console.error('Error fetching Jupiter prices:', error.message);
      console.error('Full error:', error.response?.data || error);
      return {};
    }
  }

  async fetchDexScreenerData(symbol, mint) {
    try {
      const response = await axios.get(`${config.dexscreener}/${mint}`);
      
      if (response.data.pairs && response.data.pairs.length > 0) {
        const mainPair = response.data.pairs[0];
        return {
          price: parseFloat(mainPair.priceUsd) || null,
          volume_5m: mainPair.volume?.m5 || 0,
          volume_1h: mainPair.volume?.h1 || 0,
          volume_6h: mainPair.volume?.h6 || 0,
          volume_24h: mainPair.volume?.h24 || 0,
          change_5m: mainPair.priceChange?.m5 || 0,
          change_1h: mainPair.priceChange?.h1 || 0,
          change_6h: mainPair.priceChange?.h6 || 0,
          change_24h: mainPair.priceChange?.h24 || 0,
          liquidity_usd: mainPair.liquidity?.usd || 0,
          market_cap: mainPair.marketCap || 0
        };
      }

      return {
        price: null,
        volume_5m: 0,
        volume_1h: 0,
        volume_6h: 0,
        volume_24h: 0,
        change_5m: 0,
        change_1h: 0,
        change_6h: 0,
        change_24h: 0,
        liquidity_usd: 0,
        market_cap: 0
      };
    } catch (error) {
      console.error(`Error fetching DexScreener data for ${symbol}:`, error.message);
      return { price: null, change24h: 0, volume24h: 0 };
    }
  }

  async fetchAllDexScreenerData() {
    try {
      const dexData = {};
      
      for (const [symbol, mint] of Object.entries(TOKENS)) {
        const data = await this.fetchDexScreenerData(symbol, mint);
        dexData[symbol] = data;
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      this.lastDexScreenerFetch = Date.now();
      return dexData;
    } catch (error) {
      console.error('Error fetching DexScreener data:', error.message);
      return {};
    }
  }

  async fetchAllPrices() {
    const now = Date.now();
    
    if (now - this.lastDexScreenerFetch > 60000 || this.lastDexScreenerFetch === 0) {
      console.log('\nFetching from DexScreener...');
      const dexData = await this.fetchAllDexScreenerData();
      
      Object.entries(dexData).forEach(([symbol, data]) => {
        if (!this.priceData[symbol]) {
          this.priceData[symbol] = {};
        }
        if (data.price !== null) {
          this.priceData[symbol].price = data.price;
        }
        this.priceData[symbol].change24h = data.change_24h;
        this.priceData[symbol].volume24h = data.volume_24h;
        this.priceData[symbol].change_5m = data.change_5m;
        this.priceData[symbol].change_1h = data.change_1h;
        this.priceData[symbol].change_6h = data.change_6h;
        this.priceData[symbol].volume_5m = data.volume_5m;
        this.priceData[symbol].volume_1h = data.volume_1h;
        this.priceData[symbol].volume_6h = data.volume_6h;
        this.priceData[symbol].liquidity_usd = data.liquidity_usd;
        this.priceData[symbol].market_cap = data.market_cap;
        this.priceData[symbol].timestamp = Date.now();
      });
    }

    if (now - this.lastJupiterFetch > 10000 || this.lastJupiterFetch === 0) {
      console.log('\nFetching from Jupiter...');
      const jupiterPrices = await this.fetchJupiterPrices();
      
      Object.entries(jupiterPrices).forEach(([symbol, data]) => {
        if (!this.priceData[symbol]) {
          this.priceData[symbol] = {};
        }
        this.priceData[symbol].price = data.price;
        this.priceData[symbol].timestamp = data.timestamp;
      });
    }

    // Feed price data to buffers for time-series analysis
    const currentTimestamp = Date.now();
    Object.entries(this.priceData).forEach(async ([symbol, data]) => {
      if (data.price !== undefined && data.price !== null) {
        this.priceBuffers[symbol].addPrice(data.price, currentTimestamp);
        // Also save to price_history for backup/restore
        await savePriceTick(symbol, data.price, currentTimestamp);
        console.log(`Fed ${symbol} buffer: $${data.price.toFixed(4)} at ${new Date(currentTimestamp).toLocaleTimeString()}`);
      }
    });

    // Calculate high/low/range metrics from buffers for each token
    const bufferMetrics = {};

    Object.keys(TOKENS).forEach(symbol => {
      const buffer = this.priceBuffers[symbol];
      if (!buffer) {
        return;
      }

      // Get highs and lows for each timeframe
      const high_5m = buffer.getHigh(TIMEFRAMES.FIVE_MINUTES);
      const low_5m = buffer.getLow(TIMEFRAMES.FIVE_MINUTES);
      const high_1h = buffer.getHigh(TIMEFRAMES.ONE_HOUR);
      const low_1h = buffer.getLow(TIMEFRAMES.ONE_HOUR);
      const high_6h = buffer.getHigh(TIMEFRAMES.SIX_HOURS);
      const low_6h = buffer.getLow(TIMEFRAMES.SIX_HOURS);
      const high_24h = buffer.getHigh(TIMEFRAMES.TWENTY_FOUR_HOURS);
      const low_24h = buffer.getLow(TIMEFRAMES.TWENTY_FOUR_HOURS);
      const high_7d = buffer.getHigh(TIMEFRAMES.SEVEN_DAYS);
      const low_7d = buffer.getLow(TIMEFRAMES.SEVEN_DAYS);

      // Calculate ranges (high - low)
      const range_5m = (high_5m && low_5m) ? high_5m - low_5m : null;
      const range_1h = (high_1h && low_1h) ? high_1h - low_1h : null;
      const range_6h = (high_6h && low_6h) ? high_6h - low_6h : null;
      const range_24h = (high_24h && low_24h) ? high_24h - low_24h : null;
      const range_7d = (high_7d && low_7d) ? high_7d - low_7d : null;

      // Get 7-day price change
      const change_7d = typeof buffer.getChange7d === 'function' ? buffer.getChange7d() : null;

      // Calculate volatility for each timeframe
      const bufferSize = buffer.getPrices().length;
      console.log(`Buffer size for ${symbol}:`, bufferSize);

      // Get prices for volatility calculation
      const prices = buffer.getPrices();
      const currentPrice = this.priceData[symbol]?.price || prices[prices.length - 1]?.price;
      const previousPrice = prices.length > 1 ? prices[prices.length - 2]?.price : null;

      // Initialize trackers if needed and update with new price
      const trackers = this.volatilityTrackers[symbol];
      if (currentPrice && previousPrice) {
        Object.values(trackers).forEach(tracker => {
          if (!tracker.isInitialized() && prices.length >= 2) {
            tracker.initialize(prices);
          }
          tracker.addPrice(currentPrice, currentTimestamp, previousPrice);
        });
      }

      // Calculate volatility for each timeframe
      const volatility_5m = trackers[VOLATILITY_TIMEFRAMES.FIVE_MINUTES].getVolatility();
      const volatility_1h = trackers[VOLATILITY_TIMEFRAMES.ONE_HOUR].getVolatility();
      const volatility_6h = trackers[VOLATILITY_TIMEFRAMES.SIX_HOURS].getVolatility();
      const volatility_24h = trackers[VOLATILITY_TIMEFRAMES.TWENTY_FOUR_HOURS].getVolatility();
      const volatility_7d = trackers[VOLATILITY_TIMEFRAMES.SEVEN_DAYS].getVolatility();

      console.log(`Volatility for ${symbol}:`, {
        '5m': volatility_5m,
        '1h': volatility_1h,
        '6h': volatility_6h,
        '24h': volatility_24h,
        '7d': volatility_7d
      });

      // Store all metrics for this token
      bufferMetrics[symbol] = {
        high_5m, low_5m, range_5m,
        high_1h, low_1h, range_1h,
        high_6h, low_6h, range_6h,
        high_24h, low_24h, range_24h,
        high_7d, low_7d, range_7d,
        change_7d,
        volatility_5m,
        volatility_1h,
        volatility_6h,
        volatility_24h,
        volatility_7d
      };

      console.log(`Calculated metrics for ${symbol}: 24h high=$${high_24h?.toFixed(4)}, low=$${low_24h?.toFixed(4)}`);
    });

    const entries = Object.entries(this.priceData);
    for (const [symbol, data] of entries) {
      const { price, volume24h, change24h } = data || {};
      const metrics = bufferMetrics[symbol] || {};
      const hasAllData =
        price !== undefined && price !== null &&
        volume24h !== undefined && volume24h !== null &&
        change24h !== undefined && change24h !== null;

      if (hasAllData) {
        try {
          await savePriceData(
            symbol,
            data.price,
            data.volume24h,
            data.change24h,
            data.volume_5m,
            data.volume_1h,
            data.volume_6h,
            data.change_5m,
            data.change_1h,
            data.change_6h,
            data.liquidity_usd,
            data.market_cap,
            metrics.high_5m,
            metrics.low_5m,
            metrics.range_5m,
            metrics.high_1h,
            metrics.low_1h,
            metrics.range_1h,
            metrics.high_6h,
            metrics.low_6h,
            metrics.range_6h,
            metrics.high_24h,
            metrics.low_24h,
            metrics.range_24h,
            metrics.high_7d,
            metrics.low_7d,
            metrics.range_7d,
            metrics.change_7d
          );
          console.log(`Saved ${symbol} to database with buffer metrics`);
        } catch (error) {
          console.log(`Error saving ${symbol} to database:`, error.message || error);
        }
      }
    }

    return this.priceData;
  }

  getPriceData() {
    return this.priceData;
  }

  startAutoFetch() {
    setInterval(async () => {
      await this.fetchAllPrices();
    }, 5000); // Changed from 10000 to 5000 - now fetches every 5 seconds

    this.fetchAllPrices();
  }
}

export default PriceFetcher;


