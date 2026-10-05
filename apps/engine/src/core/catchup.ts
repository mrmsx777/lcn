import { connection } from './rpc';
import { db } from './db';
import { Keyring } from './keyring';
import { HistoryEntry } from '@solana-sentinel/shared';

export async function runCatchup(keyring: Keyring) {
  const lastShutdown = db.lastShutdown;
  const now = Date.now();
  const timeDiff = now - lastShutdown;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  console.log(`[Catchup] Last shutdown was ${new Date(lastShutdown).toLocaleString()}`);
  
  if (timeDiff > ONE_DAY) {
    console.log(`[Catchup] Engine was off for > 24H. Capping catch-up to the last 24H strictly.`);
  }

  // Determine how far back to look, max 24 hours
  const lookbackMs = Math.min(timeDiff, ONE_DAY);
  const lookbackThreshold = now - lookbackMs;

  console.log(`[Catchup] Querying RPC for missed transactions since ${new Date(lookbackThreshold).toLocaleString()}...`);
  
  try {
    const pubKey = keyring.getPublicKey();
    const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 100 });
    
    let recoveredCount = 0;

    for (const sigInfo of signatures) {
      const txTime = (sigInfo.blockTime || 0) * 1000;
      
      // Stop processing if we've reached transactions before our threshold or before last shutdown
      if (txTime < lookbackThreshold || txTime < lastShutdown) {
        break; 
      }
      
      // We found a transaction that happened while we were offline within the 24H window!
      const exists = db.histories.find(h => h.txSignature === sigInfo.signature);
      if (!exists) {
        // Mock parsed entry - integrating actual tx parsers goes here in Phase 3
        const recoveredEntry: HistoryEntry = {
          id: sigInfo.signature,
          timestamp: txTime,
          type: 'BUY',
          tokenMint: 'RECOVERED',
          tokenSymbol: 'RECOVERED_TX',
          amountSol: 0,
          priceUsd: 0,
          txSignature: sigInfo.signature
        };
        db.addHistory(recoveredEntry);
        recoveredCount++;
      }
    }
    
    if (recoveredCount > 0) {
      console.log(`[Catchup] ✅ Recovered ${recoveredCount} missed trades from the blockchain!`);
    } else {
      console.log(`[Catchup] No missed trades found during offline period.`);
    }

  } catch (err) {
    console.error(`[Catchup] Error during RPC catch-up:`, err);
  }
}
