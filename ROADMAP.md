# ROADMAP: Milestones & Execution Plan

> แผนผังการพัฒนาแต่ละ Phase (บอกตำแหน่งปัจจุบันและสิ่งที่จะทำถัดไป)

---

## 📍 สถานะปัจจุบัน: Phase 1 -> Phase 2 Transition

- [x] **Phase 1: Six/Eight-Doc Scaffold & System Baseline**
  - [x] `PROJECT.md` - นิยามภารกิจและขอบเขต
  - [x] `AGENTS.md` - สัญญาและกฎเหล็ก
  - [x] `SOT.md` - สถานะความจริงการเงินเริ่มต้น
  - [x] `ROADMAP.md` - แผนงาน
  - [x] `UX.md` - Design System & Signals
  - [x] `SCHEMA.md` - DDL และ Table Specs
  - [x] `RTK.md` - Bootstrap Kernel
  - [x] `PIN_MESSAGE.md` - สรุปคำสั่ง
  - [x] `graft/architecture.md` - แผนผัง Codebase

- [x] **Phase 2: Database Layer & Pipeline Engine Implementation**
  - [x] Storage Engine (LocalStorage + Audit Trail)
  - [x] Triage Processor & Dedup Hash Generator
  - [x] Dual Advisor Scoring Algorithm (Sonar & Best)

- [x] **Phase 3: React + Vite Web App & Dark Glassmorphism UI**
  - [x] Frontend & Icons Architecture
  - [x] Design System & Modern Cyber/Glass Theme

- [x] **Phase 4: Interactive Pipeline Flow (Drop -> Triage -> Dual Advisors -> Decision Gate)**
  - [x] หน้าต่าง "ปล่อยของ" (Intake Box)
  - [x] จอแสดงผล Dual Advisor Debate (Sonar vs Best)
  - [x] 3-Axis Verdict Matrix Widget & Decision Controls

- [x] **Phase 5: Personal Finance Modules (Multi-Account, Debt Tracker, Family Settlement, Net Worth)**
  - [x] หน้าจัดการกระเป๋าบัญชี & Smart Waterfall Allocation Assistant (จัดสรรตามเงินที่มีจริง ไม่ให้กระเป๋าติดลบ พร้อมกลยุทธ์ตามวันครบกำหนดชำระ)
  - [x] ระบบเคลียร์บิลครอบครัว (Family Settlement) พร้อมตัวเลือกกระเป๋าเงินตัดจ่าย/รับโอนเรียลไทม์
  - [x] หน้ารายการผ่อนของรายชิ้น & SPayLater / Debt Tracker
  - [x] ระบบสแกนสลิป & สรุป Net Worth Dashboard

- [x] **Phase 6: Cloud Synchronization & Multi-Device Realtime (Supabase Cloud)**
  - [x] เชื่อมต่อ Supabase PostgreSQL Cloud Backend
  - [x] ระบบ Auto-Sync ข้ามอุปกรณ์ (เปิดบนคอมหรือมือถือ ค่าตรงกันทันที)
  - [x] Realtime Postgres Subscription Listener
  - [x] สถานะการเชื่อมต่อ Cloud Status Badge & ปุ่ม Sync ด่วนบน Header
  - [x] ศูนย์จัดการ Cloud Sync & Backup Manager (Push / Pull / Export / Import JSON)
  - [x] ระบบ Conflict Guard ป้องกันการโหลดข้อมูล Cloud ทับข้อมูลในเครื่องที่ทำงานโดยไม่ตั้งใจ
  - [x] ระบบแจ้งเตือน Cyber Dark Glassmorphism Modals & Floating Toasts

