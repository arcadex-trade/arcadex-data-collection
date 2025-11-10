import pool from './connection.js';

async function initializeSchema() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS price_data (
      id SERIAL PRIMARY KEY,
      token VARCHAR(10) NOT NULL UNIQUE,
      price DECIMAL(20, 10) NOT NULL,
      volume_24h DECIMAL(20, 2),
      change_24h DECIMAL(10, 2),
      timestamp TIMESTAMP DEFAULT NOW()
    );`);
    await pool.query(`
      ALTER TABLE price_data 
      ADD COLUMN IF NOT EXISTS volume_5m DECIMAL(20, 2),
      ADD COLUMN IF NOT EXISTS volume_1h DECIMAL(20, 2),
      ADD COLUMN IF NOT EXISTS volume_6h DECIMAL(20, 2),
      ADD COLUMN IF NOT EXISTS change_5m DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS change_1h DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS change_6h DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS liquidity_usd DECIMAL(20, 2),
      ADD COLUMN IF NOT EXISTS market_cap DECIMAL(20, 2);
    `);
    await pool.query(`
      ALTER TABLE price_data
      ADD COLUMN IF NOT EXISTS high_5m DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS low_5m DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS range_5m DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS high_1h DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS low_1h DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS range_1h DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS high_6h DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS low_6h DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS range_6h DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS high_24h DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS low_24h DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS range_24h DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS high_7d DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS low_7d DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS range_7d DECIMAL(20, 10);
    `);
    await pool.query(`
      ALTER TABLE price_data
      ADD COLUMN IF NOT EXISTS change_7d DECIMAL(10, 2);
    `);
    await pool.query(`
      ALTER TABLE price_data
      ADD COLUMN IF NOT EXISTS volatility_5m DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS volatility_1h DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS volatility_6h DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS volatility_24h DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS volatility_7d DECIMAL(10, 2);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        token VARCHAR(10) NOT NULL,
        price DECIMAL(20, 10) NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_token_timestamp 
      ON price_history (token, timestamp);
    `);
    console.log('Schema initialized, all columns including volatility added successfully');
  } catch (error) {
    console.log('Error initializing schema:', error);
  }
}

async function savePriceData(
  token,
  price,
  volume_24h,
  change_24h,
  volume_5m,
  volume_1h,
  volume_6h,
  change_5m,
  change_1h,
  change_6h,
  liquidity_usd,
  market_cap,
  high_5m,
  low_5m,
  range_5m,
  high_1h,
  low_1h,
  range_1h,
  high_6h,
  low_6h,
  range_6h,
  high_24h,
  low_24h,
  range_24h,
  high_7d,
  low_7d,
  range_7d,
  change_7d
) {
  try {
    const result = await pool.query(
      `INSERT INTO price_data (
        token, price, volume_24h, change_24h, 
        volume_5m, volume_1h, volume_6h,
        change_5m, change_1h, change_6h,
        liquidity_usd, market_cap,
        high_5m, low_5m, range_5m,
        high_1h, low_1h, range_1h,
        high_6h, low_6h, range_6h,
        high_24h, low_24h, range_24h,
        high_7d, low_7d, range_7d,
        change_7d,
        timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW())
      ON CONFLICT (token)
      DO UPDATE SET
        price = EXCLUDED.price,
        volume_24h = EXCLUDED.volume_24h,
        change_24h = EXCLUDED.change_24h,
        volume_5m = EXCLUDED.volume_5m,
        volume_1h = EXCLUDED.volume_1h,
        volume_6h = EXCLUDED.volume_6h,
        change_5m = EXCLUDED.change_5m,
        change_1h = EXCLUDED.change_1h,
        change_6h = EXCLUDED.change_6h,
        liquidity_usd = EXCLUDED.liquidity_usd,
        market_cap = EXCLUDED.market_cap,
        high_5m = EXCLUDED.high_5m,
        low_5m = EXCLUDED.low_5m,
        range_5m = EXCLUDED.range_5m,
        high_1h = EXCLUDED.high_1h,
        low_1h = EXCLUDED.low_1h,
        range_1h = EXCLUDED.range_1h,
        high_6h = EXCLUDED.high_6h,
        low_6h = EXCLUDED.low_6h,
        range_6h = EXCLUDED.range_6h,
        high_24h = EXCLUDED.high_24h,
        low_24h = EXCLUDED.low_24h,
        range_24h = EXCLUDED.range_24h,
        high_7d = EXCLUDED.high_7d,
        low_7d = EXCLUDED.low_7d,
        range_7d = EXCLUDED.range_7d,
        change_7d = EXCLUDED.change_7d,
        timestamp = EXCLUDED.timestamp
      RETURNING *;`,
      [
        token, price, volume_24h, change_24h,
        volume_5m, volume_1h, volume_6h,
        change_5m, change_1h, change_6h,
        liquidity_usd, market_cap,
        high_5m, low_5m, range_5m,
        high_1h, low_1h, range_1h,
        high_6h, low_6h, range_6h,
        high_24h, low_24h, range_24h,
        high_7d, low_7d, range_7d,
        change_7d
      ]
    );
    console.log('Price data saved successfully');
    return result.rows[0];
  } catch (error) {
    console.log('Error saving price data:', error);
    throw error;
  }
}

async function savePriceTick(token, price, timestamp) {
  try {
    await pool.query(
      `INSERT INTO price_history (token, price, timestamp)
       VALUES ($1, $2, to_timestamp($3 / 1000.0))`,
      [token, price, timestamp]
    );
  } catch (error) {
    console.error(`Error saving price tick to history for ${token}:`, error);
    throw error;
  }
}

export { initializeSchema, savePriceData, savePriceTick };


