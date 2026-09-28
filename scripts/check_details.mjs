import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://neflzvrowmjkgixaejzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('app_state')
    .select('data, updated_at')
    .eq('id', 'CURRENT_SOT')
    .single();

  if (error) {
    console.error('Error fetching Supabase:', error);
    return;
  }
  const payload = data.data || {};
  console.log('BNPL Items count:', payload.bnplItems?.length);
  console.log('BNPL Items:', JSON.stringify(payload.bnplItems, null, 2));
  console.log('Debts count:', payload.debts?.length);
  console.log('Family settlements:', JSON.stringify(payload.familySettlements, null, 2));
  console.log('Audit events count:', payload.auditEvents?.length);
}

check();
