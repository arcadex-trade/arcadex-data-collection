import pkg from 'pg';
const { Pool } = pkg;
import { config } from '../../config.js';

const pool = new Pool({
  connectionString: config.databaseUrl
});

export default pool;


