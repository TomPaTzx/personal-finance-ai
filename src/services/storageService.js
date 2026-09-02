// Storage Service - Safe Non-Destructive Persistent Storage with Supabase Cloud Sync
import { supabase } from './supabaseClient';

const SOT_STORAGE_KEY = 'PERSONAL_FINANCE_SOT_V2';
const CLOUD_RECORD_ID = 'CURRENT_SOT';

export const INITIAL_DATA = {
  accounts: [
    {
      id: 'KTB-SALARY',
      name: 'เงินเดือนชลประทานวิทยา',
      bank: 'กรุงไทย (KTB)',
      category: 'SALARY',
      purpose: 'รับเงินเดือนฐานสุทธิ ฿17,993.32 (หักสะสม 3% ฿562.68 + งานศพ ฿200) + โอเย็น/เสาร์',
      balance: 17993.32,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'KBANK-MAIN',
      name: 'กระเป๋า 1: กระเป๋าหลัก',
      bank: 'กสิกร (MAKE)',
      category: 'MAIN_HUB',
      purpose: 'กระเป๋าหลักพักเงินไว้สำหรับกระจายรายจ่าย',
      balance: 4500,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'KBANK-FOOD',
      name: 'กระเป๋า 2: ค่ากินแซ่บ แซลมอน & บุฟเฟต์คลายเครียด',
      bank: 'กสิกร (MAKE)',
      category: 'FOOD_CRAVING',
      purpose: 'งบแซลมอน บุฟเฟต์ Shinkanzen โลตัสติวานนท์ & สังสรรค์บำรุงสุขภาพจิต (รางวัลเลิกบุหรี่เพื่อลูก)',
      balance: 3000,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'KBANK-SNACK',
      name: 'กระเป๋า 2.1: เติมบัตรโรงเรียน/ขนมจุบจิบ',
      bank: 'กสิกร (MAKE)',
      category: 'ALLOWANCE_LUMP',
      purpose: 'เหมาจ่ายเติมบัตรชลประทานวิทยา (ไอติม ไก่ทอด ขนม) สัปดาห์ละ 300-500 ไม่ต้องจดย่อย',
      balance: 1200,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'KBANK-HOME',
      name: 'กระเป๋า 3: บ้าน แม่ พี่แพร',
      bank: 'กสิกร (MAKE)',
      category: 'FAMILY_HOME',
      purpose: 'ค่าน้ำ ค่าไฟ ค่ากับข้าวแม่ ค่า Coway จ่ายคืนแม่ (บิลจริง ฿8,783.29)',
      balance: 8785,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'KBANK-EMERG',
      name: 'กระเป๋า 4: โมโหฉุกเฉิน / สำรองปิดเทอม',
      bank: 'กสิกร (MAKE)',
      category: 'EMERGENCY',
      purpose: 'เงินสำรองฉุกเฉิน & กองทุนสำรองปิดเทอม (เป้าหมาย ฿15,000 ทยอยเก็บจากโอเย็น)',
      balance: 0,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'KBANK-DEBIT',
      name: 'เดบิตออนไลน์ & สแกนชีวิตประจำวัน',
      bank: 'กสิกร (KBank)',
      category: 'DAILY_SCAN',
      purpose: 'สแกนซื้อของทั่วไป + จุดรับเงินโอนจาก TrueMoney (เงินสดโอเย็น/เสาร์)',
      balance: 2000,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'KBANK-SPAY',
      name: 'กันเงินจ่าย Shopee SPayLater',
      bank: 'กสิกร (KBank)',
      category: 'SINKING_FUND',
      purpose: 'พักเงินไว้จ่ายบิล SPayLater (บิลรอบนี้ ฿13,639.22 ครบกำหนด 10 ส.ค.)',
      balance: 13640,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'SCB-EXTRA',
      name: 'บัญชีเดิม Foodpanda / เงินพิเศษ',
      bank: 'ไทยพาณิชย์ (SCB)',
      category: 'EXTRA_INCOME',
      purpose: 'ฝากเงินสดจากเงินพิเศษเข้า หรือรายได้เสริมนอกรอบ',
      balance: 1500,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'TRUEMONEY',
      name: 'TrueMoney Wallet',
      bank: 'TrueMoney',
      category: 'E_WALLET',
      purpose: 'ซื้อของ 7-Eleven หรือพักเงินสดพิเศษโอเย็น/เสาร์',
      balance: 500,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'UOB-TMRW',
      name: 'UOB TMRW & บัตรผ่อนของ',
      bank: 'UOB',
      category: 'DEBT_FACILITY',
      purpose: 'บัญชีเงินฝาก + บัตรกดเงินสด (รับเงินโอนจากพี่แพร ฿663.89 ไว้ตัดค่างวดแท็บเล็ต)',
      balance: 1000,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'KEPT-PJ',
      name: 'Kept บัญชีเพื่อลูกชาย (น้องพีเจ) [แจงถือ]',
      bank: 'Kept (Krungsri)',
      category: 'COUPLE_SAVINGS',
      purpose: 'บัญชีเงินออมดอกเบี้ยสูงเพื่ออนาคตน้องพีเจ (แจงเป็นคนถือบัญชี)',
      balance: 25000,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'SPAYLATER',
      name: 'วงเงิน Shopee SPayLater',
      bank: 'ShopeePay',
      category: 'CREDIT_LINE',
      purpose: 'วงเงินผ่อนของ ฿100,000 (บิลรอบนี้ ฿13,639.22 ครบกำหนด 10 ส.ค.)',
      balance: 68500,
      creditLimit: 100000,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'PAOTANG',
      name: 'เป๋าตัง (ไทยช่วยไทย 60/40)',
      bank: 'เป๋าตัง (KTB)',
      category: 'GOV_PROGRAM',
      purpose: 'ใช้สิทธิ์ตามโปรที่รัฐแจกเงิน (ไทยช่วยไทย 60/40)',
      balance: 800,
      currency: 'THB',
      updatedAt: new Date().toISOString()
    }
  ],
  subscriptions: [
    {
      id: 'SUB-YT',
      name: 'YouTube Premium (Family Plan)',
      fullAmount: 399,
      ourShareAmount: 64.00,
      sharingType: 'FAMILY_SHARE',
      shareMembersCount: 6,
      partnerOrMembers: 'เก็บคนละ ฿67 x 5 คน (+฿335) เราจ่ายจริง ฿64',
      paymentMethod: 'Shopee SPayLater / กสิกรเดบิต',
      category: 'ENTERTAINMENT',
      status: 'ACTIVE',
      nextBillingDate: '2026-09-05',
      note: 'ตัดผ่าน SPayLater หรือ กสิกรเดบิต เก็บเงินคนในตี้ 5 คน คนละ ฿67.00'
    },
    {
      id: 'SUB-GONE',
      name: 'Google One AI Premium (Gemini Advanced 2TB)',
      fullAmount: 189,
      ourShareAmount: 189,
      sharingType: 'ALONE',
      paymentMethod: 'Shopee SPayLater / Google Play',
      category: 'PRODUCTIVITY',
      status: 'ACTIVE',
      nextBillingDate: '2026-09-12',
      note: 'ตัดผ่าน ShopeePay Order - Google ฿189'
    },
    {
      id: 'SUB-CAPCUT',
      name: 'CapCut Pro (Video Editing)',
      fullAmount: 29,
      ourShareAmount: 29,
      sharingType: 'ALONE',
      paymentMethod: 'Shopee SPayLater / Google Play',
      category: 'CREATIVE',
      status: 'ACTIVE',
      nextBillingDate: '2026-09-15',
      hasPriceHikeWarning: true,
      priceHikeNote: '⚠️ เดือนนี้โปร ฿29 แต่เดือนหน้าราคาเต็ม ฿289! (เตรียมกดยกเลิกถ้าไม่ได้ใช้ต่อ)'
    },
    {
      id: 'SUB-NETFLIX',
      name: 'Netflix (Premium 4K UHD)',
      fullAmount: 518,
      ourShareAmount: 259,
      sharingType: 'SPLIT_50_50',
      partnerOrMembers: 'พี่แพร (หารคนละครึ่ง คนละ ฿259)',
      paymentMethod: 'กสิกรเดบิต / บัตรเครดิต',
      category: 'ENTERTAINMENT',
      status: 'ACTIVE',
      nextBillingDate: '2026-09-20',
      note: 'พี่แพรหาร ฿259 ซิงค์เข้า Family Hub หักลบกับค่า Coway'
    }
  ],
  bnplItems: [
    { id: 'BNPL-01', title: 'Beefy Cheesy Burrito Combo', amount: 142, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: true, note: 'สแกนกิน' },
    { id: 'BNPL-02', title: '[อร่อยซ่ากับโค้ก] เบอร์เกอร์ไก่เปปเปอร์ แมคนักเก็ต', amount: 130, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: true, note: 'McDonalds' },
    { id: 'BNPL-03', title: 'ชำระเงินหน้าร้าน - Shinkanzen sushi (โลตัส ติวานนท์)', amount: 626, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: true, note: 'สแกนจ่ายหน้าร้าน' },
    { id: 'BNPL-04', title: 'ชำระเงินหน้าร้าน - Shinkanzen sushi (โลตัส ติวานนท์)', amount: 438.20, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: true, note: 'สแกนจ่ายหน้าร้าน' },
    { id: 'BNPL-05', title: 'ใบปัดน้ำฝน แพ็คคู่ Nissan March (ปี 2010-2020) FIL AERO 21"', amount: 336, category: 'VEHICLE', owner: 'บ้าน', isPaidBack: true, note: 'ดูแลรถ' },
    { id: 'BNPL-06', title: 'D-nee ดีนี่ ผลิตภัณฑ์ซักผ้าเด็ก Organic New Born 2500-2800 มล.', amount: 399, category: 'KIDS', owner: 'แจง', isPaidBack: false, note: 'แจงฝากซื้อของน้องพีเจ' },
    { id: 'BNPL-07', title: 'ShopeePay Order - Google (CapCut Pro)', amount: 29, category: 'DIGITAL', owner: 'ตัวเอง', isPaidBack: true, note: 'CapCut Pro โปรเดือนแรก ฿29' },
    { id: 'BNPL-08', title: '[อร่อยซ่ากับโค้ก] ชุดบิกแมค (XL)', amount: 283, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: true, note: 'McDonalds' },
    { id: 'BNPL-09', title: 'Merries Japan Tape Size M 52 pcs. ผ้าอ้อมเด็กเมอร์รี่ส์', amount: 449, category: 'KIDS', owner: 'แจง', isPaidBack: false, note: 'ผ้าอ้อมน้องพีเจ (แจงฝากซื้อ)' },
    { id: 'BNPL-10', title: 'HOCO HI25 HI26 กริ่งไร้สาย ไม่ใช้ถ่าน ไม่ต้องเดินสายไฟ', amount: 279, category: 'HOME', owner: 'บ้าน', isPaidBack: true, note: 'ของใช้ในบ้าน' },
    { id: 'BNPL-11', title: 'ShopeePay Order - Google (Google One AI Plus)', amount: 189, category: 'DIGITAL', owner: 'ตัวเอง', isPaidBack: true, note: 'Google One AI Plus ฿189' },
    { id: 'BNPL-12', title: '[อร่อยซ่ากับโค้ก] อิ่มคุ้มแมคไก่', amount: 218, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: true, note: 'McDonalds' },
    { id: 'BNPL-13', title: 'ชำระเงินหน้าร้าน - Shinkanzen Lotus Tiwanon', amount: 626, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: true, note: 'สแกนจ่ายหน้าร้าน' },
    { id: 'BNPL-14', title: 'กระเป๋าเก็บความเย็น กระเป๋าเก็บน้ำนม B-KOOL Our Back 20 ชม.', amount: 2732, category: 'KIDS', owner: 'แจง', isPaidBack: false, note: 'กระเป๋าเก็บน้ำนม (แจงฝากซื้อ)' },
    { id: 'BNPL-15', title: 'ซื้อ 2 ชิ้น ลด ฿1', amount: 262, category: 'LIFESTYLE', owner: 'ตัวเอง', isPaidBack: true, note: 'เสื้อผ้า' },
    { id: 'BNPL-16', title: '[โปรโมชัน] ถาดใหญ่ - พิซซ่า ขอบเอ็กซ์ตรีม เดอลุกซ์', amount: 591, category: 'FOOD', owner: 'ครอบครัว', isPaidBack: true, note: 'อาหารครอบครัว' },
    { id: 'BNPL-17', title: 'Social Security Office Section 39 (ประกันสังคม ม.39)', amount: 432, category: 'WELFARE', owner: 'ตัวเอง', isPaidBack: true, note: 'ประกันสังคม ม.39 ตัดผ่าน ShopeePay' },
    { id: 'BNPL-18', title: 'ShopeePay Order - Google (YouTube Premium)', amount: 399, category: 'DIGITAL', owner: 'ตัวเอง', isPaidBack: true, note: 'YouTube Premium Family ฿399' },
    { id: 'BNPL-19', title: 'ชำระเงินหน้าร้าน - Shinkanzen Lotus Tiwanon', amount: 626, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: true, note: 'สแกนจ่ายหน้าร้าน' }
  ],
  debts: [
    {
      id: 'DEBT-UOB-TAB',
      itemName: 'แท็บเล็ต Tablet (บัตร UOB)',
      owner: 'พี่แพร',
      category: 'GADGET',
      totalAmount: 23900,
      remainingAmount: 1991.67,
      monthlyPayment: 663.89,
      totalInstallments: 36,
      remainingInstallments: 3,
      interestRate: 0.0,
      linkedAccountId: 'UOB-TMRW',
      payerType: 'THEY_PAY',
      status: 'ACTIVE',
      createdAt: '2023-10-01',
      note: 'พี่แพรจ่ายคืนเรามาตัดบัตร UOB (หักลบใน Family Hub)'
    },
    {
      id: 'SPAY-01',
      itemName: 'หูฟังตัดเสียง Sony WH-1000XM5',
      owner: 'พี่แพร',
      category: 'GADGET',
      totalAmount: 11852.6,
      remainingAmount: 4741.04,
      monthlyPayment: 2370.52,
      totalInstallments: 5,
      remainingInstallments: 2,
      interestRate: 0.0,
      linkedAccountId: 'KBANK-SPAY',
      payerType: 'THEY_PAY',
      status: 'ACTIVE',
      createdAt: '2026-05-01',
      note: 'พี่แพรผ่อน เรากดให้ผ่าน SPayLater (พี่แพรโอนเงินคืนเรางวดละ ฿2,370.52)'
    },
    {
      id: 'SPAY-02',
      itemName: 'พวงมาลัย Logitech G29 Driving Force',
      owner: 'ตัวเอง',
      category: 'GAMING',
      totalAmount: 6806.16,
      remainingAmount: 2268.72,
      monthlyPayment: 567.18,
      totalInstallments: 12,
      remainingInstallments: 4,
      interestRate: 0.0,
      linkedAccountId: 'KBANK-SPAY',
      payerType: 'WE_PAY',
      status: 'ACTIVE',
      createdAt: '2025-12-01'
    },
    {
      id: 'SPAY-03',
      itemName: 'ชุดเกียร์ Logitech Driving Force Shifter',
      owner: 'ตัวเอง',
      category: 'GAMING',
      totalAmount: 1368,
      remainingAmount: 456.00,
      monthlyPayment: 114.00,
      totalInstallments: 12,
      remainingInstallments: 4,
      interestRate: 0.0,
      linkedAccountId: 'KBANK-SPAY',
      payerType: 'WE_PAY',
      status: 'ACTIVE',
      createdAt: '2025-12-01'
    },
    {
      id: 'SPAY-04',
      itemName: 'หมอนสุขภาพ Becell Ergonomic Pillow Set',
      owner: 'ตัวเอง/บ้าน',
      category: 'HEALTH',
      totalAmount: 8898.36,
      remainingAmount: 4449.18,
      monthlyPayment: 741.53,
      totalInstallments: 12,
      remainingInstallments: 6,
      interestRate: 0.0,
      linkedAccountId: 'KBANK-SPAY',
      payerType: 'WE_PAY',
      status: 'ACTIVE',
      createdAt: '2026-02-01'
    },
    {
      id: 'SPAY-05',
      itemName: 'พาวเวอร์แบงก์ CUKTECH 140W Powerbank',
      owner: 'ตัวเอง',
      category: 'GADGET',
      totalAmount: 2887.4,
      remainingAmount: 1154.96,
      monthlyPayment: 577.48,
      totalInstallments: 5,
      remainingInstallments: 2,
      interestRate: 0.0,
      linkedAccountId: 'KBANK-SPAY',
      payerType: 'WE_PAY',
      status: 'ACTIVE',
      createdAt: '2026-05-01'
    },
    {
      id: 'SPAY-06',
      itemName: 'หมวกกันน็อก Real Dawn 3XL',
      owner: 'ตัวเอง',
      category: 'VEHICLE',
      totalAmount: 1940,
      remainingAmount: 776.00,
      monthlyPayment: 388.00,
      totalInstallments: 5,
      remainingInstallments: 2,
      interestRate: 0.0,
      linkedAccountId: 'KBANK-SPAY',
      payerType: 'WE_PAY',
      status: 'ACTIVE',
      createdAt: '2026-05-01'
    },
    {
      id: 'SPAY-07',
      itemName: 'สวิตช์ไฟอัจฉริยะ Sonoff NSPanel Pro 120',
      owner: 'บ้าน',
      category: 'SMARTHOME',
      totalAmount: 2116.08,
      remainingAmount: 1234.38,
      monthlyPayment: 176.34,
      totalInstallments: 12,
      remainingInstallments: 7,
      interestRate: 0.0,
      linkedAccountId: 'KBANK-SPAY',
      payerType: 'WE_PAY',
      status: 'ACTIVE',
      createdAt: '2026-03-01'
    },
    {
      id: 'SPAY-08',
      itemName: 'ปลั๊กไฟ Vento Studio 8 Outlet Switch',
      owner: 'บ้าน/ทำงาน',
      category: 'EQUIPMENT',
      totalAmount: 2049.36,
      remainingAmount: 683.12,
      monthlyPayment: 170.78,
      totalInstallments: 12,
      remainingInstallments: 4,
      interestRate: 0.0,
      linkedAccountId: 'KBANK-SPAY',
      payerType: 'WE_PAY',
      status: 'ACTIVE',
      createdAt: '2025-12-01'
    },
    {
      id: 'SPAY-09',
      itemName: 'TUYA โคมไฟเพดานอัจฉริยะ WiFi Smart 24W',
      owner: 'บ้าน',
      category: 'SMARTHOME',
      totalAmount: 865.44,
      remainingAmount: 504.84,
      monthlyPayment: 72.12,
      totalInstallments: 12,
      remainingInstallments: 7,
      interestRate: 0.0,
      linkedAccountId: 'KBANK-SPAY',
      payerType: 'WE_PAY',
      status: 'ACTIVE',
      createdAt: '2026-03-01'
    }
  ],
  familySettlements: [
    {
      id: 'PERSON-MOM',
      personName: 'คุณแม่',
      relation: 'MOM',
      note: 'ค่าน้ำไฟ/กับข้าว/ประกันอุบัติเหตุ/ค่าดูหนัง (ยอดจริงบิลนี้ ฿8,783.29)',
      items: [
        { id: 'M-1', title: 'ค่าดูหนัง', amount: 609.00, type: 'WE_OWE', status: 'PENDING', note: 'ดูหนัง • เราจ่ายคืน' },
        { id: 'M-2', title: 'ค่าไฟบ้าน', amount: 3752.67, type: 'WE_OWE', status: 'PENDING', note: 'ตัดจากบัตรแม่ • เราจ่ายคืน' },
        { id: 'M-3', title: 'ค่าน้ำประปา', amount: 315.31, type: 'WE_OWE', status: 'PENDING', note: 'รอบบิลประจำเดือน • เราจ่ายคืน' },
        { id: 'M-4', title: 'ค่าโปรมือถือ & เน็ตบ้าน', amount: 1426.31, type: 'WE_OWE', status: 'PENDING', note: 'รวมเน็ตบ้าน • เราจ่ายคืน' },
        { id: 'M-5', title: 'ค่าข้าวเช้า-กลางวัน (แม่ซื้อวัตถุดิบ)', amount: 2000.00, type: 'WE_OWE', status: 'PENDING', note: 'เหมาจ่ายรายเดือน • เราจ่ายคืน' },
        { id: 'M-6', title: 'ค่าประกันอุบัติเหตุ', amount: 680.00, type: 'WE_OWE', status: 'PENDING', note: 'ต้องจ่ายคืนแม่ตัดบัตร • เราจ่ายคืน' }
      ]
    },
    {
      id: 'PERSON-PHRAE',
      personName: 'พี่แพร (พี่สาว)',
      relation: 'SISTER',
      note: 'หักลบกลบหนี้สุทธิ เราโอนจ่ายให้พี่แพร ฿450.00 (เคลียร์แล้ว)',
      items: [
        { id: 'P-1', title: 'ค่าเครื่องกรองน้ำ Coway (หารคนละครึ่ง)', amount: 396, type: 'WE_OWE', status: 'SETTLED', note: 'บัตรพี่แพรตัด ฿792' },
        { id: 'P-2', title: 'ค่ามื้อกินข้าวนอกบ้าน & ค่าใช้จ่ายที่พี่แพรสำรองจ่าย', amount: 3500, type: 'WE_OWE', status: 'SETTLED', note: 'พี่แพรจ่ายให้ก่อน' },
        { id: 'P-3', title: 'ค่างวดผ่อนแท็บเล็ต UOB (งวด 34/36)', amount: 663.89, type: 'THEY_OWE', status: 'SETTLED', note: 'หักลบในยอดสุทธิ' },
        { id: 'P-4', title: 'ค่า Netflix 4K หารคนละครึ่ง', amount: 259, type: 'THEY_OWE', status: 'SETTLED', note: 'หักลบในยอดสุทธิ' },
        { id: 'P-6', title: 'ค่างวดหูฟัง Sony WH-1000XM5 (งวด 4/5)', amount: 2370.52, type: 'THEY_OWE', status: 'SETTLED', note: 'หักลบในยอดสุทธิ' },
        { id: 'P-7', title: 'ของที่พี่แพรฝากผ่อน SPayLater', amount: 152.59, type: 'THEY_OWE', status: 'SETTLED', note: 'หักลบในยอดสุทธิ' }
      ]
    },
    {
      id: 'PERSON-JAENG',
      personName: 'แจง (ภรรยา & แม่น้องพีเจ)',
      relation: 'WIFE',
      note: 'แจงโอนคืนเราสุทธิ ฿2,392.00 (แจงช่วยค่าไฟ ฿2,000 + ของใช้น้องพีเจ)',
      items: [
        { id: 'J-ELEC', title: '⚡ แจงช่วยออกค่าไฟบ้าน (ประจำเดือน)', amount: 2000, type: 'THEY_OWE', status: 'PENDING', note: 'แจงช่วยสมทบค่าไฟบ้านเดือนละ ฿2,000 หักลบในบ้าน' },
        { id: 'J-1', title: 'กระเป๋าเก็บความเย็น/น้ำนม B-KOOL Our Back 20 ชม.', amount: 2732, type: 'THEY_OWE', status: 'PENDING', note: 'แจงฝากซื้อผ่าน SPayLater' },
        { id: 'J-2', title: 'ผ้าอ้อม Merries Japan Tape Size M (น้องพีเจ)', amount: 449, type: 'THEY_OWE', status: 'PENDING', note: 'แจงฝากซื้อผ่าน SPayLater' },
        { id: 'J-3', title: 'D-nee น้ำยาซักผ้าเด็ก Organic New Born 2800 มล.', amount: 399, type: 'THEY_OWE', status: 'PENDING', note: 'แจงฝากซื้อผ่าน SPayLater' },
        { id: 'J-4', title: 'ค่าของใช้ในห้อง/ซูเปอร์มาร์เก็ต (แจงจ่าย)', amount: 450, type: 'WE_OWE', status: 'PENDING', note: 'หารครึ่ง' }
      ]
    }
  ],
  pipelineDrops: [],
  transactions: [],
  auditEvents: [],
  moneySavedTotal: 0,
  spayStatementStatus: 'UNPAID',
  spayStatementPaidAt: null,
  spayStatementCycle: 'รอบ ส.ค. 2026 (ครบกำหนด 10 ส.ค.)'
};

