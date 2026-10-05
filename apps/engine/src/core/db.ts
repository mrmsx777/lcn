import fs from 'fs';
import path from 'path';
import { HistoryEntry, Rule } from '@solana-sentinel/shared';

const DB_PATH = path.resolve(process.cwd(), 'data/db.json');

export interface DatabaseSchema {
  histories: HistoryEntry[];
  rules: Rule[];
  trackedWallets: { address: string, status: 'ACTIVE' | 'PAUSED' }[];
  lastShutdown: number;
}

const DEFAULT_DB: DatabaseSchema = {
  histories: [],
  trackedWallets: [],
  rules: [
    {
      id: 'tp_2x_half',
      name: 'Take Profit (2x = Sell Half)',
      description: 'Auto-sells 50% of the position each time the token price doubles.',
      type: 'TAKE_PROFIT',
      enabled: true
    },
    {
      id: 'sl_30pct',
      name: 'Stop Loss (<30% remaining)',
      description: 'Liquidates the entire position if the value drops below 30% of the initial entry price.',
      type: 'STOP_LOSS',
      enabled: true
    }
  ],
  lastShutdown: Date.now()
};

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
    this.setupGracefulShutdown();
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('[DB] Failed to parse DB, using defaults.', err);
      }
    } else {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    return DEFAULT_DB;
  }

  save() {
    this.data.lastShutdown = Date.now();
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
  }

  get rules() { return this.data.rules || []; }
  get histories() { return this.data.histories || []; }
  get trackedWallets() { return this.data.trackedWallets || []; }
  get lastShutdown() { return this.data.lastShutdown; }

  setTrackedWallets(wallets: { address: string, status: 'ACTIVE' | 'PAUSED' }[]) {
    this.data.trackedWallets = wallets;
    this.save();
  }

  addHistory(entry: HistoryEntry) {
    this.data.histories.unshift(entry);
    if (this.data.histories.length > 1000) this.data.histories.pop(); // Max 1000 items
    this.save();
  }

  toggleRule(id: string, enabled: boolean) {
    const rule = this.data.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = enabled;
      this.save();
    }
  }

  private setupGracefulShutdown() {
    // Save DB state when Node exits
    const saveAndExit = () => {
      console.log('\n[DB] Saving state and shutting down...');
      this.save();
      process.exit(0);
    };
    process.on('SIGINT', saveAndExit);
    process.on('SIGTERM', saveAndExit);
  }
}

export const db = new Database();
