import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const schedules = [
  {
    schedule_key: 'agent_wake_cycle',
    workflow_type: 'agent_wake_cycle',
    enabled: true,
    interval_minutes: 30,
    timezone: 'Asia/Karachi',
    settings: { description: 'Autonomous worker wake cycle' }
  },
  {
    schedule_key: 'inbox_watcher_hourly',
    workflow_type: 'inbox_watcher_hourly',
    enabled: true,
    interval_minutes: 60,
    timezone: 'Asia/Karachi',
    settings: { description: 'Hourly Gmail inbox sync and reply parser' }
  },
  {
    schedule_key: 'daily_lead_discovery',
    workflow_type: 'daily_lead_discovery',
    enabled: true,
    interval_minutes: 1440,
    timezone: 'Asia/Karachi',
    settings: { target_time_pkt: '17:00', daily_target: 10, min_reviews: 50 }
  },
  {
    schedule_key: 'outreach_slot_dispatch',
    workflow_type: 'outreach_slot_dispatch',
    enabled: true,
    interval_minutes: 30,
    timezone: 'Asia/Karachi',
    settings: { slots_pkt: ['18:00', '18:30', '19:00', '19:30'] }
  },
  {
    schedule_key: 'followup_processor',
    workflow_type: 'followup_processor',
    enabled: true,
    interval_minutes: 120,
    timezone: 'Asia/Karachi',
    settings: { max_attempts: 2, days_between: 3 }
  },
  {
    schedule_key: 'daily_report',
    workflow_type: 'daily_report',
    enabled: true,
    interval_minutes: 1440,
    timezone: 'Asia/Karachi',
    settings: { target_time_pkt: '22:00' }
  },
  {
    schedule_key: 'memory_maintenance',
    workflow_type: 'memory_maintenance',
    enabled: true,
    interval_minutes: 720,
    timezone: 'Asia/Karachi',
    settings: { compact_threshold_turns: 40 }
  }
];

async function run() {
  for (const s of schedules) {
    const { data: existing } = await client
      .from('agent_schedules')
      .select('id')
      .eq('schedule_key', s.schedule_key)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await client
        .from('agent_schedules')
        .update({
          enabled: s.enabled,
          interval_minutes: s.interval_minutes,
          timezone: s.timezone,
          settings: s.settings,
          updated_at: new Date().toISOString()
        })
        .eq('schedule_key', s.schedule_key);
      if (error) console.error(`Error updating ${s.schedule_key}:`, error);
      else console.log(`Updated schedule: ${s.schedule_key}`);
    } else {
      const { error } = await client.from('agent_schedules').insert([s]);
      if (error) console.error(`Error inserting ${s.schedule_key}:`, error);
      else console.log(`Inserted schedule: ${s.schedule_key}`);
    }
  }
  console.log('Finished seeding agent_schedules.');
}

run().catch(console.error);
