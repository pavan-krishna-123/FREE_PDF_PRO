import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Combine, 
  Scissors, 
  Minimize2, 
  Lock, 
  Unlock, 
  PenTool, 
  Camera, 
  RotateCw, 
  FileOutput, 
  ListOrdered, 
  Trash2, 
  Search, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Zap,
  HardDrive,
  FileCheck,
  ExternalLink
} from 'lucide-react';
import { PDF_TOOLS } from '../data/toolsData';
import { TOOL_ID_TO_SLUG } from '../data/seoData';
import { ToolId, ToolCategory } from '../types';

interface ToolGridProps {
  onSelectTool: (toolId: ToolId) => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Combine,
  Scissors,
  Minimize2,
  Lock,
  Unlock,
  PenTool,
  Camera,
  RotateCw,
  FileOutput,
  ListOrdered,
  Trash2,
};

export const ToolGrid: React.FC<ToolGridProps> = ({
  onSelectTool,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = PDF_TOOLS.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesQuery = 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div id="tools-suite" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Website Main Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-rose-950 text-white p-8 sm:p-12 shadow-2xl border border-slate-700/60">
        
        {/* Glow orb */}
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6 max-w-3xl">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Client-Side Private PDF Suite</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Every PDF Tool You Need. <br />
            <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Zero Server Uploads.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Merge, split, compress, protect, sign, rotate, and scan your documents locally within your browser. Enjoy total privacy, instant performance, and enterprise-grade encryption.
          </p>

          {/* Quick CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onSelectTool('merge')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 hover:shadow-xl transition-all cursor-pointer"
            >
              <Combine className="w-4 h-4" />
              <span>Merge PDFs</span>
            </button>

            <button
              onClick={() => onSelectTool('scanner')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 shadow-md transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Camera Scanner</span>
            </button>

            <button
              onClick={() => onSelectTool('sign')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 shadow-md transition-all cursor-pointer"
            >
              <PenTool className="w-4 h-4 text-pink-400" />
              <span>Sign Document</span>
            </button>
          </div>

          {/* Trust Highlights Strip */}
          <div className="pt-6 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% In-Memory</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Instant Local Speed</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>0 B Uploaded</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-rose-400 shrink-0" />
              <span>11 Complete Tools</span>
            </div>
          </div>

        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          
          {/* Category Pills */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60 w-full sm:w-auto">
            {(
              [
                { id: 'all', label: 'All Tools' },
                { id: 'core', label: 'Core Tools' },
                { id: 'manipulate', label: 'Page Editing' },
                { id: 'security', label: 'Security' },
                { id: 'capture', label: 'Camera & Scan' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                id={`cat-filter-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="tool-search-input"
              type="text"
              placeholder="Search PDF tools (e.g. merge, protect, sign)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/50 shadow-xs"
            />
          </div>

        </div>
      </div>

      {/* Material 3 Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredTools.map((tool) => {
          const IconComponent = ICON_MAP[tool.iconName] || FileOutput;
          const slug = TOOL_ID_TO_SLUG[tool.id] || tool.id;

          return (
            <div
              key={tool.id}
              id={`tool-card-${tool.id}`}
              className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-rose-400/60 dark:hover:border-rose-500/60 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div onClick={() => onSelectTool(tool.id)} className="cursor-pointer">
                {/* Top Row: Icon & Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.accentColor} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                    <IconComponent className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  {tool.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                      {tool.badge}
                    </span>
                  )}
                </div>

                {/* Tool Name */}
                <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  {tool.name}
                </h3>

                {/* Short Description */}
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                  {tool.shortDescription}
                </p>
              </div>

              {/* Bottom Action Strip */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => onSelectTool(tool.id)}
                  className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Launch Tool</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  to={`/${slug}`}
                  title={`View ${tool.name} SEO page & guide`}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <span>Guide</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-16 space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No PDF tools found matching "{searchQuery}".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

    </div>
  );
};
