import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://neflzvrowmjkgixaejzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updatePizza() {
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
    if (item.amount === 585 || item.title.includes('เสื้อปาดไหล่')) {
      console.log(`Found item to update: ${item.title} (฿${item.amount})`);
      return {
        ...item,
        title: '1 ฟรี 1 พิซซ่าขอบเอ็กซ์ตรีม ถาดใหญ่ (L) หมวดเดอลุกซ์',
        category: 'FOOD',
        note: 'The Pizza Company 1 ฟรี 1'
      };
    }
    if (item.title.includes('ผ้าอ้อมกายน้ำ')) {
      return {
        ...item,
        title: '*พร้อมส่ง* ผ้าอ้อมว่ายน้ำ Sandybaobao'
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

  console.log('✅ Supabase Cloud updated successfully with Pizza item!');
}

updatePizza();
