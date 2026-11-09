import { randomUUID } from 'node:crypto';
import { getDb, getVaultSecret } from './db';

type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; name?: string; tool_call_id?: string; tool_calls?: any[] };
type ToolEvent = (type: 'thinking' | 'tool_start' | 'tool_result' | 'error' | 'complete', message: string, payload?: Record<string, any>) => void;

const MAX_TOOL_ITERATIONS = 8;

const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_businesses_google_places',
      description: 'Search genuine Google business listings by category and city. Use when user wants to find companies or local prospects. This is read-only.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Business type and city/region, e.g. dentists in Austin TX' },
          min_reviews: { type: 'integer', description: 'Minimum Google review count, default 50' },
          min_rating: { type: 'number', description: 'Minimum Google star rating, default 4.0' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'research_business_web',
      description: 'Research a business official website, contact pages and publicly listed leadership with Tavily. Read-only.',
      parameters: {
        type: 'object',
        properties: {
          business_name: { type: 'string' },
          city: { type: 'string' },
          domain: { type: 'string' },
        },
        required: ['business_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_email_hunter',
      description: 'Find a corporate email from a company domain and verify it using Hunter. Always distinguish verified from unverified.',
      parameters: {
        type: 'object',
        properties: { domain: { type: 'string' } },
        required: ['domain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_email_prospeo',
      description: 'Find and verify a named business contact email using Prospeo.',
      parameters: {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          domain: { type: 'string' },
        },
        required: ['first_name', 'last_name', 'domain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'discover_and_save_leads',
      description: 'Find businesses on Google Places, enrich website domains with Hunter/Prospeo, verify email addresses, and save authentic businesses to the Irzam Studio leads database. Use when the user asks to find, discover, collect, or save leads.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Business type and target city/region' },
          city: { type: 'string' },
          niche: { type: 'string' },
          min_reviews: { type: 'integer' },
          min_rating: { type: 'number' },
          max_records: { type: 'integer', description: 'Maximum 20 businesses per request; default 10' },
        },
        required: ['query'],
      },
    },
  },
];

async function secret(name: string, envName: string): Promise<string> {
  return (await getVaultSecret(name)) || process.env[envName] || '';
}

