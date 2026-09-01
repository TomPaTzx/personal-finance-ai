import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Layers, 
  Wallet, 
  CreditCard, 
  Receipt, 
  TrendingUp, 
  FileCode2, 
  Sparkles,
  RefreshCw,
  Users,
  Tv,
  AlertTriangle,
  RotateCcw,
  Target,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

import PipelineView from './components/PipelineView';
import AccountsManager from './components/AccountsManager';
import DebtTracker from './components/DebtTracker';
import SlipScanner from './components/SlipScanner';
import NetWorthDashboard from './components/NetWorthDashboard';
import ScaffoldDocViewer from './components/ScaffoldDocViewer';
import FamilySettlementHub from './components/FamilySettlementHub';
import SubscriptionsManager from './components/SubscriptionsManager';
import GoalsAndAnalytics from './components/GoalsAndAnalytics';
import MonthlyHistoryAndCoach from './components/MonthlyHistoryAndCoach';
import CloudSyncModal from './components/CloudSyncModal';

import { 
  loadSOTData, 
  saveSOTData, 
  INITIAL_DATA, 
  createZeroedData,
  fetchCloudSOTData,
  pushCloudSOTData,
  subscribeToCloudUpdates
} from './services/storageService';
import { useModalNotification } from './context/ModalNotificationContext';

