import { initializeSchema } from './schema.js';

async function run() {
  console.log('Testing schema initialization...');
  await initializeSchema();
  console.log('Test complete');
  process.exit(0);
}

run().catch(error => {
  console.log('Test failed:', error);
  process.exit(1);
});


