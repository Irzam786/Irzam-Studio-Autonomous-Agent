import { getDb, getVaultSecret, setVaultSecret } from './db';
import { getDb, getVaultSecret, setVaultSecret } from './db';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

export interface GmailAccountRecord {
  email: string;
  label?: string;
  connected: boolean;
  connected_at: string;
  daily_send_quota: number;
  sent_today: number;
  inbox_unread_count: number;
  reply_watcher_active: boolean;
  last_sync_at: string;
  is_primary: boolean;
  token_scope: string;
}

export interface InboxReplyRecord {
  id: string;
  account_id: string;
  gmail_message_id: string;
  thread_id: string;
  from_name: string;
  from_email: string;
  subject: string;
  snippet: string;
  intent: string;
  lead_id?: string;
  company_name?: string;
  received_at: string;
  suggested_response?: string;
  status: 'unread' | 'reviewed' | 'responded';
}

export function getGoogleOAuthCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl.replace(/\/$/, '')}/oauth/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function generateGoogleAuthUrl(redirectOrigin?: string): string {
  const { clientId, redirectUri } = getGoogleOAuthCredentials();
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in .env or settings.');
  }

  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  const state = Buffer.from(JSON.stringify({ origin: redirectOrigin || '', time: Date.now() })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string): Promise<{ success: boolean; email: string }> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials missing.');
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;

  // Get user profile
  const userRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userData = userRes.ok ? await userRes.json() : {};
  const email = userData.email || 'connected_account@gmail.com';

  const perAccountSecret = `irzam_gmail_token_${email}`;
  const existingRefreshToken = (await getVaultSecret(perAccountSecret)) || (await getVaultSecret('irzam_gmail_refresh_token'));
  if (refreshToken) {
    const accountSecretSaved = await setVaultSecret(perAccountSecret, refreshToken, `Gmail refresh token for ${email}`);
    const primarySecretSaved = await setVaultSecret('irzam_gmail_refresh_token', refreshToken, 'Default primary Gmail refresh token');
    if (!accountSecretSaved || !primarySecretSaved) {
      throw new Error('Gmail refresh token could not be stored securely in Supabase Vault.');
    }
  } else if (!existingRefreshToken) {
    throw new Error('Google did not return a refresh token. Remove this app from Google Account access and reconnect with consent.');
  }

  const db = getDb();
  const accountRecord: GmailAccountRecord = {
    email,
    label: 'Primary Gmail Relay',
    connected: true,
    connected_at: new Date().toISOString(),
    daily_send_quota: 500,
    sent_today: 0,
    inbox_unread_count: 0,
    reply_watcher_active: true,
    last_sync_at: new Date().toISOString(),
    is_primary: true,
    token_scope: 'gmail.send gmail.readonly userinfo.email',
  };
  const { error: saveError } = await db.from('gmail_tokens').upsert(accountRecord, { onConflict: 'email' });
  if (saveError) {
    throw new Error(`Gmail token was saved but account registration failed: ${saveError.message}`);
  }

  return { success: true, email };
}

