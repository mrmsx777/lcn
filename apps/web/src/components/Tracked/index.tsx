import React from 'react';
import { TrackedWallet } from '@solana-sentinel/shared';
import { Users, Plus, Trash2, Copy } from 'lucide-react';

export const Tracked = ({ wallets, sendCommand }: { wallets: TrackedWallet[], sendCommand: (type: string, payload?: any) => void }) => {
  const handleAdd = () => {
    const address = window.prompt("Enter Solana wallet address to track:");
    if (address && address.trim().length > 30) {
      sendCommand('ADD_TRACKED_WALLET', { address: address.trim() });
    }
  };

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    // Optionally a small toast could go here
  };
  return (
    <div className="glass-card flex-1 flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surfaceHighlight/50">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-300" />
          <h2 className="font-semibold text-gray-200">Tracked Wallets</h2>
        </div>
        <button 
          onClick={handleAdd}
          className="text-xs flex items-center gap-1 bg-surfaceHighlight hover:bg-white/10 px-2 py-1 rounded text-gray-300 transition-colors border border-white/5"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      
      <div className="p-4 flex flex-col gap-2 overflow-y-auto">
        {wallets.length === 0 ? (
          <div className="text-gray-500 text-sm font-mono text-center py-8">No wallets tracked.</div>
        ) : (
          wallets.map((wallet, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded bg-surface/30 border border-white/5 group hover:bg-surface/50">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${wallet.status === 'ACTIVE' ? 'bg-primary' : 'bg-gray-500'}`}></div>
                <span className="font-mono text-sm text-gray-300">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleCopy(wallet.address)}
                  className="text-gray-500 hover:text-primary transition-colors"
                  title="Copy full address"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => sendCommand('REMOVE_TRACKED_WALLET', { address: wallet.address })}
                  className="text-gray-500 hover:text-danger transition-colors"
                  title="Remove wallet"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
