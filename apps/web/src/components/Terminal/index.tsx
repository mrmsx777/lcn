import React, { useRef, useEffect } from 'react';
import { TradeLog } from '@solana-sentinel/shared';
import { Terminal as TerminalIcon } from 'lucide-react';

const TYPE_COLORS = {
  'ALERT': 'text-secondary',
  'TP-EXEC': 'text-primary',
  'WHALE-EXIT': 'text-warning',
  'SUCCESS': 'text-primary',
  'PURGE': 'text-gray-500'
};

export const Terminal = ({ logs }: { logs: TradeLog[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden border-t-4 border-t-surfaceHighlight">
      <div className="px-4 py-2 border-b border-white/5 bg-surfaceHighlight/30 flex items-center gap-2">
        <TerminalIcon className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Real-Time Audit Feed & Execution Logs</span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-1.5 bg-[#050505]"
      >
        {logs.slice().reverse().map((log, idx) => {
          const date = new Date(log.timestamp);
          const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
          
          return (
            <div key={idx} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded">
              <span className="text-gray-500 shrink-0">[{timeString}]</span>
              <span className={`shrink-0 font-bold ${TYPE_COLORS[log.type]}`}>[{log.type}]</span>
              <span className="text-gray-300 break-words">{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
