import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://neflzvrowmjkgixaejzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanAndRestore() {
  console.log('Fetching CURRENT_SOT from Supabase...');
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', 'CURRENT_SOT')
    .single();

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  const current = data.data;
  console.log('Current accounts count:', current.accounts?.length);

  // 1. Current September Clean BNPL Items (Tepthai + Saker Spray)
  const cleanBnplItems = [
    {
      id: 'BNPL-01',
      title: 'ยาสีฟันเทพไทย (Tepthai Toothpaste)',
      itemName: 'ยาสีฟันเทพไทย (Tepthai Toothpaste)',
      amount: 280,
      category: 'LIFESTYLE',
      owner: 'ตัวเอง',
      isPaidBack: false,
      totalInstallments: 1,
      remainingInstallments: 1,
      monthlyPayment: 280,
      remainingAmount: 280,
      payerType: 'WE_PAY',
      status: 'ACTIVE',
      startDate: '2026-09-25T00:00:00.000Z',
      note: 'ออเดอร์ Shopee ประจำรอบ ก.ย.'
    },
    {
      id: 'BNPL-02',
      title: 'สเปรย์แอลกอฮอล์ Saker (น้องพีเจ)',
      itemName: 'สเปรย์แอลกอฮอล์ Saker (น้องพีเจ)',
      amount: 650,
      category: 'KIDS',
      owner: 'น้องพีเจ',
      isPaidBack: false,
      totalInstallments: 1,
      remainingInstallments: 1,
      monthlyPayment: 650,
      remainingAmount: 650,
      payerType: 'THEY_PAY',
      status: 'ACTIVE',
      startDate: '2026-09-25T00:00:00.000Z',
      note: 'ของใช้น้องพีเจ แจงฝากซื้อผ่าน Shopee'
    }
  ];

  // 2. Family Settlements (Update Jaeng to reflect September Saker Spray)
  const updatedFamilySettlements = (current.familySettlements || []).map(person => {
    if (person.id === 'PERSON-JAENG') {
      return {
        ...person,
        note: 'แจงโอนคืนเราสุทธิ ฿2,200.00 (ช่วยค่าไฟ ฿2,000 + สเปรย์ Saker น้องพีเจ ฿650 - ของใช้ ฿450)',
        items: [
          {
            id: 'J-ELEC',
            title: '⚡ แจงช่วยออกค่าไฟบ้าน (ประจำเดือน)',
            amount: 2000,
            type: 'THEY_OWE',
            status: 'PENDING',
            note: 'แจงช่วยสมทบค่าไฟบ้านเดือนละ ฿2,000 หักลบในบ้าน'
          },
          {
            id: 'SYNC-BNPL-02',
            title: 'สเปรย์แอลกอฮอล์ Saker (น้องพีเจ)',
            amount: 650,
            type: 'THEY_OWE',
            status: 'PENDING',
            note: 'ของใช้น้องพีเจ แจงฝากกด Shopee SPayLater',
            linkedSourceId: 'BNPL-02'
          },
          {
            id: 'J-4',
            title: 'ค่าของใช้ในห้อง/ซูเปอร์มาร์เก็ต (แจงจ่าย)',
            amount: 450,
            type: 'WE_OWE',
            status: 'PENDING',
            note: 'หารครึ่ง'
          }
        ]
      };
    }
    return person;
  });

  const nextState = {
    ...current,
    bnplItems: cleanBnplItems,
    familySettlements: updatedFamilySettlements,
    spayStatementCycle: 'รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค.)'
  };

  console.log('Pushing cleaned SOT to Supabase...');
  const { error: updateError } = await supabase
    .from('app_state')
    .upsert({
      id: 'CURRENT_SOT',
      data: nextState,
      updated_at: new Date().toISOString()
    });

  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('✅ Successfully updated Supabase Cloud with clean September BNPL data!');
  }
}

cleanAndRestore();
