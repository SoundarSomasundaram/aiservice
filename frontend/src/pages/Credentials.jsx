import React from 'react';
import { Settings, Lock, Info } from 'lucide-react';

export default function Credentials({ apiKey, saveApiKey }) {
  return (
    <div className="space-y-8 max-w-xl mx-auto animate-fade-in">
      
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-light tracking-tight text-white mb-2">
          Agent Credentials
        </h2>
        <p className="text-sm text-neutral-400 font-normal">
          Setup Grok xAI credentials or view system parameters.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-[#1c1c1f] space-y-6">
        <div className="flex items-center gap-2 border-b border-[#1c1c1f] pb-4">
          <Settings className="h-5 w-5 text-violet-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-white">xAI Configuration</h3>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-violet-400" />
              Grok API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="xai-xxxxxxxxxxxxxxxxxxxx"
              className="w-full glass-input rounded-xl px-4 py-3 text-xs focus:border-violet-500 font-mono"
            />
            <p className="text-[10px] text-neutral-500 leading-normal font-normal">
              Stored locally inside browser sandbox memory. Transmits direct requests to api.x.ai/v1 completions endpoint.
            </p>
          </div>

          <div className="p-4 bg-violet-950/5 rounded-xl border border-violet-900/15 text-xs text-violet-300 leading-relaxed font-normal">
            <div className="font-bold uppercase tracking-wider text-[10px] text-violet-200 mb-1 flex items-center gap-1.5">
              <Info className="h-4 w-4" /> Local Engine Failback
            </div>
            Absent an API key, local NLP parsing templates will auto-resolve queries offline against the database sandbox, illustrating full pipeline validation.
          </div>
        </div>
      </div>

    </div>
  );
}
