import pool from '../services/database/connection.js';

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully!');
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
};

testConnection();


