import React from 'react';
import { Terminal, Play, Database } from 'lucide-react';
import { databaseSchema } from '../utils/db.js';
import { executeSQL } from '../utils/sqlEngine.js';

export default function SqlPlayground({ 
  playgroundSql, setPlaygroundSql, 
  playgroundResult, setPlaygroundResult, 
  playgroundError, setPlaygroundError, 
  dbState 
}) {
  
  const handleRunPlayground = () => {
    setPlaygroundError(null);
    setPlaygroundResult(null);
    const result = executeSQL(playgroundSql, dbState);
    if (result.success) {
      setPlaygroundResult(result);
    } else {
      setPlaygroundError(result.error);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div>
        <h2 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-2">
          SQL Editor Playground
        </h2>
        <p className="text-sm text-neutral-400 font-normal">
          Compose raw SELECT commands directly on our relational dataset. Enforces read-only permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SQL Editor Console */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-violet-400" /> SQL Console
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/10">
                  Query Ready
                </span>
              </div>
              
              <textarea
                value={playgroundSql}
                onChange={(e) => setPlaygroundSql(e.target.value)}
                placeholder="Write raw SQL SELECT statements here..."
                className="w-full h-48 p-4 font-mono text-xs bg-[#060608] border border-[#1c1c1f] rounded-lg focus:border-violet-500 text-emerald-400 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between mt-5">
              <p className="text-[10px] text-neutral-500 font-normal">
                Security limit: read-only access enabled. Modifying statements are rejected.
              </p>
              <button
                onClick={handleRunPlayground}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Execute
              </button>
            </div>
          </div>

          {/* Execution Error Banner */}
          {playgroundError && (
            <div className="p-4 bg-rose-950/20 border border-rose-900/35 rounded-xl flex items-start gap-3 text-rose-400">
              <span className="shrink-0 mt-0.5 font-bold">[!]</span>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider">SQL Compilation Exception</h4>
                <p className="text-xs mt-1 font-mono leading-normal">{playgroundError}</p>
              </div>
            </div>
          )}

          {/* Execution Data Result Grid */}
          {playgroundResult && (
            <div className="glass-panel rounded-xl overflow-hidden border border-[#1c1c1f]">
              <div className="bg-[#0d0d11] px-5 py-3.5 border-b border-[#1c1c1f] flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Result Table ({playgroundResult.rowCount} rows)
                </span>
                <button 
                  onClick={() => copyText(JSON.stringify(playgroundResult.data, null, 2))}
                  className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white bg-[#060608] px-3 py-1.5 rounded-full border border-[#1c1c1f] transition cursor-pointer"
                >
                  Copy JSON
                </button>
              </div>

              <div className="max-h-[350px] overflow-auto">
                <table className="w-full text-left border-collapse text-xs text-neutral-300">
                  <thead>
                    <tr className="bg-[#060608] border-b border-[#1c1c1f]">
                      {Object.keys(playgroundResult.data[0] || {}).map((key) => (
                        <th key={key} className="p-3 font-semibold text-neutral-400 capitalize">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {playgroundResult.data.map((row, i) => (
                      <tr key={i} className="border-b border-[#1c1c1f]/40 hover:bg-[#111115]">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="p-3 font-mono text-xs">{val !== null ? String(val) : 'NULL'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Schema Quick Reference Sidebar */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-xl border border-[#1c1c1f]">
            <h3 className="text-xs font-bold text-neutral-300 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Database className="h-4 w-4 text-violet-400" />
              Relations Schema
            </h3>
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
              {databaseSchema.map((t) => (
                <div key={t.table} className="text-xs border-b border-[#1c1c1f]/40 pb-3 last:border-0 last:pb-0">
                  <h4 className="font-bold text-violet-300 font-mono capitalize">{t.table}</h4>
                  <p className="text-[10px] text-neutral-500 italic mt-1 font-normal leading-normal">{t.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2.5 font-mono text-[9px] text-neutral-400">
                    {t.columns.map(c => (
                      <span key={c.name} className="px-2 py-0.5 rounded bg-[#060608] border border-[#1c1c1f] uppercase">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
