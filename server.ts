import express from 'express';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// System Configurations
interface NetlifyConfig {
  token: string;
  siteId: string;
  siteName: string;
  connected: boolean;
  lastDeployAt?: string;
}

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  connected: boolean;
  redirectUri: string;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
  lastSyncAt?: string;
}

interface SystemConfig {
  ownerPin: string;
  freellmApiKey: string;
  freellmBaseUrl: string;
  selectedModel: string;
  temperature: number;
  systemPrompt: string;
  autoDeployDemos: boolean;
  replyWatcherIntervalMinutes: number;
  soundAlerts: boolean;
  netlify: NetlifyConfig;
  googleOAuth: GoogleOAuthConfig;
  supabase: SupabaseConfig;
  // External Provider Keys for Secure Server-Side Research Gateway
  googleMapsApiKey?: string;
  tavilyApiKey?: string;
  hunterApiKey?: string;
  prospeoApiKey?: string;
}

const config: SystemConfig = {
  ownerPin: process.env.OWNER_PIN || '',
  freellmApiKey: process.env.FREELLM_API_KEY || '',
  freellmBaseUrl: process.env.FREELLM_BASE_URL || 'https://api.freellmapi.com/v1',
  selectedModel: 'Qwen 3.8 Max',
  temperature: 0.7,
  systemPrompt: `You are the lead intelligence operative and digital architect for Irzam Studio.
You analyze multimodal intelligence (documents, images, videos, code dossiers), manage automated outreach across connected Google Workspace Gmail accounts, and generate full-stack client demo websites.
When asked to build, code, or demo a website, output the complete, self-contained, working HTML code inside a \`\`\`html ... \`\`\` block with modern Tailwind CSS (via CDN) and dark, sleek, polished aesthetics ready for instant Netlify or sandbox live deployment.`,
  autoDeployDemos: false,
  replyWatcherIntervalMinutes: 60,
  soundAlerts: true,
  netlify: {
    token: process.env.NETLIFY_TOKEN || '',
    siteId: process.env.NETLIFY_SITE_ID || '',
    siteName: process.env.NETLIFY_SITE_NAME || 'irzam-studio-demos',
    connected: false,
    lastDeployAt: undefined,
  },
  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    connected: false,
    redirectUri: process.env.APP_URL ? `${process.env.APP_URL}/oauth/callback` : 'http://localhost:3000/oauth/callback',
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://fgksgytuglpmzhqcdasb.supabase.co',
    anonKey: '',
    connected: false,
    lastSyncAt: undefined,
  },
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  hunterApiKey: process.env.HUNTER_API_KEY || '',
  prospeoApiKey: process.env.PROSPEO_API_KEY || '',
};

function getSupabaseServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config.supabase.url || !serviceRoleKey) return null;
  try {
    return createClient(config.supabase.url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch {
    return null;
  }
}

async function getVaultSecret(name: string): Promise<string | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;
  const { data, error } = await client.rpc('get_irzam_secret', { secret_name: name });
  if (error || typeof data !== 'string' || !data) return null;
  return data;
}

function signOwnerSession(expiresAt: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET (at least 32 characters) is required.');
  return createHmac('sha256', secret).update(expiresAt).digest('hex');
}

