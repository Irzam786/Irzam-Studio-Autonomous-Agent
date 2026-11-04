import React, { useState } from 'react';
import { 
  ListOrdered, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  XCircle, 
  RefreshCw, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { OutreachQueueItem } from '../types';

interface OutreachQueueViewProps {
  queue: OutreachQueueItem[];
  onRefreshQueue: () => Promise<void>;
  onDispatchDue: () => Promise<void>;
  onCheckFollowups: () => Promise<void>;
  onCancelSlot: (id: string) => Promise<boolean>;
}

export const OutreachQueueView: React.FC<OutreachQueueViewProps> = ({
  queue,
  onRefreshQueue,
  onDispatchDue,
  onCheckFollowups,
  onCancelSlot,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'sent' | 'replied'>('all');
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCheckingFollowups, setIsCheckingFollowups] = useState(false);

  const filteredQueue = queue.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const scheduledCount = queue.filter(q => q.status === 'scheduled').length;
  const sentCount = queue.filter(q => q.status === 'sent').length;
  const repliedCount = queue.filter(q => q.status === 'replied').length;

  const handleDispatch = async () => {
    setIsDispatching(true);
    try {
      await onDispatchDue();
    } finally {
      setIsDispatching(false);
    }
  };

  const handleFollowupCheck = async () => {
    setIsCheckingFollowups(true);
    try {
      await onCheckFollowups();
      await onRefreshQueue();
    } finally {
      setIsCheckingFollowups(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#07070a] p-6 md:p-10 text-zinc-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="font-bold tracking-wider text-white">IRZAM STUDIO</span>
              <span aria-hidden="true">·</span>
              <span className="text-blue-400 font-bold">1-HOUR OUTREACH SLOTS</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Hourly Outreach Queue & Follow-Ups
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Persistent schedule allocating one email per hourly window in Asia/Karachi (PKT). Automatically triggers 2-stage follow-ups while suppressing contacts who have replied.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFollowupCheck}
              disabled={isCheckingFollowups}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingFollowups ? 'animate-spin' : ''}`} />
              <span>Check 2-Stage Follow-Ups</span>
            </button>
            <button
              onClick={handleDispatch}
              disabled={isDispatching || scheduledCount === 0}
              className="flex items-center gap-2 bg-white text-zinc-950 font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer shadow-md shadow-white/10 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isDispatching ? 'Transmitting...' : `Dispatch Due Slots (${scheduledCount})`}</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase text-amber-400">Scheduled In Queue</span>
            <div className="text-2xl font-black text-white font-mono">{scheduledCount}</div>
            <span className="text-[10px] text-zinc-500 font-mono">1 slot per hour limit</span>
          </div>
          <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase text-cyan-400">Dispatched Today</span>
            <div className="text-2xl font-black text-cyan-300 font-mono">{sentCount}</div>
            <span className="text-[10px] text-zinc-500 font-mono">Sent via connected Gmail</span>
          </div>
          <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase text-emerald-400">Replies Detected</span>
            <div className="text-2xl font-black text-emerald-300 font-mono">{repliedCount}</div>
            <span className="text-[10px] text-zinc-500 font-mono">Future follow-ups cancelled</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between gap-3 bg-zinc-950/80 border border-white/[0.08] p-3 rounded-2xl">
          <div className="flex items-center gap-1">
            {(['all', 'scheduled', 'sent', 'replied'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                  filterStatus === tab
                    ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab}
                <span className="ml-1.5 text-[10px] opacity-60 font-mono">
                  {tab === 'all' ? queue.length : queue.filter(q => q.status === tab).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Queue Table */}
        <div className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Scheduled Slot (PKT)</th>
                  <th className="py-3.5 px-4 font-bold">Target Business & Email</th>
                  <th className="py-3.5 px-4 font-bold">Subject Line</th>
                  <th className="py-3.5 px-4 font-bold">Follow-Up Stage</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      <ListOrdered className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                      <p className="text-sm font-semibold text-zinc-400">No outreach slots in this view</p>
                      <p className="text-xs text-zinc-600 mt-1">Add leads or launch a campaign to schedule 1-hour email slots.</p>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3.5 px-4 font-mono text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{new Date(item.scheduled_for_pkt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-white text-xs">{item.business_name}</div>
                        <div className="font-mono text-[11px] text-zinc-400 mt-0.5">{item.recipient_email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 max-w-xs truncate">
                        {item.subject}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {item.followup_stage === 0 ? (
                          <span className="text-zinc-400">Initial Outreach</span>
                        ) : item.followup_stage === 1 ? (
                          <span className="text-amber-400">Stage 1 (3-Day Follow-Up)</span>
                        ) : (
                          <span className="text-purple-400">Stage 2 (Final Follow-Up)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          item.status === 'sent'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/50'
                            : item.status === 'replied'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700/50'
                            : item.status === 'cancelled'
                            ? 'bg-zinc-900 text-zinc-500 border-zinc-700/50'
                            : 'bg-amber-950 text-amber-300 border-amber-700/50'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.status === 'scheduled' && (
                          <button
                            onClick={() => onCancelSlot(item.id)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 border border-white/10 transition cursor-pointer"
                            title="Cancel Slot"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
