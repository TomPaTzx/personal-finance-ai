import fs from 'fs';

// Read storageService.js
let content = fs.readFileSync('src/services/storageService.js', 'utf8');

// Replace bnplItems in INITIAL_DATA
const realBnplCode = `  bnplItems: [
    { id: 'BNPL-01', title: 'Social Security Office Section 39', amount: 432.00, category: 'GOV', owner: 'แม่', isPaidBack: false, note: 'ประกันสังคม ม.39 ตัดให้แม่' },
    { id: 'BNPL-02', title: '*พร้อมส่ง* ผ้าอ้อมกายน้ำ Sandybaobao', amount: 70.00, category: 'KIDS', owner: 'น้องพีเจ', isPaidBack: false, note: 'ของใช้น้องพีเจ' },
    { id: 'BNPL-03', title: 'ชำระเงินหน้าร้าน - Shinkanzen Lotus Tiwanon', amount: 626.00, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: false, note: 'กระเป๋า 2 กินแซ่บ' },
    { id: 'BNPL-04', title: 'ยาสีฟันเทพไทย TEPTHAI 70g แท้ 100%', amount: 168.00, category: 'LIFESTYLE', owner: 'ตัวเอง', isPaidBack: false, note: 'ของใช้ส่วนตัว' },
    { id: 'BNPL-05', title: 'Mega We Care Lecithin เมก้า วีแคร์ เลซิติน [30 แคปซูล]', amount: 85.00, category: 'HEALTH', owner: 'แม่', isPaidBack: false, note: 'ของแม่' },
    { id: 'BNPL-06', title: 'ไก่ทอดเดชา สูตรหาดใหญ่', amount: 303.00, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: false, note: 'ค่าอาหาร' },
    { id: 'BNPL-07', title: '(ปิดฝาแน่น/สเปรย์) Saker ยกเซ็ต (12 ขวด) สเปรย์แอลกอฮอล์', amount: 935.00, category: 'KIDS', owner: 'น้องพีเจ', isPaidBack: false, note: 'ของใช้น้องพีเจ แจงฝากซื้อ' },
    { id: 'BNPL-08', title: '(1 ลัง 4 ห่อ) PASEO พาซิโอ คิตตี้ กระดาษชำระ 4 ชั้น', amount: 224.00, category: 'HOME', owner: 'บ้าน', isPaidBack: false, note: 'ของใช้ในบ้าน' },
    { id: 'BNPL-09', title: 'ชำระเงินหน้าร้าน - สุกี้ตี๋น้อย (สาขาแจ้งวัฒนะ)', amount: 276.06, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: false, note: 'ค่าอาหาร' },
    { id: 'BNPL-10', title: 'ShopeePay Order - Google', amount: 189.00, category: 'PRODUCTIVITY', owner: 'ตัวเอง', isPaidBack: false, note: 'Google One' },
    { id: 'BNPL-11', title: '1 ฟรี 1 เสื้อปาดไหล่เอ็กซ์ตร้า ลายใหญ่ (L)', amount: 585.00, category: 'LIFESTYLE', owner: 'ตัวเอง', isPaidBack: false, note: 'เสื้อผ้า' },
    { id: 'BNPL-12', title: '[Multi Function] เคสกันกระแทก สำหรับ Samsung Galaxy tab S7 S8 Plus', amount: 574.00, category: 'GADGET', owner: 'พี่แพร', isPaidBack: false, note: 'พี่แพรฝากซื้อ' },
    { id: 'BNPL-13', title: 'มือจับประตูด้านใน TOYOTA COROLLA มือเปิดใน', amount: 202.00, category: 'AUTO', owner: 'ตัวเอง', isPaidBack: false, note: 'อะไหล่รถยนต์' },
    { id: 'BNPL-14', title: 'ชำระเงินหน้าร้าน - Shinkanzen sushi (โลตัส ติวานนท์)', amount: 532.10, category: 'FOOD', owner: 'ตัวเอง', isPaidBack: false, note: 'กระเป๋า 2 กินแซ่บ' },
    { id: 'BNPL-15', title: 'Starship ผ้าห่มคลุม การ์ดกำมะหยี่ เก้าอี้ทำงาน', amount: 576.00, category: 'HOME', owner: 'ตัวเอง', isPaidBack: false, note: 'ของใช้ทำงาน' },
    { id: 'BNPL-16', title: 'Orico กล่อง HDD SSD ป้องกันความชื้น ขนาด 3.5 นิ้ว', amount: 265.00, category: 'GADGET', owner: 'ตัวเอง', isPaidBack: false, note: 'อุปกรณ์ไอที' },
    { id: 'BNPL-17', title: 'ShopeePay Order - Google', amount: 399.00, category: 'ENTERTAINMENT', owner: 'ตัวเอง', isPaidBack: false, note: 'YouTube Premium' },
    { id: 'BNPL-18', title: 'UGREEN กล่องใส่ฮาร์ดดิส External HDD Enclosure 3.5 นิ้ว', amount: 546.00, category: 'GADGET', owner: 'ตัวเอง', isPaidBack: false, note: 'อุปกรณ์ไอที' },
    { id: 'BNPL-19', title: 'Merries Japan Tape Size M 52 pcs. ผ้าอ้อมเด็กเทป', amount: 945.00, category: 'KIDS', owner: 'น้องพีเจ', isPaidBack: false, note: 'ของใช้น้องพีเจ แจงฝากซื้อ' }
  ],`;

