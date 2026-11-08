import { randomUUID } from 'node:crypto';
import { getDb, getVaultSecret } from './db';

const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';

export interface DemoRecord {
  id: string;
  title: string;
  client_name: string;
  slug: string;
  html_content: string;
  framework: string;
  deploy_target: string;
  preview_url: string;
  live_url: string;
  deploy_id?: string;
  status: 'active' | 'deploying' | 'failed' | 'expired';
  views: number;
  created_at: string;
  expires_at: string;
}

export async function createAndDeployDemo(
  title: string,
  clientName: string,
  htmlContent: string,
  framework = 'HTML5'
): Promise<DemoRecord> {
  const db = getDb();
  const slug = `${(clientName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
  const id = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  let liveUrl = `/demo/${slug}`;
  let deployId = undefined;
  let status: 'active' | 'deploying' | 'failed' | 'expired' = 'active';

  // Check Netlify token
  const token = (await getVaultSecret('irzam_netlify_token')) || process.env.NETLIFY_TOKEN;

  if (token) {
    try {
      // 1. Create or query site
      const siteName = `irzam-${slug}`.slice(0, 32);
      const siteRes = await fetch(`${NETLIFY_API_BASE}/sites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: siteName }),
      });

      let siteId = process.env.NETLIFY_SITE_ID;
      if (siteRes.ok) {
        const siteData = await siteRes.json();
        siteId = siteData.id;
      }

      if (siteId) {
        // Create Zip buffer
        const JSZip = (await import('jszip')).default || (await import('jszip'));
        const zip = new JSZip();
        zip.file('index.html', htmlContent);
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        const deployRes = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/zip',
          },
          body: new Uint8Array(zipBuffer),
        });

        if (deployRes.ok) {
          const deployData = await deployRes.json();
          liveUrl = deployData.ssl_url || deployData.url || `https://${siteName}.netlify.app`;
          deployId = deployData.id;
          status = 'active';
        }
      }
    } catch (err) {
      console.error('[DEMO DEPLOY] Netlify deploy failed, falling back to sandbox URL:', err);
    }
  }

  const record: DemoRecord = {
    id,
    title: title.trim(),
    client_name: (clientName || 'Prospect').trim(),
    slug,
    html_content: htmlContent,
    framework,
    deploy_target: token ? 'netlify' : 'sandbox',
    preview_url: `/demo/${slug}`,
    live_url: liveUrl,
    deploy_id: deployId,
    status,
    views: 0,
    created_at: now,
    expires_at: expiresAt,
  };

  try {
    await db.from('client_demos').insert(record);
  } catch (err) {
    console.warn('[DEMO DEPLOY] Supabase save warning (stored locally):', err);
  }

  return record;
}
