import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ChatSession, HostedDemo, GmailAccount, SystemConfig, Lead, AgentRule,
  TrainingMessage, Campaign, OutreachQueueItem, DailyReport, WorkflowRun,
} from '../types';

export const DEFAULT_SUPABASE_URL = 'https://fgksgytuglpmzhqcdasb.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = '';

export function initSupabase(_url: string, _anonKey: string): null {
  return null;
}
export function getSupabase(): SupabaseClient | null {
  return null;
}

export async function testSupabaseConnection(_url: string, _anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/connectors/supabase/test', { method: 'POST', credentials: 'include' });
    const data = await res.json();
    return { success: data.success, message: data.message || 'Connected to Supabase PostgreSQL database.' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to reach Supabase API.' };
  }
}

export async function loadConfigFromSupabase(): Promise<Partial<SystemConfig> | null> {
  try {
    const res = await fetch('/api/config', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveConfigToSupabase(cfg: Partial<SystemConfig>): Promise<boolean> {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadRulesFromSupabase(): Promise<AgentRule[] | null> {
  try {
    const res = await fetch('/api/training/rules', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.rules) ? data.rules : [];
  } catch {
    return null;
  }
}

export async function saveRuleToSupabase(rule: AgentRule): Promise<boolean> {
  try {
    const res = await fetch('/api/training/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function toggleRuleInSupabase(id: string, isActive: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/training/rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteRuleFromSupabase(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/training/rules/${id}`, { method: 'DELETE', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadTrainingMessagesFromSupabase(_threadId = 'training-core'): Promise<TrainingMessage[] | null> {
  try {
    const res = await fetch('/api/training/messages', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.messages) ? data.messages : [];
  } catch {
    return null;
  }
}

export async function saveTrainingMessageToSupabase(_threadId: string, _role: 'user' | 'assistant', content: string): Promise<boolean> {
  try {
    const res = await fetch('/api/training/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content }),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadSessionsFromSupabase(): Promise<ChatSession[] | null> {
  try {
    const res = await fetch('/api/chat/sessions', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.sessions) ? data.sessions : [];
  } catch {
    return null;
  }
}

export async function saveSessionToSupabase(session: ChatSession): Promise<boolean> {
  try {
    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteSessionFromSupabase(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadDemosFromSupabase(): Promise<HostedDemo[] | null> {
  try {
    const res = await fetch('/api/demos', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.demos) ? data.demos : [];
  } catch {
    return null;
  }
}

export async function saveDemoToSupabase(demo: HostedDemo): Promise<boolean> {
  try {
    const res = await fetch('/api/demos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demo),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteDemoFromSupabase(demoId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/demos/${demoId}`, { method: 'DELETE', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadGmailTokensFromSupabase(): Promise<GmailAccount[] | null> {
  try {
    const res = await fetch('/api/gmail/accounts', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch {
    return null;
  }
}

export async function saveGmailTokenToSupabase(_account: GmailAccount, _refreshToken?: string, _accessToken?: string): Promise<boolean> {
  return false;
}

export async function loadLeadsFromSupabase(): Promise<Lead[] | null> {
  try {
    const res = await fetch('/api/leads', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.leads) ? data.leads : [];
  } catch {
    return null;
  }
}

export async function saveLeadToSupabase(lead: Lead): Promise<boolean> {
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateLeadStatusInSupabase(id: string, status: Lead['status'], _lastContactedAt?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteLeadFromSupabase(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/leads/${id}`, { method: 'DELETE', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadCampaignsFromSupabase(): Promise<Campaign[] | null> {
  try {
    const res = await fetch('/api/campaigns', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.campaigns) ? data.campaigns : [];
  } catch {
    return null;
  }
}

export async function saveCampaignToSupabase(campaign: Campaign): Promise<boolean> {
  try {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadQueueFromSupabase(): Promise<OutreachQueueItem[] | null> {
  try {
    const res = await fetch('/api/outreach/queue', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.queue) ? data.queue : [];
  } catch {
    return null;
  }
}

export async function loadReportsFromSupabase(): Promise<DailyReport[] | null> {
  try {
    const res = await fetch('/api/reports', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.reports) ? data.reports : [];
  } catch {
    return null;
  }
}

export async function loadWorkflowRunsFromSupabase(): Promise<WorkflowRun[] | null> {
  try {
    const res = await fetch('/api/automation/history', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.runs) ? data.runs : [];
  } catch {
    return null;
  }
}
