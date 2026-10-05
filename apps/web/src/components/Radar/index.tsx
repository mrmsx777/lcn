import React, { useEffect, useState } from 'react';
import { WhalePick } from '@solana-sentinel/shared';
import { Radar as RadarIcon, Clock, Zap, Copy, Target } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

export const Radar = ({ picks, sendCommand }: { picks: WhalePick[], sendCommand: (type: string, payload?: any) => void }) => {
  const [now, setNow] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (mint: string) => {
    navigator.clipboard.writeText(mint);
  };

  const handleSnipe = (mint: string, symbol: string) => {
    const amountStr = window.prompt(`Enter SOL amount to snipe ${symbol}:`, '0.1');
    if (amountStr) {
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        sendCommand('SNIPE', { tokenMint: mint, amountSol: amount });
      } else {
        alert('Invalid SOL amount');
      }
    }
  };

  return (
    <div className="glass-card flex-1 flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surfaceHighlight/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-secondary blur-sm opacity-50 rounded-full animate-ping"></div>
            <RadarIcon className="w-5 h-5 text-secondary relative z-10" />
          </div>
          <h2 className="font-semibold text-gray-200">Ephemeral Radar (4H TTL)</h2>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Filter by wallet..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-surface/50 border border-white/5 rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-secondary transition-colors w-32"
          />
          <span className="text-xs text-gray-500 font-mono">{picks.length} Active</span>
        </div>
      </div>
      
      <div className="p-4 flex flex-col gap-3 overflow-y-auto">
        {picks.length === 0 ? (
          <div className="text-gray-500 text-sm font-mono text-center py-8">No recent whale activity.</div>
        ) : (
          picks.filter(p => p.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())).map((pick, idx) => {
            const timeLeft = Math.max(0, pick.expiresAt - now);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const mins = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return (
              <div key={idx} className="bg-surface/30 border border-white/5 rounded-lg p-3 group hover:bg-surface/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-mono bg-black/50 px-2 py-0.5 rounded">
                    [{new Date(pick.buyTimestamp).toLocaleTimeString()}] {pick.walletAddress.slice(0, 6)}...
                  </span>
                  <div className="flex items-center gap-1 text-xs text-warning font-mono">
                    <Clock className="w-3 h-3" />
                    {hours}h {mins}m
                  </div>
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-sm text-gray-400">{pick.type === 'SELL' ? 'Sold' : 'Bought'}</div>
                    <div className={`font-semibold flex items-center gap-2 ${pick.type === 'SELL' ? 'text-danger' : 'text-secondary'}`}>
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4" /> ${pick.tokenSymbol}
                      </div>
                      <button 
                        onClick={() => handleCopy(pick.tokenMint)}
                        className="text-gray-500 hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy Coin Address"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Amount</div>
                      <div className="font-mono text-white">{pick.buyAmountSol.toFixed(1)} SOL</div>
                    </div>
                    <button 
                      onClick={() => handleSnipe(pick.tokenMint, pick.tokenSymbol)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Target className="w-3 h-3" /> Snipe
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
