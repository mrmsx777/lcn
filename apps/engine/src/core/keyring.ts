import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { decryptKey } from '../utils/keystore';
import { ENV } from '../config';

export class Keyring {
  private activeKeypair: Keypair;

  constructor() {
    try {
      const keystorePath = path.resolve(process.cwd(), 'keystore.json');
      const encrypted = fs.readFileSync(keystorePath, 'utf-8');
      
      if (!ENV.KEYSTORE_PASSPHRASE) {
        throw new Error('KEYSTORE_PASSPHRASE is not set in environment.');
      }
      
      const secretKey = decryptKey(encrypted, ENV.KEYSTORE_PASSPHRASE);
      this.activeKeypair = Keypair.fromSecretKey(secretKey);
      console.log(`[Keyring] Successfully loaded wallet: ${this.activeKeypair.publicKey.toBase58()}`);
    } catch (err: any) {
      console.error(`[Keyring] Failed to load keystore: ${err.message}`);
      console.warn('[Keyring] Falling back to a random ephemeral keypair for safety.');
      this.activeKeypair = Keypair.generate();
    }
  }

  getPublicKey() {
    return this.activeKeypair.publicKey;
  }
  
  getKeypair() {
    return this.activeKeypair;
  }

  signVersionedTransaction(tx: any) {
    tx.sign([this.activeKeypair]);
    return tx;
  }
}
