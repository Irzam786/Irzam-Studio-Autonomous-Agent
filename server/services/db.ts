import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let clientInstance: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (clientInstance) return clientInstance;
  const url = process.env.SUPABASE_URL || 'https://fgksgytuglpmzhqcdasb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server database operations.');
  }
  clientInstance = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return clientInstance;
}

export async function getVaultSecret(name: string): Promise<string | null> {
  const db = getDb();
  try {
    const { data, error } = await db.rpc('get_irzam_secret', { secret_name: name });
    if (error || typeof data !== 'string' || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setVaultSecret(name: string, value: string, description = ''): Promise<boolean> {
  const db = getDb();
  try {
    const { error } = await db.rpc('set_irzam_secret', {
      secret_name: name,
      secret_value: value,
      secret_description: description,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteVaultSecret(name: string): Promise<boolean> {
  const db = getDb();
  try {
    const { error } = await db.rpc('delete_irzam_secret', { secret_name: name });
    return !error;
  } catch {
    return false;
  }
}
