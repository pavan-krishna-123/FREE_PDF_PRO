import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Database,
  Filter,
  Download,
  Radio,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  FirestoreActivityLog,
  FirestoreMetricStats,
  subscribeToActivityLogs,
  logOperationToFirestore,
} from '../../services/firebase';

interface AuditDashboardProps {
  logs?: FirestoreActivityLog[];
  metrics?: FirestoreMetricStats | null;
}

const TOOL_COLORS: Record<string, string> = {
  merge: '#8b5cf6', // purple-500
  split: '#f59e0b', // amber-500
  extract: '#f97316', // orange-500
  compress: '#10b981', // emerald-500
  sign: '#06b6d4', // cyan-500
  protect: '#6366f1', // indigo-500
  unlock: '#3b82f6', // blue-500
  scanner: '#ec4899', // pink-500
  auth: '#14b8a6', // teal-500
  other: '#94a3b8', // slate-400
};

export const AuditDashboard: React.FC<AuditDashboardProps> = ({ logs: initialLogs = [], metrics }) => {
  // Real-time Logs State
  const [realtimeLogs, setRealtimeLogs] = useState<FirestoreActivityLog[]>(initialLogs);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const prevCountRef = useRef(initialLogs.length);

  // View & Filter States
  const [viewMode, setViewMode] = useState<'tools' | 'timeline' | 'latency'>('tools');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  // Real-Time Firestore Subscription
  useEffect(() => {
    setIsLiveConnected(true);
    const unsubscribe = subscribeToActivityLogs((freshLogs) => {
      if (freshLogs.length > 0) {
        setRealtimeLogs(freshLogs);
        setLastSyncTime(new Date());

        // Trigger subtle animation pulse when new event arrives
        if (freshLogs.length !== prevCountRef.current) {
          prevCountRef.current = freshLogs.length;
          setHasNewUpdate(true);
          setTimeout(() => setHasNewUpdate(false), 1200);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Update realtimeLogs if initialLogs prop changes (e.g. from parent refresh)
  useEffect(() => {
    if (initialLogs.length > 0 && realtimeLogs.length === 0) {
      setRealtimeLogs(initialLogs);
    }
  }, [initialLogs]);

  // Current active log dataset
  const activeLogs = realtimeLogs.length > 0 ? realtimeLogs : initialLogs;

  // Filtered logs based on status selection
  const filteredLogs = useMemo(() => {
    if (statusFilter === 'all') return activeLogs;
    return activeLogs.filter((log) => log.status === statusFilter);
  }, [activeLogs, statusFilter]);

  // Aggregate by Tool & Status for Bar Charts
  const toolActivityData = useMemo(() => {
    const map: Record<
      string,
      { tool: string; success: number; failed: number; total: number; totalDuration: number }
    > = {};

    filteredLogs.forEach((log) => {
      const toolKey = (log.tool || 'other').toLowerCase();
      if (!map[toolKey]) {
        map[toolKey] = {
          tool: log.tool || 'Other',
          success: 0,
          failed: 0,
          total: 0,
          totalDuration: 0,
        };
      }
      if (log.status === 'success') {
        map[toolKey].success += 1;
      } else {
        map[toolKey].failed += 1;
      }
      map[toolKey].total += 1;
      map[toolKey].totalDuration += log.durationMs || 0;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        avgLatency: item.total > 0 ? Math.round(item.totalDuration / item.total) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLogs]);

  // Aggregate by Time Buckets / Hourly Timeline
  const timelineActivityData = useMemo(() => {
    const buckets: Record<string, { time: string; success: number; failed: number; total: number }> = {};

    filteredLogs.forEach((log) => {
      let dateObj: Date;
      if (log.timestamp?.toDate) {
        dateObj = log.timestamp.toDate();
      } else if (log.timestamp) {
        dateObj = new Date(log.timestamp);
      } else {
        dateObj = new Date();
      }

      const hours = dateObj.getHours().toString().padStart(2, '0');
      const timeKey = `${hours}:00`;

      if (!buckets[timeKey]) {
        buckets[timeKey] = {
          time: timeKey,
          success: 0,
          failed: 0,
          total: 0,
        };
      }

      if (log.status === 'success') {
        buckets[timeKey].success += 1;
      } else {
        buckets[timeKey].failed += 1;
      }
      buckets[timeKey].total += 1;
    });

    return Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredLogs]);

  // Summary Metrics
  const summaryStats = useMemo(() => {
    const total = activeLogs.length;
    const successCount = activeLogs.filter((l) => l.status === 'success').length;
    const failedCount = activeLogs.filter((l) => l.status === 'failed').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;
    const totalDuration = activeLogs.reduce((acc, l) => acc + (l.durationMs || 0), 0);
    const avgLatency = total > 0 ? Math.round(totalDuration / total) : 0;
    const totalSizeKb = activeLogs.reduce((acc, l) => acc + (l.fileSize || 0), 0) / 1024;

    return {
      total,
      successCount,
      failedCount,
      successRate,
      avgLatency,
      totalSizeMb: (totalSizeKb / 1024).toFixed(2),
    };
  }, [activeLogs]);

  // Simulate Live Activity Event to test real-time subscription
  const handleSimulateLiveEvent = async () => {
    setIsSimulating(true);
    try {
      const sampleTools = ['merge', 'split', 'compress', 'sign', 'protect', 'scanner'];
      const randomTool = sampleTools[Math.floor(Math.random() * sampleTools.length)];
      const randomSize = Math.floor(Math.random() * 800000) + 120000;
      const randomDuration = Math.floor(Math.random() * 220) + 45;
      const isSuccess = Math.random() > 0.1; // 90% success rate

      await logOperationToFirestore(
        randomTool,
        `${randomTool.toUpperCase()}_LIVE_TEST`,
        isSuccess ? 'success' : 'failed',
        randomSize,
        randomDuration,
        `Real-time test simulation (${new Date().toLocaleTimeString()})`,
        randomTool === 'compress' ? 240000 : 0,
        randomTool === 'sign'
      );
    } catch (err) {
      console.warn('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Export Filtered Logs to CSV
  const handleExportCsv = () => {
    if (!filteredLogs || filteredLogs.length === 0) return;

    const headers = [
      'ID',
      'Timestamp',
      'Tool',
      'Action',
      'Status',
      'File Size (Bytes)',
      'Duration (ms)',
      'Details',
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const stringified = String(str).replace(/"/g, '""');
      return `"${stringified}"`;
    };

    const rows = filteredLogs.map((log) => {
      let timestampStr = '';
      if (log.timestamp?.toDate) {
        timestampStr = log.timestamp.toDate().toISOString();
      } else if (log.timestamp) {
        timestampStr = new Date(log.timestamp).toISOString();
      }

      return [
        escapeCsv(log.id || ''),
        escapeCsv(timestampStr),
        escapeCsv(log.tool),
        escapeCsv(log.action),
        escapeCsv(log.status),
        escapeCsv(log.fileSize || 0),
        escapeCsv(log.durationMs || 0),
        escapeCsv(log.details || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `openpdf_activity_audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white tracking-wide">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="flex items-center gap-2 font-mono" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}:</span>
              <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="audit-dashboard-container" className="space-y-6">
      
      {/* Real-Time Live Sync Status Banner */}
      <div
        id="audit-realtime-status-banner"
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 ${
          hasNewUpdate
            ? 'bg-purple-950/80 border-purple-500/80 text-purple-200 shadow-lg shadow-purple-900/30'
            : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-400">Live Firestore Subscription Active</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">
            {activeLogs.length} events streamed
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-[11px] font-mono">
            Synced: {lastSyncTime.toLocaleTimeString()}
          </span>
        </div>

        {/* Live Test Trigger Button */}
        <div className="flex items-center gap-2">
          <button
            id="audit-simulate-event-btn"
            onClick={handleSimulateLiveEvent}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold shadow-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            title="Send a sample activity log to Firestore to test real-time chart animation"
          >
            {isSimulating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>Test Live Stream</span>
          </button>
        </div>
      </div>

      {/* Top Header & View Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Firestore User Activity Audit</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                <Database className="w-3 h-3" /> onSnapshot Real-Time
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Interactive live visual analytics & telemetry of user events
            </p>
          </div>
        </div>

        {/* View Toggle & Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-700 text-xs">
            <button
              id="audit-view-tools-btn"
              onClick={() => setViewMode('tools')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'tools'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Tool / Action
            </button>
            <button
              id="audit-view-timeline-btn"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Timeline
            </button>
            <button
              id="audit-view-latency-btn"
              onClick={() => setViewMode('latency')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'latency'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Latency (ms)
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              id="audit-status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-300 text-xs font-medium focus:outline-hidden pr-2 cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Events</option>
              <option value="success" className="bg-slate-900 text-emerald-400">Success Only</option>
              <option value="failed" className="bg-slate-900 text-rose-400">Failed Only</option>
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            id="audit-export-csv-btn"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold shadow-xs active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Export activity logs as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Audit Logs</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{summaryStats.total}</p>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" /> Live Real-Time Stream
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{summaryStats.successRate}%</p>
          <span className="text-[10px] text-emerald-400/80">{summaryStats.successCount} successful events</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Avg Execution Latency</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-300 font-mono">
            {summaryStats.avgLatency} <span className="text-sm font-normal text-slate-400">ms</span>
          </p>
          <span className="text-[10px] text-slate-400">Client Wasm / Sandbox</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Failed Operations</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono">{summaryStats.failedCount}</p>
          <span className="text-[10px] text-slate-400">Error / Exception logs</span>
        </div>
      </div>

      {/* Main Bar Chart Visualization */}
      <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>
                {viewMode === 'tools' && 'User Activity by Tool & Execution Status'}
                {viewMode === 'timeline' && 'Audit Activity Frequency Over Time'}
                {viewMode === 'latency' && 'Average Execution Latency per Tool (Milliseconds)'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              {viewMode === 'tools' && 'Visual distribution of operations recorded in Firestore'}
              {viewMode === 'timeline' && 'Hourly volume distribution of user actions'}
              {viewMode === 'latency' && 'Client-side WebAssembly & Sandbox processing speed'}
            </p>
          </div>
        </div>

        {/* Chart Canvas with Smooth Transitions */}
        <div className="h-72 w-full pt-2">
          {activeLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-700 rounded-xl">
              <Activity className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
              <p className="text-xs font-medium text-slate-400">No activity logs recorded in Firestore yet.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Click <strong className="text-purple-400">"Test Live Stream"</strong> above or perform a PDF operation to see live real-time bar chart telemetry!
              </p>
            </div>
          ) : viewMode === 'tools' ? (
            <ResponsiveContainer key={`tools-container-${activeLogs.length}`} width="100%" height="100%">
              <BarChart
                data={toolActivityData}
                margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis
                  dataKey="tool"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  tick={{ fill: '#cbd5e1' }}
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#94a3b8' }}
                />
                <Bar
                  dataKey="success"
                  name="Successful Ops"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                  isAnimationActive={true}
                  animationDuration={600}
                />
                <Bar
                  dataKey="failed"
                  name="Failed Ops"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                  isAnimationActive={true}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : viewMode === 'timeline' ? (
            <ResponsiveContainer key={`timeline-container-${activeLogs.length}`} width="100%" height="100%">
              <BarChart
                data={timelineActivityData}
                margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} tick={{ fill: '#cbd5e1' }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#94a3b8' }} />
                <Bar
                  dataKey="total"
                  name="Total Event Volume"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive={true}
                  animationDuration={600}
                >
                  {timelineActivityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#8b5cf6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer key={`latency-container-${activeLogs.length}`} width="100%" height="100%">
              <BarChart
                data={toolActivityData}
                margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis
                  dataKey="tool"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  tick={{ fill: '#cbd5e1' }}
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" ms" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#94a3b8' }} />
                <Bar
                  dataKey="avgLatency"
                  name="Avg Duration (ms)"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                  isAnimationActive={true}
                  animationDuration={600}
                >
                  {toolActivityData.map((entry, index) => {
                    const color = TOOL_COLORS[entry.tool.toLowerCase()] || '#06b6d4';
                    return <Cell key={`latency-cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tool Distribution Summary Cards */}
      {toolActivityData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {toolActivityData.map((item) => {
            const color = TOOL_COLORS[item.tool.toLowerCase()] || '#94a3b8';
            return (
              <div
                key={item.tool}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-bold text-slate-200 capitalize truncate">{item.tool}</span>
                </div>
                <div className="flex justify-between items-baseline font-mono">
                  <span className="text-lg font-black text-white">{item.total}</span>
                  <span className="text-[10px] text-slate-400">{item.avgLatency}ms</span>
                </div>
                <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${summaryStats.total > 0 ? (item.total / summaryStats.total) * 100 : 0}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
