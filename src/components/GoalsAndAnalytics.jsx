import React, { useState } from 'react';
import { 
  Target, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Baby, 
  GraduationCap, 
  Laptop, 
  Car, 
  Home, 
  Calendar, 
  DollarSign, 
  Scissors, 
  Check, 
  Clock, 
  Trash2, 
  Edit3 
} from 'lucide-react';
import { addAuditEvent } from '../services/storageService';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function GoalsAndAnalytics({ sotData, updateSOTData }) {
  const { confirm: modalConfirm, toast } = useModalNotification();
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('KEPT-PJ');
  const [goalCategory, setGoalCategory] = useState('EDUCATION');
  const [monthlyContribution, setMonthlyContribution] = useState('');

  const accounts = sotData.accounts || [];
  const debts = sotData.debts || [];
  const bnplItems = sotData.bnplItems || [];
  const familyList = sotData.familySettlements || [];
  const goals = sotData.goals || [
    {
      id: 'GOAL-PJ-TUITION',
      name: '🎓 ค่าเทอม & การศึกษาน้องพีเจ (PJ Tuition Fund)',
      targetAmount: 35000,
      currentAmount: 25000,
      targetDate: '2027-05-01',
      linkedAccountId: 'KEPT-PJ',
      category: 'EDUCATION',
      monthlyPlan: 2000,
      note: 'ออมในบัญชี Kept ดอกเบี้ยสูง (แจงถือ) เพื่อเตรียมค่าเทอมเข้าเตรียมอนุบาลน้องพีเจ'
    },
    {
      id: 'GOAL-VACATION-SUMMER',
      name: '🏖️ กองทุนสำรองปิดเทอม & พาครอบครัวเที่ยว',
      targetAmount: 20000,
      currentAmount: 15000,
      targetDate: '2027-03-31',
      linkedAccountId: 'KBANK-EMERG',
      category: 'EMERGENCY',
      monthlyPlan: 2500,
      note: 'ทยอยกันเงินสดโอเย็นและวันเสาร์เข้ากระเป๋า 4 สำรองไว้ใช้ช่วงปิดเทอมที่ไม่มีโอเย็น'
    }
  ];

  // 1. Group Expenses by Category
  const expenseCategories = [
    {
      category: '🏠 บ้าน & แม่ (Home & Family)',
      amount: 8783.29,
      color: '#06b6d4',
      items: 'ค่าไฟบ้าน ฿3,752, ค่ากับข้าวแม่ ฿2,000, เน็ต ฿1,426, น้ำ ฿315, ประกัน ฿680, ดูหนัง ฿609',
      advice: 'บิลจำเป็นของครอบครัว มีแจงช่วยออกค่าไฟ ฿2,000 หักลบในบ้าน'
    },
    {
      category: '🛍️ ค่างวดผ่อนส่วนตัว (Gadgets & Gear)',
      amount: 2807.43,
      color: '#f43f5e',
      items: 'G29 ฿567, หมอน Becell ฿741, Cuktech ฿577, หมวก Real Dawn ฿388, Sonoff ฿176, Vento ฿170, Shifter ฿114, Tuya ฿72 (หูฟัง Sony ฿2,370 เป็นของพี่แพร)',
      advice: '💡 จุดลดรายจ่ายสำคัญ: อีก 2 เดือน พาวเวอร์แบงก์ Cuktech และหมวก Real Dawn จะผ่อนหมด! ปลดล็อกเงินสดเพิ่มอีก +฿965.48/เดือน!'
    },
    {
      category: '🍜 ค่ากินแซ่บ & มื้ออร่อย (Food & Craving)',
      amount: 3500.00,
      color: '#10b981',
      items: 'Shinkanzen Sushi โลตัสติวานนท์, แมคโดนัลด์, พิซซ่า, เบียร์สังสรรค์',
      advice: 'แนะนำคุมงบไว้ที่ ฿3,000 - ฿3,500/เดือน กินอร่อยได้เต็มที่โดยไม่เบียดเบียนเงินออม'
    },
    {
      category: '🍦 เหมาเติมบัตรโรงเรียน (Snacks & Lunch)',
      amount: 1500.00,
      color: '#f59e0b',
      items: 'ไอติม ไก่ทอด ขนม กาแฟในโรงเรียนชลประทานวิทยา (สัปดาห์ละ ~฿350)',
      advice: 'โอนเหมาก้อนสัปดาห์ละ 350 บาท ไม่ต้องเสียเวลาจดยิบย่อยรายวัน'
    },
    {
      category: '📺 Digital Subscriptions',
      amount: 541.00,
      color: '#8b5cf6',
      items: 'YouTube Family (฿64), Google One (฿189), Netflix (฿259), CapCut (฿29)',
      advice: '⚠️ เตือนกดยกเลิก CapCut Pro ก่อนวันที่ 15 ก.ย. เพื่อไม่ให้ปรับเป็นราคาเต็ม ฿289'
    },
    {
      category: '🛡️ สวัสดิการ ม.39 (Welfare)',
      amount: 432.00,
      color: '#38bdf8',
      items: 'ประกันสังคม มาตรา 39 (ตัดผ่าน ShopeePay)',
      advice: 'รวมบิลจ่ายใน SPayLater วันที่ 10 ของเดือนถัดไป รวบจ่ายทีเดียว'
    }
  ];

  const totalMonthlyExpense = expenseCategories.reduce((sum, c) => sum + c.amount, 0);

  // Save new goal
  const handleSaveGoal = (e) => {
    e.preventDefault();
    const tgt = parseFloat(targetAmount);
    const curr = parseFloat(currentAmount) || 0;
    const mthPlan = parseFloat(monthlyContribution) || Math.max(500, (tgt - curr) / 6);

    if (!goalName.trim() || isNaN(tgt) || tgt <= 0) return;

    const newGoal = {
      id: `GOAL-${Date.now().toString().slice(-4)}`,
      name: goalName,
      targetAmount: tgt,
      currentAmount: curr,
      targetDate: targetDate || '2027-05-01',
      linkedAccountId,
      category: goalCategory,
      monthlyPlan: parseFloat(mthPlan.toFixed(2)),
      note: `วางแผนออมเดือนละ ฿${mthPlan.toLocaleString()} เข้าบัญชี ${linkedAccountId}`
    };

    const updatedGoals = [newGoal, ...(sotData.goals || goals)];
    let nextData = { ...sotData, goals: updatedGoals };
    nextData = addAuditEvent(nextData, 'GOAL', newGoal.id, 'GOAL_CREATED', {
      name: goalName,
      targetAmount: tgt,
      monthlyPlan: mthPlan
    });

    updateSOTData(nextData);
    setShowAddGoalModal(false);
    setGoalName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate('');
    setMonthlyContribution('');
  };

  const handleDeleteGoal = async (goalId) => {
    const isConfirmed = await modalConfirm({
      title: 'ยืนยันการลบเป้าหมาย',
      message: 'ต้องการลบเป้าหมายการเงินนี้ออกจากระบบใช่หรือไม่?',
      variant: 'danger',
      confirmText: 'ลบเป้าหมาย',
      cancelText: 'ยกเลิก'
    });
    if (!isConfirmed) return;

    const currentGoals = sotData.goals || goals;
    const updatedGoals = currentGoals.filter(g => g.id !== goalId);
    let nextData = { ...sotData, goals: updatedGoals };
    nextData = addAuditEvent(nextData, 'GOAL', goalId, 'GOAL_DELETED');
    updateSOTData(nextData);
    toast('🗑️ ลบเป้าหมายเรียบร้อยแล้ว', { type: 'info' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel glass-panel-glow-purple" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={24} color="var(--accent-purple)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                วิเคราะห์หมวดหมู่ค่าใช้จ่าย & วางแผนเป้าหมายอนาคต (Goals & Analytics)
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              เห็นภาพชัดเจนว่าเงินหมดไปกับหมวดไหน ควรลดจุดไหน และวางแผนออมค่าเทอมน้องพีเจจากเงินสดคงเหลือจริง
            </p>
          </div>

          <button onClick={() => setShowAddGoalModal(true)} className="btn btn-primary">
            <Plus size={16} /> 🎯 เพิ่มเป้าหมายการเงินใหม่
          </button>
        </div>
      </div>

      {/* SECTION 1: FINANCIAL GOALS MILESTONE CARDS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
              🎯 เป้าหมายทางการเงินที่ระบบกำลังติดตาม (Active Financial Goals)
            </h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            คำนวณแผนการออมจากเงินสดส่วนเกินจริง (~฿8,000 - ฿10,000/เดือน)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {(sotData.goals || goals).map(goal => {
            const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const remainingToSave = Math.max(0, goal.targetAmount - goal.currentAmount);
            const monthsNeeded = goal.monthlyPlan > 0 ? Math.ceil(remainingToSave / goal.monthlyPlan) : 0;

            return (
              <div key={goal.id} className="glass-panel" style={{ padding: '22px', border: '1px solid var(--border-glow)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span className="badge badge-purple">{goal.category}</span>
                  <button 
                    onClick={() => handleDeleteGoal(goal.id)}
                    title="ลบเป้าหมาย"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                  {goal.name}
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                  {goal.note}
                </p>

                {/* Progress Bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>สะสมแล้ว: <b style={{ color: 'var(--accent-cyan)' }}>฿{goal.currentAmount.toLocaleString()}</b></span>
                    <span style={{ color: 'var(--text-muted)' }}>เป้าหมาย: <b style={{ color: '#fff' }}>฿{goal.targetAmount.toLocaleString()}</b> ({progress}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', transition: 'width 0.3s' }}></div>
                  </div>
                </div>

                {/* AI Timeline Calculation */}
                <div style={{ background: 'rgba(6, 182, 212, 0.06)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#f8fafc', lineHeight: '1.5' }}>
                  💡 <b>แผน AI:</b> ทยอยออมเดือนละ <b>฿{goal.monthlyPlan?.toLocaleString() || '2,000'}</b> เข้าบัญชี <code>{goal.linkedAccountId}</code> จะถึงเป้าหมายในอีก <b>{monthsNeeded} เดือน</b> (ประมาณ {goal.targetDate}) ได้อย่างสบายๆ โดยไม่กระทบเงินกินแซ่บ!
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: EXPENSE CATEGORY BREAKDOWN & OPTIMIZATION */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChartIcon size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              📊 แจกแจงค่าใช้จ่ายตามหมวดหมู่ & จุดที่ควรเพิ่ม-ลด (Expense Optimization)
            </h3>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            รวมรายจ่ายจริงต่อเดือน: <b style={{ color: '#fff', fontSize: '1.05rem' }}>฿{totalMonthlyExpense.toLocaleString()}</b>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {expenseCategories.map((cat, idx) => {
            const pct = ((cat.amount / totalMonthlyExpense) * 100).toFixed(1);

            return (
              <div 
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: cat.color }}></div>
                    <strong style={{ fontSize: '0.98rem', color: '#fff' }}>{cat.category}</strong>
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{pct}% ของรายจ่าย</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                    ฿{cat.amount.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>/เดือน</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {cat.items}
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                  {cat.advice}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '26px', border: '1px solid var(--border-glow)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
              🎯 เพิ่มเป้าหมายทางการเงินใหม่
            </h3>

            <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ชื่อเป้าหมาย
                </label>
                <input
                  type="text"
                  placeholder="เช่น เก็บเงินซื้อคอมใหม่ / ค่าเทอมน้องพีเจปีหน้า"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ยอดเงินเป้าหมาย (บาท)
                  </label>
                  <input
                    type="number"
                    placeholder="30000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)', fontSize: '1.1rem', fontWeight: 700 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    เงินที่มีอยู่ตอนนี้ (บาท)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ออมเข้าบัญชี/กระเป๋าไหน?
                  </label>
                  <select
                    value={linkedAccountId}
                    onChange={(e) => setLinkedAccountId(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="KEPT-PJ">👶 Kept น้องพีเจ (แจงถือ)</option>
                    <option value="KBANK-EMERG">🚨 กระเป๋า 4 โมโหฉุกเฉิน</option>
                    <option value="KBANK-MAIN">🎯 กระเป๋าหลัก MAKE</option>
                    <option value="SCB-EXTRA">🛵 SCB เงินพิเศษ</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ตั้งใจออมเดือนละ (บาท)
                  </label>
                  <input
                    type="number"
                    placeholder="2000"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  กำหนดเวลาที่ต้องการบรรลุเป้าหมาย
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddGoalModal(false)} className="btn btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  บันทึกเป้าหมาย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
