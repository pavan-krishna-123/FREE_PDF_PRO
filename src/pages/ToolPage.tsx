import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  FileText, 
  Lock, 
  Zap, 
  HardDrive,
  Home,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { TOOLS_SEO_MAP, SLUG_TO_TOOL_ID } from '../data/seoData';
import { PDF_TOOLS } from '../data/toolsData';
import { SeoMeta } from '../components/SeoMeta';
import { ToolId, OperationResult } from '../types';

// Tools
import { MergeTool } from '../components/tools/MergeTool';
import { SplitTool } from '../components/tools/SplitTool';
import { CompressTool } from '../components/tools/CompressTool';
import { ProtectTool } from '../components/tools/ProtectTool';
import { UnlockTool } from '../components/tools/UnlockTool';
import { SignTool } from '../components/tools/SignTool';
import { ScannerTool } from '../components/tools/ScannerTool';
import { RotateTool } from '../components/tools/RotateTool';
import { ExtractTool } from '../components/tools/ExtractTool';
import { ReorderTool } from '../components/tools/ReorderTool';
import { DeletePagesTool } from '../components/tools/DeletePagesTool';

interface ToolPageProps {
  onCompleteOperation: (result: OperationResult) => void;
}

export const ToolPage: React.FC<ToolPageProps> = ({ onCompleteOperation }) => {
  const { slug } = useParams<{ slug: string }>();
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [isToolOpen, setIsToolOpen] = useState(false);

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  const toolId = SLUG_TO_TOOL_ID[slug.toLowerCase()];
  const seoData = TOOLS_SEO_MAP[slug.toLowerCase()] || (toolId ? Object.values(TOOLS_SEO_MAP).find(t => t.id === toolId) : null);

  if (!toolId || !seoData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Page Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          The requested PDF tool page doesn't exist or has moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-md transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Browse All Free PDF Tools</span>
        </Link>
      </div>
    );
  }

  // Related tools (exclude current)
  const relatedTools = PDF_TOOLS.filter(t => t.id !== toolId).slice(0, 4);

  const handleOpenTool = () => {
    setIsToolOpen(true);
  };

  const handleCloseTool = () => {
    setIsToolOpen(false);
  };

  const handleComplete = (result: OperationResult) => {
    setIsToolOpen(false);
    onCompleteOperation(result);
  };

  return (
    <div className="w-full">
      <SeoMeta
        title={seoData.seoTitle}
        description={seoData.metaDescription}
        canonicalUrl={`https://free-pdf-pro.vercel.app/${seoData.slug}`}
        keywords={seoData.keywords}
      />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12">
        
        {/* Breadcrumbs Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
          <Link to="/" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
            PDF Tools
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
          <span className="text-slate-900 dark:text-slate-200 font-semibold">{seoData.name}</span>
        </nav>

        {/* Hero & Interactive Tool Launch Box */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-rose-950 text-white p-8 sm:p-12 shadow-2xl border border-slate-700/60">
          <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Free & Client-Side Private</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {seoData.h1}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              {seoData.subtitle}
            </p>

            {/* Launch Call-To-Action */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                id={`hero-launch-${seoData.slug}-btn`}
                onClick={handleOpenTool}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-base shadow-xl shadow-rose-600/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
              >
                <FileText className="w-5 h-5" />
                <span>{seoData.actionButtonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Files stay on your device • No uploads</span>
              </span>
            </div>

            {/* Trust Highlights */}
            <div className="pt-6 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero Server Uploads</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Instant In-Memory Speed</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Encrypted & Private</span>
              </div>
            </div>

          </div>
        </div>

        {/* Step-by-Step How-To Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-rose-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {seoData.howToTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {seoData.steps.map((step) => (
              <div
                key={step.number}
                className="relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-sm border border-rose-500/20">
                    {step.number}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Why Use OpenPDF for {seoData.name}?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {seoData.features.map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5"
              >
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-6">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-rose-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {seoData.faq.map((item, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-sm text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-rose-500' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 pt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Internal Linking: Related PDF Tools Grid */}
        <section className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Explore More Free PDF Tools
            </h2>
            <Link
              to="/"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <span>View All 11 Tools</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedTools.map((tool) => {
              const relatedSlug = Object.keys(SLUG_TO_TOOL_ID).find(s => SLUG_TO_TOOL_ID[s] === tool.id && s.includes('-pdf')) || tool.id;
              return (
                <Link
                  key={tool.id}
                  to={`/${relatedSlug}`}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500/60 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {tool.shortDescription}
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <span>Use Tool</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

      </div>

      {/* Active Interactive Tool Modal */}
      {isToolOpen && toolId === 'merge' && (
        <MergeTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'split' && (
        <SplitTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'compress' && (
        <CompressTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'protect' && (
        <ProtectTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'unlock' && (
        <UnlockTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'sign' && (
        <SignTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'scanner' && (
        <ScannerTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'rotate' && (
        <RotateTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'extract' && (
        <ExtractTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'reorder' && (
        <ReorderTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}
      {isToolOpen && toolId === 'delete_pages' && (
        <DeletePagesTool onClose={handleCloseTool} onComplete={handleComplete} />
      )}

    </div>
  );
};
