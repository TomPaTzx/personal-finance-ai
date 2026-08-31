import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Plus, Calendar, Percent, Edit3, ShoppingBag, ArrowRight, Sparkles, Receipt, Users, Check, Clock, Trash2, UserCheck, Smartphone } from 'lucide-react';
import { addAuditEvent } from '../services/storageService';

export default function DebtTracker({ sotData, updateSOTData }) {
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
  
  // Separate Personal Debt vs Others Debt
  // Note: If linked to CARD-JAENG/MOM/PHRAE and payerType is WE_PAY -> This is OUR personal debt!
  const myDebts = debts.filter(d => (d.owner === 'ตัวเอง' || d.owner === 'บ้าน' || d.payerType === 'WE_PAY' || d.linkedAccountId?.startsWith('CARD-')));
  const othersDebts = debts.filter(d => (d.owner !== 'ตัวเอง' && d.owner !== 'บ้าน' && d.payerType !== 'WE_PAY' && !d.linkedAccountId?.startsWith('CARD-')));

  const myMonthlyDebt = myDebts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const othersMonthlyDebt = othersDebts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const totalMonthlyBilled = myMonthlyDebt + othersMonthlyDebt;

  // Dynamic BNPL Items
  const bnplItems = sotData.bnplItems || [];
  const totalBnplAmount = bnplItems.reduce((sum, item) => sum + item.amount, 0);
  const totalSpayStatement = totalBnplAmount + 5177.95; // ฿13,639.22

  // Total pending collection from others (เพื่อน/ครอบครัวฝากซื้อที่ยังไม่ได้จ่ายเงินคืนเรา)
  const pendingCollectionFromOthers = bnplItems
    .filter(i => i.owner !== 'ตัวเอง' && i.owner !== 'บ้าน' && !i.isPaidBack)
    .reduce((sum, i) => sum + i.amount, 0);

  // Toggle BNPL Paid Back Status
  const handleToggleBnplPaidBack = (itemId) => {
    const updatedBnpl = bnplItems.map(item => {
      if (item.id === itemId) {
        return { ...item, isPaidBack: !item.isPaidBack };
      }
      return item;
    });

    let nextData = { ...sotData, bnplItems: updatedBnpl };
    nextData = addAuditEvent(nextData, 'BNPL', itemId, 'PAID_BACK_STATUS_TOGGLED');
    updateSOTData(nextData);
  };

  // Open Add/Edit BNPL Modal
  const handleOpenAddBnpl = () => {
    setEditingBnpl(null);
    setBnplTitle('');
    setBnplAmount('');
    setBnplOwner('เพื่อนร่วมงาน (ที่ทำงาน)');
    setBnplCategory('SHOPEE_VIP');
    setBnplIsPaidBack(false);
    setBnplNote('ฝากกด VIP Shopee');
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

  // Save BNPL Item
  const handleSaveBnpl = (e) => {
    e.preventDefault();
    const amount = parseFloat(bnplAmount);
    if (!bnplTitle.trim() || isNaN(amount) || amount <= 0) return;

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
        id: `BNPL-${Date.now().toString().slice(-4)}`,
        title: bnplTitle,
        amount,
        owner: bnplOwner,
        category: bnplCategory,
        isPaidBack: bnplIsPaidBack,
        note: bnplNote
      };
      updatedBnpl = [newItem, ...updatedBnpl];
    }

    let nextData = { ...sotData, bnplItems: updatedBnpl };
    nextData = addAuditEvent(nextData, 'BNPL', editingBnpl ? editingBnpl.id : 'NEW_BNPL', editingBnpl ? 'BNPL_UPDATED' : 'BNPL_CREATED', {
      title: bnplTitle,
      amount,
      owner: bnplOwner
    });

    updateSOTData(nextData);
    setShowAddBnplModal(false);
    setEditingBnpl(null);
  };

  const handleDeleteBnpl = (itemId) => {
    if (!window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
    const updatedBnpl = bnplItems.filter(i => i.id !== itemId);
    let nextData = { ...sotData, bnplItems: updatedBnpl };
    nextData = addAuditEvent(nextData, 'BNPL', itemId, 'BNPL_DELETED');
    updateSOTData(nextData);
  };

  // Settle Full SPayLater Statement
  const handlePayFullStatement = () => {
    if (!window.confirm(`ยืนยันการชำระบิล Shopee SPayLater เต็มจำนวน ฿${totalSpayStatement.toLocaleString()} (ตัดเงินจากกระเป๋า "กันเงินจ่าย Shopee SPayLater (KBANK-SPAY)")?`)) return;

    const updatedAccounts = sotData.accounts.map(acc => {
      if (acc.id === 'KBANK-SPAY') {
        return { ...acc, balance: Math.max(0, acc.balance - totalSpayStatement), updatedAt: new Date().toISOString() };
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

    let nextData = {
      ...sotData,
      accounts: updatedAccounts,
      debts: updatedDebts
    };

    nextData = addAuditEvent(nextData, 'SPAYLATER', 'STATEMENT_AUG_2026', 'STATEMENT_PAID_FULL', {
      totalAmount: totalSpayStatement,
      bnplPortion: totalBnplAmount,
      installmentPortion: 5177.95
    });

    updateSOTData(nextData);
    alert(`🎉 ชำระบิล Shopee SPayLater ฿${totalSpayStatement.toLocaleString()} เรียบร้อยแล้ว! ทุกรายการผ่อนถูกตัดไป 1 งวด`);
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
    setOwner('แจง');
    setTotalAmount('');
    setMonthlyPayment('');
    setTotalInstallments('10');
    setRemainingInstallments('10');
    setCategory('GADGET');
    setLinkedAccountId('CARD-JAENG');
    setPayerType('WE_PAY');
    setSyncWithFamily(true);
    setShowAddDebtModal(true);
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

    const isBorrowedCard = linkedAccountId.startsWith('CARD-');

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

      // Sync with Family Settlement Hub
      if (syncWithFamily) {
        let personId = null;
        let settlementType = 'WE_OWE';

        if (linkedAccountId === 'CARD-JAENG' || (owner === 'แจง' && payerType === 'WE_PAY')) {
          personId = 'PERSON-JAENG';
          settlementType = 'WE_OWE'; // เราผ่อนให้แจง = เราต้องโอนคืนแจง
        } else if (linkedAccountId === 'CARD-MOM' || (owner === 'แม่' && payerType === 'WE_PAY')) {
          personId = 'PERSON-MOM';
          settlementType = 'WE_OWE';
        } else if (linkedAccountId === 'CARD-PHRAE' || (owner === 'พี่แพร' && payerType === 'WE_PAY')) {
          personId = 'PERSON-PHRAE';
          settlementType = 'WE_OWE';
        } else if (owner === 'พี่แพร' && payerType === 'THEY_PAY') {
          personId = 'PERSON-PHRAE';
          settlementType = 'THEY_OWE'; // พี่แพรผ่อนกับเรา = พี่แพรจ่ายคืนเรา
        }

        if (personId) {
          updatedFamily = updatedFamily.map(p => {
            if (p.id === personId) {
              const existingIdx = p.items.findIndex(i => i.title.includes(itemName) || i.id.includes(editingDebt.id));
              const syncTitle = settlementType === 'WE_OWE' 
                ? `ค่างวดผ่อน ${itemName} (เราผ่อนคืนให้${p.personName})` 
                : `ค่างวดผ่อน ${itemName} (${p.personName}ผ่อนคืนเรา)`;

              const newItem = {
                id: `ITEM-SYNC-${editingDebt.id.replace('DEBT-', '')}`,
                title: syncTitle,
                amount: parseFloat(mth.toFixed(2)),
                type: settlementType,
                status: 'PENDING',
                note: `งวดละ ฿${mth.toFixed(2)} (${remInst}/${inst} งวด)`
              };

              let newItems = [...p.items];
              if (existingIdx >= 0) {
                newItems[existingIdx] = newItem;
              } else {
                newItems = [newItem, ...newItems];
              }
              return { ...p, items: newItems };
            }
            return p;
          });
        }
      }

    } else {
      const newDebtId = `DEBT-${Date.now().toString().slice(-4)}`;
      const newDebt = {
        id: newDebtId,
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

      // Sync new debt to Family Settlement Hub
      if (syncWithFamily) {
        let personId = null;
        let settlementType = 'WE_OWE';

        if (linkedAccountId === 'CARD-JAENG' || (owner === 'แจง' && payerType === 'WE_PAY')) {
          personId = 'PERSON-JAENG';
          settlementType = 'WE_OWE';
        } else if (linkedAccountId === 'CARD-MOM' || (owner === 'แม่' && payerType === 'WE_PAY')) {
          personId = 'PERSON-MOM';
          settlementType = 'WE_OWE';
        } else if (linkedAccountId === 'CARD-PHRAE' || (owner === 'พี่แพร' && payerType === 'WE_PAY')) {
          personId = 'PERSON-PHRAE';
          settlementType = 'WE_OWE';
        } else if (owner === 'พี่แพร' && payerType === 'THEY_PAY') {
          personId = 'PERSON-PHRAE';
          settlementType = 'THEY_OWE';
        }

        if (personId) {
          updatedFamily = updatedFamily.map(p => {
            if (p.id === personId) {
              const syncTitle = settlementType === 'WE_OWE' 
                ? `ค่างวดผ่อน ${itemName} (เราผ่อนคืนให้${p.personName})` 
                : `ค่างวดผ่อน ${itemName} (${p.personName}ผ่อนคืนเรา)`;

              const newItem = {
                id: `ITEM-SYNC-${newDebtId.replace('DEBT-', '')}`,
                title: syncTitle,
                amount: parseFloat(mth.toFixed(2)),
                type: settlementType,
                status: 'PENDING',
                note: `งวดละ ฿${mth.toFixed(2)} (${remInst}/${inst} งวด)`
              };
              return { ...p, items: [newItem, ...p.items] };
            }
            return p;
          });
        }
      }
    }

    let nextData = { ...sotData, debts: updatedDebts, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'DEBT', editingDebt ? editingDebt.id : 'NEW_DEBT', editingDebt ? 'DEBT_UPDATED' : 'DEBT_CREATED', {
      itemName,
      owner,
      linkedAccountId,
      monthlyPayment: mth
    });

    updateSOTData(nextData);
    setEditingDebt(null);
    setShowAddDebtModal(false);
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

    let nextData = { ...sotData, debts: updatedDebts };
    nextData = addAuditEvent(nextData, 'DEBT', debtId, 'INSTALLMENT_PAID', {
      itemName: targetDebt.itemName,
      paidAmount: targetDebt.monthlyPayment,
      remainingInstallments: newRemainingInstallments
    });

    updateSOTData(nextData);
  };

  const getOwnerBadge = (ownerName, linkedAccountId) => {
    if (linkedAccountId === 'CARD-JAENG') {
      return <span className="badge badge-amber" style={{ border: '1px solid var(--accent-amber)' }}>💳 รูดบัตรแจง (เราผ่อนให้)</span>;
    }
    if (linkedAccountId === 'CARD-MOM') {
      return <span className="badge badge-emerald" style={{ border: '1px solid var(--accent-emerald)' }}>💳 รูดบัตรแม่ (เราผ่อนคืน)</span>;
    }
    if (linkedAccountId === 'CARD-PHRAE') {
      return <span className="badge badge-purple" style={{ border: '1px solid var(--accent-purple)' }}>💳 รูดบัตรพี่แพร (เราผ่อนคืน)</span>;
    }

    switch (ownerName) {
      case 'เพื่อนร่วมงาน':
      case 'เพื่อนร่วมงาน (ที่ทำงาน)': return <span className="badge badge-purple">🏢 เพื่อนที่ทำงาน</span>;
      case 'พี่แพร': return <span className="badge badge-purple">👩 พี่แพร</span>;
      case 'แจง': return <span className="badge badge-amber">👰 แจง</span>;
      case 'น้องพีเจ': return <span className="badge badge-cyan">👶 น้องพีเจ</span>;
      case 'แม่': return <span className="badge badge-emerald">👵 แม่</span>;
      case 'บ้าน': return <span className="badge badge-cyan">🏠 ของใช้ในบ้าน</span>;
      default: return <span className="badge badge-cyan">👤 ของตัวเอง</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Master Statement Banner (Shopee SPayLater ส.ค. 2026) */}
      <div className="glass-panel glass-panel-glow-cyan" style={{ padding: '24px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Receipt size={22} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                บิล Shopee SPayLater รอบ ส.ค. 2026 (ครบกำหนด 10 ส.ค.)
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              รวมยอด "ช้อปก่อนจ่ายทีหลัง (BNPL / ฝากซื้อ VIP)" + "ค่างวดผ่อนประจำเดือน"
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ยอดรวมที่ต้องชำระทั้งบิล</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
                ฿{totalSpayStatement.toLocaleString()}
              </div>
            </div>
            <button onClick={handlePayFullStatement} className="btn btn-success" style={{ padding: '12px 20px' }}>
              <CheckCircle2 size={18} /> กดชำระบิลเต็มจำนวน
            </button>
          </div>
        </div>

        {/* 3 Breakdown Metric Capsules */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                🛒 1. ช้อปก่อนจ่ายทีหลัง (BNPL)
              </span>
              <span className="badge badge-amber">{bnplItems.length} รายการ</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
              ฿{totalBnplAmount.toLocaleString()}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              รวมสแกนกิน Shinkanzen + ของที่คนอื่นฝากกด VIP
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                🛍️ 2. ค่างวดผ่อนประจำเดือนนี้
              </span>
              <span className="badge badge-cyan">9 รายการผ่อน</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
              ฿5,177.95
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              หูฟัง Sony (฿2,370), พวงมาลัย G29, หมอน Becell ฯลฯ
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

      {/* Subtabs Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: 'BNPL', label: `🛒 ช้อปก่อนจ่ายทีหลัง / ฝากซื้อ (${bnplItems.length})` },
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleOpenAddBnpl} className="btn btn-warning" style={{ fontSize: '0.85rem' }}>
            <Plus size={14} /> เพิ่มรายการฝากซื้อ VIP Shopee (BNPL)
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            <Plus size={14} /> ➕ บันทึกรายการผ่อนสินค้า (บัตรตัวเอง / บัตรแจง / บัตรแม่)
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
                ระบุได้ว่าเพื่อนที่ทำงานหรือคนในบ้านฝากซื้อ พร้อมติ๊กเก็บเงินคืน
              </p>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ยอดรวม BNPL: <b style={{ color: '#fff' }}>฿{totalBnplAmount.toLocaleString()}</b>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bnplItems.map(item => {
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
        <div>
          
          {/* Summary of Personal Debt vs Others Debt */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                👤 ภาระผ่อนของตัวเองจริง (ต้องจ่ายเอง)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                ฿{myMonthlyDebt.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>/เดือน</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                รวมทั้งของตัวเองใน SPayLater และของที่เรารูดผ่อนผ่านบัตรแจง/แม่
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
                แท็บเล็ต UOB พี่แพร (฿663.89/ด. พี่แพรจ่ายคืนเรามาตัดบัตร)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
              🛍️ รายการผ่อนระยะยาวทั้งหมด (Long-Term Installment Plans)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ยอดเรียกเก็บรวม: <b>฿{totalMonthlyBilled.toLocaleString()}/ด.</b>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '16px' }}>
            {debts.map(debt => {
              const completedInstallments = debt.totalInstallments - debt.remainingInstallments;
              const progressPercent = Math.round((completedInstallments / debt.totalInstallments) * 100);
              const isCompleted = debt.remainingInstallments === 0;
              const isBorrowedCard = debt.linkedAccountId?.startsWith('CARD-');
              const isReimbursed = debt.owner !== 'ตัวเอง' && debt.owner !== 'บ้าน' && debt.payerType !== 'WE_PAY' && !isBorrowedCard;

              return (
                <div 
                  key={debt.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '20px', 
                    border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : isBorrowedCard ? '1px solid rgba(245, 158, 11, 0.5)' : isReimbursed ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-subtle)', 
                    position: 'relative' 
                  }}
                >
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {getOwnerBadge(debt.owner || 'ตัวเอง', debt.linkedAccountId)}
                      <span className="badge badge-purple">{debt.category}</span>
                      {isBorrowedCard && <span className="badge badge-amber">🔄 ผ่อนคืนแจง/ครอบครัว</span>}
                      {isReimbursed && <span className="badge badge-emerald">✨ {debt.owner}จ่ายคืน</span>}
                    </div>
                    <button 
                      onClick={() => handleOpenEdit(debt)} 
                      title="แก้ไขข้อมูล / เปลี่ยนเจ้าของ"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem'
                      }}
                    >
                      <Edit3 size={12} /> แก้ไข
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                    {debt.itemName}
                  </h3>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <span>ค่างวด: <b style={{ color: '#fff' }}>฿{debt.monthlyPayment.toLocaleString()}</b>/ด.</span>
                    <span>หนี้คงเหลือ: <b style={{ color: isReimbursed ? 'var(--accent-purple)' : isBorrowedCard ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>฿{debt.remainingAmount.toLocaleString()}</b></span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                    <div style={{ 
                      width: `${progressPercent}%`, 
                      height: '100%', 
                      background: isCompleted ? 'var(--accent-emerald)' : isBorrowedCard ? 'linear-gradient(90deg, #f59e0b, #eab308)' : isReimbursed ? 'linear-gradient(90deg, #8b5cf6, #a855f7)' : 'linear-gradient(90deg, #0284c7, #06b6d4)', 
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '26px', border: '1px solid var(--border-glow)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
              {editingDebt ? '✏️ แก้ไขข้อมูลการผ่อนสินค้า' : '➕ บันทึกรายการผ่อนสินค้า (บัตรตัวเอง / บัตรแจง / บัตรแม่)'}
            </h3>

            <form onSubmit={handleSaveDebt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ชื่อสิ่งของ / สินค้า
                </label>
                <input
                  type="text"
                  placeholder="เช่น iPhone 16 Pro (ผ่อนให้แจง)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  required
                />
              </div>

              {/* Card Channel & Responsibility */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    💳 รูดผ่านบัตร / บัญชีใคร?
                  </label>
                  <select
                    value={linkedAccountId}
                    onChange={(e) => {
                      setLinkedAccountId(e.target.value);
                      if (e.target.value === 'CARD-JAENG') {
                        setOwner('แจง');
                        setPayerType('WE_PAY');
                      } else if (e.target.value === 'CARD-MOM') {
                        setOwner('แม่');
                        setPayerType('WE_PAY');
                      } else if (e.target.value === 'CARD-PHRAE') {
                        setOwner('พี่แพร');
                        setPayerType('WE_PAY');
                      }
                    }}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="CARD-JAENG">👰 บัตรของแจง (ภรรยา)</option>
                    <option value="CARD-MOM">👵 บัตรของแม่</option>
                    <option value="CARD-PHRAE">👩 บัตรของพี่แพร</option>
                    <option value="KBANK-SPAY">🛍️ Shopee SPayLater (ชื่อเรา)</option>
                    <option value="UOB-TMRW">💳 บัตรกดเงินสด/บัตร UOB (ชื่อเรา)</option>
                    <option value="KBANK-DEBIT">🏧 บัญชีเดบิต กสิกร</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ใครรับผิดชอบค่างวด?
                  </label>
                  <select
                    value={payerType}
                    onChange={(e) => setPayerType(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="WE_PAY">👤 เราเป็นคนผ่อนจ่ายคืน</option>
                    <option value="THEY_PAY">👥 เขาเป็นคนผ่อนจ่ายคืนเรา</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                    งวดที่ค้างจ่าย (รวมงวดนี้)
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
                  🔗 <b>ซิงค์เข้าแท็บ "เคลียร์บิลครอบครัว" อัตโนมัติ:</b> ระบบจะนำค่างวดนี้ไปหักลบกับบิลของแจง/พี่แพร/แม่ สิ้นเดือนให้อัตโนมัติ
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
                  บันทึกรายการผ่อน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
