import fs from 'fs';

// Update SOT.md
let sot = fs.readFileSync('SOT.md', 'utf8');
const sotAddition = `

---

## 🛒 8. ระบบสแกนและนำเข้ารายการย่อยหลายรายการ (Multi-Item Batch Intake Engine)
* **บริบท:** การสั่งซื้อสินค้าผ่าน Shopee / แพลตฟอร์มออนไลน์ หรือใบเสร็จบิลรวม 1 คำสั่งซื้อ มักมีสินค้าหลายรายการปะปนกัน (เช่น ซื้อของใช้ส่วนตัวรวมกับของใช้ลูก/ครอบครัว เช่น ยาสีฟันเทพไทย + สเปรย์แอลกอฮอล์ Saker น้องพีเจ)
* **มาตรฐานการทำงาน (International Engineering Standard):**
  1. **Line-Item Extraction (Gemini Vision AI):** สกัดรายการสินค้าทุกชิ้นแยกจากกัน พร้อมราคารายชิ้นและราคารวม โดยไม่รวบยอดเป็นก้อนเดียว
  2. **Automated & Manual Owner Mapping:** อนุมานและเปิดให้เลือกเจ้าของรายการอย่างละเอียด (\`ตัวเอง\`, \`น้องพีเจ\`, \`แจง\`, \`พี่แพร\`, \`บ้าน\`, \`แม่\`)
  3. **Batch Import & Two-Way Settlement Sync:**
     - บันทึกรายการย่อยทั้งหมดเข้าสู่ฐานข้อมูล BNPL และสร้างงวดผ่อนในคลิกเดียว
     - รายการที่เป็นของคนในครอบครัว (เช่น น้องพีเจ / แจง) จะถูกซิงค์เข้าบัญชีเรียกเก็บ \`familySettlements\` โดยอัตโนมัติ
  4. **Cloud-First SSOT:**
     - ข้อมูลใน Supabase Cloud ถือเป็นความจริงสูงสุด (Single Source of Truth)
     - ตัดขาด Mock Data เก่าในโค้ด ป้องกันการ Revert ทับข้อมูลจริงในชีวิตประจำวัน
`;
if (!sot.includes('Multi-Item Batch Intake Engine')) {
  fs.writeFileSync('SOT.md', sot.trimEnd() + '\n' + sotAddition, 'utf8');
  console.log('SOT.md updated');
}

// Update ROADMAP.md
let roadmap = fs.readFileSync('ROADMAP.md', 'utf8');
const roadmapAddition = `  - [x] **ระบบสแกนและนำเข้ารายการย่อยหลายรายการ (Multi-Item Batch Intake Engine & Cloud-First SSOT)**:
    - [x] อัปเกรด Gemini Vision Prompt ดึงรายการย่อยแบบละเอียดยิบ (5-10+ รายการ) จากหน้าคำสั่งซื้อ Shopee / สลิปรวม
    - [x] หน้าต่างเลือกและแก้ไข Multi-Item Breakdown View พร้อมระบบติ๊กเลือก/แก้ไขชื่อ/ปรับยอด/ระบุเจ้าของย่อย (\`น้องพีเจ\`, \`แจง\`, \`พี่แพร\`, \`บ้าน\`, \`แม่\`, \`ตัวเอง\`)
    - [x] ปุ่ม 1-Click นำเข้าทุกรายการย่อยเข้า BNPL พร้อมสร้างงวดผ่อนและซิงค์ยอดเรียกเก็บคนในครอบครัวอัตโนมัติ
    - [x] ล้าง Mock Data เก่าเดือนสิงหาคมออกจากระบบ และติดตั้ง Cloud-First SSOT สถาปัตยกรรมความจริงเดียวจาก Supabase Cloud ป้องกันข้อมูลจริงถูกเขียนทับ
`;

if (!roadmap.includes('Multi-Item Batch Intake Engine')) {
  // insert before Phase 8
  roadmap = roadmap.replace(
    '- [ ] **Phase 8 (Future Blueprint):',
    roadmapAddition + '\n- [ ] **Phase 8 (Future Blueprint):'
  );
  fs.writeFileSync('ROADMAP.md', roadmap, 'utf8');
  console.log('ROADMAP.md updated');
}