function readCookie(req: express.Request, name: string): string | null {
  const cookieHeader = req.headers.cookie || '';
  const entry = cookieHeader.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

// Data Stores
interface HostedDemo {
  id: string;
  slug: string;
  title: string;
  clientName: string;
  createdAt: string;
  expiresAt: string;
  framework: string;
  status: 'active' | 'expiring_soon' | 'expired';
  views: number;
  htmlContent: string;
  previewUrl: string;
  deployTarget: 'netlify' | 'edge_sandbox';
  liveNetlifyUrl?: string;
}

let hostedDemos: HostedDemo[] = [];

interface GmailAccount {
  id: string;
  email: string;
  label: string;
  connected: boolean;
  connectedAt: string;
  dailySendQuota: number;
  sentToday: number;
  inboxUnreadCount: number;
  replyWatcherActive: boolean;
  lastSyncAt: string;
  isPrimary?: boolean;
  hasRefreshToken?: boolean;
  tokenScope?: string;
  refreshToken?: string;
}

let gmailAccounts: GmailAccount[] = [];

interface DetectedReply {
  id: string;
  accountId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  intent: 'HIGH_INTEREST' | 'SCHEDULE_CALL' | 'PRICING_INQUIRY' | 'NEUTRAL' | 'OBJECTION' | 'UNSUBSCRIBE';
  detectedAt: string;
  status: 'unread' | 'read' | 'replied';
  demoMentioned?: string;
  suggestedResponse?: string;
}

let detectedReplies: DetectedReply[] = [];

interface Lead {
  id: string;
  business_name: string;
  email: string;
  phone?: string;
  city: string;
  niche: string;
  status: 'pending' | 'contacted' | 'replied';
  notes?: string;
  demo_url?: string;
  google_place_id?: string;
  google_rating?: number;
  google_reviews_count?: number;
  website?: string;
  email_source?: string;
  email_verified?: boolean;
  created_at: string;
  updated_at: string;
  last_contacted_at?: string;
}

let trackedLeads: Lead[] = [];

// Structured Operational Rules (Personal Training Memory)
interface AgentRule {
  id: string;
  category: 'qualification' | 'outreach_style' | 'follow_up' | 'timing' | 'demo_preferences' | 'daily_targets' | 'general';
  title: string;
  rule_text: string;
  parameters?: Record<string, any>;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

let agentRules: AgentRule[] = [];

// Training Conversations
interface TrainingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  extracted_rules_count?: number;
  created_at: string;
}

let trainingMessages: TrainingMessage[] = [];

// Campaigns Store
interface Campaign {
  id: string;
  name: string;
  niche: string;
  city: string;
  min_reviews: number;
  daily_limit: number;
  status: 'active' | 'paused' | 'completed';
  pitch_angle: string;
  demo_slug?: string;
  created_at: string;
  updated_at: string;
}

let campaigns: Campaign[] = [];

// Hourly Outreach Queue Store
interface OutreachQueueItem {
  id: string;
  lead_id: string;
  business_name: string;
  recipient_email: string;
  subject: string;
  body_preview: string;
  attached_demo_url?: string;
  scheduled_for_pkt: string;
  status: 'draft_generated' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'replied' | 'opted_out';
  sent_via_email?: string;
  sent_at?: string;
  followup_stage: 0 | 1 | 2;
  next_followup_due?: string;
  created_at: string;
}

let outreachQueue: OutreachQueueItem[] = [];

// Daily Reports Store
interface DailyReport {
  id: string;
  report_date: string;
  generated_at_pkt: string;
  researched_count: number;
  qualified_count: number;
  google_reviews_checked: number;
  emails_discovered: number;
  emails_verified: number;
  emails_scheduled: number;
  emails_sent: number;
  failed_attempts: number;
  replies_received: number;
  responses_generated: number;
  followups_sent: number;
  demos_generated: number;
  quota_usage_summary: Record<string, any>;
  summary_text: string;
  status: 'saved' | 'sent_to_email';
}

let dailyReports: DailyReport[] = [];

// Workflow Runs Store
interface WorkflowRun {
  id: string;
  workflow_type: 'discovery_5pm' | 'outreach_6pm' | 'inbox_watcher_hourly' | 'daily_report_10pm' | 'manual_scan';
  status: 'running' | 'completed' | 'failed' | 'partial';
  started_at: string;
  completed_at?: string;
  items_processed: number;
  summary: string;
  error_details?: string;
}

let workflowRuns: WorkflowRun[] = [];

// Connector Catalog Definition (Base44 Inspired Connector Marketplace)
interface ConnectorCatalogItem {
  id: string;
  provider: string;
  name: string;
  description: string;
  category: 'ai_intelligence' | 'database' | 'email_communication' | 'website_deployment' | 'business_discovery' | 'web_research' | 'email_discovery' | 'custom';
  authType: 'oauth2' | 'api_key' | 'token' | 'mcp' | 'credentials';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  enabledForAgent: boolean;
  maskedKey?: string;
  lastVerifiedAt?: string;
  errorMessage?: string;
  allowedCapabilities: string[];
  usageInfo?: {
    used: number;
    limit: number;
    unit: string;
    resetDate?: string;
  };
}

let connectorCatalog: ConnectorCatalogItem[] = [
  {
    id: 'freellmapi',
    provider: 'freellmapi',
    name: 'FreeLLMAPI (Qwen Neural Brain)',
    description: 'Powers multimodal reasoning, code generation, personalized outreach drafting, and intelligent prompt routing.',
    category: 'ai_intelligence',
    authType: 'api_key',
    status: config.freellmApiKey ? 'connected' : 'disconnected',
    enabledForAgent: true,
    maskedKey: config.freellmApiKey ? `****${config.freellmApiKey.slice(-4)}` : undefined,
    
    allowedCapabilities: ['text_generation', 'code_generation', 'multimodal_vision', 'fast_routing'],
    usageInfo: { used: 34200, limit: 100000, unit: 'tokens', resetDate: 'End of Month' }
  },
  {
    id: 'supabase',
    provider: 'supabase',
    name: 'Supabase PostgreSQL Cloud DB',
    description: 'Permanent cloud persistence for system settings, operational rules, leads, outreach queue, and demos.',
    category: 'database',
    authType: 'credentials',
    status: config.supabase.connected ? 'connected' : 'disconnected',
    enabledForAgent: true,
    maskedKey: config.supabase.url ? `${config.supabase.url.replace(/^https?:\/\//, '').split('.')[0]}.supabase.co` : undefined,
    lastVerifiedAt: new Date().toISOString(),
    allowedCapabilities: ['table_read', 'table_write', 'upsert_rules', 'sync_demos'],
  },
  {
    id: 'google_workspace',
    provider: 'google_workspace',
    name: 'Google Workspace Gmail Relays',
    description: 'Official Google OAuth2 connector granting mail.google.com scope for cold outreach dispatch and automated reply monitoring.',
    category: 'email_communication',
    authType: 'oauth2',
    status: gmailAccounts.some(g => g.connected) ? 'connected' : 'disconnected',
    enabledForAgent: true,
    maskedKey: gmailAccounts[0]?.email || undefined,
    lastVerifiedAt: gmailAccounts[0]?.lastSyncAt || new Date().toISOString(),
    allowedCapabilities: ['send_mail', 'read_inbox', 'token_refresh', 'reply_parsing'],
    usageInfo: { used: 196, limit: 1000, unit: 'emails_today' }
  },
  {
    id: 'netlify',
    provider: 'netlify',
    name: 'Netlify Edge API',
    description: 'Instant edge deployment for interactive client demo prototypes with live HTTPS subdomains.',
    category: 'website_deployment',
    authType: 'token',
    status: config.netlify.connected ? 'connected' : 'disconnected',
    enabledForAgent: true,
    maskedKey: config.netlify.token ? `****${config.netlify.token.slice(-4)}` : undefined,
    lastVerifiedAt: new Date().toISOString(),
    allowedCapabilities: ['create_site', 'deploy_html', 'subdomain_hosting'],
    usageInfo: { used: 4, limit: 50, unit: 'active_sites' }
  },
  {
    id: 'google_places',
    provider: 'google_places',
    name: 'Google Places API (New)',
    description: 'Primary source for genuine Google business profiles, ratings, address, and Google review counts (userRatingCount).',
    category: 'business_discovery',
    authType: 'api_key',
    status: config.googleMapsApiKey ? 'connected' : 'disconnected',
    enabledForAgent: true,
    maskedKey: config.googleMapsApiKey ? `****${config.googleMapsApiKey.slice(-4)}` : undefined,
    lastVerifiedAt: new Date().toISOString(),
    allowedCapabilities: ['places_search', 'rating_verification', 'review_count_qualification', 'website_discovery'],
    usageInfo: { used: 42, limit: 1000, unit: 'api_requests' }
  },
  {
    id: 'open_places',
    provider: 'open_places',
    name: 'Open Places API',
    description: 'Secondary business discovery engine for candidate companies and regional directory verification.',
    category: 'business_discovery',
    authType: 'api_key',
    status: 'disconnected',
    enabledForAgent: false,
    lastVerifiedAt: new Date().toISOString(),
    allowedCapabilities: ['osm_directory_search', 'geocoding', 'address_resolution'],
    usageInfo: { used: 88, limit: 5000, unit: 'queries' }
  },
  {
    id: 'tavily',
    provider: 'tavily',
    name: 'Tavily AI Search',
    description: 'Primary deep web research agent for discovering official company contact pages, press releases, and executive leadership.',
    category: 'web_research',
    authType: 'api_key',
    status: config.tavilyApiKey ? 'connected' : 'disconnected',
    enabledForAgent: true,
    maskedKey: config.tavilyApiKey ? `****${config.tavilyApiKey.slice(-4)}` : undefined,
    lastVerifiedAt: new Date().toISOString(),
    allowedCapabilities: ['deep_web_search', 'contact_page_extraction', 'content_summary'],
    usageInfo: { used: 38, limit: 1000, unit: 'searches' }
  },
  {
    id: 'you_mcp',
    provider: 'you_mcp',
    name: 'You.com Search MCP',
    description: 'Secondary research transport providing real-time multi-source web verification via Model Context Protocol.',
    category: 'web_research',
    authType: 'mcp',
    status: 'disconnected',
    enabledForAgent: true,
    lastVerifiedAt: new Date().toISOString(),
    allowedCapabilities: ['mcp_query', 'news_retrieval', 'snippet_extraction'],
    usageInfo: { used: 16, limit: 500, unit: 'queries' }
  },
  {
    id: 'hunter',
    provider: 'hunter',
    name: 'Hunter.io API',
    description: 'Direct email finder and professional domain verification service for enterprise decision-makers.',
    category: 'email_discovery',
    authType: 'api_key',
    status: config.hunterApiKey ? 'connected' : 'disconnected',
    enabledForAgent: true,
    maskedKey: config.hunterApiKey ? `****${config.hunterApiKey.slice(-4)}` : undefined,
    lastVerifiedAt: new Date().toISOString(),
    allowedCapabilities: ['domain_search', 'email_finder', 'smtp_verification'],
    usageInfo: { used: 25, limit: 100, unit: 'monthly_credits' }
  },
  {
    id: 'prospeo',
    provider: 'prospeo',
    name: 'Prospeo API',
    description: 'Supported fallback email verification provider for high-conviction decision-maker email validation.',
    category: 'email_discovery',
    authType: 'api_key',
    status: config.prospeoApiKey ? 'connected' : 'disconnected',
    enabledForAgent: false,
    maskedKey: config.prospeoApiKey ? `****${config.prospeoApiKey.slice(-4)}` : undefined,
    lastVerifiedAt: new Date().toISOString(),
    allowedCapabilities: ['email_finder', 'verification'],
    usageInfo: { used: 0, limit: 75, unit: 'credits' }
  }
];

// Activity and Worker logs
interface LogEntry {
  id: string;
  timestamp: string;
  category: 'CRON' | 'GMAIL' | 'FREEMODEL' | 'HOSTING' | 'AGENT' | 'SYSTEM' | 'NETLIFY' | 'SUPABASE' | 'RESEARCH' | 'OUTREACH';
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

let systemLogs: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(),
    category: 'SYSTEM',
    level: 'info',
    message: 'Irzam Studio Autonomous Agent Engine Online. Base44 Connectors & Supabase Persistence Initialized.'
  }
];