export async function getGmailAccessToken(email?: string): Promise<string> {
  const { clientId, clientSecret } = getGoogleOAuthCredentials();
  let refreshToken = '';

  if (email) {
    refreshToken = (await getVaultSecret(`irzam_gmail_token_${email}`)) || '';
  }
  if (!refreshToken) {
    refreshToken = (await getVaultSecret('irzam_gmail_refresh_token')) || process.env.GMAIL_REFRESH_TOKEN || '';
  }

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Gmail OAuth refresh token or client credentials not configured.');
  }

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function scanInboxForReplies(): Promise<InboxReplyRecord[]> {
  const token = await getGmailAccessToken();
  const listRes = await fetch(`${GMAIL_API_BASE}/messages?q=label:INBOX&maxResults=15`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    throw new Error(`Failed to list Gmail messages: ${listRes.statusText}`);
  }

  const listData = await listRes.json();
  const messages = listData.messages || [];
  const db = getDb();

  const { data: accounts, error: accountError } = await db
    .from('gmail_tokens')
    .select('id,email')
    .eq('connected', true)
    .order('is_primary', { ascending: false })
    .limit(1);
  if (accountError) throw new Error(`Could not load the connected Gmail account: ${accountError.message}`);
  const account = (accounts || [])[0];
  if (!account) throw new Error('No connected Gmail account is registered in Supabase.');

  // Load existing leads to match the sender.
  const { data: trackedLeads, error: leadsError } = await db.from('leads').select('id, business_name, email');
  if (leadsError) throw new Error(`Could not load leads for inbox matching: ${leadsError.message}`);
  const leadEmailMap = new Map((trackedLeads || []).map((lead: any) => [lead.email?.toLowerCase(), lead]));
  const replies: InboxReplyRecord[] = [];

  for (const m of messages) {
    const detailRes = await fetch(`${GMAIL_API_BASE}/messages/${m.id}?format=metadata`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!detailRes.ok) continue;

    const detail = await detailRes.json();
    const headers = detail.payload?.headers || [];
    const headerMap = Object.fromEntries(headers.map((h: any) => [h.name.toLowerCase(), h.value]));

    const fromRaw = headerMap['from'] || '';
    const senderEmail = (fromRaw.match(/<([^>]+)>/) ? fromRaw.match(/<([^>]+)>/)![1] : fromRaw).trim().toLowerCase();
    const fromName = fromRaw.replace(/<[^>]+>/, '').trim() || senderEmail;
    const subject = headerMap['subject'] || '';
    const snippet = detail.snippet || '';

    // Match with lead
    const matchedLead = leadEmailMap.get(senderEmail);
    const intent = classifyReplyIntent(snippet);

    const replyRecord: InboxReplyRecord = {
      id: detail.id,
      account_id: account.id,
      gmail_message_id: detail.id,
      thread_id: detail.threadId || '',
      from_name: fromName,
      from_email: senderEmail,
      subject,
      snippet,
      intent,
      lead_id: matchedLead?.id,
      company_name: matchedLead?.business_name,
      received_at: headerMap['date'] || new Date().toISOString(),
      status: 'unread',
    };

    replies.push(replyRecord);

    // The production table has UUID-generated IDs and no lead_id/company_name/received_at columns.
    const dbRecord = {
      account_id: account.id,
      gmail_message_id: detail.id,
      thread_id: detail.threadId || null,
      from_name: fromName,
      from_email: senderEmail,
      subject,
      snippet,
      intent,
      status: 'unread',
    };
    const { error: upsertError } = await db.from('inbox_replies').upsert(dbRecord, { onConflict: 'gmail_message_id' });
    if (upsertError) throw new Error(`Could not save Gmail reply ${detail.id}: ${upsertError.message}`);
    if (matchedLead) {
      const { error: leadUpdateError } = await db.from('leads')
        .update({ status: 'replied', updated_at: new Date().toISOString() })
        .eq('id', matchedLead.id);
      if (leadUpdateError) throw new Error(`Could not update replied lead: ${leadUpdateError.message}`);
    }
  }

  return replies;
}

export function classifyReplyIntent(snippet: string): string {
  const text = (snippet || '').toLowerCase();
  // Match the exact intent values allowed by the live public.inbox_replies constraint.
  if (/unsubscribe|remove me|stop emailing|opt[- ]?out|do not contact/i.test(text)) return 'UNSUBSCRIBE';
  if (/how much|pricing|cost|rates|package|quote|fee/i.test(text)) return 'PRICING_INQUIRY';
  if (/call|schedule|zoom|meeting|calendar|time to speak|chat tomorrow/i.test(text)) return 'SCHEDULE_CALL';
  if (/not interested|no thanks|pass|already have/i.test(text)) return 'OBJECTION';
  if (/interested|send demo|send preview|show me|tell me more|looks good/i.test(text)) return 'HIGH_INTEREST';
  return 'NEUTRAL';
}

export async function sendGmailEmail(
  to: string,
  subject: string,
  bodyText: string,
  threadId?: string
): Promise<{ success: boolean; messageId: string }> {
  const token = await getGmailAccessToken();
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    bodyText,
  ];

  if (threadId) {
    messageParts.splice(2, 0, `In-Reply-To: ${threadId}`, `References: ${threadId}`);
  }

  const raw = Buffer.from(messageParts.join('\r\n')).toString('base64url');

  const res = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw, threadId }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return { success: true, messageId: data.id };
}