const bnplRegex = /bnplItems:\s*\[[\s\S]*?\],/;
content = content.replace(bnplRegex, realBnplCode);

// Replace familySettlements in INITIAL_DATA
const realFamilyCode = `familySettlements: [
    {
      id: 'PERSON-MOM',
      personName: 'คุณแม่',
      relation: 'MOM',
      note: 'ค่าน้ำไฟ/กับข้าว/ประกันอุบัติเหตุ',
      items: [
        { id: 'M-1', title: 'ค่าดูหนัง', amount: 609.00, type: 'WE_OWE', status: 'PENDING', note: 'ดูหนัง • เราจ่ายคืน' },
        { id: 'M-2', title: 'ค่าไฟบ้าน', amount: 3752.67, type: 'WE_OWE', status: 'PENDING', note: 'ตัดจากบัตรแม่ • เราจ่ายคืน' },
        { id: 'M-3', title: 'ค่าน้ำประปา', amount: 315.31, type: 'WE_OWE', status: 'PENDING', note: 'รอบบิลประจำเดือน • เราจ่ายคืน' },
        { id: 'M-4', title: 'ค่าโปรมือถือ & เน็ตบ้าน', amount: 1426.31, type: 'WE_OWE', status: 'PENDING', note: 'รวมเน็ตบ้าน • เราจ่ายคืน' },
        { id: 'M-5', title: 'ค่าข้าวเช้า-กลางวัน (แม่ซื้อวัตถุดิบ)', amount: 2000.00, type: 'WE_OWE', status: 'PENDING', note: 'เหมาจ่ายรายเดือน • เราจ่ายคืน' },
        { id: 'M-6', title: 'ค่าประกันอุบัติเหตุ', amount: 680.00, type: 'WE_OWE', status: 'PENDING', note: 'ต้องจ่ายคืนแม่ตัดบัตร • เราจ่ายคืน' },
        { id: 'M-7', title: 'ประกันสังคม มาตรา 39 (ตัดผ่าน Shopee)', amount: 432.00, type: 'THEY_OWE', status: 'PENDING', note: 'เราตัดจ่ายให้แม่' },
        { id: 'M-8', title: 'เลซิติน Mega We Care', amount: 85.00, type: 'THEY_OWE', status: 'PENDING', note: 'เราซื้อให้แม่' }
      ]
    },
    {
      id: 'PERSON-PHRAE',
      personName: 'พี่แพร (พี่สาว)',
      relation: 'SISTER',
      note: 'หักลบกลบหนี้สุทธิ (หูฟัง Sony + แท็บเล็ต)',
      items: [
        { id: 'P-1', title: 'ค่าเครื่องกรองน้ำ Coway (หารคนละครึ่ง)', amount: 396.00, type: 'WE_OWE', status: 'SETTLED', note: 'บัตรพี่แพรตัด ฿792' },
        { id: 'P-2', title: 'ค่ามื้อกินข้าวนอกบ้าน & ค่าใช้จ่ายที่พี่แพรสำรองจ่าย', amount: 3500.00, type: 'WE_OWE', status: 'SETTLED', note: 'พี่แพรจ่ายให้ก่อน' },
        { id: 'P-3', title: 'ค่างวดผ่อนแท็บเล็ต UOB (งวด 34/36)', amount: 663.89, type: 'THEY_OWE', status: 'SETTLED', note: 'หักลบในยอดสุทธิ', linkedSourceId: 'DEBT-UOB-TAB' },
        { id: 'P-4', title: 'ค่า Netflix 4K หารคนละครึ่ง', amount: 259.00, type: 'THEY_OWE', status: 'SETTLED', note: 'หักลบในยอดสุทธิ' },
        { id: 'P-6', title: 'ค่างวดหูฟัง Sony WH-1000XM6 [งวด 5/5]', amount: 2074.49, type: 'THEY_OWE', status: 'SETTLED', note: 'หักลบในยอดสุทธิ (งวดสุดท้าย)', linkedSourceId: 'SPAY-01' },
        { id: 'P-7', title: 'เคสกันกระแทก Samsung Galaxy Tab', amount: 574.00, type: 'THEY_OWE', status: 'PENDING', note: 'พี่แพรฝากซื้อผ่าน Shopee' }
      ]
    },
    {
      id: 'PERSON-JAENG',
      personName: 'แจง (ภรรยา & แม่น้องพีเจ)',
      relation: 'WIFE',
      note: 'ช่วยค่าไฟ ฿2,000 + ของใช้น้องพีเจ ฿1,950',
      items: [
        { id: 'J-ELEC', title: '⚡ แจงช่วยออกค่าไฟบ้าน (ประจำเดือน)', amount: 2000.00, type: 'THEY_OWE', status: 'PENDING', note: 'แจงช่วยสมทบค่าไฟบ้านเดือนละ ฿2,000' },
        { id: 'SYNC-SAKER', title: 'สเปรย์แอลกอฮอล์ Saker (12 ขวด)', amount: 935.00, type: 'THEY_OWE', status: 'PENDING', note: 'ของใช้น้องพีเจ แจงฝากกด Shopee' },
        { id: 'SYNC-MERRIES', title: 'ผ้าอ้อม Merries Tape Size M', amount: 945.00, type: 'THEY_OWE', status: 'PENDING', note: 'ของใช้น้องพีเจ แจงฝากกด Shopee' },
        { id: 'SYNC-SWIM', title: 'ผ้าอ้อมว่ายน้ำ Sandybaobao', amount: 70.00, type: 'THEY_OWE', status: 'PENDING', note: 'ของใช้น้องพีเจ แจงฝากกด Shopee' },
        { id: 'J-4', title: 'ค่าของใช้ในห้อง/ซูเปอร์มาร์เก็ต (แจงจ่าย)', amount: 450.00, type: 'WE_OWE', status: 'PENDING', note: 'หารครึ่ง' }
      ]
    }
  ],`;

const familyRegex = /familySettlements:\s*\[[\s\S]*?\n  \],/;
content = content.replace(familyRegex, realFamilyCode);

fs.writeFileSync('src/services/storageService.js', content, 'utf8');
console.log('✅ Successfully updated storageService.js with real September Shopee statement!');