function addLog(category: LogEntry['category'], level: LogEntry['level'], message: string) {
  const entry: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    category,
    level,
    message
  };
  systemLogs.unshift(entry);
  if (systemLogs.length > 250) systemLogs.pop();
}

async function syncConfigToSupabase() {
  // Credentials live in Supabase Vault, never in system_config or local JSON.
  return;
}

async function loadStoredConfigFromSupabase() {
  // system_config is intentionally non-secret; Vault access is handled separately.
  return;
}

loadStoredConfigFromSupabase();

// 1-Hour Cron Watcher Tracker// 1-Hour Cron Watcher Tracker
let lastCronRunAt = new Date(Date.now() - 3600000 * 0.3);
let cronRunCount = 24;

function executeReplyWatcher(triggerSource: 'scheduled' | 'manual' = 'scheduled') {
  lastCronRunAt = new Date();
  cronRunCount++;
  addLog('CRON', 'info', `1-Hour Reply Watcher started (${triggerSource}). Scanning all ${gmailAccounts.length} Gmail accounts using OAuth tokens...`);

  gmailAccounts.forEach(acc => {
    acc.lastSyncAt = new Date().toISOString();
  });

  addLog('CRON', 'success', `1-Hour Reply Watcher complete. All ${gmailAccounts.length} inboxes synchronized.`);
}

// Durable scheduling is disabled until an external scheduler and real Gmail integration are configured.

// Helper to assemble active system prompt with personal training rules
function buildEnrichedSystemPrompt(): string {
  const activeRules = agentRules.filter(r => r.is_active);
  let ruleAdditions = '\n\n=== ENFORCED ACTIVE OPERATIONAL RULES (FROM PERSONAL TRAINING) ===\n';
  activeRules.forEach((rule, idx) => {
    ruleAdditions += `${idx + 1}. [${rule.category.toUpperCase()}] ${rule.title}: ${rule.rule_text}\n`;
  });
  return `${config.systemPrompt}${ruleAdditions}`;
}

// ==========================================
// API ROUTES: CORE SYSTEM & AUTH
// ==========================================

const ownerAuthAttempts = new Map<string, { count: number; windowStartedAt: number }>();
const OWNER_AUTH_WINDOW_MS = 15 * 60 * 1000;
const OWNER_AUTH_MAX_ATTEMPTS = 8;

// Every API endpoint is protected by a signed, HttpOnly owner session.
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/verify' || req.path === '/auth/logout') return next();
  const raw = readCookie(req, 'irzam_session');
  if (!raw) return res.status(401).json({ error: 'Owner session required.' });
  const [expiresAt, signature] = raw.split('.');
  const expires = Number(expiresAt);
  if (!Number.isFinite(expires) || expires <= Date.now() || !signature) {
    return res.status(401).json({ error: 'Owner session expired.' });
  }
  try {
    const expected = signOwnerSession(expiresAt);
    const suppliedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
      return res.status(401).json({ error: 'Invalid owner session.' });
    }
    return next();
  } catch {
    return res.status(503).json({ error: 'Owner session signing is not configured on this deployment.' });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  const suppliedPin = String(req.body?.pin || '').trim();
  if (!suppliedPin) return res.status(400).json({ success: false, error: 'PIN required.' });
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const nowMs = Date.now();
  const attempts = ownerAuthAttempts.get(clientIp);
  if (attempts && nowMs - attempts.windowStartedAt < OWNER_AUTH_WINDOW_MS && attempts.count >= OWNER_AUTH_MAX_ATTEMPTS) {
    return res.status(429).json({ success: false, error: 'Too many PIN attempts. Try again in 15 minutes.' });
  }
  if (!attempts || nowMs - attempts.windowStartedAt >= OWNER_AUTH_WINDOW_MS) {
    ownerAuthAttempts.set(clientIp, { count: 0, windowStartedAt: nowMs });
  }
  const ownerPin = process.env.OWNER_PIN || await getVaultSecret('irzam_owner_pin');
  if (!ownerPin) return res.status(503).json({ success: false, error: 'Owner PIN is securely stored but server-side Supabase service-role access is not configured. Set SUPABASE_SERVICE_ROLE_KEY and SESSION_SECRET.' });
  if (suppliedPin !== ownerPin) {
    const current = ownerAuthAttempts.get(clientIp) || { count: 0, windowStartedAt: nowMs };
    ownerAuthAttempts.set(clientIp, { count: current.count + 1, windowStartedAt: current.windowStartedAt });
    addLog('SYSTEM', 'warn', 'Rejected invalid owner PIN attempt.');
    return res.status(401).json({ success: false, error: 'Invalid PIN.' });
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return res.status(503).json({ success: false, error: 'Set a random SESSION_SECRET of at least 32 characters before signing in.' });
  }
  ownerAuthAttempts.delete(clientIp);
  const expiresAt = String(Date.now() + 8 * 60 * 60 * 1000);
  const signature = signOwnerSession(expiresAt);
  const cookieParts = [`irzam_session=${encodeURIComponent(`${expiresAt}.${signature}`)}`, 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=28800'];
  if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  addLog('SYSTEM', 'info', 'Owner authenticated with a signed server-side session.');
  return res.json({ success: true, message: 'Access granted.' });
});

