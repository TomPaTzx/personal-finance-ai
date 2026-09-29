import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Plus, Calendar, Percent, Edit3, ShoppingBag, ArrowRight, Sparkles, Receipt, Users, Check, Clock, Trash2, UserCheck, Smartphone, RefreshCw } from 'lucide-react';
import { addAuditEvent } from '../services/storageService';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function DebtTracker({ sotData, updateSOTData }) {
  const { confirm: modalConfirm, alert: modalAlert, toast } = useModalNotification();
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  
  // BNPL Modal & Form States
  const [showAddBnplModal, setShowAddBnplModal] = useState(false);
  const [editingBnpl, setEditingBnpl] = useState(null);
  const [bnplTitle, setBnplTitle] = useState('');
  const [bnplAmount, setBnplAmount] = useState('');
  const [bnplOwner, setBnplOwner] = useState('ตัวเอง');
  const [bnplCategory, setBnplCategory] = useState('SHOPEE_VIP');
  const [bnplIsPaidBack, setBnplIsPaidBack] = useState(false);
  const [bnplNote, setBnplNote] = useState('');

  const [activeSubTab, setActiveSubTab] = useState('ALL'); // ALL, BNPL, INSTALLMENTS
  const [selectedPersonFilter, setSelectedPersonFilter] = useState('ALL'); // ALL, ตัวเอง, แจง, พี่แพร, แม่, น้องพีเจ, บ้าน, เพื่อนร่วมงาน
  const [viewGroupingMode, setViewGroupingMode] = useState('BY_PERSON'); // BY_PERSON, BY_PAYER, FLAT

  // Form states for Long-Term Debt Add/Edit
  const [itemName, setItemName] = useState('');
  const [owner, setOwner] = useState('ตัวเอง');
  const [totalAmount, setTotalAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('10');
  const [remainingInstallments, setRemainingInstallments] = useState('10');
  const [category, setCategory] = useState('GADGET');
  const [linkedAccountId, setLinkedAccountId] = useState('KBANK-SPAY');
  const [payerType, setPayerType] = useState('WE_PAY'); // 'WE_PAY' = เราจ่าย, 'THEY_PAY' = เขาจ่ายคืนเรา
  const [syncWithFamily, setSyncWithFamily] = useState(true);

  const debts = sotData.debts || [];
  
  // Separate Personal Debt vs Others Debt (Filter active debts with remaining installments > 0)
  const activeDebts = debts.filter(d => (d.remainingInstallments > 0 || d.remainingAmount > 0) && d.status !== 'COMPLETED');
  const myDebts = activeDebts.filter(d => (d.owner?.includes('ตัวเอง') || d.owner?.includes('บ้าน') || d.payerType === 'WE_PAY' || d.linkedAccountId?.startsWith('CARD-')));
  const othersDebts = activeDebts.filter(d => (!d.owner?.includes('ตัวเอง') && !d.owner?.includes('บ้าน') && d.payerType !== 'WE_PAY' && !d.linkedAccountId?.startsWith('CARD-')));

  const myMonthlyDebt = myDebts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const othersMonthlyDebt = othersDebts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const totalMonthlyBilled = myMonthlyDebt + othersMonthlyDebt;

  // Selected Billing Cycle & Cycle Statements Archive (Preserves monthly history for end-of-year review)
  const currentCycle = sotData.spayStatementCycle || 'รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค.)';
  
  const defaultStatements = {
    'รอบ ส.ค. 2026 (ครบกำหนด 10 ส.ค.)': {
      cycle: 'รอบ ส.ค. 2026 (ครบกำหนด 10 ส.ค.)',
      monthKey: '2026-08',
      status: 'PAID',
      paidAt: '2026-08-10T15:00:00.000Z',
      totalAmount: 5177.95,
      bnplAmount: 0.00,
      installmentAmount: 5177.95,
      itemCount: 9,
      note: 'ชำระเต็มจำนวนแล้วเมื่อ 10 ส.ค. 2026 (เก็บบันทึกประวัติศาสตร์ สรุปสิ้นปี 2026)'
    }
  };
  const spayStatements = sotData.spayStatements || defaultStatements;
  const currentCycleData = spayStatements[currentCycle];
  
  // Cycle-Aware Paid Status:
  // August 2026 is officially marked PAID in history.
  // Other cycles check per-cycle status or global status
  const isSpayStatementPaid = currentCycleData ? (currentCycleData.status === 'PAID') : (currentCycle.includes('ส.ค.') ? true : (sotData.spayStatementStatus === 'PAID'));

  // Active SPayLater installments for current cycle
  const activeSpayDebts = debts.filter(d => 
    (d.linkedAccountId === 'KBANK-SPAY' || d.category === 'SPAYLATER') && 
    (d.remainingInstallments > 0 || d.remainingAmount > 0) &&
    d.status !== 'COMPLETED'
  );
  
  const bnplItems = sotData.bnplItems || [];
  // Filter BNPL items by current billing cycle if tagged, or pending items for active cycle
  const cycleBnplItems = bnplItems.filter(i => {
    if (i.cycle) return i.cycle === currentCycle;
    return !currentCycle.includes('ส.ค.');
  });
  const pendingBnplItems = isSpayStatementPaid ? [] : cycleBnplItems.filter(i => !i.isPaidInStatement);
  const totalBnplAmount = isSpayStatementPaid ? 0 : pendingBnplItems.reduce((sum, item) => sum + item.amount, 0);

  // Dynamic Monthly Installments based on Cycle:
  // If cycle is PAID (e.g. August 2026): outstanding is 0! (Historical amount preserved in currentCycleData)
  const totalMonthlySpayInstallments = isSpayStatementPaid 
    ? 0 
    : activeSpayDebts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);

  const totalSpayStatement = isSpayStatementPaid 
    ? 0 
    : (totalBnplAmount + totalMonthlySpayInstallments);


  // Total pending collection from others (เพื่อน/ครอบครัวฝากซื้อที่ยังไม่ได้จ่ายเงินคืนเรา)
  const pendingCollectionFromOthers = bnplItems
    .filter(i => i.owner !== 'ตัวเอง' && i.owner !== 'บ้าน' && !i.isPaidBack)
    .reduce((sum, i) => sum + i.amount, 0);

  // Toggle BNPL Paid Back Status
  const handleToggleBnplPaidBack = (itemId) => {
    let nextIsPaid = false;
    let targetOwner = null;
    let targetTitle = null;

    const updatedBnpl = bnplItems.map(item => {
      if (item.id === itemId) {
        nextIsPaid = !item.isPaidBack;
        targetOwner = item.owner;
        targetTitle = item.title;
        return { ...item, isPaidBack: nextIsPaid };
      }
      return item;
    });

    // Sync with Family Settlements
    let updatedFamily = (sotData.familySettlements || []).map(person => {
      const updatedItems = person.items.map(i => {
        if (
          i.id === `SYNC-${itemId}` || 
          i.linkedSourceId === itemId || 
          i.id === itemId ||
          (targetTitle && (i.title === targetTitle || i.title.includes(targetTitle)))
        ) {
          return { ...i, status: nextIsPaid ? 'SETTLED' : 'PENDING' };
        }
        return i;
      });
      return { ...person, items: updatedItems };
    });

    let nextData = { ...sotData, bnplItems: updatedBnpl, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'BNPL', itemId, 'PAID_BACK_STATUS_TOGGLED');
    updateSOTData(nextData);
    toast(nextIsPaid ? '✅ ติ๊กรับเงินคืนเรียบร้อย (ปรับสถานะในบิลครอบครัวแล้ว)' : '⏳ ปรับเป็นรอเก็บเงินคืน', { type: 'info' });
  };

  // Open Add/Edit BNPL Modal
  const handleOpenAddBnpl = () => {
    setEditingBnpl(null);
    setBnplTitle('');
    setBnplAmount('');
    setBnplOwner('แจง'); // Smart default to Jaeng as she's the most frequent requester
    setBnplCategory('SHOPEE_VIP');
    setBnplIsPaidBack(false);
    setBnplNote('แจงฝากซื้อผ่าน SPayLater');
    setShowAddBnplModal(true);
  };

  const handleOpenEditBnpl = (item) => {
    setEditingBnpl(item);
    setBnplTitle(item.title);
    setBnplAmount(item.amount.toString());
    setBnplOwner(item.owner || 'ตัวเอง');
    setBnplCategory(item.category || 'SHOPEE_VIP');
    setBnplIsPaidBack(item.isPaidBack || false);
    setBnplNote(item.note || '');
    setShowAddBnplModal(true);
  };

  // Save BNPL Item (with Full Two-Way Family Settlement Sync)
  const handleSaveBnpl = (e) => {
    e.preventDefault();
    const amount = parseFloat(bnplAmount);
    if (!bnplTitle.trim() || isNaN(amount) || amount <= 0) return;

    const bnplId = editingBnpl ? editingBnpl.id : `BNPL-${Date.now().toString().slice(-4)}`;
    let updatedBnpl = [...bnplItems];
    if (editingBnpl) {
      updatedBnpl = updatedBnpl.map(item => {
        if (item.id === editingBnpl.id) {
          return {
            ...item,
            title: bnplTitle,
            amount,
            owner: bnplOwner,
            category: bnplCategory,
            isPaidBack: bnplIsPaidBack,
            note: bnplNote
          };
        }
        return item;
      });
    } else {
      const newItem = {
        id: bnplId,
        title: bnplTitle,
        amount,
        owner: bnplOwner,
        category: bnplCategory,
        isPaidBack: bnplIsPaidBack,
        note: bnplNote
      };
      updatedBnpl = [newItem, ...updatedBnpl];
    }

    // Determine target family person for syncing
    let targetPersonId = null;
    if (bnplOwner === 'แจง' || bnplOwner === 'น้องพีเจ') {
      targetPersonId = 'PERSON-JAENG';
    } else if (bnplOwner === 'พี่แพร' || bnplOwner.includes('แพร')) {
      targetPersonId = 'PERSON-PHRAE';
    } else if (bnplOwner === 'แม่') {
      targetPersonId = 'PERSON-MOM';
    }

    let updatedFamily = (sotData.familySettlements || []).map(person => {
      // If editing and previous owner was a different person, remove sync item from them
      if (editingBnpl && person.id !== targetPersonId) {
        return {
          ...person,
          items: person.items.filter(i => 
            i.id !== `SYNC-${bnplId}` && 
            i.linkedSourceId !== bnplId &&
            i.title !== editingBnpl.title
          )
        };
      }

      if (person.id === targetPersonId) {
        const syncId = `SYNC-${bnplId}`;
        const existingIdx = person.items.findIndex(i => 
          i.id === syncId || 
          i.linkedSourceId === bnplId ||
          (editingBnpl && (i.title === editingBnpl.title || i.title.includes(editingBnpl.title) || i.linkedSourceId === editingBnpl.id))
        );

        const syncItem = {
          id: existingIdx >= 0 ? person.items[existingIdx].id : syncId,
          title: bnplTitle,
          amount,
          type: 'THEY_OWE',
          status: bnplIsPaidBack ? 'SETTLED' : 'PENDING',
          note: bnplNote ? `${bnplNote} (Shopee SPayLater)` : 'ฝากซื้อผ่าน Shopee SPayLater',
          linkedSourceId: bnplId
        };

        let newItems = [...person.items];
        if (existingIdx >= 0) {
          newItems[existingIdx] = syncItem;
        } else {
          newItems = [syncItem, ...newItems];
        }
        return { ...person, items: newItems };
      }
      return person;
    });

    let nextData = { ...sotData, bnplItems: updatedBnpl, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'BNPL', bnplId, editingBnpl ? 'BNPL_UPDATED' : 'BNPL_CREATED', {
      title: bnplTitle,
      amount,
      owner: bnplOwner,
      syncedToFamily: !!targetPersonId
    });

    updateSOTData(nextData);
    setShowAddBnplModal(false);
    setEditingBnpl(null);
    toast(`💾 บันทึกรายการ [${bnplTitle}] สำเร็จ${targetPersonId ? ' (ซิงค์เข้าแท็บเคลียร์บิลครอบครัวแล้ว ✨)' : ''}`, { type: 'success' });
  };

  const handleDeleteBnpl = async (itemId) => {
    const isConfirmed = await modalConfirm({
      title: 'ยืนยันการลบรายการ',
      message: 'ต้องการลบรายการช้อปปิ้งนี้ออกจากระบบใช่หรือไม่? (หากเชื่อมโยงในบิลครอบครัวจะถูกลบออกด้วย)',
      variant: 'danger',
      confirmText: 'ลบรายการ',
      cancelText: 'ยกเลิก'
    });
    if (!isConfirmed) return;

    const targetItem = bnplItems.find(i => i.id === itemId);
    const updatedBnpl = bnplItems.filter(i => i.id !== itemId);
    
    // Also remove from familySettlements
    const updatedFamily = (sotData.familySettlements || []).map(person => ({
      ...person,
      items: person.items.filter(i => 
        i.id !== `SYNC-${itemId}` && 
        i.linkedSourceId !== itemId &&
        (targetItem ? i.title !== targetItem.title : true)
      )
    }));

    let nextData = { ...sotData, bnplItems: updatedBnpl, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'BNPL', itemId, 'BNPL_DELETED');
    updateSOTData(nextData);
    toast('🗑️ ลบรายการเรียบร้อยแล้ว (อัปเดตบิลครอบครัวแล้ว)', { type: 'info' });
  };

  // Settle Full SPayLater Statement
  const handlePayFullStatement = async () => {
    if (isSpayStatementPaid) {
      toast('บิล Shopee SPayLater รอบนี้ถูกชำระเรียบร้อยแล้วครับ', { type: 'info' });
      return;
    }

    const currentStatementAmount = totalBnplAmount + totalMonthlySpayInstallments;
    const isConfirmed = await modalConfirm({
      title: '💳 ยืนยันการชำระบิล SPayLater เต็มจำนวน',
      message: `ยืนยันการชำระบิล Shopee SPayLater เต็มจำนวน ฿${currentStatementAmount.toLocaleString()} (ตัดเงินจากกระเป๋า "กันเงินจ่าย Shopee SPayLater [KBANK-SPAY]")?`,
      variant: 'success',
      confirmText: 'ยืนยันชำระบิล',
      cancelText: 'ยกเลิก'
    });
    if (!isConfirmed) return;

    const updatedAccounts = sotData.accounts.map(acc => {
      if (acc.id === 'KBANK-SPAY') {
        return { ...acc, balance: Math.max(0, acc.balance - currentStatementAmount), updatedAt: new Date().toISOString() };
      }
      return acc;
    });

    const updatedDebts = debts.map(d => {
      if (d.linkedAccountId === 'KBANK-SPAY' && d.remainingInstallments > 0) {
        const nextRem = d.remainingInstallments - 1;
        return {
          ...d,
          remainingInstallments: nextRem,
          remainingAmount: parseFloat(Math.max(0, d.remainingAmount - d.monthlyPayment).toFixed(2)),
          status: nextRem === 0 ? 'COMPLETED' : 'ACTIVE'
        };
      }
      return d;
    });

    const updatedBnpl = bnplItems.map(item => ({
      ...item,
      isPaidInStatement: true,
      isPaidBack: true
    }));

    const updatedStatements = {
      ...spayStatements,
      [currentCycle]: {
        cycle: currentCycle,
        status: 'PAID',
        paidAt: new Date().toISOString(),
        totalAmount: currentStatementAmount,
        bnplAmount: totalBnplAmount,
        installmentAmount: totalMonthlySpayInstallments,
        itemCount: activeSpayDebts.length,
        note: `ชำระเต็มจำนวนเรียบร้อยแล้วเมื่อ ${new Date().toLocaleDateString('th-TH')}`
      }
    };

    let nextData = {
      ...sotData,
      accounts: updatedAccounts,
      debts: updatedDebts,
      bnplItems: updatedBnpl,
      spayStatements: updatedStatements,
      spayStatementStatus: 'PAID',
      spayStatementPaidAt: new Date().toISOString(),
      spayStatementLastPaidAmount: currentStatementAmount
    };

    nextData = addAuditEvent(nextData, 'SPAYLATER', currentCycle, 'STATEMENT_PAID_FULL', {
      totalAmount: currentStatementAmount,
      bnplPortion: totalBnplAmount,
      installmentPortion: totalMonthlySpayInstallments
    });


    updateSOTData(nextData);
    toast(`🎉 ชำระบิล Shopee SPayLater ฿${currentStatementAmount.toLocaleString()} เรียบร้อยแล้ว! (บันทึกสถานะชำระแล้ว - ไม่ต้องกันเงินซ้ำ)`, { type: 'success' });
  };

  // Helper for dynamic Thai billing cycle advance
  const THAI_CYCLE_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const getNextSpayCycleString = (currentCycleStr) => {
    let matchedIdx = 8; // Default September (8)
    let year = 2026;
    if (currentCycleStr) {
      for (let i = 0; i < THAI_CYCLE_MONTHS.length; i++) {
        if (currentCycleStr.includes(THAI_CYCLE_MONTHS[i])) {
          matchedIdx = i;
          break;
        }
      }
    }
    const nextIdx = (matchedIdx + 1) % 12;
    const nextMonthName = THAI_CYCLE_MONTHS[nextIdx];
    const nextYear = nextIdx === 0 ? year + 1 : year;
    return `รอบ ${nextMonthName} ${nextYear} (ครบกำหนด 10 ${nextMonthName})`;
  };

  // Open New Billing Cycle for SPayLater
  const handleStartNewStatementCycle = async () => {
    const currentCycle = sotData.spayStatementCycle || 'รอบ ก.ย. 2026 (ครบกำหนด 10 ก.ย.)';
    const nextCycle = getNextSpayCycleString(currentCycle);

    const isConfirmed = await modalConfirm({
      title: '🔄 ยืนยันการเปิดรอบบิลใหม่',
      message: `ต้องการเปิดรอบบิลถัดไป (${nextCycle}) เพื่อเริ่มบันทึกบิลและคำนวณเงินกันรอบถัดไปใช่หรือไม่?`,
      variant: 'info',
      confirmText: `เปิด ${nextCycle}`,
      cancelText: 'ยกเลิก'
    });
    if (!isConfirmed) return;

    let nextData = {
      ...sotData,
      spayStatementStatus: 'UNPAID',
      spayStatementPaidAt: null,
      spayStatementCycle: nextCycle
    };
    nextData = addAuditEvent(nextData, 'SPAYLATER', 'STATEMENT_CYCLE_ADVANCE', 'CYCLE_OPENED', {
      newCycle: nextCycle
    });
    updateSOTData(nextData);
    toast(`🔄 เปิด ${nextCycle} เรียบร้อยแล้ว!`, { type: 'success' });
  };

  // Open Edit Modal for Long-Term Debts
  const handleOpenEdit = (debt) => {
    setEditingDebt(debt);
    setItemName(debt.itemName);
    setOwner(debt.owner || 'ตัวเอง');
    setTotalAmount(debt.totalAmount.toString());
    setMonthlyPayment(debt.monthlyPayment.toString());
    setTotalInstallments(debt.totalInstallments.toString());
    setRemainingInstallments(debt.remainingInstallments.toString());
    setCategory(debt.category || 'GADGET');
    setLinkedAccountId(debt.linkedAccountId || 'KBANK-SPAY');
    setPayerType(debt.payerType || (debt.owner === 'พี่แพร' ? 'THEY_PAY' : 'WE_PAY'));
    setSyncWithFamily(true);
    setShowAddDebtModal(true);
  };

  const handleOpenAdd = () => {
    setEditingDebt(null);
    setItemName('');
    setOwner('ตัวเอง');
    setTotalAmount('');
    setMonthlyPayment('');
    setTotalInstallments('10');
    setRemainingInstallments('10');
    setCategory('GADGET');
    setLinkedAccountId('KBANK-SPAY');
    setPayerType('WE_PAY');
    setSyncWithFamily(true);
    setShowAddDebtModal(true);
  };

  const handleDeleteDebt = async (debtId) => {
    const isConfirmed = await modalConfirm({
      title: 'ยืนยันการลบรายการผ่อน',
      message: 'ต้องการลบรายการผ่อนสินค้านี้ออกจากระบบใช่หรือไม่? (หากเชื่อมโยงในบิลครอบครัวจะถูกลบออกด้วย)',
      variant: 'danger',
      confirmText: 'ลบรายการผ่อน',
      cancelText: 'ยกเลิก'
    });
    if (!isConfirmed) return;

    const targetDebt = debts.find(d => d.id === debtId);
    const updatedDebts = debts.filter(d => d.id !== debtId);
    
    // Also remove from familySettlements
    const updatedFamily = (sotData.familySettlements || []).map(p => ({
      ...p,
      items: p.items.filter(i => 
        i.id !== `SYNC-${debtId}` && 
        i.id !== `ITEM-SYNC-${debtId.replace('DEBT-', '')}` &&
        i.linkedSourceId !== debtId &&
        (targetDebt ? !i.title.includes(targetDebt.itemName) : true)
      )
    }));

    let nextData = { ...sotData, debts: updatedDebts, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'DEBT', debtId, 'DEBT_DELETED');
    updateSOTData(nextData);
    if (editingDebt?.id === debtId) {
      setEditingDebt(null);
      setShowAddDebtModal(false);
    }
    toast('🗑️ ลบรายการผ่อนเรียบร้อยแล้ว (อัปเดตบิลครอบครัวแล้ว)', { type: 'info' });
  };

  const handleSaveDebt = (e) => {
    e.preventDefault();
    const tot = parseFloat(totalAmount);
    const inst = parseInt(totalInstallments);
    const remInst = parseInt(remainingInstallments) || inst;
    const mth = parseFloat(monthlyPayment) || (tot / inst);

    if (!itemName.trim() || isNaN(tot)) return;

    let updatedDebts = [...debts];
    let updatedFamily = [...(sotData.familySettlements || [])];
    const debtId = editingDebt ? editingDebt.id : `DEBT-${Date.now().toString().slice(-4)}`;

    if (editingDebt) {
      updatedDebts = updatedDebts.map(d => {
        if (d.id === editingDebt.id) {
          return {
            ...d,
            itemName,
            owner,
            category,
            totalAmount: tot,
            monthlyPayment: parseFloat(mth.toFixed(2)),
            totalInstallments: inst,
            remainingInstallments: remInst,
            remainingAmount: parseFloat((mth * remInst).toFixed(2)),
            linkedAccountId,
            payerType,
            status: remInst === 0 ? 'COMPLETED' : 'ACTIVE'
          };
        }
        return d;
      });
    } else {
      const newDebt = {
        id: debtId,
        itemName,
        owner,
        category,
        totalAmount: tot,
        remainingAmount: parseFloat((mth * remInst).toFixed(2)),
        monthlyPayment: parseFloat(mth.toFixed(2)),
        totalInstallments: inst,
        remainingInstallments: remInst,
        interestRate: 0.0,
        linkedAccountId,
        payerType,
        status: 'ACTIVE',
        createdAt: new Date().toISOString().split('T')[0]
      };
      updatedDebts.push(newDebt);
    }

    // Sync with Family Settlement Hub
    let syncedPersonName = null;
    if (syncWithFamily) {
      let personId = null;
      let settlementType = 'THEY_OWE';

      if (linkedAccountId === 'CARD-JAENG') {
        personId = 'PERSON-JAENG';
        settlementType = 'WE_OWE';
      } else if (linkedAccountId === 'CARD-MOM') {
        personId = 'PERSON-MOM';
        settlementType = 'WE_OWE';
      } else if (linkedAccountId === 'CARD-PHRAE') {
        personId = 'PERSON-PHRAE';
        settlementType = 'WE_OWE';
      } else if (owner === 'แจง' || owner === 'น้องพีเจ') {
        personId = 'PERSON-JAENG';
        settlementType = 'THEY_OWE';
      } else if (owner === 'แม่') {
        personId = 'PERSON-MOM';
        settlementType = 'THEY_OWE';
      } else if (owner === 'พี่แพร' || owner.includes('แพร')) {
        personId = 'PERSON-PHRAE';
        settlementType = 'THEY_OWE';
      }

      if (personId) {
        const syncId = `SYNC-${debtId}`;
        const oldSyncId = `ITEM-SYNC-${debtId.replace('DEBT-', '')}`;

        updatedFamily = updatedFamily.map(p => {
          // If editing and person changed, remove from previous person
          if (editingDebt && p.id !== personId) {
            return {
              ...p,
              items: p.items.filter(i => 
                i.id !== syncId && 
                i.id !== oldSyncId && 
                i.linkedSourceId !== debtId &&
                !i.title.includes(editingDebt.itemName)
              )
            };
          }

          if (p.id === personId) {
            syncedPersonName = p.personName;
            const syncTitle = settlementType === 'WE_OWE' 
              ? `ค่างวดผ่อน ${itemName} (เราผ่อนคืนให้${p.personName})` 
              : `ค่างวดผ่อน ${itemName} (${p.personName}ผ่อนคืนเรา)`;

            const existingIdx = p.items.findIndex(i => 
              i.id === syncId || 
              i.id === oldSyncId ||
              i.linkedSourceId === debtId ||
              (editingDebt && (i.title.includes(editingDebt.itemName) || i.title.includes(itemName)))
            );

            const syncItem = {
              id: existingIdx >= 0 ? p.items[existingIdx].id : syncId,
              title: syncTitle,
              amount: parseFloat(mth.toFixed(2)),
              type: settlementType,
              status: remInst === 0 ? 'SETTLED' : (existingIdx >= 0 ? p.items[existingIdx].status : 'PENDING'),
              note: `งวดละ ฿${mth.toFixed(2)} (${remInst}/${inst} งวด)`,
              linkedSourceId: debtId
            };

            let newItems = [...p.items];
            if (existingIdx >= 0) {
              newItems[existingIdx] = syncItem;
            } else {
              newItems = [syncItem, ...newItems];
            }
            return { ...p, items: newItems };
          }
          return p;
        });
      }
    }

    let nextData = { ...sotData, debts: updatedDebts, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'DEBT', debtId, editingDebt ? 'DEBT_UPDATED' : 'DEBT_CREATED', {
      itemName,
      owner,
      payerType,
      linkedAccountId,
      monthlyPayment: mth,
      syncedToFamily: !!syncedPersonName
    });

    updateSOTData(nextData);
    setEditingDebt(null);
    setShowAddDebtModal(false);
    toast(`💾 บันทึกรายการผ่อน [${itemName}] สำเร็จ${syncedPersonName ? ` (ซิงค์เข้าบิลของ${syncedPersonName}แล้ว ✨)` : ''}`, { type: 'success' });
  };

  const handlePaySingleInstallment = (debtId) => {
    const targetDebt = debts.find(d => d.id === debtId);
    if (!targetDebt || targetDebt.remainingInstallments <= 0) return;

    const newRemainingInstallments = targetDebt.remainingInstallments - 1;
    const newRemainingAmount = Math.max(0, targetDebt.remainingAmount - targetDebt.monthlyPayment);
    const newStatus = newRemainingInstallments === 0 ? 'COMPLETED' : 'ACTIVE';

    const updatedDebts = debts.map(d => {
      if (d.id === debtId) {
        return {
          ...d,
          remainingInstallments: newRemainingInstallments,
          remainingAmount: parseFloat(newRemainingAmount.toFixed(2)),
          status: newStatus
        };
      }
      return d;
    });

    // Sync remaining status to Family Settlement Hub
    let updatedFamily = (sotData.familySettlements || []).map(p => ({
      ...p,
      items: p.items.map(i => {
        if (
          i.id === `SYNC-${debtId}` || 
          i.id === `ITEM-SYNC-${debtId.replace('DEBT-', '')}` || 
          i.linkedSourceId === debtId ||
          i.title.includes(targetDebt.itemName)
        ) {
          if (newRemainingInstallments === 0) {
            return { ...i, status: 'SETTLED', note: 'ผ่อนครบทุกงวดแล้ว (เสร็จสิ้น)' };
          }
          return {
            ...i,
            note: `งวดละ ฿${targetDebt.monthlyPayment.toFixed(2)} (${newRemainingInstallments}/${targetDebt.totalInstallments} งวด)`
          };
        }
        return i;
      })
    }));

    let nextData = { ...sotData, debts: updatedDebts, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'DEBT', debtId, 'INSTALLMENT_PAID', {
      itemName: targetDebt.itemName,
      paidAmount: targetDebt.monthlyPayment,
      remainingInstallments: newRemainingInstallments
    });

    updateSOTData(nextData);
    toast(`💳 ตัดจ่ายค่างวด ${targetDebt.itemName} เรียบร้อย (เหลือ ${newRemainingInstallments} งวด)`, { type: 'success' });
  };

  const getOwnerBadge = (ownerName) => {
    switch (ownerName) {
      case 'เพื่อนร่วมงาน':
      case 'เพื่อนร่วมงาน (ที่ทำงาน)': return <span className="badge badge-purple">🏢 ของเพื่อนร่วมงาน</span>;
      case 'พี่แพร': return <span className="badge badge-purple">👩 ของพี่แพร</span>;
      case 'แจง': return <span className="badge badge-amber">👰 ของแจง</span>;
      case 'น้องพีเจ': return <span className="badge badge-cyan">👶 ของน้องพีเจ</span>;
      case 'แม่': return <span className="badge badge-emerald">👵 ของแม่</span>;
      case 'บ้าน': return <span className="badge badge-cyan">🏠 ของใช้ในบ้าน</span>;
      default: return <span className="badge badge-cyan">👤 ของตัวเอง</span>;
    }
  };

  const getPayerBadge = (payerType, ownerName) => {
    if (payerType === 'THEY_PAY') {
      return <span className="badge badge-purple" style={{ border: '1px solid rgba(139, 92, 246, 0.4)' }}>🔄 {ownerName || 'เขา'}ผ่อนคืนเรา</span>;
    }
    return <span className="badge badge-cyan" style={{ border: '1px solid rgba(6, 182, 212, 0.4)' }}>💵 เราผ่อนเอง</span>;
  };

  const getCardBadge = (linkedAccountId) => {
    switch (linkedAccountId) {
      case 'CARD-JAENG': return <span className="badge badge-amber">💳 รูดบัตรแจง</span>;
      case 'CARD-MOM': return <span className="badge badge-emerald">💳 รูดบัตรแม่</span>;
      case 'CARD-PHRAE': return <span className="badge badge-purple">💳 รูดบัตรพี่แพร</span>;
      case 'KBANK-SPAY': return <span className="badge badge-rose">🛍️ SPayLater</span>;
      case 'UOB-TMRW': return <span className="badge badge-blue">💳 บัตร UOB</span>;
      case 'KBANK-DEBIT': return <span className="badge badge-emerald">🏧 เดบิต กสิกร</span>;
      default: return <span className="badge badge-purple">💳 {linkedAccountId}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Master Statement Banner (Shopee SPayLater ส.ค. 2026) */}
      <div className="glass-panel glass-panel-glow-cyan" style={{ padding: '24px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Receipt size={22} color={isSpayStatementPaid ? "var(--accent-emerald)" : "var(--accent-cyan)"} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>บิล Shopee SPayLater</span>
                
                {/* Cycle Selector Dropdown & Quick Advance Button */}
                <select
                  value={sotData.spayStatementCycle || 'รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค.)'}
                  onChange={(e) => {
                    const nextCycle = e.target.value;
                    updateSOTData({ ...sotData, spayStatementCycle: nextCycle });
                    toast(`🔄 สลับรอบบิลเป็น ${nextCycle} เรียบร้อยแล้ว!`, { type: 'info' });
                  }}
                  style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid var(--accent-cyan)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="รอบ ส.ค. 2026 (ครบกำหนด 10 ส.ค.)">รอบ ส.ค. 2026 (ครบกำหนด 10 ส.ค.)</option>
                  <option value="รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค.)">รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค.)</option>
                  <option value="รอบ ต.ค. 2026 (ครบกำหนด 10 พ.ย.)">รอบ ต.ค. 2026 (ครบกำหนด 10 พ.ย.)</option>
                  <option value="รอบ พ.ย. 2026 (ครบกำหนด 10 ธ.ค.)">รอบ พ.ย. 2026 (ครบกำหนด 10 ธ.ค.)</option>
                  <option value="รอบ ธ.ค. 2026 (ครบกำหนด 10 ม.ค. 2027)">รอบ ธ.ค. 2026 (ครบกำหนด 10 ม.ค. 2027)</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const nextCycle = getNextSpayCycleString(sotData.spayStatementCycle || 'รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค.)');
                    updateSOTData({ ...sotData, spayStatementCycle: nextCycle });
                    toast(`⏩ เลื่อนรอบบิลเป็น ${nextCycle} เรียบร้อยแล้ว!`, { type: 'success' });
                  }}
                  className="btn btn-outline"
                  style={{ fontSize: '0.72rem', padding: '4px 8px', color: 'var(--accent-cyan)' }}
                  title="เลื่อนไปรอบบิลถัดไป"
                >
                  ⏩ เลื่อนไปรอบถัดไป
                </button>

                {isSpayStatementPaid && <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>🎉 ชำระเรียบร้อยแล้ว</span>}
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {isSpayStatementPaid 
                ? `ชำระเต็มจำนวนเรียบร้อยแล้วเมื่อ ${currentCycleData?.paidAt ? new Date(currentCycleData.paidAt).toLocaleDateString('th-TH') : (sotData.spayStatementPaidAt ? new Date(sotData.spayStatementPaidAt).toLocaleDateString('th-TH') : '10 ส.ค. 2026')} (ยอดค้างชำระ: ฿0.00)`
                : 'รวมยอด "ช้อปก่อนจ่ายทีหลัง (BNPL / ฝากซื้อ VIP)" + "ค่างวดผ่อนประจำเดือน"'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: isSpayStatementPaid ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                {isSpayStatementPaid ? 'สถานะรอบบิลนี้' : 'ยอดรวมที่ต้องชำระทั้งบิล'}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isSpayStatementPaid ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                {isSpayStatementPaid ? '฿0.00' : `฿${totalSpayStatement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
            </div>
            {isSpayStatementPaid ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button disabled className="btn btn-success" style={{ padding: '12px 18px', opacity: 0.9 }}>
                  <CheckCircle2 size={18} /> ชำระบิลเต็มจำนวนแล้ว
                </button>
                <button onClick={handleStartNewStatementCycle} className="btn btn-secondary" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} title="เริ่มบันทึกบิลรอบถัดไป">
                  <RefreshCw size={16} /> เปิดรอบบิลใหม่
                </button>
              </div>
            ) : (
              <button onClick={handlePayFullStatement} className="btn btn-success" style={{ padding: '12px 20px' }}>
                <CheckCircle2 size={18} /> กดชำระบิลเต็มจำนวน
              </button>
            )}
          </div>
        </div>

        {/* 3 Breakdown Metric Capsules */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                🛒 1. ช้อปก่อนจ่ายทีหลัง (BNPL)
              </span>
              <span className="badge badge-amber">{pendingBnplItems.length} รายการ</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
              ฿{totalBnplAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {pendingBnplItems.length > 0 ? 'รวมสแกนกิน Shinkanzen + ของที่คนอื่นฝากกด VIP' : 'ไม่มีรายการช้อปก่อนจ่ายค้างชำระ'}
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                🛍️ 2. ค่างวดผ่อนประจำเดือนนี้
              </span>
              <span className={`badge ${isSpayStatementPaid ? 'badge-emerald' : 'badge-cyan'}`}>
                {isSpayStatementPaid 
                  ? (currentCycleData?.itemCount ? `${currentCycleData.itemCount} รายการ (ชำระแล้ว)` : 'ชำระแล้ว')
                  : `${activeSpayDebts.length} รายการผ่อน`}
              </span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: isSpayStatementPaid ? 'var(--accent-emerald)' : '#fff' }}>
              {isSpayStatementPaid 
                ? (currentCycleData?.installmentAmount ? `฿${currentCycleData.installmentAmount.toLocaleString()} (ชำระแล้ว)` : '฿0.00')
                : `฿${totalMonthlySpayInstallments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {isSpayStatementPaid
                ? (currentCycleData?.note || 'ชำระเต็มจำนวนเรียบร้อยแล้ว (เก็บบันทึกประวัติศาสตร์สรุปสิ้นปี)')
                : (activeSpayDebts.length > 0 
                    ? activeSpayDebts.map(d => d.itemName).slice(0, 3).join(', ') + (activeSpayDebts.length > 3 ? ' ฯลฯ' : '')
                    : 'ไม่มีรายการผ่อนค้างชำระ (ผ่อนครบหรือไม่มีรายการในรอบนี้)')}
            </p>
          </div>


          <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-purple)', fontWeight: 600 }}>
                ⏳ ยอดรอเก็บเงินคืนจากผู้อื่น
              </span>
              <Users size={16} color="var(--accent-purple)" />
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
              ฿{pendingCollectionFromOthers.toLocaleString()}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              ของที่เพื่อนที่ทำงาน/แจงฝากซื้อ ที่ยังไม่ได้โอนคืน
            </p>
          </div>

        </div>
      </div>

      {/* Person Quick-Filter Pills & Action Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="var(--accent-cyan)" /> กรองดูแยกตามบุคคล (Filter by Person):
            </span>
          </div>

          {/* Grouping View Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
            <button
              onClick={() => setViewGroupingMode('BY_PERSON')}
              className={`btn ${viewGroupingMode === 'BY_PERSON' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              📂 แยกตามบุคคล
            </button>
            <button
              onClick={() => setViewGroupingMode('BY_PAYER')}
              className={`btn ${viewGroupingMode === 'BY_PAYER' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              ⚖️ แยกตามคนจ่าย
            </button>
            <button
              onClick={() => setViewGroupingMode('FLAT')}
              className={`btn ${viewGroupingMode === 'FLAT' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              📋 รายการรวม
            </button>
          </div>
        </div>

        {/* Person Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'ALL', label: '🌟 ทุกคนทั้งหมด', icon: '' },
            { id: 'ตัวเอง', label: '👤 ของตัวเอง', icon: '' },
            { id: 'แจง', label: '👰 แจง (ภรรยา)', icon: '' },
            { id: 'พี่แพร', label: '👩 พี่แพร', icon: '' },
            { id: 'แม่', label: '👵 แม่', icon: '' },
            { id: 'น้องพีเจ', label: '👶 น้องพีเจ', icon: '' },
            { id: 'บ้าน', label: '🏠 ของใช้ในบ้าน', icon: '' },
            { id: 'เพื่อนร่วมงาน', label: '🏢 เพื่อนร่วมงาน', icon: '' }
          ].map(p => {
            const isSelected = selectedPersonFilter === p.id;
            const pDebts = p.id === 'ALL' ? debts : debts.filter(d => (d.owner?.includes(p.id) || (p.id === 'เพื่อนร่วมงาน' && d.owner?.includes('เพื่อน'))));
            const pBnpl = p.id === 'ALL' ? bnplItems : bnplItems.filter(b => (b.owner?.includes(p.id) || (p.id === 'เพื่อนร่วมงาน' && b.owner?.includes('เพื่อน'))));
            const totalCount = pDebts.length + pBnpl.length;
            const pMonthly = pDebts.filter(d => (d.remainingInstallments > 0 || d.remainingAmount > 0) && d.status !== 'COMPLETED').reduce((s, d) => s + (d.monthlyPayment || 0), 0);


            return (
              <button
                key={p.id}
                onClick={() => setSelectedPersonFilter(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 0.2s'
                }}
              >
                <span>{p.label}</span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
                  color: isSelected ? '#000' : 'var(--text-muted)',
                  fontWeight: 700
                }}>
                  {totalCount}
                </span>
                {pMonthly > 0 && (
                  <span style={{ fontSize: '0.72rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    (฿{pMonthly.toLocaleString()}/ด.)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtabs Navigation & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: 'BNPL', label: `🛒 ฝากซื้อ VIP / BNPL (${bnplItems.length})` },
            { id: 'INSTALLMENTS', label: `🛍️ รายการผ่อนระยะยาว (${debts.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`btn ${activeSubTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '6px 14px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleOpenAddBnpl} className="btn btn-warning" style={{ fontSize: '0.85rem' }}>
            <Plus size={14} /> เพิ่มรายการฝากซื้อ VIP Shopee
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            <Plus size={14} /> ➕ เพิ่มรายการผ่อนสินค้า
          </button>
        </div>
      </div>

      {/* SECTION A: BNPL (ช้อปก่อนจ่ายทีหลัง) TABLE */}
      {(activeSubTab === 'ALL' || activeSubTab === 'BNPL') && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
                🛒 รายการช้อปก่อนจ่ายทีหลัง & ฝากซื้อ VIP Shopee (BNPL)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {selectedPersonFilter === 'ALL' ? 'แสดงรายการทั้งหมด' : `กรองเฉพาะของ "${selectedPersonFilter}"`}
              </p>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ยอดรวม BNPL: <b style={{ color: '#fff' }}>฿{bnplItems.filter(i => selectedPersonFilter === 'ALL' || i.owner === selectedPersonFilter || (selectedPersonFilter === 'เพื่อนร่วมงาน' && i.owner?.includes('เพื่อน'))).reduce((s, i) => s + i.amount, 0).toLocaleString()}</b>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bnplItems
              .filter(item => selectedPersonFilter === 'ALL' || item.owner === selectedPersonFilter || (selectedPersonFilter === 'เพื่อนร่วมงาน' && item.owner?.includes('เพื่อน')))
              .map(item => {
                const isOther = item.owner !== 'ตัวเอง' && item.owner !== 'บ้าน';

                return (
                  <div 
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: item.isPaidBack ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getOwnerBadge(item.owner)}
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 500, color: '#f8fafc' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.note} • {item.category}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                          ฿{item.amount.toLocaleString()}
                        </div>
                        {isOther && (
                          <div style={{ fontSize: '0.72rem', color: item.isPaidBack ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                            {item.isPaidBack ? '✅ เก็บเงินคืนแล้ว' : '⏳ รอเก็บเงินคืน'}
                          </div>
                        )}
                      </div>

                      {isOther && (
                        <button
                          onClick={() => handleToggleBnplPaidBack(item.id)}
                          title={item.isPaidBack ? 'เปลี่ยนเป็นยังไม่ได้รับเงิน' : 'ติ๊กว่าได้รับเงินคืนแล้ว'}
                          className={`btn ${item.isPaidBack ? 'btn-outline' : 'btn-warning'}`}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          {item.isPaidBack ? <Check size={12} /> : <Clock size={12} />}
                          {item.isPaidBack ? 'จ่ายคืนแล้ว' : 'รับเงินคืน'}
                        </button>
                      )}

                      <button 
                        onClick={() => handleOpenEditBnpl(item)}
                        title="แก้ไขรายการ"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Edit3 size={14} />
                      </button>

                      <button 
                        onClick={() => handleDeleteBnpl(item.id)}
                        title="ลบรายการ"
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SECTION B: LONG-TERM INSTALLMENT PLANS */}
      {(activeSubTab === 'ALL' || activeSubTab === 'INSTALLMENTS') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Summary of Personal Debt vs Others Debt */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                👤 ภาระผ่อนของตัวเองจริง (เราต้องจ่ายเอง)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                ฿{myMonthlyDebt.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>/เดือน</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {myDebts.length} รายการ (รวมของตัวเองใน SPayLater และของที่เรารูดผ่อนผ่านบัตรแจง/แม่)
              </div>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-purple)', fontWeight: 600 }}>
                  👥 ของที่คนอื่นฝากผ่อน (เขาโอนคืนเรา)
                </span>
                <span className="badge badge-purple">{othersDebts.length} รายการ</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)', margin: '4px 0' }}>
                ฿{othersMonthlyDebt.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>/เดือน</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {othersDebts.map(d => `${d.itemName} (฿${d.monthlyPayment}/ด.)`).join(', ') || 'ไม่มีรายการค้าง'}
              </div>
            </div>
          </div>

          {/* RENDER MODE 1: BY_PERSON (Grouped by Person - Default) */}
          {viewGroupingMode === 'BY_PERSON' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { name: 'ตัวเอง', title: '👤 ของตัวเอง (เราใช้เอง)' },
                { name: 'แจง', title: '👰 ของแจง (ภรรยา)' },
                { name: 'พี่แพร', title: '👩 ของพี่แพร' },
                { name: 'แม่', title: '👵 ของแม่' },
                { name: 'น้องพีเจ', title: '👶 ของน้องพีเจ' },
                { name: 'บ้าน', title: '🏠 ของใช้ส่วนรวมในบ้าน' },
                { name: 'เพื่อนร่วมงาน', title: '🏢 ของเพื่อนร่วมงาน' }
              ]
                .filter(group => selectedPersonFilter === 'ALL' || selectedPersonFilter === group.name)
                .map(group => {
                  const groupDebts = debts.filter(d => (d.owner?.includes(group.name) || (group.name === 'เพื่อนร่วมงาน' && d.owner?.includes('เพื่อน'))));
                  if (groupDebts.length === 0) return null;

                  const groupMonthly = groupDebts.filter(d => (d.remainingInstallments > 0 || d.remainingAmount > 0) && d.status !== 'COMPLETED').reduce((s, d) => s + (d.monthlyPayment || 0), 0);
                  const groupRemaining = groupDebts.reduce((s, d) => s + (d.remainingAmount || 0), 0);


                  return (
                    <div key={group.name} className="glass-panel" style={{ padding: '18px 20px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                            {group.title}
                          </h3>
                          <span className="badge badge-purple">{groupDebts.length} รายการ</span>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                          <span>ค่างวดรวม: <b style={{ color: 'var(--accent-cyan)' }}>฿{groupMonthly.toLocaleString()}/ด.</b></span>
                          <span>หนี้คงเหลือรวม: <b style={{ color: 'var(--accent-rose)' }}>฿{groupRemaining.toLocaleString()}</b></span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                        {groupDebts.map(debt => {
                          const completedInstallments = debt.totalInstallments - debt.remainingInstallments;
                          const progressPercent = Math.round((completedInstallments / debt.totalInstallments) * 100);
                          const isCompleted = debt.remainingInstallments === 0;
                          const isWePay = debt.payerType === 'WE_PAY';

                          return (
                            <div 
                              key={debt.id} 
                              style={{ 
                                padding: '16px', 
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: 'var(--radius-sm)',
                                border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : !isWePay ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-subtle)'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {getPayerBadge(debt.payerType, debt.owner)}
                                  {getCardBadge(debt.linkedAccountId)}
                                  <span className="badge badge-purple">{debt.category}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    onClick={() => handleOpenEdit(debt)} 
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem' }}
                                  >
                                    <Edit3 size={11} /> แก้ไข
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteDebt(debt.id)} 
                                    style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-rose)', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.72rem' }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>

                              <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                                {debt.itemName}
                              </h4>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                <span>ค่างวด: <b style={{ color: '#fff' }}>฿{debt.monthlyPayment.toLocaleString()}</b>/ด.</span>
                                <span>หนี้คงเหลือ: <b style={{ color: !isWePay ? 'var(--accent-purple)' : 'var(--accent-rose)' }}>฿{debt.remainingAmount.toLocaleString()}</b></span>
                              </div>

                              {/* Progress Bar */}
                              <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                                <div style={{ 
                                  width: `${progressPercent}%`, 
                                  height: '100%', 
                                  background: isCompleted ? 'var(--accent-emerald)' : !isWePay ? 'linear-gradient(90deg, #8b5cf6, #a855f7)' : 'linear-gradient(90deg, #0284c7, #06b6d4)', 
                                  transition: 'width 0.3s' 
                                }}></div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  จ่ายแล้ว {completedInstallments}/{debt.totalInstallments} (เหลือ {debt.remainingInstallments} งวด)
                                </span>
                                {!isCompleted && (
                                  <button 
                                    onClick={() => handlePaySingleInstallment(debt.id)}
                                    className="btn btn-outline"
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                  >
                                    ตัดจ่ายงวดนี้
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* RENDER MODE 2 & 3: BY_PAYER or FLAT */}
          {viewGroupingMode !== 'BY_PERSON' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '16px' }}>
              {debts
                .filter(debt => {
                  if (selectedPersonFilter !== 'ALL') {
                    if (selectedPersonFilter === 'เพื่อนร่วมงาน') {
                      if (!debt.owner?.includes('เพื่อน')) return false;
                    } else if (debt.owner !== selectedPersonFilter) {
                      return false;
                    }
                  }
                  return true;
                })
                .sort((a, b) => {
                  if (viewGroupingMode === 'BY_PAYER') {
                    return a.payerType === 'WE_PAY' ? -1 : 1;
                  }
                  return 0;
                })
                .map(debt => {
                  const completedInstallments = debt.totalInstallments - debt.remainingInstallments;
                  const progressPercent = Math.round((completedInstallments / debt.totalInstallments) * 100);
                  const isCompleted = debt.remainingInstallments === 0;
                  const isWePay = debt.payerType === 'WE_PAY';

                  return (
                    <div 
                      key={debt.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '20px', 
                        border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : !isWePay ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-subtle)', 
                        position: 'relative' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {getOwnerBadge(debt.owner || 'ตัวเอง')}
                          {getPayerBadge(debt.payerType, debt.owner)}
                          {getCardBadge(debt.linkedAccountId)}
                          <span className="badge badge-purple">{debt.category}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => handleOpenEdit(debt)} 
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                          >
                            <Edit3 size={12} /> แก้ไข
                          </button>
                          <button 
                            onClick={() => handleDeleteDebt(debt.id)} 
                            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-rose)', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                        {debt.itemName}
                      </h3>

                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '8px', 
                        padding: '8px 10px', 
                        background: 'rgba(0, 0, 0, 0.25)', 
                        borderRadius: 'var(--radius-sm)', 
                        fontSize: '0.78rem',
                        marginBottom: '10px',
                        color: 'var(--text-secondary)'
                      }}>
                        <span>👤 เจ้าของ: <b style={{ color: '#fff' }}>{debt.owner || 'ตัวเอง'}</b></span>
                        <span>•</span>
                        <span>💵 คนผ่อน: <b style={{ color: isWePay ? 'var(--accent-cyan)' : 'var(--accent-purple)' }}>{isWePay ? 'เราผ่อนเอง' : `${debt.owner} ผ่อนคืนเรา`}</b></span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <span>ค่างวด: <b style={{ color: '#fff' }}>฿{debt.monthlyPayment.toLocaleString()}</b>/ด.</span>
                        <span>หนี้คงเหลือ: <b style={{ color: !isWePay ? 'var(--accent-purple)' : 'var(--accent-rose)' }}>฿{debt.remainingAmount.toLocaleString()}</b></span>
                      </div>

                      <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                        <div style={{ 
                          width: `${progressPercent}%`, 
                          height: '100%', 
                          background: isCompleted ? 'var(--accent-emerald)' : !isWePay ? 'linear-gradient(90deg, #8b5cf6, #a855f7)' : 'linear-gradient(90deg, #0284c7, #06b6d4)', 
                          transition: 'width 0.3s' 
                        }}></div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          จ่ายแล้ว {completedInstallments} / {debt.totalInstallments} (ค้างจ่ายรวมบิลนี้: {debt.remainingInstallments} งวด)
                        </span>
                        {!isCompleted && (
                          <button 
                            onClick={() => handlePaySingleInstallment(debt.id)}
                            className="btn btn-outline"
                            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                          >
                            ตัดจ่ายงวดนี้
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {/* Add / Edit BNPL Modal */}
      {showAddBnplModal && (
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
              {editingBnpl ? '✏️ แก้ไขรายการช้อปก่อนจ่ายทีหลัง (BNPL)' : '➕ เพิ่มรายการฝากซื้อ VIP Shopee (BNPL)'}
            </h3>

            <form onSubmit={handleSaveBnpl} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ชื่อสินค้า / รายการที่ฝากซื้อ
                </label>
                <input
                  type="text"
                  placeholder="เช่น กาแฟแคปซูล Nespresso (พี่ที่โรงเรียนฝากกด)"
                  value={bnplTitle}
                  onChange={(e) => setBnplTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ยอดเงิน (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="450"
                    value={bnplAmount}
                    onChange={(e) => setBnplAmount(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ใครเป็นคนฝากซื้อ?
                  </label>
                  <select
                    value={bnplOwner}
                    onChange={(e) => setBnplOwner(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="เพื่อนร่วมงาน (ที่ทำงาน)">🏢 เพื่อนร่วมงาน (ที่ทำงาน)</option>
                    <option value="พี่แพร">👩 พี่แพร</option>
                    <option value="แจง">👰 แจง</option>
                    <option value="แม่">👵 แม่</option>
                    <option value="บ้าน">🏠 ของใช้ในบ้าน</option>
                    <option value="ตัวเอง">👤 ของตัวเอง</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  บันทึกเพิ่มเติม (เช่น ชื่อพี่ที่ฝาก / ส่วนลด VIP)
                </label>
                <input
                  type="text"
                  placeholder="เช่น พี่ป้อม ฝากกดโค้ดลด 15%"
                  value={bnplNote}
                  onChange={(e) => setBnplNote(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="paidBackCheck"
                  checked={bnplIsPaidBack}
                  onChange={(e) => setBnplIsPaidBack(e.target.checked)}
                />
                <label htmlFor="paidBackCheck" style={{ fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                  ได้รับเงินสด/เงินโอนคืนจากผู้ฝากซื้อเรียบร้อยแล้ว
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddBnplModal(false)} 
                  className="btn btn-outline"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Debt Modal for Long Term Debts */}
      {(showAddDebtModal || editingDebt) && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '26px', border: '1px solid var(--border-glow)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
              {editingDebt ? '✏️ แก้ไขข้อมูลรายการผ่อนสินค้า' : '➕ บันทึกรายการผ่อนสินค้าใหม่'}
            </h3>

            <form onSubmit={handleSaveDebt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ชื่อสิ่งของ / สินค้า
                </label>
                <input
                  type="text"
                  placeholder="เช่น iPhone 16 Pro, หูฟัง Sony XM5, พวงมาลัย Logitech"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  required
                />
              </div>

              {/* 3 Core Selection Questions: Owner, Payer, Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    👤 1. ใครเป็นเจ้าของสินค้า?
                  </label>
                  <select
                    value={owner}
                    onChange={(e) => {
                      const newOwner = e.target.value;
                      setOwner(newOwner);
                      if (newOwner === 'แจง' || newOwner === 'พี่แพร' || newOwner === 'แม่' || newOwner === 'น้องพีเจ') {
                        if (!linkedAccountId.startsWith('CARD-')) {
                          setPayerType('THEY_PAY'); // If on our card/SPay, default to they pay us back
                        }
                      } else if (newOwner === 'ตัวเอง' || newOwner === 'บ้าน') {
                        setPayerType('WE_PAY');
                      }
                    }}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="ตัวเอง">👤 ของตัวเอง</option>
                    <option value="แจง">👰 ของแจง (ภรรยา)</option>
                    <option value="พี่แพร">👩 ของพี่แพร</option>
                    <option value="แม่">👵 ของแม่</option>
                    <option value="น้องพีเจ">👶 ของน้องพีเจ</option>
                    <option value="บ้าน">🏠 ของใช้ในบ้าน (ส่วนรวม)</option>
                    <option value="เพื่อนร่วมงาน">🏢 ของเพื่อนร่วมงาน</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--accent-purple)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    💵 2. ใครเป็นคนผ่อนจ่ายค่างวด?
                  </label>
                  <select
                    value={payerType}
                    onChange={(e) => setPayerType(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="WE_PAY">👤 เราผ่อนจ่ายเอง (ภาระของเรา)</option>
                    <option value="THEY_PAY">🔄 เจ้าของ/คนอื่นผ่อนคืนเรา (โอนคืนเรา)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  💳 3. รูดซื้อผ่านบัตร / บัญชีของใคร?
                </label>
                <select
                  value={linkedAccountId}
                  onChange={(e) => {
                    const newCard = e.target.value;
                    setLinkedAccountId(newCard);
                    if (newCard.startsWith('CARD-')) {
                      setPayerType('WE_PAY'); // Borrowed their card, we pay
                    } else if (owner === 'แจง' || owner === 'พี่แพร' || owner === 'แม่' || owner === 'น้องพีเจ') {
                      setPayerType('THEY_PAY'); // On our account, they pay us back
                    }
                  }}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                >
                  <option value="KBANK-SPAY">🛍️ Shopee SPayLater (บัญชีชื่อเรา)</option>
                  <option value="UOB-TMRW">💳 บัตรกดเงินสด/เครดิต UOB (บัตรชื่อเรา)</option>
                  <option value="CARD-JAENG">👰 บัตรเครดิตของแจง (ยืมบัตรแจงรูดซื้อ)</option>
                  <option value="CARD-MOM">👵 บัตรเครดิตของแม่ (ยืมบัตรแม่รูดซื้อ)</option>
                  <option value="CARD-PHRAE">👩 บัตรเครดิตของพี่แพร (ยืมบัตรพี่แพรรูดซื้อ)</option>
                  <option value="KBANK-DEBIT">🏧 บัญชีเดบิต กสิกร (เงินสดเรา)</option>
                </select>
              </div>

              {/* Dynamic Real-time Help / Summary Card */}
              <div style={{ 
                padding: '10px 12px', 
                borderRadius: 'var(--radius-sm)', 
                background: 'rgba(255, 255, 255, 0.04)', 
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                💡 <b>สรุปรูปแบบ:</b> ของของ <b>{owner}</b> • รูดด้วย <b>{linkedAccountId === 'CARD-JAENG' ? 'บัตรแจง' : linkedAccountId === 'CARD-MOM' ? 'บัตรแม่' : linkedAccountId === 'CARD-PHRAE' ? 'บัตรพี่แพร' : linkedAccountId === 'KBANK-SPAY' ? 'SPayLater ของเรา' : linkedAccountId === 'UOB-TMRW' ? 'บัตร UOB ของเรา' : 'เดบิตเรา'}</b> • ผู้จ่ายค่างวดคือ <b style={{ color: payerType === 'WE_PAY' ? 'var(--accent-cyan)' : 'var(--accent-purple)' }}>{payerType === 'WE_PAY' ? 'เราผ่อนเอง' : `${owner} ผ่อนคืนเรา`}</b>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    หมวดหมู่
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="GADGET">📱 Gadget / อุปกรณ์ไอที</option>
                    <option value="GAMING">🎮 Gaming / พวงมาลัย/เกม</option>
                    <option value="APPLIANCE">🏠 เครื่องใช้ไฟฟ้า</option>
                    <option value="FURNITURE">🪑 เฟอร์นิเจอร์</option>
                    <option value="OTHER">📦 อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ราคารวม (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="เช่น 39900"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ค่างวดต่อเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="เช่น 3990"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    จำนวนงวดทั้งหมด
                  </label>
                  <input
                    type="number"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    งวดที่ค้างจ่าย
                  </label>
                  <input
                    type="number"
                    value={remainingInstallments}
                    onChange={(e) => setRemainingInstallments(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Auto Sync Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <input
                  type="checkbox"
                  id="syncFam"
                  checked={syncWithFamily}
                  onChange={(e) => setSyncWithFamily(e.target.checked)}
                />
                <label htmlFor="syncFam" style={{ fontSize: '0.82rem', color: '#fff', cursor: 'pointer' }}>
                  🔗 <b>ซิงค์เข้าแท็บ "เคลียร์บิลครอบครัว" อัตโนมัติ:</b> นำค่างวดนี้ไปหักลบกับบิลของแจง/พี่แพร/แม่ สิ้นเดือนให้อัตโนมัติ
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowAddDebtModal(false); setEditingDebt(null); }} 
                  className="btn btn-outline"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDebt ? 'บันทึกการแก้ไข' : 'บันทึกรายการผ่อน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
