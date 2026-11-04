import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  Clock, 
  RefreshCw, 
  Mail, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Radio, 
  Send, 
  Play, 
  Check, 
  Search,
  Trash2,
  BellRing,
  Sparkles,
  Bot
} from 'lucide-react';
import { SystemConfig, CronStatus, LogEntry, DetectedReply, GmailAccount } from '../types';
import { formatRelativeTime } from '../utils/formatters';

interface SettingsLogsViewProps {
  config: SystemConfig;
  onSaveConfig: (updated: Partial<SystemConfig>) => Promise<void>;
  cronStatus: CronStatus | null;
  onTriggerCron: () => void;
  isTriggeringCron: boolean;
  replies: DetectedReply[];
  onMarkReplyRead: (id: string) => void;
  onOpenComposeWithReply: (reply: DetectedReply) => void;
  logs: LogEntry[];
  onRefreshLogs: () => void;
  gmailAccounts: GmailAccount[];
}

export const SettingsLogsView: React.FC<SettingsLogsViewProps> = ({
  config,
  onSaveConfig,
  cronStatus,
  onTriggerCron,
  isTriggeringCron,
  replies,
  onMarkReplyRead,
  onOpenComposeWithReply,
  logs,
  onRefreshLogs,
  gmailAccounts,
}) => {
  const [systemPromptInput, setSystemPromptInput] = useState(config.systemPrompt || '');
  const [autoDeployInput, setAutoDeployInput] = useState(config.autoDeployDemos ?? true);
  const [selectedLogCategory, setSelectedLogCategory] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await onSaveConfig({
        systemPrompt: systemPromptInput,
        autoDeployDemos: autoDeployInput,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = selectedLogCategory === 'ALL' || log.category === selectedLogCategory;
    const matchesQuery = log.message.toLowerCase().includes(logSearchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const getIntentBadge = (intent: DetectedReply['intent']) => {
    switch (intent) {
      case 'SCHEDULE_CALL':
        return <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">READY TO CALL</span>;
      case 'HIGH_INTEREST':
        return <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-bold">HIGH INTEREST</span>;
      case 'PRICING_INQUIRY':
        return <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full font-bold">PRICING INQUIRY</span>;
      default:
        return <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">NEUTRAL</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#070709] p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto space-y-2">
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span>DAEMON ORCHESTRATION</span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-400">1-HOUR CRON & AUDIT LOGS</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Settings & Automated Reply Watcher
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Supervise the 1-hour automated inbox watcher, review detected client intent alerts, and inspect live background worker executions.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* 1-HOUR REPLY WATCHER STATUS CARD */}
        <div className="rounded-2xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl p-6 space-y-6 shadow-xl shadow-black/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">1-Hour Automated Reply Watcher</h2>
                  <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Cron Active (Every 60m)
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Autonomously monitors Account 1 & Account 2 inboxes for prospect replies to sent demo links.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onTriggerCron}
                disabled={isTriggeringCron}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringCron ? 'animate-spin' : ''}`} />
                <span>{isTriggeringCron ? 'Scanning Both Inboxes...' : 'Run Watcher Now'}</span>
              </button>
            </div>
          </div>

          {/* Cron Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.06]">
              <span className="text-[11px] text-zinc-500 block">Cron Interval</span>
              <span className="text-lg font-extrabold text-white font-mono">Every 60 Min</span>
              <span className="text-[10px] text-zinc-400 block mt-1">Background scheduled</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.06]">
              <span className="text-[11px] text-zinc-500 block">Next Scheduled Scan</span>
              <span className="text-lg font-extrabold text-amber-400 font-mono">{timeLeftStr}</span>
              <span className="text-[10px] text-zinc-400 block mt-1">Auto-syncs inboxes</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.06]">
              <span className="text-[11px] text-zinc-500 block">Monitored Accounts</span>
              <span className="text-lg font-extrabold text-cyan-400 font-mono">2 / 2 Active</span>
              <span className="text-[10px] text-zinc-400 block mt-1">Gmail 1 & Gmail 2</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.06]">
              <span className="text-[11px] text-zinc-500 block">Detected Responses</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">
                {replies.length} Total
              </span>
              <span className="text-[10px] text-zinc-400 block mt-1">
                {replies.filter(r => r.status === 'unread').length} Unread alerts
              </span>
            </div>
          </div>

          {/* Detected Incoming Client Replies */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
                Detected Prospect Inbound Responses ({replies.length})
              </h3>
              <span className="text-[11px] text-zinc-500">
                Parsed by Agent Sentiment Analyzer
              </span>
            </div>

            <div className="space-y-3">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`p-4 rounded-xl border transition ${
                    reply.status === 'unread'
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-zinc-900/40 border-white/[0.06]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{reply.fromName}</span>
                      <span className="text-xs font-mono text-zinc-400">({reply.fromEmail})</span>
                      {getIntentBadge(reply.intent)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                      <span>{formatRelativeTime(reply.detectedAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-400">{reply.accountId === 'gmail-1' ? 'Account 1 (Outreach)' : 'Account 2 (Closer)'}</span>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-zinc-200 mb-1">{reply.subject}</div>
                  <p className="text-xs text-zinc-400 leading-relaxed bg-black/40 p-2.5 rounded-lg border border-white/[0.04]">
                    "{reply.snippet}"
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
                    <div className="text-[11px] text-cyan-400 font-mono flex items-center gap-1">
                      <span>Referenced Demo:</span>
                      <strong>{reply.demoMentioned || 'Interactive Prototype'}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {reply.status === 'unread' && (
                        <button
                          onClick={() => onMarkReplyRead(reply.id)}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs border border-white/10 transition cursor-pointer"
                        >
                          Mark as Read
                        </button>
                      )}
                      <button
                        onClick={() => onOpenComposeWithReply(reply)}
                        className="flex items-center gap-1 px-3 py-1 rounded bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send Follow-Up</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AGENT BEHAVIOR & SYSTEM PROMPT */}
        <div className="rounded-2xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl p-6 space-y-4 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Agent Behavioral Directive & Auto-Deploy</h2>
                <p className="text-xs text-zinc-400">Configure Base44 system prompt and deployment toggles.</p>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Directives'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300 block">Agent System Instructions</label>
            <textarea
              rows={4}
              value={systemPromptInput}
              onChange={(e) => setSystemPromptInput(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none"
            />

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">Automatic Live Demo Deployment</div>
                <div className="text-[11px] text-zinc-400">Whenever the Agent generates HTML/React code, immediately deploy it to a live temporary URL.</div>
              </div>
              <input
                type="checkbox"
                checked={autoDeployInput}
                onChange={(e) => setAutoDeployInput(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* BACKGROUND WORKER & AUDIT LOGS */}
        <div className="rounded-2xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl p-6 space-y-4 shadow-xl shadow-black/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Background Worker & Audit Logs</h2>
                <p className="text-xs text-zinc-400">Real-time execution log from the cron daemon, Gmail watcher, and FreeLLMAPI connector.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onRefreshLogs}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-xs transition cursor-pointer"
                title="Refresh logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-white/[0.06]">
              {['ALL', 'CRON', 'GMAIL', 'FREEMODEL', 'HOSTING', 'AGENT'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedLogCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition cursor-pointer ${
                    selectedLogCategory === cat
                      ? 'bg-zinc-800 text-white font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Search worker logs..."
                className="bg-zinc-900 border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Log Stream Terminal Box */}
          <div className="bg-black/80 border border-white/[0.08] rounded-xl p-4 font-mono text-xs max-h-80 overflow-y-auto space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-zinc-500 flex-shrink-0 text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`text-[10px] px-1 rounded flex-shrink-0 font-bold ${
                  log.category === 'CRON' ? 'bg-amber-950 text-amber-300' :
                  log.category === 'GMAIL' ? 'bg-emerald-950 text-emerald-300' :
                  log.category === 'FREEMODEL' ? 'bg-purple-950 text-purple-300' :
                  log.category === 'HOSTING' ? 'bg-cyan-950 text-cyan-300' :
                  'bg-zinc-800 text-zinc-300'
                }`}>
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

            {filteredLogs.length === 0 && (
              <div className="text-zinc-600 text-center py-4">No logs found matching current filter.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
