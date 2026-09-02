import React, { useState, useMemo, useRef } from 'react';
import { 
  TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, 
  Calendar, Zap, Coffee, ChevronRight, ArrowUpRight, ArrowDownRight, 
  HelpCircle, Sliders, RefreshCw, Sun, Umbrella, GraduationCap, Moon,
  Edit3, Wallet, CreditCard, ArrowRight, X, Check
} from 'lucide-react';
import { simulateCashflow, isAcademicTermBreak } from '../services/cashflowSimulator';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function CashflowSimulatorView({ sotData, updateSOTData, setActiveTab }) {
  const { toast } = useModalNotification();
  const otPlannerRef = useRef(null);

  const [selectedDays, setSelectedDays] = useState(30); // 30, 60, 90
  const [prepayMode, setPrepayMode] = useState(true); // User's real habit
  const [isTermBreak, setIsTermBreak] = useState(false);
  const [familySettlementDay, setFamilySettlementDay] = useState(31); // User insight: e.g. 31st at 21:18
  const [spayPrepayDay, setSpayPrepayDay] = useState(2); // User insight: e.g. 2nd of month

  // Real Teacher OT State (September has 3 Saturdays, evening OT is variable)
  const [saturdayOtCount, setSaturdayOtCount] = useState(3);
  const [saturdayOtRate, setSaturdayOtRate] = useState(1000);
  const [customSaturdayTotal, setCustomSaturdayTotal] = useState(''); // Direct manual input if user already calculated

  const [eveningOtCount, setEveningOtCount] = useState(19); // User confirmed: 19 days in September
  const [eveningOtRate, setEveningOtRate] = useState(200); // 19 days x ฿200 = ฿3,800
  const [customEveningLumpSum, setCustomEveningLumpSum] = useState('3800'); // User confirmed: ฿3,800

  // Smart OT Allocation State (กลยุทธ์จัดสรรเงินโอทีเมื่อเงินออก)
  const [otStrategy, setOtStrategy] = useState('MOM_SHIELD'); // 'MOM_SHIELD' | 'CUSTOM'
  const [isMergedFunBucket, setIsMergedFunBucket] = useState(true); // User insight: รวบกระเป๋าซื้อของ (เกม/แกดเจ็ต) + กินบุฟเฟ่ต์ เข้าด้วยกัน
  const [mergedFunAmount, setMergedFunAmount] = useState(2800); // ฿2,800 สำหรับบุฟเฟ่ต์ + เกม
  const [momShieldAmount, setMomShieldAmount] = useState(2500); // สำรองปิดเทอมเพื่อไม่ต้องดึงเงินสหกรณ์
  const [babyPjSavings, setBabyPjSavings] = useState(1500); // ค่าใช้จ่ายลูกน้องพีเจ
  const [selfEmergencySavings, setSelfEmergencySavings] = useState(1000); // สำรองฉุกเฉินตัวเอง
  const [wishlistSavings, setWishlistSavings] = useState(1000); // ซื้อของที่อยากได้
  const [monthlyFixedBills, setMonthlyFixedBills] = useState(11955); // Dynamic monthly bills (ผันแปรตามค่าไฟ/ค่างวดที่ทยอยหมด)

  // Quick Wallet Balances Editor Modal State
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [tempBalances, setTempBalances] = useState({});

  // Current real-world date inspection
  const today = useMemo(() => new Date(), []);
  const todayFormatted = useMemo(() => {
    return today.toLocaleDateString('th-TH', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }, [today]);

  const isCurrentInBreak = useMemo(() => isAcademicTermBreak(today), [today]);

  const effectiveEveningTotal = customEveningLumpSum !== '' ? (parseFloat(customEveningLumpSum) || 0) : (eveningOtCount * eveningOtRate);
  const effectiveSaturdayTotal = customSaturdayTotal !== '' ? (parseFloat(customSaturdayTotal) || 0) : (saturdayOtCount * saturdayOtRate);

  const simulation = useMemo(() => {
    return simulateCashflow(sotData, {
      days: selectedDays,
      prepayMode,
      isTermBreak,
      familySettlementDay,
      spayPrepayDay,
      saturdayOtCount,
      saturdayOtRate,
      saturdayTotalOverride: customSaturdayTotal !== '' ? (parseFloat(customSaturdayTotal) || 0) : null,
      eveningOtCount,
      eveningOtRate,
      eveningLumpSumOverride: customEveningLumpSum !== '' ? (parseFloat(customEveningLumpSum) || 0) : null
    });
  }, [sotData, selectedDays, prepayMode, isTermBreak, familySettlementDay, spayPrepayDay, saturdayOtCount, saturdayOtRate, customSaturdayTotal, eveningOtCount, eveningOtRate, customEveningLumpSum]);

  const { dailyTimeline, pinchPoints, proactiveDirectives, summary } = simulation;
  const totalOtEstimate = effectiveSaturdayTotal + effectiveEveningTotal;

  // Open Quick Balance Editor
  const handleOpenBalanceModal = () => {
    const balances = {};
    (sotData.accounts || []).forEach(acc => {
      balances[acc.id] = acc.balance;
    });
    setTempBalances(balances);
    setShowBalanceModal(true);
  };

  // Save Quick Balances to SOT
  const handleSaveBalances = () => {
    if (!updateSOTData) return;
    const updatedAccounts = (sotData.accounts || []).map(acc => {
      if (tempBalances[acc.id] !== undefined) {
        return {
          ...acc,
          balance: parseFloat(tempBalances[acc.id]) || 0,
          updatedAt: new Date().toISOString()
        };
      }
      return acc;
    });
    updateSOTData({ ...sotData, accounts: updatedAccounts });
    toast('💾 อัปเดตยอดเงินในกระเป๋าจริงเรียบร้อยแล้ว!', { type: 'success' });
    setShowBalanceModal(false);
  };

  const scrollToOtPlanner = () => {
    otPlannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Header Banner & Real-time Date Status */}
      <div className="glass-panel glass-panel-glow-purple" style={{ padding: '24px', position: 'relative' }}>
        
        {/* Real-time date bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'rgba(0, 0, 0, 0.4)', 
          padding: '8px 14px', 
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={15} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
              วันที่เปิดระบบพยากรณ์จริง: <strong style={{ color: 'var(--accent-cyan)' }}>{todayFormatted}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraduationCap size={15} color={isCurrentInBreak ? 'var(--accent-amber)' : 'var(--accent-emerald)'} />
            <span style={{ fontSize: '0.82rem', color: isCurrentInBreak ? 'var(--accent-amber)' : 'var(--accent-emerald)', fontWeight: 600 }}>
              {isCurrentInBreak 
                ? '🏖️ สถานะ: อยู่ในช่วงปิดเทอม (โอทีหยุด)' 
                : '📚 สถานะ: ภาคเรียนที่ 1 กำลังเปิดเทอม (มีโอทีเสาร์ & โอเย็น)'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={24} color="var(--accent-purple)" />
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                🔮 เครื่องจำลองกระแสเงินสดอัจฉริยะ (Proactive Cashflow Simulator)
              </h1>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              พยากรณ์เงินสดล่วงหน้า 30-90 วัน เชื่อมต่อปฏิทินโรงเรียนชลประทาน + โอทีครูตามชีวิตจริง + เคลียร์หนี้ล่วงหน้า
            </p>
          </div>

          {/* Simulation Horizon Switcher */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            {[30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setSelectedDays(d)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: selectedDays === d ? 'var(--accent-purple)' : 'transparent',
                  color: selectedDays === d ? '#fff' : 'var(--text-muted)',
                  fontWeight: selectedDays === d ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
              >
                {d} วัน {d === 30 ? '(เดือนนี้)' : d === 60 ? '(2 เดือน)' : '(ไตรมาส)'}
              </button>
            ))}
          </div>
        </div>

        {/* Real Behavior Toggles */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          
          {/* Pre-pay Toggle */}
          <button
            onClick={() => setPrepayMode(!prepayMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '20px',
              border: `1px solid ${prepayMode ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.15)'}`,
              background: prepayMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.3)',
              color: prepayMode ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <Zap size={15} color={prepayMode ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
            โหมดจ่ายหนี้ล่วงหน้าทันที (Peace of Mind): {prepayMode ? 'เปิดใช้งาน ✅' : 'ปิด (รอวันที่ 10)'}
          </button>

          {/* Term Break Toggle */}
          <button
            onClick={() => setIsTermBreak(!isTermBreak)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '20px',
              border: `1px solid ${isTermBreak ? 'var(--accent-amber)' : 'rgba(255, 255, 255, 0.15)'}`,
              background: isTermBreak ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 0, 0, 0.3)',
              color: isTermBreak ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            {isTermBreak ? <Sun size={15} color="var(--accent-amber)" /> : <Umbrella size={15} color="var(--text-muted)" />}
            จำลองช่วงปิดเทอม (ไม่มีโอทีสอนพิเศษ): {isTermBreak ? 'เปิดจำลอง 🏖️' : 'เปิดเทอมปกติ 📚'}
          </button>
        </div>

        {/* Teacher OT Planner Panel (September 3 Saturdays + Variable Evening OT) */}
        <div 
          ref={otPlannerRef}
          id="teaching-ot-planner"
          style={{ 
            marginTop: '16px',
            background: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                แผนโอทีครูเดือนนี้ (Teaching OT Planner)
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
              รวมโอทีคาดการณ์เดือนนี้: <strong style={{ color: 'var(--accent-cyan)', fontSize: '1rem' }}>฿{totalOtEstimate.toLocaleString()}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            
            {/* Saturday OT Selector */}
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  📚 วันเสาร์ที่สอนจริงในเดือนนี้:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>เสาร์ละ ฿</span>
                  <input
                    type="number"
                    value={saturdayOtRate}
                    onChange={(e) => setSaturdayOtRate(parseFloat(e.target.value) || 0)}
                    style={{ width: '65px', padding: '2px 4px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '3px', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                {[0, 1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSaturdayOtCount(num)}
                    style={{
                      flex: 1,
                      padding: '5px',
                      borderRadius: '4px',
                      border: `1px solid ${saturdayOtCount === num ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: saturdayOtCount === num ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                      color: saturdayOtCount === num ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: saturdayOtCount === num ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {num} {num === 3 ? '(ก.ย. มี 3 เสาร์)' : 'เสาร์'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>*รอบจ่าย: ออกทุก 2 เสาร์ (ไม่ใช่วันต่อวัน)</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  คำนวณ: ฿{(saturdayOtCount * saturdayOtRate).toLocaleString()}
                </span>
              </div>

              {/* Direct Total Input for Saturday OT */}
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  ✍️ หรือกรอกยอดเสาร์รวมเอง:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>฿</span>
                  <input
                    type="number"
                    value={customSaturdayTotal}
                    onChange={(e) => setCustomSaturdayTotal(e.target.value)}
                    placeholder={(saturdayOtCount * saturdayOtRate).toString()}
                    style={{
                      width: '85px',
                      padding: '4px 6px',
                      background: customSaturdayTotal ? 'rgba(6, 182, 212, 0.2)' : 'rgba(0, 0, 0, 0.5)',
                      border: `1px solid ${customSaturdayTotal ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textAlign: 'right'
                    }}
                  />
                  {customSaturdayTotal && (
                    <button
                      type="button"
                      onClick={() => setCustomSaturdayTotal('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', padding: '0 2px' }}
                      title="ล้างยอดและใช้การคูณอัตโนมัติ"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Evening OT Selector */}
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Moon size={14} color="var(--accent-amber)" />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    สอนโอทีเย็น:
                  </span>
                  <input
                    type="number"
                    value={eveningOtCount}
                    onChange={(e) => setEveningOtCount(parseInt(e.target.value) || 0)}
                    style={{ width: '45px', padding: '2px 4px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--accent-amber)', borderRadius: '3px', color: '#fff', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#fff' }}>วัน</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>งวดละ ฿</span>
                  <input
                    type="number"
                    value={eveningOtRate}
                    onChange={(e) => setEveningOtRate(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '2px 4px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '3px', color: 'var(--accent-amber)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                {[0, 16, 18, 19, 20].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setEveningOtCount(num);
                      setCustomEveningLumpSum((num * eveningOtRate).toString());
                    }}
                    style={{
                      flex: 1,
                      padding: '5px',
                      borderRadius: '4px',
                      border: `1px solid ${eveningOtCount === num ? 'var(--accent-amber)' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: eveningOtCount === num ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                      color: eveningOtCount === num ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: eveningOtCount === num ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {num === 0 ? '0 (ปิดเทอม)' : num === 19 ? '19 วัน (ก.ย.)' : `${num} วัน`}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>*รอบจ่าย: รวบยอดออกหลังเงินเดือน (วันที่ 26 หลังส่งรายงาน)</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                  {eveningOtCount} วัน x ฿{eveningOtRate} = ฿{(eveningOtCount * eveningOtRate).toLocaleString()}
                </span>
              </div>

              {/* Direct Total Input for Evening OT */}
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  ✍️ หรือกรอกยอดโอทีเย็นรวมเอง:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>฿</span>
                  <input
                    type="number"
                    value={customEveningLumpSum}
                    onChange={(e) => setCustomEveningLumpSum(e.target.value)}
                    placeholder={(eveningOtCount * eveningOtRate).toString()}
                    style={{
                      width: '85px',
                      padding: '4px 6px',
                      background: customEveningLumpSum ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 0, 0, 0.5)',
                      border: `1px solid ${customEveningLumpSum ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textAlign: 'right'
                    }}
                  />
                  {customEveningLumpSum && (
                    <button
                      type="button"
                      onClick={() => setCustomEveningLumpSum('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', padding: '0 2px' }}
                      title="ล้างยอดและใช้การคูณอัตโนมัติ"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Smart OT Allocation Engine (กลยุทธ์จัดสรรเงินโอทีเมื่อเงินออก) */}
          <div style={{ 
            marginTop: '16px', 
            background: 'rgba(0, 0, 0, 0.35)', 
            borderRadius: 'var(--radius-sm)', 
            padding: '16px', 
            border: '1px solid rgba(16, 185, 129, 0.25)' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--accent-emerald)" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
                  💡 โอทีออกแล้ว ควรแบ่งไปเก็บเท่าไหร่ดี? (สูตรจัดสรรโอทีครูอัจฉริยะ)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'TERM_BREAK_BUFFER', label: '🛡️ แผนเสบียงปิดเทอม (แนะนำ)', desc: 'เก็บ 50% กันช็อต ต.ค.' },
                  { id: 'DEBT_CRUSHER', label: '⚡ แผนปลดหนี้ไว', desc: 'เน้นโปะ SPay 50%' },
                  { id: 'CUSTOM', label: '⚙️ กำหนด % เอง', desc: 'ปรับสัดส่วนอิสระ' }
                ].map(strat => (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => setOtStrategy(strat.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: `1px solid ${otStrategy === strat.id ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: otStrategy === strat.id ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                      color: otStrategy === strat.id ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.74rem',
                      fontWeight: otStrategy === strat.id ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {strat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal Deduction & Mom Shield Engine */}
            {(() => {
              const totalDeducted = isMergedFunBucket 
                ? (momShieldAmount + babyPjSavings + mergedFunAmount)
                : (momShieldAmount + babyPjSavings + selfEmergencySavings + wishlistSavings);
              const remainingForReward = Math.max(0, totalOtEstimate - totalDeducted);
              const isOverAllocated = totalDeducted > totalOtEstimate;

              return (
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'rgba(16, 185, 129, 0.12)', 
                    border: '1px solid rgba(16, 185, 129, 0.3)', 
                    padding: '10px 14px', 
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '14px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                        เป้าหมายสำคัญ: ปกป้องเงินสำรองสหกรณ์ (฿4,000) ไม่ให้ลดอีก และป้องกันการกลับไปเป็นหนี้บัตร/SPayLater
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setIsMergedFunBucket(!isMergedFunBucket)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                      >
                        {isMergedFunBucket ? '🗂️ ดูแบบแยก 5 ถัง' : '📦 รวบ 3 ถังหลัก (คุมบุฟเฟ่ต์+เกม)'}
                      </button>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                        โอทีเดือนนี้ ฿{totalOtEstimate.toLocaleString()} ➔ จัดสรรแล้ว ฿{totalDeducted.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {isMergedFunBucket ? (
                    /* 3-Bucket Mode (User's Exact Need: Term Break + Baby + Merged Fun/Buffet/Games) */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      
                      {/* Bucket 1: Term Break Buffer */}
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                            1. 🛡️ เสบียงปิดเทอม (KBANK-EMERG)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.95rem', color: 'var(--accent-emerald)', fontWeight: 800 }}>฿</span>
                          <input
                            type="number"
                            value={momShieldAmount}
                            onChange={(e) => setMomShieldAmount(parseFloat(e.target.value) || 0)}
                            style={{ width: '95px', padding: '4px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--accent-emerald)', borderRadius: '4px', color: '#fff', fontSize: '1.05rem', fontWeight: 800, textAlign: 'right' }}
                          />
                        </div>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          *กันไว้ใช้ช่วงปิดเทอม ต.ค. ตัดวงจรการดึงเงิน <strong>ไม่ให้แตะเงินสหกรณ์ที่เหลือ ฿4,000 อีกเด็ดขาด</strong>
                        </p>
                      </div>

                      {/* Bucket 2: Baby PJ */}
                      <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.35)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            2. 👶 ค่าใช้จ่ายลูกน้องพีเจ (KEPT-PJ)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', fontWeight: 800 }}>฿</span>
                          <input
                            type="number"
                            value={babyPjSavings}
                            onChange={(e) => setBabyPjSavings(parseFloat(e.target.value) || 0)}
                            style={{ width: '95px', padding: '4px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--accent-cyan)', borderRadius: '4px', color: '#fff', fontSize: '1.05rem', fontWeight: 800, textAlign: 'right' }}
                          />
                        </div>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          *โอนเข้าบัญชี Kept เพื่อลูกชาย (ค่าแพมเพิส นม วัคซีน พัฒนาการ) แยกออกจากเงินกินเที่ยวเด็ดขาด
                        </p>
                      </div>

                      {/* Bucket 3: Merged Fun & Games & Buffet (Anti-SPayLater Sandbox) */}
                      <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.35)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                            3. 🎮🍜 ความสุขตามใจ (บุฟเฟ่ต์ + ซื้อเกม + ช้อป)
                          </span>
                          <span className="badge badge-rose" style={{ fontSize: '0.68rem' }}>งบจำกัดก้อนเดียว</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.95rem', color: 'var(--accent-rose)', fontWeight: 800 }}>฿</span>
                          <input
                            type="number"
                            value={mergedFunAmount}
                            onChange={(e) => setMergedFunAmount(parseFloat(e.target.value) || 0)}
                            style={{ width: '95px', padding: '4px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--accent-rose)', borderRadius: '4px', color: '#fff', fontSize: '1.05rem', fontWeight: 800, textAlign: 'right' }}
                          />
                        </div>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          *<strong>กฎเหล็กกักกันหนี้:</strong> กินบุฟเฟ่ต์ ซื้อเกม หรือของที่อยากได้ <strong>ต้องจ่ายสดจากก้อน ฿{mergedFunAmount.toLocaleString()} นี้เท่านั้น!</strong> ถ้ากินบุฟเฟ่ต์หมด จะไม่มีเงินซื้อเกม ถ้าอยากซื้อเกม ต้องลดมื้อบุฟเฟ่ต์ลง และ<strong>ห้ามกดผ่อน SPayLater เพิ่มเด็ดขาด!</strong>
                        </p>
                      </div>

                    </div>
                  ) : (
                    /* 5-Bucket Detailed Mode */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      
                      {/* Goal 1: Cooperative Shield (Term Break Buffer) */}
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                            1. 🛡️ เสบียงปิดเทอม (หยุดถอนเงินสหกรณ์)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--accent-emerald)', fontWeight: 800 }}>฿</span>
                          <input
                            type="number"
                            value={momShieldAmount}
                            onChange={(e) => setMomShieldAmount(parseFloat(e.target.value) || 0)}
                            style={{ width: '90px', padding: '4px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--accent-emerald)', borderRadius: '4px', color: '#fff', fontSize: '1rem', fontWeight: 800, textAlign: 'right' }}
                          />
                        </div>
                        <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          *โอนเข้า KBANK-EMERG กันไว้ใช้ช่วงปิดเทอม ต.ค. ทำให้<strong>ไม่ต้องไปถอนเงินสหกรณ์ที่เหลือ ฿4,000</strong> ออกมาใช้อีกต่อไป
                        </p>
                      </div>

                      {/* Goal 2: Baby PJ Fund */}
                      <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            2. 👶 ค่าใช้จ่ายลูก (น้องพีเจ)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 800 }}>฿</span>
                          <input
                            type="number"
                            value={babyPjSavings}
                            onChange={(e) => setBabyPjSavings(parseFloat(e.target.value) || 0)}
                            style={{ width: '90px', padding: '4px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--accent-cyan)', borderRadius: '4px', color: '#fff', fontSize: '1rem', fontWeight: 800, textAlign: 'right' }}
                          />
                        </div>
                        <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          *โอนเข้าบัญชี Kept เพื่อลูก (ค่าแพมเพิส นม ของเล่น เสื้อผ้า พัฒนาการ)
                        </p>
                      </div>

                      {/* Goal 3: Personal Emergency Buffer */}
                      <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                            3. 🚨 เงินสำรองฉุกเฉินตัวเอง
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--accent-amber)', fontWeight: 800 }}>฿</span>
                          <input
                            type="number"
                            value={selfEmergencySavings}
                            onChange={(e) => setSelfEmergencySavings(parseFloat(e.target.value) || 0)}
                            style={{ width: '90px', padding: '4px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--accent-amber)', borderRadius: '4px', color: '#fff', fontSize: '1rem', fontWeight: 800, textAlign: 'right' }}
                          />
                        </div>
                        <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          *สะสมใน Make by KBank คล่องตัว สำรองไว้ใช้ส่วนตัวยามฉุกเฉิน
                        </p>
                      </div>

                      {/* Goal 4: Wishlist Fund */}
                      <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                            4. 🎁 เงินเก็บซื้อของที่อยากได้
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--accent-purple)', fontWeight: 800 }}>฿</span>
                          <input
                            type="number"
                            value={wishlistSavings}
                            onChange={(e) => setWishlistSavings(parseFloat(e.target.value) || 0)}
                            style={{ width: '90px', padding: '4px 6px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--accent-purple)', borderRadius: '4px', color: '#fff', fontSize: '1rem', fontWeight: 800, textAlign: 'right' }}
                          />
                        </div>
                        <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          *เก็บซื้อแกดเจ็ต/ของที่อยากได้ด้วยเงินสด เพื่อ<strong>ป้องกันการไปผ่อน SPayLater เพิ่ม</strong>
                        </p>
                      </div>

                      {/* Goal 5: Free Spending / Guilt-Free Rewards */}
                      <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                            5. 🍜 เหลือใช้กินเที่ยวตามใจ
                          </span>
                          <span className="badge badge-rose" style={{ fontSize: '0.68rem' }}>Guilt-Free</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: remainingForReward > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                          ฿{remainingForReward.toLocaleString()}
                        </div>
                        <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, marginTop: '4px' }}>
                          *เงินเหลือจากโอทีหลังหักออมครบ 4 เป้าหมาย เอาไว้พาลูกและแจงกินมื้อพิเศษ ชาบู แซลมอน ได้อย่างสบายใจไร้กังวล
                        </p>
                      </div>

                    </div>
                  )}

                  {/* Real Ledger Proof Breakdown (พิสูจน์ความจริงจากบิลจริงในระบบ) */}
                  <div style={{ 
                    marginTop: '12px', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid rgba(255, 255, 255, 0.06)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '12px 14px' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        📊 พิสูจน์ตัวเลขจริง: ทำไมสูตรนี้ถึงรอดปิดเทอม ต.ค. 100% (อ้างอิงบิลระบบ ส.ค.)
                      </span>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>เงินสดปลอดภัย</span>
                    </div>

                    {(() => {
                      const netLeftBeforeBuffer = 17993.32 - monthlyFixedBills;
                      const totalUsableInBreak = netLeftBeforeBuffer + momShieldAmount;
                      const dailyAvgBreak = Math.round(totalUsableInBreak / 31);

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px', fontSize: '0.75rem' }}>
                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '4px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>1. เงินเดือนครูเข้า 25 ต.ค.</div>
                            <div style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.9rem' }}>+฿17,993.32</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>*ฐานเงินเดือนประจำคงที่</div>
                          </div>

                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)' }}>2. บิลประจำ/น้ำไฟเดือนนี้:</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>✍️ แก้ไขได้</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>-฿</span>
                              <input
                                type="number"
                                value={monthlyFixedBills}
                                onChange={(e) => setMonthlyFixedBills(parseFloat(e.target.value) || 0)}
                                style={{ width: '85px', padding: '2px 4px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--accent-rose)', borderRadius: '3px', color: 'var(--accent-rose)', fontWeight: 700, fontSize: '0.85rem', textAlign: 'right' }}
                              />
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>*(SPayส่วนตัว ฿2,807 + ข้าวแม่ + น้ำไฟ)</div>
                          </div>

                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '4px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>3. เงินสดเหลือในมือก่อนบวกเสบียง</div>
                            <div style={{ color: netLeftBeforeBuffer >= 0 ? '#fff' : 'var(--accent-rose)', fontWeight: 700, fontSize: '0.9rem' }}>
                              = ฿{netLeftBeforeBuffer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {netLeftBeforeBuffer >= 0 ? '*สภาพคล่องพื้นฐาน' : '⚠️ ตึงมือ ต้องใช้เสบียงพยุง'}
                            </div>
                          </div>

                          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px 10px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <div style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>4. บวกเสบียงปิดเทอมที่ตุนไว้</div>
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginTop: '2px' }}>
                              พร้อมใช้ ฿{totalUsableInBreak.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', marginTop: '2px' }}>
                              เฉลี่ยวันละ ฿{dailyAvgBreak.toLocaleString()} (เงินสหกรณ์ ฿4,000 ปลอดภัย 100%!)
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>

        {/* Custom Date Controls (Family Net Settlement & SPay Prepay) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '14px', 
          marginTop: '16px', 
          background: 'rgba(0, 0, 0, 0.25)', 
          padding: '14px 16px', 
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          
          {/* Family Settlement Day Picker */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                🤝 วันเคลียร์เงินครอบครัว / หักลบกลบหนี้:
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                ทุกวันที่ {familySettlementDay}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {[31, 28, 25, 3].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setFamilySettlementDay(day)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${familySettlementDay === day ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: familySettlementDay === day ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                    color: familySettlementDay === day ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    fontWeight: familySettlementDay === day ? 700 : 500
                  }}
                >
                  {day === 31 ? '31 (สิ้นเดือน 21:18 น.)' : day === 25 ? '25 (เงินเดือนออก)' : `วันที่ ${day}`}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              *เช่น รอบล่าสุดโอนสุทธิให้พี่แพร ฿475.00 วันที่ 31 เวลา 21:18 น. (หักลบ Sony XM5 แล้ว)
            </p>
          </div>

          {/* SPay Prepay Day Picker */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                ⚡ วันชำระบิล SPayLater ล่วงหน้า:
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                ทุกวันที่ {spayPrepayDay}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {[2, 26, 10].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSpayPrepayDay(day)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${spayPrepayDay === day ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: spayPrepayDay === day ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                    color: spayPrepayDay === day ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    fontWeight: spayPrepayDay === day ? 700 : 500
                  }}
                >
                  {day === 2 ? 'วันที่ 2 (ต้นเดือนเพื่อความสบายใจ)' : day === 26 ? '26 (หลังเงินเดือนออก)' : '10 (วันตัดปกติ)'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              *เลือกวันที่ที่สะดวกกดจ่ายก่อน เพื่อป้องกันเงินรั่วไหลไปกับสิ่งอื่น
            </p>
          </div>

        </div>

      </div>

      {/* 2. KPI Summary Capsule Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            จุดเงินต่ำสุดตลอด {selectedDays} วัน (Lowest Dip)
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 800, 
            color: summary.minMainBalance < 0 ? 'var(--accent-rose)' : summary.minMainBalance < 2000 ? 'var(--accent-amber)' : 'var(--accent-emerald)' 
          }}>
            ฿{summary.minMainBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary.minMainBalance < 0 
              ? '🚨 เสี่ยงเงินสดติดลบ ต้องมีเงินสำรองพยุง' 
              : summary.minMainBalance < 2000 
                ? '⚠️ มีช่วงเงินสดตึงมือเล็กน้อย' 
                : '✅ สภาพคล่องปลอดภัยตลอดรอบ'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            ยอดเงินสดรวมปลายทาง ({selectedDays} วัน)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            ฿{summary.endTotalLiquid.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            เงินสดคงเหลือสะสมในทุกกระเป๋า KBank
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            จุดตึงมือที่ตรวจพบ (Pinch Points)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: summary.totalPinchPointsCount > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
            {summary.totalPinchPointsCount} จุด
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary.totalPinchPointsCount > 0 ? 'ระบบมีแผนรับมือเชิงรุกแนะนำด้านล่าง' : 'ไม่มีจุดวิกฤต ไหลลื่น 100%'}
          </div>
        </div>
      </div>

      {/* 3. Proactive AI Directives (The Money Coach) */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <CheckCircle2 size={18} color="var(--accent-emerald)" />
          คำแนะนำเชิงรุกจากสมหมาย (The Money Coach Wisdom)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {proactiveDirectives.map(d => (
            <div 
              key={d.id} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid rgba(255, 255, 255, 0.06)', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <span className={`badge badge-${d.variant}`} style={{ whiteSpace: 'nowrap', marginTop: '2px' }}>
                {d.badge}
              </span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                {d.directive}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Pinch Points Radar (If any) */}
      {pinchPoints.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <AlertTriangle size={18} color="var(--accent-rose)" />
            จุดตึงมือที่ต้องระวังล่วงหน้า (Cashflow Pinch Points)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {pinchPoints.map((p, idx) => (
              <div 
                key={idx}
                style={{ 
                  background: 'rgba(244, 63, 94, 0.08)', 
                  border: '1px solid rgba(244, 63, 94, 0.2)', 
                  padding: '12px 14px', 
                  borderRadius: 'var(--radius-sm)' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                    📅 {p.dateString} (อีก {p.dayIndex} วัน)
                  </span>
                  <span className="badge badge-rose">
                    {p.severity === 'CRITICAL' ? 'วิกฤต' : 'ตึงมือ'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', marginBottom: '4px' }}>
                  {p.reason}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ยอดเงินคงเหลือกระเป๋าหลัก: ฿{p.mainBalance.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Key Cash Events Timeline */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Calendar size={18} color="var(--accent-cyan)" />
            เหตุการณ์เงินเข้า-ออกสำคัญในระยะ {selectedDays} วัน
          </h3>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={scrollToOtPlanner}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
            >
              <Edit3 size={14} color="var(--accent-cyan)" />
              กรอก/แก้ไขแผนโอที
            </button>

            <button
              type="button"
              onClick={handleOpenBalanceModal}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
            >
              <Wallet size={14} color="var(--accent-emerald)" />
              ปรับยอดเงินในกระเป๋าจริง
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Always show Day 0 (Today) as the starting benchmark */}
          {dailyTimeline[0] && (
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '8px', 
                  background: 'rgba(16, 185, 129, 0.2)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  color: 'var(--accent-emerald)',
                  fontWeight: 800
                }}>
                  <span>{dailyTimeline[0].date.getDate()}</span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--accent-emerald)' }}>{dailyTimeline[0].date.toLocaleDateString('th-TH', { month: 'short' })}</span>
                </div>

                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📍 วันนี้ (จุดเริ่มต้นสภาพคล่องปัจจุบัน)
                    {sotData.spayStatementStatus === 'PAID' && (
                      <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>บิล SPayLater จ่ายแล้วรอบนี้ ✅</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    กระเป๋าหลัก: <strong style={{ color: 'var(--accent-cyan)' }}>฿{dailyTimeline[0].mainBalance.toLocaleString()}</strong> | รวมเงินสดทุกกระเป๋า: <strong style={{ color: '#fff' }}>฿{dailyTimeline[0].totalLiquid.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleOpenBalanceModal}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Edit3 size={13} />
                  แก้ไขเงินในกระเป๋า
                </button>
                {setActiveTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('debts')}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CreditCard size={13} />
                    ดูหนี้ SPay
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Timeline Events from Day 1 onwards */}
          {dailyTimeline
            .filter((d, idx) => idx > 0 && d.events.length > 0)
            .map((d, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    borderRadius: '8px', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700
                  }}>
                    <span>{d.date.getDate()}</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{d.date.toLocaleDateString('th-TH', { month: 'short' })}</span>
                  </div>

                  <div>
                    {d.events.map((ev, eIdx) => (
                      <div key={eIdx} style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {ev.title}
                        {ev.isPrepay && <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>จ่ายล่วงหน้าสบายใจ</span>}
                      </div>
                    ))}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      คงเหลือในกระเป๋าหลัก: ฿{d.mainBalance.toLocaleString()} | รวมทุกกระเป๋า: ฿{d.totalLiquid.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {d.events.map((ev, eIdx) => (
                    <div key={eIdx} style={{ 
                      fontSize: '1rem', 
                      fontWeight: 800, 
                      color: ev.type === 'INCOME' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: 'flex-end'
                    }}>
                      {ev.type === 'INCOME' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      ฿{ev.amount.toLocaleString()}
                    </div>
                  ))}
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    สุทธิประจำวัน: <span style={{ color: d.netChange >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{d.netChange >= 0 ? '+' : ''}฿{d.netChange.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Wallet Balances Editor Modal */}
      {showBalanceModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  ปรับปรุงยอดเงินสดปัจจุบันในกระเป๋า
                </h3>
              </div>
              <button onClick={() => setShowBalanceModal(false)} className="btn btn-outline" style={{ padding: '6px', borderRadius: '50%' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              กรอกยอดเงินคงเหลือจริงในแอป KBank / Make ปัจจุบัน เพื่อให้ระบบพยากรณ์เงินสดตั้งต้นจากเงินจริงของคุณ
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '350px', overflowY: 'auto' }}>
              {(sotData.accounts || [])
                .filter(acc => ['KBANK-MAIN', 'KBANK-FOOD', 'KBANK-SNACK', 'KBANK-SPAY', 'KBANK-EMERG', 'KBANK-HOME'].includes(acc.id))
                .map(acc => (
                  <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{acc.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{acc.purpose}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>฿</span>
                      <input
                        type="number"
                        value={tempBalances[acc.id] !== undefined ? tempBalances[acc.id] : acc.balance}
                        onChange={(e) => setTempBalances({ ...tempBalances, [acc.id]: e.target.value })}
                        style={{
                          width: '100px',
                          padding: '6px 8px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          textAlign: 'right'
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowBalanceModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem' }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveBalances}
                className="btn btn-success"
                style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px' }}
              >
                <Check size={16} /> บันทึกยอดเงินจริง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
