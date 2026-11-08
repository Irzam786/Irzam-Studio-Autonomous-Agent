import { randomUUID } from 'node:crypto';
import { getDb, getVaultSecret, setVaultSecret } from './db';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

export interface GmailAccountRecord {
  id: string;
  email: string;
  label?: string;
  is_primary: boolean;
  is_active: boolean;
  status: 'connected' | 'error' | 'disconnected';
  last_sync_at?: string;
  error_message?: string;
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

  if (refreshToken) {
    await setVaultSecret(`irzam_gmail_token_${email}`, refreshToken, `Gmail refresh token for ${email}`);
    await setVaultSecret('irzam_gmail_refresh_token', refreshToken, 'Default primary Gmail refresh token');
  }

  const db = getDb();
  const accountRecord: GmailAccountRecord = {
    id: `gmail-${randomUUID().slice(0, 8)}`,
    email,
    label: 'Primary Gmail Relay',
    is_primary: true,
    is_active: true,
    status: 'connected',
    last_sync_at: new Date().toISOString(),
  };

  try {
    await db.from('gmail_tokens').upsert(accountRecord, { onConflict: 'email' });
  } catch (err) {
    console.warn('[GMAIL] Supabase record save warning:', err);
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

  // Load existing leads to match sender
  let trackedLeads: any[] = [];
  try {
    const { data } = await db.from('leads').select('id, business_name, email');
    trackedLeads = data || [];
  } catch {}

  const leadEmailMap = new Map(trackedLeads.map((l) => [l.email?.toLowerCase(), l]));
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
      id: `reply-${detail.id}`,
      account_id: 'primary',
      gmail_message_id: detail.id,
      thread_id: detail.threadId,
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

    try {
      await db.from('inbox_replies').upsert(replyRecord, { onConflict: 'gmail_message_id' });
      if (matchedLead) {
        await db.from('leads').update({ status: 'replied', updated_at: new Date().toISOString() }).eq('id', matchedLead.id);
      }
    } catch {}
  }

  return replies;
}

export function classifyReplyIntent(snippet: string): string {
  const text = snippet.toLowerCase();
  if (/unsubscribe|remove me|stop emailing|opt[- ]?out|do not contact/i.test(text)) return 'OPT_OUT';
  if (/how much|pricing|cost|rates|package|quote|fee/i.test(text)) return 'PRICING_INQUIRY';
  if (/call|schedule|zoom|meeting|calendar|time to speak|chat tomorrow/i.test(text)) return 'SCHEDULE_CALL';
  if (/interested|send demo|send preview|show me|tell me more|looks good/i.test(text)) return 'POSITIVE_INTEREST';
  if (/not interested|no thanks|pass|already have/i.test(text)) return 'NOT_INTERESTED';
  if (/delivery status notification|undeliverable|failure/i.test(text)) return 'BOUNCE';
  return 'GENERAL_INQUIRY';
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
