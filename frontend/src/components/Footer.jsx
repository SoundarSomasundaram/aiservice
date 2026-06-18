import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#060608] py-16 px-6 border-t border-[#131316]">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-left">
        
        <div className="space-y-4">
          <h4 className="font-bold text-neutral-300 text-xs uppercase tracking-wider">Company</h4>
          <ul className="space-y-2 text-xs text-neutral-500 font-normal">
            <li className="hover:text-neutral-300 transition cursor-pointer">About</li>
            <li className="hover:text-neutral-300 transition cursor-pointer">Careers</li>
            <li className="hover:text-neutral-300 transition cursor-pointer">Press</li>
            <li className="hover:text-neutral-300 transition cursor-pointer">Blog</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-neutral-300 text-xs uppercase tracking-wider">Offers</h4>
          <ul className="space-y-2 text-xs text-neutral-500 font-normal">
            <li className="hover:text-neutral-300 transition cursor-pointer">Data Security</li>
            <li className="hover:text-neutral-300 transition cursor-pointer">Enterprise</li>
            <li className="hover:text-neutral-300 transition cursor-pointer">Partnerships</li>
            <li className="hover:text-neutral-300 transition cursor-pointer">Custom RAG</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-neutral-300 text-xs uppercase tracking-wider">Help</h4>
          <ul className="space-y-2 text-xs text-neutral-500 font-normal">
            <li className="hover:text-neutral-300 transition cursor-pointer">FAQ</li>
            <li className="hover:text-neutral-300 transition cursor-pointer">Contact Us</li>
            <li className="hover:text-neutral-300 transition cursor-pointer">Terms</li>
            <li className="hover:text-neutral-300 transition cursor-pointer">Privacy</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-neutral-300 text-xs uppercase tracking-wider">AGIS Platform</h4>
          <p className="text-xs text-neutral-500 font-normal leading-relaxed">
            Leading conversational intelligence agent for secure relational database querying and dashboard synthesis.
          </p>
        </div>

      </div>

      <div className="max-w-6xl mx-auto border-t border-[#131316] pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-600 gap-4">
        <span>Copyright &copy; 2026 AGIS. All rights reserved.</span>
        <div className="flex gap-6">
          <span className="hover:text-neutral-400 transition cursor-pointer">GitHub</span>
          <span className="hover:text-neutral-400 transition cursor-pointer">LinkedIn</span>
        </div>
      </div>
    </footer>
  );
}
