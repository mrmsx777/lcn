import React, { useState } from 'react';
import { Position } from '@solana-sentinel/shared';
import { Target, TrendingUp, AlertTriangle, ArrowRight, Zap, ShoppingCart } from 'lucide-react';

export const Positions = ({ positions, sendCommand }: { positions: Position[], sendCommand: (type: string, payload?: any) => void }) => {
  const [manualMint, setManualMint] = useState('');
  
  const handleManualBuy = () => {
    if (manualMint.trim().length > 30) {
      const amountStr = window.prompt('Enter SOL amount to buy:', '0.1');
      if (amountStr) {
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          sendCommand('MANUAL_BUY', { tokenMint: manualMint.trim(), amountSol: amount });
          setManualMint('');
        }
      }
    }
  };

  return (
    <div className="glass-card flex-1 flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surfaceHighlight/50">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-secondary" />
          <h2 className="font-semibold text-gray-200">Active Positions & TP Ladder</h2>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Paste Contract Address..." 
            value={manualMint}
            onChange={(e) => setManualMint(e.target.value)}
            className="bg-surface/50 border border-white/5 rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-secondary transition-colors w-40"
          />
          <button 
            onClick={handleManualBuy}
            className="flex items-center gap-1 bg-secondary/20 hover:bg-secondary/30 text-secondary px-2 py-1 rounded text-xs font-bold transition-colors"
          >
            <ShoppingCart className="w-3 h-3" /> Buy
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="text-gray-500 text-sm font-mono text-center py-8">No active positions.</div>
        ) : (
          positions.map((pos, idx) => (
            <div key={idx} className="bg-surface/50 border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors group relative overflow-hidden">
              {/* Status Indicator */}
              <div className={`absolute top-0 left-0 w-1 h-full ${pos.pnlPercent > 0 ? 'bg-primary' : 'bg-danger'}`}></div>

              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">${pos.valueUsd.toFixed(2)}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-surfaceHighlight border border-white/5 font-mono text-gray-400">
                    ${pos.tokenSymbol}
                  </span>
                </div>
                <div className={`flex items-center gap-1 text-sm font-mono ${pos.pnlPercent > 0 ? 'text-primary' : 'text-danger'}`}>
                  {pos.pnlPercent > 0 ? <TrendingUp className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {pos.pnlPercent > 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-400 font-mono">
                <div className="flex justify-between">
                  <span>Entry:</span>
                  <span className="text-gray-200">{pos.initialBalance} @ ${pos.entryPriceUsd.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1 text-xs text-secondary">
                    Status: <span className="text-gray-200">{pos.status.replace('_', ' ')}</span>
                  </span>

                  {pos.valueUsd < 4 ? (
                    <span className="text-danger flex items-center gap-1 text-xs animate-pulse">
                      Dust (&lt;$4) Auto-Sell Queued
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      Next TP <ArrowRight className="w-3 h-3" /> <span className="text-primary">${pos.nextTpUsd.toFixed(2)}</span>
                    </span>
                  )}
                </div>
                
                {/* Manual Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => sendCommand('MANUAL_SELL', { tokenMint: pos.tokenMint, amountPct: 50 })}
                    className="flex-1 py-1.5 px-3 rounded text-xs font-semibold bg-surfaceHighlight hover:bg-white/10 text-gray-300 transition-colors border border-white/5 flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3 h-3" /> Sell Half
                  </button>
                  <button 
                    onClick={() => sendCommand('MANUAL_SELL', { tokenMint: pos.tokenMint, amountPct: 100 })}
                    className="flex-1 py-1.5 px-3 rounded text-xs font-semibold bg-danger/10 hover:bg-danger/20 text-danger transition-colors border border-danger/20 flex items-center justify-center gap-1"
                  >
                    Sell Full
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
