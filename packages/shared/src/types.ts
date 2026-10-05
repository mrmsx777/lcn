export interface WhalePick {
  type?: 'BUY' | 'SELL';
  walletAddress: string;
  tokenMint: string;
  tokenSymbol: string;
  buyAmountSol: number;
  buyTimestamp: number;
  expiresAt: number;
}

export interface Position {
  tokenMint: string;
  tokenSymbol: string;
  entryPriceUsd: number;
  entryPriceSol: number;
  initialBalance: number;
  currentBalance: number;
  status: 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'CLOSED';
  nextTpUsd: number;
  valueUsd: number;
  pnlPercent: number;
}

export interface TradeLog {
  timestamp: number;
  type: 'ALERT' | 'TP-EXEC' | 'WHALE-EXIT' | 'SUCCESS' | 'PURGE';
  message: string;
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  type: 'TAKE_PROFIT' | 'STOP_LOSS' | 'CUSTOM';
  description: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'BUY' | 'SELL' | 'TP' | 'SL';
  tokenMint: string;
  tokenSymbol: string;
  amountSol: number;
  priceUsd: number;
  txSignature?: string;
}

export interface TrackedWallet {
  address: string;
  label?: string;
  status: 'ACTIVE' | 'PAUSED';
}

export interface SystemState {
  agentBalanceSol: number;
  vaultConnected: boolean;
  positions: Position[];
  ephemeralRadar: WhalePick[];
  trackedWallets: TrackedWallet[];
  logs: TradeLog[];
  rules: Rule[];
  histories: HistoryEntry[];
}
