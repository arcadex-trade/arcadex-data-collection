import PriceFetcher from './services/priceFetcher.js';
import { initializeSchema } from './services/database/schema.js';

console.log('ArcadeX Data Collection Service');
console.log('Starting initialization...\n');

async function startDataCollection() {
  try {
    console.log('Initializing database schema...');
    await initializeSchema();
    console.log('Database schema initialized successfully.\n');

    console.log('Starting price fetcher...');
    const fetcher = new PriceFetcher();
    fetcher.startAutoFetch();
    
    console.log('Data collection service is now running.');
    console.log('Fetching prices every 5 seconds and writing to database.');
    console.log('Press Ctrl+C to stop.\n');
  } catch (error) {
    console.error('Failed to start data collection service:', error);
    process.exit(1);
  }
}

startDataCollection();

process.on('SIGINT', () => {
  console.log('\nShutting down data collection service...');
  console.log('Service stopped.');
  process.exit(0);
});


