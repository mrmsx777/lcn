import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

export const WalletConnect = () => {
  const [connected, setConnected] = useState(false);

  return (
    <button 
      onClick={() => setConnected(!connected)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all border ${
        connected 
          ? 'bg-surfaceHighlight/50 text-primary border-primary/20 hover:border-primary/40' 
          : 'bg-[#AB9FF2]/10 text-[#AB9FF2] border-[#AB9FF2]/20 hover:bg-[#AB9FF2]/20'
      }`}
    >
      <Wallet className="w-4 h-4" />
      {connected ? 'Phantom: Vault Connected' : 'Connect Phantom'}
    </button>
  );
};
