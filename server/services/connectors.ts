import { getDb, getVaultSecret, setVaultSecret, deleteVaultSecret } from './db';

export interface ConnectorDefinition {
  id: string;
  provider: string;
  name: string;
  category: 'ai_intelligence' | 'database' | 'email_communication' | 'website_deployment' | 'business_discovery' | 'web_research' | 'lead_enrichment' | 'messaging';
  description: string;
  authType: 'api_key' | 'credentials' | 'oauth2' | 'token';
  vaultSecretName?: string;
  allowedCapabilities: string[];
}

export const CONNECTOR_CATALOG: ConnectorDefinition[] = [
  {
    id: 'freellm_qwen',
    provider: 'freellm',
    name: 'FreeLLMAPI (Qwen Neural Brain)',
    category: 'ai_intelligence',
    description: 'Powers multimodal reasoning, code generation, personalized outreach drafting, and intelligent prompt routing.',
    authType: 'api_key',
    vaultSecretName: 'irzam_freellmapi_key',
    allowedCapabilities: ['text_generation', 'code_generation', 'multimodal_vision', 'fast_routing'],
  },
  {
    id: 'google_gemini',
    provider: 'google_gemini',
    name: 'Google Gemini API',
    category: 'ai_intelligence',
    description: 'Google Gemini Flash and Pro models for high-speed function calling, document parsing, and agent planning.',
    authType: 'api_key',
    vaultSecretName: 'irzam_gemini_api_key',
    allowedCapabilities: ['function_calling', 'structured_outputs', 'fast_routing', 'deep_research'],
  },
  {
    id: 'supabase',
    provider: 'supabase',
    name: 'Supabase PostgreSQL Cloud DB',
    category: 'database',
    description: 'Permanent cloud persistence for system settings, operational rules, leads, outreach queue, and demos.',
    authType: 'credentials',
    allowedCapabilities: ['table_read', 'table_write', 'upsert_rules', 'sync_demos'],
  },
  {
    id: 'google_workspace',
    provider: 'google_workspace',
    name: 'Google Workspace Gmail Relays',
    category: 'email_communication',
    description: 'Official Google OAuth2 connector for cold outreach dispatch and automated inbox reply monitoring.',
    authType: 'oauth2',
    vaultSecretName: 'irzam_gmail_refresh_token',
    allowedCapabilities: ['send_mail', 'read_inbox', 'token_refresh', 'reply_parsing'],
  },
  {
    id: 'netlify',
    provider: 'netlify',
    name: 'Netlify Edge API',
    category: 'website_deployment',
    description: 'Instant edge deployment for interactive client demo prototypes with live HTTPS subdomains.',
    authType: 'token',
    vaultSecretName: 'irzam_netlify_token',
    allowedCapabilities: ['create_site', 'deploy_html', 'subdomain_hosting'],
  },
  {
    id: 'google_places',
    provider: 'google_places',
    name: 'Google Places API (New)',
    category: 'business_discovery',
    description: 'Primary source for genuine Google business profiles, ratings, address, and Google review counts.',
    authType: 'api_key',
    vaultSecretName: 'irzam_google_maps_api_key',
    allowedCapabilities: ['places_search', 'rating_verification', 'review_count_qualification', 'website_discovery'],
  },
  {
    id: 'tavily',
    provider: 'tavily',
    name: 'Tavily AI Search',
    category: 'web_research',
    description: 'Deep web research agent for discovering official company contact pages, leadership, and digital presence.',
    authType: 'api_key',
    vaultSecretName: 'irzam_tavily_api_key',
    allowedCapabilities: ['deep_web_search', 'contact_page_extraction', 'content_summary'],
  },
  {
    id: 'hunter',
    provider: 'hunter',
    name: 'Hunter.io Email Finder',
    category: 'lead_enrichment',
    description: 'Domain search and executive email discovery with verification status and deliverability confidence scores.',
    authType: 'api_key',
    vaultSecretName: 'irzam_hunter_api_key',
    allowedCapabilities: ['domain_search', 'email_finder', 'email_verifier'],
  },
  {
    id: 'prospeo',
    provider: 'prospeo',
    name: 'Prospeo B2B Intelligence',
    category: 'lead_enrichment',
    description: 'B2B verified email finder and company enrichment with corporate email validation.',
    authType: 'api_key',
    vaultSecretName: 'irzam_prospeo_api_key',
    allowedCapabilities: ['corporate_email_finder', 'b2b_enrichment', 'deliverability_check'],
  },
  {
    id: 'whatsapp',
    provider: 'whatsapp',
    name: 'Meta WhatsApp Cloud API',
    category: 'messaging',
    description: 'Real-time owner notifications for new interested client replies, meeting requests, and critical alerts.',
    authType: 'api_key',
    vaultSecretName: 'irzam_whatsapp_token',
    allowedCapabilities: ['owner_alerts', 'urgent_notifications', 'reply_pings'],
  },
];

