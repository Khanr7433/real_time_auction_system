import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') });

const config = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auction_system',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_bidnow_jwt_key_2026',
  jwtExpiry: process.env.JWT_EXPIRY || '1h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};

// Check required configuration keys
const requiredKeys = ['port', 'mongodbUri', 'jwtSecret', 'jwtExpiry'];
for (const key of requiredKeys) {
  if (!config[key]) {
    throw new Error(`Missing required configuration key: ${key}`);
  }
}

export default config;
