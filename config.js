import dotenv from 'dotenv';
dotenv.config();

export const config = {
  jupiter: process.env.JUPITER_API_URL,
  dexscreener: process.env.DEXSCREENER_API_URL,
  databaseUrl: process.env.DATABASE_URL
};