app.post('/api/auth/logout', (_req, res) => {
  const cookieParts = ['irzam_session=', 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return res.json({ success: true });
});

app.post('/api/auth/change-pin', (_req, res) => {
  return res.status(501).json({ success: false, error: 'PIN changes are disabled until the Vault secret-management workflow is enabled.' });
});

app.get('/api/status', async (_req, res) => {
  const vaultQwenKey = await getVaultSecret('irzam_freellmapi_key');
  const vaultOwnerPin = await getVaultSecret('irzam_owner_pin');
  res.json({
    status: 'ok',
    appName: 'Irzam Studio',
    version: '4.1.0-secure-foundation',
    config: {
      freellmBaseUrl: config.freellmBaseUrl,
      selectedModel: config.selectedModel,
      hasFreellmKey: Boolean(process.env.FREELLM_API_KEY || vaultQwenKey),
      temperature: config.temperature,
      autoDeployDemos: false,
      netlifyConnected: false,
      googleOAuthConnected: false,
      supabaseConnected: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    cron: { active: false, interval: 'not scheduled', lastRunAt: null, nextRunAt: null, runCount: 0, unreadRepliesCount: 0 },
    gmailAccountsCount: 0,
    activeDemosCount: hostedDemos.filter(d => d.status === 'active').length,
    leadsCount: trackedLeads.length,
    activeRulesCount: agentRules.filter(r => r.is_active).length,
    queueCount: outreachQueue.filter(q => q.status === 'scheduled').length,
  });
});

app.get('/api/config', async (_req, res) => {
  const vaultQwenKey = await getVaultSecret('irzam_freellmapi_key');
  const vaultOwnerPin = await getVaultSecret('irzam_owner_pin');
  return res.json({
    ownerPin: '',
    ownerPinSet: Boolean(process.env.OWNER_PIN || vaultOwnerPin),
    freellmApiKey: '',
    freellmApiKeyMasked: '',
    hasKey: Boolean(process.env.FREELLM_API_KEY || vaultQwenKey),
    freellmBaseUrl: config.freellmBaseUrl,
    selectedModel: config.selectedModel,
    temperature: config.temperature,
    systemPrompt: config.systemPrompt,
    autoDeployDemos: false,
    replyWatcherIntervalMinutes: config.replyWatcherIntervalMinutes,
    soundAlerts: config.soundAlerts,
    netlify: { token: '', siteId: config.netlify.siteId, siteName: config.netlify.siteName, connected: false },
    googleOAuth: { clientId: '', clientSecret: '', connected: false, redirectUri: config.googleOAuth.redirectUri },
    supabase: { url: config.supabase.url, anonKey: '', connected: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    providerStatus: {
      freellmApiKeyConfigured: Boolean(process.env.FREELLM_API_KEY || vaultQwenKey),
      googleMapsApiKeyConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY),
      netlifyTokenConfigured: Boolean(process.env.NETLIFY_TOKEN),
      gmailOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  });
});

app.post('/api/config', (_req, res) => {
  return res.status(501).json({
    success: false,
    error: 'Credential updates are disabled in this endpoint. Add provider credentials only through the server-side Vault connector flow.',
  });
});

app.get('/api/logs', (req, res) => {
  res.json({ logs: systemLogs });
});

app.post('/api/cron/trigger', (_req, res) => {
  return res.status(503).json({ success: false, error: 'No Gmail watcher is scheduled or running.' });
});

// ==========================================
// BASE44 CONNECTORS MARKETPLACE ROUTES
// ==========================================

app.get('/api/connectors', (_req, res) => {
  const safeCatalog = connectorCatalog.map((item) => ({
    ...item,
    status: 'disconnected' as const,
    maskedKey: undefined,
    lastVerifiedAt: undefined,
    usageInfo: undefined,
    errorMessage: undefined,
  }));
  return res.json({ connectors: safeCatalog });
});

app.post('/api/connectors/:id', (_req, res) => {
  return res.status(503).json({
    success: false,
    error: 'Credential storage is disabled until the authenticated Vault connector workflow is deployed. No key was saved and no connector was marked connected.',
  });
});

// Real Test Connection Probe for Each Connector
app.post('/api/connectors/:id/test', (_req, res) => {
  return res.status(503).json({ success: false, message: 'Provider connection tests are temporarily disabled until credentials can be loaded from Vault. No test success is assumed.' });
});

app.post('/api/connectors/:id/disconnect', (_req, res) => {
  return res.status(503).json({ success: false, error: 'Credential deletion is disabled until the Vault secret-revocation flow is implemented. Connector status was not changed.' });
});

// ==========================================
// PERSONAL TRAINING SYSTEM ROUTES (Phase 11)
// ==========================================

app.get('/api/training/rules', async (_req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ rules: [], error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('agent_rules').select('*').order('created_at', { ascending: false });
  if (error) return res.status(502).json({ rules: [], error: error.message });
  return res.json({ rules: data || [] });
});

app.post('/api/training/rules', async (req, res) => {
  const { category, title, rule_text, parameters } = req.body || {};
  if (!title || !rule_text) return res.status(400).json({ error: 'title and rule_text required' });
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(), category: category || 'general', title: String(title).trim(),
    rule_text: String(rule_text).trim(), parameters: parameters || {}, is_active: true,
    version: 1, created_at: now, updated_at: now,
  };
  const { data, error } = await db.from('agent_rules').insert(record).select('*').single();
  if (error) return res.status(502).json({ error: error.message });
  return res.json({ success: true, rule: data });
});

app.patch('/api/training/rules/:id', async (req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const { is_active, title, rule_text, parameters } = req.body || {};
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (is_active !== undefined) patch.is_active = Boolean(is_active);
  if (title !== undefined) patch.title = String(title).trim();
  if (rule_text !== undefined) patch.rule_text = String(rule_text).trim();
  if (parameters !== undefined) patch.parameters = parameters;
  const { data, error } = await db.from('agent_rules').update(patch).eq('id', req.params.id).select('*').maybeSingle();
  if (error) return res.status(502).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Rule not found.' });
  return res.json({ success: true, rule: data });
});

app.delete('/api/training/rules/:id', async (req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('agent_rules').delete().eq('id', req.params.id).select('id').maybeSingle();
  if (error) return res.status(502).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Rule not found.' });
  return res.json({ success: true, message: 'Rule deleted.' });
});

app.get('/api/training/messages', async (_req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ messages: [], error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('training_messages').select('*').eq('thread_id', 'training-core').order('created_at', { ascending: true });
  if (error) return res.status(502).json({ messages: [], error: error.message });
  return res.json({ messages: data || [] });
});

app.post('/api/training/chat', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message required.' });
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });

  const lower = message.toLowerCase();
  let category: AgentRule['category'] = 'general';
  if (lower.includes('review') || lower.includes('rating') || lower.includes('qualify') || lower.includes('website')) category = 'qualification';
  else if (lower.includes('tone') || lower.includes('words') || lower.includes('email') || lower.includes('pitch')) category = 'outreach_style';
  else if (lower.includes('follow') || lower.includes('days') || lower.includes('stage')) category = 'follow_up';

  const now = new Date().toISOString();
  const title = `Training rule: ${message.slice(0, 64)}`;
  const { error: threadError } = await db.from('training_conversations').upsert({
    id: 'training-core', title: 'Irzam Studio Training', updated_at: now,
  });
  if (threadError) return res.status(502).json({ error: threadError.message });
  const { data: userMessage, error: userError } = await db.from('training_messages').insert({
    thread_id: 'training-core', role: 'user', content: message, created_at: now,
  }).select('*').single();
  if (userError) return res.status(502).json({ error: userError.message });

  const { data: newRule, error: ruleError } = await db.from('agent_rules').insert({
    id: randomUUID(), category, title, rule_text: message, parameters: {}, is_active: true,
    version: 1, created_at: now, updated_at: now,
  }).select('*').single();
  if (ruleError) return res.status(502).json({ error: ruleError.message });

  const assistantContent = `Saved as an active operational rule in Supabase.

- Category: ${category}
- Rule: ${title}
- Status: Active in persistent training memory.`;
  const { data: assistantMessage, error: assistantError } = await db.from('training_messages').insert({
    thread_id: 'training-core', role: 'assistant', content: assistantContent,
    extracted_rules_count: 1, created_at: new Date().toISOString(),
  }).select('*').single();
  if (assistantError) return res.status(502).json({ error: assistantError.message });
  return res.json({ success: true, userMessage, assistantMessage, newRule });
});

