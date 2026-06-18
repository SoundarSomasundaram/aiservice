import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Import Pages
import LandingPage from './pages/LandingPage.jsx';
import ChatWorkspace from './pages/ChatWorkspace.jsx';
import SchemaBlueprint from './pages/SchemaBlueprint.jsx';
import SqlPlayground from './pages/SqlPlayground.jsx';
import TableExplorer from './pages/TableExplorer.jsx';
import TableInspector from './pages/TableInspector.jsx';
import Credentials from './pages/Credentials.jsx';

// Import Components
import FloatingNav from './components/FloatingNav.jsx';

// Import Mock DB
import { initialTables } from './utils/db.js';

export default function App() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  // Shared Application State
  const [dbState, setDbState] = useState(initialTables);

  // Synchronize database schemas and rows from backend SQLite on mount
  useEffect(() => {
    const syncDatabase = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/tables");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.tables) {
          const syncedState = { ...initialTables };
          for (const table of data.tables) {
            try {
              const rowsRes = await fetch(`http://localhost:8000/api/tables/${table.name}/rows`);
              if (rowsRes.ok) {
                const rowsData = await rowsRes.json();
                if (rowsData.success) {
                  syncedState[table.name] = rowsData.data;
                }
              }
            } catch (err) {
              console.error(`Failed to sync rows for table ${table.name}:`, err);
            }
          }
          setDbState(syncedState);
        }
      } catch (error) {
        console.error("Failed to sync database from SQLite backend:", error);
      }
    };
    syncDatabase();
  }, []);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GROK_API_KEY') || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressSteps, setProgressSteps] = useState([]);

  // Persisted Active Table and Custom Schema State
  const [activeTable, setActiveTable] = useState(() => {
    const saved = localStorage.getItem('ACTIVE_TABLE');
    return saved ? JSON.parse(saved) : null;
  });

  const [customSchema, setCustomSchema] = useState(() => {
    const saved = localStorage.getItem('CUSTOM_SCHEMA');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (activeTable) {
      localStorage.setItem('ACTIVE_TABLE', JSON.stringify(activeTable));
    } else {
      localStorage.removeItem('ACTIVE_TABLE');
    }
  }, [activeTable]);

  useEffect(() => {
    if (customSchema && customSchema.length > 0) {
      localStorage.setItem('CUSTOM_SCHEMA', JSON.stringify(customSchema));
    } else {
      localStorage.removeItem('CUSTOM_SCHEMA');
    }
  }, [customSchema]);
  
  // Chat Messages State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to the Enterprise Data Intelligence Copilot.

I am your AI Principal Data Architect & Business Intelligence agent. I translate natural language questions into accurate SQL, execute them safely on your database, analyze findings, and generate interactive visualizations.

Try one of the suggested enterprise queries below or ask your own question.`,
      isWelcome: true
    }
  ]);

  // SQL Playground State
  const [playgroundSql, setPlaygroundSql] = useState(
    "SELECT name, price, cost FROM products WHERE price > 400"
  );
  const [playgroundResult, setPlaygroundResult] = useState(null);
  const [playgroundError, setPlaygroundError] = useState(null);

  // Save API Key helper
  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('GROK_API_KEY', key);
  };

  return (
    <div className="min-h-screen w-screen bg-white text-neutral-800 flex flex-col overflow-x-hidden font-sans-landing">
      
      {/* Dynamic Floating Navigation Header */}
      <FloatingNav />

      {/* Main Dynamic Viewport */}
      {isLanding ? (
        // Render Landing Page directly (no wrapper container needed)
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        // Dashboard Pages Content Area
        <div className="relative w-full flex-1 flex flex-col items-center bg-[#f8f9fa]">
          {/* Top Hero-style Light Gradient */}
          <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-[#eef2f6]/60 to-transparent pointer-events-none z-0" />
          
          <main className="relative z-10 flex-1 w-full max-w-6xl py-8 px-6 flex flex-col justify-between">
            <Routes>
              <Route 
                path="/dashboard" 
                element={
                  <ChatWorkspace 
                    dbState={dbState}
                    setDbState={setDbState}
                    apiKey={apiKey}
                    saveApiKey={saveApiKey}
                    chatMessages={chatMessages}
                    setChatMessages={setChatMessages}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    progressSteps={progressSteps}
                    setProgressSteps={setProgressSteps}
                    setPlaygroundSql={setPlaygroundSql}
                    activeTable={activeTable}
                    setActiveTable={setActiveTable}
                    customSchema={customSchema}
                    setCustomSchema={setCustomSchema}
                  />
                } 
              />
              <Route path="/explorer/:tableName" element={<TableInspector dbState={dbState} />} />
              {/* Catch-all redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Routes>
          </main>
        </div>
      )}

    </div>
  );
}
