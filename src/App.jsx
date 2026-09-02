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
  Loader2,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  Zap,
  Activity
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
import SyncConflictModal from './components/SyncConflictModal';
import CashflowSimulatorView from './components/CashflowSimulatorView';
import GeminiSettingsModal from './components/GeminiSettingsModal';

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
  const [showGeminiSettingsModal, setShowGeminiSettingsModal] = useState(false);
  const [conflictData, setConflictData] = useState(null); // { local, cloud }
  const [confirmInput, setConfirmInput] = useState('');
  const [resetMode, setResetMode] = useState('ZERO'); // 'ZERO' or 'SOT_DEFAULT'
  const [cloudStatus, setCloudStatus] = useState('connecting'); // 'connecting' | 'synced' | 'syncing' | 'error'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Sidebar Layout state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const NAV_GROUPS = [
    {
      title: 'ศูนย์จัดการเงิน (Core Hub)',
      items: [
        { id: 'pipeline', label: 'ปล่อยของ & ปรึกษา', icon: <Layers size={18} className="nav-icon" />, badge: 'AI' },
        { id: 'accounts', label: 'จัดการกระเป๋าเงิน', icon: <Wallet size={18} className="nav-icon" /> },
        { id: 'debts', label: 'หนี้สิน & ผ่อนของ', icon: <CreditCard size={18} className="nav-icon" /> },
        { id: 'scanner', label: 'สแกนสลิป & บิล', icon: <Receipt size={18} className="nav-icon" />, badge: 'OCR' }
      ]
    },
    {
      title: 'โค้ช & วางแผน (Coach & Goals)',
      items: [
        { id: 'coach', label: 'The Money Coach', icon: <TrendingUp size={18} className="nav-icon" />, badge: 'Coach' },
        { id: 'cashflow', label: 'จำลองเงินสด 90 วัน', icon: <Sparkles size={18} className="nav-icon" />, badge: '30-90D' },
        { id: 'goals', label: 'เป้าหมายการเงิน', icon: <Target size={18} className="nav-icon" /> },
        { id: 'networth', label: 'สรุปความมั่งคั่ง', icon: <Activity size={18} className="nav-icon" /> }
      ]
    },
    {
      title: 'ครอบครัว & บริการ (Life & Family)',
      items: [
        { id: 'family', label: 'เคลียร์บิลครอบครัว', icon: <Users size={18} className="nav-icon" /> },
        { id: 'subs', label: 'สมาชิกรายเดือน', icon: <Tv size={18} className="nav-icon" /> },
        { id: 'scaffold', label: 'เอกสารระบบ', icon: <FileCode2 size={18} className="nav-icon" /> }
      ]
    }
  ];

  // Manual & Initial Sync with Supabase Cloud (with Conflict Guard)
  const handleCloudSync = useCallback(async (silent = false) => {
    if (!silent) setCloudStatus('syncing');
    const res = await fetchCloudSOTData();
    if (res.success && res.data) {
      const localCurrent = loadSOTData();
      
      // Compare local accounts vs cloud accounts
      const localStr = JSON.stringify(localCurrent.accounts || []);
      const cloudStr = JSON.stringify(res.data.accounts || []);
      const hasResolvedSession = sessionStorage.getItem('PF_CONFLICT_RESOLVED_SESSION');

      if (!hasResolvedSession && localStr !== cloudStr && (localCurrent.accounts?.length > 0)) {
        setConflictData({ local: localCurrent, cloud: res.data });
        setCloudStatus('synced');
      } else {
        setSotData(res.data);
        setCloudStatus('synced');
        setLastSyncTime(new Date());
      }
    } else {
      console.warn('Cloud sync issue:', res.error);
      setCloudStatus('error');
    }
  }, []);

  const handleResolveUsingLocal = async () => {
    if (!conflictData) return;
    sessionStorage.setItem('PF_CONFLICT_RESOLVED_SESSION', 'true');
    setSotData(conflictData.local);
    setCloudStatus('syncing');
    saveSOTData(conflictData.local);
    const res = await pushCloudSOTData(conflictData.local);
    setConflictData(null);
    if (res.success) {
      setCloudStatus('synced');
      setLastSyncTime(new Date());
      toast('☁️ บันทึกข้อมูลเครื่องนี้ขึ้น Cloud เรียบร้อยแล้ว!', { type: 'success' });
    }
  };

  const handleResolveUsingCloud = () => {
    if (!conflictData) return;
    sessionStorage.setItem('PF_CONFLICT_RESOLVED_SESSION', 'true');
    setSotData(conflictData.cloud);
    saveSOTData(conflictData.cloud);
    setConflictData(null);
    setCloudStatus('synced');
    setLastSyncTime(new Date());
    toast('📥 โหลดข้อมูลจาก Cloud มาใส่เครื่องนี้เรียบร้อยแล้ว!', { type: 'success' });
  };

  // Initial cloud fetch on mount and listen to realtime changes
  useEffect(() => {
    handleCloudSync(false);

    // Subscribe to Realtime Postgres updates across devices
    const unsubscribe = subscribeToCloudUpdates((newCloudData) => {
      // Only auto-update if not in the middle of resolving conflict
      setConflictData((currentConflict) => {
        if (!currentConflict) {
          setSotData(newCloudData);
          setCloudStatus('synced');
          setLastSyncTime(new Date());
        }
        return currentConflict;
      });
    });

    // Listen to network status (online / offline)
    const handleOnline = () => {
      toast('🌐 เชื่อมต่ออินเทอร์เน็ตแล้ว ระบบกำลังเชื่อมต่อ Cloud...', { type: 'info' });
      handleCloudSync(true);
    };
    const handleOffline = () => {
      setCloudStatus('error');
      toast('📡 ออฟไลน์: บันทึกข้อมูลลงเครื่องชั่วคราว', { type: 'warning' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleCloudSync, toast]);

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
      toast('🔄 รีเซ็ตข้อมูลระบบกลับเป็นค่าตั้งต้นเรียบร้อยแล้ว!', { type: 'success' });
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

  // Active tab helper
  const allTabs = NAV_GROUPS.flatMap(g => g.items);
  const activeTabMeta = allTabs.find(t => t.id === activeTab) || allTabs[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-primary)' }}>
      
      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 998
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        
        {/* Brand Header */}
        <div style={{
          padding: isSidebarCollapsed ? '16px 10px' : '20px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #059669, #06b6d4)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
              flexShrink: 0
            }}>
              <Bot size={22} color="#fff" />
            </div>

            {!isSidebarCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                    สมหมาย
                  </span>
                  <span className="badge badge-emerald" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                    SOMMAI
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  เลขาการเงิน & ผู้จัดการความมั่งคั่ง
                </span>
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <button 
              onClick={() => setIsSidebarCollapsed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'var(--radius-sm)'
              }}
              title="ย่อแถบเมนู"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Collapsed Expand Toggle Button */}
        {isSidebarCollapsed && (
          <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={() => setIsSidebarCollapsed(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px'
              }}
              title="ขยายแถบเมนู"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Navigation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '8px' }}>
              {!isSidebarCollapsed && (
                <div className="sidebar-group-title">
                  {group.title}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {group.items.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      title={isSidebarCollapsed ? item.label : undefined}
                      style={{
                        justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                        padding: isSidebarCollapsed ? '12px 0' : '10px 14px'
                      }}
                    >
                      {item.icon}
                      {!isSidebarCollapsed && (
                        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                      )}
                      {!isSidebarCollapsed && item.badge && (
                        <span 
                          className={`badge ${isActive ? 'badge-cyan' : ''}`}
                          style={{
                            fontSize: '0.62rem',
                            padding: '2px 6px',
                            background: isActive ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                            border: 'none'
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Controls */}
        <div style={{
          padding: isSidebarCollapsed ? '12px 8px' : '16px 14px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          {/* Cloud Sync Capsule */}
          <div 
            onClick={() => setShowCloudModal(true)}
            title="คลิกเพื่อจัดการ Cloud Sync & กู้คืนข้อมูล"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              background: cloudStatus === 'synced' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(6, 182, 212, 0.12)',
              border: `1px solid ${cloudStatus === 'synced' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
              color: cloudStatus === 'synced' ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
              transition: 'all 0.2s ease'
            }}
          >
            {cloudStatus === 'synced' && <CheckCircle2 size={15} />}
            {cloudStatus === 'syncing' && <Loader2 size={15} className="spin-slow" />}
            {cloudStatus === 'error' && <AlertCircle size={15} color="var(--accent-rose)" />}
            {!isSidebarCollapsed && (
              <span style={{ fontWeight: 600, flex: 1, whiteSpace: 'nowrap' }}>
                {cloudStatus === 'synced' && 'Cloud ซิงค์แล้ว'}
                {cloudStatus === 'syncing' && 'กำลังซิงค์...'}
                {cloudStatus === 'error' && 'Cloud ออฟไลน์'}
              </span>
            )}
          </div>

          {/* Quick Reset */}
          {!isSidebarCollapsed ? (
            <button 
              onClick={() => setShowResetModal(true)}
              style={{
                background: 'rgba(244, 63, 94, 0.06)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                color: 'var(--accent-rose)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%'
              }}
            >
              <RotateCcw size={12} /> รีเซ็ตข้อมูลระบบ...
            </button>
          ) : (
            <button 
              onClick={() => setShowResetModal(true)}
              title="รีเซ็ตข้อมูลระบบ"
              style={{
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                color: 'var(--accent-rose)',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

      </aside>

      {/* Main Workspace (Right Side) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        
        {/* Top Floating App Bar */}
        <header className="glass-panel" style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          padding: '12px 24px',
          background: 'rgba(10, 15, 26, 0.85)'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            
            {/* Left: Mobile Toggle & Page Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button 
                onClick={() => setIsMobileSidebarOpen(true)}
                className="btn btn-outline"
                style={{ display: 'none', padding: '6px 10px' }}
                id="mobile-menu-btn"
              >
                <Menu size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {activeTabMeta.icon}
                </div>
                <div>
                  <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    {activeTabMeta.label}
                  </h1>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    สมหมาย (Sommai Money) • เลขาการเงินส่วนตัว
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Realtime Financial Health Capsule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>เงินสดจริง: </span>
                  <strong style={{ color: 'var(--accent-cyan)' }}>฿{totalAssets.toLocaleString()}</strong>
                </div>
                <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }}></div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>หนี้ตัวเองจริง: </span>
                  <strong style={{ color: 'var(--accent-rose)' }}>฿{myTotalDebts.toLocaleString()}</strong>
                </div>
                <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }}></div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ความมั่งคั่งสุทธิ: </span>
                  <strong style={{ color: netWorth >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    ฿{netWorth.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Gemini AI Settings Quick Button */}
              <button
                onClick={() => setShowGeminiSettingsModal(true)}
                className="btn btn-secondary"
                title="ตั้งค่า Gemini Multimodal AI"
                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={14} color="var(--accent-purple)" />
                <span>AI Vision</span>
              </button>
            </div>

          </div>
        </header>

        {/* Dynamic Page Content */}
        <main style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '24px', flex: 1 }}>
          {activeTab === 'pipeline' && <PipelineView sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'coach' && <MonthlyHistoryAndCoach sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'cashflow' && <CashflowSimulatorView sotData={sotData} updateSOTData={updateSOTData} setActiveTab={setActiveTab} />}
          {activeTab === 'goals' && <GoalsAndAnalytics sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'family' && <FamilySettlementHub sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'subs' && <SubscriptionsManager sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'networth' && <NetWorthDashboard sotData={sotData} />}
          {activeTab === 'accounts' && <AccountsManager sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'debts' && <DebtTracker sotData={sotData} updateSOTData={updateSOTData} />}
          {activeTab === 'scanner' && <SlipScanner sotData={sotData} updateSOTData={updateSOTData} onOpenSettings={() => setShowGeminiSettingsModal(true)} />}
          {activeTab === 'scaffold' && <ScaffoldDocViewer />}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 24px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          สมหมาย (Sommai Money AI) • ระบบวางแผนการเงิน ล็อกบิลล่วงหน้า & บันทึกสลิปคลาวด์อัตโนมัติ
        </footer>

      </div>

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
                      🔄 2. รีเซ็ตกลับเป็นค่าเริ่มต้นระบบ (Default Template)
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      คืนค่ากระเป๋าเงินและรายการหนี้สินตามแม่แบบตั้งต้น (เงินเดือน ฿17,993 + หนี้ 10 รายการ)
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

      {/* Sync Conflict Guard Modal */}
      <SyncConflictModal
        isOpen={Boolean(conflictData)}
        localData={conflictData?.local}
        cloudData={conflictData?.cloud}
        onResolveUsingLocal={handleResolveUsingLocal}
        onResolveUsingCloud={handleResolveUsingCloud}
      />

      {/* Gemini AI Settings Modal */}
      <GeminiSettingsModal
        isOpen={showGeminiSettingsModal}
        onClose={() => setShowGeminiSettingsModal(false)}
      />

    </div>
  );
}
