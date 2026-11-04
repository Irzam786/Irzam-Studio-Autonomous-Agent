import React, { useState } from 'react';
import { 
  GraduationCap, 
  Send, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { AgentRule, TrainingMessage, RuleCategory } from '../types';

interface TrainingViewProps {
  rules: AgentRule[];
  trainingMessages: TrainingMessage[];
  onSendTrainingMessage: (message: string) => Promise<void>;
  onAddRule: (rule: Omit<AgentRule, 'id' | 'created_at' | 'updated_at' | 'version'>) => Promise<boolean>;
  onToggleRule: (id: string, is_active: boolean) => Promise<boolean>;
  onDeleteRule: (id: string) => Promise<boolean>;
}

export const TrainingView: React.FC<TrainingViewProps> = ({
  rules,
  trainingMessages,
  onSendTrainingMessage,
  onAddRule,
  onToggleRule,
  onDeleteRule,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Rule Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<RuleCategory>('qualification');
  const [newRuleText, setNewRuleText] = useState('');

  const ruleCategories: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Rules' },
    { id: 'qualification', label: 'Qualification' },
    { id: 'outreach_style', label: 'Outreach Style' },
    { id: 'timing', label: 'Timing & Schedule' },
    { id: 'follow_up', label: 'Follow-Ups' },
    { id: 'demo_preferences', label: 'Demo Preferences' },
  ];

  const filteredRules = rules.filter((r) => 
    activeCategory === 'all' ? true : r.category === activeCategory
  );

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;
    const text = inputText.trim();
    setInputText('');
    setIsSubmitting(true);
    try {
      await onSendTrainingMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newRuleText.trim()) return;
    const success = await onAddRule({
      category: newCategory,
      title: newTitle.trim(),
      rule_text: newRuleText.trim(),
      is_active: true,
      parameters: {},
    });
    if (success) {
      setNewTitle('');
      setNewRuleText('');
      setIsAddModalOpen(false);
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
              <span className="text-emerald-400 font-bold">PERMANENT PERSONAL TRAINING</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Agent Training & Operational Rules
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Instruct your AI agent through conversation or direct rule management. Structured rules are permanently enforced in all research, email drafting, and reply workflows.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-white text-zinc-950 font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer shadow-md shadow-white/10"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Custom Rule</span>
            </button>
          </div>
        </div>

        {/* 2-Column Split: Conversational Training (Left) & Active Operational Rules (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Conversational Training Workspace (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-zinc-950/90 border border-white/[0.08] p-5 shadow-2xl shadow-black/80 flex flex-col h-[640px]">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Training Console</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Talk directly to teach your agent</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                Memory Active
              </span>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {trainingMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-zinc-800 text-white ml-6 border border-white/10'
                      : 'bg-zinc-900/90 text-zinc-200 mr-6 border border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                    <span className="font-bold text-zinc-400">
                      {msg.role === 'user' ? 'You (Operative)' : 'Irzam Studio'}
                    </span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendPrompt} className="pt-3 mt-3 border-t border-white/[0.06]">
              <div className="relative">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="e.g. Only qualify businesses with at least 50 Google reviews and pitch them 24/7 AI chatbots..."
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-xl p-3 pr-10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 resize-none font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSubmitting}
                  className="absolute right-2.5 bottom-3 p-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                The agent will extract operational rules and add them to your permanent rule set.
              </span>
            </form>
          </div>

          {/* RIGHT: Structured Operational Rules Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Category Filter Pills */}
            <div className="flex items-center justify-between gap-3 bg-zinc-950/80 border border-white/[0.08] p-2 rounded-xl">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {ruleCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-mono text-zinc-500 pr-2">
                {rules.filter(r => r.is_active).length} Active Rules
              </span>
            </div>

            {/* Rules Cards List */}
            <div className="space-y-3">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4.5 rounded-2xl border transition-all ${
                    rule.is_active
                      ? 'bg-zinc-950/90 border-white/[0.1] shadow-xl shadow-black/40'
                      : 'bg-zinc-950/40 border-white/[0.04] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-cyan-400">
                        {rule.category.replace('_', ' ')}
                      </span>
                      <h4 className="font-extrabold text-sm text-white">
                        {rule.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => onToggleRule(rule.id, !rule.is_active)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold transition cursor-pointer ${
                          rule.is_active
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                            : 'bg-zinc-900 text-zinc-500 border border-white/5'
                        }`}
                      >
                        {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                      </button>
                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed pl-1">
                    {rule.rule_text}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>Version {rule.version}</span>
                    <span>Updated {new Date(rule.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {filteredRules.length === 0 && (
                <div className="p-12 text-center text-zinc-600 border border-dashed border-white/10 rounded-2xl">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                  <p className="text-sm font-semibold">No operational rules in this category.</p>
                  <p className="text-xs text-zinc-500 mt-1">Teach your agent in the left console or click "+ Add Custom Rule".</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Add Custom Rule */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-950 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="font-extrabold text-sm text-white">Create Structured Operational Rule</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRuleSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-300 block">Rule Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Minimum 50 Google Reviews"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-300 block">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as RuleCategory)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="qualification">Qualification (Google reviews, website check)</option>
                    <option value="outreach_style">Outreach Style (word count, tone)</option>
                    <option value="timing">Timing & Scheduling (PKT windows)</option>
                    <option value="follow_up">Follow-Up Rules (intervals, stages)</option>
                    <option value="demo_preferences">Demo Preferences (Tailwind, features)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-300 block">Rule Directive Text</label>
                  <textarea
                    rows={4}
                    required
                    value={newRuleText}
                    onChange={(e) => setNewRuleText(e.target.value)}
                    placeholder="Exact instruction the agent must adhere to..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none resize-none font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-white text-zinc-950 font-extrabold text-xs hover:bg-zinc-200 transition shadow-md"
                  >
                    Save Operational Rule
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
