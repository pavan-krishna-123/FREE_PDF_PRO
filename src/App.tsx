import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { OperationResultModal } from './components/OperationResultModal';
import { AdminModal } from './components/admin/AdminModal';
import { ScrollToTop } from './components/ScrollToTop';
import { HomePage } from './pages/HomePage';
import { ToolPage } from './pages/ToolPage';
import { Wrench, ShieldAlert } from 'lucide-react';

// Tools (Modal Launcher on Homepage)
import { MergeTool } from './components/tools/MergeTool';
import { SplitTool } from './components/tools/SplitTool';
import { CompressTool } from './components/tools/CompressTool';
import { ProtectTool } from './components/tools/ProtectTool';
import { UnlockTool } from './components/tools/UnlockTool';
import { SignTool } from './components/tools/SignTool';
import { ScannerTool } from './components/tools/ScannerTool';
import { RotateTool } from './components/tools/RotateTool';
import { ExtractTool } from './components/tools/ExtractTool';
import { ReorderTool } from './components/tools/ReorderTool';
import { DeletePagesTool } from './components/tools/DeletePagesTool';

import { ToolId, OperationResult, AdminUser } from './types';
import { AdminService } from './services/adminService';
import { subscribeToAdminSettings } from './services/firebase';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('openpdf_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Initialize Dark Mode Class on root HTML and persist preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('openpdf_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('openpdf_theme', 'light');
    }
  }, [darkMode]);

  // Real-time listener for Firestore Admin Settings (Maintenance Mode)
  useEffect(() => {
    const unsubSettings = subscribeToAdminSettings((settings) => {
      setMaintenanceMode(settings.maintenanceMode);
    });
    return unsubSettings;
  }, []);

  // Load active admin session if present & setup auto-logout listener
  useEffect(() => {
    const user = AdminService.getCurrentAdmin();
    setAdminUser(user);

    const cleanup = AdminService.initSessionListener(() => {
      setAdminUser(null);
    });

    return cleanup;
  }, []);

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleSelectTool = (toolId: ToolId) => {
    setActiveTool(toolId);
  };

  const handleCompleteOperation = (result: OperationResult) => {
    setActiveTool(null);
    setOperationResult(result);
  };

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-rose-500/20 selection:text-rose-600 transition-colors duration-200">
        
        {/* Website Navigation Header */}
        <Header
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          adminUser={adminUser}
          onOpenAdminModal={() => setShowAdminModal(true)}
          onSelectTool={handleSelectTool}
        />

        {/* Real-time Maintenance Mode Notification Banner */}
        {maintenanceMode && (
          <div
            id="maintenance-mode-banner"
            className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-amber-900 dark:text-amber-200 transition-all animate-in slide-in-from-top-2"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-medium">
                <span className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Wrench className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                </span>
                <span>
                  <strong>System Notice:</strong> Scheduled maintenance mode is active. In-memory sandbox execution remains operational.
                </span>
              </div>
              {adminUser && (
                <button
                  id="maintenance-banner-admin-btn"
                  onClick={() => setShowAdminModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>Admin Controls</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Content Router */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage onSelectTool={handleSelectTool} />} />
            <Route path="/:slug" element={<ToolPage onCompleteOperation={handleCompleteOperation} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Clean Footer with SEO Links */}
        <Footer
          onSelectTool={handleSelectTool}
          onOpenAdmin={() => setShowAdminModal(true)}
        />

        {/* Active PDF Tool Modals (Launched from Grid or Quick Actions) */}
        {activeTool === 'merge' && (
          <MergeTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'split' && (
          <SplitTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'compress' && (
          <CompressTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'protect' && (
          <ProtectTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'unlock' && (
          <UnlockTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'sign' && (
          <SignTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'scanner' && (
          <ScannerTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'rotate' && (
          <RotateTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'extract' && (
          <ExtractTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'reorder' && (
          <ReorderTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {activeTool === 'delete_pages' && (
          <DeletePagesTool
            onClose={() => setActiveTool(null)}
            onComplete={handleCompleteOperation}
          />
        )}

        {/* Post-Operation Result Modal (Save / Share) */}
        {operationResult && (
          <OperationResultModal
            result={operationResult}
            onClose={() => setOperationResult(null)}
          />
        )}

        {/* Admin Dashboard & Audit Log Modal */}
        {showAdminModal && (
          <AdminModal
            isOpen={showAdminModal}
            onClose={() => {
              setShowAdminModal(false);
              setAdminUser(AdminService.getCurrentAdmin());
            }}
            currentAdmin={adminUser}
            onLoginSuccess={(u) => {
              setAdminUser(u);
            }}
            onLogout={() => {
              AdminService.logout();
              setAdminUser(null);
            }}
          />
        )}

      </div>
    </BrowserRouter>
  );
}
