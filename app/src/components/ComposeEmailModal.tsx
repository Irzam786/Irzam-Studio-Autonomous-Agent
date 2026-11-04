import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  Globe, 
  Sparkles, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { GmailAccount, HostedDemo, DetectedReply } from '../types';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  gmailAccounts: GmailAccount[];
  hostedDemos: HostedDemo[];
  initialAccount?: string;
  initialDemo?: HostedDemo | null;
  initialReply?: DetectedReply | null;
  onSendEmail: (data: {
    accountId: string;
    toEmail: string;
    subject: string;
    body: string;
    attachDemoUrl?: string;
  }) => Promise<boolean>;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  gmailAccounts,
  hostedDemos,
  initialAccount,
  initialDemo,
  initialReply,
  onSendEmail,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialAccount || (initialReply?.accountId ? initialReply.accountId : gmailAccounts[0]?.id || '')
  );
  const [toEmail, setToEmail] = useState(initialReply ? initialReply.fromEmail : '');
  const [subject, setSubject] = useState(
    initialReply ? `Re: ${initialReply.subject}` : initialDemo ? `Interactive Prototype Demo for ${initialDemo.clientName}` : 'Custom AI Demo for Your Team'
  );
  const [selectedDemoId, setSelectedDemoId] = useState<string>(initialDemo ? initialDemo.id : '');
  const [emailBody, setEmailBody] = useState<string>(() => {
    if (initialReply) {
      return `Hi ${initialReply.fromName.split(' ')[0]},\n\nThanks for getting back to me! I would be delighted to jump on a quick 15-minute call to walk through the architecture and how you can run this customized for your team.\n\nLet me know if tomorrow at 2 PM or Thursday works best for you.\n\nBest regards,\nAlex`;
    }
    if (initialDemo) {
      return `Hi ${initialDemo.clientName},\n\nIrzam Studio reviewed your brand and built an interactive working prototype demo for your team to test.\n\nYou can access the live temporary link here:\n${initialDemo.liveNetlifyUrl || `${window.location.origin}${initialDemo.previewUrl}`}\n\nLet me know what you think!\n\nBest,\nIrzam`;
    }
    return `Hi there,\n\nI put together an interactive prototype tailored for your company. Would love to share the live sandbox URL and get your feedback.\n\nBest regards,\nAlex`;
  });

  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectDemo = (demoId: string) => {
    setSelectedDemoId(demoId);
    if (!demoId) return;
    const demo = hostedDemos.find((d) => d.id === demoId);
    if (demo) {
      const demoUrl = `${window.location.origin}${demo.previewUrl}`;
      if (!emailBody.includes(demo.previewUrl)) {
        setEmailBody((prev) => `${prev}\n\nLive Demo Link: ${demoUrl}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!toEmail || !subject || !emailBody) {
      setErrorMsg('Please fill in all required email fields.');
      return;
    }

    setIsSending(true);
    try {
      const activeDemo = hostedDemos.find((d) => d.id === selectedDemoId);
      const success = await onSendEmail({
        accountId: selectedAccountId,
        toEmail,
        subject,
        body: emailBody,
        attachDemoUrl: activeDemo ? activeDemo.previewUrl : undefined,
      });

      if (success) {
        onClose();
      } else {
        setErrorMsg('Failed to send outreach email. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Compose Outreach Email</h3>
              <p className="text-[11px] text-zinc-400">Send directly via authorized Gmail Account 1 or 2.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Account Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">From Gmail Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none"
            >
              {gmailAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.email} ({acc.label || 'Google Workspace'}) - {acc.sentToday}/{acc.dailySendQuota} sent
                </option>
              ))}
            </select>
          </div>

          {/* To Email & Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Recipient Email (Prospect)</label>
              <input
                type="email"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Attach Live Demo Sandbox</label>
              <select
                value={selectedDemoId}
                onChange={(e) => handleSelectDemo(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none"
              >
                <option value="">-- No demo attached --</option>
                {hostedDemos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.clientName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Subject Line</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Email Message Body</label>
            <textarea
              rows={8}
              required
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed font-sans"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-[11px] text-zinc-500">
              1-Hour reply watcher will automatically parse replies to this thread.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending Outreach...' : 'Send Email'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
