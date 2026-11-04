import React, { useState } from 'react';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Play, 
  Pause, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users, 
  Send, 
  Sparkles,
  X
} from 'lucide-react';
import { Campaign, HostedDemo } from '../types';

interface CampaignsViewProps {
  campaigns: Campaign[];
  demos: HostedDemo[];
  onRefreshCampaigns: () => Promise<void>;
  onCreateCampaign: (campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'leads_count' | 'sent_count' | 'replies_count'>) => Promise<boolean>;
  onToggleCampaignStatus: (id: string, status: Campaign['status']) => Promise<boolean>;
  onDeleteCampaign: (id: string) => Promise<boolean>;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  demos,
  onRefreshCampaigns,
  onCreateCampaign,
  onToggleCampaignStatus,
  onDeleteCampaign,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Campaign Form
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('Institutional Fintech');
  const [city, setCity] = useState('New York, NY');
  const [minReviews, setMinReviews] = useState(50);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [pitchAngle, setPitchAngle] = useState('Autonomous Treasury & Risk Engine Prototype');
  const [demoSlug, setDemoSlug] = useState('apex-capital-portfolio');

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !niche.trim()) return;
    setIsSubmitting(true);
    try {
      const success = await onCreateCampaign({
        name: name.trim(),
        niche: niche.trim(),
        city: city.trim() || 'All Cities',
        min_reviews: Number(minReviews),
        daily_limit: Number(dailyLimit),
        status: 'active',
        pitch_angle: pitchAngle.trim(),
        demo_slug: demoSlug,
      });
      if (success) {
        setName('');
        setIsCreateModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
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
              <span className="text-amber-400 font-bold">OUTREACH CAMPAIGNS</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              B2B Outreach Campaigns
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Organize multi-touch automated outreach campaigns by industry niche, city, Google review requirements, and attached demo websites.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 bg-white text-zinc-950 font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer shadow-md shadow-white/10"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Launch Campaign</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3 bg-zinc-950/80 border border-white/[0.08] p-3 rounded-2xl">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search campaigns by name, niche, or city..."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
            />
          </div>
          <span className="text-xs font-mono text-zinc-500 pr-2">
            {campaigns.length} Active Campaigns
          </span>
        </div>

        {/* Campaign Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCampaigns.map((camp) => (
            <div
              key={camp.id}
              className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] hover:border-white/20 transition p-6 shadow-xl shadow-black/40 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold">
                      {camp.niche}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      {camp.city}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    camp.status === 'active'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/50'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-700/50'
                  }`}>
                    {camp.status === 'active' ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white mt-1">
                  {camp.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Pitch: <strong className="text-zinc-200">{camp.pitch_angle}</strong>
                </p>

                {/* Qualification metrics */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/[0.06] text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Min Google Reviews</span>
                    <span className="text-sm font-bold text-white">≥ {camp.min_reviews} Reviews</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Daily Slot Limit</span>
                    <span className="text-sm font-bold text-white">{camp.daily_limit} emails / day</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <button
                  onClick={() => onToggleCampaignStatus(camp.id, camp.status === 'active' ? 'paused' : 'active')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    camp.status === 'active'
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  }`}
                >
                  {camp.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{camp.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}</span>
                </button>

                <button
                  onClick={() => onDeleteCampaign(camp.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                  title="Delete Campaign"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Create Campaign */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-950 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="font-extrabold text-sm text-white">Launch New Outreach Campaign</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-300 block">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chicago MedTech AI Acceleration"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-300 block">Target Niche</label>
                    <input
                      type="text"
                      required
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g. MedTech & Diagnostics"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-300 block">Target City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chicago, IL"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-300 block">Min Google Reviews</label>
                    <input
                      type="number"
                      min={0}
                      value={minReviews}
                      onChange={(e) => setMinReviews(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-300 block">Daily Limit</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-300 block">Pitch Angle / Value Proposition</label>
                  <input
                    type="text"
                    value={pitchAngle}
                    onChange={(e) => setPitchAngle(e.target.value)}
                    placeholder="e.g. Turnkey 24/7 AI Receptionist & Patient Intake"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-white text-zinc-950 font-extrabold text-xs hover:bg-zinc-200 transition shadow-md"
                  >
                    {isSubmitting ? 'Launching...' : 'Launch Campaign'}
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
