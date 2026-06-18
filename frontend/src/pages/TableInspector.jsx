import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Database, Search, ArrowLeft, RefreshCw, FileSpreadsheet, Download, Terminal, Play, CheckCircle } from 'lucide-react';
import { executeSQL } from '../utils/sqlEngine.js';

export default function TableInspector({ dbState }) {
  const { tableName } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // SQL Editor States
  const location = useLocation();
  const initialSql = location.state?.sql || `SELECT * FROM ${tableName} LIMIT 10`;
  const [editorSql, setEditorSql] = useState(initialSql);
  const [editorResult, setEditorResult] = useState(null);
  const [editorError, setEditorError] = useState(null);

  // Sync editor query when route state changes
  useEffect(() => {
    if (location.state?.sql) {
      setEditorSql(location.state.sql);
      setEditorResult(null);
      setEditorError(null);
    } else {
      setEditorSql(`SELECT * FROM ${tableName} LIMIT 10`);
      setEditorResult(null);
      setEditorError(null);
    }
  }, [tableName, location.state?.sql]);

  const handleRunQuery = () => {
    setEditorError(null);
    setEditorResult(null);
    
    const runDbState = dbState && dbState[tableName] ? dbState : { [tableName]: rows };
    const result = executeSQL(editorSql, runDbState);
    if (result.success) {
      setEditorResult(result);
    } else {
      setEditorError(result.error);
    }
  };

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/tables/${tableName}/rows`);
      if (!response.ok) {
        throw new Error(`Failed to load data for table '${tableName}'.`);
      }
      const res = await response.json();
      if (res.success) {
        setRows(res.data);
      } else {
        throw new Error(res.detail || "Unknown error occurred.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [tableName]);

  // Search Filter logic
  const filteredRows = rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Export to CSV client-side helper
  const downloadCSV = () => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${String(row[h] !== null ? row[h] : '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${tableName}_dataset.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6 w-full animate-fade-in relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-black transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md border border-neutral-200/50">
                <FileSpreadsheet className="h-5 w-5 text-violet-600 animate-pulse-slow" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 leading-none capitalize">
                  {tableName ? tableName.replace(/_/g, ' ') : 'Table'}
                </h1>
                <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                  <Database className="h-3 w-3 text-neutral-300" /> Dynamic SQLite Ingest
                </p>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchRows}
              disabled={loading}
              className="p-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl bg-white transition cursor-pointer text-neutral-500 hover:text-black disabled:opacity-50"
              title="Reload data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={downloadCSV}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
            >
              <Download className="h-4 w-4" /> Download CSV
            </button>
          </div>
        </div>

        {/* Filters and Counters Panel */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table rows..."
              className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-violet-500 focus:bg-white shadow-inner placeholder-neutral-400"
            />
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold text-neutral-500 bg-neutral-50 border border-neutral-200/50 px-4 py-2.5 rounded-xl">
            <div>Columns: <span className="text-neutral-800">{columns.length}</span></div>
            <div className="h-4 w-px bg-neutral-200" />
            <div>
              Rows: <span className="text-neutral-800">
                {searchQuery ? `${filteredRows.length} of ${rows.length}` : rows.length}
              </span>
            </div>
          </div>
        </div>

        {/* Main Table Grid Card */}
        <div className="flex-1 bg-white border border-neutral-200/85 rounded-2xl shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between">
          
          {loading ? (
            <div className="flex-1 flex flex-col justify-center items-center py-20 space-y-3">
              <RefreshCw className="h-8 w-8 text-violet-600 animate-spin" />
              <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Loading records from SQLite...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col justify-center items-center py-20 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900">Unable to load table</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-normal">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center py-20 text-center space-y-2">
              <p className="text-sm font-medium text-neutral-800">No records found</p>
              <p className="text-xs text-neutral-400 font-normal">This table appears to be empty.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto max-h-[calc(100vh-320px)] scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs text-neutral-700 relative">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-200 sticky top-0 backdrop-blur-md z-10">
                    {columns.map((col) => (
                      <th 
                        key={col} 
                        className="px-4 py-3.5 text-neutral-500 font-bold uppercase tracking-wider text-[10px] border-r border-neutral-100/50 last:border-r-0"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b border-neutral-100 hover:bg-neutral-50/40 transition-colors duration-75"
                    >
                      {columns.map((col) => {
                        const val = row[col];
                        const isNumber = typeof val === 'number';
                        return (
                          <td 
                            key={col} 
                            className={`px-4 py-3 border-r border-neutral-100/30 last:border-r-0 font-normal ${
                              isNumber ? 'font-mono text-right text-violet-700' : 'text-neutral-800'
                            }`}
                          >
                            {val !== null ? String(val) : <span className="text-neutral-300 italic text-[10px]">NULL</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      {/* SQL Editor Section */}
      <div className="bg-white border border-neutral-200/85 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4.5 w-4.5 text-violet-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800">Interactive SQL Editor</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Sandbox Mode (SELECT only)
          </span>
        </div>

        <textarea
          value={editorSql}
          onChange={(e) => setEditorSql(e.target.value)}
          className="w-full h-28 p-4 font-mono text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:border-violet-500 text-emerald-400 focus:outline-none leading-relaxed shadow-inner"
          placeholder="SELECT * FROM table ..."
        />

        <div className="flex justify-between items-center">
          <p className="text-[10px] text-neutral-400 font-medium">
            Execute queries against the active SQLite database structure.
          </p>
          <button
            onClick={handleRunQuery}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-md"
          >
            <Play className="h-3.5 w-3.5" /> Execute Query
          </button>
        </div>

        {/* SQL Error Banner */}
        {editorError && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-mono whitespace-pre-wrap">
            <strong>SQL Error:</strong> {editorError}
          </div>
        )}

        {/* SQL Execution Data Result Grid */}
        {editorResult && (
          <div className="border border-neutral-200/85 rounded-xl overflow-hidden bg-white mt-4 animate-fade-in shadow-inner">
            <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200/80 flex items-center justify-between text-xs font-semibold text-neutral-600">
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold uppercase text-[10px] tracking-wider">
                <CheckCircle className="h-4 w-4" /> Query Successful
              </span>
              <span className="text-neutral-400 font-semibold">{editorResult.rowCount} rows returned</span>
            </div>
            <div className="max-h-[300px] overflow-auto scrollbar-thin">
              {editorResult.rowCount === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  Empty result set. No rows matched the query.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs text-neutral-700 relative">
                  <thead>
                    <tr className="bg-neutral-50/55 border-b border-neutral-200 sticky top-0 backdrop-blur-md z-10">
                      {Object.keys(editorResult.data[0] || {}).map((col) => (
                        <th key={col} className="px-4 py-3 text-neutral-500 font-bold uppercase tracking-wider text-[10px] border-r border-neutral-100/50 last:border-r-0 bg-neutral-50/90">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editorResult.data.map((row, idx) => (
                      <tr key={idx} className="border-b border-neutral-100 hover:bg-neutral-50/40 transition-colors duration-75">
                        {Object.values(row).map((val, j) => {
                          const isNumber = typeof val === 'number';
                          return (
                            <td key={j} className={`px-4 py-2.5 border-r border-neutral-100/30 last:border-r-0 font-normal ${
                              isNumber ? 'font-mono text-right text-violet-700' : 'text-neutral-800'
                            }`}>
                              {val !== null ? String(val) : <span className="text-neutral-300 italic text-[10px]">NULL</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

  );
}
