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
  HelpCircle
} from 'lucide-react';
import { addAuditEvent } from '../services/storageService';

export default function AccountsManager({ sotData, updateSOTData }) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showOtModal, setShowOtModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Transfer states
  const [fromAccount, setFromAccount] = useState('KTB-SALARY');
  const [toAccount, setToAccount] = useState('KBANK-MAIN');
  const [transferAmount, setTransferAmount] = useState('');

  // Real-Time Allocation Pipeline states
  const [allocationSourceId, setAllocationSourceId] = useState('KTB-SALARY');
  const [inflowAmount, setInflowAmount] = useState('0');

  // Mandatory Upcoming Bills toggles & targets
  const [paySpayBill, setPaySpayBill] = useState(true);
  const [spayTargetAmount, setSpayTargetAmount] = useState(13639.22);

  const [payHomeBill, setPayHomeBill] = useState(false);
  const [homeTargetAmount, setHomeTargetAmount] = useState(0);

  const [paySubsBill, setPaySubsBill] = useState(true);
  const [subsTargetAmount, setSubsTargetAmount] = useState(518);

  const [payDebtsBill, setPayDebtsBill] = useState(false);
  const [debtsTargetAmount, setDebtsTargetAmount] = useState(0);

  // Remaining "Guilt-Free" Spending Pockets
  const [allocFood, setAllocFood] = useState(0);
  const [allocSnack, setAllocSnack] = useState(0);
  const [allocEmerg, setAllocEmerg] = useState(0);
  const [allocMain, setAllocMain] = useState(0);

  // OT Cash Intake states
  const [otType, setOtType] = useState('EVENING'); // EVENING, SATURDAY, SUMMER
  const [otDays, setOtDays] = useState('15');
  const [otCustomAmount, setOtCustomAmount] = useState('');
  const [depositTarget, setDepositTarget] = useState('KBANK-DEBIT');

  // Edit Account states
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editPurpose, setEditPurpose] = useState('');

  const accounts = sotData.accounts || [];
  const debts = sotData.debts || [];
  const familySettlements = sotData.familySettlements || [];
  const subscriptions = sotData.subscriptions || [];

  const sourceAccount = accounts.find(a => a.id === allocationSourceId) || accounts[0];
  const sourceBalance = sourceAccount?.balance || 0;

  // Pending family dues from actual database
  const pendingFamilyWeOwe = familySettlements.reduce((sum, person) => {
    const pWeOwe = (person.items || []).filter(i => i.type === 'WE_OWE' && i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
    const pTheyOwe = (person.items || []).filter(i => i.type === 'THEY_OWE' && i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
    const net = pWeOwe - pTheyOwe;
    return sum + (net > 0 ? net : 0);
  }, 0);

  // Subscriptions that deduct directly from KBank (not bundled into Shopee SPayLater / ShopeePay)
  // E.g. Netflix 4K UHD (full ฿518) cuts from KBank Debit directly; YouTube/Google One/CapCut cut via Shopee SPayLater
  const kbankDirectSubs = subscriptions.filter(s => 
    s.status === 'ACTIVE' && 
    !s.paymentMethod?.toLowerCase().includes('shopee') && 
    !s.paymentMethod?.toLowerCase().includes('spay')
  );
  const totalKBankDirectSubs = kbankDirectSubs.reduce((sum, s) => sum + (s.fullAmount || s.ourShareAmount || 518), 0) || 518;

  // Total personal debt monthly installments
  const totalPersonalMonthlyDebt = debts
    .filter(d => d.payerType === 'WE_PAY')
    .reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);

  // Unified target initializer for Live Allocation Assistant
  const resetAllocationTargets = (srcId, curBal) => {
    const initialInflow = parseFloat(curBal) || 0;
    setAllocationSourceId(srcId);
    setInflowAmount(initialInflow.toString());

    // 1. Home / Family Bill: Check if already settled in database
    const isHomePending = pendingFamilyWeOwe > 0;
    const liveHome = isHomePending ? pendingFamilyWeOwe : 0;
    setPayHomeBill(isHomePending);
    setHomeTargetAmount(liveHome);

    // 2. SPayLater: Statement Bill is exactly ฿13,639.22 (includes Google One, CapCut, YouTube if on ShopeePay)
    const spayAcc = accounts.find(a => a.id === 'KBANK-SPAY') || { balance: 0 };
    const fullSpayStatement = 13639.22;
    const spayGap = Math.max(0, Math.round((fullSpayStatement - (spayAcc.balance || 0)) * 100) / 100);
    const isSpayNeeded = spayGap > 0;

    // Default allocation towards SPay from this inflow
    const subsCost = totalKBankDirectSubs;
    let defaultSpayAlloc = 0;
    if (isSpayNeeded) {
      if (initialInflow >= (spayGap + subsCost)) {
        defaultSpayAlloc = spayGap;
      } else {
        defaultSpayAlloc = Math.max(0, Math.round((initialInflow - subsCost) * 100) / 100);
        if (defaultSpayAlloc === 0 && initialInflow > 0) {
          defaultSpayAlloc = initialInflow;
        }
      }
    }

    setPaySpayBill(isSpayNeeded);
    setSpayTargetAmount(defaultSpayAlloc);

    // 3. Subscriptions that deduct directly from KBank (Netflix เต็มจำนวน ฿518)
    const liveSubs = totalKBankDirectSubs;
    const isSubsNeeded = initialInflow >= liveSubs;
    setPaySubsBill(isSubsNeeded);
    setSubsTargetAmount(liveSubs);

    autoCalculateSpendingSplit(
      initialInflow,
      isSpayNeeded,
      defaultSpayAlloc,
      isHomePending,
      liveHome,
      isSubsNeeded,
      liveSubs,
      false,
      0
    );
  };

  // Auto-tune targets based on current live liabilities when opening modal
  const handleOpenAllocationModal = () => {
    const src = accounts.find(a => (a.balance || 0) > 0) || accounts[0];
    const srcId = src?.id || 'KBANK-DEBIT';
    const curBal = src?.balance || 0;

    resetAllocationTargets(srcId, curBal);
    setShowAllocationModal(true);
  };

  // Re-calculate the "Guilt-free" spending pool automatically
  const autoCalculateSpendingSplit = (
    inflow,
    includeSpay = paySpayBill,
    spayVal = spayTargetAmount,
    includeHome = payHomeBill,
    homeVal = homeTargetAmount,
    includeSubs = paySubsBill,
    subsVal = subsTargetAmount,
    includeDebts = payDebtsBill,
    debtsVal = debtsTargetAmount
  ) => {
    const totalInflow = parseFloat(inflow) || 0;
    const totalMandatory = 
      (includeSpay ? parseFloat(spayVal) || 0 : 0) +
      (includeHome ? parseFloat(homeVal) || 0 : 0) +
      (includeSubs ? parseFloat(subsVal) || 0 : 0) +
      (includeDebts ? parseFloat(debtsVal) || 0 : 0);

    const safeToSpend = Math.max(0, totalInflow - totalMandatory);

    if (safeToSpend <= 0) {
      setAllocFood(0);
      setAllocSnack(0);
      setAllocEmerg(0);
      setAllocMain(0);
      return;
    }

    // Default Zero-Thought Split:
    // 🍜 Food (กินแซ่บ/บุฟเฟต์): ~60% (e.g. ฿3,500)
    // 🍦 Snack (เติมบัตร รร.): ~25% (e.g. ฿1,500)
    // 💰 Main / Buffer: Remainder ~15%
    const food = Math.min(safeToSpend * 0.6, 3500);
    const rem1 = safeToSpend - food;

    const snack = Math.min(rem1 * 0.6, 1500);
    const rem2 = rem1 - snack;

    const main = Math.round(rem2 * 100) / 100;

    setAllocFood(Math.round(food * 100) / 100);
    setAllocSnack(Math.round(snack * 100) / 100);
    setAllocEmerg(0);
    setAllocMain(main);
  };

  // Sum of mandatory bills
  const mandatoryBillsSum = 
    (paySpayBill ? parseFloat(spayTargetAmount) || 0 : 0) +
    (payHomeBill ? parseFloat(homeTargetAmount) || 0 : 0) +
    (paySubsBill ? parseFloat(subsTargetAmount) || 0 : 0) +
    (payDebtsBill ? parseFloat(debtsTargetAmount) || 0 : 0);

  // Sum of guilt-free spending pockets
  const spendingPocketsSum = 
    (parseFloat(allocFood) || 0) +
    (parseFloat(allocSnack) || 0) +
    (parseFloat(allocEmerg) || 0) +
    (parseFloat(allocMain) || 0);

  const totalAllocated = Math.round((mandatoryBillsSum + spendingPocketsSum) * 100) / 100;
  const parsedInflow = parseFloat(inflowAmount) || 0;
  const diffInflow = Math.round((parsedInflow - totalAllocated) * 100) / 100;
  const safeToSpendPool = Math.round((parsedInflow - mandatoryBillsSum) * 100) / 100;

  // Execute Pipeline Allocation
  const handleExecuteAllocation = () => {
    if (totalAllocated <= 0) {
      alert('⚠️ กรุณาระบุยอดเงินที่จะจัดสรร');
      return;
    }

    if (sourceBalance < totalAllocated) {
      if (!window.confirm(`⚠️ ยอดเงินในบัญชีต้นทาง (${sourceAccount?.name}) ปัจจุบันมี ฿${sourceBalance.toLocaleString()} แต่มียอดจัดสรรรวม ฿${totalAllocated.toLocaleString()}\n\nต้องการยืนยันการจัดสรรและกระจายเข้ากระเป๋าจริงหรือไม่?`)) {
        return;
      }
    } else {
      if (!window.confirm(`ยืนยันการจัดสรรเงิน ฿${totalAllocated.toLocaleString()} จาก [${sourceAccount?.name}] เข้ากระเป๋าตามสูตรนี้ทันที?`)) {
        return;
      }
    }

    const updatedAccounts = accounts.map(acc => {
      // 1. Deduct from source account
      if (acc.id === allocationSourceId) {
        return {
          ...acc,
          balance: Math.max(0, Math.round((acc.balance - totalAllocated) * 100) / 100),
          updatedAt: new Date().toISOString()
        };
      }
      // 2. Add to SPayLater sinking fund
      if (acc.id === 'KBANK-SPAY' && paySpayBill && spayTargetAmount > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(spayTargetAmount)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      // 3. Add to Home / Mom pocket
      if (acc.id === 'KBANK-HOME' && payHomeBill && homeTargetAmount > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(homeTargetAmount)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      // 4. Add to Food pocket
      if (acc.id === 'KBANK-FOOD' && allocFood > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(allocFood)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      // 5. Add to Snack / School card pocket
      if (acc.id === 'KBANK-SNACK' && allocSnack > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(allocSnack)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      // 6. Add to Emergency pocket
      if (acc.id === 'KBANK-EMERG' && allocEmerg > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(allocEmerg)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      // 7. Add to Main pocket
      if (acc.id === 'KBANK-MAIN') {
        const addedMain = (allocMain > 0 ? parseFloat(allocMain) : 0) + (paySubsBill ? parseFloat(subsTargetAmount) : 0);
        return { ...acc, balance: Math.round(((acc.balance || 0) + addedMain) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      return acc;
    });

    let nextData = { ...sotData, accounts: updatedAccounts };
    nextData = addAuditEvent(nextData, 'ALLOCATION', 'PIPELINE_ALLOCATION', 'AUTO_ALLOCATED_POCKETS', {
      sourceAccountId: allocationSourceId,
      totalAllocated,
      mandatoryBillsSum,
      safeToSpendPool,
      breakdown: {
        spay: paySpayBill ? spayTargetAmount : 0,
        home: payHomeBill ? homeTargetAmount : 0,
        food: allocFood,
        snack: allocSnack,
        emerg: allocEmerg,
        main: allocMain
      }
    });

    updateSOTData(nextData);
    setShowAllocationModal(false);
    alert(`🎉 จัดสรรเงินเรียบร้อยแล้ว!\nกระจายเงิน ฿${totalAllocated.toLocaleString()} เข้ากระเป๋าต่างๆ เรียบร้อย ล็อกบิลบังคับครบ และพร้อมใช้จ่ายแบบสบายใจครับ`);
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return;

    const sourceAcc = accounts.find(a => a.id === fromAccount);
    if (!sourceAcc || sourceAcc.balance < amount) {
      alert('⚠️ ยอดเงินในบัญชีต้นทางไม่เพียงพอ!');
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
    alert(`🎉 บันทึกรับ ${otLabel} รวม ฿${calculatedAmount.toLocaleString()} เข้ากระเป๋า ${depositTarget} เรียบร้อยแล้ว!`);
  };

  const handleOpenEditAccount = (acc) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditBalance(acc.balance.toString());
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
            <button onClick={handleOpenAllocationModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <Calculator size={15} /> 🧮 ผู้ช่วยจัดสรรเงิน: ล็อกบิลก่อน & ใช้แบบไม่ต้องคิด
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
              <button 
                onClick={() => handleOpenEditAccount(acc)}
                className="btn btn-outline" 
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                แก้ตัวเลข
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upgraded 2-Stage Zero-Thought Money Allocation Assistant Modal */}
      {showAllocationModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', padding: '26px', border: '1px solid var(--border-glow)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calculator size={24} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  🧮 ผู้ช่วยจัดสรรเงิน: ล็อกบิลก่อน & ใช้ส่วนที่เหลือแบบไม่ต้องคิด
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  สแกนบิลที่จะมาเก็บก่อนอัตโนมัติ ➔ ตัดกันเงินไว้ ➔ แบ่งเงินที่เหลือเข้ากระเป๋ากินแซ่บและขนมสบายใจ
                </span>
              </div>
            </div>

            {/* Inflow Box */}
            <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    📥 1. เงินก้อนที่เพิ่งได้รับมา (เลือกกระเป๋าต้นทาง):
                  </label>
                  <select
                    value={allocationSourceId}
                    onChange={(e) => {
                      const newSrcId = e.target.value;
                      const newSrc = accounts.find(a => a.id === newSrcId);
                      const newBal = newSrc?.balance || 0;
                      resetAllocationTargets(newSrcId, newBal);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        [{a.id}] {a.name} (คงเหลือ ฿{(a.balance || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    จำนวนเงินที่จะนำมาจัดสรรรอบนี้ (บาท):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inflowAmount}
                    onChange={(e) => {
                      setInflowAmount(e.target.value);
                      autoCalculateSpendingSplit(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-cyan)',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                    placeholder="17993.32"
                  />
                </div>
              </div>
            </div>

            {/* STAGE 1: Mandatory Upcoming Bills Lock-in */}
            <div style={{ background: 'rgba(244, 63, 94, 0.04)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={18} color="var(--accent-rose)" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                    ขั้นตอนที่ 1: 🔒 ล็อกเงินจ่ายบิลบังคับที่กำลังจะมาเก็บรอบนี้
                  </span>
                </div>
                <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                  รวมล็อกไว้: <strong style={{ color: 'var(--accent-rose)', fontSize: '1rem' }}>฿{mandatoryBillsSum.toLocaleString()}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Bill 1: SPayLater */}
                {(() => {
                  const spayAcc = accounts.find(a => a.id === 'KBANK-SPAY') || { balance: 0 };
                  const fullSpayStatement = 13639.22;
                  const isSpayFunded = (spayAcc.balance || 0) >= fullSpayStatement;
                  const gap = Math.max(0, Math.round((fullSpayStatement - (spayAcc.balance || 0)) * 100) / 100);

                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 0, 0, 0.4)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={paySpayBill}
                          onChange={(e) => {
                            setPaySpayBill(e.target.checked);
                            autoCalculateSpendingSplit(inflowAmount, e.target.checked);
                          }}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            💳 บิล Shopee SPayLater ยอดเต็ม (ตัดรอบ 10 ก.ย.)
                            {isSpayFunded ? (
                              <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>กันไว้ครบ 100% แล้ว</span>
                            ) : (
                              <span className="badge badge-rose" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>ยอดเต็ม ฿{fullSpayStatement.toLocaleString()}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: isSpayFunded ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                            {isSpayFunded 
                              ? `ในกระเป๋า [KBANK-SPAY] มีเงินกันไว้ครบแล้ว ฿${(spayAcc.balance || 0).toLocaleString()} (พร้อมตัดจ่าย)`
                              : `ในกระเป๋า [KBANK-SPAY] มีอยู่ ฿${(spayAcc.balance || 0).toLocaleString()} ➔ ต้องกันเพิ่มอีก ฿${gap.toLocaleString()} ให้ครบยอดตัดบิล 10 ก.ย.`}
                          </div>
                        </div>
                      </label>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>฿</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={!paySpayBill}
                          value={spayTargetAmount}
                          onChange={(e) => {
                            setSpayTargetAmount(parseFloat(e.target.value) || 0);
                            autoCalculateSpendingSplit(inflowAmount, paySpayBill, e.target.value);
                          }}
                          style={{ width: '110px', padding: '6px 8px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--accent-rose)', fontWeight: 700, textAlign: 'right' }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Bill 2: Home / Mom Settlement */}
                {(() => {
                  const isHomeSettled = pendingFamilyWeOwe === 0;
                  return (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: isHomeSettled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0, 0, 0, 0.4)', 
                      padding: '10px 14px', 
                      borderRadius: 'var(--radius-sm)', 
                      border: isHomeSettled ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)' 
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={payHomeBill}
                          onChange={(e) => {
                            setPayHomeBill(e.target.checked);
                            autoCalculateSpendingSplit(inflowAmount, paySpayBill, spayTargetAmount, e.target.checked);
                          }}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🏠 บิลบ้าน แม่ พี่แพร (ค่าน้ำ ค่าไฟ ค่ากับข้าว)
                            {isHomeSettled && <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>เคลียร์ครบแล้ว</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: isHomeSettled ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                            {isHomeSettled ? '🎉 เคลียร์บิลกับแม่และพี่แพรเรียบร้อยแล้ว (ยอดค้างชำระ: ฿0.00)' : 'กันเงินเข้ากระเป๋า [KBANK-HOME] (ตัดจ่ายสิ้นเดือน)'}
                          </div>
                        </div>
                      </label>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>฿</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={!payHomeBill}
                          value={homeTargetAmount}
                          onChange={(e) => {
                            setHomeTargetAmount(parseFloat(e.target.value) || 0);
                            autoCalculateSpendingSplit(inflowAmount, paySpayBill, spayTargetAmount, payHomeBill, e.target.value);
                          }}
                          style={{ width: '110px', padding: '6px 8px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff', fontWeight: 700, textAlign: 'right' }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Bill 3: Digital Subscriptions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 0, 0, 0.4)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={paySubsBill}
                      onChange={(e) => {
                        setPaySubsBill(e.target.checked);
                        autoCalculateSpendingSplit(inflowAmount, paySpayBill, spayTargetAmount, payHomeBill, homeTargetAmount, e.target.checked);
                      }}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                        📺 บริการรายเดือนตัดผ่านกสิกร (Netflix 4K จัดเต็ม ฿518)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        กันเงินไว้ใน [KBANK-MAIN] ฿{subsTargetAmount} สำหรับตัดบัตรเดบิต (ส่วน YouTube, Google One, CapCut ถูกรวมไปตัดในบิล Shopee SPayLater ด้านบนแล้ว ไม่ต้องกันเงินซ้ำ)
                      </div>
                    </div>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>฿</span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!paySubsBill}
                      value={subsTargetAmount}
                      onChange={(e) => {
                        setSubsTargetAmount(parseFloat(e.target.value) || 0);
                        autoCalculateSpendingSplit(inflowAmount, paySpayBill, spayTargetAmount, payHomeBill, homeTargetAmount, paySubsBill, e.target.value);
                      }}
                      style={{ width: '110px', padding: '6px 8px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff', fontWeight: 700, textAlign: 'right' }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* STAGE 2: Guilt-Free Safe-to-Spend Pool */}
            <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Smile size={18} color="var(--accent-emerald)" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    ขั้นตอนที่ 2: 🎉 เงินส่วนที่เหลือใช้ได้จริงแบบสบายใจ (ไม่ต้องคิดเยอะ!)
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  เงินเหลือใช้จริง: <strong style={{ color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>฿{safeToSpendPool.toLocaleString()}</strong>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                💡 บิลบังคับถูกล็อกไว้ครบแล้ว! ยอดด้านล่างนี้คืองบที่กระจายเข้ากระเป๋าใช้ชีวิต กินแซ่บ ช้อปปิ้ง เติมขนม ได้อย่างสบายใจ 100% ไม่ต้องกลัวเงินไม่พอจ่ายบิล
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                
                {/* Pocket 1: KBANK-FOOD */}
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                      🍣 ค่ากินแซ่บ แซลมอน & บุฟเฟต์คลายเครียด
                    </span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>KBANK-FOOD</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', minHeight: '30px' }}>
                    แซลมอน, บุฟเฟต์ Shinkanzen โลตัสติวานนท์ & บำรุงสุขภาพจิต (รางวัลเลิกบุหรี่เพื่อลูก)
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>งบ: ฿</span>
                    <input
                      type="number"
                      step="0.01"
                      value={allocFood}
                      onChange={(e) => setAllocFood(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '6px 8px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '1rem' }}
                    />
                  </div>
                </div>

                {/* Pocket 2: KBANK-SNACK */}
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
                      🍦 เหมาเติมบัตรโรงเรียน/ขนม
                    </span>
                    <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>KBANK-SNACK</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', minHeight: '30px' }}>
                    เหมาเติมบัตร รร. สัปดาห์ละ 300-500 กินไอติม/ไก่ทอด ไม่ต้องจดย่อย
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>งบ: ฿</span>
                    <input
                      type="number"
                      step="0.01"
                      value={allocSnack}
                      onChange={(e) => setAllocSnack(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '6px 8px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--accent-amber)', fontWeight: 700, fontSize: '1rem' }}
                    />
                  </div>
                </div>

                {/* Pocket 3: KBANK-EMERG */}
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-rose)' }}>
                      🚨 สำรองฉุกเฉิน / ปิดเทอม
                    </span>
                    <span className="badge badge-rose" style={{ fontSize: '0.7rem' }}>KBANK-EMERG</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', minHeight: '30px' }}>
                    เงินก้อนสำรองช่วงปิดเทอมที่ไม่มีโอเย็น หรืออารมณ์ฉุกเฉิน
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>งบ: ฿</span>
                    <input
                      type="number"
                      step="0.01"
                      value={allocEmerg}
                      onChange={(e) => setAllocEmerg(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '6px 8px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff', fontWeight: 700, fontSize: '1rem' }}
                    />
                  </div>
                </div>

                {/* Pocket 4: KBANK-MAIN */}
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      💰 กระเป๋าหลัก / พักเงิน
                    </span>
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>KBANK-MAIN</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', minHeight: '30px' }}>
                    เงินติดกระเป๋าสำหรับช้อปปิ้งทั่วไป หรือพักไว้เป็นกันชน
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>งบ: ฿</span>
                    <input
                      type="number"
                      step="0.01"
                      value={allocMain}
                      onChange={(e) => setAllocMain(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '6px 8px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '1rem' }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Allocation Balance Health Status Bar */}
            <div style={{ 
              background: diffInflow === 0 ? 'rgba(16, 185, 129, 0.08)' : diffInflow < 0 ? 'rgba(244, 63, 94, 0.1)' : 'rgba(6, 182, 212, 0.08)',
              border: `1px solid ${diffInflow === 0 ? 'rgba(16, 185, 129, 0.3)' : diffInflow < 0 ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-glow)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>สรุปยอดจัดสรรทั้งหมด:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    ฿{totalAllocated.toLocaleString()} / ฿{parsedInflow.toLocaleString()}
                  </div>
                </div>

                <div>
                  {diffInflow === 0 ? (
                    <span className="badge badge-emerald" style={{ fontSize: '0.85rem' }}>
                      ✅ จัดสรรครบ 100% พอดีเป๊ะ
                    </span>
                  ) : diffInflow > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.85rem' }}>
                        เหลือเงินยังไม่ได้กระจาย: ฿{diffInflow.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAllocMain(Math.round(((parseFloat(allocMain) || 0) + diffInflow) * 100) / 100)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      >
                        ➕ ปัดเข้ากระเป๋าหลัก
                      </button>
                    </div>
                  ) : (
                    <span className="badge badge-rose" style={{ fontSize: '0.85rem' }}>
                      ⚠️ จัดสรรเกินเงินเข้า: ฿{Math.abs(diffInflow).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAllocationModal(false)} className="btn btn-outline">
                ปิด
              </button>
              <button
                type="button"
                onClick={handleExecuteAllocation}
                className="btn btn-success"
                style={{ padding: '10px 22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle2 size={18} /> ยืนยันการจัดสรรและกระจายเงินจริงทันที
              </button>
            </div>

          </div>
        </div>
      )}

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

    </div>
  );
}
