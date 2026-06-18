import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, Sparkles, Terminal, Copy, ChevronRight, RefreshCw, Send, 
  Upload, Trash2, Plus, Info, Lock, FileSpreadsheet, Settings, X, Eye 
} from 'lucide-react';


import { executeSQL } from '../utils/sqlEngine.js';
import { runAgentPipeline } from '../utils/agent.js';

// Helper to parse double-quoted CSV rows safely
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export default function ChatWorkspace({ 
  dbState, setDbState, apiKey, saveApiKey, chatMessages, setChatMessages, 
  isProcessing, setIsProcessing, progressSteps, setProgressSteps, 
  setPlaygroundSql, activeTable, setActiveTable, customSchema, setCustomSchema
}) {
  const [queryInput, setQueryInput] = useState('');
  
  const [showSettings, setShowSettings] = useState(false);

  const navigate = useNavigate();

  // Clear chat except welcome message when table resets
  const resetWorkspace = async () => {
    if (activeTable) {
      try {
        await fetch(`http://localhost:8000/api/tables/${activeTable.name}`, {
          method: "DELETE"
        });
      } catch (err) {
        console.error("Failed to delete table on backend SQLite:", err);
      }
    }
    setActiveTable(null);
    setCustomSchema([]);
    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Welcome to QueryFlow. Load a custom dataset below to begin extracting insights.`,
        isWelcome: true
      }
    ]);
  };

  // CSV upload handler (posts to FastAPI)
  const handleCSVUpload = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setProgressSteps([
      { title: "CSV Data Ingestion", status: "running", detail: "Uploading CSV to FastAPI backend..." }
    ]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Upload failed.");
      }

      const data = await response.json();

      // Fetch the actual rows from the backend SQLite database to keep client-side engine synced
      let actualRows = [];
      try {
        const rowsResponse = await fetch(`http://localhost:8000/api/tables/${data.table}/rows`);
        if (rowsResponse.ok) {
          const rowsData = await rowsResponse.json();
          if (rowsData.success) {
            actualRows = rowsData.data;
          }
        }
      } catch (err) {
        console.error("Failed to fetch rows for synchronization:", err);
      }

      setDbState(prev => ({
        ...prev,
        [data.table]: actualRows
      }));

      const newTableSchema = {
        table: data.table,
        description: `User-uploaded dataset '${data.fileName}' with ${data.rowCount} records.`,
        columns: data.columns.map(h => ({
          name: h,
          type: "VARCHAR",
          description: `User column ${h}`
        }))
      };

      setCustomSchema([newTableSchema]);

      setActiveTable({
        name: data.table,
        fileName: data.fileName,
        rowCount: data.rowCount,
        columns: data.columns
      });

      setChatMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `📁 **Dataset Registered on SQLite Backend!**
* **Table Name:** \`${data.table}\`
* **Source File:** \`${data.fileName}\`
* **Fulfillment Size:** ${data.rowCount} rows loaded in SQLite.
* **Fields Detected:** ${data.columns.map(h => `\`${h}\``).join(', ')}

