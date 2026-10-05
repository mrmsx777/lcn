import React from 'react';
import { Rule } from '@solana-sentinel/shared';
import { Settings2 } from 'lucide-react';

export const Rules = ({ rules, sendCommand }: { rules: Rule[], sendCommand: (type: string, payload?: any) => void }) => {
  return (
    <div className="glass-card flex-1 flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surfaceHighlight/50">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-gray-300" />
          <h2 className="font-semibold text-gray-200">Active Rules</h2>
        </div>
      </div>
      
      <div className="p-4 flex flex-col gap-3 overflow-y-auto">
        {!rules || rules.length === 0 ? (
          <div className="text-gray-500 text-sm font-mono text-center py-8">No rules configured.</div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="flex flex-col gap-2 p-3 rounded bg-surface/30 border border-white/5 group hover:bg-surface/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-200">{rule.name}</span>
                
                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={rule.enabled} 
                    onChange={(e) => sendCommand('TOGGLE_RULE', { id: rule.id, enabled: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-surfaceHighlight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white border border-white/5"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {rule.description}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
