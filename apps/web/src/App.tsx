import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useEngineWs } from './hooks/useEngineWs';
import { WalletConnect } from './components/Wallet';
import { Positions } from './components/Positions';
import { Radar } from './components/Radar';
import { Tracked } from './components/Tracked';
import { Terminal } from './components/Terminal';
import { Rules } from './components/Rules';
import { Histories } from './components/Histories';
import { Activity, Radio, ShieldAlert } from 'lucide-react';

export default function App() {
  const { state, connected, sendCommand } = useEngineWs();

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary flex items-center gap-3">
          <Activity className="animate-spin" /> 
          <span className="font-mono text-lg">Connecting to Local Daemon...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackRender={({ error }: any) => (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-8">
        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-lg max-w-2xl text-left">
          <h2 className="text-red-500 text-xl font-bold mb-4">Frontend Crashed</h2>
          <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap">{error.message}\n{error.stack}</pre>
        </div>
      </div>
    )}>
      <div className="min-h-screen p-4 md:p-6 lg:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-card p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary blur-md opacity-50 rounded-full"></div>
            <ShieldAlert className="w-10 h-10 text-primary relative z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Solana Sentinel
              <span className="text-xs px-2 py-1 rounded bg-surfaceHighlight text-gray-400 font-mono border border-white/5">
                v1.0.0-beta
              </span>
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-primary' : 'bg-danger'} shadow-[0_0_10px_currentColor]`}></div>
              <span className="font-mono">{connected ? 'DAEMON CONNECTED' : 'DAEMON DISCONNECTED'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-sm text-gray-400">Agent Active</span>
            <span className="font-mono text-xl text-primary font-semibold text-glow">
              {state.agentBalanceSol.toFixed(2)} SOL
            </span>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Column: Positions & Ladder */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Positions positions={state.positions} sendCommand={sendCommand} />
        </div>

        {/* Middle Column: Ephemeral Radar & History */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex-1 min-h-[300px]">
            <Radar picks={state.ephemeralRadar} sendCommand={sendCommand} />
          </div>
          <div className="flex-1 min-h-[300px]">
            <Histories histories={state.histories} />
          </div>
        </div>

        {/* Right Column: Tracked Wallets & Rules */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="flex-1 min-h-[300px]">
            <Tracked wallets={state.trackedWallets} sendCommand={sendCommand} />
          </div>
          <div className="flex-1 min-h-[300px]">
            <Rules rules={state.rules} sendCommand={sendCommand} />
          </div>
        </div>
      </div>

      {/* Bottom: Terminal */}
      <div className="h-64 mt-auto">
        <Terminal logs={state.logs} />
      </div>

      </div>
    </ErrorBoundary>
  );
}