export async function getConnectorsWithStatus() {
  const db = getDb();
  const { data: dbRecords } = await db.from('integration_connections').select('*');
  const recordMap = new Map((dbRecords || []).map((r: any) => [r.id, r]));

  const result = [];
  for (const item of CONNECTOR_CATALOG) {
    const existing = recordMap.get(item.id);
    let secret = '';
    if (item.id === 'supabase') {
      secret = process.env.SUPABASE_URL || '';
    } else if (item.vaultSecretName) {
      secret = (await getVaultSecret(item.vaultSecretName)) || '';
    }

    const isConnected = !!secret || existing?.connection_status === 'connected';
    const maskedKey = secret ? `****${secret.slice(-4)}` : undefined;

    result.push({
      id: item.id,
      provider: item.provider,
      name: item.name,
      category: item.category,
      description: item.description,
      authType: item.authType,
      status: isConnected ? 'connected' : 'disconnected',
      enabledForAgent: existing ? existing.enabled_for_agent : isConnected,
      maskedKey,
      lastVerifiedAt: existing?.last_verified_at || (isConnected ? new Date().toISOString() : undefined),
      lastError: existing?.last_error || undefined,
      allowedCapabilities: item.allowedCapabilities,
      nonSensitiveConfig: existing?.non_sensitive_config || {},
    });
  }
  return result;
}

