import React, { useState } from 'react';
import { 
  FileBarChart, 
  Send, 
  Download, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  TrendingUp,
  Mail
} from 'lucide-react';
import { DailyReport } from '../types';

interface ReportsViewProps {
  reports: DailyReport[];
  onGenerateReport: () => Promise<void>;
  onSendReportEmail: (id: string) => Promise<boolean>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  onGenerateReport,
  onSendReportEmail,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateReport();
      setNotice('10:00 PM PKT Daily Report compiled and stored in Supabase!');
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async (id: string) => {
    setSendingId(id);
    try {
      const success = await onSendReportEmail(id);
      if (success) {
        setNotice('Daily report sent to operator via primary Gmail!');
        setTimeout(() => setNotice(null), 3000);
      }
    } finally {
      setSendingId(null);
    }
  };

  const exportReportJSON = (report: DailyReport) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `irzam_daily_report_${report.report_date}.json`;
    a.click();
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
              <span className="text-indigo-400 font-bold">10:00 PM PKT INTELLIGENCE SUMMARY</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Daily Intelligence Reports
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Autonomous daily audit logging all research, Google review evaluations, outreach dispatches, follow-up executions, and provider quota consumption.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-white text-zinc-950 font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer shadow-md shadow-white/10"
            >
              <FileBarChart className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isGenerating ? 'Compiling Report...' : 'Compile 10 PM Report'}</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Reports Stream */}
        <div className="space-y-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] p-6 shadow-xl shadow-black/50 space-y-5"
            >
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      Executive Daily Report — {report.report_date}
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Generated at {new Date(report.generated_at_pkt).toLocaleTimeString()} PKT · Archived in Supabase
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportReportJSON(report)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer"
                    title="Export JSON dossier"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    onClick={() => handleSendEmail(report.id)}
                    disabled={sendingId === report.id || report.status === 'sent_to_email'}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      report.status === 'sent_to_email'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50 cursor-default'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{report.status === 'sent_to_email' ? 'Dispatched via Gmail' : sendingId === report.id ? 'Sending...' : 'Email Report'}</span>
                  </button>
                </div>
              </div>

              {/* Numerical Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                  <span className="text-[10px] text-zinc-500 font-mono block">Researched</span>
                  <span className="text-xl font-black text-white font-mono">{report.researched_count}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                  <span className="text-[10px] text-zinc-500 font-mono block">Qualified (≥50 reviews)</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">{report.qualified_count}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                  <span className="text-[10px] text-zinc-500 font-mono block">Emails Verified</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">{report.emails_verified}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                  <span className="text-[10px] text-zinc-500 font-mono block">Outreach Sent</span>
                  <span className="text-xl font-black text-white font-mono">{report.emails_sent}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                  <span className="text-[10px] text-zinc-500 font-mono block">Inbound Replies</span>
                  <span className="text-xl font-black text-purple-400 font-mono">{report.replies_received}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                  <span className="text-[10px] text-zinc-500 font-mono block">Demos Deployed</span>
                  <span className="text-xl font-black text-amber-400 font-mono">{report.demos_generated}</span>
                </div>
              </div>

              {/* Summary Statement */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/[0.04] text-xs text-zinc-300 leading-relaxed font-sans">
                {report.summary_text}
              </div>
            </div>
          ))}

          {reports.length === 0 && (
            <div className="py-16 text-center text-zinc-500 border border-dashed border-white/10 rounded-2xl">
              <FileBarChart className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-400">No reports generated yet</p>
              <p className="text-xs text-zinc-600 mt-1">Daily reports trigger autonomously at 10:00 PM PKT or click "Compile 10 PM Report" above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
