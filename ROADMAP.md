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
  - [x] หน้าจัดการกระเป๋าบัญชี & Live Real-Time Allocation Assistant
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

---

## 🎯 Next Steps:
- [ ] ทดลองใช้งานจริงรอบเคลียร์บิลประจำเดือน (Monthly Bill Settlement & Allocation)
- [ ] ติดตามผลการหักเงิน Shopee SPayLater และการกระจายเงินเข้ากระเป๋าจริง
- [ ] บันทึกฟีดแบ็กและปรับจูนความแม่นยำของ OCR ตามสลิปจริงในชีวิตประจำวัน


