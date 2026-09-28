import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://neflzvrowmjkgixaejzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateChicken() {
  console.log('Fetching CURRENT_SOT from Supabase...');
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', 'CURRENT_SOT')
    .single();

  if (error || !data) {
    console.error('Fetch error:', error);
    return;
  }

  const current = data.data;
  let updatedBnpl = (current.bnplItems || []).map(item => {
    if (item.amount === 303 || item.title.includes('เดชา') || item.title.includes('ไก่ทอดเดชา')) {
      console.log(`Found item to update: ${item.title} (฿${item.amount})`);
      return {
        ...item,
        title: 'ไก่ทอดแมค สูตรสไปซี่',
        category: 'FOOD',
        note: 'McDonald’s ไก่ทอดแมค สไปซี่'
      };
    }
    return item;
  });

  const updatedSOT = {
    ...current,
    bnplItems: updatedBnpl,
    updatedAt: new Date().toISOString()
  };

  const now = new Date().toISOString();
  await supabase
    .from('app_state')
    .upsert({ id: 'CURRENT_SOT', data: updatedSOT, updated_at: now });

  await supabase
    .from('app_state')
    .upsert({ id: 'SOT_2026-09', data: updatedSOT, updated_at: now });

  console.log('✅ Supabase Cloud updated successfully with McDonald\'s Chicken item!');
}

updateChicken();
