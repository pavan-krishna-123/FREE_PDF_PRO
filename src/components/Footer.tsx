import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldCheck, Heart, Lock } from 'lucide-react';
import { ToolId } from '../types';

interface FooterProps {
  onSelectTool?: (toolId: ToolId) => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTool, onOpenAdmin }) => {
  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
                <FileText className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                Open<span className="text-rose-600 dark:text-rose-500">PDF</span>
              </span>
            </Link>
            
            <p className="text-xs leading-relaxed max-w-sm">
              The 100% private, client-side PDF suite. Merge, split, compress, protect, sign, and edit documents in your browser with zero remote file storage.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/60">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-Server Upload Guarantee</span>
            </div>
          </div>

          {/* Core Tools Column */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Core PDF Tools
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/merge-pdf" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Merge PDF
                </Link>
              </li>
              <li>
                <Link to="/split-pdf" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Split PDF
                </Link>
              </li>
              <li>
                <Link to="/compress-pdf" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Compress PDF
                </Link>
              </li>
              <li>
                <Link to="/protect-pdf" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Protect PDF
                </Link>
              </li>
              <li>
                <Link to="/unlock-pdf" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Unlock PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Page Manipulation Column */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Page Utilities & Admin
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/sign-pdf" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Sign Document
                </Link>
              </li>
              <li>
                <Link to="/scan-pdf" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Camera Scanner
                </Link>
              </li>
              <li>
                <Link to="/rotate-pdf" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Rotate PDF
                </Link>
              </li>
              <li>
                <Link to="/reorder-pdf" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Reorder Pages
                </Link>
              </li>
              <li>
                <Link to="/delete-pdf-pages" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  Delete Pages
                </Link>
              </li>
              <li className="pt-1">
                <button onClick={onOpenAdmin} className="inline-flex items-center gap-1 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer">
                  <Lock className="w-3 h-3" />
                  <span>Admin Telemetry Portal</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} OpenPDF. 100% Free & In-Browser PDF Suite.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 mx-0.5" /> for privacy
            </span>
            <span className="font-mono text-[11px] text-slate-400">v2.4.0</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
