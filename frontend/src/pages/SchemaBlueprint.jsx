import React from 'react';
import { Database, Info } from 'lucide-react';
import { databaseSchema } from '../utils/db.js';

export default function SchemaBlueprint() {
  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div>
        <h2 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-2">
          Database Schema Blueprint
        </h2>
        <p className="text-sm text-neutral-400 font-normal">
          Visualizing column schemas, table references, and descriptions indexed in ChromaDB context metadata.
        </p>
      </div>

      <div className="glass-panel p-5 rounded-xl flex items-start gap-4 bg-violet-950/5 border border-violet-900/15">
        <Info className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-violet-200">Table Context Router</h3>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed font-normal">
            Our semantic router parses natural language inputs and extracts relevant table models to assemble localized prompts for SQL query writing.
          </p>
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {databaseSchema.map((tableSchema) => (
          <div key={tableSchema.table} className="glass-panel rounded-xl border border-[#1c1c1f] hover:border-neutral-500 transition duration-200 flex flex-col justify-between overflow-hidden">
            <div>
              {/* Header */}
              <div className="bg-[#0d0d11]/80 p-4 border-b border-[#1c1c1f] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-violet-400" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-white font-mono">{tableSchema.table}</h4>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1c1c1f] text-neutral-400 border border-[#27272a]/40">
                  Table Model
                </span>
              </div>
              
              <p className="p-4 text-xs text-neutral-400 leading-relaxed border-b border-[#1c1c1f]/40 italic font-normal">
                {tableSchema.description}
              </p>

              {/* Columns List */}
              <div className="p-4 space-y-3">
                {tableSchema.columns.map((col) => (
                  <div key={col.name} className="flex flex-col gap-0.5 text-xs py-1.5 border-b border-[#1c1c1f]/30 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-violet-300">{col.name}</span>
                      <span className="font-mono text-[9px] text-neutral-500 uppercase">{col.type}</span>
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-1 leading-normal font-normal">{col.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Relations footer */}
            <div className="bg-[#060608]/60 p-3.5 border-t border-[#1c1c1f]/40 text-[9px] text-neutral-500 font-mono">
              {tableSchema.table === 'inventory' && "FK: product_id -> products.id | warehouse_id -> warehouses.id"}
              {tableSchema.table === 'sales' && "FK: product_id -> products.id | warehouse_id -> warehouses.id"}
              {tableSchema.table === 'purchase_orders' && "FK: supplier_id -> suppliers.id | product_id -> products.id"}
              {!['inventory', 'sales', 'purchase_orders'].includes(tableSchema.table) && "PK: id"}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
