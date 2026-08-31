import React, { useState } from 'react';
import { Tv, Sparkles, AlertCircle, Plus, CheckCircle2, Clock, Users, Edit3, Trash2, BellRing, ExternalLink, Calendar, CreditCard, ShieldAlert } from 'lucide-react';
import { addAuditEvent } from '../services/storageService';

export default function SubscriptionsManager({ sotData, updateSOTData }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [paymentMethod, setPaymentMethod] = useState('KBANK-DEBIT');
  const [category, setCategory] = useState('ENTERTAINMENT');
  const [sharingType, setSharingType] = useState('ALONE'); // ALONE, SPLIT_50_50, FAMILY_SHARE
  const [sharePartner, setSharePartner] = useState('');
  const [shareMembersCount, setShareMembersCount] = useState('6');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [hasPriceHikeWarning, setHasPriceHikeWarning] = useState(false);
  const [priceHikeNote, setPriceHikeNote] = useState('');

  const subscriptions = sotData.subscriptions || [
    {
      id: 'SUB-YT',
      name: 'YouTube Premium (Family Plan)',
      fullAmount: 399,
      ourShareAmount: 64.00,
      sharingType: 'FAMILY_SHARE',
      shareMembersCount: 6,
      partnerOrMembers: 'เก็บคนละ ฿67 x 5 คน (+฿335) เราจ่ายจริง ฿64',
      paymentMethod: 'Shopee SPayLater / กสิกรเดบิต',
      category: 'ENTERTAINMENT',
      status: 'ACTIVE',
      nextBillingDate: '2026-09-05',
      note: 'ตัดผ่าน SPayLater หรือ กสิกรเดบิต เก็บเงินคนในตี้เดือนละ ฿67.00'
    },
    {
      id: 'SUB-GONE',
      name: 'Google One AI Premium (2TB + Gemini Advanced)',
      fullAmount: 189,
      ourShareAmount: 189,
      sharingType: 'ALONE',
      paymentMethod: 'Shopee SPayLater / Google Play',
      category: 'PRODUCTIVITY',
      status: 'ACTIVE',
      nextBillingDate: '2026-09-12',
      note: 'ตัดผ่าน ShopeePay Order - Google ฿189'
    },
    {
      id: 'SUB-CAPCUT',
      name: 'CapCut Pro (Video Editing)',
      fullAmount: 29,
      ourShareAmount: 29,
      sharingType: 'ALONE',
      paymentMethod: 'Shopee SPayLater / Google Play',
      category: 'CREATIVE',
      status: 'ACTIVE',
      nextBillingDate: '2026-09-15',
      hasPriceHikeWarning: true,
      priceHikeNote: '⚠️ เดือนนี้โปร ฿29 แต่เดือนหน้าราคาเต็ม ฿289! (เตรียมกดยกเลิกถ้าไม่ได้ใช้ต่อ)'
    },
    {
      id: 'SUB-NETFLIX',
      name: 'Netflix (Premium 4K UHD)',
      fullAmount: 518,
      ourShareAmount: 259,
      sharingType: 'SPLIT_50_50',
      partnerOrMembers: 'พี่แพร (หารคนละครึ่ง คนละ ฿259)',
      paymentMethod: 'กสิกรเดบิต / บัตรเครดิต',
      category: 'ENTERTAINMENT',
      status: 'ACTIVE',
      nextBillingDate: '2026-09-20',
      note: 'พี่แพรหาร ฿259 ซิงค์เข้า Family Hub หักลบกับค่า Coway'
    }
  ];

  const totalFullCost = subscriptions.reduce((sum, s) => sum + (s.fullAmount || 0), 0);
  const totalOurCost = subscriptions.reduce((sum, s) => sum + (s.ourShareAmount || s.fullAmount || 0), 0);
  const totalRecoveredFromOthers = totalFullCost - totalOurCost;

  const handleOpenAdd = () => {
    setEditingSub(null);
    setName('');
    setAmount('');
    setBillingCycle('MONTHLY');
    setPaymentMethod('KBANK-DEBIT');
    setCategory('ENTERTAINMENT');
    setSharingType('ALONE');
    setSharePartner('');
    setShareMembersCount('6');
    setNextBillingDate('');
    setHasPriceHikeWarning(false);
    setPriceHikeNote('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (sub) => {
    setEditingSub(sub);
    setName(sub.name);
    setAmount(sub.fullAmount.toString());
    setBillingCycle(sub.billingCycle || 'MONTHLY');
    setPaymentMethod(sub.paymentMethod);
    setCategory(sub.category);
    setSharingType(sub.sharingType || 'ALONE');
    setSharePartner(sub.partnerOrMembers || '');
    setShareMembersCount((sub.shareMembersCount || 6).toString());
    setNextBillingDate(sub.nextBillingDate || '');
    setHasPriceHikeWarning(sub.hasPriceHikeWarning || false);
    setPriceHikeNote(sub.priceHikeNote || '');
    setShowAddModal(true);
  };

  const handleSaveSub = (e) => {
    e.preventDefault();
    const fullAmt = parseFloat(amount);
    if (!name.trim() || isNaN(fullAmt)) return;

    let ourShare = fullAmt;
    let partnerInfo = '';

    if (sharingType === 'SPLIT_50_50') {
      ourShare = parseFloat((fullAmt / 2).toFixed(2));
      partnerInfo = sharePartner || 'พี่แพร (หารคนละครึ่ง)';
    } else if (sharingType === 'FAMILY_SHARE') {
      const count = parseInt(shareMembersCount) || 6;
      ourShare = parseFloat((fullAmt / count).toFixed(2));
      partnerInfo = `เก็บคนละ ฿67 x ${count - 1} คน (+฿${(67 * (count - 1)).toLocaleString()}) เราจ่าย ฿${ourShare.toFixed(2)}`;
    }

    let updatedSubs = [...subscriptions];
    if (editingSub) {
      updatedSubs = updatedSubs.map(s => {
        if (s.id === editingSub.id) {
          return {
            ...s,
            name,
            fullAmount: fullAmt,
            ourShareAmount: ourShare,
            sharingType,
            partnerOrMembers: partnerInfo,
            shareMembersCount: parseInt(shareMembersCount) || 6,
            paymentMethod,
            category,
            nextBillingDate,
            hasPriceHikeWarning,
            priceHikeNote
          };
        }
        return s;
      });
    } else {
      const newSub = {
        id: `SUB-${Date.now().toString().slice(-4)}`,
        name,
        fullAmount: fullAmt,
        ourShareAmount: ourShare,
        sharingType,
        partnerOrMembers: partnerInfo,
        shareMembersCount: parseInt(shareMembersCount) || 6,
        paymentMethod,
        category,
        status: 'ACTIVE',
        nextBillingDate,
        hasPriceHikeWarning,
        priceHikeNote
      };
      updatedSubs.push(newSub);
    }

    let nextData = { ...sotData, subscriptions: updatedSubs };
    nextData = addAuditEvent(nextData, 'SUBSCRIPTION', editingSub ? editingSub.id : 'NEW_SUB', editingSub ? 'SUB_UPDATED' : 'SUB_CREATED', {
      name,
      fullAmount: fullAmt,
      ourShare
    });

    updateSOTData(nextData);
    setShowAddModal(false);
    setEditingSub(null);
  };

  const handleDeleteSub = (subId) => {
    if (!window.confirm('ต้องการลบรายการ Subscription นี้ใช่หรือไม่?')) return;
    const updatedSubs = subscriptions.filter(s => s.id !== subId);
    let nextData = { ...sotData, subscriptions: updatedSubs };
    nextData = addAuditEvent(nextData, 'SUBSCRIPTION', subId, 'SUB_DELETED');
    updateSOTData(nextData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner Summary */}
      <div className="glass-panel glass-panel-glow-cyan" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Tv size={22} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                ศูนย์รวมค่าบริการรายเดือน & Subscription (Digital Subscriptions)
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              จัดการ YouTube Premium แฟมิลี่, Google One, Netflix หารพี่แพร, CapCut Pro พร้อมระบบเตือนยกเลิก
            </p>
          </div>

          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} /> เพิ่ม Subscription ใหม่
          </button>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ยอดเรียกเก็บเต็มจำนวนรวมทุกแอป</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', margin: '4px 0' }}>
              ฿{totalFullCost.toLocaleString()}/ด.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ทั้งหมด {subscriptions.length} บริการ</div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>ภาระที่เราต้องจ่ายจริงสุทธิ</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-emerald)', margin: '4px 0' }}>
              ฿{totalOurCost.toLocaleString()}/ด.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>หลังหักส่วนที่แชร์และหารกับคนอื่น</div>
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)' }}>ยอดเก็บคืนจากเพื่อน/พี่แพร</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-purple)', margin: '4px 0' }}>
              ฿{totalRecoveredFromOthers.toLocaleString()}/ด.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ช่วยประหยัดเงินในกระเป๋า</div>
          </div>

        </div>
      </div>

      {/* Monthly Billing Timeline Calendar */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Calendar size={20} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
            📅 ปฏิทินไทม์ไลน์วันตัดรอบบิลในแต่ละเดือน (Monthly Billing Timeline)
          </h3>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          แอปแต่ละตัวจะตัดเงินในวันที่ไม่เหมือนกัน ระบบเรียงลำดับวันตัดรอบและช่องทางการจ่ายเงินไว้ให้ดังนี้:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--accent-cyan)' }}>📅 วันที่ 5</strong>
              <span className="badge badge-purple">Family Share</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>YouTube Premium Family</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>
              ราคาเต็ม ฿399 (เก็บ 5 คน x ฿67 = ฿335) <b>เราจ่ายจริง ฿64</b>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              💳 ตัดผ่าน: SPayLater / เดบิตกสิกร
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--accent-purple)' }}>📅 วันที่ 12</strong>
              <span className="badge badge-cyan">AI Pro</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>Google One AI Premium</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              จ่ายเดี่ยว <b>฿189.00 / เดือน</b> (Gemini Advanced 2TB)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              💳 ตัดผ่าน: ShopeePay Order - Google
            </div>
          </div>

          <div style={{ background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--accent-rose)' }}>📅 วันที่ 15</strong>
              <span className="badge badge-rose">⚠️ ระวังราคาปรับ</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>CapCut Pro</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', marginTop: '4px' }}>
              เดือนนี้โปร <b>฿29</b> (เตือนกดยกเลิกก่อนตัด ฿289 เดือนหน้า)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              💳 ตัดผ่าน: ShopeePay Google Play
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--accent-emerald)' }}>📅 วันที่ 20</strong>
              <span className="badge badge-emerald">หารพี่แพร 50/50</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>Netflix 4K UHD</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>
              ราคาเต็ม ฿518 (พี่แพรหาร ฿259) <b>เราจ่ายจริง ฿259</b>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              💳 ตัดผ่าน: กสิกรเดบิต / ซิงค์ Family Hub
            </div>
          </div>

        </div>
      </div>

      {/* Subscription Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {subscriptions.map(sub => (
          <div 
            key={sub.id} 
            className="glass-panel" 
            style={{ 
              padding: '20px', 
              border: sub.hasPriceHikeWarning ? '1px solid rgba(244, 63, 94, 0.5)' : '1px solid var(--border-subtle)',
              position: 'relative'
            }}
          >
            {/* Warning badge if price hike */}
            {sub.hasPriceHikeWarning && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BellRing size={14} /> {sub.priceHikeNote}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                  {sub.category}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  onClick={() => handleOpenEdit(sub)}
                  title="แก้ไขรายการ"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <Edit3 size={14} />
                </button>
                <button 
                  onClick={() => handleDeleteSub(sub.id)}
                  title="ลบรายการ"
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '4px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
              {sub.name}
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '12px 0 8px 0' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ราคาเต็ม</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', textDecoration: sub.sharingType !== 'ALONE' ? 'line-through' : 'none' }}>
                  ฿{sub.fullAmount.toLocaleString()}/ด.
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>เราจ่ายจริง</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  ฿{sub.ourShareAmount.toLocaleString()}<span style={{ fontSize: '0.8rem', fontWeight: 400 }}>/ด.</span>
                </div>
              </div>
            </div>

            {/* Sharing pill / note */}
            {sub.partnerOrMembers && (
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--accent-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} /> {sub.partnerOrMembers}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>ช่องทางตัดเงิน: <b>{sub.paymentMethod}</b></span>
              {sub.nextBillingDate && <span>ตัดรอบ: {sub.nextBillingDate}</span>}
            </div>

          </div>
        ))}
      </div>

      {/* Add / Edit Subscription Modal */}
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', border: '1px solid var(--border-glow)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
              {editingSub ? '✏️ แก้ไข Subscription' : '➕ เพิ่ม Subscription ใหม่'}
            </h3>

            <form onSubmit={handleSaveSub} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ชื่อบริการ / แอป
                </label>
                <input
                  type="text"
                  placeholder="เช่น Spotify Family / iCloud 200GB"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ราคาเต็มต่อเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="399"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    รูปแบบการแชร์ / หาร
                  </label>
                  <select
                    value={sharingType}
                    onChange={(e) => setSharingType(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="ALONE">จ่ายคนเดียวเต็มจำนวน</option>
                    <option value="SPLIT_50_50">หารคนละครึ่ง (เช่น กับพี่แพร)</option>
                    <option value="FAMILY_SHARE">แชร์แบบบ้าน / แฟมิลี่ (หลายคน)</option>
                  </select>
                </div>
              </div>

              {sharingType === 'FAMILY_SHARE' && (
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    จำนวนคนในตี้ทั้งหมด (รวมเรา)
                  </label>
                  <input
                    type="number"
                    value={shareMembersCount}
                    onChange={(e) => setShareMembersCount(e.target.value)}
                    placeholder="6"
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    ช่องทางตัดเงิน
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Shopee SPayLater / กสิกรเดบิต"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    หมวดหมู่
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  >
                    <option value="ENTERTAINMENT">บันเทิง / สตรีมมิ่ง</option>
                    <option value="PRODUCTIVITY">AI / การทำงาน</option>
                    <option value="CREATIVE">ตัดต่อ / กราฟิก</option>
                    <option value="CLOUD">Cloud / Storage</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  วันที่ตัดรอบบิลถัดไป (Next Billing Date)
                </label>
                <input
                  type="date"
                  value={nextBillingDate}
                  onChange={(e) => setNextBillingDate(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                />
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    id="warnCheck"
                    checked={hasPriceHikeWarning}
                    onChange={(e) => setHasPriceHikeWarning(e.target.checked)}
                  />
                  <label htmlFor="warnCheck" style={{ fontSize: '0.85rem', color: 'var(--accent-rose)', cursor: 'pointer', fontWeight: 600 }}>
                    ตั้งเตือนยกเลิกก่อนขึ้นราคา (Cancel Reminder)
                  </label>
                </div>
                {hasPriceHikeWarning && (
                  <input
                    type="text"
                    placeholder="เช่น เดือนนี้ ฿29 เดือนหน้าราคาเต็ม ฿289 ให้กดยกเลิกก่อนวันที่ 14"
                    value={priceHikeNote}
                    onChange={(e) => setPriceHikeNote(e.target.value)}
                    style={{ width: '100%', padding: '8px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  บันทึก Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
