import React, { useState } from 'react';
import { 
  Calculator, 
  Sparkles, 
  Target, 
  ArrowRightLeft, 
  Clock, 
  Layers, 
  Lock, 
  Smile, 
  ShieldAlert, 
  CreditCard, 
  Landmark, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Zap 
} from 'lucide-react';
import { addAuditEvent } from '../services/storageService';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function AllocationModal({ isOpen, onClose, sotData, updateSOTData }) {
  const { confirm: modalConfirm, alert: modalAlert, toast } = useModalNotification();

  // Assistant active tab: 'HOLISTIC' | 'REBALANCE' | 'OT_SIMULATION' | 'SINGLE_INFLOW'
  const [assistantTab, setAssistantTab] = useState('HOLISTIC');

  // Custom targets for guilt-free living pockets
  const [targetFood, setTargetFood] = useState(3000);
  const [targetSnack, setTargetSnack] = useState(1500);
  const [targetEmerg, setTargetEmerg] = useState(1000);

  // Inter-pocket Rebalance state
  const [rebalanceFrom, setRebalanceFrom] = useState('KBANK-MAIN');
  const [rebalanceTo, setRebalanceTo] = useState('KBANK-SPAY');
  const [rebalanceAmount, setRebalanceAmount] = useState('2500');

  // OT Simulation state
  const [simOtDays, setSimOtDays] = useState('18');
  const [simOtCustom, setSimOtCustom] = useState('3600');
  const [simTargetSpay, setSimTargetSpay] = useState('2500');
  const [simTargetFood, setSimTargetFood] = useState('1100');
  const [simTargetSnack, setSimTargetSnack] = useState('0');

  // Classic Single-Inflow states
  const accounts = sotData.accounts || [];
  const debts = sotData.debts || [];
  const familySettlements = sotData.familySettlements || [];
  const subscriptions = sotData.subscriptions || [];

  const defaultSource = accounts.find(a => (a.balance || 0) > 0) || accounts[0];
  const [allocationSourceId, setAllocationSourceId] = useState(defaultSource?.id || 'KBANK-DEBIT');
  const [inflowAmount, setInflowAmount] = useState((defaultSource?.balance || 0).toString());
  const [paySpayBill, setPaySpayBill] = useState(true);
  const [spayTargetAmount, setSpayTargetAmount] = useState(13639.22);
  const [payHomeBill, setPayHomeBill] = useState(false);
  const [homeTargetAmount, setHomeTargetAmount] = useState(0);
  const [paySubsBill, setPaySubsBill] = useState(true);
  const [subsTargetAmount, setSubsTargetAmount] = useState(518);
  const [payDebtsBill, setPayDebtsBill] = useState(false);
  const [debtsTargetAmount, setDebtsTargetAmount] = useState(0);
  const [allocFood, setAllocFood] = useState(0);
  const [allocSnack, setAllocSnack] = useState(0);
  const [allocEmerg, setAllocEmerg] = useState(0);
  const [allocMain, setAllocMain] = useState(0);
  const [allocationStrategy, setAllocationStrategy] = useState('WATERFALL');

  if (!isOpen) return null;

  // Specific Accounts
  const mainAcc = accounts.find(a => a.id === 'KBANK-MAIN') || { balance: 0 };
  const spayAcc = accounts.find(a => a.id === 'KBANK-SPAY') || { balance: 0 };
  const homeAcc = accounts.find(a => a.id === 'KBANK-HOME') || { balance: 0 };
  const foodAcc = accounts.find(a => a.id === 'KBANK-FOOD') || { balance: 0 };
  const snackAcc = accounts.find(a => a.id === 'KBANK-SNACK') || { balance: 0 };
  const emergAcc = accounts.find(a => a.id === 'KBANK-EMERG') || { balance: 0 };
  const debitAcc = accounts.find(a => a.id === 'KBANK-DEBIT') || { balance: 0 };
  const salaryAcc = accounts.find(a => a.id === 'KTB-SALARY') || { balance: 0 };

  const sourceAccount = accounts.find(a => a.id === allocationSourceId) || accounts[0];
  const sourceBalance = sourceAccount?.balance || 0;

  // Dynamic Due Date
  const getSpayDueDateString = (cycleStr) => {
    if (!cycleStr) return '10 ต.ค.';
    const match = cycleStr.match(/ครบกำหนด\s*([^\)]+)/);
    if (match) return match[1].trim();
    return '10 ต.ค.';
  };
  const spayDueDate = getSpayDueDateString(sotData.spayStatementCycle);

  // Inflow Milestones
  const milestones = sotData.monthlyIncomeMilestones || {
    salaryReceived: true,
    saturdayOtReceived: true,
    eveningOtReceived: false
  };

  // Liabilities Calculations
  const isSpayStatementPaid = sotData.spayStatementStatus === 'PAID';
  const currentBnplTotal = (sotData.bnplItems || [])
    .filter(i => !isSpayStatementPaid && !i.isPaidInStatement)
    .reduce((sum, item) => sum + item.amount, 0);
  const fullSpayStatement = isSpayStatementPaid ? 0 : (currentBnplTotal + 5177.95);
  const spayGap = Math.max(0, Math.round((fullSpayStatement - (spayAcc.balance || 0)) * 100) / 100);
  const isSpayNeeded = !isSpayStatementPaid && spayGap > 0;

  const pendingFamilyWeOwe = familySettlements.reduce((sum, person) => {
    const pWeOwe = (person.items || []).filter(i => i.type === 'WE_OWE' && i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
    const pTheyOwe = (person.items || []).filter(i => i.type === 'THEY_OWE' && i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
    const net = pWeOwe - pTheyOwe;
    return sum + (net > 0 ? net : 0);
  }, 0);
  const liveHome = pendingFamilyWeOwe;
  const isHomePending = liveHome > 0;

  const kbankDirectSubs = subscriptions.filter(s => 
    s.status === 'ACTIVE' && 
    !s.paymentMethod?.toLowerCase().includes('shopee') && 
    !s.paymentMethod?.toLowerCase().includes('spay')
  );
  const liveSubs = kbankDirectSubs.reduce((sum, s) => sum + (s.fullAmount || s.ourShareAmount || 518), 0) || 518;
  const isSubsNeeded = liveSubs > 0;
  const totalMandatoryLiabilities = Math.round(((isSpayNeeded ? spayGap : 0) + (isHomePending ? liveHome : 0) + (isSubsNeeded ? liveSubs : 0)) * 100) / 100;

  // Holistic Balancer Values
  const targetSpay = isSpayStatementPaid ? 0 : fullSpayStatement;
  const targetHome = liveHome;
  const targetSubs = liveSubs; // ฿518 for Netflix

  const gapSpay = Math.max(0, Math.round((targetSpay - (spayAcc.balance || 0)) * 100) / 100);
  const gapHome = Math.max(0, Math.round((targetHome - (homeAcc.balance || 0)) * 100) / 100);
  const netMainSurplus = Math.max(0, Math.round(((mainAcc.balance || 0) - targetSubs) * 100) / 100);
  const gapMainSubs = Math.max(0, Math.round((targetSubs - (mainAcc.balance || 0)) * 100) / 100);

  const gapFood = Math.max(0, Math.round((targetFood - (foodAcc.balance || 0)) * 100) / 100);
  const gapSnack = Math.max(0, Math.round((targetSnack - (snackAcc.balance || 0)) * 100) / 100);
  const gapEmerg = Math.max(0, Math.round((targetEmerg - (emergAcc.balance || 0)) * 100) / 100);

  const totalHolisticTarget = targetSpay + targetHome + targetSubs + targetFood + targetSnack + targetEmerg;
  const totalHolisticGaps = gapSpay + gapHome + gapMainSubs + gapFood + gapSnack + gapEmerg;
  const totalLiquidCash = accounts.filter(a => a.category !== 'CREDIT_LINE').reduce((sum, a) => sum + (a.balance || 0), 0);

  // Toggle Inflow Milestones
  const handleToggleMilestone = (key) => {
    const cur = milestones[key];
    const nextMilestones = { ...milestones, [key]: !cur };
    let nextData = { ...sotData, monthlyIncomeMilestones: nextMilestones };
    nextData = addAuditEvent(nextData, 'MILESTONE', key, 'TOGGLED', { [key]: !cur });
    updateSOTData(nextData);
    toast(`อัปเดตสถานะรายรับ: ${!cur ? '✅ ได้รับแล้ว' : '⏳ รอรับ'}`, { type: 'info' });
  };

  // Execute Inter-Pocket Rebalance
  const handleExecuteRebalance = async () => {
    const val = parseFloat(rebalanceAmount);
    if (isNaN(val) || val <= 0) {
      await modalAlert({ title: 'ยอดเงินไม่ถูกต้อง', message: 'กรุณาระบุจำนวนเงินที่จะปรับเกลี่ย', variant: 'warning' });
      return;
    }
    const src = accounts.find(a => a.id === rebalanceFrom);
    if (!src || (src.balance || 0) < val) {
      await modalAlert({
        title: 'ยอดเงินไม่เพียงพอ',
        message: `กระเป๋าต้นทาง [${src?.name}] มีเงินไม่พอโยกจำนวน ฿${val.toLocaleString()}`,
        variant: 'danger'
      });
      return;
    }

    const dest = accounts.find(a => a.id === rebalanceTo);
    const confirmed = await modalConfirm({
      title: '🔀 ยืนยันการปรับเกลี่ยเงินส่วนเกิน',
      message: `ต้องการย้ายเงิน ฿${val.toLocaleString()} จาก [${src?.name}] ไปยัง [${dest?.name}] ใช่หรือไม่?`,
      variant: 'info',
      confirmText: 'ยืนยันโยกเงินทันที'
    });
    if (!confirmed) return;

    const updatedAccounts = accounts.map(a => {
      if (a.id === rebalanceFrom) return { ...a, balance: Math.round(((a.balance || 0) - val) * 100) / 100, updatedAt: new Date().toISOString() };
      if (a.id === rebalanceTo) return { ...a, balance: Math.round(((a.balance || 0) + val) * 100) / 100, updatedAt: new Date().toISOString() };
      return a;
    });

    let nextData = { ...sotData, accounts: updatedAccounts };
    nextData = addAuditEvent(nextData, 'REBALANCE', `${rebalanceFrom}->${rebalanceTo}`, 'INTER_POCKET_REBALANCE', {
      from: rebalanceFrom,
      to: rebalanceTo,
      amount: val
    });

    updateSOTData(nextData);
    toast(`🔀 ปรับเกลี่ยเงิน ฿${val.toLocaleString()} จาก ${src?.name} เข้า ${dest?.name} เรียบร้อยแล้ว!`, { type: 'success' });
  };

  // Execute OT Simulation Allocation
  const handleExecuteOtAllocation = async () => {
    const spayVal = parseFloat(simTargetSpay) || 0;
    const foodVal = parseFloat(simTargetFood) || 0;
    const snackVal = parseFloat(simTargetSnack) || 0;
    const total = spayVal + foodVal + snackVal;
    const expectedTotal = parseFloat(simOtCustom) || 0;

    if (total <= 0) {
      await modalAlert({ title: 'ยอดเงินไม่ถูกต้อง', message: 'กรุณาระบุยอดจัดสรรเงินโอเย็น', variant: 'warning' });
      return;
    }

    if (total > expectedTotal) {
      await modalAlert({
        title: 'ยอดจัดสรรเกินเงินโอที',
        message: `ยอดจัดสรรรวม ฿${total.toLocaleString()} เกินยอดเงินโอทีที่คาดว่าจะได้รับ ฿${expectedTotal.toLocaleString()}`,
        variant: 'warning'
      });
      return;
    }

    const confirmed = await modalConfirm({
      title: '💵 บันทึกรับเงินสดโอเย็น & กระจายตามจุดประสงค์',
      message: `ยืนยันรับเงินสดโอเย็นรวม ฿${total.toLocaleString()} และกระจายเข้ากระเป๋าดังนี้?\n- KBANK-SPAY: ฿${spayVal.toLocaleString()}\n- KBANK-FOOD: ฿${foodVal.toLocaleString()}\n- KBANK-SNACK: ฿${snackVal.toLocaleString()}`,
      variant: 'success',
      confirmText: 'รับเงินและกระจายทันที'
    });
    if (!confirmed) return;

    const updatedAccounts = accounts.map(a => {
      if (a.id === 'KBANK-SPAY' && spayVal > 0) {
        return { ...a, balance: Math.round(((a.balance || 0) + spayVal) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      if (a.id === 'KBANK-FOOD' && foodVal > 0) {
        return { ...a, balance: Math.round(((a.balance || 0) + foodVal) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      if (a.id === 'KBANK-SNACK' && snackVal > 0) {
        return { ...a, balance: Math.round(((a.balance || 0) + snackVal) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      return a;
    });

    const nextMilestones = { ...milestones, eveningOtReceived: true };
    let nextData = { ...sotData, accounts: updatedAccounts, monthlyIncomeMilestones: nextMilestones };
    nextData = addAuditEvent(nextData, 'INCOME_CASH', 'EVENING_OT_ALLOCATED', 'OT_ALLOCATION_EXECUTED', {
      total,
      breakdown: { spay: spayVal, food: foodVal, snack: snackVal }
    });

    updateSOTData(nextData);
    toast(`🎉 บันทึกรับโอเย็น ฿${total.toLocaleString()} และกระจายปิดยอดกระเป๋าเรียบร้อยแล้ว!`, { type: 'success' });
    onClose();
  };

  // Smart Waterfall Engine (for Tab 4)
  const calculateSmartWaterfall = (inflow, strategy = 'WATERFALL') => {
    const totalCash = Math.max(0, parseFloat(inflow) || 0);
    let res = {
      paySubs: false, subsAmount: 0, payHome: false, homeAmount: 0,
      paySpay: false, spayAmount: 0, food: 0, snack: 0, emerg: 0, main: 0,
      spayShortfall: 0, homeShortfall: 0, strategyUsed: strategy
    };

    if (totalCash <= 0) return res;

    let rem = totalCash;
    if (isSubsNeeded && rem > 0) {
      const alloc = Math.min(rem, liveSubs);
      res.paySubs = true;
      res.subsAmount = Math.round(alloc * 100) / 100;
      rem = Math.round((rem - alloc) * 100) / 100;
    }

    if (strategy === 'WATERFALL') {
      if (isHomePending && rem > 0) {
        const alloc = Math.min(rem, liveHome);
        res.payHome = true;
        res.homeAmount = Math.round(alloc * 100) / 100;
        rem = Math.round((rem - alloc) * 100) / 100;
      }
      if (rem > 0) {
        const targetF = Math.min(rem * 0.6, 1000);
        const targetS = Math.min((rem - targetF) * 0.5, 500);
        const livingBaseline = targetF + targetS;
        const cashForSpay = Math.max(0, rem - livingBaseline);
        const spayAlloc = Math.min(cashForSpay, spayGap);
        if (isSpayNeeded && spayAlloc > 0) {
          res.paySpay = true;
          res.spayAmount = Math.round(spayAlloc * 100) / 100;
          rem = Math.round((rem - spayAlloc) * 100) / 100;
        }
        const actualFood = Math.min(rem, targetF > 0 ? targetF : Math.min(rem * 0.6, 3000));
        res.food = Math.round(actualFood * 100) / 100;
        rem = Math.round((rem - actualFood) * 100) / 100;
        const actualSnack = Math.min(rem, targetS > 0 ? targetS : Math.min(rem * 0.6, 1500));
        res.snack = Math.round(actualSnack * 100) / 100;
        rem = Math.round((rem - actualSnack) * 100) / 100;
        if (rem > 0 && isSpayNeeded && res.spayAmount < spayGap) {
          const extraSpay = Math.min(rem, spayGap - res.spayAmount);
          res.paySpay = true;
          res.spayAmount = Math.round((res.spayAmount + extraSpay) * 100) / 100;
          rem = Math.round((rem - extraSpay) * 100) / 100;
        }
        if (rem > 0) res.main = Math.round(rem * 100) / 100;
      }
      res.spayShortfall = Math.max(0, Math.round((spayGap - res.spayAmount) * 100) / 100);
    } else if (strategy === 'SPAY_FIRST') {
      if (isSpayNeeded && rem > 0) {
        const alloc = Math.min(rem, spayGap);
        res.paySpay = true;
        res.spayAmount = Math.round(alloc * 100) / 100;
        rem = Math.round((rem - alloc) * 100) / 100;
      }
      if (isHomePending && rem > 0) {
        const alloc = Math.min(rem, liveHome);
        res.payHome = true;
        res.homeAmount = Math.round(alloc * 100) / 100;
        rem = Math.round((rem - alloc) * 100) / 100;
      }
      if (rem > 0) res.main = Math.round(rem * 100) / 100;
      res.spayShortfall = Math.max(0, Math.round((spayGap - res.spayAmount) * 100) / 100);
    } else {
      if (isHomePending && rem > 0) {
        const alloc = Math.min(rem, liveHome);
        res.payHome = true;
        res.homeAmount = Math.round(alloc * 100) / 100;
        rem = Math.round((rem - alloc) * 100) / 100;
      }
      if (rem > 0) {
        const food = Math.min(rem * 0.6, 3000);
        res.food = Math.round(food * 100) / 100;
        rem = Math.round((rem - food) * 100) / 100;
        const snack = Math.min(rem * 0.6, 1500);
        res.snack = Math.round(snack * 100) / 100;
        rem = Math.round((rem - snack) * 100) / 100;
      }
      if (isSpayNeeded && rem > 0) {
        const alloc = Math.min(rem, spayGap);
        res.paySpay = true;
        res.spayAmount = Math.round(alloc * 100) / 100;
        rem = Math.round((rem - alloc) * 100) / 100;
      }
      if (rem > 0) res.main = Math.round(rem * 100) / 100;
      res.spayShortfall = Math.max(0, Math.round((spayGap - res.spayAmount) * 100) / 100);
    }
    return res;
  };

  const applySmartAllocation = (inflow, strategy = allocationStrategy) => {
    const plan = calculateSmartWaterfall(inflow, strategy);
    setPaySubsBill(plan.paySubs);
    setSubsTargetAmount(plan.subsAmount);
    setPayHomeBill(plan.payHome);
    setHomeTargetAmount(plan.homeAmount);
    setPaySpayBill(plan.paySpay);
    setSpayTargetAmount(plan.spayAmount);
    setAllocFood(plan.food);
    setAllocSnack(plan.snack);
    setAllocEmerg(plan.emerg);
    setAllocMain(plan.main);
    setAllocationStrategy(strategy);
  };

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
      setAllocFood(0); setAllocSnack(0); setAllocEmerg(0); setAllocMain(0);
      return;
    }
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

  const mandatoryBillsSum = 
    (paySpayBill ? parseFloat(spayTargetAmount) || 0 : 0) +
    (payHomeBill ? parseFloat(homeTargetAmount) || 0 : 0) +
    (paySubsBill ? parseFloat(subsTargetAmount) || 0 : 0) +
    (payDebtsBill ? parseFloat(debtsTargetAmount) || 0 : 0);

  const spendingPocketsSum = 
    (parseFloat(allocFood) || 0) +
    (parseFloat(allocSnack) || 0) +
    (parseFloat(allocEmerg) || 0) +
    (parseFloat(allocMain) || 0);

  const totalAllocated = Math.round((mandatoryBillsSum + spendingPocketsSum) * 100) / 100;
  const parsedInflow = parseFloat(inflowAmount) || 0;
  const diffInflow = Math.round((parsedInflow - totalAllocated) * 100) / 100;
  const safeToSpendPool = Math.round((parsedInflow - mandatoryBillsSum) * 100) / 100;

  const handleExecuteAllocation = async () => {
    if (totalAllocated <= 0) {
      await modalAlert({ title: 'ยอดเงินไม่ถูกต้อง', message: 'กรุณาระบุยอดเงินที่จะนำมาจัดสรร', variant: 'warning' });
      return;
    }
    if (sourceBalance < totalAllocated) {
      await modalAlert({
        title: '🚫 ยอดจัดสรรเกินเงินที่มีจริงในกระเป๋า',
        message: `ยอดเงินในบัญชีต้นทาง (${sourceAccount?.name}) มี ฿${sourceBalance.toLocaleString()} แต่มียอดจัดสรรรวม ฿${totalAllocated.toLocaleString()}`,
        variant: 'warning'
      });
      return;
    }
    if (parsedInflow < totalAllocated) {
      await modalAlert({
        title: '🚫 ยอดจัดสรรเกินเงินที่ระบุไว้',
        message: `คุณระบุเงินที่จะนำมาจัดสรร ฿${parsedInflow.toLocaleString()} แต่มียอดจัดสรรรวม ฿${totalAllocated.toLocaleString()}`,
        variant: 'warning'
      });
      return;
    }

    const isConfirmed = await modalConfirm({
      title: '✨ ยืนยันการจัดสรรและกระจายเงิน',
      message: `ยืนยันการจัดสรรเงิน ฿${totalAllocated.toLocaleString()} จาก [${sourceAccount?.name}] กระจายเข้ากระเป๋าตามสูตรนี้ทันที?`,
      variant: 'success',
      confirmText: 'ยืนยันกระจายเงินทันที'
    });
    if (!isConfirmed) return;

    const updatedAccounts = accounts.map(acc => {
      if (acc.id === allocationSourceId) {
        return { ...acc, balance: Math.max(0, Math.round((acc.balance - totalAllocated) * 100) / 100), updatedAt: new Date().toISOString() };
      }
      if (acc.id === 'KBANK-SPAY' && paySpayBill && spayTargetAmount > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(spayTargetAmount)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      if (acc.id === 'KBANK-HOME' && payHomeBill && homeTargetAmount > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(homeTargetAmount)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      if (acc.id === 'KBANK-FOOD' && allocFood > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(allocFood)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      if (acc.id === 'KBANK-SNACK' && allocSnack > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(allocSnack)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      if (acc.id === 'KBANK-EMERG' && allocEmerg > 0) {
        return { ...acc, balance: Math.round(((acc.balance || 0) + parseFloat(allocEmerg)) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      if (acc.id === 'KBANK-MAIN') {
        const addedMain = (allocMain > 0 ? parseFloat(allocMain) : 0) + (paySubsBill ? parseFloat(subsTargetAmount) : 0);
        return { ...acc, balance: Math.round(((acc.balance || 0) + addedMain) * 100) / 100, updatedAt: new Date().toISOString() };
      }
      return acc;
    });

    let nextData = { ...sotData, accounts: updatedAccounts };
    nextData = addAuditEvent(nextData, 'ALLOCATION', 'PIPELINE_ALLOCATION', 'AUTO_ALLOCATED_POCKETS', {
      sourceAccountId: allocationSourceId,
      totalAllocated
    });

    updateSOTData(nextData);
    toast(`🎉 จัดสรรเงิน ฿${totalAllocated.toLocaleString()} กระจายเข้ากระเป๋าเรียบร้อยแล้ว!`, { type: 'success' });
    onClose();
  };

  return (
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto', padding: '24px', border: '1px solid var(--border-glow)' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={24} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.22rem', fontWeight: 700, color: '#fff' }}>
                🧮 ผู้ช่วยจัดสรรเงิน: วิเคราะห์ตามจุดประสงค์ของทุกกระเป๋า
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                คำนวณเป้าหมายแต่ละกระเป๋า • ดูส่วนขาด (Gap) • ปรับเกลี่ยส่วนเกิน & จำลองเงินโอทีเย็น
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            ✕ ปิดหน้าต่าง
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setAssistantTab('HOLISTIC')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: assistantTab === 'HOLISTIC' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
              background: assistantTab === 'HOLISTIC' ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.04)',
              color: assistantTab === 'HOLISTIC' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: assistantTab === 'HOLISTIC' ? 700 : 500,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Target size={15} /> 🎯 คำนวณตามจุดประสงค์ทุกกระเป๋า (แนะนำ)
          </button>

          <button
            type="button"
            onClick={() => setAssistantTab('REBALANCE')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: assistantTab === 'REBALANCE' ? '1px solid var(--accent-purple)' : '1px solid transparent',
              background: assistantTab === 'REBALANCE' ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255, 255, 255, 0.04)',
              color: assistantTab === 'REBALANCE' ? 'var(--accent-purple)' : 'var(--text-secondary)',
              fontWeight: assistantTab === 'REBALANCE' ? 700 : 500,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <ArrowRightLeft size={15} /> 🔀 โยกเกลี่ยเงินส่วนเกิน (Rebalance)
          </button>

          <button
            type="button"
            onClick={() => setAssistantTab('OT_SIMULATION')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: assistantTab === 'OT_SIMULATION' ? '1px solid var(--accent-amber)' : '1px solid transparent',
              background: assistantTab === 'OT_SIMULATION' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.04)',
              color: assistantTab === 'OT_SIMULATION' ? 'var(--accent-amber)' : 'var(--text-secondary)',
              fontWeight: assistantTab === 'OT_SIMULATION' ? 700 : 500,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Clock size={15} /> 🔮 จำลองรอเติมเงินโอทีเย็น (~฿3,600)
          </button>

          <button
            type="button"
            onClick={() => setAssistantTab('SINGLE_INFLOW')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: assistantTab === 'SINGLE_INFLOW' ? '1px solid var(--accent-emerald)' : '1px solid transparent',
              background: assistantTab === 'SINGLE_INFLOW' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)',
              color: assistantTab === 'SINGLE_INFLOW' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              fontWeight: assistantTab === 'SINGLE_INFLOW' ? 700 : 500,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Layers size={15} /> 📥 กระจายจากเงินก้อนเดี่ยว
          </button>
        </div>

        {/* TAB 1: HOLISTIC PURPOSE-TARGET BALANCER */}
        {assistantTab === 'HOLISTIC' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 1. Inflow Milestones Strip */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📅 สถานะเงินเข้ารอบเดือนนี้ (คลิกเพื่อเปลี่ยนสถานะ):</span>
                <span style={{ color: 'var(--accent-cyan)' }}>ครบกำหนด SPayLater: {spayDueDate}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleMilestone('salaryReceived')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: milestones.salaryReceived ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: milestones.salaryReceived ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                    color: milestones.salaryReceived ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.78rem'
                  }}
                >
                  <span>1. 📥 เงินเดือน 27 ก.ย.</span>
                  <span style={{ fontWeight: 700 }}>{milestones.salaryReceived ? '✅ รับแล้ว' : '⏳ รอเงินเข้า'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleMilestone('saturdayOtReceived')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: milestones.saturdayOtReceived ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: milestones.saturdayOtReceived ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                    color: milestones.saturdayOtReceived ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.78rem'
                  }}
                >
                  <span>2. 💵 เงินสดสอนเสาร์</span>
                  <span style={{ fontWeight: 700 }}>{milestones.saturdayOtReceived ? '✅ รับแล้ว (แบ่งใส่กระเป๋าแล้ว)' : '⏳ รอเงินเข้า'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleMilestone('eveningOtReceived')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: milestones.eveningOtReceived ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: milestones.eveningOtReceived ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                    color: milestones.eveningOtReceived ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.78rem'
                  }}
                >
                  <span>3. ⏳ เงินสดโอเย็น (~฿3,600)</span>
                  <span style={{ fontWeight: 700 }}>{milestones.eveningOtReceived ? '✅ รับแล้ว' : '⏳ รอรับสิ้นเดือน'}</span>
                </button>
              </div>
            </div>

            {/* 2. Top Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>เป้าหมายรวมทุกกระเป๋า</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>฿{totalHolisticTarget.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>เงินที่มีในกระเป๋าแล้ว</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>฿{totalLiquidCash.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ยอดขาดอีกสุทธิรวม</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: totalHolisticGaps > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', marginTop: '2px' }}>
                  ฿{totalHolisticGaps.toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ส่วนเกินใน MAIN (พร้อมเกลี่ย)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '2px' }}>฿{netMainSurplus.toLocaleString()}</div>
              </div>
            </div>

            {/* 3. AI Financial Coach Insight Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={18} color="var(--accent-cyan)" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  บทวิเคราะห์จาก AI Coach (Sonar & Best): สุขภาพการเงินตามจุดประสงค์
                </h4>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>
                  🔍 <strong>ความจริงจากระบบ:</strong> นายท่านได้รับเงินก้อนมากระจายลงกระเป๋าแล้วบางส่วน ทำให้ใน <strong>[KBANK-MAIN]</strong> มีเงิน ฿{(mainAcc.balance || 0).toLocaleString()} ซึ่งครอบคลุมค่าสมาชิก Netflix ฿518 ครบ 100% และมีเงินส่วนเกินกันชนอยู่ ฿{netMainSurplus.toLocaleString()}
                </div>
                <div style={{ marginTop: '6px' }}>
                  💳 <strong>จุดเดียวที่ยังขาดเงิน:</strong> กระเป๋า <strong>[KBANK-SPAY]</strong> ยังมี ฿{(spayAcc.balance || 0).toLocaleString()} (ขาดอีก ฿{gapSpay.toLocaleString()} สำหรับตัดบิลรอบวันที่ {spayDueDate})
                </div>
                <div style={{ marginTop: '6px', color: 'var(--accent-cyan)' }}>
                  🚀 <strong>แผนแนะนำ 2 จังหวะ:</strong>
                  <div style={{ margin: '4px 0 0 10px' }}>
                    1) สามารถโยกเงินส่วนเกิน ฿{Math.min(2500, netMainSurplus).toLocaleString()} จาก [KBANK-MAIN] ไปพักใน [KBANK-SPAY] เพื่อลดช่องว่างทันที (โดยใน MAIN ยังเหลือเงินให้ Netflix ฿518 พร้อมตัดสิ้นเดือน)<br />
                    2) เมื่อเงินสดโอเย็นสิ้นเดือน (~฿3,600) ออก ให้นำมาเติม SPayLater ส่วนที่เหลืออีก ฿{Math.max(0, gapSpay - Math.min(2500, netMainSurplus)).toLocaleString()} ทันกำหนด {spayDueDate} อย่างแน่นอน!
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {netMainSurplus > 0 && gapSpay > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRebalanceFrom('KBANK-MAIN');
                      setRebalanceTo('KBANK-SPAY');
                      setRebalanceAmount(Math.min(2500, netMainSurplus).toString());
                      setAssistantTab('REBALANCE');
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ArrowRightLeft size={14} /> 🔀 โยกส่วนเกิน ฿{Math.min(2500, netMainSurplus).toLocaleString()} ไปช่วย SPay ทันที
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAssistantTab('OT_SIMULATION')}
                  className="btn btn-warning"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Clock size={14} /> 🔮 ดูแผนจำลองเติมโอทีเย็น (~฿3,600)
                </button>
              </div>
            </div>

            {/* 4. Pocket Purpose & Gap Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🎯 รายการกระเป๋าและวัตถุประสงค์ (Pocket Purpose & Net Gap):</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>คลิกปรับเป้าหมายได้ตามต้องการ</span>
              </div>

              {/* SPAY POCKET */}
              <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={16} color="var(--accent-rose)" />
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>[KBANK-SPAY] กันจ่าย Shopee SPayLater</span>
                      <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>ครบกำหนด {spayDueDate}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      วัตถุประสงค์: ล็อกกันจ่ายบิล SPayLater ประจำรอบ ({sotData.spayStatementCycle || 'รอบ ก.ย. 2026'})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      เป้าหมาย: ฿{targetSpay.toLocaleString()} | มีอยู่: <strong style={{ color: '#fff' }}>฿{(spayAcc.balance || 0).toLocaleString()}</strong>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      {gapSpay === 0 ? (
                        <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>✅ ครบ 100% แล้ว</span>
                      ) : (
                        <span className="badge badge-rose" style={{ fontSize: '0.72rem' }}>⏳ ขาดอีก ฿{gapSpay.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '8px', width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${targetSpay > 0 ? Math.min(100, Math.round(((spayAcc.balance || 0) / targetSpay) * 100)) : 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-rose), var(--accent-cyan))' }} />
                </div>
              </div>

              {/* HOME POCKET */}
              <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Landmark size={16} color="var(--accent-purple)" />
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>[KBANK-HOME] บิลบ้าน แม่ พี่แพร</span>
                      <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>ตัดสิ้นเดือน</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      วัตถุประสงค์: ค่าน้ำ ค่าไฟ ค่ากับข้าวส่วนที่ช่วยครอบครัว
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      เป้าหมาย: ฿{targetHome.toLocaleString()} | มีอยู่: <strong style={{ color: '#fff' }}>฿{(homeAcc.balance || 0).toLocaleString()}</strong>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      {gapHome === 0 ? (
                        <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>✅ เคลียร์บิลครบแล้ว (฿0.00)</span>
                      ) : (
                        <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>⏳ ขาดอีก ฿{gapHome.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* MAIN POCKET */}
              <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wallet size={16} color="var(--accent-cyan)" />
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>[KBANK-MAIN] กระเป๋าหลัก & ล็อก Netflix 4K</span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Netflix ฿518 สิ้นเดือน</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      วัตถุประสงค์: ล็อกตัดบัตรเดบิต Netflix ฿518 + เงินพักกันชนช้อปปิ้งทั่วไป
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ล็อก Netflix: ฿{targetSubs.toLocaleString()} | มีอยู่จริง: <strong style={{ color: 'var(--accent-cyan)' }}>฿{(mainAcc.balance || 0).toLocaleString()}</strong>
                    </div>
                    <div style={{ marginTop: '4px', display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                        ✅ มีเงินเกินเป้า +฿{netMainSurplus.toLocaleString()}
                      </span>
                      {netMainSurplus > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setRebalanceFrom('KBANK-MAIN');
                            setRebalanceTo('KBANK-SPAY');
                            setRebalanceAmount(Math.min(2500, netMainSurplus).toString());
                            setAssistantTab('REBALANCE');
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                        >
                          🔀 โยกช่วย SPay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOD POCKET */}
              <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Smile size={16} color="var(--accent-emerald)" />
                      <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.9rem' }}>[KBANK-FOOD] ค่ากินแซ่บ แซลมอน บุฟเฟต์</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      วัตถุประสงค์: บุฟเฟต์ Shinkanzen, แซลมอน & รางวัลเลิกบุหรี่เพื่อลูก
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>เป้าหมาย ฿</span>
                      <input
                        type="number"
                        step="100"
                        value={targetFood}
                        onChange={(e) => setTargetFood(parseFloat(e.target.value) || 0)}
                        style={{ width: '85px', padding: '4px 6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff', fontSize: '0.85rem', textAlign: 'right' }}
                      />
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '90px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>มีอยู่: ฿{(foodAcc.balance || 0).toLocaleString()}</div>
                      <span className={gapFood === 0 ? 'badge badge-emerald' : 'badge badge-amber'} style={{ fontSize: '0.7rem' }}>
                        {gapFood === 0 ? '✅ ครบ' : `ขาด ฿${gapFood.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SNACK POCKET */}
              <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={16} color="var(--accent-amber)" />
                      <span style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: '0.9rem' }}>[KBANK-SNACK] เหมาเติมบัตร รร. / ขนม</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      วัตถุประสงค์: สัปดาห์ละ 300-500 ซื้อไอติม/ไก่ทอด ไม่ต้องจดย่อย
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>เป้าหมาย ฿</span>
                      <input
                        type="number"
                        step="100"
                        value={targetSnack}
                        onChange={(e) => setTargetSnack(parseFloat(e.target.value) || 0)}
                        style={{ width: '85px', padding: '4px 6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff', fontSize: '0.85rem', textAlign: 'right' }}
                      />
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '90px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>มีอยู่: ฿{(snackAcc.balance || 0).toLocaleString()}</div>
                      <span className={gapSnack === 0 ? 'badge badge-emerald' : 'badge badge-amber'} style={{ fontSize: '0.7rem' }}>
                        {gapSnack === 0 ? '✅ ครบ' : `ขาด ฿${gapSnack.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* EMERG POCKET */}
              <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={16} color="var(--accent-rose)" />
                      <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>[KBANK-EMERG] สำรองฉุกเฉิน / ปิดเทอม</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      วัตถุประสงค์: สำรองช่วงปิดเทอมที่ไม่มีโอเย็น หรืออารมณ์ฉุกเฉิน
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>เป้าหมาย ฿</span>
                      <input
                        type="number"
                        step="100"
                        value={targetEmerg}
                        onChange={(e) => setTargetEmerg(parseFloat(e.target.value) || 0)}
                        style={{ width: '85px', padding: '4px 6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff', fontSize: '0.85rem', textAlign: 'right' }}
                      />
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '90px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>มีอยู่: ฿{(emergAcc.balance || 0).toLocaleString()}</div>
                      <span className={gapEmerg === 0 ? 'badge badge-emerald' : 'badge badge-amber'} style={{ fontSize: '0.7rem' }}>
                        {gapEmerg === 0 ? '✅ ครบ' : `ขาด ฿${gapEmerg.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: INTER-POCKET REBALANCE */}
        {assistantTab === 'REBALANCE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ArrowRightLeft size={18} color="var(--accent-purple)" />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  🔀 ปรับเกลี่ยเงินส่วนเกินระหว่างกระเป๋า (Inter-Pocket Rebalance)
                </h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                ในเมื่อเงินก้อนถูกแบ่งใส่บางกระเป๋าไปแล้ว (เช่น ใน [KBANK-MAIN] มีเงินเกินเป้าหมาย Netflix ฿518 อยู่ถึง <strong>฿{netMainSurplus.toLocaleString()}</strong>) คุณสามารถโยกส่วนเกินนี้ไปช่วยเติมกระเป๋าที่ยังขาด (เช่น [KBANK-SPAY]) ได้ทันทีโดยไม่ต้องเติมเงินใหม่!
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    📤 1. กระเป๋าต้นทางที่มีเงินส่วนเกิน:
                  </label>
                  <select
                    value={rebalanceFrom}
                    onChange={(e) => setRebalanceFrom(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '0.9rem' }}
                  >
                    {accounts.filter(a => (a.balance || 0) > 0).map(a => (
                      <option key={a.id} value={a.id}>
                        [{a.id}] {a.name} (คงเหลือ ฿{(a.balance || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    📥 2. กระเป๋าปลายทางที่ต้องการเติมเต็ม:
                  </label>
                  <select
                    value={rebalanceTo}
                    onChange={(e) => setRebalanceTo(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '0.9rem' }}
                  >
                    {accounts.filter(a => a.id !== rebalanceFrom).map(a => (
                      <option key={a.id} value={a.id}>
                        [{a.id}] {a.name} (คงเหลือ ฿{(a.balance || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--accent-purple)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  💰 จำนวนเงินที่จะโยกย้าย (บาท):
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="100"
                    value={rebalanceAmount}
                    onChange={(e) => setRebalanceAmount(e.target.value)}
                    style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-purple)', fontSize: '1.2rem', fontWeight: 700 }}
                    placeholder="2500"
                  />
                  {netMainSurplus > 0 && rebalanceFrom === 'KBANK-MAIN' && (
                    <button
                      type="button"
                      onClick={() => setRebalanceAmount(netMainSurplus.toString())}
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '8px 12px', whiteSpace: 'nowrap' }}
                    >
                      เอาส่วนเกินทั้งหมด ฿{netMainSurplus.toLocaleString()}
                    </button>
                  )}
                </div>

                {/* Quick Amount Pills */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {[500, 1000, 2000, 2500, 3000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRebalanceAmount(amt.toString())}
                      className="btn btn-outline"
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                    >
                      ฿{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Impact Preview */}
              {(() => {
                const val = parseFloat(rebalanceAmount) || 0;
                const src = accounts.find(a => a.id === rebalanceFrom);
                const dest = accounts.find(a => a.id === rebalanceTo);
                const srcBefore = src?.balance || 0;
                const srcAfter = Math.max(0, Math.round((srcBefore - val) * 100) / 100);
                const destBefore = dest?.balance || 0;
                const destAfter = Math.round((destBefore + val) * 100) / 100;

                return (
                  <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>📊 จำลองผลลัพธ์หลังการโยกย้าย:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>{src?.name}:</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          ฿{srcBefore.toLocaleString()} ➔ <strong style={{ color: srcAfter < 0 ? 'var(--accent-rose)' : 'var(--accent-cyan)' }}>฿{srcAfter.toLocaleString()}</strong>
                        </div>
                        {rebalanceFrom === 'KBANK-MAIN' && srcAfter >= 518 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', marginTop: '2px' }}>
                            ✅ สำรอง Netflix ฿518 ยังอยู่ครบพอดี
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>{dest?.name}:</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          ฿{destBefore.toLocaleString()} ➔ <strong style={{ color: 'var(--accent-emerald)' }}>฿{destAfter.toLocaleString()}</strong>
                        </div>
                        {rebalanceTo === 'KBANK-SPAY' && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                            📉 ยอดขาดลดลงเหลือ ฿{Math.max(0, gapSpay - val).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={handleExecuteRebalance}
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <ArrowRightLeft size={16} /> ยืนยันการปรับเกลี่ยเงินทันที
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OT SIMULATION INFLOW */}
        {assistantTab === 'OT_SIMULATION' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={18} color="var(--accent-amber)" />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  🔮 จำลองแผนเติมเงินโอทีเย็น (~฿3,600) (Upcoming OT Cash Intake)
                </h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                เงินสดพิเศษก้อนสุดท้ายของรอบนี้คือ <strong>เงินสดโอเย็น รร.ชลประทานวิทยา</strong> ซึ่งจะเบิกจ่ายช่วงสัปดาห์สิ้นเดือน (ประมาณ 30 - 4 ของเดือนถัดไป) โดยระบบจะช่วยคำนวณล่วงหน้าว่า เมื่อเงินก้อนนี้เข้ามา ควรเติมลงกระเป๋าใดเพื่อปิดยอดที่ยังขาดได้อย่างสมบูรณ์แบบ
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    จำนวนวันสอนโอเย็น (วันละ ฿200):
                  </label>
                  <input
                    type="number"
                    value={simOtDays}
                    onChange={(e) => {
                      const d = parseInt(e.target.value) || 0;
                      setSimOtDays(e.target.value);
                      const total = d * 200;
                      setSimOtCustom(total.toString());
                      const spayPart = Math.min(gapSpay, Math.min(2500, total));
                      setSimTargetSpay(spayPart.toString());
                      setSimTargetFood(Math.max(0, total - spayPart).toString());
                    }}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--accent-amber)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    ยอดเงินสดโอทีที่คาดว่าจะได้รับ (บาท):
                  </label>
                  <input
                    type="number"
                    value={simOtCustom}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSimOtCustom(e.target.value);
                      const spayPart = Math.min(gapSpay, Math.min(2500, val));
                      setSimTargetSpay(spayPart.toString());
                      setSimTargetFood(Math.max(0, val - spayPart).toString());
                    }}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-amber)', fontSize: '1.2rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                💡 แนะนำการแบ่งเงินโอทีเย็นเข้าปิดยอดกระเป๋าที่ยังขาด:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* SPAY PART */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>1. 💳 [KBANK-SPAY] กันจ่าย Shopee SPayLater</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ปิดยอดบิลรอบวันที่ {spayDueDate} (ปัจจุบันขาดอีก ฿{gapSpay.toLocaleString()})</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>฿</span>
                    <input
                      type="number"
                      value={simTargetSpay}
                      onChange={(e) => setSimTargetSpay(e.target.value)}
                      style={{ width: '110px', padding: '6px 8px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--accent-rose)', fontWeight: 700, textAlign: 'right' }}
                    />
                  </div>
                </div>

                {/* FOOD PART */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>2. 🍜 [KBANK-FOOD] ค่ากินแซ่บ แซลมอน บุฟเฟต์</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>เติมงบกินใช้คลายเครียดหลังสอบ/สิ้นเดือน</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>฿</span>
                    <input
                      type="number"
                      value={simTargetFood}
                      onChange={(e) => setSimTargetFood(e.target.value)}
                      style={{ width: '110px', padding: '6px 8px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--accent-emerald)', fontWeight: 700, textAlign: 'right' }}
                    />
                  </div>
                </div>

                {/* SNACK PART */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>3. 🍦 [KBANK-SNACK] เหมาเติมบัตร รร. / ขนม</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>เหมาเติมบัตร รร. สัปดาห์ละ 300-500</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>฿</span>
                    <input
                      type="number"
                      value={simTargetSnack}
                      onChange={(e) => setSimTargetSnack(e.target.value)}
                      style={{ width: '110px', padding: '6px 8px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--accent-amber)', fontWeight: 700, textAlign: 'right' }}
                    />
                  </div>
                </div>
              </div>

              {/* Summary Bar */}
              {(() => {
                const spayVal = parseFloat(simTargetSpay) || 0;
                const foodVal = parseFloat(simTargetFood) || 0;
                const snackVal = parseFloat(simTargetSnack) || 0;
                const sum = spayVal + foodVal + snackVal;
                const expected = parseFloat(simOtCustom) || 0;
                const diff = Math.round((expected - sum) * 100) / 100;

                return (
                  <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: diff === 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)', border: `1px solid ${diff === 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>รวมยอดกระจายเงินโอที: </span>
                      <strong style={{ color: '#fff', fontSize: '1rem' }}>฿{sum.toLocaleString()} / ฿{expected.toLocaleString()}</strong>
                    </div>
                    <div>
                      {diff === 0 ? (
                        <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>✅ ลงตัวพอดีเป๊ะ</span>
                      ) : diff > 0 ? (
                        <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>เหลือเงินโอที ฿{diff.toLocaleString()}</span>
                      ) : (
                        <span className="badge badge-rose" style={{ fontSize: '0.75rem' }}>กระจายเกินเงินโอที ฿{Math.abs(diff).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={handleExecuteOtAllocation}
                  className="btn btn-warning"
                  style={{ padding: '10px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Sparkles size={16} /> 💵 เมื่อได้รับเงินสดโอเย็น: บันทึกรับและกระจายเข้ากระเป๋าจริงทันที
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CLASSIC SINGLE INFLOW ALLOCATION */}
        {assistantTab === 'SINGLE_INFLOW' && (
          <div>
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
                      setAllocationSourceId(newSrcId);
                      setInflowAmount(newBal.toString());
                      applySmartAllocation(newBal, 'WATERFALL');
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
                      const val = e.target.value;
                      setInflowAmount(val);
                      applySmartAllocation(val, allocationStrategy);
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

            {/* AI Financial Coach Smart Recommendation Card */}
            {(() => {
              const currentPlan = calculateSmartWaterfall(inflowAmount, allocationStrategy);
              const isShortfall = parsedInflow < totalMandatoryLiabilities;
              const currentSpayFundedPercent = spayGap > 0 ? Math.min(100, Math.round((currentPlan.spayAmount / spayGap) * 100)) : 100;

              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '18px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} color="var(--accent-cyan)" />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                        คำแนะนำอัจฉริยะ: จากเงิน ฿{parsedInflow.toLocaleString()} ที่มีตอนนี้ ควรจัดสรรอย่างไร?
                      </h4>
                    </div>
                    <div>
                      {isShortfall ? (
                        <span className="badge badge-amber" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                          ⚡ เงินยังไม่ครบภาระทั้งเดือน (ขาด ฿{(totalMandatoryLiabilities - parsedInflow).toLocaleString()})
                        </span>
                      ) : (
                        <span className="badge badge-emerald" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                          🎉 เงินพอจ่ายทุกบิลครบ 100%
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                    {isShortfall ? (
                      <div>
                        💡 <strong style={{ color: '#fff' }}>หลักการคิดของโค้ชการเงิน (Waterfall):</strong> ในเมื่อเงินก้อนนี้ยังไม่ครบยอดหนี้ทั้งหมด (฿{totalMandatoryLiabilities.toLocaleString()}) 
                        เราต้อง <strong>"จ่ายตามลำดับความเร่งด่วนของวันครบกำหนดชำระ"</strong> เพื่อล็อกบิลสิ้นเดือนให้ครอบครัวก่อน ไม่ให้ถูกตัดบริการ และไม่ให้กระเป๋าเงินติดลบ!
                      </div>
                    ) : (
                      <div>
                        💡 เงินก้อนนี้เพียงพอสำหรับล็อกบิลบังคับทั้งหมด 100% และยังมีเงินเหลือสำหรับกินใช้สบายใจ ฿{(parsedInflow - totalMandatoryLiabilities).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Strategy Selector Tabs */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => applySmartAllocation(inflowAmount, 'WATERFALL')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: allocationStrategy === 'WATERFALL' ? 700 : 500,
                        borderRadius: 'var(--radius-sm)',
                        border: allocationStrategy === 'WATERFALL' ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)',
                        background: allocationStrategy === 'WATERFALL' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(0,0,0,0.3)',
                        color: allocationStrategy === 'WATERFALL' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      🛡️ สูตร 1: Waterfall ตามวันครบกำหนด (แนะนำ)
                    </button>

                    <button
                      type="button"
                      onClick={() => applySmartAllocation(inflowAmount, 'SPAY_FIRST')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: allocationStrategy === 'SPAY_FIRST' ? 700 : 500,
                        borderRadius: 'var(--radius-sm)',
                        border: allocationStrategy === 'SPAY_FIRST' ? '1px solid var(--accent-rose)' : '1px solid rgba(255,255,255,0.1)',
                        background: allocationStrategy === 'SPAY_FIRST' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(0,0,0,0.3)',
                        color: allocationStrategy === 'SPAY_FIRST' ? 'var(--accent-rose)' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ สูตร 2: เน้นปิด SPayLater ก่อน
                    </button>

                    <button
                      type="button"
                      onClick={() => applySmartAllocation(inflowAmount, 'LIVING_FIRST')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: allocationStrategy === 'LIVING_FIRST' ? 700 : 500,
                        borderRadius: 'var(--radius-sm)',
                        border: allocationStrategy === 'LIVING_FIRST' ? '1px solid var(--accent-emerald)' : '1px solid rgba(255,255,255,0.1)',
                        background: allocationStrategy === 'LIVING_FIRST' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)',
                        color: allocationStrategy === 'LIVING_FIRST' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      🍜 สูตร 3: เน้นกินอยู่สบายใจ
                    </button>
                  </div>

                  {/* Recommendation Summary Box */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-sm)', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>1. บิลสิ้นเดือนนี้ (ด่วนที่สุด):</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                          บิลบ้านแม่ ฿{currentPlan.homeAmount.toLocaleString()} + Netflix ฿{currentPlan.subsAmount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>2. งบกินอยู่ช่วงนี้:</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                          กินแซ่บ ฿{currentPlan.food.toLocaleString()} + ขนม รร. ฿{currentPlan.snack.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>3. ทยอยกันเข้า SPayLater:</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          ฿{currentPlan.spayAmount.toLocaleString()} {spayGap > 0 ? `(${currentSpayFundedPercent}%)` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar for SPay if partial */}
                    {currentPlan.spayShortfall > 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>ความคืบหน้าสะสมค่า SPayLater (ครบกำหนด {spayDueDate}):</span>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>฿{currentPlan.spayAmount.toLocaleString()} / ฿{spayGap.toLocaleString()}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${currentSpayFundedPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald))' }} />
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--accent-amber)', marginTop: '6px', lineHeight: 1.4 }}>
                          ⏳ <strong>ส่วนที่ยังขาดอีก ฿{currentPlan.spayShortfall.toLocaleString()}:</strong> ไม่ต้องกังวล! SPayLater ครบกำหนดวันที่ {spayDueDate} ➔ เงินสอนเสาร์รับแล้ว เหลือรอเติมจาก <strong>เงินโอทีเย็นสิ้นเดือน (~฿3,600)</strong> ทันเวลาพอดีแน่นอน
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => applySmartAllocation(inflowAmount, allocationStrategy)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                      >
                        <Sparkles size={13} /> ปรับยอดตามคำแนะนำนี้ (Smart Auto-Fit)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                  const isSpaySettled = sotData.spayStatementStatus === 'PAID';
                  const isSpayFunded = (spayAcc.balance || 0) >= fullSpayStatement;
                  const gap = Math.max(0, Math.round((fullSpayStatement - (spayAcc.balance || 0)) * 100) / 100);

                  return (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: isSpaySettled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0, 0, 0, 0.4)', 
                      padding: '10px 14px', 
                      borderRadius: 'var(--radius-sm)', 
                      border: isSpaySettled ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)' 
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isSpaySettled ? 'default' : 'pointer' }}>
                        <input
                          type="checkbox"
                          disabled={isSpaySettled}
                          checked={!isSpaySettled && paySpayBill}
                          onChange={(e) => {
                            setPaySpayBill(e.target.checked);
                            autoCalculateSpendingSplit(inflowAmount, e.target.checked);
                          }}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            💳 บิล Shopee SPayLater {sotData.spayStatementCycle || 'รอบ ก.ย. 2026'}
                            {isSpaySettled ? (
                              <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>🎉 ชำระบิลรอบนี้แล้ว</span>
                            ) : isSpayFunded ? (
                              <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>กันไว้ครบ 100% แล้ว</span>
                            ) : (
                              <span className="badge badge-rose" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>ยอดเต็ม ฿{fullSpayStatement.toLocaleString()}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: isSpaySettled ? 'var(--accent-emerald)' : isSpayFunded ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                            {isSpaySettled
                              ? `🎉 บิลรอบนี้ชำระเต็มจำนวนแล้ว (ยอดค้าง: ฿0.00) ➔ ไม่ต้องกันเงินซ้ำ เงินเดือนส่วนนี้ไหลไปเป็นเงินใช้ชีวิต/เงินออมทั้งหมด`
                              : isSpayFunded 
                                ? `ในกระเป๋า [KBANK-SPAY] มีเงินกันไว้ครบแล้ว ฿${(spayAcc.balance || 0).toLocaleString()} (พร้อมตัดจ่าย)`
                                : `ในกระเป๋า [KBANK-SPAY] มีอยู่ ฿${(spayAcc.balance || 0).toLocaleString()} ➔ ต้องกันเพิ่มอีก ฿${gap.toLocaleString()} ให้ครบยอดตัดบิล ${spayDueDate}`}
                          </div>
                        </div>
                      </label>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>฿</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isSpaySettled || !paySpayBill}
                          value={isSpaySettled ? 0 : spayTargetAmount}
                          onChange={(e) => {
                            setSpayTargetAmount(parseFloat(e.target.value) || 0);
                            autoCalculateSpendingSplit(inflowAmount, paySpayBill, e.target.value);
                          }}
                          style={{ width: '110px', padding: '6px 8px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: isSpaySettled ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 700, textAlign: 'right' }}
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
              background: diffInflow === 0 ? 'rgba(16, 185, 129, 0.08)' : diffInflow < 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(6, 182, 212, 0.08)',
              border: `1px solid ${diffInflow === 0 ? 'rgba(16, 185, 129, 0.3)' : diffInflow < 0 ? 'rgba(244, 63, 94, 0.5)' : 'var(--border-glow)'}`,
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
                      ✅ จัดสรรครบ 100% พอดีเป๊ะ (กระเป๋าไม่ติดลบ)
                    </span>
                  ) : diffInflow > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.85rem' }}>
                        เหลือเงินยังไม่ได้กระจาย: ฿{diffInflow.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (paySpayBill && spayTargetAmount < spayGap) {
                            const addSpay = Math.min(diffInflow, spayGap - spayTargetAmount);
                            setSpayTargetAmount(Math.round((spayTargetAmount + addSpay) * 100) / 100);
                            const rem = diffInflow - addSpay;
                            if (rem > 0) setAllocMain(Math.round(((parseFloat(allocMain) || 0) + rem) * 100) / 100);
                          } else {
                            setAllocMain(Math.round(((parseFloat(allocMain) || 0) + diffInflow) * 100) / 100);
                          }
                        }}
                        className="btn btn-outline"
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      >
                        ➕ ปัดเข้า SPay / หลัก
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-rose" style={{ fontSize: '0.85rem' }}>
                        ⚠️ จัดสรรเกินเงินที่มี: ฿{Math.abs(diffInflow).toLocaleString()} (กระเป๋าจะติดลบ)
                      </span>
                      <button
                        type="button"
                        onClick={() => applySmartAllocation(inflowAmount, allocationStrategy)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      >
                        🪄 ปรับให้พอดี (Auto-Fit)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">
                ปิด
              </button>
              <button
                type="button"
                disabled={diffInflow < 0 || totalAllocated <= 0}
                onClick={handleExecuteAllocation}
                className={diffInflow < 0 ? 'btn btn-outline' : 'btn btn-success'}
                style={{
                  padding: '10px 22px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: (diffInflow < 0 || totalAllocated <= 0) ? 0.6 : 1,
                  cursor: (diffInflow < 0 || totalAllocated <= 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {diffInflow < 0 ? (
                  <>
                    <AlertCircle size={18} color="var(--accent-rose)" /> ยอดจัดสรรเกินเงินที่มี (คลิก Auto-Fit)
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} /> ยืนยันการจัดสรรและกระจายเงินจริงทันที
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
