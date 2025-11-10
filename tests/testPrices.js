import PriceFetcher from '../services/priceFetcher.js';

async function test() {
  console.log('Starting price fetcher test...\n');
  
  const fetcher = new PriceFetcher();
  
  console.log('Fetching initial prices...');
  const prices = await fetcher.fetchAllPrices();
  
  console.log('\n=== CURRENT PRICES ===\n');
  Object.entries(prices).forEach(([symbol, data]) => {
    console.log(`${symbol}:`);
    console.log(`  Price: $${data.price?.toFixed(4) || 'N/A'}`);
    console.log(`  24h: ${data.change24h?.toFixed(2) || '0'}% | Vol: $${data.volume24h?.toLocaleString() || 'N/A'}`);
    console.log(`  6h:  ${data.change_6h?.toFixed(2) || '0'}% | Vol: $${data.volume_6h?.toLocaleString() || 'N/A'}`);
    console.log(`  1h:  ${data.change_1h?.toFixed(2) || '0'}% | Vol: $${data.volume_1h?.toLocaleString() || 'N/A'}`);
    console.log(`  5m:  ${data.change_5m?.toFixed(2) || '0'}% | Vol: $${data.volume_5m?.toLocaleString() || 'N/A'}`);
    console.log(`  Liquidity: $${data.liquidity_usd?.toLocaleString() || 'N/A'}`);
    console.log(`  Market Cap: $${data.market_cap?.toLocaleString() || 'N/A'}`);
    console.log(`  Timestamp: ${new Date(data.timestamp).toLocaleTimeString()}\n`);
  });

  console.log('Waiting 15 seconds to test auto-refresh...\n');
  
  setTimeout(async () => {
    console.log('Fetching updated prices...');
    const updatedPrices = await fetcher.fetchAllPrices();
    
    console.log('\n=== UPDATED PRICES ===\n');
    Object.entries(updatedPrices).forEach(([symbol, data]) => {
      console.log(`${symbol}:`);
      console.log(`  Price: $${data.price?.toFixed(4) || 'N/A'}`);
      console.log(`  24h: ${data.change24h?.toFixed(2) || '0'}% | Vol: $${data.volume24h?.toLocaleString() || 'N/A'}`);
      console.log(`  6h:  ${data.change_6h?.toFixed(2) || '0'}% | Vol: $${data.volume_6h?.toLocaleString() || 'N/A'}`);
      console.log(`  1h:  ${data.change_1h?.toFixed(2) || '0'}% | Vol: $${data.volume_1h?.toLocaleString() || 'N/A'}`);
      console.log(`  5m:  ${data.change_5m?.toFixed(2) || '0'}% | Vol: $${data.volume_5m?.toLocaleString() || 'N/A'}`);
      console.log(`  Liquidity: $${data.liquidity_usd?.toLocaleString() || 'N/A'}`);
      console.log(`  Market Cap: $${data.market_cap?.toLocaleString() || 'N/A'}`);
      console.log(`  Timestamp: ${new Date(data.timestamp).toLocaleTimeString()}\n`);
    });
    
    console.log('Test complete!');
    process.exit(0);
  }, 15000);
}

test().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});


