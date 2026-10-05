import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export interface KeystoreData {
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

/**
 * Encrypts a raw Solana private key into a Keystore format.
 */
export function encryptKey(privateKey: Uint8Array, passphrase: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(12);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const bufferToEncrypt = Buffer.from(privateKey);
  
  let ciphertext = cipher.update(bufferToEncrypt);
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  const keystore: KeystoreData = {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex')
  };
  
  return JSON.stringify(keystore, null, 2);
}

/**
 * Decrypts a Keystore format back into a raw Solana private key.
 */
export function decryptKey(keystoreJson: string, passphrase: string): Uint8Array {
  const keystore: KeystoreData = JSON.parse(keystoreJson);
  
  const salt = Buffer.from(keystore.salt, 'hex');
  const iv = Buffer.from(keystore.iv, 'hex');
  const authTag = Buffer.from(keystore.authTag, 'hex');
  const ciphertext = Buffer.from(keystore.ciphertext, 'hex');
  
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return new Uint8Array(decrypted);
}
