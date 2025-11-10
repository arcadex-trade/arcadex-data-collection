# ArcadeX Data Collection Service

Real-time cryptocurrency price data collection and statistical analysis service for the ArcadeX options trading platform.

## Overview

This service continuously fetches price data from blockchain sources, performs statistical calculations including volatility analysis, and stores processed data in a PostgreSQL database for use by the main trading platform.

## Features

- Real-time price fetching from Jupiter and DexScreener APIs (every 5 seconds)
- Rolling time-series data buffers for multiple timeframes (5m, 1h, 6h, 24h, 7d)
- High/low/range calculations for all timeframes
- Annualized volatility calculations using rolling statistics (O(1) incremental updates)
- Automatic database schema initialization and management
- Price history backup for disaster recovery

## Data Collected

For each token (WIF, BONK, POPCAT, PNUT, MOODENG, FARTCOIN, TROLL):

- Current price (USD)
- Volume (5m, 1h, 6h, 24h)
- Price changes (5m, 1h, 6h, 24h, 7d)
- High/low/range (5m, 1h, 6h, 24h, 7d)
- Annualized volatility (5m, 1h, 6h, 24h, 7d)
- Market cap and liquidity

## Requirements

- Node.js 18+
- PostgreSQL database
- Environment variables (see .env.example)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. Start the service:
   ```bash
   npm start
   ```

## Database

The service writes to a `price_data` table with the following structure:

- Token identifier
- Price and volume metrics
- High/low/range for multiple timeframes
- Volatility calculations
- Timestamp

The service also maintains a `price_history` table for backup and recovery.

## Architecture

- **Price Fetcher**: Coordinates API calls and data flow
- **Price Buffer**: Maintains time-series data in memory with efficient bucket structure
- **Volatility Calculator**: Computes annualized volatility using rolling statistics
- **Database Layer**: Handles schema initialization and data persistence

## Monitoring

The service logs all fetch operations and database writes. Monitor logs for:

- Successful price fetches
- Database write confirmations
- Any API errors or connection issues

## Production Deployment

This service is designed to run 24/7 with minimal restarts. Deploy on a dedicated server or container for maximum uptime.


