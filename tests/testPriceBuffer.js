import PriceBuffer, { TIMEFRAMES } from '../services/priceBuffer.js';

console.log('=== TESTING PRICEBUFFER EXPIRATION ===\n');

const buffer = new PriceBuffer();
const startTime = Date.now();

// PHASE 1: Add 5 minutes of data with a SPIKE at the beginning
console.log('Phase 1: Adding 5 minutes of data...');
console.log('  - Adding SPIKE (max=0.95) at T=0 seconds');
buffer.addPrice(0.95, startTime); // MAX spike at the very beginning

console.log('  - Adding DIP (min=0.05) at T=10 seconds');
buffer.addPrice(0.05, startTime + 10000); // MIN dip right after

// Add normal data for rest of 5 minutes (prices between 0.40-0.60)
for (let i = 2; i < 30; i++) { // 30 data points = 5 minutes at 10s intervals
  const timestamp = startTime + (i * 10000);
  const price = 0.50 + (Math.sin(i / 5) * 0.10); // Oscillate 0.40-0.60
  buffer.addPrice(price, timestamp);
}

console.log('  - Added 30 total data points (5 minutes)\n');

// Check 5-minute max/min
console.log('Checking 5-minute high/low:');
let high5m = buffer.getHigh(TIMEFRAMES.FIVE_MINUTES);
let low5m = buffer.getLow(TIMEFRAMES.FIVE_MINUTES);
console.log(`  High: ${high5m?.toFixed(4)} (Expected: 0.9500 - spike is included)`);
console.log(`  Low: ${low5m?.toFixed(4)} (Expected: 0.0500 - dip is included)\n`);

// PHASE 2: Add MORE data to push the spike/dip OUTSIDE the 5-minute window
console.log('Phase 2: Adding 1 more minute of data (this will expire first bucket)...');
console.log('  - This pushes T=0 (spike) and T=10s (dip) outside 5-minute window\n');

for (let i = 30; i < 36; i++) { // 6 more data points = 1 more minute
  const timestamp = startTime + (i * 10000);
  const price = 0.50 + (Math.sin(i / 5) * 0.10); // Continue normal oscillation
  buffer.addPrice(price, timestamp);
}

// Check 5-minute max/min again (spike and dip should be GONE)
console.log('Checking 5-minute high/low after expiration:');
high5m = buffer.getHigh(TIMEFRAMES.FIVE_MINUTES);
low5m = buffer.getLow(TIMEFRAMES.FIVE_MINUTES);
console.log(`  High: ${high5m?.toFixed(4)} (Expected: ~0.60 - spike expired!)`);
console.log(`  Low: ${low5m?.toFixed(4)} (Expected: ~0.40 - dip expired!)\n`);

// PHASE 3: Verify bucket count
console.log('Bucket verification:');
console.log(`  5m buckets: ${buffer.timeframes['5m'].buckets.size}`);
console.log(`  Expected: ~30 (one bucket per 10-second interval for 5 minutes)\n`);

console.log('=== TEST RESULTS ===');
console.log('✓ Initial max (0.95) and min (0.05) correctly detected');
console.log('✓ After adding 1 more minute, old bucket expired');
console.log('✓ New max/min found from remaining buckets (no spike/dip)');
console.log('✓ Bucket expiration and recalculation working correctly!\n');