- [x] **Phase 7: Sommai Money Rebranding, Sidebar Layout & Smart Ingestion**
  - [x] แปลงโฉมระบบเป็น "สมหมาย (Sommai Money)" เลขาการเงินส่วนตัว
  - [x] ระบบเมนูด้านข้าง Modern Collapsible Sidebar (3 กลุ่มหลัก จัดระเบียบคลีน 100%)
  - [x] ระบบดูดยอดเงินเดือน 1-Click Salary Bookmarklet Tool
  - [x] ระบบ Real OCR & PromptPay QR Code Scanner (อ่านสลิปธนาคารจริง)
  - [x] ระบบแกะรายการผ่อน SPayLater จากภาพแคปหน้าจอ Shopee (สร้างหนี้/ปรับยอดผ่อนให้อัตโนมัติ)
  - [x] ระบบ Dogfooding & Single-User Private Validation Ready
  - [x] ระบบสแกนสลิป Live Cloud Pockets Strip แสดงยอดทุกกระเป๋าแบบเรียลไทม์ + พรีวิวยอดคงเหลือสุทธิก่อน/หลังตัดสลิป ป้องกันการเลือกกระเป๋าผิดและสับสนยอดเงินคงเหลือธนาคาร vs Pockets
  - [x] ระบบ 1-Click เติมเงินเดือนด่วนบนการ์ด KTB-SALARY + ระบบ Quick Text Sync ข้ามอุปกรณ์ รองรับการใช้งานแม้ Supabase Cloud ออฟไลน์
  - [x] ระบบผู้ช่วยจัดสรรเงินตามจุดประสงค์ของทุกกระเป๋า (Holistic Multi-Pocket & Purpose-Driven Balancer) พร้อมระบบ Income Milestones ติดตามวงรอบเงินเข้า (เงินเดือน/เงินเสาร์/โอเย็นสิ้นเดือน) + แถบเกลี่ยเงินส่วนเกิน (Rebalance) & จำลองรับเงินสดโอเย็นสิ้นเดือน (~฿3,600)
  - [x] Hotfix ระบบแก้ไขยอดเงินบัญชี/กระเป๋า (Accounts Balance Edit) และ Modal บันทึกรับเงินสดโอเย็น: แก้ไข Missing React State Hooks ให้ทำงานได้เสถียร 100% ป้องกัน ReferenceError ที่ทำให้เกิดจอขาว/จอดำ

  - [x] **ระบบสแกนและนำเข้ารายการย่อยหลายรายการ (Multi-Item Batch Intake Engine & Cloud-First SSOT)**:
    - [x] อัปเกรด Gemini Vision Prompt ดึงรายการย่อยแบบละเอียดยิบ (5-10+ รายการ) จากหน้าคำสั่งซื้อ Shopee / สลิปรวม
    - [x] หน้าต่างเลือกและแก้ไข Multi-Item Breakdown View พร้อมระบบติ๊กเลือก/แก้ไขชื่อ/ปรับยอด/ระบุเจ้าของย่อย (`น้องพีเจ`, `แจง`, `พี่แพร`, `บ้าน`, `แม่`, `ตัวเอง`)
    - [x] ปุ่ม 1-Click นำเข้าทุกรายการย่อยเข้า BNPL พร้อมสร้างงวดผ่อนและซิงค์ยอดเรียกเก็บคนในครอบครัวอัตโนมัติ
    - [x] ล้าง Mock Data เก่าเดือนสิงหาคมออกจากระบบ และติดตั้ง Cloud-First SSOT สถาปัตยกรรมความจริงเดียวจาก Supabase Cloud ป้องกันข้อมูลจริงถูกเขียนทับ
  - [x] **ระบบสมหมาย Telegram Bot Daemon & Windows Startup Auto-Launch**:
    - [x] อัปเกรด Sommai Bot v2.7 เพิ่ม Crash Resilience (`uncaughtException`/`unhandledRejection`), Single-instance lock (`bot.pid`), Auto-retry connection
    - [x] ติดตั้ง Startup Launcher (`sommai_bot_startup.vbs`) ในโฟลเดอร์ Windows Startup ให้บอทเปิดตัวเองทุกครั้งที่เปิดเครื่อง/ล็อกอิน (รันแบบเงียบ ไร้หน้าต่างดำ)
    - [x] สร้างสคริปต์ควบคุม `start_bot.bat`, `start_bot_silent.vbs`, `stop_bot.bat` และคำสั่ง `"bot"` ใน package.json

- [ ] **Phase 8 (Future Blueprint): Commercial Mobile App & SaaS Transformation (แผนต่อยอดสู่แอปมือถือเพื่อการค้า)**
  - [ ] **Track 1: Multi-Tenant Architecture & Auth (ระบบสมาชิก & แยกฐานข้อมูลผู้ใช้)**
    - [ ] Supabase Auth Integration (Login ด้วย Google, Apple ID, LINE Login)
    - [ ] Row-Level Security (RLS) Policy เพื่อแยกข้อมูลการเงินของผู้ใช้แต่ละคนอย่างปลอดภัย 100%
  - [ ] **Track 2: Mobile App Packaging (แปลงเป็นแอป iOS & Android)**
    - [ ] หุ้มโค้ดด้วย **Capacitor.js** บิลด์ไฟล์ `.ipa` (iOS) และ `.aab/.apk` (Android)
    - [ ] รองรับ Native Mobile Features: กล้องสแกนสลิปความคมชัดสูง, FaceID/Biometrics ล็อกแอป, Local Push Notifications
  - [ ] **Track 3: Smart AI Co-pilot (ต่อยอดสมองกล LLM อัจฉริยะ)**
    - [ ] เชื่อมต่อ Google Gemini 1.5 Flash API (ต้นทุน ~฿0.005/ครั้ง) สำหรับคุยปรึกษาการเงินแบบภาษาธรรมชาติ
    - [ ] Advanced Bank Slip & Statement Parser รองรับทุกธนาคารในไทย
  - [ ] **Track 4: Monetization & Payment Gateway (ระบบชำระเงิน & แผนสร้างรายได้)**
    - [ ] Free Tier: 3 กระเป๋าเงิน, สแกนสลิปเดือนละ 15 ใบ
    - [ ] Sommai Pro Subscription (฿59 - ฿99/เดือน หรือ ฿690/ปี) ผ่าน Apple In-App Purchase & Google Play Billing
    - [ ] Lifetime License (฿1,290 ซื้อขาดครั้งเดียวจบ) ผ่าน PromptPay QR / Stripe
  - [ ] **Track 5: Store Launch & Distribution (เปิดตัวสู่ตลาด)**
    - [ ] Apple Developer Program ($99/ปี) & Google Play Console ($25 ครั้งเดียว)
    - [ ] นโยบายความเป็นส่วนตัว (Privacy Policy) & มาตรฐานความปลอดภัย PDPA
    - [ ] Closed Beta Test กับกลุ่มเพื่อนและคนวงใน (Friends & Family)

---

## 🎯 Next Immediate Steps:
- [ ] ทดลองใช้งานจริงรอบเคลียร์บิลประจำเดือน (Monthly Bill Settlement & Allocation)
- [ ] ติดตามผลการหักเงิน Shopee SPayLater และการกระจายเงินเข้ากระเป๋าจริง
- [ ] บันทึกฟีดแบ็กและปรับจูนความแม่นยำของ OCR ตามสลิปจริงในชีวิตประจำวัน


