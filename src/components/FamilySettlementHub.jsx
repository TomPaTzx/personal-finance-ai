import React, { useState } from 'react';
import { Users, Plus, CheckCircle2, ArrowRightLeft, CreditCard, Heart, Home, AlertCircle, Sparkles, Edit3, Trash2, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { addAuditEvent } from '../services/storageService';

export default function FamilySettlementHub({ sotData, updateSOTData }) {
  const [selectedPersonId, setSelectedPersonId] = useState('PERSON-MOM');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Settlement execution state
  const [settleWalletId, setSettleWalletId] = useState('KBANK-HOME');
  const [autoUpdateWallet, setAutoUpdateWallet] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('WE_OWE');
  const [note, setNote] = useState('');

  const accounts = sotData.accounts || [];
  const familyList = sotData.familySettlements || [];
  const selectedPerson = familyList.find(p => p.id === selectedPersonId) || familyList[0];

  // Calculate Net Settlement for Selected Person
  const pendingItems = (selectedPerson?.items || []).filter(i => i.status === 'PENDING');
  const weOweTotal = pendingItems
    .filter(i => i.type === 'WE_OWE')
    .reduce((sum, i) => sum + i.amount, 0);

  const theyOweTotal = pendingItems
    .filter(i => i.type === 'THEY_OWE')
    .reduce((sum, i) => sum + i.amount, 0);

  const netBalance = weOweTotal - theyOweTotal; // Positive = We owe them, Negative = They owe us

  const selectedWallet = accounts.find(a => a.id === settleWalletId) || accounts[0];

  // Toggle item status
  const handleToggleItemStatus = (itemId) => {
    const updatedFamily = familyList.map(person => {
      if (person.id === selectedPersonId) {
        const updatedItems = person.items.map(item => {
          if (item.id === itemId) {
            const nextStatus = item.status === 'PENDING' ? 'SETTLED' : 'PENDING';
            return { ...item, status: nextStatus };
          }
          return item;
        });
        return { ...person, items: updatedItems };
      }
      return person;
    });

    let nextData = { ...sotData, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'FAMILY_SETTLEMENT', itemId, 'ITEM_STATUS_TOGGLED', {
      person: selectedPerson?.personName
    });

    updateSOTData(nextData);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setTitle(item.title);
    setAmount(item.amount.toString());
    setType(item.type);
    setNote(item.note || '');
    setShowAddModal(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setTitle('');
    setAmount('');
    setType('WE_OWE');
    setNote('');
    setShowAddModal(true);
  };

  // Save Item (Add or Edit)
  const handleSaveItem = (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    let updatedFamily = familyList.map(person => {
      if (person.id === selectedPersonId) {
        let updatedItems = [...person.items];
        if (editingItem) {
          updatedItems = updatedItems.map(i => {
            if (i.id === editingItem.id) {
              return {
                ...i,
                title,
                amount: parsedAmount,
                type,
                note
              };
            }
            return i;
          });
        } else {
          const newItem = {
            id: `ITEM-${Date.now().toString().slice(-4)}`,
            title,
            amount: parsedAmount,
            type,
            status: 'PENDING',
            note: note || 'รายการใหม่'
          };
          updatedItems = [newItem, ...updatedItems];
        }
        return { ...person, items: updatedItems };
      }
      return person;
    });

    let nextData = { ...sotData, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'FAMILY_SETTLEMENT', editingItem ? editingItem.id : 'NEW_ITEM', editingItem ? 'ITEM_UPDATED' : 'ITEM_ADDED', {
      person: selectedPerson?.personName,
      title,
      amount: parsedAmount,
      type
    });

    updateSOTData(nextData);
    setShowAddModal(false);
    setEditingItem(null);
  };

  // Delete single item
  const handleDeleteItem = (itemId) => {
    if (!window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;

    const updatedFamily = familyList.map(person => {
      if (person.id === selectedPersonId) {
        return { ...person, items: person.items.filter(i => i.id !== itemId) };
      }
      return person;
    });

    let nextData = { ...sotData, familySettlements: updatedFamily };
    nextData = addAuditEvent(nextData, 'FAMILY_SETTLEMENT', itemId, 'ITEM_DELETED', {
      person: selectedPerson?.personName
    });

    updateSOTData(nextData);
  };

  // Open Settlement Modal
  const handleOpenSettleModal = () => {
    if (pendingItems.length === 0) {
      alert('ไม่มีรายการค้างชำระสำหรับคนนี้ครับ ทุกอย่างเคลียร์ครบแล้ว!');
      return;
    }
    // Set smart default wallet
    if (accounts.some(a => a.id === 'KBANK-HOME')) {
      setSettleWalletId('KBANK-HOME');
    } else if (accounts.length > 0) {
      setSettleWalletId(accounts[0].id);
    }
    setShowSettleModal(true);
  };

  // Settle All Pending with Selected Wallet
  const handleConfirmSettlement = () => {
    let updatedAccounts = [...accounts];
    const absNet = Math.abs(netBalance);

    if (autoUpdateWallet && netBalance !== 0 && selectedWallet) {
      updatedAccounts = updatedAccounts.map(acc => {
        if (acc.id === settleWalletId) {
          if (netBalance > 0) {
            // We owe them -> deduct from selected wallet
            return {
              ...acc,
              balance: Math.max(0, (acc.balance || 0) - netBalance),
              updatedAt: new Date().toISOString()
            };
          } else {
            // They owe us -> add to selected wallet
            return {
              ...acc,
              balance: (acc.balance || 0) + absNet,
              updatedAt: new Date().toISOString()
            };
          }
        }
        return acc;
      });
    }

    const updatedFamily = familyList.map(person => {
      if (person.id === selectedPersonId) {
        const updatedItems = person.items.map(item => ({ ...item, status: 'SETTLED' }));
        return { ...person, items: updatedItems };
      }
      return person;
    });

    let nextData = {
      ...sotData,
      accounts: updatedAccounts,
      familySettlements: updatedFamily
    };

    nextData = addAuditEvent(nextData, 'FAMILY_SETTLEMENT', selectedPersonId, 'FULL_NET_SETTLEMENT_EXECUTED', {
      person: selectedPerson?.personName,
      netAmount: netBalance,
      walletUsed: autoUpdateWallet ? settleWalletId : 'MANUAL_OFFLINE',
      walletName: autoUpdateWallet ? selectedWallet?.name : 'ไม่มีการตัดบัญชี'
    });

    updateSOTData(nextData);
    setShowSettleModal(false);
    alert(`🎉 เคลียร์ยอดสุทธิกับ ${selectedPerson.personName} เรียบร้อยแล้ว!\n${autoUpdateWallet ? `(บันทึกปรับยอดในกระเป๋า ${selectedWallet?.name})` : ''}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} color="var(--accent-purple)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ระบบเคลียร์บิล & หักลบกลบหนี้ครอบครัว (Family Settlement)</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            จัดการค่าน้ำ ค่าไฟ ค่า Coway บัตรแม่/พี่แพร ค่ากับข้าว และยอดฝากผ่อน Shopee SPayLater สิ้นเดือนหักลบยอดสุทธิและเลือกกระเป๋าตัดเงินได้อิสระ
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={16} /> เพิ่มรายการบิล/ยอดค้าง
        </button>
      </div>

      {/* Person Selector Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {familyList.map(person => {
          const isSelected = person.id === selectedPersonId;
          const pWeOwe = person.items.filter(i => i.type === 'WE_OWE' && i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
          const pTheyOwe = person.items.filter(i => i.type === 'THEY_OWE' && i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
          const pNet = pWeOwe - pTheyOwe;

          return (
            <div 
              key={person.id}
              onClick={() => setSelectedPersonId(person.id)}
              className="glass-panel"
              style={{
                padding: '20px',
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{person.personName}</strong>
                <span className="badge badge-purple">{person.relation}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px', minHeight: '34px' }}>
                {person.note}
              </p>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ยอดสุทธิสิ้นเดือน:</span>
                <span style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 700, 
                  color: pNet > 0 ? 'var(--accent-rose)' : pNet < 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' 
                }}>
                  {pNet > 0 ? `เราต้องจ่าย ฿${pNet.toLocaleString()}` : pNet < 0 ? `เขาต้องโอน ฿${Math.abs(pNet).toLocaleString()}` : '✅ เคลียร์ครบแล้ว'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Person Detailed Settlement Dashboard */}
      {selectedPerson && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-glow)' }}>
          
          {/* Summary Box */}
          <div style={{ 
            background: 'rgba(15, 23, 42, 0.85)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-md)', 
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  สรุปการหักลบกลบหนี้กับ {selectedPerson.personName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  สามารถกดเคลียร์ยอดเพื่อเลือกกระเป๋าที่จะตัดเงินหรือรับเงินโอนเข้าได้ทันที
                </span>
              </div>

              <button 
                onClick={handleOpenSettleModal} 
                className="btn btn-success" 
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={pendingItems.length === 0}
              >
                <CheckCircle2 size={18} /> เคลียร์ยอดสุทธิ (เลือกกระเป๋า)
              </button>
            </div>

            {/* 3 Metric Capsules */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowDownRight size={14} /> เราต้องจ่ายคืน (We Owe)
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                  ฿{weOweTotal.toLocaleString()}
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowUpRight size={14} /> เขาต้องจ่ายเรา (They Owe Us)
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                  ฿{theyOweTotal.toLocaleString()}
                </div>
              </div>

              <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid var(--border-glow)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>🎯 ยอดสุทธิที่ต้องโอน (Net Offset)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: netBalance > 0 ? 'var(--accent-rose)' : netBalance < 0 ? 'var(--accent-emerald)' : 'var(--text-muted)', marginTop: '4px' }}>
                  {netBalance > 0 ? `เราโอน ฿${netBalance.toLocaleString()}` : netBalance < 0 ? `เขาโอน ฿${Math.abs(netBalance).toLocaleString()}` : '฿0 (เท่าทุน)'}
                </div>
              </div>
            </div>

          </div>

          {/* Items List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
              รายการบิลและยอดค้างชำระย่อย ({selectedPerson.items?.length || 0} รายการ)
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              กด ✏️ เพื่อแก้ไขยอดเงินจริง หรือ 🗑️ เพื่อลบรายการ
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(selectedPerson.items || []).map(item => {
              const isSettled = item.status === 'SETTLED';
              const isWeOwe = item.type === 'WE_OWE';

              return (
                <div 
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: isSettled ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    opacity: isSettled ? 0.6 : 1,
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button 
                      onClick={() => handleToggleItemStatus(item.id)}
                      title={isSettled ? 'เปลี่ยนเป็นยังไม่จ่าย' : 'ติ๊กว่าจ่ายแล้ว'}
                      style={{
                        background: isSettled ? 'var(--accent-emerald)' : 'transparent',
                        border: isSettled ? 'none' : '2px solid var(--border-subtle)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {isSettled && <CheckCircle2 size={16} color="#fff" />}
                    </button>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#f8fafc', textDecoration: isSettled ? 'line-through' : 'none' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.note} • {isWeOwe ? 'เราจ่ายคืน' : 'เขาฝากเราจ่าย'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '1.05rem', 
                      fontWeight: 700, 
                      color: isWeOwe ? 'var(--accent-rose)' : 'var(--accent-emerald)' 
                    }}>
                      {isWeOwe ? `-฿${item.amount.toLocaleString()}` : `+฿${item.amount.toLocaleString()}`}
                    </span>
                    <span className={`badge ${isSettled ? 'badge-emerald' : 'badge-amber'}`}>
                      {isSettled ? 'จ่ายแล้ว' : 'รอเคลียร์'}
                    </span>

                    <button 
                      onClick={() => handleOpenEdit(item)}
                      title="แก้ไขตัวเลข / ข้อมูลบิล"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Edit3 size={15} />
                    </button>

                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      title="ลบรายการนี้"
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Settle Net Balance Modal with Wallet Selector */}
      {showSettleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '26px', border: '1px solid var(--border-glow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Wallet size={24} color="var(--accent-cyan)" />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  🤝 เคลียร์ยอดสุทธิ: {selectedPerson.personName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  เลือกกระเป๋าเงินสำหรับตัดจ่ายหรือรับเงินโอนจริง
                </span>
              </div>
            </div>

            {/* Summary details */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>เราค้างจ่าย ({selectedPerson.personName}):</span>
                <strong style={{ color: 'var(--accent-rose)' }}>฿{weOweTotal.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>ยอดที่ {selectedPerson.personName} ค้างเรา:</span>
                <strong style={{ color: 'var(--accent-emerald)' }}>฿{theyOweTotal.toLocaleString()}</strong>
              </div>
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>ยอดสุทธิที่ต้องทำรายการ:</span>
                <span style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 700, 
                  color: netBalance > 0 ? 'var(--accent-rose)' : netBalance < 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' 
                }}>
                  {netBalance > 0 ? `เราโอนจ่าย ฿${netBalance.toLocaleString()}` : netBalance < 0 ? `รับเงินโอน ฿${Math.abs(netBalance).toLocaleString()}` : '฿0 (ไม่ต้องโอน)'}
                </span>
              </div>
            </div>

            {/* Wallet Selection Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  {netBalance > 0 ? '💳 เลือกกระเป๋าเงินที่จะตัดเงินจ่ายออก:' : '📥 เลือกกระเป๋าเงินที่จะรับเงินโอนเข้า:'}
                </label>
                <select
                  value={settleWalletId}
                  onChange={(e) => setSettleWalletId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid var(--border-glow)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.id}] {acc.name} — คงเหลือ ฿{(acc.balance || 0).toLocaleString()} ({acc.bank})
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time Wallet Simulation */}
              {selectedWallet && autoUpdateWallet && (
                <div style={{ 
                  background: 'rgba(6, 182, 212, 0.05)', 
                  border: '1px solid var(--border-glow)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '14px' 
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '6px' }}>
                    📊 จำลองยอดเงินในกระเป๋า "{selectedWallet.name}" เรียลไทม์:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>ยอดเงินคงเหลือปัจจุบัน:</span>
                    <span>฿{(selectedWallet.balance || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {netBalance > 0 ? 'หักยอดชำระสุทธิ:' : 'เพิ่มยอดรับเงินสุทธิ:'}
                    </span>
                    <span style={{ color: netBalance > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                      {netBalance > 0 ? `-฿${netBalance.toLocaleString()}` : `+฿${Math.abs(netBalance).toLocaleString()}`}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700 }}>
                    <span style={{ color: '#fff' }}>ยอดคงเหลือใหม่หลังเคลียร์:</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>
                      ฿{(netBalance > 0 ? Math.max(0, (selectedWallet.balance || 0) - netBalance) : (selectedWallet.balance || 0) + Math.abs(netBalance)).toLocaleString()}
                    </span>
                  </div>

                  {netBalance > 0 && (selectedWallet.balance || 0) < netBalance && (
                    <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} /> ยอดเงินในกระเป๋านี้ไม่เพียงพอ (ขาด ฿{(netBalance - (selectedWallet.balance || 0)).toLocaleString()}) แนะนำให้เลือกกระเป๋าอื่นหรือเติมเงินก่อน
                    </div>
                  )}
                </div>
              )}

              {/* Checkbox: Update Wallet Balance */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoUpdateWallet}
                  onChange={(e) => setAutoUpdateWallet(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                ปรับยอดเงินในกระเป๋าที่เลือกโดยอัตโนมัติ
              </label>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowSettleModal(false)} className="btn btn-outline">
                ยกเลิก
              </button>
              <button 
                type="button" 
                onClick={handleConfirmSettlement} 
                className="btn btn-success"
                style={{ padding: '10px 20px', fontWeight: 600 }}
              >
                <CheckCircle2 size={16} /> ยืนยันการเคลียร์ยอดและปรับยอดกระเป๋า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {showAddModal && (
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
              {editingItem ? `✏️ แก้ไขบิล (${selectedPerson.personName})` : `➕ เพิ่มรายการบิล (${selectedPerson.personName})`}
            </h3>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ชื่อรายการบิล / ค่าใช้จ่าย
                </label>
                <input
                  type="text"
                  placeholder="เช่น ค่าไฟบ้านเดือน ส.ค."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    จำนวนเงินจริง (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1850"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)', fontSize: '1.1rem', fontWeight: 700 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ทิศทางการจ่าย
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="WE_OWE">เราต้องจ่ายคืนเขา (We Owe)</option>
                    <option value="THEY_OWE">เขาต้องจ่ายคืนเรา (They Owe Us)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  บันทึกเพิ่มเติม (Note)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ตัดจากบัตรแม่ / บิลประจำเดือน"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="btn btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  บันทึกตัวเลข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