ChromaDB has indexed the columns and descriptions. Ask a question about this data using the prompt box below!`
        }
      ]);
    } catch (err) {
      alert(`CSV Ingestion Failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Pre-load demo dataset helper (generates CSV blob client-side and uploads)
  const loadDemoData = () => {
    const demoRows = [
      { product_segment: "Enterprise SaaS", sales_region: "North America", units_sold: 450, total_revenue: 13500.00, client_satisfaction: 4.8 },
      { product_segment: "API Connectors", sales_region: "APAC", units_sold: 720, total_revenue: 7200.00, client_satisfaction: 4.5 },
      { product_segment: "Cloud Security Suite", sales_region: "Europe", units_sold: 210, total_revenue: 16800.00, client_satisfaction: 4.9 },
      { product_segment: "Enterprise SaaS", sales_region: "Europe", units_sold: 380, total_revenue: 11400.00, client_satisfaction: 4.6 },
      { product_segment: "API Connectors", sales_region: "North America", units_sold: 900, total_revenue: 9000.00, client_satisfaction: 4.2 },
      { product_segment: "Cloud Security Suite", sales_region: "APAC", units_sold: 150, total_revenue: 12000.00, client_satisfaction: 4.7 }
    ];

    const headers = Object.keys(demoRows[0]);
    const csvContent = [
      headers.join(","),
      ...demoRows.map(row => headers.map(h => `"${row[h]}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], "enterprise_demo.csv", { type: "text/csv" });
    handleCSVUpload(file);
  };

  // Execute Pipeline Query
  const handleQuery = async (queryText) => {
    if (!queryText.trim() || !activeTable) return;
    
    setIsProcessing(true);
    setProgressSteps([]);
    setQueryInput('');

    // Append user message
    const userMsgId = Date.now().toString();
    setChatMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: queryText }
    ]);

    try {
      const responseState = await runAgentPipeline(
        queryText, 
        apiKey, 
        setProgressSteps, 
        dbState, 
        customSchema
      );
      
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          sql: responseState.sql,
          results: responseState.results,
          insights: responseState.insights,
          steps: responseState.steps
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          error: err.message,
          steps: progressSteps
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col justify-between h-[calc(100vh-140px)] relative font-sans-landing">
      
      {/* Settings Panel Toggle */}
      <button 
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-0 right-0 p-2 border border-neutral-200 hover:bg-neutral-50 rounded-xl transition bg-white shadow-sm z-20 cursor-pointer text-neutral-500 hover:text-black"
        title="xAI Credentials API Settings"
      >
        <Settings className="h-4.5 w-4.5 animate-pulse-slow" />
      </button>

      {/* Floating Settings Popover Modal */}
      {showSettings && (
        <div className="absolute top-12 right-0 w-80 bg-white border border-neutral-200/90 shadow-2xl rounded-2xl p-5 z-30 animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-violet-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">xAI API Key Configuration</span>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="xai-xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 focus:bg-white font-mono shadow-inner text-neutral-800"
            />
            <p className="text-[10px] text-neutral-400 leading-relaxed font-normal">
              Enter your Grok API key. Stored locally inside sandbox memory, directly communicating with xAI servers.
            </p>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto px-2 py-6 space-y-6">
        
        {/* Empty Welcome Screen (Hidden once dataset is loaded) */}
        {!activeTable && chatMessages.length === 1 ? (
          <div className="h-full flex flex-col justify-center items-center max-w-xl mx-auto text-center space-y-6 animate-fade-in pt-12">
            <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-md border border-neutral-200/60 font-mono text-xl font-bold text-black select-none">
              q
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 leading-tight">QueryFlow NLP Workspace</h2>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed font-normal">
                Feed in a CSV table or load the demo dataset, then query metrics using conversational instructions.
              </p>
            </div>
          </div>
        ) : (
          
          // Chat Thread Content
          <div className="space-y-6">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl rounded-2xl px-5 py-4 ${
                  msg.role === 'user' 
                    ? 'bg-neutral-900 text-white shadow-sm text-sm font-normal' 
                    : 'bg-white border border-neutral-200/80 text-neutral-800 shadow-sm space-y-4'
                }`}>
                  
                  {/* Assistant Text */}
                  {msg.content && (
                    <div className="prose prose-neutral text-sm leading-relaxed whitespace-pre-wrap font-normal">
                      {msg.content}
                    </div>
                  )}

                  {/* Visualizer Insights */}
                  {msg.insights && (
                    <div className="space-y-5">
                      
                      {/* Narration summary */}
                      <div className="border-t border-neutral-100 pt-4">
                        <div className="font-semibold text-violet-600 flex items-center gap-2 mb-2 text-xs uppercase tracking-wider">
                          <Sparkles className="h-3.5 w-3.5" /> Analytical Summary
                        </div>
                        <div className="text-neutral-600 leading-relaxed text-xs whitespace-pre-wrap font-normal">
                          {msg.insights.summary}
                        </div>
                      </div>

                      {/* Query Results Table */}
                      {msg.results && msg.results.length > 0 && (
                        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/60">
                          <h4 className="text-[10px] font-bold uppercase text-neutral-500 mb-3 tracking-wider flex items-center gap-1.5">
                            <Database className="h-3.5 w-3.5 text-violet-500" />
                            Query Results ({msg.results.length} rows)
                          </h4>
                          <div className="max-h-60 overflow-auto rounded-lg border border-neutral-200 bg-white">
                            <table className="w-full text-left border-collapse text-[10px] text-neutral-700">
                              <thead className="sticky top-0 bg-neutral-50 z-10 border-b border-neutral-200">
                                <tr>
                                  {Object.keys(msg.results[0] || {}).map(k => (
                                    <th key={k} className="p-2 text-neutral-500 capitalize font-semibold tracking-wider bg-neutral-50">{k}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {msg.results.map((row, i) => (
                                  <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                                    {Object.values(row).map((val, j) => (
                                      <td key={j} className="p-2 font-normal">{val !== null ? String(val) : 'NULL'}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SQL Code Block */}
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                            <Terminal className="h-3.5 w-3.5 text-violet-500" /> Compiled SQL Query
                          </span>
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => copyText(msg.sql)}
                              className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black bg-white px-2.5 py-1 rounded-full border border-neutral-200 transition cursor-pointer"
                            >
                              Copy
                            </button>
                            <button 
                              onClick={() => navigate(`/explorer/${activeTable.name}`, { state: { sql: msg.sql } })}
                              className="text-[9px] font-bold uppercase tracking-wider text-violet-600 hover:text-white hover:bg-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-200 transition cursor-pointer"
                            >
                              Try Query Yourself
                            </button>
                          </div>
                        </div>
                        <pre className="text-[10px] text-neutral-800 font-mono overflow-x-auto p-2.5 rounded bg-white border border-neutral-200/60">
                          {msg.sql}
                        </pre>
                      </div>

                    </div>
                  )}

                  {/* Syntax Fallbacks */}
                  {msg.error && (
                    <div className="mt-2 p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-rose-600 text-xs animate-fade-in">
                      <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-500" />
                      <div>
                        <h4 className="font-bold uppercase tracking-wider text-[9px]">Query Failback Notice</h4>
                        <p className="mt-0.5 text-neutral-600 font-normal">{msg.error}</p>
                      </div>
                    </div>
                  )}

                  {/* Agent nodes tracking */}
                  {msg.steps && msg.steps.length > 0 && (
                    <div className="mt-3 border-t border-neutral-100 pt-3">
                      <details className="group">
                        <summary className="text-[9px] font-bold text-neutral-400 hover:text-neutral-700 cursor-pointer list-none flex items-center justify-between select-none uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3 transition group-open:rotate-90 text-neutral-400" />
                            View Agent Graph Traversal
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-[8px]">
                            {msg.steps.length} Nodes Resolved
                          </span>
                        </summary>
                        <div className="mt-3 pl-3 border-l border-violet-400/50 space-y-2.5 text-[11px]">
                          {msg.steps.map((s, idx) => (
                            <div key={idx} className="flex gap-2.5 items-start font-normal">
                              <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                                s.status === 'success' ? 'bg-emerald-500' :
                                s.status === 'error' ? 'bg-rose-500' : 'bg-violet-500'
                              }`} />
                              <div>
                                <div className="font-semibold text-neutral-700">{s.title}</div>
                                <div className="text-neutral-400 font-mono text-[9px] leading-relaxed break-all">{s.detail}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic execution loader */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 max-w-lg w-full shadow-sm animate-fade-in text-neutral-800">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="h-3.5 w-3.5 text-violet-600 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">QueryFlow Agent Pipeline Running</span>
              </div>
              
              <div className="space-y-2.5 text-[11px]">
                {progressSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="shrink-0 mt-0.5">
                      {step.status === 'running' && (
                        <div className="h-3 w-3 rounded-full border border-violet-600 border-t-transparent animate-spin" />
                      )}
                      {step.status === 'success' && (
                        <div className="h-3 w-3 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[7px]">✓</div>
                      )}
                      {step.status === 'error' && (
                        <div className="h-3 w-3 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[7px]">✗</div>
                      )}
                    </div>
                    <div>
                      <div className={step.status === 'running' ? 'text-violet-600 font-semibold' : 'text-neutral-700 font-semibold'}>
                        {step.title}
                      </div>
                      {step.detail && (
                        <p className="text-[9px] text-neutral-400 mt-0.5 leading-normal font-mono">{step.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Double Input Control Station at the Bottom */}
      <div className="w-full bg-white border border-neutral-200/80 shadow-lg rounded-2xl p-4 space-y-4 shrink-0 z-10">
        
        {/* Input 1: Data Ingest Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            {!activeTable ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-neutral-300 hover:border-neutral-500 rounded-xl bg-neutral-50 hover:bg-neutral-100/50 cursor-pointer transition text-xs font-semibold text-neutral-700 shadow-inner">
                  <Upload className="h-4 w-4 text-neutral-500" />
                  <span>Choose CSV File</span>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => handleCSVUpload(e.target.files[0])}
                    className="hidden" 
                  />
                </label>
                <button 
                  onClick={loadDemoData}
                  className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-xl transition text-xs font-semibold text-neutral-500 hover:text-black cursor-pointer bg-white"
                >
                  Or Try Demo Dataset
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 border border-neutral-200/60 rounded-xl max-w-md animate-fade-in shadow-inner">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-violet-600 shrink-0 animate-pulse-slow" />
                  <span className="text-xs font-medium text-neutral-800 truncate">
                    Loaded: <code className="font-mono text-neutral-900 bg-neutral-200/50 px-1 py-0.5 rounded">{activeTable.fileName}</code> ({activeTable.rowCount} rows)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={() => window.open(`#/explorer/${activeTable.name}`, '_blank')}
                    className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-violet-600 transition cursor-pointer"
                    title="View entire CSV dataset in new tab"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={resetWorkspace}
                    className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                    title="Remove data and upload new CSV"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

              </div>
            )}
          </div>
          <div className="hidden sm:block text-[10px] text-neutral-400 font-semibold select-none bg-neutral-100 border border-neutral-200/40 rounded-lg px-2.5 py-1">
            CSV DATA INGEST
          </div>
        </div>

        <hr className="border-neutral-100" />

        {/* Input 2: Prompt Query Row */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleQuery(queryInput);
          }}
          className="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-1.5 shadow-inner"
        >
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={
              activeTable 
                ? `Enter natural language query on '${activeTable.name}' dataset attributes...` 
                : "Please feed in a CSV file or load demo dataset above first..."
            }
            disabled={isProcessing || !activeTable}
            className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm py-2.5 px-3 disabled:opacity-60 text-neutral-800 placeholder-neutral-400"
          />
          <button
            type="submit"
            disabled={isProcessing || !queryInput.trim() || !activeTable}
            className="p-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-lg transition cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

      </div>

    </div>
  );
}
