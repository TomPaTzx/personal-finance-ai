import React, { useState } from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  PiggyBank, 
  Award, 
  Activity, 
  AlertTriangle,
  Flame,
  CheckCircle2,
  Users,
  UserCheck,
  FileText,
  DollarSign,
  Layers,
  HelpCircle
} from 'lucide-react';

export default function NetWorthDashboard({ sotData }) {
  const [showAccountingExplainer, setShowAccountingExplainer] = useState(false);
  const accounts = sotData.accounts || [];
  const debts = sotData.debts || [];
  const bnplItems = sotData.bnplItems || [];
  const familyList = sotData.familySettlements || [];

  // 1. Liquid Cash / Bank Deposits (Exclude credit lines like SPayLater)
  const liquidCash = accounts
    .filter(a => a.id !== 'SPAYLATER')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  // 2. Accounts Receivable (ลูกหนี้เงินยืม / สิทธิเรียกร้องรอรับเงินคืนจากผู้อื่น)
  // 2.1 From Long-term Installments (แท็บเล็ต UOB พี่แพร)
  const receivableInstallments = debts
    .filter(d => d.owner !== 'ตัวเอง' && d.owner !== 'บ้าน')
    .reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

  // 2.2 From BNPL (ของที่คนอื่นฝากซื้อ Shopee VIP ที่ยังไม่ได้จ่ายคืน)
  const receivableBnpl = bnplItems
    .filter(i => i.owner !== 'ตัวเอง' && i.owner !== 'บ้าน' && !i.isPaidBack)
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  // 2.3 From Family Hub (ยอดที่ครอบครัวต้องโอนคืนเรา)
  const familyReceivables = familyList.reduce((sum, person) => {
    const theyOwe = person.items.filter(i => i.type === 'THEY_OWE' && i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
    return sum + theyOwe;
  }, 0);

  const totalReceivables = receivableInstallments + receivableBnpl;
  const totalAssetsWithReceivables = liquidCash + totalReceivables;

  // 3. Total Liabilities (หนี้สินตามกฎหมายทั้งหมดต่อสถาบันการเงิน)
  const myPersonalDebts = debts.filter(d => d.owner === 'ตัวเอง' || d.owner === 'บ้าน');
  const proxyDebts = debts.filter(d => d.owner !== 'ตัวเอง' && d.owner !== 'บ้าน');

  const myPersonalLiabilities = myPersonalDebts.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
  const proxyLiabilities = proxyDebts.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
  const totalLegalLiabilities = myPersonalLiabilities + proxyLiabilities;

  // 4. Net Worth in Accounting Standard
  // Assets (Cash + Receivables) - Liabilities (Personal + Proxy)
  // (Note: Proxy Debt cancel out with Receivables -> Net Worth = LiquidCash - myPersonalLiabilities)
  const accountingNetWorth = totalAssetsWithReceivables - totalLegalLiabilities;

  // Monthly Debt Service
  const myMonthlyDebt = myPersonalDebts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const proxyMonthlyDebt = proxyDebts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const totalMonthlyBilled = myMonthlyDebt + proxyMonthlyDebt;

  const monthlySalaryNet = 17993.32; // Real Chonprathanwittaya net base salary
  const myDtiRatio = ((myMonthlyDebt / monthlySalaryNet) * 100).toFixed(1);

  const emergencyFund = accounts.find(a => a.id === 'KBANK-EMERG')?.balance || 0;
  const monthlyEssentialExpense = 6500;
  const emergencyFundMonths = monthlyEssentialExpense > 0 ? (emergencyFund / monthlyEssentialExpense).toFixed(1) : '0';

  const moneySavedTotal = sotData.moneySavedTotal || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top 3 Core Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Net Worth Card */}
        <div className="glass-panel glass-panel-glow-emerald" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ความมั่งคั่งสุทธิตามงบการเงิน (Net Worth)</span>
            <TrendingUp size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: accountingNetWorth >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
            ฿{accountingNetWorth.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            สินทรัพย์รวม (เงินสด + ลูกหนี้) ฿{totalAssetsWithReceivables.toLocaleString()} − หนี้สินรวม ฿{totalLegalLiabilities.toLocaleString()}
          </div>
        </div>

        {/* Real DTI Ratio */}
        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ภาระหนี้ตัวเองต่อเงินเดือนฐาน (DTI)</span>
            <Activity size={20} color={parseFloat(myDtiRatio) < 30 ? 'var(--accent-cyan)' : 'var(--accent-amber)'} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: parseFloat(myDtiRatio) < 30 ? 'var(--accent-cyan)' : 'var(--accent-amber)' }}>
            {myDtiRatio}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            ค่างวดของตัวเอง ฿{myMonthlyDebt.toLocaleString()} / เงินเดือนฐาน ฿{monthlySalaryNet.toLocaleString()}
          </div>
        </div>

        {/* Money Saved Scoreboard */}
        <div className="glass-panel glass-panel-glow-purple" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>เงินที่ประหยัดได้ (Money Saved)</span>
            <Award size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
            ฿{moneySavedTotal.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            จากการดึงสติผ่านตัวกรองของ Best & Sonar
          </div>
        </div>

      </div>

      {/* Formal Personal Balance Sheet (งบแสดงฐานะการเงินส่วนบุคคล) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              งบแสดงฐานะการเงินส่วนบุคคล (Personal Balance Sheet)
            </h3>
          </div>
          <button 
            onClick={() => setShowAccountingExplainer(!showAccountingExplainer)}
            className="btn btn-outline" 
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <HelpCircle size={14} /> {showAccountingExplainer ? 'ซ่อนคำอธิบายทางบัญชี' : 'ดูหลักการลงบัญชี'}
          </button>
        </div>

        {showAccountingExplainer && (
          <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid var(--border-glow)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem', lineHeight: '1.5', color: '#f8fafc' }}>
            <strong>💡 หลักการทางบัญชีสากล (Double-Entry Bookkeeping):</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '20px' }}>
              <li><b>หนี้สินตามกฎหมาย (Legal Liability)</b>: เราเป็นลูกหนี้ของธนาคาร UOB (฿1,991.67) เพราะเป็นชื่อบัตรเรา</li>
              <li><b>ลูกหนี้การค้า/เงินยืม (Accounts Receivable)</b>: ในเวลาเดียวกัน เราเกิดสิทธิเรียกร้องให้พี่แพรจ่ายคืนเรา (฿1,991.67) ซึ่งถือเป็นสินทรัพย์</li>
              <li>⚖️ <b>ผลต่อ Net Worth</b>: สองยอดนี้ <b>หักล้างกันพอดี (Net Effect = 0)</b> จึงไม่ทำให้ความมั่งคั่งสุทธิลดลงครับ</li>
            </ul>
          </div>
        )}

        {/* 2 Column Balance Sheet Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* Column 1: Assets (สินทรัพย์) */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                🟢 1. สินทรัพย์ทั้งหมด (Total Assets)
              </span>
              <strong style={{ fontSize: '1.2rem', color: '#fff' }}>
                ฿{totalAssetsWithReceivables.toLocaleString()}
              </strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>• เงินสด & เงินฝากในธนาคาร (Liquid Cash)</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>฿{liquidCash.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>• ลูกหนี้เงินยืมผ่อนแท็บเล็ต (พี่แพร)</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>+฿{receivableInstallments.toLocaleString()}</span>
              </div>

              {receivableBnpl > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>• ยอดรอเก็บคืนฝากซื้อ VIP Shopee (BNPL)</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>+฿{receivableBnpl.toLocaleString()}</span>
                </div>
              )}

            </div>
          </div>

          {/* Column 2: Liabilities (หนี้สิน) */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                🔴 2. หนี้สินทั้งหมด (Total Liabilities)
              </span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--accent-rose)' }}>
                ฿{totalLegalLiabilities.toLocaleString()}
              </strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>• หนี้ส่วนตัวจริง (Sony, G29, หมอน Becell ฯลฯ)</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>-฿{myPersonalLiabilities.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>• หนี้ผ่อนแทนผู้อื่นตามกฎหมาย (แท็บเล็ต UOB)</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>-฿{proxyLiabilities.toLocaleString()}</span>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Emergency Fund & Health Diagnostics */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
          🩺 การวินิจฉัยสุขภาพการเงิน (Financial Health Diagnostics)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Emergency Fund Gauge */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '18px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>เงินสำรองฉุกเฉิน / ปิดเทอม (KBANK-EMERG)</span>
              <span className="badge badge-emerald">{emergencyFundMonths} เดือน</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
              ฿{emergencyFund.toLocaleString()}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              ครอบคลุมค่าใช้จ่ายจำเป็นได้ประมาณ {emergencyFundMonths} เดือน สำหรับรองรับช่วงปิดเทอมที่ไม่มีโอเย็น
            </p>
          </div>

          {/* Active Debt Progress */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '18px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>ข่าวดีเรื่องการปลดหนี้ (Debt Freedom Timeline)</span>
              <span className="badge badge-emerald">ใกล้หมด 3 ชิ้น</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '8px' }}>
              ปลดล็อก ฿3,336 / เดือน ในอีก 2 งวด!
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              หูฟัง Sony (฿2,370), พาวเวอร์แบงก์ Cuktech (฿577) และหมวกกันน็อก (฿388) จะผ่อนหมดในงวดหน้า ทำให้ภาระผ่อนลดลงฮวบๆ ทันที!
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
