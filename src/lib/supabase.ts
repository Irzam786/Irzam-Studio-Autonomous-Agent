import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ChatSession, HostedDemo, GmailAccount, SystemConfig, Lead, AgentRule,
  TrainingMessage, Campaign, OutreachQueueItem, DailyReport, WorkflowRun,
} from '../types';

// Browser-side database access is deliberately disabled. Privileged reads/writes
// must go through authenticated server routes using SUPABASE_SERVICE_ROLE_KEY.
export const DEFAULT_SUPABASE_URL = 'https://fgksgytuglpmzhqcdasb.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = '';

export function initSupabase(_url: string, _anonKey: string): null {
  return null;
}
export function getSupabase(): SupabaseClient | null {
  return null;
}
export async function testSupabaseConnection(_url: string, _anonKey: string): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: 'Direct browser database access is disabled for security. Configure server-side Supabase service-role access.',
  };
}
export async function loadConfigFromSupabase(): Promise<Partial<SystemConfig> | null> { return null; }
export async function saveConfigToSupabase(_cfg: Partial<SystemConfig>): Promise<boolean> { return false; }
export async function loadRulesFromSupabase(): Promise<AgentRule[] | null> { return null; }
export async function saveRuleToSupabase(_rule: AgentRule): Promise<boolean> { return false; }
export async function toggleRuleInSupabase(_id: string, _isActive: boolean): Promise<boolean> { return false; }
export async function deleteRuleFromSupabase(_id: string): Promise<boolean> { return false; }
export async function loadTrainingMessagesFromSupabase(_threadId = 'training-core'): Promise<TrainingMessage[] | null> { return null; }
export async function saveTrainingMessageToSupabase(_threadId: string, _role: 'user' | 'assistant', _content: string, _extractedCount = 0): Promise<boolean> { return false; }
export async function loadSessionsFromSupabase(): Promise<ChatSession[] | null> { return null; }
export async function saveSessionToSupabase(_session: ChatSession): Promise<boolean> { return false; }
export async function deleteSessionFromSupabase(_sessionId: string): Promise<boolean> { return false; }
export async function loadDemosFromSupabase(): Promise<HostedDemo[] | null> { return null; }
export async function saveDemoToSupabase(_demo: HostedDemo): Promise<boolean> { return false; }
export async function deleteDemoFromSupabase(_demoId: string): Promise<boolean> { return false; }
export async function loadGmailTokensFromSupabase(): Promise<GmailAccount[] | null> { return null; }
export async function saveGmailTokenToSupabase(_account: GmailAccount, _refreshToken?: string, _accessToken?: string): Promise<boolean> { return false; }
export async function loadLeadsFromSupabase(): Promise<Lead[] | null> { return null; }
export async function saveLeadToSupabase(_lead: Lead): Promise<boolean> { return false; }
export async function updateLeadStatusInSupabase(_id: string, _status: Lead['status'], _lastContactedAt?: string): Promise<boolean> { return false; }
export async function deleteLeadFromSupabase(_id: string): Promise<boolean> { return false; }
export async function loadCampaignsFromSupabase(): Promise<Campaign[] | null> { return null; }
export async function saveCampaignToSupabase(_campaign: Campaign): Promise<boolean> { return false; }
export async function loadQueueFromSupabase(): Promise<OutreachQueueItem[] | null> { return null; }
export async function loadReportsFromSupabase(): Promise<DailyReport[] | null> { return null; }
export async function loadWorkflowRunsFromSupabase(): Promise<WorkflowRun[] | null> { return null; }
