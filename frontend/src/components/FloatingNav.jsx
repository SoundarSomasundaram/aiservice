import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

export default function FloatingNav() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const handleScrollToFeatures = (e) => {
    e.preventDefault();
    const element = document.getElementById('features-list');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLanding) {
    return (
      <header className="w-full px-8 py-8 bg-transparent absolute top-0 left-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo Badge (High contrast rounded box with shadow) */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/ww.png" 
              alt="QueryFlow Logo" 
              className="w-10 h-10 object-contain transition-all duration-300 group-hover:scale-105 rounded-xl"
            />
            <span className="font-extrabold text-sm tracking-widest text-black uppercase transition-colors duration-200 group-hover:text-neutral-600">
              QueryFlow
            </span>
          </Link>

          {/* Floating light-glassmorphic navigation pill */}
          <div className="flex items-center bg-white/95 border border-neutral-200/60 rounded-full px-3 py-1 backdrop-blur-lg shadow-sm gap-4">
            <a
              href="#features-list"
              onClick={handleScrollToFeatures}
              className="text-[10px] font-bold tracking-wider text-neutral-500 hover:text-black transition uppercase px-2 py-1"
            >
              Features
            </a>
            <Link
              to="/dashboard"
              className="bg-black text-white text-[9px] font-bold px-3.5 py-1.5 rounded-full hover:bg-neutral-800 transition uppercase tracking-wider"
            >
              Launch App
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // Dashboard Nav Header - Light mode unified style
  return (
    <header className="w-full px-8 py-6 bg-white/80 border-b border-neutral-200/60 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img 
            src="/ww.png" 
            alt="QueryFlow Logo" 
            className="w-10 h-10 object-contain transition-all duration-300 group-hover:scale-105 rounded-xl"
          />
          <span className="font-extrabold text-sm tracking-widest text-black uppercase transition-colors duration-200 group-hover:text-neutral-600">
            QueryFlow
          </span>
        </Link>

        {/* Back to Home Button */}
        <div>
          <Link
            to="/"
            className="text-[10px] font-bold tracking-wider text-neutral-500 hover:text-black transition uppercase px-4 py-2 border border-neutral-200 bg-white rounded-full shadow-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </header>
  );
}
