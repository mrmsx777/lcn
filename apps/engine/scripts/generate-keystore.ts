import fs from 'fs';
import path from 'path';
import { Keypair } from '@solana/web3.js';
import { encryptKey } from '../src/utils/keystore';
import { ENV } from '../src/config/index';

const KEYSTORE_PATH = path.resolve(process.cwd(), 'keystore.json');

async function main() {
  if (!ENV.KEYSTORE_PASSPHRASE) {
    console.error("❌ KEYSTORE_PASSPHRASE is not set in your .env file!");
    process.exit(1);
  }

  // Generate a brand new random Keypair for the bot
  const keypair = Keypair.generate();
  console.log(`Generated new Solana Wallet for the bot:`);
  console.log(`Public Key: ${keypair.publicKey.toBase58()}`);
  
  console.log(`\nEncrypting private key with AES-256-GCM...`);
  // Note: keypair.secretKey is already a Uint8Array
  const encrypted = encryptKey(keypair.secretKey, ENV.KEYSTORE_PASSPHRASE);
  
  fs.writeFileSync(KEYSTORE_PATH, encrypted);
  console.log(`✅ Successfully saved encrypted keystore to ${KEYSTORE_PATH}`);
  console.log(`\nYour bot is now ready to safely load this keystore on startup!`);
}

main().catch(console.error);