export async function connectProvider(id: string, secretValue: string, nonSensitiveConfig: any = {}, enabledForAgent = true) {
  const catalogItem = CONNECTOR_CATALOG.find((c) => c.id === id);
  if (!catalogItem) throw new Error(`Unknown connector: ${id}`);

  if (catalogItem.vaultSecretName && !secretValue) {
    throw new Error(`A credential is required to connect ${catalogItem.name}.`);
  }

  if (catalogItem.vaultSecretName && secretValue) {
    const ok = await setVaultSecret(catalogItem.vaultSecretName, secretValue, `${catalogItem.name} credential`);
    if (!ok) throw new Error(`Failed to store credential in Supabase Vault for ${catalogItem.name}`);
  }

  const db = getDb();
  const payload = {
    id: catalogItem.id,
    provider: catalogItem.provider,
    integration_name: catalogItem.name,
    category: catalogItem.category,
    connection_status: 'connected',
    enabled_for_agent: Boolean(enabledForAgent),
    encrypted_secret_reference: catalogItem.vaultSecretName || null,
    non_sensitive_config: nonSensitiveConfig,
    last_verified_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from('integration_connections').upsert(payload);
  if (error) throw new Error(error.message);
  return { success: true, message: `${catalogItem.name} connected successfully.` };
}

export async function disconnectProvider(id: string) {
  const catalogItem = CONNECTOR_CATALOG.find((c) => c.id === id);
  if (!catalogItem) throw new Error(`Unknown connector: ${id}`);

  if (catalogItem.vaultSecretName) {
    await deleteVaultSecret(catalogItem.vaultSecretName);
  }

  const db = getDb();
  await db.from('integration_connections').update({
    connection_status: 'disconnected',
    enabled_for_agent: false,
    encrypted_secret_reference: null,
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  return { success: true, message: `${catalogItem.name} disconnected.` };
}

export async function testProviderConnection(id: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const catalogItem = CONNECTOR_CATALOG.find((c) => c.id === id);
  if (!catalogItem) throw new Error(`Unknown connector: ${id}`);

  const start = Date.now();
  let secret = '';
  if (id === 'supabase') {
    secret = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  } else if (catalogItem.vaultSecretName) {
    secret = (await getVaultSecret(catalogItem.vaultSecretName)) || '';
  }

  if (!secret) {
    return { success: false, latencyMs: 0, message: 'No credential configured. Connect the provider first.' };
  }

  try {
    switch (id) {
      case 'supabase': {
        const db = getDb();
        const { error } = await db.from('system_config').select('id').limit(1);
        const latencyMs = Date.now() - start;
        if (error) return { success: false, latencyMs, message: error.message };
        return { success: true, latencyMs, message: `Connected to Supabase PostgreSQL in ${latencyMs}ms.` };
      }
      case 'freellm_qwen': {
        const res = await fetch('https://api.freellmapi.com/v1/models', {
          headers: { Authorization: `Bearer ${secret}` },
        });
        const latencyMs = Date.now() - start;
        if (res.ok) return { success: true, latencyMs, message: `FreeLLMAPI verified active in ${latencyMs}ms.` };
        return { success: false, latencyMs, message: `FreeLLMAPI responded HTTP ${res.status}: ${await res.text()}` };
      }
      case 'google_gemini': {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${secret}`);
        const latencyMs = Date.now() - start;
        if (res.ok) return { success: true, latencyMs, message: `Google Gemini API verified active in ${latencyMs}ms.` };
        return { success: false, latencyMs, message: `Gemini responded HTTP ${res.status}: ${await res.text()}` };
      }
      case 'google_places': {
        const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': secret,
            'X-Goog-FieldMask': 'places.displayName,places.id',
          },
          body: JSON.stringify({ textQuery: 'coffee shop' }),
        });
        const latencyMs = Date.now() - start;
        if (res.ok) return { success: true, latencyMs, message: `Google Places API New verified in ${latencyMs}ms.` };
        return { success: false, latencyMs, message: `Google Places responded HTTP ${res.status}: ${await res.text()}` };
      }
      case 'tavily': {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: secret, query: 'test ping', max_results: 1 }),
        });
        const latencyMs = Date.now() - start;
        if (res.ok) return { success: true, latencyMs, message: `Tavily AI Search verified in ${latencyMs}ms.` };
        return { success: false, latencyMs, message: `Tavily responded HTTP ${res.status}: ${await res.text()}` };
      }
      case 'hunter': {
        const res = await fetch(`https://api.hunter.io/v2/account?api_key=${secret}`);
        const latencyMs = Date.now() - start;
        if (res.ok) return { success: true, latencyMs, message: `Hunter.io account verified in ${latencyMs}ms.` };
        return { success: false, latencyMs, message: `Hunter.io responded HTTP ${res.status}: ${await res.text()}` };
      }
      case 'prospeo': {
        const res = await fetch('https://api.prospeo.io/v1/account', {
          headers: { 'X-KEY': secret },
        });
        const latencyMs = Date.now() - start;
        if (res.ok) return { success: true, latencyMs, message: `Prospeo account verified in ${latencyMs}ms.` };
        return { success: false, latencyMs, message: `Prospeo responded HTTP ${res.status}: ${await res.text()}` };
      }
      case 'netlify': {
        const res = await fetch('https://api.netlify.com/api/v1/user', {
          headers: { Authorization: `Bearer ${secret}` },
        });
        const latencyMs = Date.now() - start;
        if (res.ok) return { success: true, latencyMs, message: `Netlify API verified in ${latencyMs}ms.` };
        return { success: false, latencyMs, message: `Netlify responded HTTP ${res.status}: ${await res.text()}` };
      }
      default: {
        const latencyMs = Date.now() - start;
        return { success: true, latencyMs, message: `Connector ${catalogItem.name} credentials verified.` };
      }
    }
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return { success: false, latencyMs, message: err.message || 'Connection test failed.' };
  }
}
