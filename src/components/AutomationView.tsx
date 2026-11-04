import React, { useState, useEffect } from 'react';
import { 
  History, 
  Play, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Search, 
  Sparkles, 
  Calendar,
  Send,
  Inbox,
  FileBarChart
} from 'lucide-react';
import { WorkflowRun, LogEntry, CronStatus } from '../types';

interface AutomationViewProps {
  workflowRuns: WorkflowRun[];
  onTriggerWorkflow: (workflow: string) => Promise<void>;
  cronStatus: CronStatus | null;
  logs: LogEntry[];
  onRefreshLogs: () => Promise<void>;
}

export const AutomationView: React.FC<AutomationViewProps> = ({
  workflowRuns,
  onTriggerWorkflow,
  cronStatus,
  logs,
  onRefreshLogs,
}) => {
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  const [selectedLogCategory, setSelectedLogCategory] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Countdown timer for next 1-hour cron check
  const [timeLeftStr, setTimeLeftStr] = useState<string>('54m 12s');

  useEffect(() => {
    const updateCountdown = () => {
      if (!cronStatus?.nextRunAt) return;
      const diff = new Date(cronStatus.nextRunAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftStr('Scanning now...');
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeftStr(`${mins}m ${secs}s`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [cronStatus?.nextRunAt]);

  const handleRun = async (workflow: string) => {
    setRunningWorkflow(workflow);
    try {
      await onTriggerWorkflow(workflow);
    } finally {
      setRunningWorkflow(null);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = selectedLogCategory === 'ALL' || log.category === selectedLogCategory;
    const matchesQuery = log.message.toLowerCase().includes(logSearchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#07070a] p-6 md:p-10 text-zinc-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="font-bold tracking-wider text-white">IRZAM STUDIO</span>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-400 font-bold">BACKGROUND CRON & DAEMON PIPELINES</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Automation History & Schedulers
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Inspect autonomous pipeline executions, manual workflow runs, and background audit logs for 5 PM Discovery, 6 PM Dispatch, Hourly Inbox Scanning, and 10 PM Reporting.
            </p>
          </div>
        </div>

        {/* 4 Pipeline Trigger Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 5 PM Discovery */}
          <div className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">5:00 PM PKT</span>
              <span className="text-[10px] font-mono text-zinc-500">Daily</span>
            </div>
            <h3 className="font-extrabold text-sm text-white">Discovery & Scraper</h3>
            <p className="text-xs text-zinc-400 line-clamp-2">
              Crawls Google Places, verifies review thresholds, scrapes emails.
            </p>
            <button
              onClick={() => handleRun('discovery_5pm')}
              disabled={runningWorkflow === 'discovery_5pm'}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>{runningWorkflow === 'discovery_5pm' ? 'Running...' : 'Trigger Discovery'}</span>
            </button>
          </div>

          {/* 6 PM Dispatch */}
          <div className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">6:00 PM PKT</span>
              <span className="text-[10px] font-mono text-zinc-500">Daily</span>
            </div>
            <h3 className="font-extrabold text-sm text-white">Outreach Batch Dispatch</h3>
            <p className="text-xs text-zinc-400 line-clamp-2">
              Transmits personalized emails with live Netlify demo links via Gmail.
            </p>
            <button
              onClick={() => handleRun('outreach_6pm')}
              disabled={runningWorkflow === 'outreach_6pm'}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>{runningWorkflow === 'outreach_6pm' ? 'Dispatching...' : 'Trigger 6 PM Batch'}</span>
            </button>
          </div>

          {/* Hourly Inbox Watcher */}
          <div className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Hourly Cron</span>
              <span className="text-[10px] font-mono text-emerald-400">{timeLeftStr}</span>
            </div>
            <h3 className="font-extrabold text-sm text-white">Gmail Reply Watcher</h3>
            <p className="text-xs text-zinc-400 line-clamp-2">
              Monitors all authorized inboxes, matches threads, alerts on replies.
            </p>
            <button
              onClick={() => handleRun('inbox_watcher_hourly')}
              disabled={runningWorkflow === 'inbox_watcher_hourly'}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition cursor-pointer"
            >
              <Inbox className="w-3 h-3" />
              <span>{runningWorkflow === 'inbox_watcher_hourly' ? 'Scanning...' : 'Run Watcher Now'}</span>
            </button>
          </div>

          {/* 10 PM Report */}
          <div className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">10:00 PM PKT</span>
              <span className="text-[10px] font-mono text-zinc-500">Daily</span>
            </div>
            <h3 className="font-extrabold text-sm text-white">Daily Intelligence Report</h3>
            <p className="text-xs text-zinc-400 line-clamp-2">
              Compiles daily research, sent emails, replies, and quota usage.
            </p>
            <button
              onClick={() => handleRun('daily_report_10pm')}
              disabled={runningWorkflow === 'daily_report_10pm'}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition cursor-pointer"
            >
              <FileBarChart className="w-3 h-3" />
              <span>{runningWorkflow === 'daily_report_10pm' ? 'Compiling...' : 'Run 10 PM Report'}</span>
            </button>
          </div>
        </div>

        {/* Workflow Runs Table */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-base text-white">Execution History (Workflow Runs)</h3>
          <div className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] overflow-hidden shadow-xl shadow-black/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Workflow</th>
                    <th className="py-3 px-4 font-bold">Execution Status</th>
                    <th className="py-3 px-4 font-bold">Items Processed</th>
                    <th className="py-3 px-4 font-bold">Execution Summary</th>
                    <th className="py-3 px-4 font-bold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {workflowRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {run.workflow_type}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{run.status.toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {run.items_processed} items
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {run.summary}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                        {new Date(run.started_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Worker Logs Terminal Stream */}
        <div className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] p-5 space-y-4 shadow-xl shadow-black/60">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="font-extrabold text-sm text-white font-mono">Live Background Worker Logs</h3>
            </div>
            <button
              onClick={() => onRefreshLogs()}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 text-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-black/80 border border-white/[0.08] rounded-xl p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-2 no-scrollbar">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-zinc-500 flex-shrink-0 text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-[10px] px-1 rounded flex-shrink-0 font-bold bg-zinc-800 text-zinc-300">
                  [{log.category}]
                </span>
                <span className={`${
                  log.level === 'error' ? 'text-rose-400' :
                  log.level === 'warn' ? 'text-amber-300' :
                  log.level === 'success' ? 'text-emerald-300' :
                  'text-zinc-300'
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
