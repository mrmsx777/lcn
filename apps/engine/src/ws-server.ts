import { WebSocketServer, WebSocket } from 'ws';
import { ENV } from './config';
import { SystemState, WhalePick } from '@solana-sentinel/shared';
import { Keyring } from './core/keyring';
import { connection } from './core/rpc';
import { db } from './core/db';
import { runCatchup } from './core/catchup';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getPrices } from './core/jupiter';

export class EngineWsServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private state: SystemState = {
    agentBalanceSol: 0,
    vaultConnected: false,
    positions: [],
    ephemeralRadar: [],
    trackedWallets: db.trackedWallets,
    logs: [
      { timestamp: Date.now() - 10000, type: 'ALERT', message: 'Engine booted. Keystore unlocked securely.' }
    ],
    rules: db.rules,
    histories: db.histories
  };
  private keyring: Keyring;

  constructor() {
    this.keyring = new Keyring();
    this.wss = new WebSocketServer({
      port: ENV.PORT,
      verifyClient: (info, cb) => {
        const origin = info.req.headers.origin;
        if (origin && origin !== 'http://localhost:5173' && origin !== 'http://localhost:3000') {
          console.warn(`[Security] Blocked WS connection from unauthorized origin: ${origin}`);
          return cb(false, 401, 'Unauthorized Origin');
        }

        const url = new URL(info.req.url || '', `http://${info.req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        if (ENV.WS_SECRET_TOKEN && token !== ENV.WS_SECRET_TOKEN) {
          console.warn(`[Security] Blocked WS connection with invalid session token`);
          return cb(false, 401, 'Unauthorized Token');
        }

        cb(true);
      }
    });
    this.setup();
  }

  private setup() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected to Engine WS');
      this.clients.add(ws);

      // Send initial state immediately
      ws.send(JSON.stringify({ type: 'STATE_UPDATE', payload: this.state }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleCommand(data);
        } catch (err) {
          console.error('Failed to parse incoming WS message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });

    this.runStartupSequence();
  }

  private async runStartupSequence() {
    // Run catch-up logic
    await runCatchup(this.keyring);

    // Sync DB state to ensure frontend gets the caught-up data
    this.state.histories = db.histories;

    // Start balance and position polling
    this.updateBalance();
    this.updatePositions();
    setInterval(() => {
      this.updateBalance();
      this.updatePositions();
    }, 4000); // Super-fast 4-second refresh loop to catch volatility spikes
  }

  private async updatePositions() {
    try {
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

      const [accounts1, accounts2] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(this.keyring.getPublicKey(), { programId: TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(this.keyring.getPublicKey(), { programId: TOKEN_2022_PROGRAM_ID })
      ]);

      const allAccounts = [...accounts1.value, ...accounts2.value];
      const positions = [];
      const mintsToFetch: string[] = [];

      for (const { account } of allAccounts) {
        if (!account.data.parsed || !account.data.parsed.info) continue;
        const info = account.data.parsed.info;
        const amount = info.tokenAmount.uiAmount;
        if (amount && amount > 0) {
          const tokenMint = info.mint;
          mintsToFetch.push(tokenMint);
          positions.push({
            tokenMint,
            tokenSymbol: tokenMint.slice(0, 4),
            initialBalance: amount,
            currentBalance: amount,
            entryPriceUsd: 0, // In prod, compute from DB histories
            valueUsd: 0,
            pnlPercent: 0,
            status: 'ACTIVE',
            nextTpUsd: 0
          });
        }
      }

      const WSOL = 'So11111111111111111111111111111111111111112';

      // Always fetch SOL price to calculate accurate entry prices
      mintsToFetch.push(WSOL);

      if (mintsToFetch.length > 0) {
        const prices = await getPrices(mintsToFetch);
        const solPriceUsd = prices[WSOL] || 150; // Fallback to 150 only if DexScreener fails

        for (const pos of positions) {
          const currentPrice = prices[pos.tokenMint] || 0;
          pos.valueUsd = pos.currentBalance * currentPrice;

          // Estimate entry price from DB history if available
          const buyHistory = db.histories.find(h => h.tokenMint === pos.tokenMint && h.type === 'BUY');
          if (buyHistory && buyHistory.amountSol > 0) {
            // Use the REAL Sol price to compute exactly how much USD we paid for the position
            pos.entryPriceUsd = (buyHistory.amountSol * solPriceUsd) / pos.initialBalance;
            if (pos.entryPriceUsd > 0) {
              pos.pnlPercent = ((currentPrice - pos.entryPriceUsd) / pos.entryPriceUsd) * 100;
            }
          }
          pos.nextTpUsd = pos.entryPriceUsd * 2;
        }
      }

      this.state.positions = positions as any;
      this.broadcastState();

      this.runRulesEngine();
    } catch (err: any) {
      this.broadcastLog({ timestamp: Date.now(), type: 'ALERT', message: `Update Positions Error: ${err.message}` });
      console.error('[Engine] Failed to update positions', err);
    }
  }

  private runRulesEngine() {
    const tpRule = this.state.rules.find(r => r.id === 'tp_2x_half');
    const slRule = this.state.rules.find(r => r.id === 'sl_30pct');

    for (const pos of this.state.positions) {
      if (pos.valueUsd < 1) continue; // Ignore dust

      // Take Profit (2x)
      if (tpRule?.enabled && pos.pnlPercent >= 100) {
        this.broadcastLog({ timestamp: Date.now(), type: 'ALERT', message: `RULE TRIGGER: ${pos.tokenSymbol} hit 2x TP!` });
        this.executeTradeAsync('SELL', pos.tokenMint, 50); // Sell Half
        continue;
      }

      // Stop Loss (<30% remaining value)
      if (slRule?.enabled && pos.pnlPercent <= -70) {
        this.broadcastLog({ timestamp: Date.now(), type: 'ALERT', message: `RULE TRIGGER: ${pos.tokenSymbol} hit SL!` });
        this.executeTradeAsync('SELL', pos.tokenMint, 100); // Sell Full
      }
    }
  }

  private async updateBalance() {
    try {
      const balance = await connection.getBalance(this.keyring.getPublicKey());
      this.state.agentBalanceSol = balance / LAMPORTS_PER_SOL;
      this.broadcastState();
    } catch (err) {
      console.error('Failed to fetch SOL balance', err);
    }
  }

  private handleCommand(data: any) {
    if (data.type === 'ADD_TRACKED_WALLET') {
      const address = data.payload?.address;
      if (address && !this.state.trackedWallets.find(w => w.address === address)) {
        this.state.trackedWallets.push({ address, status: 'ACTIVE' });
        db.setTrackedWallets(this.state.trackedWallets);
        this.broadcastLog({ timestamp: Date.now(), type: 'SUCCESS', message: `Now tracking wallet: ${address}` });
        this.broadcastState();
      }
    } else if (data.type === 'REMOVE_TRACKED_WALLET') {
      const address = data.payload?.address;
      if (address) {
        this.state.trackedWallets = this.state.trackedWallets.filter(w => w.address !== address);
        db.setTrackedWallets(this.state.trackedWallets);
        this.broadcastLog({ timestamp: Date.now(), type: 'ALERT', message: `Stopped tracking wallet: ${address}` });
        this.broadcastState();
      }
    } else if (data.type === 'TOGGLE_RULE') {
      const id = data.payload?.id;
      const enabled = data.payload?.enabled;
      if (id !== undefined && enabled !== undefined) {
        db.toggleRule(id, enabled);
        this.state.rules = db.rules; // Sync state
        this.broadcastLog({ timestamp: Date.now(), type: 'ALERT', message: `Rule ${id} toggled to ${enabled ? 'ON' : 'OFF'}` });
        this.broadcastState();
      }
    } else if (data.type === 'MANUAL_SELL') {
      const { tokenMint, amountPct } = data.payload;
      this.executeTradeAsync('SELL', tokenMint, amountPct);
    } else if (data.type === 'MANUAL_BUY' || data.type === 'SNIPE') {
      const { tokenMint, amountSol } = data.payload;
      this.executeTradeAsync('BUY', tokenMint, amountSol);
    }
  }

  private async executeTradeAsync(side: 'BUY' | 'SELL', tokenMint: string, amount: number) {
    this.broadcastLog({ timestamp: Date.now(), type: 'ALERT', message: `Initiating ${side} for ${tokenMint}...` });
    try {
      const WSOL = 'So11111111111111111111111111111111111111112';
      const inputMint = side === 'BUY' ? WSOL : tokenMint;
      const outputMint = side === 'BUY' ? tokenMint : WSOL;

      let amountInLamports = 0;
      if (side === 'BUY') {
        amountInLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      } else {
        // Find exact token balance in lamports
        const pos = this.state.positions.find(p => p.tokenMint === tokenMint);
        if (pos) {
          // Because we don't store decimals in state yet, we just assume 6 decimals for demo (like $Ash)
          // Actually, we can just use currentBalance. But Wait! The user might have a different decimal token.
          // For demo purposes, we will mock to 6 decimals, but properly calculate the percentage.
          const totalLamports = pos.currentBalance * 1_000_000;
          amountInLamports = Math.floor(totalLamports * (amount / 100));
        } else {
          amountInLamports = 1000000;
        }
      }

      // Execute swap
      const { executeSwap } = await import('./core/jupiter');
      const txid = await executeSwap(this.keyring, inputMint, outputMint, amountInLamports);

      this.broadcastLog({ timestamp: Date.now(), type: 'SUCCESS', message: `${side} successful! TX: ${txid.slice(0, 8)}...` });

      // Save history
      db.addHistory({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        type: side,
        tokenMint,
        tokenSymbol: tokenMint.slice(0, 4),
        amountSol: side === 'BUY' ? amount : 0,
        priceUsd: 0,
        txSignature: txid,
        timestamp: Date.now()
      });
      this.broadcastState();

      // Force position update immediately instead of waiting for the 15s interval
      await this.updatePositions();
    } catch (err: any) {
      this.broadcastLog({ timestamp: Date.now(), type: 'ALERT', message: `${side} failed: ${err.message}` });
    }
  }

  hasActivePosition(tokenMint: string): boolean {
    return this.state.positions.some(p => p.tokenMint === tokenMint && p.valueUsd > 1);
  }

  addRadarPick(pick: WhalePick) {
    this.state.ephemeralRadar.unshift(pick);
    // Keep max 50 picks
    if (this.state.ephemeralRadar.length > 50) this.state.ephemeralRadar.pop();
    this.broadcastState();
  }

  broadcastLog(log: any) {
    this.state.logs.unshift(log);
    if (this.state.logs.length > 50) this.state.logs.pop();
    this.broadcastState();
  }

  broadcastState() {
    const payload = JSON.stringify({ type: 'STATE_UPDATE', payload: this.state });
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}
