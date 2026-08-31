import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Lock, 
  ShieldAlert, 
  Camera
} from 'lucide-react';
import { AdminUser, ToolId } from '../types';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  adminUser: AdminUser | null;
  onOpenAdminModal: () => void;
  onSelectTool?: (toolId: ToolId) => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  adminUser,
  onOpenAdminModal,
  onSelectTool,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                Open<span className="text-rose-600 dark:text-rose-500">PDF</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck className="w-3 h-3" />
                100% In-Browser
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Client-Side PDF Suite • Zero Uploads
            </p>
          </div>
        </Link>

        {/* Right Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Scanner Action */}
          {onSelectTool ? (
            <button
              onClick={() => onSelectTool('scanner')}
              aria-label="Camera Document Scanner"
              title="Camera Document Scanner"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-rose-500/50 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-rose-500" />
            </button>
          ) : (
            <Link
              to="/scan-pdf"
              aria-label="Camera Document Scanner"
              title="Camera Document Scanner"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-rose-500/50 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-rose-500" />
            </Link>
          )}

          {/* Theme Toggle Button */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleDarkMode}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-rose-500/50 cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />}
          </button>

          {/* Admin Login Button - Simple Icon Button with no text */}
          <button
            id="header-admin-login-btn"
            onClick={onOpenAdminModal}
            aria-label={adminUser ? `Admin Dashboard (${adminUser.role})` : 'Admin Login'}
            title={adminUser ? `Admin Dashboard (${adminUser.role})` : 'Admin Login'}
            className={`p-2 rounded-xl transition-all focus:outline-hidden focus:ring-2 focus:ring-rose-500/50 cursor-pointer ${
              adminUser
                ? 'bg-purple-600/10 text-purple-600 dark:text-purple-400 hover:bg-purple-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {adminUser ? (
              <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