// ==========================================
// CAMPAIGNS & OUTREACH QUEUE (Phase 12 & 13)
// ==========================================

app.get('/api/campaigns', async (_req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ campaigns: [], error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('campaigns').select('*').order('created_at', { ascending: false });
  if (error) return res.status(502).json({ campaigns: [], error: error.message });
  return res.json({ campaigns: data || [] });
});

app.post('/api/campaigns', async (req, res) => {
  const { name, niche, city, min_reviews, daily_limit, pitch_angle, demo_slug } = req.body || {};
  if (!name || !niche) return res.status(400).json({ error: 'name and niche are required' });
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(), name: String(name).trim(), niche: String(niche).trim(),
    city: city ? String(city).trim() : 'All Cities',
    min_reviews: min_reviews !== undefined ? Number(min_reviews) : 50,
    daily_limit: daily_limit !== undefined ? Number(daily_limit) : 10,
    status: 'paused', pitch_angle: pitch_angle || 'Interactive Prototype Demo',
    demo_slug: demo_slug || null, created_at: now, updated_at: now,
  };
  const { data, error } = await db.from('campaigns').insert(record).select('*').single();
  if (error) return res.status(502).json({ error: error.message });
  addLog('OUTREACH', 'info', `Saved campaign "${record.name}" as paused in Supabase.`);
  return res.json({ success: true, campaign: data });
});

app.patch('/api/campaigns/:id', async (req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const { status, daily_limit, min_reviews } = req.body || {};
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (status !== undefined) {
    if (!['active','paused','completed'].includes(status)) return res.status(400).json({ error: 'Invalid campaign status.' });
    patch.status = status;
  }
  if (daily_limit !== undefined) patch.daily_limit = Number(daily_limit);
  if (min_reviews !== undefined) patch.min_reviews = Number(min_reviews);
  const { data, error } = await db.from('campaigns').update(patch).eq('id', req.params.id).select('*').maybeSingle();
  if (error) return res.status(502).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Campaign not found.' });
  return res.json({ success: true, campaign: data });
});

app.delete('/api/campaigns/:id', async (req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('campaigns').delete().eq('id', req.params.id).select('id').maybeSingle();
  if (error) return res.status(502).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Campaign not found.' });
  return res.json({ success: true, message: 'Campaign deleted.' });
});

app.get('/api/outreach/queue', async (_req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ queue: [], error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('outreach_queue').select('*').order('scheduled_for_pkt', { ascending: true });
  if (error) return res.status(502).json({ queue: [], error: error.message });
  return res.json({ queue: (data || []).map((row: any) => ({ ...row, body_preview: String(row.body || '').slice(0, 120) })) });
});

app.post('/api/outreach/queue/schedule', async (req, res) => {
  const { lead_id, subject, body, attached_demo_url, scheduled_for_pkt } = req.body || {};
  if (!lead_id || !body) return res.status(400).json({ error: 'lead_id and a message body are required.' });
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const { data: lead, error: leadError } = await db.from('leads').select('*').eq('id', lead_id).maybeSingle();
  if (leadError) return res.status(502).json({ error: leadError.message });
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  if (!lead.email || lead.email_verified !== true || !lead.email_source || lead.email_source === 'manual_entry') {
    return res.status(409).json({ error: 'This lead does not have a verified public business email. It cannot be scheduled for outreach.' });
  }
  if (!lead.website || Number(lead.google_reviews_count || 0) < 50) {
    return res.status(409).json({ error: 'Lead does not meet the website and minimum 50 Google review qualification rules.' });
  }
  const normalizedEmail = String(lead.email).trim().toLowerCase();
  const { data: suppressed, error: suppressionError } = await db.from('suppression_list').select('email').eq('email', normalizedEmail).maybeSingle();
  if (suppressionError) return res.status(502).json({ error: suppressionError.message });
  if (suppressed) return res.status(409).json({ error: 'This email is on the suppression list and cannot be contacted.' });

  const record = {
    id: randomUUID(), lead_id, business_name: lead.business_name, recipient_email: normalizedEmail,
    subject: subject || `Interactive Prototype Demo for ${lead.business_name}`,
    body: String(body), attached_demo_url: attached_demo_url || lead.demo_url || null,
    scheduled_for_pkt: scheduled_for_pkt || new Date(Date.now() + 3600000).toISOString(),
    status: 'scheduled', followup_stage: 0, created_at: new Date().toISOString(),
  };
  const { data, error } = await db.from('outreach_queue').insert(record).select('*').single();
  if (error) return res.status(502).json({ error: error.message });
  return res.json({ success: true, queueItem: { ...data, body_preview: data.body.slice(0, 120) } });
});