export default function App() {
  const { alert: modalAlert, toast } = useModalNotification();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [sotData, setSotData] = useState(() => loadSOTData());
  const [showResetModal, setShowResetModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [resetMode, setResetMode] = useState('ZERO'); // 'ZERO' or 'SOT_DEFAULT'
  const [cloudStatus, setCloudStatus] = useState('connecting'); // 'connecting' | 'synced' | 'syncing' | 'error'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Manual & Initial Sync with Supabase Cloud
  const handleCloudSync = useCallback(async (silent = false) => {
    if (!silent) setCloudStatus('syncing');
    const res = await fetchCloudSOTData();
    if (res.success && res.data) {
      setSotData(res.data);
      setCloudStatus('synced');
      setLastSyncTime(new Date());
    } else {
      console.warn('Cloud sync issue:', res.error);
      setCloudStatus('error');
    }
  }, []);

  // Initial cloud fetch on mount and listen to realtime changes
  useEffect(() => {
    handleCloudSync(false);

    // Subscribe to Realtime Postgres updates across devices
    const unsubscribe = subscribeToCloudUpdates((newCloudData) => {
      setSotData(newCloudData);
      setCloudStatus('synced');
      setLastSyncTime(new Date());
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [handleCloudSync]);

  // Sync state changes to localStorage and Supabase Cloud
  const updateSOTData = async (newData) => {
    setSotData(newData);
    setCloudStatus('syncing');
    saveSOTData(newData);
    const res = await pushCloudSOTData(newData);
    if (res.success) {
      setCloudStatus('synced');
      setLastSyncTime(new Date());
    } else {
      setCloudStatus('error');
    }
  };

  const handleExecuteReset = async (e) => {
    e.preventDefault();
    if (confirmInput.trim().toUpperCase() !== 'RESET') {
      await modalAlert({
        title: 'ยืนยันไม่ถูกต้อง',
        message: 'กรุณาพิมพ์คำว่า RESET ให้ถูกต้องเพื่อยืนยันการล้างข้อมูล',
        variant: 'warning'
      });
      return;
    }

    if (resetMode === 'ZERO') {
      const zeroData = createZeroedData();
      await updateSOTData(zeroData);
      toast('🧹 รีเซ็ตยอดเงินในทุกบัญชีกลับเป็น 0.00 บาท และล้างรายการหนี้สินเรียบร้อยแล้ว!', { type: 'success' });
    } else {
      await updateSOTData(INITIAL_DATA);
      toast('🔄 รีเซ็ตข้อมูลระบบกลับเป็นค่าตั้งต้น SOT.md เรียบร้อยแล้ว!', { type: 'success' });
    }

    setShowResetModal(false);
    setConfirmInput('');
  };

  // Only count liquid assets (exclude credit lines)
  const totalAssets = (sotData.accounts || []).reduce((sum, a) => sum + (a.id !== 'SPAYLATER' ? (a.balance || 0) : 0), 0);
  
  // Separate Personal Debt vs Others Debt
  const myDebts = (sotData.debts || []).filter(d => d.owner === 'ตัวเอง' || d.owner === 'บ้าน');
  const myTotalDebts = myDebts.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
  
  // Real Personal Net Worth
  const netWorth = totalAssets - myTotalDebts;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navigation Bar */}
      <header className="glass-panel" style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        borderRadius: 0, 
        borderTop: 'none', 
        borderLeft: 'none', 
        borderRight: 'none',
        padding: '12px 24px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Logo & Assistant Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #0284c7, #06b6d4)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)'
            }}>
              <Bot size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                  JASON
                </span>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                  AI Financial 1st AD
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Personal Finance & Decision Pipeline
              </div>
            </div>
          </div>

          {/* Quick Metrics Capsule */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', background: 'rgba(0, 0, 0, 0.3)', padding: '6px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>เงินสดจริง: </span>
              <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>฿{totalAssets.toLocaleString()}</strong>
            </div>
            <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }}></div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>หนี้ตัวเองจริง: </span>
              <strong style={{ color: 'var(--accent-rose)', fontSize: '0.85rem' }}>฿{myTotalDebts.toLocaleString()}</strong>
            </div>
            <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }}></div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ความมั่งคั่งสุทธิ: </span>
              <strong style={{ color: netWorth >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontSize: '0.85rem' }}>
                ฿{netWorth.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Cloud Sync Status & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            {/* Cloud Status Indicator & Quick Manager */}
            <div 
              onClick={() => setShowCloudModal(true)}
              title="คลิกเพื่อเปิดศูนย์จัดการ Cloud Sync & กู้คืนข้อมูล"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                background: cloudStatus === 'synced' 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : cloudStatus === 'syncing' || cloudStatus === 'connecting'
                    ? 'rgba(6, 182, 212, 0.1)' 
                    : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${
                  cloudStatus === 'synced' 
                    ? 'rgba(16, 185, 129, 0.3)' 
                    : cloudStatus === 'syncing' || cloudStatus === 'connecting'
                      ? 'rgba(6, 182, 212, 0.3)' 
                      : 'rgba(244, 63, 94, 0.3)'
                }`,
                color: cloudStatus === 'synced' 
                  ? 'var(--accent-emerald)' 
                  : cloudStatus === 'syncing' || cloudStatus === 'connecting'
                    ? 'var(--accent-cyan)' 
                    : 'var(--accent-rose)',
                transition: 'all 0.2s ease'
              }}
            >
              {cloudStatus === 'synced' && <CheckCircle2 size={13} />}
              {(cloudStatus === 'syncing' || cloudStatus === 'connecting') && <Loader2 size={13} className="spin-slow" />}
              {cloudStatus === 'error' && <AlertCircle size={13} />}
              
              <span style={{ fontWeight: 600 }}>
                {cloudStatus === 'synced' && '☁️ Cloud ซิงค์แล้ว (จัดการ)'}
                {cloudStatus === 'syncing' && '☁️ กำลังซิงค์...'}
                {cloudStatus === 'connecting' && '☁️ กำลังเชื่อมต่อ...'}
                {cloudStatus === 'error' && '⚠️ Cloud ออฟไลน์'}
              </span>
            </div>

            {/* Reset Action Button with Safety Warning */}
            <button 
              onClick={() => setShowResetModal(true)}
              title="ล้างข้อมูลระบบ / รีเซ็ตค่าเริ่มต้น"
              style={{
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                color: 'var(--accent-rose)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={13} /> รีเซ็ตข้อมูล...
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Navigation Tabs Bar */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          {[
            { id: 'pipeline', label: '🚀 ปล่อยของ & วิเคราะห์ (Pipeline)', icon: <Layers size={18} /> },
            { id: 'coach', label: '📜 ปิดงบย้อนหลัง & Money Coach', icon: <TrendingUp size={18} /> },
            { id: 'goals', label: '🎯 เป้าหมาย & วิเคราะห์หมวดรายจ่าย (Goals)', icon: <Target size={18} /> },
            { id: 'family', label: '👨‍👩‍👧‍👦 เคลียร์บิลครอบครัว (แม่/พี่แพร/แจง)', icon: <Users size={18} /> },
            { id: 'subs', label: '📺 สมาชิกรายเดือน (Subscriptions)', icon: <Tv size={18} /> },
            { id: 'networth', label: '📊 แดชบอร์ดความมั่งคั่ง (Net Worth)', icon: <TrendingUp size={18} /> },
            { id: 'accounts', label: '💳 จัดการกระเป๋าเงิน (Accounts)', icon: <Wallet size={18} /> },
            { id: 'debts', label: '🛍️ หนี้สิน & ผ่อนรายชิ้น (Debt Tracker)', icon: <CreditCard size={18} /> },
            { id: 'scanner', label: '🧾 สแกนสลิป / ใบเสร็จ (Slip OCR)', icon: <Receipt size={18} /> },
            { id: 'scaffold', label: '📚 Memory Scaffold (8 เอกสาร)', icon: <FileCode2 size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Rendering */}
        <main style={{ marginTop: '8px' }}>
          {activeTab === 'pipeline' && <PipelineView sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'coach' && <MonthlyHistoryAndCoach sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'goals' && <GoalsAndAnalytics sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'family' && <FamilySettlementHub sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'subs' && <SubscriptionsManager sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'networth' && <NetWorthDashboard sotData={sotData} />}
          {activeTab === 'accounts' && <AccountsManager sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'debts' && <DebtTracker sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'scanner' && <SlipScanner sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'scaffold' && <ScaffoldDocViewer />}
        </main>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Personal Finance AI Consultant • Armed with 8-Doc Memory Scaffold & Dual Advisor Engine
      </footer>

      {/* Accidental Reset Prevention Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', border: '2px solid var(--accent-rose)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: 'var(--accent-rose)' }}>
              <AlertTriangle size={28} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                ยืนยันการรีเซ็ตข้อมูลระบบ
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: '1.5' }}>
              เพื่อป้องกันการเผลอกดรีเซ็ตโดยไม่ตั้งใจ กรุณาเลือกรูปแบบการรีเซ็ตและพิมพ์ยืนยันด้านล่าง:
            </p>

            <form onSubmit={handleExecuteReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  background: resetMode === 'ZERO' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: resetMode === 'ZERO' ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="resetMode"
                    value="ZERO"
                    checked={resetMode === 'ZERO'}
                    onChange={() => setResetMode('ZERO')}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'block' }}>
                      🧹 1. รีเซ็ตยอดเงินเป็น 0.00 บาททั้งหมด (เริ่มนับ 0 ใหม่)
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      ตั้งยอดคงเหลือในทุกกระเป๋าเป็น ฿0.00 และล้างรายการหนี้สินทั้งหมดเพื่อเริ่มจดใหม่จากศูนย์
                    </span>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  background: resetMode === 'SOT_DEFAULT' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: resetMode === 'SOT_DEFAULT' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="resetMode"
                    value="SOT_DEFAULT"
                    checked={resetMode === 'SOT_DEFAULT'}
                    onChange={() => setResetMode('SOT_DEFAULT')}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'block' }}>
                      🔄 2. รีเซ็ตกลับเป็นค่าตั้งต้น SOT.md
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      รีเซ็ตกลับเป็นค่าเริ่มต้นตามสลิปและข้อมูล SOT (เงินเดือน ฿17,993 + หนี้ 10 รายการ)
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  พิมพ์คำว่า <b style={{ color: 'var(--accent-rose)' }}>RESET</b> เพื่อยืนยันการล้างข้อมูล:
                </label>
                <input
                  type="text"
                  placeholder="พิมพ์ RESET ที่นี่..."
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid var(--border-glow)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    fontSize: '1rem',
                    letterSpacing: '2px',
                    textAlign: 'center',
                    fontWeight: 700
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowResetModal(false); setConfirmInput(''); }} 
                  className="btn btn-outline"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={confirmInput.trim().toUpperCase() !== 'RESET'}
                  className="btn btn-danger"
                  style={{ opacity: confirmInput.trim().toUpperCase() === 'RESET' ? 1 : 0.4 }}
                >
                  ยืนยันการรีเซ็ต
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Cloud Sync & Backup Manager Modal */}
      <CloudSyncModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        sotData={sotData}
        updateSOTData={updateSOTData}
        cloudStatus={cloudStatus}
        lastSyncTime={lastSyncTime}
        onRefreshCloud={handleCloudSync}
      />

    </div>
  );
}
