import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  ChatSession, 
  HostedDemo, 
  GmailAccount, 
  SystemConfig, 
  Lead, 
  AgentRule, 
  TrainingMessage, 
  Campaign, 
  OutreachQueueItem, 
  DailyReport, 
  WorkflowRun, 
  ConnectorInfo 
} from '../types';

export const DEFAULT_SUPABASE_URL = 'https://fgksgytuglpmzhqcdasb.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Z8IOLaPoA7BVExW3PcHAgg_OSPMDAi1';

let supabaseClient: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

// Initialize default client on startup
try {
  currentUrl = DEFAULT_SUPABASE_URL;
  currentKey = DEFAULT_SUPABASE_ANON_KEY;
  supabaseClient = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
} catch (e) {
  console.warn('Initial Supabase client setup deferred:', e);
}

export function initSupabase(url: string, anonKey: string): SupabaseClient | null {
  if (!url || !anonKey) {
    supabaseClient = null;
    return null;
  }
  try {
    if (url !== currentUrl || anonKey !== currentKey) {
      currentUrl = url;
      currentKey = anonKey;
      supabaseClient = createClient(url, anonKey, {
        auth: { persistSession: false },
      });
    }
    return supabaseClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabaseClient = null;
    return null;
  }
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseClient && currentUrl && currentKey) {
    initSupabase(currentUrl, currentKey);
  }
  return supabaseClient;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url.startsWith('https://')) {
      return { success: false, message: 'Supabase URL must start with https://' };
    }
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    
    // Probe query against Supabase endpoint using system_config
    const { error } = await client.from('system_config').select('id', { head: true });
    
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      if (error.message.includes('API key') || error.message.includes('JWT')) {
        return { success: false, message: `Invalid Supabase Anon Key: ${error.message}` };
      }
    }
    
    return { success: true, message: 'Connected to Supabase successfully! Cloud persistence active.' };
  } catch (err: any) {
    return { success: false, message: `Connection error: ${err.message}` };
  }
}

// 1. PIN & Master Settings Persistence with system_config (id: 1)
export async function loadConfigFromSupabase(): Promise<Partial<SystemConfig> | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data: sysData, error } = await client
      .from('system_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (sysData && !error) {
      return {
        ownerPin: sysData.pin_code || undefined,
        freellmApiKey: sysData.freellmapi_key || undefined,
        netlify: sysData.netlify_token ? {
          token: sysData.netlify_token,
          siteId: '',
          siteName: 'irzam-demos',
          connected: Boolean(sysData.netlify_token),
        } : undefined,
        googleMapsApiKey: sysData.google_maps_api_key || undefined,
        tavilyApiKey: sysData.tavily_api_key || undefined,
        hunterApiKey: sysData.hunter_api_key || undefined,
        prospeoApiKey: sysData.prospeo_api_key || undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveConfigToSupabase(cfg: Partial<SystemConfig>): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const payload: any = {
      id: 1,
      updated_at: new Date().toISOString(),
    };
    if (cfg.ownerPin !== undefined && cfg.ownerPin !== '') {
      payload.pin_code = String(cfg.ownerPin).trim();
    }
    if (cfg.freellmApiKey !== undefined) {
      payload.freellmapi_key = cfg.freellmApiKey.trim();
    }
    if (cfg.netlify?.token !== undefined) {
      payload.netlify_token = cfg.netlify.token.trim();
    }
    if (cfg.googleMapsApiKey !== undefined) {
      payload.google_maps_api_key = cfg.googleMapsApiKey.trim();
    }
    if (cfg.tavilyApiKey !== undefined) {
      payload.tavily_api_key = cfg.tavilyApiKey.trim();
    }
    if (cfg.hunterApiKey !== undefined) {
      payload.hunter_api_key = cfg.hunterApiKey.trim();
    }
    if (cfg.prospeoApiKey !== undefined) {
      payload.prospeo_api_key = cfg.prospeoApiKey.trim();
    }

    const { error: upsertErr } = await client.from('system_config').upsert(payload);
    if (!upsertErr) return true;
    const { error: updateErr } = await client.from('system_config').update(payload).eq('id', 1);
    return !updateErr;
  } catch {
    return false;
  }
}

