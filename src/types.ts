export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  textPreview?: string;
  previewUrl?: string;
}

export interface HostedDemo {
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  modelUsed?: string;
  deployedDemo?: HostedDemo | null;
  status?: 'sending' | 'done' | 'error';
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  pinned?: boolean;
}

export interface GmailAccount {
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
}

export interface DetectedReply {
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

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'CRON' | 'GMAIL' | 'FREEMODEL' | 'HOSTING' | 'AGENT' | 'SYSTEM' | 'NETLIFY' | 'SUPABASE' | 'RESEARCH' | 'OUTREACH';
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface NetlifyConfig {
  token: string;
  siteId: string;
  siteName: string;
  connected: boolean;
  lastDeployAt?: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  connected: boolean;
  redirectUri: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
  lastSyncAt?: string;
}

export interface SystemConfig {
  ownerPin: string;
  freellmApiKey: string;
  freellmApiKeyMasked?: string;
  hasKey?: boolean;
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

export interface CronStatus {
  active: boolean;
  interval: string;
  lastRunAt: string;
  nextRunAt: string;
  runCount: number;
  unreadRepliesCount: number;
}

export interface Lead {
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

// Connector Marketplace Types
export type ConnectorCategory = 
  | 'ai_intelligence'
  | 'database'
  | 'email_communication'
  | 'website_deployment'
  | 'business_discovery'
  | 'web_research'
  | 'email_discovery'
  | 'custom';

export interface ConnectorInfo {
  id: string;
  provider: string;
  name: string;
  description: string;
  category: ConnectorCategory;
  authType: 'oauth2' | 'api_key' | 'token' | 'mcp' | 'credentials';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  enabledForAgent: boolean;
  maskedKey?: string;
  lastVerifiedAt?: string;
  errorMessage?: string;
  usageInfo?: {
    used: number;
    limit: number;
    unit: string;
    resetDate?: string;
  };
  allowedCapabilities: string[];
}

// Personal Training System Types
export type RuleCategory = 
  | 'qualification'
  | 'outreach_style'
  | 'follow_up'
  | 'timing'
  | 'demo_preferences'
  | 'daily_targets'
  | 'general';

export interface AgentRule {
  id: string;
  category: RuleCategory;
  title: string;
  rule_text: string;
  parameters?: Record<string, any>;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  extracted_rules_count?: number;
  created_at: string;
}

// Campaign & Outreach Queue Types
export interface Campaign {
  id: string;
  name: string;
  niche: string;
  city: string;
  min_reviews: number;
  daily_limit: number;
  status: 'active' | 'paused' | 'completed';
  pitch_angle: string;
  demo_slug?: string;
  leads_count: number;
  sent_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
}

export interface OutreachQueueItem {
  id: string;
  lead_id: string;
  business_name: string;
  recipient_email: string;
  subject: string;
  body_preview: string;
  attached_demo_url?: string;
  scheduled_for_pkt: string; // ISO string in PKT/UTC
  status: 'draft_generated' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'replied' | 'opted_out';
  sent_via_email?: string;
  sent_at?: string;
  followup_stage: 0 | 1 | 2;
  next_followup_due?: string;
  created_at: string;
}

// Daily Reports
export interface DailyReport {
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

// Automation History
export interface WorkflowRun {
  id: string;
  workflow_type: 'discovery_5pm' | 'outreach_6pm' | 'inbox_watcher_hourly' | 'daily_report_10pm' | 'manual_scan';
  status: 'running' | 'completed' | 'failed' | 'partial';
  started_at: string;
  completed_at?: string;
  items_processed: number;
  summary: string;
  error_details?: string;
}

// Navigation Tabs - Full 12-item Base44 / ChatGPT Workspace Navigation
export type DashboardTab = 
  | 'chat'
  | 'training'
  | 'brain'
  | 'connectors'
  | 'leads'
  | 'campaigns'
  | 'queue'
  | 'inbox'
  | 'demos'
  | 'reports'
  | 'automation'
  | 'settings';

export type ThemeMode = 'dark' | 'light';

export type ActivityStage = 
  | 'idle'
  | 'receiving'
  | 'understanding'
  | 'retrieving_training'
  | 'preparing_context'
  | 'calling_engine'
  | 'researching'
  | 'generating'
  | 'finalizing'
  | 'done';