// Generate a Clean Slate with all accounts set to 0.00 balance
export const createZeroedData = () => {
  return {
    ...INITIAL_DATA,
    accounts: INITIAL_DATA.accounts.map(a => ({
      ...a,
      balance: 0,
      updatedAt: new Date().toISOString()
    })),
    debts: INITIAL_DATA.debts.map(d => ({
      ...d,
      remainingAmount: 0,
      remainingInstallments: 0,
      status: 'COMPLETED'
    })),
    bnplItems: [],
    pipelineDrops: [],
    transactions: [],
    familySettlements: INITIAL_DATA.familySettlements.map(p => ({
      ...p,
      items: []
    })),
    moneySavedTotal: 0
  };
};

// Helper: Normalize / Sanitise SOT Object
export const sanitizeSOTData = (parsed) => {
  if (!parsed || typeof parsed !== 'object') return INITIAL_DATA;

  let updatedDebts = parsed.debts || INITIAL_DATA.debts;
  if (updatedDebts) {
    updatedDebts = updatedDebts.map(d => {
      if (d.id === 'SPAY-01' || d.itemName?.includes('Sony WH-1000XM5')) {
        return {
          ...d,
          owner: 'พี่แพร',
          payerType: 'THEY_PAY',
          note: 'พี่แพรผ่อน เรากดให้ผ่าน SPayLater (พี่แพรจ่ายคืนเรางวดละ ฿2,370.52)'
        };
      }
      return d;
    });
  }

  return {
    ...INITIAL_DATA,
    ...parsed,
    spayStatementStatus: parsed.spayStatementStatus || 'UNPAID',
    spayStatementPaidAt: parsed.spayStatementPaidAt || null,
    spayStatementCycle: parsed.spayStatementCycle || 'รอบ ส.ค. 2026 (ครบกำหนด 10 ส.ค.)',
    accounts: parsed.accounts || INITIAL_DATA.accounts,
    debts: updatedDebts,
    bnplItems: parsed.bnplItems || INITIAL_DATA.bnplItems,
    subscriptions: parsed.subscriptions || INITIAL_DATA.subscriptions,
    familySettlements: parsed.familySettlements || INITIAL_DATA.familySettlements
  };
};

