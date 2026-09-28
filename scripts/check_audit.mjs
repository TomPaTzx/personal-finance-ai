import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://neflzvrowmjkgixaejzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', 'CURRENT_SOT')
    .single();

  const auditEvents = data?.data?.auditEvents || [];
  console.log('Total audit events:', auditEvents.length);
  auditEvents.forEach((ev, i) => {
    console.log(`[${i}] ${ev.timestamp} | ${ev.action} | ${ev.actor} | details:`, JSON.stringify(ev.details || {}));
  });
}

check();