function toDomain(website: string): string {
  try {
    const parsed = new URL(website.startsWith('http') ? website : `https://${website}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function googlePlacesSearch(query: string, minReviews = 50, minRating = 4) {
  const key = await secret('irzam_google_maps_api_key', 'GOOGLE_MAPS_API_KEY');
  if (!key) throw new Error('Google Places connector is not configured.');
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.businessStatus',
    },
    body: JSON.stringify({ textQuery: query, pageSize: 20, minRating }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Google Places returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json() as any;
  return (payload.places || [])
    .filter((place: any) => (!place.businessStatus || place.businessStatus === 'OPERATIONAL'))
    .filter((place: any) => Number(place.userRatingCount || 0) >= minReviews)
    .filter((place: any) => Number(place.rating || 0) >= minRating)
    .map((place: any) => ({
      place_id: place.id,
      business_name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      rating: Number(place.rating || 0),
      review_count: Number(place.userRatingCount || 0),
      phone: place.nationalPhoneNumber || '',
      website: place.websiteUri || '',
      has_website: Boolean(place.websiteUri),
    }))
    .filter((place: any) => place.business_name);
}

async function tavilyResearch(businessName: string, city = '', domain = '') {
  const key = await secret('irzam_tavily_api_key', 'TAVILY_API_KEY');
  if (!key) throw new Error('Tavily connector is not configured.');
  const query = `${businessName} ${city} official website contact leadership${domain ? ` site:${domain}` : ''}`.trim();
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, query, search_depth: 'advanced', include_answer: true, max_results: 5 }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Tavily returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const data = await response.json() as any;
  return {
    answer: data.answer || '',
    sources: (data.results || []).map((result: any) => result.url).filter(Boolean),
    snippets: (data.results || []).slice(0, 3).map((result: any) => result.content).filter(Boolean),
  };
}

async function hunterFindEmail(domain: string) {
  const key = await secret('irzam_hunter_api_key', 'HUNTER_API_KEY');
  if (!key) throw new Error('Hunter.io connector is not configured.');
  const searchUrl = new URL('https://api.hunter.io/v2/domain-search');
  searchUrl.searchParams.set('domain', domain);
  searchUrl.searchParams.set('limit', '10');
  searchUrl.searchParams.set('api_key', key);
  const searchResponse = await fetch(searchUrl, { signal: AbortSignal.timeout(25000) });
  if (!searchResponse.ok) throw new Error(`Hunter domain search returned HTTP ${searchResponse.status}.`);
  const emails = ((await searchResponse.json() as any).data?.emails || []) as any[];
  if (!emails.length) return { success: false, email: null, verification_status: 'not_found', source: 'hunter_io' };
  const candidate = [...emails].sort((a, b) =>
    Number(Boolean(b.first_name && b.last_name)) - Number(Boolean(a.first_name && a.last_name)) ||
    Number(b.confidence || 0) - Number(a.confidence || 0)
  )[0];
  const email = String(candidate.value || '').trim().toLowerCase();
  if (!email) return { success: false, email: null, verification_status: 'not_found', source: 'hunter_io' };
  const verifyUrl = new URL('https://api.hunter.io/v2/email-verifier');
  verifyUrl.searchParams.set('email', email);
  verifyUrl.searchParams.set('api_key', key);
  const verifyResponse = await fetch(verifyUrl, { signal: AbortSignal.timeout(25000) });
  if (!verifyResponse.ok) {
    return {
      success: false, email, source: 'hunter_io',
      first_name: candidate.first_name || '', last_name: candidate.last_name || '',
      verification_status: 'unverified',
    };
  }
  const verified = await verifyResponse.json() as any;
  const status = String(verified.data?.status || 'unknown').toLowerCase();
  return {
    success: true,
    email,
    source: 'hunter_io',
    first_name: candidate.first_name || '',
    last_name: candidate.last_name || '',
    position: candidate.position || '',
    confidence: verified.data?.score ?? candidate.confidence ?? 0,
    verification_status: status === 'valid' ? 'verified' : 'unverified',
    verification_detail: status,
  };
}

async function prospeoFindEmail(firstName: string, lastName: string, domain: string) {
  const key = await secret('irzam_prospeo_api_key', 'PROSPEO_API_KEY');
  if (!key) throw new Error('Prospeo connector is not configured.');
  const response = await fetch('https://api.prospeo.io/v1/email-finder', {
    method: 'POST',
    headers: { 'X-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name: firstName, last_name: lastName, domain }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`Prospeo returned HTTP ${response.status}.`);
  const data = await response.json() as any;
  const email = String(data.response?.email || '').trim().toLowerCase();
  const status = String(data.response?.email_status || 'unknown').toLowerCase();
  return {
    success: Boolean(email),
    email: email || null,
    source: 'prospeo',
    verification_status: email && status === 'verified' ? 'verified' : 'unverified',
    verification_detail: status,
  };
}

async function discoverAndSaveLeads(args: any) {
  const query = String(args.query || '').trim();
  if (!query) throw new Error('Specify a target business type and city.');
  const limit = Math.min(20, Math.max(1, Number(args.max_records) || 10));
  const places = await googlePlacesSearch(query, Number(args.min_reviews ?? 50), Number(args.min_rating ?? 4));
  const db = getDb();
  let saved = 0;
  let verifiedCount = 0;
  let processed = 0;

  for (const place of places.slice(0, limit)) {
    processed++;
    const domain = toDomain(place.website);
    let emailResult: any = null;
    if (domain) {
      try {
        const hunterKey = await secret('irzam_hunter_api_key', 'HUNTER_API_KEY');
        if (hunterKey) {
          emailResult = await hunterFindEmail(domain);
          if (emailResult.verification_status !== 'verified' && emailResult.first_name && emailResult.last_name) {
            const fallbackKey = await secret('irzam_prospeo_api_key', 'PROSPEO_API_KEY');
            if (fallbackKey) {
              const fallback = await prospeoFindEmail(emailResult.first_name, emailResult.last_name, domain);
              if (fallback.verification_status === 'verified') emailResult = fallback;
            }
          }
        }
      } catch {
        emailResult = null;
      }
    }

    const { data: existingRows, error: existingError } = await db
      .from('leads')
      .select('id,email,email_verified,email_source,status,last_contacted_at')
      .eq('google_place_id', place.place_id)
      .limit(1);
    if (existingError) throw new Error(`Lead deduplication check failed: ${existingError.message}`);
    const existing = (existingRows || [])[0];
    const isNewVerified = emailResult?.verification_status === 'verified' && Boolean(emailResult.email);
    const keepExistingVerified = existing?.email_verified === true && Boolean(existing.email);
    const emailVerified = keepExistingVerified || isNewVerified;
    const { error: saveError } = await db.from('leads').upsert({
      business_name: place.business_name,
      email: keepExistingVerified ? existing.email : (isNewVerified ? emailResult.email : null),
      phone: place.phone || null,
      city: args.city || null,
      niche: args.niche || null,
      status: existing?.status || 'pending',
      google_place_id: place.place_id,
      google_rating: place.rating,
      google_reviews_count: place.review_count,
      website: place.website || null,
      email_source: keepExistingVerified ? existing.email_source : (isNewVerified ? emailResult.source : null),
      email_verified: emailVerified,
      last_contacted_at: existing?.last_contacted_at || null,
      notes: `Google Places discovery. Address: ${place.address}. Email: ${emailVerified ? 'provider verified' : 'not verified'}.`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'google_place_id' });
    if (saveError) throw new Error(`Lead save failed: ${saveError.message}`);
    saved++;
    if (emailVerified) verifiedCount++;
  }

  return {
    success: true,
    query,
    businesses_found: places.length,
    businesses_processed: processed,
    leads_saved_or_updated: saved,
    verified_emails: verifiedCount,
    unverified_emails_not_marked_sendable: processed - verifiedCount,
    note: 'Only real Google Places businesses are stored. No email address is generated or guessed; only provider-verified contacts are marked sendable.',
  };
}

async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'search_businesses_google_places':
      return googlePlacesSearch(String(args.query || ''), Number(args.min_reviews ?? 50), Number(args.min_rating ?? 4));
    case 'research_business_web':
      return tavilyResearch(String(args.business_name || ''), String(args.city || ''), String(args.domain || ''));
    case 'find_email_hunter':
      return hunterFindEmail(String(args.domain || ''));
    case 'find_email_prospeo':
      return prospeoFindEmail(String(args.first_name || ''), String(args.last_name || ''), String(args.domain || ''));
    case 'discover_and_save_leads':
      return discoverAndSaveLeads(args);
    default:
      throw new Error(`Tool ${name} is not allowed.`);
  }
}

function safeJson(value: any): string {
  try {
    return JSON.stringify(value, (_key, item) => typeof item === 'string' ? item.slice(0, 2000) : item).slice(0, 12000);
  } catch {
    return '"Tool returned a non-serializable result."';
  }
}

function parseToolArguments(value: any): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return {};
}

export async function runAgentChat(
  message: string,
  history: Array<{ role?: string; content?: string }> = [],
  requestedModel?: string,
  systemPrompt = 'You are Irzam Studio, an autonomous business assistant.'
    + ' Use the registered tools for real-world lead searches, business research and contact verification.'
    + ' When a user asks to find or save leads, use discover_and_save_leads.'
    + ' Never invent companies, websites, contact names, phone numbers or email addresses.'
    + ' Do not send emails, run follow-ups, deploy websites, or change outreach status through tools.'
    + ' Only provider-verified emails can be described as verified or sendable.'
    + ' State clearly when a connector is not configured.',
  onEvent?: ToolEvent,
): Promise<{ content: string; model: string; toolsUsed: string[]; taskId?: string }> {
  if (!message.trim()) throw new Error('Message is required.');
  const apiKey = await secret('irzam_freellmapi_key', 'FREELLM_API_KEY');
  if (!apiKey) throw new Error('FreeLLMAPI Qwen key is not configured in Supabase Vault.');
  const base = (process.env.FREELLM_BASE_URL || 'https://api.freellmapi.com/v1').replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  const model = process.env.QWEN_MODEL || requestedModel || 'qwen-max';
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${systemPrompt}

AUTONOMOUS TOOL POLICY:
- Use search_businesses_google_places when current, real business listings are required.
- Use research_business_web when official website/contact/leadership facts are needed.
- Use find_email_hunter or find_email_prospeo for a requested company-domain contact.
- Use discover_and_save_leads when asked to find, collect, or save leads; it stores only genuine Google Places businesses and marks an email sendable only after provider verification.
- Never invent email addresses, business records, or contact names.
- You may use only the listed tools. Do not send email, perform follow-ups, change outreach status, or deploy websites with tools.
- If the user asks for an action outside the available tools, explain the limitation clearly.
`,
    },
    ...history.filter(item => (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .slice(-12).map(item => ({ role: item.role as 'user' | 'assistant', content: String(item.content).slice(0, 12000) })),
    { role: 'user', content: message.slice(0, 12000) },
  ];
  const toolsUsed: string[] = [];
  const taskId = `task-${randomUUID()}`;
  let taskPersisted = false;
  let taskDb: ReturnType<typeof getDb> | null = null;
  let modelReturned = model;

  const persistTask = async () => {
    if (taskPersisted) return;
    try {
      taskDb = getDb();
      const { error } = await taskDb.from('agent_tasks').insert({
        id: taskId,
        goal: message.slice(0, 4000),
        workflow_type: 'interactive_chat',
        status: 'running',
        state: { provider: 'freellm_qwen', model },
        checkpoint: { tools_used: [] },
      });
      if (error) throw error;
      taskPersisted = true;
    } catch (error: any) {
      taskDb = null;
      onEvent?.('error', 'Could not persist interactive agent task.', { message: String(error?.message || error).slice(0, 300) });
    }
  };

  const recordEvent = async (eventType: string, eventMessage: string, payload: Record<string, any> = {}) => {
    if (!taskPersisted || !taskDb) return;
    try {
      await taskDb.from('agent_task_events').insert({
        task_id: taskId,
        event_type: eventType,
        message: eventMessage,
        payload,
      });
    } catch {}
  };

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    onEvent?.('thinking', `Irzam Studio is reasoning (step ${iteration + 1}).`, { iteration: iteration + 1 });
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 4096,
        stream: false,
      }),
      signal: AbortSignal.timeout(process.env.IRZAM_NETLIFY_FUNCTION ? 55000 : 90000),
    });
    if (!response.ok) throw new Error(`FreeLLMAPI returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
    const data = await response.json() as any;
    const choice = data.choices?.[0];
    if (!choice?.message) throw new Error('FreeLLMAPI returned no assistant message.');
    modelReturned = String(data.model || model);
    const assistantMessage = choice.message;
    let calls: any[] = Array.isArray(assistantMessage.tool_calls) ? assistantMessage.tool_calls : [];
    if (!calls.length && assistantMessage.function_call) {
      calls = [{ id: `legacy-${iteration}`, type: 'function', function: assistantMessage.function_call }];
    }

    if (calls.length) {
      const normalizedCalls = calls.map((call: any, index: number) => ({
        id: String(call.id || `tool-${iteration}-${index}`),
        type: 'function',
        function: {
          name: String(call.function?.name || ''),
          arguments: typeof call.function?.arguments === 'string'
            ? call.function.arguments
            : JSON.stringify(call.function?.arguments || {}),
        },
      }));
      messages.push({
        role: 'assistant',
        content: String(assistantMessage.content || ''),
        tool_calls: normalizedCalls,
      });
      for (const call of normalizedCalls) {
        const name = call.function.name;
        const args = parseToolArguments(call.function.arguments);
        await persistTask();
        onEvent?.('tool_start', `Running ${name || 'requested tool'}.`, { tool: name });
        await recordEvent('tool_start', `Running ${name || 'requested tool'}.`, { tool: name });
        let output: any;
        try {
          output = await executeTool(name, args);
          toolsUsed.push(name);
          onEvent?.('tool_result', `${name} completed.`, { tool: name });
          await recordEvent('tool_result', `${name} completed.`, { tool: name });
        } catch (error: any) {
          output = { success: false, error: String(error?.message || error).slice(0, 1000) };
          onEvent?.('error', `${name || 'Tool'} failed.`, { tool: name });
          await recordEvent('error', `${name || 'Tool'} failed.`, { tool: name });
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name,
          content: safeJson(output),
        });
      }
      if (taskPersisted) {
        await recordEvent('checkpoint', `Completed tool iteration ${iteration + 1}.`, {
          iteration: iteration + 1,
          tools_used: toolsUsed.slice(-8),
        });
      }
      continue;
    }

    const value = assistantMessage.content;
    const content = typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.map((part: any) => part?.text || '').join('')
        : '';
    if (!content.trim()) throw new Error('Qwen returned neither a tool call nor a final response.');
    if (taskPersisted && taskDb) {
      try {
        await taskDb.from('agent_tasks').update({
          status: 'completed',
          state: { provider: 'freellm_qwen', model: modelReturned, last_answer: content.slice(0, 8000) },
          checkpoint: { iterations: iteration + 1, tools_used: toolsUsed },
          updated_at: new Date().toISOString(),
        }).eq('id', taskId);
        await recordEvent('complete', 'Interactive agent task completed.', { tools_used: toolsUsed });
      } catch {}
    }
    onEvent?.('complete', 'Irzam Studio finished the task.', { tools_used: toolsUsed });
    return { content, model: modelReturned, toolsUsed, taskId: taskPersisted ? taskId : undefined };
  }

  const pausedContent = 'I have reached the safe tool-use limit for this request. Please narrow the task or ask me to continue with the remaining businesses.';
  if (taskPersisted && taskDb) {
    try {
      await taskDb.from('agent_tasks').update({
        status: 'paused',
        checkpoint: { iterations: MAX_TOOL_ITERATIONS, tools_used: toolsUsed, reason: 'max_iterations_reached' },
        updated_at: new Date().toISOString(),
      }).eq('id', taskId);
      await recordEvent('status_change', 'Agent paused after reaching the tool-use limit.', { tools_used: toolsUsed });
    } catch {}
  }
  return { content: pausedContent, model: modelReturned, toolsUsed, taskId: taskPersisted ? taskId : undefined };
}