// Safe Local Loader (Fast Initial Render)
export const loadSOTData = () => {
  try {
    const raw = localStorage.getItem(SOT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return sanitizeSOTData(parsed);
    }
  } catch (e) {
    console.error('Failed to load SOT data from localStorage', e);
  }
  return INITIAL_DATA;
};

let cloudSyncTimer = null;

// Push to Supabase Cloud (Immediate)
export const pushCloudSOTData = async (data) => {
  if (cloudSyncTimer) {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
  }

  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({
        id: CLOUD_RECORD_ID,
        data: data,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Supabase Cloud Sync push warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error('Supabase Cloud Sync push exception:', e);
    return { success: false, error: e.message };
  }
};

// Debounced Cloud Push (~500ms delay to prevent network spam)
export const debouncedPushCloudSOTData = (data, delay = 500) => {
  return new Promise((resolve) => {
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(async () => {
      const res = await pushCloudSOTData(data);
      resolve(res);
    }, delay);
  });
};

// Fetch from Supabase Cloud (WITHOUT overwriting localStorage)
export const fetchCloudSOTData = async () => {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data, updated_at')
      .eq('id', CLOUD_RECORD_ID)
      .single();

    if (error) {
      // If table empty, seed current SOT to Cloud
      if (error.code === 'PGRST116') {
        const localData = loadSOTData();
        await pushCloudSOTData(localData);
        return { success: true, data: localData, seeded: true };
      }
      return { success: false, error: error.message };
    }

    if (data && data.data) {
      const sanitized = sanitizeSOTData(data.data);
      // NOTE: Do NOT write to localStorage here to avoid clobbering conflict checks!
      return { success: true, data: sanitized, updatedAt: data.updated_at };
    }
    return { success: false, error: 'No data returned' };
  } catch (e) {
    console.error('Supabase Cloud Sync fetch exception:', e);
    return { success: false, error: e.message };
  }
};

