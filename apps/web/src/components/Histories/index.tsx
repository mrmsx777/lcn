import React from 'react';
import { HistoryEntry } from '@solana-sentinel/shared';
import { History, TrendingDown, TrendingUp, Zap, XCircle } from 'lucide-react';

export const Histories = ({ histories }: { histories: HistoryEntry[] }) => {
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'BUY': return <TrendingUp className="w-4 h-4 text-secondary" />;
      case 'SELL': return <TrendingDown className="w-4 h-4 text-primary" />;
      case 'TP': return <Zap className="w-4 h-4 text-primary" />;
      case 'SL': return <XCircle className="w-4 h-4 text-danger" />;
      default: return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'BUY': return 'text-secondary';
      case 'SELL': return 'text-primary';
      case 'TP': return 'text-primary';
      case 'SL': return 'text-danger';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="glass-card flex-1 flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surfaceHighlight/50">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-300" />
          <h2 className="font-semibold text-gray-200">Action History</h2>
        </div>
        <span className="text-xs text-gray-500 font-mono">Last 24H (Persisted)</span>
      </div>
      
      <div className="p-4 flex flex-col gap-2 overflow-y-auto">
        {!histories || histories.length === 0 ? (
          <div className="text-gray-500 text-sm font-mono text-center py-8">No trading history recorded yet.</div>
        ) : (
          histories.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded bg-surface/30 border border-white/5 hover:bg-surface/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full bg-surfaceHighlight border border-white/5 ${getColor(entry.type)}`}>
                  {getIcon(entry.type)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-200">
                    {entry.type} <span className="text-gray-400 font-mono"> ${entry.tokenSymbol}</span>
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-mono text-gray-300">
                  {entry.amountSol > 0 ? `${entry.amountSol} SOL` : '-'}
                </span>
                {entry.txSignature && (
                  <a 
                    href={`https://solscan.io/tx/${entry.txSignature}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline font-mono"
                  >
                    View TX
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
