import React, { useState } from 'react';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ShieldCheck, 
  PieChart, 
  Award, 
  Archive, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  BookOpen, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Sparkles,
  Smartphone,
  Trophy,
  Check
} from 'lucide-react';
import { addAuditEvent } from '../services/storageService';

export default function MonthlyHistoryAndCoach({ sotData, updateSOTData }) {
  const [viewMode, setViewMode] = useState('MONTHLY'); // 'MONTHLY' or 'ANNUAL'
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [filterType, setFilterType] = useState('ALL');

  // Monthly snapshots ledger
  const monthlySnapshots = sotData.monthlySnapshots || [
    {
      id: 'SNAP-2026-08',
      monthKey: '2026-08',
      monthLabel: 'สิงหาคม 2026',
      totalIncome: 31850.32,
      baseSalary: 17993.32,
      otCash: 7400.00,
      familyReimbursed: 6457.00,
      totalExpenses: 22422.51,
      netSavings: 9427.81,
      personalDebtsRemaining: 13348.64,
      netWorth: 66085.68,
      isClosed: true,
      coachVerdict: 'รวยขึ้น (Good Health)',
      expensesBreakdown: [
        { name: 'ค่าไฟบ้าน (ตัดบัตรแม่)', amount: 3752.67, type: 'VARIABLE', note: 'ค่าไฟหน้าร้อน/ใช้แอร์เยอะ (ผันแปรขึ้นลง)' },
        { name: 'ค่าข้าวเช้า-กลางวันแม่', amount: 2000.00, type: 'FIXED', note: 'ค่ากับข้าวเหมาจ่ายคงที่' },
        { name: 'ค่าโปรมือถือ & เน็ตบ้าน', amount: 1426.31, type: 'FIXED', note: 'ค่าบริการรายเดือนคงที่' },
        { name: 'ค่าดูหนังกับครอบครัว', amount: 609.00, type: 'ONE_OFF', note: '⚠️ ค่าใช้จ่ายเฉพาะเดือนนี้ (ครั้งเดียวจบ)' },
        { name: 'ค่าน้ำประปา', amount: 315.31, type: 'VARIABLE', note: 'ค่าน้ำผันแปรตามการใช้จริง' },
        { name: 'ค่าประกันอุบัติเหตุ', amount: 680.00, type: 'FIXED', note: 'เบี้ยประกันประจำเดือน' },
        { name: 'กระเป๋าเก็บน้ำนม B-KOOL (ลูก)', amount: 2732.00, type: 'ONE_OFF', note: '⚠️ ซื้อครั้งเดียวจบ (แจงโอนจ่ายคืนเรา)' },
        { name: 'ผ้าอ้อม Merries & น้ำยา D-nee', amount: 848.00, type: 'VARIABLE', note: 'ของใช้ลูก (แจงโอนคืนเรา)' },
        { name: 'ใบปัดน้ำฝน Nissan March', amount: 336.00, type: 'ONE_OFF', note: '⚠️ ซ่อมบำรุงรถครั้งเดียวจบ' },
        { name: 'กริ่งไร้สาย HOCO', amount: 279.00, type: 'ONE_OFF', note: '⚠️ ของใช้บ้านครั้งเดียวจบ' },
        { name: 'ค่างวด SPayLater ส่วนตัว 8 ชิ้น', amount: 2807.43, type: 'FIXED', note: 'G29, หมอน Becell, Cuktech, หมวก (อีก 2 ด. ปลดล็อก 965)' },
        { name: 'Digital Subs (YT, Google, Netflix)', amount: 541.00, type: 'FIXED', note: 'บริการรายเดือน' },
        { name: 'ประกันสังคม ม.39', amount: 432.00, type: 'FIXED', note: 'สวัสดิการ ม.39' }
      ]
    },
    {
      id: 'SNAP-2026-07',
      monthKey: '2026-07',
      monthLabel: 'กรกฎาคม 2026',
      totalIncome: 29800.00,
      baseSalary: 17993.32,
      otCash: 6000.00,
      familyReimbursed: 5800.00,
      totalExpenses: 21800.00,
      netSavings: 8000.00,
      personalDebtsRemaining: 16156.07,
      netWorth: 58000.00,
      isClosed: true,
      coachVerdict: 'รวยขึ้น (Good Health)',
      expensesBreakdown: [
        { name: 'ค่าไฟบ้าน', amount: 3420.00, type: 'VARIABLE', note: 'ค่าไฟเดือน ก.ค.' },
        { name: 'ค่ากับข้าวแม่', amount: 2000.00, type: 'FIXED', note: 'ค่ากับข้าวเหมาจ่าย' },
        { name: 'ค่างวด SPayLater ส่วนตัว', amount: 2807.43, type: 'FIXED', note: 'ค่างวดปกติ' },
        { name: 'ซื้อเสื้อผ้าทำงาน', amount: 890.00, type: 'ONE_OFF', note: '⚠️ ค่าใช้จ่ายชั่วคราว' }
      ]
    }
  ];

  const currentSnapshot = monthlySnapshots.find(s => s.monthKey === selectedMonth) || monthlySnapshots[0];

  const filteredExpenses = currentSnapshot.expensesBreakdown.filter(item => {
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  const fixedTotal = currentSnapshot.expensesBreakdown.filter(i => i.type === 'FIXED').reduce((s, i) => s + i.amount, 0);
  const variableTotal = currentSnapshot.expensesBreakdown.filter(i => i.type === 'VARIABLE').reduce((s, i) => s + i.amount, 0);
  const oneOffTotal = currentSnapshot.expensesBreakdown.filter(i => i.type === 'ONE_OFF').reduce((s, i) => s + i.amount, 0);

  const savingsRatio = ((currentSnapshot.netSavings / currentSnapshot.totalIncome) * 100).toFixed(1);
  const dtiRatio = ((2807.43 / 17993.32) * 100).toFixed(1);
  const oneOffRatio = ((oneOffTotal / currentSnapshot.totalExpenses) * 100).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner - Philosophy & View Toggle */}
      <div className="glass-panel glass-panel-glow-cyan" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={24} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                วิเคราะห์สุขภาพการเงิน & สรุปภาพรวมสิ้นปี (Money Coach Framework)
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              ตามแนวคิดโค้ชหนุ่ม จักรพงษ์ เมษพันธุ์: "เรารวยขึ้นหรือจนลง วัดที่ความมั่งคั่งสุทธิที่เพิ่มขึ้น และการแยกแยะรายจ่ายชั่วคราวออกจากรายจ่ายถาวร"
            </p>
          </div>

          {/* Toggle View: Monthly vs Annual */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setViewMode('MONTHLY')}
              className={`btn ${viewMode === 'MONTHLY' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              <Calendar size={15} /> 📅 ประจำเดือน
            </button>
            <button
              onClick={() => setViewMode('ANNUAL')}
              className={`btn ${viewMode === 'ANNUAL' ? 'btn-warning' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              <Trophy size={15} /> 🏆 สรุปภาพรวมสิ้นปี (Year-End Review)
            </button>
          </div>
        </div>

        {/* Mobile / Wi-Fi Access Quick Banner */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.85rem', color: '#fff' }}>
              📱 <b>เปิดดูผ่านมือถือ/แท็บเล็ตในบ้านได้ทันที:</b> เข้าผ่านเบราว์เซอร์มือถือที่ <code style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>http://192.168.1.198:5173/</code> (เชื่อมต่อ Wi-Fi เดียวกัน)
            </span>
          </div>
          <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>✅ พร้อมใช้งานบนมือถือ</span>
        </div>
      </div>

      {/* VIEW 1: ANNUAL YEAR-END FINANCIAL REVIEW */}
      {viewMode === 'ANNUAL' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Annual Scorecard */}
          <div className="glass-panel glass-panel-glow-purple" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div>
                <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>Annual Review 2026</span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                  🏆 สรุปสุขภาพการเงิน & ความมั่งคั่งสุทธิประจำปี 2026
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>เกรดสุขภาพการเงิน</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>GRADE A</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>รายรับจริงสะสมทั้งปี (Gross Annual Inflow)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '4px 0' }}>
                  ฿382,200
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  เงินเดือนฐาน ฿215k + เงินสดโอเย็น/เสาร์ ฿90k + ยอดโอนคืน ฿77k
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>รายจ่ายจริงสะสมทั้งปี (Total Annual Outflow)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                  ฿268,500
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  บิลบ้าน/แม่ ฿105k + ผ่อนของ ฿35k + กินแซ่บ & ของลูก
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>เงินออมสะสมสุทธิประจำปี (Annual Net Savings)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)', margin: '4px 0' }}>
                  +฿113,700
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  🟢 สะสมใน Kept น้องพีเจ ฿25k+ และกระเป๋า 4 ฉุกเฉิน
                </div>
              </div>

              <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)' }}>ยอดหนี้สินที่ปลดล็อกสำเร็จใน 1 ปี</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-purple)', margin: '4px 0' }}>
                  -฿38,400
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  🎉 ปลดหนี้หูฟัง Sony, Cuktech, หมวกกันน็อก, ปลั๊กไฟ
                </div>
              </div>

            </div>
          </div>

          {/* Year-End Family Discussion Guide */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Sparkles size={20} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                💬 หัวข้อสรุปทางการเงินสิ้นปีสำหรับคุยกับครอบครัว (แจง & แม่):
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#f8fafc', lineHeight: '1.6' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                <b>1. พิสูจน์ความมั่งคั่ง:</b> สิ้นปีนี้เรา <b>"รวยขึ้นจริง"</b> เพราะหนี้สินส่วนตัวลดลงไปกว่า ฿38,000 และมีเงินเก็บสะสมใน Kept น้องพีเจเตรียมไว้สำหรับค่าเทอมปีหน้า
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                <b>2. การคุมค่าใช้จ่ายบ้าน:</b> ค่าไฟบ้านที่แจงช่วยออกเดือนละ ฿2,000 ช่วยให้กระแสเงินสดในบ้านสมดุลมาก ไม่ตึงมือแม้ในเดือนที่แอร์ทำงานหนัก
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                <b>3. แผนปีหน้า (2027):</b> เมื่องวดผ่อนพวงมาลัย G29 และหมอน Becell จบลง เราจะมีเงินสดอิสระเพิ่มขึ้นอีกเดือนละ ฿1,300 เพื่อนำไปเร่งสะสมกองทุนการศึกษาน้องพีเจให้เต็ม ฿50,000 ครับ!
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: MONTHLY SNAPSHOT VIEW */}
      {viewMode === 'MONTHLY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Month Selector Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                รอบบัญชี: {currentSnapshot.monthLabel}
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>เลือกรอบเดือน:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid var(--border-glow)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--accent-cyan)',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                {monthlySnapshots.map(s => (
                  <option key={s.monthKey} value={s.monthKey}>{s.monthLabel}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 4 Health Diagnostic Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>1. ทิศทางความมั่งคั่งสุทธิ</span>
                <ArrowUpRight size={16} color="var(--accent-emerald)" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', margin: '4px 0' }}>
                +฿8,085.68
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                🟢 <b>รวยขึ้นจริง</b> (หนี้ลดลง + มีเงินสะสมใน Kept)
              </div>
            </div>

            <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>2. อัตราการออมสุทธิ (Savings Rate)</span>
                <Award size={16} color="var(--accent-cyan)" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '4px 0' }}>
                {savingsRatio}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                เกณฑ์โค้ชหนุ่ม: {parseFloat(savingsRatio) >= 20 ? '✅ ยอดเยี่ยม (> 20%)' : '🟡 พอใช้ (> 10%)'}
              </div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 600 }}>3. ภาระหนี้ส่วนตัว (Personal DTI)</span>
                <ShieldCheck size={16} color="var(--accent-amber)" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)', margin: '4px 0' }}>
                {dtiRatio}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ฿2,807/ด. เทียบเงินเดือนฐาน ฿17,993 (เกณฑ์ปลอดภัย &lt; 35%)
              </div>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600 }}>4. สัดส่วนรายจ่ายครั้งเดียว (One-Off)</span>
                <Zap size={16} color="var(--accent-purple)" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)', margin: '4px 0' }}>
                ฿{oneOffTotal.toLocaleString()} ({oneOffRatio}%)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ค่าใช้จ่ายชั่วคราวที่ไม่เกิดซ้ำในเดือนหน้า
              </div>
            </div>

          </div>

          {/* 3 Expense Classification Buckets */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                  🔍 แยกแยะรายจ่ายเดือน {currentSnapshot.monthLabel}: อะไรถาวร vs อะไรชั่วคราว?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  ช่วยให้เห็นชัดว่าเดือนนี้เงินออกเยอะเพราะ "ของชั่วคราว (One-off)" หรือ "ภาระถาวร"
                </p>
              </div>

              {/* Filter Type Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'ALL', label: 'ทั้งหมด' },
                  { id: 'ONE_OFF', label: `⚠️ ชั่วคราวเฉพาะเดือนนี้ (฿${oneOffTotal.toLocaleString()})` },
                  { id: 'VARIABLE', label: `⚡ ผันแปรตามจริง (฿${variableTotal.toLocaleString()})` },
                  { id: 'FIXED', label: `🔒 ประจำคงที่ (฿${fixedTotal.toLocaleString()})` }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    className={`btn ${filterType === f.id ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expense Items Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredExpenses.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: item.type === 'ONE_OFF' ? 'rgba(244, 63, 94, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                    border: item.type === 'ONE_OFF' ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge ${
                      item.type === 'ONE_OFF' ? 'badge-rose' : item.type === 'VARIABLE' ? 'badge-amber' : 'badge-cyan'
                    }`} style={{ fontSize: '0.7rem' }}>
                      {item.type === 'ONE_OFF' ? '⚠️ ชั่วคราว' : item.type === 'VARIABLE' ? '⚡ ผันแปร' : '🔒 คงที่'}
                    </span>
                    <div>
                      <strong style={{ fontSize: '0.92rem', color: '#fff' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.note}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.05rem', color: item.type === 'ONE_OFF' ? 'var(--accent-rose)' : '#fff' }}>
                      ฿{item.amount.toLocaleString()}
                    </strong>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.type === 'ONE_OFF' ? 'เดือนหน้าไม่มีรายการนี้' : 'มีในเดือนถัดไป'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coach Somkid Advice Box */}
            <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)', padding: '18px', marginTop: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <BookOpen size={22} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>
                  💡 สรุปการวินิจฉัยสุขภาพการเงินจาก Money Coach:
                </strong>
                <p style={{ fontSize: '0.82rem', color: '#f8fafc', lineHeight: '1.6', margin: 0 }}>
                  • ในเดือน {currentSnapshot.monthLabel} คุณมีรายจ่ายชั่วคราว (One-off) เช่น <b>กระเป๋า B-KOOL ฿2,732 (แจงจ่ายคืน)</b>, <b>ค่าดูหนัง ฿609</b>, และ <b>ใบปัดน้ำฝน ฿336</b> รวม <b>฿{oneOffTotal.toLocaleString()}</b> ซึ่ง <b>เดือนหน้าจะไม่มีรายการพวกนี้แล้ว!</b><br />
                  • ค่าไฟบ้าน (฿3,752.67) เป็นค่าใช้จ่ายผันแปรตามสภาพอากาศ หน้าร้อน/เปิดแอร์เยอะจะสูง แต่หน้าหนาว/ฝนจะลดลง<br />
                  • 👉 <b>สรุป: คุณกำลัง "รวยขึ้นอย่างมั่นคง"</b> เพราะหนี้สินส่วนตัวเหลือเพียง ฿2,807/ด. และอีก 2 เดือนจะปลดล็อกเงินสดเพิ่มอีกเกือบ ฿1,000/ด. เข้ากระเป๋าเงินออมครับ!
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