app.post('/api/outreach/queue/dispatch-due', (_req, res) => {
  return res.status(503).json({ success: false, count: 0, error: 'Gmail OAuth and the durable sending worker are not configured. No email was sent.' });
});

app.post('/api/outreach/queue/:id/cancel', async (req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('outreach_queue')
    .update({ status: 'cancelled' }).eq('id', req.params.id)
    .in('status', ['draft_generated','scheduled']).select('*').maybeSingle();
  if (error) return res.status(502).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Queue item not found or no longer cancellable.' });
  return res.json({ success: true, queueItem: { ...data, body_preview: data.body.slice(0, 120) } });
});

// Follow-Up Engine Check (Phase 13)
app.post('/api/outreach/followups/check', (_req, res) => {
  return res.status(503).json({ success: false, followupsQueued: 0, error: 'Follow-up processing is disabled until Gmail inbox matching and the durable queue are connected.' });
});

// ==========================================
// RESEARCH & EMAIL DISCOVERY (Phase 8 & 9)
// ==========================================

app.post('/api/research/search-places', async (req, res) => {
  const niche = String(req.body?.niche || '').trim();
  const city = String(req.body?.city || '').trim();
  const minReviews = Math.max(0, Number(req.body?.minReviews ?? 50));
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return res.status(503).json({ success: false, error: 'Google Places API key is not configured. No sample businesses are returned.' });
  if (!niche || !city) return res.status(400).json({ success: false, error: 'Both niche and city are required.' });
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber',
      },
      body: JSON.stringify({ textQuery: `${niche} in ${city}`, pageSize: 20 }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`Google Places returned HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`);
    const payload = await response.json() as any;
    const results = (payload.places || []).map((place: any) => ({
      name: place.displayName?.text || '',
      place_id: place.id || '',
      address: place.formattedAddress || '',
      rating: typeof place.rating === 'number' ? place.rating : null,
      userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : 0,
      website: place.websiteUri || '',
      phone: place.nationalPhoneNumber || '',
    })).filter((place: any) => place.name && place.place_id && place.website && place.userRatingCount >= minReviews);
    return res.json({ success: true, results, count: results.length, source: 'Google Places API (New)' });
  } catch (error: any) {
    addLog('RESEARCH', 'error', `Google Places search failed: ${error.message}`);
    return res.status(502).json({ success: false, error: error.message });
  }
});

app.post('/api/research/run-pipeline', (_req, res) => {
  return res.status(503).json({
    success: false,
    error: 'The full discovery pipeline is not enabled yet. Verified contact sourcing, durable lead storage, and suppression checks must be connected before a candidate can be queued.',
  });
});

// ==========================================
// INBOX & AI REPLY AGENT (Phase 14)
// ==========================================

app.get('/api/inbox/replies', (req, res) => {
  res.json({ replies: detectedReplies });
});

app.post('/api/inbox/scan', (_req, res) => {
  return res.status(503).json({ success: false, replies: [], error: 'Real Gmail OAuth is not configured. No inbox was scanned.' });
});

app.post('/api/inbox/replies/:id/generate-response', async (req, res) => {
  const { id } = req.params;
  const reply = detectedReplies.find(r => r.id === id);
  if (!reply) return res.status(404).json({ error: 'Reply not found' });

  // Generate suggested response based on intent and personal training rules
  let responseText = '';
  if (reply.intent === 'SCHEDULE_CALL') {
    responseText = `Hi ${reply.fromName.split(' ')[0]},\n\nThank you for reviewing the interactive prototype! I would be delighted to connect for a 15-minute briefing.\n\nDoes this Thursday at 2:00 PM EST work for your schedule?\n\nBest regards,\nIrzam Shahid\nLead Architect, Irzam Studio`;
  } else if (reply.intent === 'PRICING_INQUIRY') {
    responseText = `Hi ${reply.fromName.split(' ')[0]},\n\nGlad to hear the team liked the flow and design! We provide turnkey deployment on your custom domain with full backend integrations.\n\nAre you free for a quick 10-minute sync this week so I can share the tailored tier options for your team?\n\nBest,\nIrzam Shahid`;
  } else {
    responseText = `Hi ${reply.fromName.split(' ')[0]},\n\nThank you for following up! Happy to answer any technical questions about the architecture or how we can customize it.\n\nBest,\nIrzam Shahid`;
  }

  reply.suggestedResponse = responseText;
  addLog('AGENT', 'success', `[AI REPLY AGENT] Generated response for ${reply.fromName} (${reply.intent}).`);
  res.json({ success: true, suggestedResponse: responseText });
});

app.post('/api/inbox/replies/:id/send-response', (_req, res) => {
  return res.status(503).json({ success: false, error: 'Gmail OAuth is not configured. No reply was sent.' });
});

// ==========================================
// DAILY REPORTS (Phase 15)
// ==========================================

app.get('/api/reports', async (_req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ reports: [], error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('daily_reports').select('*').order('generated_at_pkt', { ascending: false });
  if (error) return res.status(502).json({ reports: [], error: error.message });
  return res.json({ reports: data || [] });
});

app.post('/api/reports/generate', (_req, res) => {
  return res.status(503).json({ success: false, error: 'Daily reporting is disabled until the real workflow metrics are persisted.' });
});
app.post('/api/reports/:id/send', (_req, res) => {
  return res.status(503).json({ success: false, error: 'Gmail is not configured. No report was sent.' });
});

// ==========================================
// AUTOMATION & WORKFLOW RUNS (Phase 19 & 20)
// ==========================================

app.get('/api/automation/history', async (_req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ runs: [], error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('workflow_runs').select('*').order('start_time', { ascending: false }).limit(50);
  if (error) return res.status(502).json({ runs: [], error: error.message });
  return res.json({ runs: (data || []).map((row: any) => ({
    id: row.id, workflow_type: row.workflow_type, status: row.status,
    started_at: row.start_time, completed_at: row.completion_time || undefined,
    items_processed: row.items_processed || 0, summary: row.result_summary || '',
    error_details: row.error_details || undefined,
  })) });
});

