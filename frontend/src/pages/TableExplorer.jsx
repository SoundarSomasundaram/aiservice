import React, { useState } from 'react';

export default function TableExplorer({ dbState }) {
  const [inspectorTable, setInspectorTable] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div>
        <h2 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-2">
          Database Table Explorer
        </h2>
        <p className="text-sm text-neutral-400 font-normal">
          Inspect raw rows, search, and download records from seeded tables.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Table selector tabs */}
        <div className="flex flex-wrap gap-2">
          {Object.keys(dbState).map((tableName) => (
            <button
              key={tableName}
              onClick={() => {
                setInspectorTable(tableName);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                inspectorTable === tableName
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'glass-panel text-neutral-400 hover:text-white'
              }`}
            >
              {tableName}
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search in ${inspectorTable}...`}
          className="px-4 py-2.5 glass-input rounded-xl text-xs w-full md:w-64"
        />
      </div>

      {/* Data Grid Inspector */}
      <div className="glass-panel rounded-xl overflow-hidden border border-[#1c1c1f]">
        <div className="max-h-[500px] overflow-auto">
          <table className="w-full text-left border-collapse text-xs text-neutral-300">
            <thead>
              <tr className="bg-[#0d0d11] border-b border-[#1c1c1f]">
                {dbState[inspectorTable][0] && Object.keys(dbState[inspectorTable][0]).map((col) => (
                  <th key={col} className="p-3.5 font-bold text-neutral-400 uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dbState[inspectorTable]
                .filter(row => {
                  if (!searchQuery) return true;
                  return Object.values(row).some(val => 
                    String(val).toLowerCase().includes(searchQuery.toLowerCase())
                  );
                })
                .map((row, i) => (
                  <tr key={i} className="border-b border-[#1c1c1f]/40 hover:bg-[#111115] transition-colors">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="p-3.5 font-mono">{val !== null ? String(val) : 'NULL'}</td>
                    ))}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
