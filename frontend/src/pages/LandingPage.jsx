import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Code, RefreshCw, Terminal } from 'lucide-react';
import heroImage from '../assets/image.png';

export default function LandingPage() {
  const handleScrollToFeatures = (e) => {
    e.preventDefault();
    const element = document.getElementById('features-list');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full bg-white text-neutral-800 flex flex-col font-sans-landing">
      
      {/* 1. HERO SECTION (100VH VIEWPORT HEIGHT) */}
      <section className="relative w-full min-h-screen pt-24 pb-20 px-8 bg-gradient-to-b from-[#f8f9fa] to-white overflow-hidden flex flex-col justify-center items-center border-b border-neutral-100">
        
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20 items-center z-10">
          
          {/* Left Column: Headline */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-[52px] font-semibold tracking-tight text-neutral-900 leading-[1.15] max-w-xl mx-auto lg:mx-0">
              <span className="font-serif-italic font-semibold text-black block mb-2 lowercase tracking-normal">queryflow</span> 
              is an intelligent agent converting natural language to SQL & <span className="font-serif-italic text-violet-600 font-semibold block mt-1 tracking-normal">compiling data insights</span>
            </h1>
          </div>

          {/* Right Column: Premium Mockup Image */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              <img 
                src={heroImage} 
                alt="QueryFlow Dashboard Preview" 
                className="w-full h-auto rounded-2xl border border-neutral-200/60 shadow-xl hover:scale-[1.01] transition-transform duration-300"
              />
            </div>
          </div>

        </div>
      </section>

      {/* 2. FEATURES & DESCRIPTION SECTION (BELOW THE FOLD) */}
      <section id="features" className="w-full py-32 px-8 bg-[#fbfcfd] flex flex-col items-center">
        <div className="max-w-5xl w-full space-y-24">
          
          {/* Pushed Project Description & CTAs (Not visible on initial 100vh page) */}
          <div className="max-w-3xl space-y-8 text-left">
            <p className="text-lg md:text-xl font-normal leading-relaxed text-neutral-600">
              Empower your projects with conversational SQLite querying, local vector-based schema RAG, and an automated self-healing query pipeline. Zero SQL complexity.
            </p>

            <div className="pt-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 bg-black text-white hover:bg-neutral-800 text-sm font-bold uppercase tracking-wider rounded-xl transition duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <span>get started</span>
                <span className="ml-3 text-base">→</span>
              </Link>
            </div>
          </div>

          <hr className="border-neutral-200/60" />

          {/* Premium Cards Grid Section */}
          <div id="features-list" className="space-y-12">
            <div className="text-left space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">
                What do you get?
              </h2>
              <p className="text-sm text-neutral-500 font-normal">
                Everything you need to dynamically search and analyze uploaded CSV data.
              </p>
            </div>

            {/* 2-Column Dark Glassmorphic Card Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              
              {/* Card 1: Self-Healing SQL Copilot */}
              <div className="relative overflow-hidden rounded-[28px] bg-[#0d0d11]/92 backdrop-blur-lg border border-white/[0.08] shadow-2xl flex flex-col justify-between p-6 hover:scale-[1.01] transition-transform duration-300 min-h-[350px]">
                <div className="space-y-4">
                  <div className="h-10 w-10 shrink-0 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-violet-400">
                    <Code className="h-5 w-5" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Self-Healing AI Agent</h3>
                    <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                      Translates natural language to SQLite queries via a LangGraph agent workflow. Automatically runs ChromaDB schema index discovery and self-corrects syntax or schema errors with up to 3 execution retries.
                    </p>
                  </div>
                </div>

                <div className="space-y-5 pt-4">
                  <div className="flex gap-2 font-mono">
                    <span className="bg-white/10 text-white/90 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/[0.04]">
                      LangGraph
                    </span>
                    <span className="bg-white/10 text-white/90 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/[0.04]">
                      ChromaDB RAG
                    </span>
                    <span className="bg-white/10 text-white/90 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/[0.04]">
                      Auto-Retry
                    </span>
                  </div>

                  <Link
                    to="/dashboard"
                    className="block w-full bg-white hover:bg-neutral-200 text-black text-center font-bold text-[10px] uppercase tracking-widest rounded-full py-3.5 transition-colors shadow-sm"
                  >
                    Launch Workspace
                  </Link>
                </div>
              </div>

              {/* Card 2: SQL Sandbox & Inspector */}
              <div className="relative overflow-hidden rounded-[28px] bg-[#0d0d11]/92 backdrop-blur-lg border border-white/[0.08] shadow-2xl flex flex-col justify-between p-6 hover:scale-[1.01] transition-transform duration-300 min-h-[350px]">
                <div className="space-y-4">
                  <div className="h-10 w-10 shrink-0 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-violet-400">
                    <Terminal className="h-5 w-5" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">SQL Sandbox & Inspector</h3>
                    <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                      Upload custom CSV files to search and filter row records in a dynamic spreadsheet view, download query results, and execute raw SELECT statements directly inside an interactive SQL console.
                    </p>
                  </div>
                </div>

                <div className="space-y-5 pt-4">
                  <div className="flex gap-2 font-mono">
                    <span className="bg-white/10 text-white/90 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/[0.04]">
                      SQL Editor
                    </span>
                    <span className="bg-white/10 text-white/90 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/[0.04]">
                      Table Browser
                    </span>
                    <span className="bg-white/10 text-white/90 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/[0.04]">
                      CSV Ingestion
                    </span>
                  </div>

                  <Link
                    to="/dashboard"
                    className="block w-full bg-white hover:bg-neutral-200 text-black text-center font-bold text-[10px] uppercase tracking-widest rounded-full py-3.5 transition-colors shadow-sm"
                  >
                    Launch Workspace
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
