import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatWorkspace } from './components/ChatWorkspace';
import { LeadsView } from './components/LeadsView';
import { ConnectorsView } from './components/ConnectorsView';
import { TrainingView } from './components/TrainingView';
import { CampaignsView } from './components/CampaignsView';
import { OutreachQueueView } from './components/OutreachQueueView';
import { InboxRepliesView } from './components/InboxRepliesView';
import { ReportsView } from './components/ReportsView';
import { AutomationView } from './components/AutomationView';
import { ApiBrainView } from './components/ApiBrainView';
import { DemosView } from './components/DemosView';
import { SandboxModal } from './components/SandboxModal';
import { ComposeEmailModal } from './components/ComposeEmailModal';
import { LockScreen } from './components/LockScreen';
import { 
  ChatSession, 
  ChatMessage, 
  ChatAttachment, 
  HostedDemo, 
  GmailAccount, 
  DetectedReply, 
  LogEntry, 
  SystemConfig, 
  CronStatus,
  Lead,
  DashboardTab,
  ActivityStage,
  ThemeMode,
  AgentRule,
  TrainingMessage,
  Campaign,
  OutreachQueueItem,
  DailyReport,
  WorkflowRun,
  ConnectorInfo
} from './types';
import { 
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  initSupabase, 
  getSupabase,
  loadConfigFromSupabase,
  saveConfigToSupabase,
  saveSessionToSupabase, 
  saveDemoToSupabase,
  loadSessionsFromSupabase,
  loadDemosFromSupabase,
  loadGmailTokensFromSupabase,
  loadLeadsFromSupabase,
  saveLeadToSupabase,
  updateLeadStatusInSupabase,
  deleteLeadFromSupabase,
  loadRulesFromSupabase,
  saveRuleToSupabase,
  toggleRuleInSupabase,
  deleteRuleFromSupabase,
  loadCampaignsFromSupabase,
  saveCampaignToSupabase,
  loadQueueFromSupabase,
  loadReportsFromSupabase,
  loadWorkflowRunsFromSupabase
} from './lib/supabase';

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: 'session-apex-intel',
    title: 'Apex Capital Institutional Demo',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    pinned: true,
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Irzam Studio: Deploy a dark institutional treasury prototype for Apex Capital Partners with real-time portfolio metrics.',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `Irzam Studio Operative Dispatch: Apex Capital Partners prototype compiled and deployed live.

Architecture Summary:
- Obsidian Aesthetic: #050507 obsidian background with crisp white typography.
- Treasury Allocation: Liquid Staking (45%), Arbitrage Desk (35%), US T-Bills (20%).
- Live Edge Deployment: Netlify-compatible static demo live for partner review.`,
        timestamp: new Date(Date.now() - 3600000 * 3.9).toISOString(),
        modelUsed: 'Qwen 2.5 Coder 32B',
        deployedDemo: {
          id: 'demo-apex-wealth',
          slug: 'apex-capital-portfolio',
          title: 'Apex Wealth & Institutional Treasury',
          clientName: 'Apex Capital Partners',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          expiresAt: new Date(Date.now() + 3600000 * 44).toISOString(),
          framework: 'Tailwind + Alpine.js',
          status: 'active',
          views: 78,
          previewUrl: '/demo/demo-apex-wealth',
          deployTarget: 'edge_sandbox',
          liveNetlifyUrl: 'https://apex-portfolio.netlify.app',
          htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Apex Wealth</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-[#050507] text-white p-8"><h1 class="text-3xl font-extrabold">Apex Capital Institutional</h1><p class="text-zinc-400">Algorithmic Treasury & Risk Engine</p></body></html>`
        }
      }
    ]
  }
];