// Explicit commit to LocalStorage
export const commitToLocalStorage = (data) => {
  try {
    localStorage.setItem(SOT_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save SOT data to localStorage', e);
  }
};

// Save SOT data to both LocalStorage and Supabase Cloud (Debounced)
export const saveSOTData = (data, immediate = false) => {
  commitToLocalStorage(data);

  if (immediate) {
    pushCloudSOTData(data);
  } else {
    debouncedPushCloudSOTData(data, 500);
  }
};

// Realtime Cloud Subscription
export const subscribeToCloudUpdates = (onUpdate) => {
  try {
    const channel = supabase
      .channel('app_state_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_state',
          filter: `id=eq.${CLOUD_RECORD_ID}`
        },
        (payload) => {
          if (payload.new && payload.new.data) {
            const sanitized = sanitizeSOTData(payload.new.data);
            try {
              localStorage.setItem(SOT_STORAGE_KEY, JSON.stringify(sanitized));
            } catch (err) {
              console.error(err);
            }
            onUpdate(sanitized);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.error('Failed to subscribe to Supabase Realtime', e);
    return () => {};
  }
};

export const addAuditEvent = (data, entityType, entityId, eventAction, payload = {}) => {
  const newEvent = {
    id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    entityType,
    entityId,
    eventAction,
    payloadJson: JSON.stringify(payload),
    timestamp: new Date().toISOString()
  };
  const updatedEvents = [newEvent, ...(data.auditEvents || [])];
  return { ...data, auditEvents: updatedEvents };
};