// 2. Personal Training Operational Rules Persistence
export async function loadRulesFromSupabase(): Promise<AgentRule[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('agent_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;
    return data.map((r: any) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      rule_text: r.rule_text,
      parameters: r.parameters || {},
      is_active: r.is_active ?? true,
      version: r.version || 1,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function saveRuleToSupabase(rule: AgentRule): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('agent_rules').upsert({
      id: rule.id,
      category: rule.category,
      title: rule.title,
      rule_text: rule.rule_text,
      parameters: rule.parameters || {},
      is_active: rule.is_active,
      version: rule.version,
      created_at: rule.created_at,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function toggleRuleInSupabase(id: string, is_active: boolean): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('agent_rules').update({
      is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteRuleFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('agent_rules').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// 3. Training Conversations & Messages
export async function loadTrainingMessagesFromSupabase(threadId: string = 'training-core'): Promise<TrainingMessage[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('training_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error || !data) return null;
    return data.map((row: any) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      extracted_rules_count: row.extracted_rules_count || 0,
      created_at: row.created_at,
    }));
  } catch {
    return null;
  }
}

export async function saveTrainingMessageToSupabase(threadId: string, role: 'user' | 'assistant', content: string, extractedCount: number = 0): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('training_messages').insert({
      id: crypto.randomUUID(),
      thread_id: threadId,
      role,
      content,
      extracted_rules_count: extractedCount,
      created_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

// 4. Chat Sessions Persistence
export async function loadSessionsFromSupabase(): Promise<ChatSession[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      pinned: row.pinned || false,
      messages: Array.isArray(row.messages) ? row.messages : [],
    }));
  } catch {
    return null;
  }
}

export async function saveSessionToSupabase(session: ChatSession): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('chat_sessions').upsert({
      id: session.id,
      title: session.title,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      messages: session.messages,
      pinned: session.pinned || false,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSessionFromSupabase(sessionId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('chat_sessions').delete().eq('id', sessionId);
    return !error;
  } catch {
    return false;
  }
}

// 5. Client Demos Persistence
export async function loadDemosFromSupabase(): Promise<HostedDemo[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('client_demos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      clientName: row.client_name,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      framework: row.framework,
      status: row.status,
      views: row.views || 0,
      htmlContent: row.html_content,
      previewUrl: row.preview_url,
      deployTarget: row.deploy_target || 'edge_sandbox',
      liveNetlifyUrl: row.live_netlify_url,
    }));
  } catch {
    return null;
  }
}

export async function saveDemoToSupabase(demo: HostedDemo): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('client_demos').upsert({
      id: demo.id,
      slug: demo.slug,
      title: demo.title,
      client_name: demo.clientName,
      created_at: demo.createdAt,
      expires_at: demo.expiresAt,
      framework: demo.framework,
      html_content: demo.htmlContent,
      preview_url: demo.previewUrl,
      views: demo.views,
      status: demo.status,
      deploy_target: demo.deployTarget,
      live_netlify_url: demo.liveNetlifyUrl || null,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteDemoFromSupabase(demoId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('client_demos').delete().eq('id', demoId);
    return !error;
  } catch {
    return false;
  }
}

// 6. Gmail OAuth Tokens Persistence
export async function loadGmailTokensFromSupabase(): Promise<GmailAccount[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('gmail_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      email: row.email,
      label: row.label || row.email,
      connected: row.connected ?? true,
      connectedAt: row.connected_at || row.created_at,
      dailySendQuota: row.daily_send_quota || 500,
      sentToday: row.sent_today || 0,
      inboxUnreadCount: row.inbox_unread_count || 0,
      replyWatcherActive: row.reply_watcher_active ?? true,
      lastSyncAt: row.last_sync_at || new Date().toISOString(),
      isPrimary: row.is_primary || false,
      hasRefreshToken: Boolean(row.refresh_token),
      tokenScope: row.token_scope || 'https://mail.google.com/',
    }));
  } catch {
    return null;
  }
}

export async function saveGmailTokenToSupabase(account: GmailAccount, refreshToken?: string, accessToken?: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const payload: any = {
      id: account.id,
      email: account.email,
      label: account.label,
      connected: account.connected,
      connected_at: account.connectedAt,
      daily_send_quota: account.dailySendQuota,
      sent_today: account.sentToday,
      inbox_unread_count: account.inboxUnreadCount,
      reply_watcher_active: account.replyWatcherActive,
      last_sync_at: account.lastSyncAt,
      is_primary: account.isPrimary || false,
      token_scope: account.tokenScope || 'https://mail.google.com/',
    };
    if (refreshToken) payload.refresh_token = refreshToken;
    if (accessToken) payload.access_token = accessToken;

    const { error } = await client.from('gmail_tokens').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

// 7. Leads & Outreach Persistence
export async function loadLeadsFromSupabase(): Promise<Lead[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      business_name: row.business_name || row.businessName || 'Target Business',
      email: row.email,
      phone: row.phone || undefined,
      city: row.city || 'Undisclosed',
      niche: row.niche || 'Technology',
      status: (row.status === 'contacted' || row.status === 'replied') ? row.status : 'pending',
      notes: row.notes || undefined,
      demo_url: row.demo_url || row.demoUrl || undefined,
      google_place_id: row.google_place_id || undefined,
      google_rating: row.google_rating ? Number(row.google_rating) : undefined,
      google_reviews_count: row.google_reviews_count ? Number(row.google_reviews_count) : 0,
      website: row.website || undefined,
      email_source: row.email_source || 'website_research',
      email_verified: Boolean(row.email_verified),
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
      last_contacted_at: row.last_contacted_at || undefined,
    }));
  } catch {
    return null;
  }
}

