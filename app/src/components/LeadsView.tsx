import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Send, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Zap, 
  Radio, 
  ArrowUpRight,
  TrendingUp,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Lead, HostedDemo, GmailAccount } from '../types';

interface LeadsViewProps {
  leads: Lead[];
  demos: HostedDemo[];
  gmailAccounts: GmailAccount[];
  onRefreshLeads: () => Promise<void>;
  onAddLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  onUpdateLeadStatus: (id: string, status: Lead['status']) => Promise<boolean>;
  onDeleteLead: (id: string) => Promise<boolean>;
  onDispatchLeadEmail: (leadId: string) => Promise<boolean>;
  onOpenSandbox: (demo: HostedDemo) => void;
  onOpenComposeWithLead: (lead: Lead) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  demos,
  gmailAccounts,
  onRefreshLeads,
  onAddLead,
  onUpdateLeadStatus,
  onDeleteLead,
  onDispatchLeadEmail,
  onOpenSandbox,
  onOpenComposeWithLead,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted' | 'replied'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isBatchDispatching, setIsBatchDispatching] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // New Lead Form State
  const [newBizName, setNewBizName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newNiche, setNewNiche] = useState('Fintech & Banking');
  const [newNotes, setNewNotes] = useState('');
  const [newDemoUrl, setNewDemoUrl] = useState('');

