import React, { useState } from 'react';
import { FileText, Database, ShieldAlert, Map, Layout, Code2, Terminal, Bookmark } from 'lucide-react';

export default function ScaffoldDocViewer() {
  const [selectedDoc, setSelectedDoc] = useState('PROJECT.md');

  const DOCS = [
    { name: 'PROJECT.md', icon: <FileText size={16} />, title: 'ขอบเขตงาน & พันธกิจ' },
    { name: 'AGENTS.md', icon: <ShieldAlert size={16} />, title: 'สัญญาสมาชิกทีม & กฎเหล็ก' },
    { name: 'SOT.md', icon: <Database size={16} />, title: 'Single Source of Truth' },
    { name: 'ROADMAP.md', icon: <Map size={16} />, title: 'แผนงาน & Phase ปัจจุบัน' },
    { name: 'UX.md', icon: <Layout size={16} />, title: 'Design System & โทนเสียง' },
    { name: 'SCHEMA.md', icon: <Code2 size={16} />, title: 'DDL ตาราง SQLite v2' },
    { name: 'RTK.md', icon: <Terminal size={16} />, title: 'Run-Time Kernel Protocol' },
    { name: 'PIN_MESSAGE.md', icon: <Bookmark size={16} />, title: 'สรุปคำสั่งใช้งาน' }
  ];

  const DOC_CONTENTS = {
    'PROJECT.md': `# PROJECT: Personal Finance & Decision AI ("Jason" Assistant)

> Logline / Mission: ระบบผู้ช่วยและที่ปรึกษาทางการเงินส่วนบุคคลอัจฉริยะแบบ Pipeline Flow ที่รู้โครงสร้างบัญชีเงินฝาก, สภาพคล่อง, หนี้สินและภาระผ่อนรายชิ้น พร้อมระบบที่ปรึกษา 2 คน (Sonar & Best) ช่วยวิเคราะห์การตัดสินใจซื้อ ("ควรซื้อหรือควรรอ?") และระบบอ่านสลิปใบเสร็จ

---

## 🎯 ขอบเขตงาน (In Scope)
1. Idea Dump & Intake Pipeline (Hash Dedup SHA256)
2. Dual Advisor Engine (Sonar vs Best)
3. Verdict Synthesis (คะแนน 3 แกน 0-5)
4. Multi-Account & Cashflow Tracker
5. Itemized Debt & Installment Tracker
6. SQLite Source of Truth & Audit Trail`,

    'AGENTS.md': `# AGENTS: Session Contract & Rules of Engagement

## 🤖 สมาชิกทีม Agent
1. Jason (1st AD / Intake Orchestrator)
2. Sonar (Fact & Feasibility Advisor)
3. Best (Devil's Advocate & Risk Advisor)
4. Verdict Synthesizer

## ⚠️ กฎเหล็กของ Agent
1. ห้ามตัดสินใจแทนเด็ดขาด (คำตัดสินสุดท้าย = นายท่าน)
2. ห้ามลบข้อมูล (No DROP / No Hard Delete)
3. บันทึกความจริงลง SOT เสมอ`,

    'SOT.md': `# SOT: Single Source of Truth
- 5 Accounts Active (Total Liquid Assets: ฿332,700)
- 3 Active Debts (Total Monthly Commitment: ฿17,390/เดือน)
- Net Worth Snapshot: ฿253,140
- DTI Ratio: ~26.7%`,

    'ROADMAP.md': `# ROADMAP: Milestones & Execution Plan
- [x] Phase 1: 8-Doc Scaffold & System Baseline
- [x] Phase 2: Database Schema & Pipeline Engine
- [x] Phase 3: React + Vite Web App & Dark Glassmorphism UI
- [x] Phase 4: Pipeline Flow & Dual Advisor Interactive UI
- [x] Phase 5: Personal Finance Modules (Multi-Account, Itemized Debt, Slip Scanner)
- [x] Phase 6: Verification & SOT Update`,

    'UX.md': `# UX: Design System & Signals
- Theme: Cyber-Financial Dark Glassmorphism
- Colors: Deep Midnight Navy, Cyan Electric (Sonar), Violet (Best), Emerald (Approved)
- Typography: Outfit & Prompt`,

    'SCHEMA.md': `# SCHEMA: SQLite Database Specification (v2)
- accounts (id, name, category, balance, currency)
- debts (id, item_name, category, total_amount, monthly_payment, remaining_installments)
- pipeline_drops (id, hash, raw_text, drop_type, amount, status)
- verdicts (id, drop_id, sonar_score, best_score, value_score, decision_final)
- transactions & audit_events`,

    'RTK.md': `# RTK: Run-Time Kernel (Bootstrap Protocol)
Order of Loading: RTK.md -> SOT.md -> ROADMAP.md -> UX.md -> AGENTS.md
WHO AM I: Jason (1st AD) + Sonar + Best
DECISION PROTOCOL: เสนอคะแนน 3 แกน และรอนายท่านเคาะชี้ขาดเสมอ`,

    'PIN_MESSAGE.md': `# 📌 PIN MESSAGE: สรุปคำสั่ง
1. ปล่อยของ: "อยากได้ [ชื่อของ] ราคา [xxx] บาท"
2. สแกนสลิป: อัปโหลดรูปสลิปเพื่อตัดยอดเงิน
3. ดูรายงาน: "สรุป Net Worth" หรือ "ดูภาระผ่อน"`
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>คลังเอกสารความจำระบบ (8-Doc Memory Scaffold)</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          สถาปัตยกรรม Memory บนไฟล์ Markdown ป้องกัน Context หลุดและเป็นฐานความรู้กลางของกองถ่าย
        </p>
      </div>

      {/* Doc Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {DOCS.map(doc => (
          <button
            key={doc.name}
            onClick={() => setSelectedDoc(doc.name)}
            className={`btn ${selectedDoc === doc.name ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '8px 14px', whiteSpace: 'nowrap' }}
          >
            {doc.icon}
            {doc.name}
          </button>
        ))}
      </div>

      {/* Markdown Content Box */}
      <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-glow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
            📄 {selectedDoc}
          </span>
          <span className="badge badge-emerald">ACTIVE SOURCE OF TRUTH</span>
        </div>

        <pre style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.9rem', 
          lineHeight: '1.7', 
          color: '#e2e8f0', 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '18px',
          borderRadius: 'var(--radius-sm)'
        }}>
          {DOC_CONTENTS[selectedDoc]}
        </pre>
      </div>

    </div>
  );
}
