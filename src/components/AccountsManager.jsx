import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowRightLeft, 
  Plus, 
  DollarSign, 
  ShieldCheck, 
  CreditCard, 
  PieChart, 
  Edit3, 
  Check, 
  Calendar, 
  Landmark, 
  Sparkles, 
  Calculator, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  RefreshCw, 
  Sliders,
  Lock,
  Smile,
  ShieldAlert,
  HelpCircle,
  Zap
} from 'lucide-react';
import { addAuditEvent } from '../services/storageService';
import { useModalNotification } from '../context/ModalNotificationContext';
import SalaryBookmarkletModal from './SalaryBookmarkletModal';
import AllocationModal from './AllocationModal';

export default function AccountsManager({ sotData, updateSOTData }) {
  const { confirm: modalConfirm, alert: modalAlert, toast } = useModalNotification();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showOtModal, setShowOtModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showBookmarkletModal, setShowBookmarkletModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Edit account modal states
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editPurpose, setEditPurpose] = useState('');

  // OT Cash modal states
  const [otType, setOtType] = useState('EVENING');
  const [otDays, setOtDays] = useState('');
  const [otCustomAmount, setOtCustomAmount] = useState('');
  const [depositTarget, setDepositTarget] = useState('KBANK-DEBIT');

  // Transfer states
  const [fromAccount, setFromAccount] = useState('KTB-SALARY');
  const [toAccount, setToAccount] = useState('KBANK-MAIN');
  const [transferAmount, setTransferAmount] = useState('');

    // Income Milestones & Accounts
  const accounts = sotData.accounts || [];
  const milestones = sotData.monthlyIncomeMilestones || {
    salaryReceived: true,
    saturdayOtReceived: true,
    eveningOtReceived: false
  };

  const handleOpenAllocationModal = () => {
    setShowAllocationModal(true);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return;

    const sourceAcc = accounts.find(a => a.id === fromAccount);
    if (!sourceAcc || sourceAcc.balance < amount) {
      await modalAlert({
        title: 'ยอดเงินไม่เพียงพอ',
        message: `ยอดเงินในบัญชีต้นทาง [${sourceAcc?.name || 'ต้นทาง'}] มีไม่พอโอนจำนวน ฿${amount.toLocaleString()}`,
        variant: 'danger'
      });
      return;
    }

    const updatedAccounts = accounts.map(acc => {
      if (acc.id === fromAccount) return { ...acc, balance: Math.round((acc.balance - amount) * 100) / 100, updatedAt: new Date().toISOString() };
      if (acc.id === toAccount) return { ...acc, balance: Math.round(((acc.balance || 0) + amount) * 100) / 100, updatedAt: new Date().toISOString() };
      return acc;
    });

    let nextData = { ...sotData, accounts: updatedAccounts };
    nextData = addAuditEvent(nextData, 'ACCOUNT', fromAccount, 'TRANSFER_EXECUTED', {
      from: fromAccount,
      to: toAccount,
      amount
    });

    updateSOTData(nextData);
    setShowTransferModal(false);
    setTransferAmount('');
    toast(`💸 โอนเงิน ฿${amount.toLocaleString()} เรียบร้อยแล้ว!`, { type: 'success' });
  };

  const handleLogOtCash = (e) => {
    e.preventDefault();
    let calculatedAmount = 0;
    let otLabel = '';

    if (otType === 'EVENING') {
      const days = parseInt(otDays) || 0;
      calculatedAmount = days * 200;
      otLabel = `เงินสดโอเย็น (${days} วัน @ ฿200)`;
    } else if (otType === 'SATURDAY') {
      const days = parseInt(otDays) || 0;
      calculatedAmount = days * 1100;
      otLabel = `เงินสดสอนวันเสาร์ (${days} วัน @ ฿1,100)`;
    } else {
      calculatedAmount = parseFloat(otCustomAmount) || 0;
      otLabel = `เงินสดสอนพิเศษ/ซัมเมอร์`;
    }

    if (calculatedAmount <= 0) return;

    // Add to target account
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === depositTarget) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + calculatedAmount) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      return acc;
    });

    let nextData = { ...sotData, accounts: updatedAccounts };
    nextData = addAuditEvent(nextData, 'INCOME_CASH', 'CHONPRATHAN_OT', 'OT_CASH_DEPOSITED', {
      type: otType,
      label: otLabel,
      amount: calculatedAmount,
      targetAccount: depositTarget,
      route: 'Cash -> TrueMoney -> KBank Debit'
    });

    updateSOTData(nextData);
    setShowOtModal(false);
    toast(`🎉 บันทึกรับ ${otLabel} รวม ฿${calculatedAmount.toLocaleString()} เข้ากระเป๋าเรียบร้อยแล้ว!`, { type: 'success' });
  };

  const handleOpenEditAccount = (acc) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditBalance(acc?.balance !== undefined && acc?.balance !== null ? acc.balance.toString() : '0');
    setEditPurpose(acc.purpose || '');
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    const balance = parseFloat(editBalance);
    if (isNaN(balance)) return;

    const updatedAccounts = accounts.map(acc => {
      if (acc.id === editingAccount.id) {
        return {
          ...acc,
          name: editName,
          balance,
          purpose: editPurpose,
          updatedAt: new Date().toISOString()
        };
      }
      return acc;
    });

    let nextData = { ...sotData, accounts: updatedAccounts };
    nextData = addAuditEvent(nextData, 'ACCOUNT', editingAccount.id, 'ACCOUNT_BALANCE_UPDATED', {
      name: editName,
      balance
    });

    updateSOTData(nextData);
    setEditingAccount(null);
    toast(`✅ บันทึกยอดเงิน [${editName}] เป็น ฿${balance.toLocaleString()} เรียบร้อยแล้ว!`, { type: 'success' });
  };

  const getAccountBadge = (category) => {
    switch (category) {
      case 'SALARY': return <span className="badge badge-cyan">📥 เงินเดือนออกทุกวันที่ 27</span>;
      case 'MAIN_HUB': return <span className="badge badge-purple">🎯 กระเป๋าหลัก</span>;
      case 'FOOD_CRAVING': return <span className="badge badge-emerald">🍜 กินแซ่บ & สังสรรค์</span>;
      case 'ALLOWANCE_LUMP': return <span className="badge badge-amber">🍦 เติมบัตรโรงเรียน</span>;
      case 'FAMILY_HOME': return <span className="badge badge-purple">🏠 บ้าน แม่ พี่แพร</span>;
      case 'EMERGENCY': return <span className="badge badge-rose">🚨 โมโหฉุกเฉิน</span>;
      case 'DAILY_SCAN': return <span className="badge badge-cyan">🛒 รับเงินจาก TrueMoney</span>;
      case 'SINKING_FUND': return <span className="badge badge-rose">🔒 กันจ่าย SPayLater</span>;
      case 'COUPLE_SAVINGS': return <span className="badge badge-emerald">👶 ออมเพื่อน้องพีเจ</span>;
      case 'E_WALLET': return <span className="badge badge-amber">🏪 จุดฝากเงินสดโอเย็น</span>;
      case 'CREDIT_LINE': return <span className="badge badge-amber">💳 วงเงินสินเชื่อ</span>;
      default: return <span className="badge badge-cyan">{category}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Payday & Cashflow Routing Timeline Banner */}
      <div className="glass-panel glass-panel-glow-cyan" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                วงรอบเงินเข้า & เส้นทางหมุนเงินสดโรงเรียนชลประทานวิทยา
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              เงินเดือนออกทุกวันที่ 27 • เงินสดโอเย็นออกสิ้นเดือน • เงินสดวันเสาร์ออกทุกครึ่งเดือน
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowBookmarkletModal(true)} className="btn btn-outline" style={{ fontSize: '0.85rem', borderColor: 'rgba(6, 182, 212, 0.4)', color: 'var(--accent-cyan)' }}>
              <Zap size={15} /> ⚡ ปุ่มลัดดูดยอดเงินเดือน
            </button>
            <button onClick={handleOpenAllocationModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <Calculator size={15} /> 🧮 ผู้ช่วยจัดสรรเงิน: วิเคราะห์ตามจุดประสงค์ของทุกกระเป๋า
            </button>
            <button onClick={() => setShowOtModal(true)} className="btn btn-warning" style={{ fontSize: '0.85rem' }}>
              <Sparkles size={15} /> 💵 บันทึกรับเงินสดโอเย็น/เสาร์
            </button>
            <button onClick={() => setShowTransferModal(true)} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
              <ArrowRightLeft size={15} /> โอนย้ายระหว่างกระเป๋า
            </button>
          </div>
        </div>

        {/* Timeline Visual Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>1. เงินเดือนหลัก (KTB)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '3px 0' }}>ทุกวันที่ 27 ของเดือน</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>รับสุทธิเข้าบัญชีกรุงไทย ➔ ล็อกบิล SPay + บ้านแม่</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 600 }}>2. เงินสดโอเย็น (วันละ ฿200)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '3px 0' }}>สัปดาห์สิ้นเดือน (31 ส.ค. - 4 ก.ย.)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ฝ่ายบัญชีเบิกเงินสด ➔ ฝากเข้า TrueMoney ➔ กสิกรเดบิต</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600 }}>3. เงินสดสอนวันเสาร์ (วันละ ฿1,100)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '3px 0' }}>ออกทุกครึ่งเดือน (Bi-weekly)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>โอนจาก TrueMoney ➔ กสิกรเดบิต ➔ เติมกินแซ่บ/สำรอง</div>
          </div>

        </div>
      </div>

      {/* Account Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
        {accounts.map(acc => (
          <div key={acc.id} className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  [{acc.id}] • {acc.bank}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {getAccountBadge(acc.category)}
                <button 
                  onClick={() => handleOpenEditAccount(acc)}
                  title="แก้ไขยอดเงิน / วัตถุประสงค์"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Edit3 size={13} />
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
              {acc.name}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', minHeight: '34px', marginBottom: '14px', lineHeight: '1.4' }}>
              {acc.purpose}
            </p>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {acc.category === 'CREDIT_LINE' ? 'วงเงินคงเหลือ' : 'ยอดเงินคงเหลือจริง'}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: acc.category === 'CREDIT_LINE' ? 'var(--accent-amber)' : '#ffffff', marginTop: '2px' }}>
                  ฿{acc.balance.toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {(acc.id === 'KTB-SALARY' || acc.category === 'SALARY') && acc.balance === 0 && (
                  <button
                    onClick={() => {
                      const updatedAccounts = accounts.map(a => a.id === acc.id ? { ...a, balance: 17993.32, updatedAt: new Date().toISOString() } : a);
                      let nextData = { ...sotData, accounts: updatedAccounts };
                      nextData = addAuditEvent(nextData, 'ACCOUNT', acc.id, 'QUICK_SALARY_SET', { balance: 17993.32 });
                      updateSOTData(nextData);
                      toast('🎉 เติมยอดเงินเดือนฐาน ฿17,993.32 เรียบร้อยแล้ว!', { type: 'success' });
                    }}
                    className="btn btn-success"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', fontWeight: 700 }}
                    title="คลิกเดียวเติมยอดเงินเดือนฐาน ฿17,993.32 ทันที"
                  >
                    ⚡ เติมเงินเดือน ฿17,993.32
                  </button>
                )}

                <button 
                  onClick={() => handleOpenEditAccount(acc)}
                  className="btn btn-outline" 
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  แก้ตัวเลข
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4-Tab Purpose-Driven & Holistic Money Allocation Assistant Modal */}
      <AllocationModal
        isOpen={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        sotData={sotData}
        updateSOTData={updateSOTData}
      />

      {/* Log OT Cash Modal */}
      {showOtModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '24px', border: '1px solid var(--border-glow)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '14px' }}>
              💵 บันทึกรับเงินสดพิเศษ (โอเย็น / วันเสาร์ / ซัมเมอร์)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              ระบบจะจำลองการนำเงินสดเข้าผ่าน TrueMoney และโอนเข้าสู่บัญชีปลายทางที่เลือก
            </p>

            <form onSubmit={handleLogOtCash} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ประเภทเงินพิเศษที่ได้รับ
                </label>
                <select
                  value={otType}
                  onChange={(e) => setOtType(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                >
                  <option value="EVENING">🌙 อยู่เวรเย็น (โอเย็น 1 ชม. = ฿200 / วัน)</option>
                  <option value="SATURDAY">☀️ สอน/ทำงานวันเสาร์ (฿1,100 / วัน)</option>
                  <option value="SUMMER">🏖️ สอนซัมเมอร์ / เงินพิเศษอื่นๆ</option>
                </select>
              </div>

              {otType !== 'SUMMER' ? (
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    จำนวนวันที่ได้เบิกในรอบนี้
                  </label>
                  <input
                    type="number"
                    value={otDays}
                    onChange={(e) => setOtDays(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)', fontSize: '1.1rem', fontWeight: 700 }}
                    placeholder="เช่น 15"
                    required
                  />
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', marginTop: '4px' }}>
                    คำนวณยอดเงินสด: <b>฿{((parseInt(otDays) || 0) * (otType === 'EVENING' ? 200 : 1100)).toLocaleString()}</b> บาท
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ระบุจำนวนเงินสดทั้งหมด (บาท)
                  </label>
                  <input
                    type="number"
                    value={otCustomAmount}
                    onChange={(e) => setOtCustomAmount(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)', fontSize: '1.1rem', fontWeight: 700 }}
                    placeholder="เช่น 6000"
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  เส้นทางการนำเงินเข้ากระเป๋า
                </label>
                <select
                  value={depositTarget}
                  onChange={(e) => setDepositTarget(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                >
                  <option value="KBANK-DEBIT">นำเข้า TrueMoney ➔ โอนเข้า KBank เดบิต (แนะนำ)</option>
                  <option value="KBANK-FOOD">นำเข้า TrueMoney ➔ เข้ากระเป๋า ค่ากินแซ่บ (KBANK-FOOD)</option>
                  <option value="KBANK-SPAY">นำเข้า TrueMoney ➔ เข้ากระเป๋า กันจ่าย SPayLater (KBANK-SPAY)</option>
                  <option value="KBANK-EMERG">นำเข้า TrueMoney ➔ เก็บเป็นเงินสำรองปิดเทอม (KBANK-EMERG)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowOtModal(false)} className="btn btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-warning">
                  บันทึกนำเงินเข้ากระเป๋า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Balance Modal */}
      {editingAccount && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', border: '1px solid var(--border-glow)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
              ✏️ แก้ไขยอดเงินบัญชี: {editingAccount.name}
            </h3>

            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ชื่อบัญชี / กระเป๋า
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  {editingAccount.category === 'CREDIT_LINE' ? 'วงเงินคงเหลือ (บาท)' : 'ยอดเงินจริงในบัญชีปัจจุบัน (บาท)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)', fontSize: '1.2rem', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  วัตถุประสงค์การใช้งาน
                </label>
                <textarea
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  rows="2"
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '0.85rem', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingAccount(null)} className="btn btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  บันทึกยอดเงินจริง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', border: '1px solid var(--border-glow)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
              โอนย้ายเงินระหว่างกระเป๋า
            </h3>

            <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  จากบัญชีต้นทาง
                </label>
                <select 
                  value={fromAccount} 
                  onChange={(e) => setFromAccount(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (฿{a.balance.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ไปยังบัญชีปลายทาง
                </label>
                <select 
                  value={toAccount} 
                  onChange={(e) => setToAccount(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (฿{a.balance.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  จำนวนเงิน (บาท)
                </label>
                <input
                  type="number"
                  placeholder="เช่น 3000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '1rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowTransferModal(false)} className="btn btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  ยืนยันการโอน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Scraper Bookmarklet Modal */}
      <SalaryBookmarkletModal
        isOpen={showBookmarkletModal}
        onClose={() => setShowBookmarkletModal(false)}
      />

    </div>
  );
}
