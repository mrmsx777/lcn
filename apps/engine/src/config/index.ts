import { config } from 'dotenv';
import path from 'path';

// Adjust path depending on execution context to find the root .env
config({ path: path.resolve(process.cwd(), '../../.env') });
config(); // Fallback to local .env if it exists

export const ENV = {
  RPC_URL: process.env.SOLANA_RPC_HTTP || 'https://api.mainnet-beta.solana.com',
  WS_URL: process.env.SOLANA_RPC_WSS || 'wss://api.mainnet-beta.solana.com',
  JITO_BLOCK_ENGINE_URL: process.env.JITO_BLOCK_ENGINE_URL || 'https://mainnet.block-engine.jito.wtf',
  PORT: parseInt(process.env.ENGINE_WS_PORT || '8080', 10),
  HOST: process.env.ENGINE_HOST || '127.0.0.1',
  WS_SECRET_TOKEN: process.env.VITE_WS_SECRET_TOKEN,
  KEYSTORE_PASSPHRASE: process.env.KEYSTORE_PASSPHRASE
};
