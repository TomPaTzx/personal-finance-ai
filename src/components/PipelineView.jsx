import React, { useState } from 'react';
import { 
  Send, 
  Sparkles, 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  PauseCircle, 
  XCircle, 
  History, 
  Sliders, 
  Scale, 
  Bot, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { generateDedupHash, triageIntakeText } from '../services/triageEngine';
import { runDualAdvisorAnalysis } from '../services/advisorEngine';
import { addAuditEvent } from '../services/storageService';

export default function PipelineView({ sotData, updateSOTData }) {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentDrop, setCurrentDrop] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle Ingest / Drop Submission
  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsProcessing(true);
    const hash = await generateDedupHash(inputText);

    // Check Dedup
    const existing = sotData.pipelineDrops.find(d => d.hash === hash);
    if (existing) {
      alert(`⚠️ พบไอเดียนี้ในระบบแล้ว! (Dedup Hash ตรงกัน: ${hash})\nระบบจะดึงผลการวิเคราะห์เดิมขึ้นมาแสดงให้ครับ`);
      setCurrentDrop(existing);
      setIsProcessing(false);
      return;
    }

    const triageResult = triageIntakeText(inputText);
    const newDropId = `DROP-${Date.now().toString().slice(-4)}`;

    const newDrop = {
      id: newDropId,
      hash,
      rawText: inputText,
      dropType: triageResult.dropType,
      amount: triageResult.amount,
      category: triageResult.category,
      status: 'ANALYZED',
      createdAt: new Date().toISOString()
    };

    // Run Dual Advisors (Sonar & Best) + Jason
    const verdict = runDualAdvisorAnalysis(newDrop, sotData);
    newDrop.verdict = verdict;

    // Persist directly into SOT (Single Source of Truth) database & Audit Log
    const updatedDrops = [newDrop, ...(sotData.pipelineDrops || []).filter(d => d.hash !== hash)];
    let nextData = {
      ...sotData,
      pipelineDrops: updatedDrops
    };
    nextData = addAuditEvent(nextData, 'PIPELINE_DROP', newDrop.id, 'DROP_INGESTED', {
      rawText: inputText,
      dropType: triageResult.dropType,
      category: triageResult.category,
      recommendedAmount: verdict.recommendedAmount || triageResult.amount || 0
    });

    updateSOTData(nextData);
    setCurrentDrop(newDrop);
    setIsProcessing(false);
    setInputText('');
  };

  // Decision Gate Actions (Master / User Decisions)
  const handleDecision = (decisionType) => {
    if (!currentDrop) return;

    let updatedAccounts = [...sotData.accounts];
    let updatedDebts = [...sotData.debts];
    let moneySaved = sotData.moneySavedTotal || 0;
    const amount = currentDrop.amount || 0;

    if (decisionType === 'APPROVED') {
      // If purchase amount specified, deduce from Spending account or add to Debt tracker if > 15,000
      if (amount > 15000) {
        const monthly = Math.round(amount / 10);
        const newDebt = {
          id: `DEBT-${Date.now().toString().slice(-4)}`,
          itemName: currentDrop.rawText.slice(0, 30),
          category: currentDrop.category || 'GENERAL',
          totalAmount: amount,
          remainingAmount: amount,
          monthlyPayment: monthly,
          totalInstallments: 10,
          remainingInstallments: 10,
          interestRate: 0.0,
          linkedAccountId: 'ACC-04',
          status: 'ACTIVE',
          createdAt: new Date().toISOString().split('T')[0]
        };
        updatedDebts.push(newDebt);
      } else if (amount > 0) {
        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === 'ACC-02') {
            return { ...acc, balance: Math.max(0, acc.balance - amount) };
          }
          return acc;
        });
      }
    } else if (decisionType === 'REJECTED') {
      moneySaved += amount;
    }

    const updatedDrop = {
      ...currentDrop,
      status: 'DECIDED',
      verdict: {
        ...currentDrop.verdict,
        decisionFinal: decisionType,
        moneySaved: decisionType === 'REJECTED' ? amount : 0
      }
    };

    const newDrops = [updatedDrop, ...sotData.pipelineDrops.filter(d => d.id !== updatedDrop.id)];
    
    let nextData = {
      ...sotData,
      accounts: updatedAccounts,
      debts: updatedDebts,
      pipelineDrops: newDrops,
      moneySavedTotal: moneySaved
    };

    nextData = addAuditEvent(nextData, 'PIPELINE_DROP', updatedDrop.id, `DECISION_${decisionType}`, {
      amount,
      decision: decisionType,
      rawText: updatedDrop.rawText
    });

    updateSOTData(nextData);
    setCurrentDrop(updatedDrop);
  };

  // Filtered drops list
  const filteredDrops = (sotData.pipelineDrops || []).filter(drop => {
    if (filterType !== 'ALL' && drop.dropType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return drop.rawText.toLowerCase().includes(q) || (drop.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner / Ingest Box */}
      <div className="glass-panel glass-panel-glow-cyan" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #0284c7, #06b6d4)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
            }}>
              <Bot size={24} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                ปล่อยของ — Idea Dump & Financial Decision Intake
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                ผู้ช่วย Jason + 2 ที่ปรึกษา (Sonar ตรวจงบจริง vs Best เตือนสติความเสี่ยง) พร้อมสังเคราะห์คะแนน 3 แกน
              </p>
            </div>
          </div>
          <span className="badge badge-cyan">
            ⚡ SHA256 DEDUP ACTIVE
          </span>
        </div>

        {/* Input Field */}
        <form onSubmit={handleIntakeSubmit} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="โยนไอเดีย เช่น 'อยากซื้อเลนส์กล้อง 45,000 บาท ไว้รับงาน' หรือ 'อยากเปลี่ยน iPad 29,900 บาท'..."
            style={{
              flex: 1,
              padding: '14px 18px',
              background: 'rgba(7, 9, 14, 0.8)',
              border: '1px solid var(--border-glow)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              fontFamily: 'var(--font-main)'
            }}
          />
          <button 
            type="submit" 
            disabled={isProcessing || !inputText.trim()}
            className="btn btn-primary"
            style={{ padding: '0 24px', opacity: isProcessing ? 0.7 : 1 }}
          >
            {isProcessing ? <Sparkles className="animate-spin" size={18} /> : <Send size={18} />}
            {isProcessing ? 'กำลังส่ง Triage...' : 'ส่งเข้า Pipeline'}
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ตัวอย่างลองกด:</span>
          {[
            'ตอนนี้เงินโอเย็นและวันเสาร์ยังไม่เข้า แต่อยากเติมบัญชีลูกไว้สำหรับค่าผ้าอ้อมช่วยคิดหน่อยว่าเท่าไหร่ดี',
            'อยากซื้อ MacBook Pro M4 79,900 บาท ไว้ตัดต่อวิดีโอ',
            'เงินเดือนออกแล้ว ควรแบ่งเข้ากระเป๋าสำรองฉุกเฉินกี่บาทดี?',
            'อยากได้หูฟัง AirPods Max 19,900 บาท ใส่เท่ๆ'
          ].map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(sample)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
              onMouseLeave={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Active Pipeline Focus Item (If any drop analyzed) */}
      {currentDrop && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-glow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={`badge ${currentDrop.dropType === 'FINANCIAL_CONSULTATION' ? 'badge-cyan' : 'badge-purple'}`}>
                {currentDrop.dropType === 'FINANCIAL_CONSULTATION' ? '💬 ปรึกษาการเงิน & วางแผนงบประมาณ' : '🎯 CURRENT PIPELINE FOCUS'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                HASH: {currentDrop.hash}
              </span>
            </div>
            {currentDrop.verdict?.decisionFinal && (
              <span className={`badge ${
                currentDrop.verdict.decisionFinal === 'APPROVED' || currentDrop.verdict.decisionFinal === 'ADVISED' ? 'badge-emerald' :
                currentDrop.verdict.decisionFinal === 'PARKED' ? 'badge-amber' : 'badge-rose'
              }`}>
                {currentDrop.verdict.decisionFinal === 'ADVISED' ? '💡 บันทึกคำแนะนำแล้ว' :
                 currentDrop.verdict.decisionFinal === 'APPROVED' ? '✅ นายท่านอนุมัติแล้ว' :
                 currentDrop.verdict.decisionFinal === 'PARKED' ? '⏳ นายท่านสั่งพักไว้ (Wishlist)' : '❌ นายท่านปฏิเสธ (ประหยัดเงิน)'}
              </span>
            )}
          </div>

          <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', color: '#ffffff' }}>
            "{currentDrop.rawText}"
          </h3>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            <span>ยอดแนะนำ / ประมาณการ: <b style={{ color: 'var(--accent-cyan)' }}>{currentDrop.verdict?.recommendedAmount ? `฿${currentDrop.verdict.recommendedAmount.toLocaleString()}` : currentDrop.amount ? `฿${currentDrop.amount.toLocaleString()}` : 'ตามแผนจัดสรร'}</b></span>
            <span>หมวดหมู่: <b style={{ color: '#ffffff' }}>{currentDrop.category}</b></span>
            <span>ประเภท: <b style={{ color: '#ffffff' }}>{currentDrop.dropType}</b></span>
          </div>

          {/* If FINANCIAL_CONSULTATION: Render Live Financial Reality KPI Bar */}
          {currentDrop.verdict?.financialSnapshot && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '10px', 
              marginBottom: '18px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>💵 เงินสดสภาพคล่องรวมทุกบัญชี</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  ฿{currentDrop.verdict.financialSnapshot.totalLiquidCash.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>💼 เงินเดือนฐานสุทธิชลประทาน</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  ฿{currentDrop.verdict.financialSnapshot.baseNetSalary.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🔒 ภาระบิลบังคับรวม (บ้าน+หนี้+เน็ต)</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-rose)', marginTop: '2px' }}>
                  ฿{(currentDrop.verdict.financialSnapshot.homeBillNetWePay + currentDrop.verdict.financialSnapshot.myMonthlyDebt + currentDrop.verdict.financialSnapshot.kbankDirectSubs).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📈 คาดการณ์เงินโอที (เย็น+เสาร์)</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                  +฿{currentDrop.verdict.financialSnapshot.totalExpectedOt.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* If FINANCIAL_CONSULTATION: Render Coach Summary Banner */}
          {currentDrop.verdict?.coachSummary && (
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(6, 182, 212, 0.08))', 
              border: '1px solid rgba(6, 182, 212, 0.4)', 
              borderRadius: 'var(--radius-md)', 
              padding: '18px 20px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#f0f9ff', whiteSpace: 'pre-line' }}>
                {currentDrop.verdict.coachSummary}
              </div>
            </div>
          )}

          {/* Dual Advisors Debate Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            
            {/* Advisor 1: Sonar */}
            <div style={{ 
              background: 'rgba(6, 182, 212, 0.05)', 
              border: '1px solid rgba(6, 182, 212, 0.25)', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></div>
                  <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem' }}>Advisor 1: Sonar (Fact & งบจริง)</strong>
                </div>
                <span className="badge badge-cyan">
                  {currentDrop.verdict?.sonarScore || 0} / 5.0
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                {currentDrop.verdict?.sonarAnalysis}
              </p>
            </div>

            {/* Advisor 2: Best */}
            <div style={{ 
              background: 'rgba(139, 92, 246, 0.05)', 
              border: '1px solid rgba(139, 92, 246, 0.25)', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-purple)' }}></div>
                  <strong style={{ color: 'var(--accent-purple)', fontSize: '0.95rem' }}>Advisor 2: Best (จับผิด & เตือนสติ)</strong>
                </div>
                <span className="badge badge-purple">
                  {currentDrop.verdict?.bestScore || 0} / 5.0
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                {currentDrop.verdict?.bestAnalysis}
              </p>
            </div>

          </div>

          {/* 3-Axis Verdict Summary for Purchase Decisions */}
          {currentDrop.dropType !== 'FINANCIAL_CONSULTATION' && (
            <div style={{ 
              background: 'rgba(15, 23, 42, 0.8)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-md)', 
              padding: '18px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={18} color="var(--accent-amber)" />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>ผลสังเคราะห์ Verdict 3 มิติ (0-5)</span>
                </div>
                <span className={`badge ${
                  currentDrop.verdict?.overallRecommendation === 'APPROVED' ? 'badge-emerald' :
                  currentDrop.verdict?.overallRecommendation === 'CONDITIONAL' ? 'badge-amber' : 'badge-rose'
                }`}>
                  คำแนะนำ AI: {currentDrop.verdict?.overallRecommendation}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1. Feasibility (ความพร้อมเงิน)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                    {currentDrop.verdict?.sonarScore} <span style={{ fontSize: '0.75rem' }}>/ 5</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>2. Value & Need (ความคุ้มค่า)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-purple)', marginTop: '4px' }}>
                    {currentDrop.verdict?.valueScore} <span style={{ fontSize: '0.75rem' }}>/ 5</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>3. Risk & Impact (ความสบายใจ)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                    {currentDrop.verdict?.bestScore} <span style={{ fontSize: '0.75rem' }}>/ 5</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Decision Gate / Action Buttons */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '12px', 
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                {currentDrop.dropType === 'FINANCIAL_CONSULTATION' ? '📌 จัดการคำแนะนำนี้:' : '👑 คำตัดสินชี้ขาด (เฉพาะนายท่าน):'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {currentDrop.dropType === 'FINANCIAL_CONSULTATION' ? (
                <button 
                  onClick={() => handleDecision('ADVISED')} 
                  className="btn btn-primary"
                >
                  <CheckCircle2 size={16} /> บันทึกคำแนะนำนี้เข้าคลัง (Save Note)
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => handleDecision('APPROVED')} 
                    className="btn btn-success"
                  >
                    <CheckCircle2 size={16} /> อนุมัติ (Action / สั่งซื้อ)
                  </button>
                  <button 
                    onClick={() => handleDecision('PARKED')} 
                    className="btn btn-warning"
                  >
                    <PauseCircle size={16} /> พักไว้ (Parked / ดูใจ 14 วัน)
                  </button>
                  <button 
                    onClick={() => handleDecision('REJECTED')} 
                    className="btn btn-danger"
                  >
                    <XCircle size={16} /> ปฏิเสธ (ตัดกิเลส / บันทึกเงินที่ประหยัด)
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {/* History & Drops Archive Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>คลังประวัติการปล่อยของ & ปรึกษา (SQLite Source of Truth)</h3>
            <span className="badge badge-cyan">{filteredDrops.length} รายการ</span>
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="🔍 FTS5 ค้นหาข้อความ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '6px 12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="FINANCIAL_CONSULTATION">ปรึกษาวางแผนการเงิน</option>
              <option value="PURCHASE_DECISION">ปรึกษาซื้อของ</option>
              <option value="SLIP_RECEIPT">สลิป / ใบเสร็จ</option>
              <option value="INCOME_LOG">รายรับ</option>
            </select>
          </div>
        </div>

        {/* Drops List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredDrops.map((drop) => {
            const isApproved = drop.verdict?.decisionFinal === 'APPROVED';
            const isParked = drop.verdict?.decisionFinal === 'PARKED';
            const isRejected = drop.verdict?.decisionFinal === 'REJECTED';

            return (
              <div 
                key={drop.id}
                onClick={() => setCurrentDrop(drop)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'var(--border-glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {drop.hash}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#f8fafc' }}>
                      {drop.rawText}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(drop.createdAt).toLocaleDateString('th-TH')} • {drop.category}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {drop.amount > 0 && (
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      ฿{drop.amount.toLocaleString()}
                    </span>
                  )}
                  <span className={`badge ${
                    isApproved ? 'badge-emerald' :
                    isParked ? 'badge-amber' :
                    isRejected ? 'badge-rose' : 'badge-purple'
                  }`}>
                    {isApproved ? 'อนุมัติ' : isParked ? 'พักไว้' : isRejected ? 'ปฏิเสธ' : 'รอตัดสินใจ'}
                  </span>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