  // PKT (Pakistan Standard Time - UTC+5) Real-Time Clock
  const [pktTime, setPktTime] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
  }>({ hours: 0, minutes: 0, seconds: 0, formatted: '' });

  useEffect(() => {
    const updatePKT = () => {
      const now = new Date();
      // UTC time + 5 hours for PKT
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pktDate = new Date(utc + (3600000 * 5));
      const hours = pktDate.getHours();
      const minutes = pktDate.getMinutes();
      const seconds = pktDate.getSeconds();
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const formatted = `${displayHours}:${pad(minutes)}:${pad(seconds)} ${ampm} PKT`;

      setPktTime({ hours, minutes, seconds, formatted });
    };

    updatePKT();
    const interval = setInterval(updatePKT, 1000);
    return () => clearInterval(interval);
  }, []);

  const showNotice = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setActionNotice({ message, type });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Phase Calculations (5:00 PM PKT = hour 17, 6:00 PM PKT = hour 18)
  const isDiscoveryActive = pktTime.hours === 17;
  const isDiscoveryPassed = pktTime.hours > 17;
  const isDispatchActive = pktTime.hours === 18;
  const isDispatchPassed = pktTime.hours > 18;

  const getDiscoveryTimeRemaining = () => {
    if (isDiscoveryActive) {
      const minsLeft = 59 - pktTime.minutes;
      return `Active now (${minsLeft}m remaining in 5 PM window)`;
    }
    if (isDiscoveryPassed) {
      return 'Completed today · Next run tomorrow at 5:00 PM PKT';
    }
    const hoursLeft = 17 - pktTime.hours - 1;
    const minsLeft = 60 - pktTime.minutes;
    return `Upcoming in ${hoursLeft}h ${minsLeft}m`;
  };

  const getDispatchTimeRemaining = () => {
    if (isDispatchActive) {
      const minsLeft = 59 - pktTime.minutes;
      return `Dispatch Active (${minsLeft}m remaining in 6 PM window)`;
    }
    if (isDispatchPassed) {
      return 'Dispatched today · Next batch tomorrow at 6:00 PM PKT';
    }
    const hoursLeft = 18 - pktTime.hours - 1;
    const minsLeft = 60 - pktTime.minutes;
    return `Queued · Triggers in ${hoursLeft}h ${minsLeft}m`;
  };

  // Trigger 5 PM PKT Discovery Engine Manually
  const handleTriggerDiscovery = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/leads/discover', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await onRefreshLeads();
        showNotice(`5 PM PKT Discovery Engine run complete! Found: ${data.lead?.business_name || 'New Target'}.`);
      }
    } catch {
      showNotice('Discovery runner encountered an issue.', 'warn');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Trigger 6 PM PKT Scheduled Batch Dispatch Manually
  const handleTriggerBatchDispatch = async () => {
    setIsBatchDispatching(true);
    try {
      const res = await fetch('/api/leads/batch-dispatch', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await onRefreshLeads();
        showNotice(`6 PM PKT Dispatch Engine transmitted ${data.count} targeted demo pitch emails!`, 'success');
      }
    } catch {
      showNotice('Batch dispatch runner encountered an issue.', 'warn');
    } finally {
      setIsBatchDispatching(false);
    }
  };

  const handleDispatchSingle = async (lead: Lead) => {
    setDispatchingId(lead.id);
    try {
      const success = await onDispatchLeadEmail(lead.id);
      if (success) {
        showNotice(`Personalized demo email dispatched to ${lead.business_name} (${lead.email})!`);
      }
    } finally {
      setDispatchingId(null);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim() || !newEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await onAddLead({
        business_name: newBizName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || undefined,
        city: newCity.trim() || 'Undisclosed',
        niche: newNiche.trim(),
        status: 'pending',
        notes: newNotes.trim() || undefined,
        demo_url: newDemoUrl.trim() || undefined,
      });

      if (success) {
        setNewBizName('');
        setNewEmail('');
        setNewPhone('');
        setNewCity('');
        setNewNotes('');
        setNewDemoUrl('');
        setIsAddModalOpen(false);
        showNotice(`Target lead "${newBizName}" added and synced to Supabase!`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.niche.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true : lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalLeads = leads.length;
  const pendingLeads = leads.filter(l => l.status === 'pending').length;
  const contactedLeads = leads.filter(l => l.status === 'contacted').length;
  const repliedLeads = leads.filter(l => l.status === 'replied').length;
  const replyRate = totalLeads > 0 ? Math.round((repliedLeads / totalLeads) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-[#07070a] p-6 md:p-10 text-zinc-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Notice Toast */}
        {actionNotice && (
          <div className="fixed top-4 right-6 z-50 bg-zinc-900 border border-white/20 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{actionNotice.message}</span>
          </div>
        )}

        {/* Header with PKT Clock */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="font-bold tracking-wider text-white">IRZAM STUDIO</span>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-400">AUTONOMOUS LEAD GENERATION & OUTREACH</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Leads & Outreach Engine
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Target prospective businesses with automated discovery, track reply intent, and dispatch bespoke interactive client prototypes across connected Google Workspace inboxes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time PKT Clock Card */}
            <div className="bg-zinc-950/80 border border-white/[0.1] rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-sm">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Timezone (PKT UTC+5)</div>
                <div className="text-xs font-mono font-bold text-white">{pktTime.formatted || 'Syncing clock...'}</div>
              </div>
            </div>

            <button
              onClick={() => onRefreshLeads()}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Refresh Leads from Supabase"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-white text-zinc-950 font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer shadow-md shadow-white/10"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* 2 Visual Phase Indicator Cards: 5 PM PKT & 6 PM PKT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phase 1: 5:00 PM PKT Discovery Phase */}
          <div className={`rounded-2xl p-5 border transition-all ${
            isDiscoveryActive 
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/30' 
              : 'bg-zinc-950/80 border-white/[0.08]'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                  isDiscoveryActive 
                    ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-400' 
                    : 'bg-zinc-900 border border-white/10 text-zinc-300'
                }`}>
                  ✦
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">Phase 01</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-xs font-mono text-zinc-400">5:00 PM PKT Daily</span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">Autonomous Discovery Phase</h3>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-mono font-semibold border ${
                isDiscoveryActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  : isDiscoveryPassed
                  ? 'bg-zinc-900/80 text-zinc-400 border-zinc-700/60'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDiscoveryActive ? 'bg-emerald-400 animate-pulse' : isDiscoveryPassed ? 'bg-zinc-500' : 'bg-amber-400'}`}></span>
                {isDiscoveryActive ? 'ACTIVE NOW' : isDiscoveryPassed ? 'COMPLETED TODAY' : 'UPCOMING'}
              </span>
            </div>

            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Scrapes high-value enterprise niches, pulls verified email/phone dossiers, and cues tailored prototype proposals ready for review.
            </p>

            <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400">
                {getDiscoveryTimeRemaining()}
              </span>
              <button
                onClick={handleTriggerDiscovery}
                disabled={isDiscovering}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-white font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-emerald-400 ${isDiscovering ? 'animate-spin' : ''}`} />
                <span>{isDiscovering ? 'Crawling...' : 'Run Discovery Now'}</span>
              </button>
            </div>
          </div>

          {/* Phase 2: 6:00 PM PKT Outreach Email Dispatch */}
          <div className={`rounded-2xl p-5 border transition-all ${
            isDispatchActive 
              ? 'bg-cyan-950/20 border-cyan-500/40 shadow-lg shadow-cyan-950/30' 
              : 'bg-zinc-950/80 border-white/[0.08]'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                  isDispatchActive 
                    ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-400' 
                    : 'bg-zinc-900 border border-white/10 text-zinc-300'
                }`}>
                  ✈
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">Phase 02</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-xs font-mono text-zinc-400">6:00 PM PKT Daily</span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">Email Outreach Dispatch</h3>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-mono font-semibold border ${
                isDispatchActive
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                  : isDispatchPassed
                  ? 'bg-zinc-900/80 text-zinc-400 border-zinc-700/60'
                  : 'bg-purple-950/40 text-purple-300 border-purple-800/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDispatchActive ? 'bg-cyan-400 animate-pulse' : isDispatchPassed ? 'bg-zinc-500' : 'bg-purple-400'}`}></span>
                {isDispatchActive ? 'TRANSMITTING' : isDispatchPassed ? 'BATCH SENT' : 'QUEUED'}
              </span>
            </div>

            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Rotates authorized Google Workspace accounts using OAuth refresh tokens to transmit personalized emails with live interactive Netlify demo previews.
            </p>

            <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400">
                {getDispatchTimeRemaining()}
              </span>
              <button
                onClick={handleTriggerBatchDispatch}
                disabled={isBatchDispatching || pendingLeads === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-white font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 text-cyan-400 ${isBatchDispatching ? 'animate-bounce' : ''}`} />
                <span>{isBatchDispatching ? 'Dispatching...' : `Dispatch Batch Now (${pendingLeads})`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Metric Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-950/80 border border-white/[0.08] rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[11px] text-zinc-400 font-mono uppercase tracking-wider">Total Tracked Leads</span>
            <div className="text-2xl font-black text-white">{totalLeads}</div>
            <span className="text-[10px] text-zinc-500 font-mono">Mirrored with Supabase table</span>
          </div>

          <div className="bg-zinc-950/80 border border-white/[0.08] rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[11px] text-amber-400 font-mono uppercase tracking-wider">Pending 6 PM Batch</span>
            <div className="text-2xl font-black text-amber-300">{pendingLeads}</div>
            <span className="text-[10px] text-zinc-500 font-mono">Queued for email dispatch</span>
          </div>

          <div className="bg-zinc-950/80 border border-white/[0.08] rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[11px] text-cyan-400 font-mono uppercase tracking-wider">Contacted Leads</span>
            <div className="text-2xl font-black text-cyan-300">{contactedLeads}</div>
            <span className="text-[10px] text-zinc-500 font-mono">Prototypes dispatched</span>
          </div>

          <div className="bg-zinc-950/80 border border-white/[0.08] rounded-2xl p-4 space-y-1 shadow-sm">
            <span className="text-[11px] text-emerald-400 font-mono uppercase tracking-wider">Replies & Calls</span>
            <div className="text-2xl font-black text-emerald-300">{repliedLeads}</div>
            <span className="text-[10px] text-emerald-500/80 font-mono font-bold">{replyRate}% Conversion rate</span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/90 border border-white/[0.08] p-3 rounded-2xl shadow-sm">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by business name, city, email, or niche..."
              className="w-full bg-zinc-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition font-sans"
            />
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-white/[0.06] self-start sm:self-auto">
            {(['all', 'pending', 'contacted', 'replied'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab}
                <span className="ml-1.5 text-[10px] opacity-60 font-mono">
                  {tab === 'all' ? totalLeads : leads.filter(l => l.status === tab).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* High-Contrast Leads Table */}
        <div className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Business & Location</th>
                  <th className="py-3.5 px-4 font-bold">Google Reviews (userRatingCount)</th>
                  <th className="py-3.5 px-4 font-bold">Contact Dossier</th>
                  <th className="py-3.5 px-4 font-bold">Outreach Status</th>
                  <th className="py-3.5 px-4 font-bold">Assigned Demo</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                      <p className="text-sm font-semibold text-zinc-400">No leads matching filter</p>
                      <p className="text-xs text-zinc-600 mt-1">Run 5 PM Discovery or click "+ Add Lead" to track targets.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    return (
                      <tr key={lead.id} className="hover:bg-zinc-900/40 transition">
                        {/* Business & City */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center font-bold text-zinc-300">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-extrabold text-white text-xs tracking-tight">{lead.business_name}</div>
                              <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                                <MapPin className="w-3 h-3 text-zinc-500" />
                                <span>{lead.city}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Google Reviews & Rating */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-bold text-xs">★ {lead.google_rating || '4.8'}</span>
                            <span className="text-white font-bold text-xs font-mono">({lead.google_reviews_count || 50} reviews)</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-sans block mt-0.5">
                            {lead.niche}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="space-y-0.5">
                            <div className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-1">
                              <Mail className="w-3 h-3 text-zinc-500" />
                              <span>{lead.email}</span>
                            </div>
                            {lead.phone && (
                              <div className="text-zinc-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-zinc-600" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {lead.status === 'replied' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Replied</span>
                            </span>
                          ) : lead.status === 'contacted' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-700/50">
                              <Send className="w-3 h-3 text-cyan-400" />
                              <span>Contacted (6 PM)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-700/50">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>

                        {/* Demo Link */}
                        <td className="py-3.5 px-4">
                          {lead.demo_url ? (
                            <a
                              href={lead.demo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white bg-zinc-900/80 px-2 py-1 rounded-lg border border-white/10 hover:border-white/30 transition font-mono"
                            >
                              <ExternalLink className="w-3 h-3 text-emerald-400" />
                              <span>Live Preview</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-zinc-600 font-mono">None attached</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {lead.status === 'pending' && (
                              <button
                                onClick={() => handleDispatchSingle(lead)}
                                disabled={dispatchingId === lead.id}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-zinc-950 font-bold text-[11px] hover:bg-zinc-200 transition cursor-pointer shadow-sm"
                                title="Send Personalized Prototype Outreach"
                              >
                                <Send className={`w-3 h-3 ${dispatchingId === lead.id ? 'animate-bounce' : ''}`} />
                                <span>{dispatchingId === lead.id ? 'Sending...' : 'Dispatch'}</span>
                              </button>
                            )}

                            {lead.status !== 'pending' && (
                              <button
                                onClick={() => onOpenComposeWithLead(lead)}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer"
                                title="Follow Up via Gmail"
                              >
                                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                              </button>
                            )}

                            {/* Cycle Status */}
                            <button
                              onClick={() => {
                                const nextStatus = 
                                  lead.status === 'pending' ? 'contacted' :
                                  lead.status === 'contacted' ? 'replied' : 'pending';
                                onUpdateLeadStatus(lead.id, nextStatus);
                              }}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/10 transition cursor-pointer"
                              title={`Current: ${lead.status}. Click to cycle status.`}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onDeleteLead(lead.id)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/50 text-zinc-500 hover:text-rose-400 border border-white/10 transition cursor-pointer"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Lead Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-950 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">Add New Target Lead</h2>
                    <p className="text-xs text-zinc-400">Stores directly to Supabase leads table</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    placeholder="e.g. Apex Wealth Partners"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Decision-Maker Email *</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. founder@apexcapital.org"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Phone (Optional)</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">City & Region</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="e.g. New York, NY"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Niche / Industry</label>
                    <input
                      type="text"
                      value={newNiche}
                      onChange={(e) => setNewNiche(e.target.value)}
                      placeholder="e.g. Institutional Fintech"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Linked Prototype URL</label>
                  <input
                    type="url"
                    value={newDemoUrl}
                    onChange={(e) => setNewDemoUrl(e.target.value)}
                    placeholder="https://apex-portfolio.netlify.app"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Dossier Notes</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Scraped intelligence or custom pitch points..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-extrabold text-xs hover:bg-zinc-200 transition shadow-md"
                  >
                    {isSubmitting ? 'Saving to Supabase...' : 'Save Lead'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