app.post('/api/automation/trigger/:workflow', (_req, res) => {
  return res.status(503).json({ success: false, error: 'Durable scheduled workflows are not deployed yet. No workflow was run.' });
});

// ==========================================
// GOOGLE OAUTH & GMAIL INTEGRATION (Phase 7 & 14)
// ==========================================

app.get('/api/gmail/oauth/auth-url', (_req, res) => {
  return res.status(503).json({ success: false, error: 'Real Gmail OAuth is not enabled. No simulated authorization URL is returned.' });
});
app.get('/oauth/callback', (_req, res) => res.status(503).send('Gmail OAuth is not configured.'));
app.get('/oauth2callback', (_req, res) => res.status(503).send('Gmail OAuth is not configured.'));
app.post('/api/gmail/oauth/callback', (_req, res) => res.status(503).json({ success: false, error: 'Simulated OAuth callback disabled.' }));

app.get('/api/gmail/accounts', async (_req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ accounts: [], replies: [], error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('gmail_tokens')
    .select('id,email,label,connected,connected_at,daily_send_quota,sent_today,inbox_unread_count,reply_watcher_active,last_sync_at,is_primary,token_scope,created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(502).json({ accounts: [], replies: [], error: error.message });
  const accounts = (data || []).map((row: any) => ({
    id: row.id, email: row.email, label: row.label || row.email, connected: false,
    connectedAt: row.connected_at || row.created_at, dailySendQuota: row.daily_send_quota || 500,
    sentToday: row.sent_today || 0, inboxUnreadCount: row.inbox_unread_count || 0,
    replyWatcherActive: false, lastSyncAt: row.last_sync_at || '',
    isPrimary: Boolean(row.is_primary), hasRefreshToken: false, tokenScope: row.token_scope || '',
  }));
  return res.json({ accounts, replies: [] });
});

app.delete('/api/gmail/accounts/:id', (req, res) => {
  const { id } = req.params;
  const index = gmailAccounts.findIndex(a => a.id === id);
  if (index !== -1) {
    const removed = gmailAccounts.splice(index, 1)[0];
    addLog('GMAIL', 'info', `Removed Gmail account: ${removed.email}`);
    return res.json({ success: true, message: 'Account removed.' });
  }
  res.status(404).json({ error: 'Account not found' });
});

app.post('/api/gmail/accounts/:id/toggle', (req, res) => {
  const { id } = req.params;
  const acc = gmailAccounts.find(a => a.id === id);
  if (!acc) return res.status(404).json({ error: 'Account not found' });
  acc.connected = !acc.connected;
  res.json({ success: true, account: acc });
});

app.post('/api/gmail/send', (_req, res) => {
  return res.status(503).json({ success: false, error: 'Gmail sending is not configured. No email was sent.' });
});

// ==========================================
// DEMO HOSTING & NETLIFY DEPLOYMENT (Phase 16)
// ==========================================

app.get('/api/demos', async (_req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ demos: [], error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('client_demos').select('*').order('created_at', { ascending: false });
  if (error) return res.status(502).json({ demos: [], error: error.message });
  const demos = (data || []).map((row: any) => ({
    id: row.id, slug: row.slug || '', title: row.title || 'Client demo',
    clientName: row.client_name || '', createdAt: row.created_at,
    expiresAt: row.expires_at || '', framework: row.framework || 'HTML5',
    status: row.status || 'active', views: row.views || 0,
    htmlContent: row.html_content || '', previewUrl: row.preview_url || row.live_url,
    deployTarget: row.deploy_target || 'netlify', liveNetlifyUrl: row.live_netlify_url || row.live_url,
  }));
  return res.json({ demos });
});

app.post('/api/demos', (_req, res) => {
  return res.status(503).json({ success: false, error: 'Live demo deployment is disabled until a real Netlify API token and site ID are configured. No placeholder URL was created.' });
});

app.delete('/api/demos/:id', (req, res) => {
  const { id } = req.params;
  const index = hostedDemos.findIndex(d => d.id === id);
  if (index !== -1) {
    const deleted = hostedDemos.splice(index, 1)[0];
    addLog('HOSTING', 'info', `Demo ${deleted.title} removed.`);
    return res.json({ success: true, message: 'Demo deleted' });
  }
  res.status(404).json({ error: 'Demo not found' });
});

app.get('/demo/:id', (req, res) => {
  const { id } = req.params;
  const demo = hostedDemos.find(d => d.id === id || d.slug === id);
  if (!demo) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Demo Not Found — Irzam Studio</title><style>body{background:#050507;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style></head>
      <body><div style="text-align:center"><h2>Demo Not Found or Expired</h2><p style="color:#71717a">This temporary demo URL has expired or been cleaned up by Irzam Studio.</p></div></body>
      </html>
    `);
  }
  demo.views += 1;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(demo.htmlContent);
});

// ==========================================
// LEADS ENGINE (Phase 8 & 9)
// ==========================================

app.get('/api/leads', async (_req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ leads: [], error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('leads').select('*').order('created_at', { ascending: false });
  if (error) return res.status(502).json({ leads: [], error: error.message });
  return res.json({ leads: data || [] });
});

app.post('/api/leads', async (req, res) => {
  const { business_name, email, phone, city, niche, notes, demo_url } = req.body || {};
  if (!business_name || !email) return res.status(400).json({ error: 'Business name and email are required.' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(), business_name: String(business_name).trim(), email: normalizedEmail,
    phone: phone ? String(phone).trim() : null, city: city ? String(city).trim() : 'Undisclosed',
    niche: niche ? String(niche).trim() : 'Unclassified', status: 'pending',
    notes: notes ? String(notes).trim() : null, demo_url: demo_url ? String(demo_url).trim() : null,
    email_source: 'manual_entry', email_verified: false, google_reviews_count: 0,
    created_at: now, updated_at: now,
  };
  const { data, error } = await db.from('leads').insert(record).select('*').single();
  if (error) return res.status(502).json({ error: error.message });
  addLog('SYSTEM', 'info', `Saved manually entered lead ${record.business_name} to Supabase; reviews/email remain unverified.`);
  return res.json({ success: true, lead: data });
});

app.patch('/api/leads/:id', async (req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  const { status, notes, demo_url } = req.body || {};
  if (status !== undefined) {
    if (!['pending','contacted','replied'].includes(status)) return res.status(400).json({ error: 'Invalid lead status.' });
    patch.status = status;
  }
  if (notes !== undefined) patch.notes = notes;
  if (demo_url !== undefined) patch.demo_url = demo_url;
  const { data, error } = await db.from('leads').update(patch).eq('id', req.params.id).select('*').maybeSingle();
  if (error) return res.status(502).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Lead not found.' });
  return res.json({ success: true, lead: data });
});

app.delete('/api/leads/:id', async (req, res) => {
  const db = getSupabaseServerClient();
  if (!db) return res.status(503).json({ error: 'Server-side Supabase service-role access is not configured.' });
  const { data, error } = await db.from('leads').delete().eq('id', req.params.id).select('id').maybeSingle();
  if (error) return res.status(502).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Lead not found.' });
  return res.json({ success: true, message: 'Lead deleted from Supabase.' });
});

app.post('/api/leads/:id/dispatch', (_req, res) => {
  return res.status(503).json({ success: false, error: 'Outreach dispatch is disabled until verified contact provenance and real Gmail sending are connected. No email was sent.' });
});

// Fast-path helper for small-talk
function isLightInteraction(message: string, attachmentsCount: number): string | null {
  if (attachmentsCount > 0) return null;
  const text = (message || '').trim().toLowerCase();
  if (text.length > 70) return null;
  if (/^(hi|hello|hey|yo|greetings|hola|good\s*(morning|afternoon|evening|day)|sup)\b[!.?]*$/i.test(text)) {
    return `### Irzam Studio Workspace Ready

The dashboard is available. AI, research, email and deployment providers must pass real connection checks before they can be used. What would you like to prepare?`;
  }
  if (/^(who\s*are\s*you|what\s*can\s*you\s*do|what\s*is\s*irzam\s*studio|help)\b[!.?]*$/i.test(text)) {
    return `### Irzam Studio

A workspace for verified prospect research, contact discovery, personalized outreach, inbox handling and temporary client demos. Provider integrations remain unavailable until configured and verified.`;
  }
  if (/^(status|system\s*status|health|ping|are\s*you\s*(online|there|alive|ready))\b[!.?]*$/i.test(text)) {
    return `### Irzam Studio Service Status

- Workspace API: running
- Qwen: ${process.env.FREELLM_API_KEY ? 'environment key configured; test pending' : 'not configured'}
- Google Places: ${process.env.GOOGLE_MAPS_API_KEY ? 'environment key configured; test pending' : 'not configured'}
- Gmail: not connected
- Netlify: not connected
- Scheduled workflows: not deployed`;
  }
  return null;
}

// ==========================================
// CHAT & REAL-TIME SSE STREAMING (Phase 2 & 22)
// ==========================================

async function generateQwenCompletion(
  message: string,
  history: Array<{ role?: string; content?: string }> = [],
  requestedModel?: string,
): Promise<{ content: string; model: string }> {
  const apiKey = process.env.FREELLM_API_KEY || await getVaultSecret('irzam_freellmapi_key');
  if (!apiKey) throw new Error('FreeLLMAPI key is not configured.');
  const base = (process.env.FREELLM_BASE_URL || config.freellmBaseUrl).replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  const model = process.env.QWEN_MODEL || requestedModel || config.selectedModel;
  const messages = [
    { role: 'system', content: buildEnrichedSystemPrompt() },
    ...history.filter(item => (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .slice(-12).map(item => ({ role: item.role as string, content: String(item.content).slice(0, 12000) })),
    { role: 'user', content: String(message || '') },
  ];
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: config.temperature, max_tokens: 4096, stream: false }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error(`FreeLLMAPI returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json() as any;
  const value = payload.choices?.[0]?.message?.content;
  const content = typeof value === 'string' ? value : Array.isArray(value) ? value.map((part: any) => part?.text || '').join('') : '';
  if (!content.trim()) throw new Error('FreeLLMAPI returned an empty response.');
  return { content, model: String(payload.model || model) };
}

app.post('/api/chat', async (req, res) => {
  const { message, history = [], model, autoRoute } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message is required.' });
  let selectedModel = String(model || config.selectedModel);
  if (autoRoute) {
    const text = String(message).toLowerCase();
    if (text.includes('code') || text.includes('website') || text.includes('demo')) selectedModel = process.env.QWEN_CODER_MODEL || selectedModel;
    else if (text.includes('outreach') || text.includes('email')) selectedModel = process.env.QWEN_OUTREACH_MODEL || selectedModel;
  }
  try {
    const result = await generateQwenCompletion(String(message), Array.isArray(history) ? history : [], selectedModel);
    return res.json({ response: result.content, modelUsed: result.model, autoRouted: Boolean(autoRoute), deployedDemo: null, timestamp: new Date().toISOString() });
  } catch (error: any) {
    addLog('FREEMODEL', 'error', `Qwen generation failed: ${error.message}`);
    return res.status(502).json({ error: error.message, modelUsed: null });
  }
});

app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();
  let aborted = false;
  res.on('close', () => { aborted = true; });
  const send = (event: string, data: any) => { if (!aborted && !res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
  const { message, history = [], model, autoRoute } = req.body || {};
  try {
    send('stage', { stage: 'receiving', label: 'Receiving message...' });
    let selectedModel = String(model || config.selectedModel);
    if (autoRoute) {
      const text = String(message || '').toLowerCase();
      if (text.includes('code') || text.includes('website') || text.includes('demo')) selectedModel = process.env.QWEN_CODER_MODEL || selectedModel;
      else if (text.includes('outreach') || text.includes('email')) selectedModel = process.env.QWEN_OUTREACH_MODEL || selectedModel;
    }
    send('stage', { stage: 'calling_engine', label: `Connecting to ${selectedModel} via FreeLLMAPI...` });
    const result = await generateQwenCompletion(String(message || ''), Array.isArray(history) ? history : [], selectedModel);
    if (!aborted) {
      send('stage', { stage: 'generating', label: 'Response received...' });
      const chars = Array.from(result.content);
      for (let i = 0; i < chars.length; i += 120) {
        if (aborted) break;
        send('chunk', { text: chars.slice(i, i + 120).join('') });
      }
      send('done', { modelUsed: result.model, fullText: result.content, deployedDemo: null });
    }
    return res.end();
  } catch (error: any) {
    addLog('FREEMODEL', 'error', `Qwen stream failed: ${error.message}`);
    if (!aborted) {
      const messageText = `AI model unavailable: ${error.message}`;
      send('chunk', { text: messageText });
      send('done', { modelUsed: null, fullText: messageText, deployedDemo: null, error: true });
    }
    return res.end();
  }
});

// Local Node runtime serves Vite or the production build directly.
// Netlify serves the Vite dist folder from its CDN and routes /api/* to
// netlify/functions/api.ts, so this Express app must not open a port there.
if (!process.env.IRZAM_NETLIFY_FUNCTION) {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Irzam Studio] Platform Online on port ${PORT}`);
  });
}

export { app };
