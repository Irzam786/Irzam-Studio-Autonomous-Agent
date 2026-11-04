import React, { useState } from 'react';
import { 
  Plug, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Save, 
  ShieldCheck, 
  Database, 
  Mail, 
  Globe, 
  Compass, 
  SearchCheck, 
  AtSign, 
  Sliders, 
  X,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { ConnectorInfo, ConnectorCategory } from '../types';

interface ConnectorsViewProps {
  connectors: ConnectorInfo[];
  onRefreshConnectors: () => Promise<void>;
  onSaveConnector: (id: string, credential: string, enabledForAgent: boolean, extra?: any) => Promise<boolean>;
  onTestConnector: (id: string) => Promise<{ success: boolean; message: string; latency?: number }>;
  onDisconnectConnector: (id: string) => Promise<boolean>;
  onConnectGmailPopup: () => void;
}

export const ConnectorsView: React.FC<ConnectorsViewProps> = ({
  connectors,
  onRefreshConnectors,
  onSaveConnector,
  onTestConnector,
  onDisconnectConnector,
  onConnectGmailPopup,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  
  // Configure Modal State
  const [configModalConnector, setConfigModalConnector] = useState<ConnectorInfo | null>(null);
  const [credentialInput, setCredentialInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [agentEnabledInput, setAgentEnabledInput] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const categories: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Connectors' },
    { id: 'ai_intelligence', label: 'AI & Intelligence' },
    { id: 'database', label: 'Database & Storage' },
    { id: 'email_communication', label: 'Email & Communication' },
    { id: 'business_discovery', label: 'Business Discovery' },
    { id: 'web_research', label: 'Web Research' },
    { id: 'email_discovery', label: 'Email Discovery' },
    { id: 'website_deployment', label: 'Website Deployment' },
  ];

  const filteredConnectors = connectors.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' ? true : c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const result = await onTestConnector(id);
      setTestResult({ id, success: result.success, message: result.message });
      await onRefreshConnectors();
    } finally {
      setTestingId(null);
    }
  };

  const openConfigModal = (connector: ConnectorInfo) => {
    setConfigModalConnector(connector);
    setCredentialInput('');
    setShowSecret(false);
    setAgentEnabledInput(connector.enabledForAgent);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModalConnector) return;
    setIsSaving(true);
    try {
      const success = await onSaveConnector(
        configModalConnector.id, 
        credentialInput.trim(), 
        agentEnabledInput
      );
      if (success) {
        setConfigModalConnector(null);
        await onRefreshConnectors();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Provider authentic logo renderer
  const renderProviderIcon = (provider: string) => {
    switch (provider) {
      case 'freellmapi':
        return <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 font-bold font-mono">QW</div>;
      case 'supabase':
        return <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold font-mono">SB</div>;
      case 'google_workspace':
        return <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 font-bold font-mono">GM</div>;
      case 'netlify':
        return <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 font-bold font-mono">NL</div>;
      case 'google_places':
        return <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 font-bold font-mono">GP</div>;
      case 'open_places':
        return <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400 font-bold font-mono">OP</div>;
      case 'tavily':
        return <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 font-bold font-mono">TV</div>;
      case 'you_mcp':
        return <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 font-bold font-mono">YU</div>;
      case 'hunter':
        return <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400 font-bold font-mono">HN</div>;
      case 'prospeo':
        return <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-400 font-bold font-mono">PS</div>;
      default:
        return <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-white"><Plug className="w-5 h-5" /></div>;
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
              <span className="text-cyan-400 font-bold">BASE44 CONNECTORS MARKETPLACE</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Integrations & Connectors
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Centralized integration catalog. Connect your API keys, Google Workspace accounts, and cloud engines. Securely encrypted and persisted to Supabase.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onRefreshConnectors()}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Refresh Connectors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onConnectGmailPopup}
              className="flex items-center gap-2 bg-white text-zinc-950 font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer shadow-md shadow-white/10"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Connect Gmail (OAuth)</span>
            </button>
          </div>
        </div>

        {/* Global Test Notice if available */}
        {testResult && (
          <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className="font-bold block">Connection Test Result</span>
              <span>{testResult.message}</span>
            </div>
            <button onClick={() => setTestResult(null)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/80 border border-white/[0.08] p-3 rounded-2xl shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search connectors by name, description, or provider..."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Connectors Tiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredConnectors.map((connector) => {
            const isConnected = connector.status === 'connected';
            const isTesting = testingId === connector.id;

            return (
              <div
                key={connector.id}
                className="rounded-2xl bg-zinc-950/90 border border-white/[0.08] hover:border-white/20 transition-all p-5 flex flex-col justify-between space-y-4 shadow-xl shadow-black/40 group"
              >
                {/* Tile Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {renderProviderIcon(connector.provider)}
                      <div>
                        <h3 className="font-extrabold text-sm text-white group-hover:text-cyan-300 transition">
                          {connector.name}
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mt-0.5">
                          {connector.authType.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                      isConnected
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50'
                        : connector.status === 'error'
                        ? 'bg-rose-950/70 text-rose-300 border-rose-700/50'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700/50'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-zinc-500'}`}></span>
                      {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {connector.description}
                  </p>

                  {/* Masked Key & Last Verified */}
                  <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>
                      {connector.maskedKey ? (
                        <span className="text-zinc-300 font-semibold">{connector.maskedKey}</span>
                      ) : (
                        <span className="text-zinc-600">No credential set</span>
                      )}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {connector.enabledForAgent ? (
                        <span className="text-emerald-400">Agent Enabled</span>
                      ) : (
                        <span className="text-zinc-500">Agent Disabled</span>
                      )}
                    </span>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {connector.allowedCapabilities.slice(0, 3).map((cap) => (
                      <span key={cap} className="text-[9px] font-mono bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-white/[0.04]">
                        {cap}
                      </span>
                    ))}
                    {connector.allowedCapabilities.length > 3 && (
                      <span className="text-[9px] font-mono text-zinc-500">
                        +{connector.allowedCapabilities.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTestConnection(connector.id)}
                    disabled={isTesting || (!isConnected && connector.authType !== 'mcp')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                    title="Test live API endpoint"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-white' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {connector.authType === 'oauth2' ? (
                      <button
                        onClick={onConnectGmailPopup}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-zinc-950 font-extrabold text-xs hover:bg-zinc-200 transition cursor-pointer shadow-sm"
                      >
                        Authorize
                      </button>
                    ) : (
                      <button
                        onClick={() => openConfigModal(connector)}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs border border-white/10 transition cursor-pointer"
                      >
                        Configure
                      </button>
                    )}

                    {isConnected && (
                      <button
                        onClick={() => onDisconnectConnector(connector.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 border border-white/10 text-xs transition cursor-pointer"
                        title="Disconnect connector"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Configuration Modal */}
        {configModalConnector && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-950 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-3">
                  {renderProviderIcon(configModalConnector.provider)}
                  <div>
                    <h2 className="text-base font-extrabold text-white">
                      Configure {configModalConnector.name}
                    </h2>
                    <p className="text-xs text-zinc-400">{configModalConnector.description}</p>
                  </div>
                </div>
                <button onClick={() => setConfigModalConnector(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
                {/* Credential Input */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-300 block font-mono">
                    {configModalConnector.authType === 'api_key' ? 'API Key Secret' : 'Access Token / Credential'}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={credentialInput}
                      onChange={(e) => setCredentialInput(e.target.value)}
                      placeholder={configModalConnector.maskedKey || 'Paste your secret key here...'}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Saved to Supabase database secrets. Never exposed to public browser scripts.
                  </p>
                </div>

                {/* Agent Permission Toggle */}
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Enable for Autonomous AI Agent</span>
                    <span className="text-[11px] text-zinc-400">Allow agent tools to autonomously query this provider during research.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={agentEnabledInput}
                    onChange={(e) => setAgentEnabledInput(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setConfigModalConnector(null)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-extrabold text-xs hover:bg-zinc-200 transition shadow-md shadow-white/10"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save & Encrypt'}</span>
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