export async function saveLeadToSupabase(lead: Lead): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('leads').upsert({
      id: lead.id,
      business_name: lead.business_name,
      email: lead.email,
      phone: lead.phone || null,
      city: lead.city,
      niche: lead.niche,
      status: lead.status,
      notes: lead.notes || null,
      demo_url: lead.demo_url || null,
      google_place_id: lead.google_place_id || null,
      google_rating: lead.google_rating || null,
      google_reviews_count: lead.google_reviews_count || 0,
      website: lead.website || null,
      email_source: lead.email_source || 'website_research',
      email_verified: lead.email_verified || false,
      created_at: lead.created_at,
      updated_at: new Date().toISOString(),
      last_contacted_at: lead.last_contacted_at || null,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function updateLeadStatusInSupabase(id: string, status: Lead['status'], lastContactedAt?: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (lastContactedAt) payload.last_contacted_at = lastContactedAt;
    const { error } = await client.from('leads').update(payload).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteLeadFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('leads').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// 8. Campaigns Persistence
export async function loadCampaignsFromSupabase(): Promise<Campaign[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;
    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      niche: c.niche,
      city: c.city || 'All Cities',
      min_reviews: c.min_reviews || 50,
      daily_limit: c.daily_limit || 10,
      status: c.status || 'active',
      pitch_angle: c.pitch_angle || 'Interactive Prototype Demo',
      demo_slug: c.demo_slug || undefined,
      leads_count: 0,
      sent_count: 0,
      replies_count: 0,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function saveCampaignToSupabase(campaign: Campaign): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('campaigns').upsert({
      id: campaign.id,
      name: campaign.name,
      niche: campaign.niche,
      city: campaign.city,
      min_reviews: campaign.min_reviews,
      daily_limit: campaign.daily_limit,
      status: campaign.status,
      pitch_angle: campaign.pitch_angle,
      demo_slug: campaign.demo_slug || null,
      created_at: campaign.created_at,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

// 9. Outreach Queue Persistence
export async function loadQueueFromSupabase(): Promise<OutreachQueueItem[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('outreach_queue')
      .select('*')
      .order('scheduled_for_pkt', { ascending: true });

    if (error || !data) return null;
    return data.map((q: any) => ({
      id: q.id,
      lead_id: q.lead_id,
      business_name: q.business_name,
      recipient_email: q.recipient_email,
      subject: q.subject,
      body_preview: q.body ? q.body.slice(0, 120) : '',
      attached_demo_url: q.attached_demo_url || undefined,
      scheduled_for_pkt: q.scheduled_for_pkt,
      status: q.status || 'scheduled',
      sent_via_email: q.sent_via_email || undefined,
      sent_at: q.sent_at || undefined,
      followup_stage: q.followup_stage || 0,
      next_followup_due: q.next_followup_due || undefined,
      created_at: q.created_at,
    }));
  } catch {
    return null;
  }
}

// 10. Daily Reports Persistence
export async function loadReportsFromSupabase(): Promise<DailyReport[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('daily_reports')
      .select('*')
      .order('generated_at_pkt', { ascending: false });

    if (error || !data) return null;
    return data.map((r: any) => ({
      id: r.id,
      report_date: r.report_date,
      generated_at_pkt: r.generated_at_pkt,
      researched_count: r.researched_count || 0,
      qualified_count: r.qualified_count || 0,
      google_reviews_checked: r.google_reviews_checked || 0,
      emails_discovered: r.emails_discovered || 0,
      emails_verified: r.emails_verified || 0,
      emails_scheduled: r.emails_scheduled || 0,
      emails_sent: r.emails_sent || 0,
      failed_attempts: r.failed_attempts || 0,
      replies_received: r.replies_received || 0,
      responses_generated: r.responses_generated || 0,
      followups_sent: r.followups_sent || 0,
      demos_generated: r.demos_generated || 0,
      quota_usage_summary: r.quota_usage_summary || {},
      summary_text: r.summary_text,
      status: r.status || 'saved',
    }));
  } catch {
    return null;
  }
}

// 11. Workflow Runs Persistence
export async function loadWorkflowRunsFromSupabase(): Promise<WorkflowRun[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('workflow_runs')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(30);

    if (error || !data) return null;
    return data.map((w: any) => ({
      id: w.id,
      workflow_type: w.workflow_type,
      status: w.status,
      started_at: w.start_time,
      completed_at: w.completion_time || undefined,
      items_processed: w.items_processed || 0,
      summary: w.result_summary || 'Workflow executed.',
      error_details: w.error_details || undefined,
    }));
  } catch {
    return null;
  }
}
