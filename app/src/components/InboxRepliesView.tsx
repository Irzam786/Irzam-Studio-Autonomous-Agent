import React, { useState } from 'react';
import { 
  Inbox, 
  RefreshCw, 
  Send, 
  Sparkles, 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare,
  Globe,
  Share2,
  Check
} from 'lucide-react';
import { DetectedReply, GmailAccount } from '../types';

interface InboxRepliesViewProps {
  replies: DetectedReply[];
  gmailAccounts: GmailAccount[];
  onScanInboxes: () => Promise<void>;
  onGenerateResponse: (replyId: string) => Promise<string | null>;
  onSendResponse: (replyId: string, responseText: string) => Promise<boolean>;
  onOpenComposeWithReply: (reply: DetectedReply) => void;
}

export const InboxRepliesView: React.FC<InboxRepliesViewProps> = ({
  replies,
  gmailAccounts,
  onScanInboxes,
  onGenerateResponse,
  onSendResponse,
  onOpenComposeWithReply,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [draftingResponses, setDraftingResponses] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await onScanInboxes();
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateAI = async (reply: DetectedReply) => {
    setGeneratingId(reply.id);
    try {
      const generated = await onGenerateResponse(reply.id);
      if (generated) {
        setDraftingResponses(prev => ({ ...prev, [reply.id]: generated }));
      }
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSendDraft = async (replyId: string) => {
    const textToSend = draftingResponses[replyId];
    if (!textToSend) return;
    setSendingId(replyId);
    try {
      const success = await onSendResponse(replyId, textToSend);
      if (success) {
        setSentNotice('Follow-up reply dispatched successfully via Gmail!');
        setTimeout(() => setSentNotice(null), 3000);
      }
    } finally {
      setSendingId(null);
    }
  };

  const getIntentBadge = (intent: DetectedReply['intent']) => {
    switch (intent) {
      case 'SCHEDULE_CALL':
        return <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">READY TO CALL</span>;
      case 'HIGH_INTEREST':
        return <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-bold">HIGH INTEREST</span>;
      case 'PRICING_INQUIRY':
        return <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full font-bold">PRICING INQUIRY</span>;
      case 'UNSUBSCRIBE':
        return <span className="text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-bold">OPT OUT</span>;
      default:
        return <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">NEUTRAL</span>;
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
              <span className="text-rose-400 font-bold">GMAIL INBOX & AI REPLY MONITOR</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Inbox & Client Replies
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Real-time monitoring across authorized Google Workspace inboxes. Automatically parses prospect sentiment and prepares executive follow-up responses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-white' : ''}`} />
              <span>{isScanning ? 'Scanning Inboxes...' : 'Scan All Inboxes Now'}</span>
            </button>
          </div>
        </div>

        {sentNotice && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{sentNotice}</span>
          </div>
        )}

        {/* List of Inbound Replies */}
        <div className="space-y-5">
          {replies.map((reply) => {
            const hasDraft = Boolean(draftingResponses[reply.id] || reply.suggestedResponse);
            const currentDraftText = draftingResponses[reply.id] || reply.suggestedResponse || '';

            return (
              <div
                key={reply.id}
                className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] p-6 shadow-xl shadow-black/50 space-y-4"
              >
                {/* Reply Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                      {reply.fromName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{reply.fromName}</span>
                        <span className="text-xs font-mono text-zinc-400">({reply.fromEmail})</span>
                        {getIntentBadge(reply.intent)}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        Received {new Date(reply.detectedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                    reply.status === 'replied'
                      ? 'bg-zinc-900 text-zinc-400 border-zinc-700/50'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                  }`}>
                    {reply.status === 'replied' ? 'REPLIED' : 'NEEDS ACTION'}
                  </span>
                </div>

                {/* Subject & Snippet */}
                <div>
                  <h4 className="text-sm font-bold text-zinc-200 mb-1.5">{reply.subject}</h4>
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.04] text-xs text-zinc-300 leading-relaxed font-sans italic">
                    "{reply.snippet}"
                  </div>
                </div>

                {/* Referenced Demo */}
                {reply.demoMentioned && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                    <span className="text-zinc-500">Referenced Demo:</span>
                    <span className="text-cyan-300 font-bold">{reply.demoMentioned}</span>
                  </div>
                )}

                {/* Suggested AI Response Box */}
                {hasDraft && (
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Executive Response Draft (Training Grounded)</span>
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={currentDraftText}
                      onChange={(e) => setDraftingResponses(prev => ({ ...prev, [reply.id]: e.target.value }))}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-white/30 font-sans leading-relaxed"
                    />
                  </div>
                )}

                {/* Card Actions */}
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    {!hasDraft ? (
                      <button
                        onClick={() => handleGenerateAI(reply)}
                        disabled={generatingId === reply.id}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-white font-bold transition cursor-pointer"
                      >
                        <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${generatingId === reply.id ? 'animate-spin' : ''}`} />
                        <span>{generatingId === reply.id ? 'Drafting...' : 'Generate AI Response (1-Click)'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendDraft(reply.id)}
                        disabled={sendingId === reply.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-950 font-extrabold text-xs hover:bg-zinc-200 transition cursor-pointer shadow-md shadow-white/10"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{sendingId === reply.id ? 'Dispatching...' : 'Send AI Reply via Gmail'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenComposeWithReply(reply)}
                    className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Open in Full Composer
                  </button>
                </div>
              </div>
            );
          })}

          {replies.length === 0 && (
            <div className="py-16 text-center text-zinc-500 border border-dashed border-white/10 rounded-2xl">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-400">All inboxes clear</p>
              <p className="text-xs text-zinc-600 mt-1">1-Hour cron watcher is actively monitoring all authorized Gmail relays.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
