import { connection } from '../core/rpc';
import { db } from '../core/db';
import { EngineWsServer } from '../ws-server';
import { ENV } from '../config';
// @ts-ignore
import fetch from 'node-fetch';
import { PublicKey } from '@solana/web3.js';
import { WhalePick } from '@solana-sentinel/shared';

export class SentinelService {
  private wsServer: EngineWsServer;
  private activeSubscriptions: Map<string, number> = new Map();

  constructor(wsServer: EngineWsServer) {
    this.wsServer = wsServer;
  }

  start() {
    console.log('[Sentinel] Starting whale monitoring...');
    this.syncSubscriptions();

    // Periodically sync tracked wallets from DB in case they changed
    setInterval(() => this.syncSubscriptions(), 10000);
  }

  private syncSubscriptions() {
    const activeWallets = db.trackedWallets.filter(w => w.status === 'ACTIVE').map(w => w.address);

    // Add new subscriptions
    for (const address of activeWallets) {
      if (!this.activeSubscriptions.has(address)) {
        console.log(`[Sentinel] Subscribing to logs for ${address}`);
        try {
          const subId = connection.onLogs(
            new PublicKey(address),
            async (logs, ctx) => {
              if (logs.err) return; // Ignore failed txs
              await this.analyzeTransaction(address, logs.signature);
            },
            'confirmed'
          );
          this.activeSubscriptions.set(address, subId);
        } catch (err) {
          console.error(`[Sentinel] Failed to subscribe to ${address}`, err);
        }
      }
    }

    // Remove old subscriptions
    for (const [address, subId] of Array.from(this.activeSubscriptions.entries())) {
      if (!activeWallets.includes(address)) {
        connection.removeOnLogsListener(subId);
        this.activeSubscriptions.delete(address);
        console.log(`[Sentinel] Unsubscribed from ${address}`);
      }
    }
  }

  private async analyzeTransaction(walletAddress: string, signature: string) {
    // Wait 5 seconds to give Helius time to parse the transaction into their enriched database
    await new Promise(resolve => setTimeout(resolve, 5000));

    let apiKey = '';
    try {
      const url = new URL(ENV.RPC_URL);
      apiKey = url.searchParams.get('api-key') || '';
    } catch (e) { }

    let parsedSuccessfully = false;

    if (apiKey) {
      try {
        const res = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: [signature] })
        });
        const data = await res.json();

        if (data && data.length > 0) {
          const tx = data[0];
          // Pump.fun swaps sometimes show up as UNKNOWN instead of SWAP depending on the API's parser update
          if ((tx.type === 'SWAP' || tx.type === 'UNKNOWN') && tx.events && tx.events.swap) {
            const swap = tx.events.swap;
            // Native SOL sold to buy a token (WHALE BUY)
            if (swap.nativeInput && swap.tokenOutputs && swap.tokenOutputs.length > 0) {
              const solSpent = parseInt(swap.nativeInput.amount) / 1e9;
              const tokenBought = swap.tokenOutputs[0];
              const tokenMint = tokenBought.mint;
              const tokenSymbol = tokenBought.tokenSymbol || tokenMint.slice(0, 4);

              this.addPickToRadar(walletAddress, tokenMint, tokenSymbol, solSpent);
              parsedSuccessfully = true;
            }
            
            // Token sold to buy native SOL (WHALE SELL/EXIT)
            if (swap.tokenInputs && swap.tokenInputs.length > 0 && swap.nativeOutput) {
              const tokenSold = swap.tokenInputs[0];
              const tokenMint = tokenSold.mint;
              const tokenSymbol = tokenSold.tokenSymbol || tokenMint.slice(0, 4);
              const solReceived = parseInt(swap.nativeOutput.amount) / 1e9;
              
              this.addPickToRadar(walletAddress, tokenMint, tokenSymbol, solReceived, 'SELL');
              this.handleWhaleExit(walletAddress, tokenMint, tokenSymbol);
              parsedSuccessfully = true;
            }
          }
        }
      } catch (err) {
        console.error('[Sentinel] Helius parse error:', err);
      }
    } 

    if (!parsedSuccessfully) {
      // Fallback: Just fetch the parsed transaction from standard RPC
      try {
        const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
        if (!tx) return;
        
        const postTokenBalances = tx.meta?.postTokenBalances || [];
        const preTokenBalances = tx.meta?.preTokenBalances || [];
        
        let solDiff = 0.5;
        // Calculate exact SOL difference for the whale wallet
        const accountIndex = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.toString() === walletAddress);
        if (accountIndex !== -1 && tx.meta?.preBalances && tx.meta?.postBalances) {
           const preBal = tx.meta.preBalances[accountIndex];
           const postBal = tx.meta.postBalances[accountIndex];
           solDiff = Math.abs(postBal - preBal) / 1e9;
        }
        
        if (postTokenBalances.length > 0) {
          // Find token accounts owned by the whale whose balance changed
          for (const post of postTokenBalances) {
             if (post.owner !== walletAddress) continue;
             const pre = preTokenBalances.find(p => p.accountIndex === post.accountIndex);
             const postAmt = post.uiTokenAmount.uiAmount || 0;
             const preAmt = pre?.uiTokenAmount.uiAmount || 0;
             
             if (postAmt > preAmt) {
               // Balance went UP (WHALE BUY)
               this.addPickToRadar(walletAddress, post.mint, post.mint.slice(0, 4), solDiff); 
             } else if (postAmt < preAmt) {
               // Balance went DOWN (WHALE SELL)
               this.addPickToRadar(walletAddress, post.mint, post.mint.slice(0, 4), solDiff, 'SELL');
               this.handleWhaleExit(walletAddress, post.mint, post.mint.slice(0, 4));
             }
          }
        }
      } catch (err) { }
    }
  }

  private addPickToRadar(walletAddress: string, tokenMint: string, tokenSymbol: string, amountSol: number, type: 'BUY' | 'SELL' = 'BUY') {
    if (amountSol < 0.1) return; // Ignore dust swaps

    const pick: WhalePick = {
      type,
      walletAddress,
      tokenMint,
      tokenSymbol,
      buyAmountSol: amountSol,
      buyTimestamp: Date.now(),
      expiresAt: Date.now() + 4 * 60 * 60 * 1000 // 4 hours
    };

    // Trigger radar event through EngineWsServer
    this.wsServer.addRadarPick(pick);
  }

  private handleWhaleExit(walletAddress: string, tokenMint: string, tokenSymbol: string) {
    if (this.wsServer.hasActivePosition(tokenMint)) {
      this.wsServer.broadcastLog({
        timestamp: Date.now(),
        type: 'WHALE-EXIT',
        message: `🚨 Whale ${walletAddress.slice(0,4)}... DUMPED ${tokenSymbol}!`
      });
    }
  }
}