export default function App() {
  // 1. PIN Login Access
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('irzam_authenticated') === 'true';
  });

  // 2. Navigation Tabs (Base44 & ChatGPT Permanent Left Nav)
  const [activeTab, setActiveTab] = useState<DashboardTab>('chat');

  // 3. Model Switcher & Dedicated Auto Mode
  const [selectedModel, setSelectedModel] = useState<string>('Qwen 3.8 Max');
  const [isAutoModel, setIsAutoModel] = useState<boolean>(true);

  // Core Data States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [agentRules, setAgentRules] = useState<AgentRule[]>([]);
  const [trainingMessages, setTrainingMessages] = useState<TrainingMessage[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [outreachQueue, setOutreachQueue] = useState<OutreachQueueItem[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);

  // Chat sessions
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('irzam_chat_sessions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || 'session-apex-intel';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Backend state
  const [hostedDemos, setHostedDemos] = useState<HostedDemo[]>([]);
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [detectedReplies, setDetectedReplies] = useState<DetectedReply[]>([]);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);

  const [config, setConfig] = useState<SystemConfig>({
    ownerPin: '1818',
    freellmApiKey: '',
    freellmBaseUrl: 'https://api.freellmapi.com/v1',
    selectedModel: 'Qwen 3.8 Max',
    temperature: 0.7,
    systemPrompt: 'You are Irzam Studio, an executive AI agent platform...',
    autoDeployDemos: true,
    replyWatcherIntervalMinutes: 60,
    soundAlerts: true,
    netlify: {
      token: '',
      siteId: '',
      siteName: 'irzam-studio-demos',
      connected: false,
    },
    googleOAuth: {
      clientId: '',
      clientSecret: '',
      connected: false,
      redirectUri: 'http://localhost:3000/oauth/callback',
    },
    supabase: {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
      connected: true,
    }
  });

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [activityStage, setActivityStage] = useState<ActivityStage>('idle');
  const [activityLabel, setActivityLabel] = useState<string>('Generating response...');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('irzam_theme') as ThemeMode) || 'dark';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [activeSandboxDemo, setActiveSandboxDemo] = useState<HostedDemo | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialAccount, setComposeInitialAccount] = useState<string | undefined>();
  const [composeInitialDemo, setComposeInitialDemo] = useState<HostedDemo | null>(null);
  const [composeInitialReply, setComposeInitialReply] = useState<DetectedReply | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // Sync theme
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('irzam_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setNotificationBanner({ message, type });
    setTimeout(() => setNotificationBanner(null), 4000);
  };

  // Fetch all comprehensive data from backend
  const fetchAllData = async () => {
    try {
      // 1. Status & Cron
      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setCronStatus(sData.cron);
      }

      // 2. Config
      const configRes = await fetch('/api/config');
      if (configRes.ok) {
        const cData = await configRes.json();
        setConfig(cData);
        if (cData.selectedModel) setSelectedModel(cData.selectedModel);
        if (cData.supabase?.url && cData.supabase?.anonKey) {
          initSupabase(cData.supabase.url, cData.supabase.anonKey);
        }
      }

      // 3. Connectors
      const connRes = await fetch('/api/connectors');
      if (connRes.ok) {
        const connData = await connRes.json();
        setConnectors(connData.connectors || []);
      }

      // 4. Operational Rules & Training Messages
      const rulesRes = await fetch('/api/training/rules');
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setAgentRules(rulesData.rules || []);
      }

      const tMsgRes = await fetch('/api/training/messages');
      if (tMsgRes.ok) {
        const tMsgData = await tMsgRes.json();
        setTrainingMessages(tMsgData.messages || []);
      }

      // 5. Campaigns
      const campRes = await fetch('/api/campaigns');
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
      }

      // 6. Outreach Queue
      const queueRes = await fetch('/api/outreach/queue');
      if (queueRes.ok) {
        const qData = await queueRes.json();
        setOutreachQueue(qData.queue || []);
      }

      // 7. Reports
      const repRes = await fetch('/api/reports');
      if (repRes.ok) {
        const repData = await repRes.json();
        setDailyReports(repData.reports || []);
      }

      // 8. Automation Workflow Runs & Logs
      const wfRes = await fetch('/api/automation/history');
      if (wfRes.ok) {
        const wfData = await wfRes.json();
        setWorkflowRuns(wfData.runs || []);
      }

      const logsRes = await fetch('/api/logs');
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setSystemLogs(lData.logs || []);
      }

      // 9. Demos
      const demosRes = await fetch('/api/demos');
      if (demosRes.ok) {
        const dData = await demosRes.json();
        setHostedDemos(dData.demos || []);
      }

      // 10. Gmail & Replies
      const gmailRes = await fetch('/api/gmail/accounts');
      if (gmailRes.ok) {
        const gData = await gmailRes.json();
        setGmailAccounts(gData.accounts || []);
        setDetectedReplies(gData.replies || []);
      }

      // 11. Leads
      const leadsRes = await fetch('/api/leads');
      if (leadsRes.ok) {
        const lData = await leadsRes.json();
        setLeads(lData.leads || []);
      }
    } catch (err) {
      console.error('Data fetch notice:', err);
    }
  };

  // Auth unlock
  const handleUnlock = async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        sessionStorage.setItem('irzam_authenticated', 'true');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLockTerminal = () => {
    sessionStorage.removeItem('irzam_authenticated');
    setIsAuthenticated(false);
  };

  // On authenticated init
  useEffect(() => {
    if (isAuthenticated) {
      initSupabase(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
      fetchAllData();

      // Cloud state loader
      loadConfigFromSupabase().then((cfg) => {
        if (cfg) {
          if (cfg.freellmApiKey) setConfig(p => ({ ...p, freellmApiKey: cfg.freellmApiKey! }));
          if (cfg.ownerPin) setConfig(p => ({ ...p, ownerPin: cfg.ownerPin! }));
        }
      }).catch(() => {});

      loadRulesFromSupabase().then(r => { if (r && r.length > 0) setAgentRules(r); }).catch(() => {});
      loadLeadsFromSupabase().then(l => { if (l && l.length > 0) setLeads(l); }).catch(() => {});
      loadCampaignsFromSupabase().then(c => { if (c && c.length > 0) setCampaigns(c); }).catch(() => {});
      loadQueueFromSupabase().then(q => { if (q && q.length > 0) setOutreachQueue(q); }).catch(() => {});
      loadReportsFromSupabase().then(rp => { if (rp && rp.length > 0) setDailyReports(rp); }).catch(() => {});
      loadWorkflowRunsFromSupabase().then(w => { if (w && w.length > 0) setWorkflowRuns(w); }).catch(() => {});

      // OAuth message listener
      const handleGlobalOAuthMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
          const { email } = event.data;
          await fetchAllData();
          showNotification(`Connected Google Workspace (${email}) with offline Refresh Token!`, 'success');
        }
      };
      window.addEventListener('message', handleGlobalOAuthMessage);
      const interval = setInterval(fetchAllData, 20000);

      return () => {
        clearInterval(interval);
        window.removeEventListener('message', handleGlobalOAuthMessage);
      };
    }
  }, [isAuthenticated]);

  // Save sessions to localStorage & sync
  useEffect(() => {
    try {
      localStorage.setItem('irzam_chat_sessions', JSON.stringify(sessions));
      const current = sessions.find(s => s.id === activeSessionId);
      if (current && config.supabase?.connected) {
        saveSessionToSupabase(current);
      }
    } catch (e) {
      console.error(e);
    }
  }, [sessions, activeSessionId, config.supabase?.connected]);

  // Chat message submission
  const handleSendMessage = async (
    content: string, 
    attachments: ChatAttachment[], 
    model: string, 
    autoRoute: boolean
  ) => {
    setIsGenerating(true);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
    const updatedMessages = [...(currentSession ? currentSession.messages : []), userMsg];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? {
              ...s,
              title: s.messages.length === 0 ? content.slice(0, 32) || 'Mission Intel' : s.title,
              updatedAt: new Date().toISOString(),
              messages: updatedMessages,
            }
          : s
      )
    );

    const asstMsgId = `asst-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: asstMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      modelUsed: model,
      status: 'sending'
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [...updatedMessages, initialAssistantMsg],
            }
          : s
      )
    );

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setActivityStage('receiving');
    setActivityLabel('Receiving message...');

    try {
      const streamRes = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: content,
          attachments,
          history: updatedMessages.slice(-8),
          model,
          autoRoute,
          threadId: currentSession.id,
        }),
      });

      if (streamRes.ok && streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        let finalModelUsed = model;
        let deployedDemoData: HostedDemo | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            try {
              const payload = JSON.parse(trimmed.slice(5).trim());
              if (payload.stage) {
                setActivityStage(payload.stage);
                if (payload.label) setActivityLabel(payload.label);
              }
              if (payload.text) {
                accumulatedText += payload.text;
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === currentSession.id
                      ? {
                          ...s,
                          messages: s.messages.map((m) =>
                            m.id === asstMsgId
                              ? { ...m, content: accumulatedText, modelUsed: finalModelUsed }
                              : m
                          ),
                        }
                      : s
                  )
                );
              }
              if (payload.modelUsed) finalModelUsed = payload.modelUsed;
              if (payload.deployedDemo) deployedDemoData = payload.deployedDemo;
              if (payload.fullText) accumulatedText = payload.fullText;
            } catch {}
          }
        }

        if (deployedDemoData) {
          saveDemoToSupabase(deployedDemoData).catch(() => {});
          fetchAllData();
          showNotification(`Client demo deployed: "${deployedDemoData.title}"!`);
        }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSession.id
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === asstMsgId
                      ? { 
                          ...m, 
                          content: accumulatedText || 'Irzam Studio intelligence dispatch complete.',
                          modelUsed: finalModelUsed,
                          deployedDemo: deployedDemoData,
                          status: 'done' 
                        }
                      : m
                  ),
                }
              : s
          )
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSession.id
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === asstMsgId
                    ? {
                        ...m,
                        content: `Communication with the AI cluster was interrupted (${err.message || 'connection timeout'}). The system auto-recovered. Please check your model configuration or retry.`,
                        status: 'error',
                      }
                    : m
                ),
              }
            : s
        )
      );
    } finally {
      setIsGenerating(false);
      setActivityStage('idle');
      setActivityLabel('');
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setActivityStage('idle');
    setActivityLabel('');
    showNotification('Response generation stopped.');
  };

  const handleRegenerate = async () => {
    const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
    if (!currentSession) return;
    const lastUserMsg = [...currentSession.messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      await handleSendMessage(lastUserMsg.content, lastUserMsg.attachments || [], selectedModel, isAutoModel);
    }
  };

  // Google OAuth popup
  const handleOpenGoogleOAuthPopup = async () => {
    try {
      const res = await fetch(`/api/gmail/oauth/auth-url?redirectOrigin=${encodeURIComponent(window.location.origin)}`);
      const data = await res.json();
      const width = 560;
      const height = 660;
      const left = Math.round(window.screen.width / 2 - width / 2);
      const top = Math.round(window.screen.height / 2 - height / 2);
      window.open(
        data.authUrl,
        'google_oauth_popup',
        `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`
      );
    } catch {
      showNotification('Failed to open Google OAuth window.', 'warn');
    }
  };

  // Connector actions
  const handleSaveConnector = async (id: string, credential: string, enabledForAgent: boolean) => {
    try {
      const res = await fetch(`/api/connectors/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, enabledForAgent }),
      });
      if (res.ok) {
        showNotification('Connector settings saved and encrypted in Supabase!');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleTestConnector = async (id: string) => {
    try {
      const res = await fetch(`/api/connectors/${id}/test`, { method: 'POST' });
      const data = await res.json();
      return { success: data.success, message: data.message, latency: data.latency };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection test failed' };
    }
  };

  const handleDisconnectConnector = async (id: string) => {
    try {
      const res = await fetch(`/api/connectors/${id}/disconnect`, { method: 'POST' });
      if (res.ok) {
        showNotification('Connector disconnected.');
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Personal Training handlers
  const handleSendTrainingMessage = async (message: string) => {
    try {
      const res = await fetch('/api/training/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        const data = await res.json();
        setTrainingMessages(prev => [...prev, data.userMessage, data.assistantMessage]);
        setAgentRules(prev => [data.newRule, ...prev]);
        saveRuleToSupabase(data.newRule).catch(() => {});
        showNotification(`Learned and committed rule: "${data.newRule.title}"!`);
      }
    } catch {
      showNotification('Training message transmission failed.', 'warn');
    }
  };

  const handleAddRule = async (ruleData: Omit<AgentRule, 'id' | 'created_at' | 'updated_at' | 'version'>) => {
    try {
      const res = await fetch('/api/training/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });
      if (res.ok) {
        const data = await res.json();
        setAgentRules(prev => [data.rule, ...prev]);
        saveRuleToSupabase(data.rule).catch(() => {});
        showNotification(`Operational rule "${data.rule.title}" activated!`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleToggleRule = async (id: string, is_active: boolean) => {
    try {
      const res = await fetch(`/api/training/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      });
      if (res.ok) {
        setAgentRules(prev => prev.map(r => r.id === id ? { ...r, is_active } : r));
        toggleRuleInSupabase(id, is_active).catch(() => {});
        showNotification(`Rule ${is_active ? 'activated' : 'paused'}.`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/training/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAgentRules(prev => prev.filter(r => r.id !== id));
        deleteRuleFromSupabase(id).catch(() => {});
        showNotification('Rule deleted.');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Campaigns handlers
  const handleCreateCampaign = async (campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'leads_count' | 'sent_count' | 'replies_count'>) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(prev => [data.campaign, ...prev]);
        saveCampaignToSupabase(data.campaign).catch(() => {});
        showNotification(`Campaign "${data.campaign.name}" launched!`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleToggleCampaignStatus = async (id: string, status: Campaign['status']) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        showNotification('Campaign deleted.');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Outreach Queue handlers
  const handleDispatchDueQueue = async () => {
    try {
      const res = await fetch('/api/outreach/queue/dispatch-due', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showNotification(`Dispatched ${data.count} due email slot(s)!`);
        await fetchAllData();
      }
    } catch {
      showNotification('Queue dispatch error.', 'warn');
    }
  };

  const handleCheckFollowups = async () => {
    try {
      const res = await fetch('/api/outreach/followups/check', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showNotification(`Follow-up check complete. ${data.followupsQueued} stages queued.`);
        await fetchAllData();
      }
    } catch {
      showNotification('Follow-up check error.', 'warn');
    }
  };

  const handleCancelQueueSlot = async (id: string) => {
    try {
      const res = await fetch(`/api/outreach/queue/${id}/cancel`, { method: 'POST' });
      if (res.ok) {
        setOutreachQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'cancelled' } : q));
        showNotification('Outreach slot cancelled.');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Inbox & AI Reply handlers
  const handleScanInboxes = async () => {
    try {
      const res = await fetch('/api/inbox/scan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDetectedReplies(data.replies || []);
        showNotification('All connected inboxes scanned!');
      }
    } catch {
      showNotification('Inbox scan error.', 'warn');
    }
  };

  const handleGenerateReplyResponse = async (replyId: string) => {
    try {
      const res = await fetch(`/api/inbox/replies/${replyId}/generate-response`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        return data.suggestedResponse;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSendReplyResponse = async (replyId: string, responseText: string) => {
    try {
      const res = await fetch(`/api/inbox/replies/${replyId}/send-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText }),
      });
      if (res.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Reports handlers
  const handleGenerateReport = async () => {
    try {
      const res = await fetch('/api/reports/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDailyReports(prev => [data.report, ...prev]);
        showNotification('10 PM PKT Daily Report generated and saved!');
      }
    } catch {
      showNotification('Report compilation failed.', 'warn');
    }
  };

  const handleSendReportEmail = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}/send`, { method: 'POST' });
      if (res.ok) {
        showNotification('Report emailed to operator via Gmail!');
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Workflow trigger handler
  const handleTriggerWorkflow = async (workflow: string) => {
    try {
      const res = await fetch(`/api/automation/trigger/${workflow}`, { method: 'POST' });
      if (res.ok) {
        showNotification(`Workflow "${workflow}" completed!`);
        await fetchAllData();
      }
    } catch {
      showNotification('Workflow trigger error.', 'warn');
    }
  };

  // Leads handlers
  const handleAddLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });
      if (res.ok) {
        const data = await res.json();
        setLeads((prev) => [data.lead, ...prev]);
        saveLeadToSupabase(data.lead).catch(() => {});
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: Lead['status']): Promise<boolean> => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status, updated_at: new Date().toISOString() } : l)));
        updateLeadStatusInSupabase(id, status).catch(() => {});
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteLead = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
        deleteLeadFromSupabase(id).catch(() => {});
        showNotification('Lead removed from database.');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDispatchLeadEmail = async (leadId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/leads/${leadId}/dispatch`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleOpenComposeWithLead = (lead: Lead) => {
    const demo = hostedDemos.find((d) => d.liveNetlifyUrl === lead.demo_url || d.previewUrl === lead.demo_url) || hostedDemos[0] || null;
    setComposeInitialDemo(demo);
    setComposeInitialReply(null);
    setComposeInitialAccount(gmailAccounts[0]?.id || 'gmail-1');
    setIsComposeOpen(true);
  };

  // Demos & Config handlers
  const handleDeployManualDemo = async (title: string, clientName: string, htmlContent: string) => {
    const res = await fetch('/api/demos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, clientName, htmlContent }),
    });
    if (res.ok) {
      const data = await res.json();
      showNotification(`Demo "${title}" deployed live!`);
      await fetchAllData();
      if (data.demo) setActiveSandboxDemo(data.demo);
    }
  };

  const handleDeleteDemo = async (id: string) => {
    const res = await fetch(`/api/demos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setHostedDemos((prev) => prev.filter((d) => d.id !== id));
      showNotification('Demo removed.');
    }
  };

  const handleSaveConfig = async (updated: Partial<SystemConfig>) => {
    saveConfigToSupabase(updated).catch(() => {});
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      await fetchAllData();
      showNotification('Configuration saved.');
    }
  };

  const handleSendEmail = async (emailData: any) => {
    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });
      if (res.ok) {
        const result = await res.json();
        showNotification(`Outreach dispatched to ${result.sentTo}!`, 'success');
        await fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Mission Thread',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeSessionId === id && next.length > 0) {
        setActiveSessionId(next[0].id);
      }
      return next;
    });
  };

  const handleTogglePinSession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    );
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: new Date().toISOString() } : s))
    );
  };

  if (!isAuthenticated) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  const unreadReplies = detectedReplies.filter((r) => r.status === 'unread');
  const pendingLeadsCount = leads.filter((l) => l.status === 'pending').length;
  const scheduledQueueCount = outreachQueue.filter((q) => q.status === 'scheduled').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07070a] text-zinc-100 font-sans selection:bg-white/20 selection:text-white">
      {/* Top Notification Toast */}
      {notificationBanner && (
        <div className="fixed top-3 right-5 z-50 bg-zinc-900 border border-white/20 shadow-2xl rounded-xl px-4 py-2.5 flex items-center gap-3 text-xs text-white">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>{notificationBanner.message}</span>
        </div>
      )}

      {/* PERMANENT LEFT SIDEBAR (Desktop permanent + Mobile slide-over drawer) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onTogglePinSession={handleTogglePinSession}
        onRenameSession={handleRenameSession}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobile={false}
        onLockTerminal={handleLockTerminal}
        pendingLeadsCount={pendingLeadsCount}
        unreadRepliesCount={unreadReplies.length}
        scheduledQueueCount={scheduledQueueCount}
      />

      {/* Mobile Drawer */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onTogglePinSession={handleTogglePinSession}
        onRenameSession={handleRenameSession}
        isOpen={isMobileSidebarOpen}
        onToggleOpen={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobile={true}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLockTerminal={handleLockTerminal}
        pendingLeadsCount={pendingLeadsCount}
        unreadRepliesCount={unreadReplies.length}
        scheduledQueueCount={scheduledQueueCount}
      />

      {/* MAIN VIEWPORT CANVAS */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          onOpenCompose={() => {
            setComposeInitialDemo(null);
            setComposeInitialReply(null);
            setIsComposeOpen(true);
          }}
          onLockTerminal={handleLockTerminal}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />

        {/* Dynamic Tab Workspace View */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* 1. Chat Workspace */}
          {activeTab === 'chat' && (
            <ChatWorkspace
              session={activeSession}
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
              activityStage={activityStage}
              activityLabel={activityLabel}
              onStopGeneration={handleStopGeneration}
              onRegenerate={handleRegenerate}
              onOpenSandbox={(demo) => setActiveSandboxDemo(demo)}
              onOpenComposeWithDemo={(demo) => {
                setComposeInitialDemo(demo);
                setComposeInitialReply(null);
                setComposeInitialAccount(gmailAccounts[0]?.id || 'gmail-1');
                setIsComposeOpen(true);
              }}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              isAutoModel={isAutoModel}
              onToggleAutoModel={() => setIsAutoModel(!isAutoModel)}
            />
          )}

          {/* 2. Personal Training */}
          {activeTab === 'training' && (
            <TrainingView
              rules={agentRules}
              trainingMessages={trainingMessages}
              onSendTrainingMessage={handleSendTrainingMessage}
              onAddRule={handleAddRule}
              onToggleRule={handleToggleRule}
              onDeleteRule={handleDeleteRule}
            />
          )}

          {/* 3. AI Brain */}
          {activeTab === 'brain' && (
            <ApiBrainView
              config={config}
              onSaveConfig={handleSaveConfig}
            />
          )}

          {/* 4. Connectors Marketplace (Base44 Inspired) */}
          {activeTab === 'connectors' && (
            <ConnectorsView
              connectors={connectors}
              onRefreshConnectors={fetchAllData}
              onSaveConnector={handleSaveConnector}
              onTestConnector={handleTestConnector}
              onDisconnectConnector={handleDisconnectConnector}
              onConnectGmailPopup={handleOpenGoogleOAuthPopup}
            />
          )}

          {/* 5. Leads & Research */}
          {activeTab === 'leads' && (
            <LeadsView
              leads={leads}
              demos={hostedDemos}
              gmailAccounts={gmailAccounts}
              onRefreshLeads={fetchAllData}
              onAddLead={handleAddLead}
              onUpdateLeadStatus={handleUpdateLeadStatus}
              onDeleteLead={handleDeleteLead}
              onDispatchLeadEmail={handleDispatchLeadEmail}
              onOpenSandbox={(demo) => setActiveSandboxDemo(demo)}
              onOpenComposeWithLead={handleOpenComposeWithLead}
            />
          )}

          {/* 6. Campaigns */}
          {activeTab === 'campaigns' && (
            <CampaignsView
              campaigns={campaigns}
              demos={hostedDemos}
              onRefreshCampaigns={fetchAllData}
              onCreateCampaign={handleCreateCampaign}
              onToggleCampaignStatus={handleToggleCampaignStatus}
              onDeleteCampaign={handleDeleteCampaign}
            />
          )}

          {/* 7. Outreach Queue */}
          {activeTab === 'queue' && (
            <OutreachQueueView
              queue={outreachQueue}
              onRefreshQueue={fetchAllData}
              onDispatchDue={handleDispatchDueQueue}
              onCheckFollowups={handleCheckFollowups}
              onCancelSlot={handleCancelQueueSlot}
            />
          )}

          {/* 8. Inbox & Replies */}
          {activeTab === 'inbox' && (
            <InboxRepliesView
              replies={detectedReplies}
              gmailAccounts={gmailAccounts}
              onScanInboxes={handleScanInboxes}
              onGenerateResponse={handleGenerateReplyResponse}
              onSendResponse={handleSendReplyResponse}
              onOpenComposeWithReply={(reply) => {
                setComposeInitialReply(reply);
                setComposeInitialAccount(reply.accountId);
                setIsComposeOpen(true);
              }}
            />
          )}

          {/* 9. Demo Workspace */}
          {activeTab === 'demos' && (
            <DemosView
              demos={hostedDemos}
              onOpenSandbox={(demo) => setActiveSandboxDemo(demo)}
              onDeleteDemo={handleDeleteDemo}
              onDeployManualDemo={handleDeployManualDemo}
              onOpenComposeWithDemo={(demo) => {
                setComposeInitialDemo(demo);
                setComposeInitialReply(null);
                setComposeInitialAccount(gmailAccounts[0]?.id || 'gmail-1');
                setIsComposeOpen(true);
              }}
            />
          )}

          {/* 10. Daily Reports */}
          {activeTab === 'reports' && (
            <ReportsView
              reports={dailyReports}
              onGenerateReport={handleGenerateReport}
              onSendReportEmail={handleSendReportEmail}
            />
          )}

          {/* 11. Automation History */}
          {activeTab === 'automation' && (
            <AutomationView
              workflowRuns={workflowRuns}
              onTriggerWorkflow={handleTriggerWorkflow}
              cronStatus={cronStatus}
              logs={systemLogs}
              onRefreshLogs={fetchAllData}
            />
          )}

          {/* 12. Settings */}
          {activeTab === 'settings' && (
            <ApiBrainView
              config={config}
              onSaveConfig={handleSaveConfig}
            />
          )}
        </div>
      </div>

      {/* Interactive Sandbox Simulator Modal */}
      {activeSandboxDemo && (
        <SandboxModal
          demo={activeSandboxDemo}
          onClose={() => setActiveSandboxDemo(null)}
        />
      )}

      {/* Compose Outreach Email Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        gmailAccounts={gmailAccounts}
        hostedDemos={hostedDemos}
        initialAccount={composeInitialAccount}
        initialDemo={composeInitialDemo}
        initialReply={composeInitialReply}
        onSendEmail={handleSendEmail}
      />
    </div>
  );
}
