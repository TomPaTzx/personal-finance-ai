import React from 'react';
import { 
  AlertTriangle, 
  Laptop, 
  Cloud, 
  ArrowRight, 
  CheckCircle2, 
  FileDown, 
  ShieldAlert 
} from 'lucide-react';
import { pushCloudSOTData, saveSOTData } from '../services/storageService';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function SyncConflictModal({ 
  isOpen, 
  localData, 
  cloudData, 
  onResolveUsingLocal, 
  onResolveUsingCloud 
}) {
  const { toast } = useModalNotification();

  if (!isOpen || !localData || !cloudData) return null;

  // Calculate quick metrics for Local
  const localCash = (localData.accounts || []).reduce((sum, a) => sum + (a.id !== 'SPAYLATER' ? (a.balance || 0) : 0), 0);
  const localDebtsCount = (localData.debts || []).length;
  const localBnplCount = (localData.bnplItems || []).length;

  // Calculate quick metrics for Cloud
  const cloudCash = (cloudData.accounts || []).reduce((sum, a) => sum + (a.id !== 'SPAYLATER' ? (a.balance || 0) : 0), 0);
  const cloudDebtsCount = (cloudData.debts || []).length;
  const cloudBnplCount = (cloudData.bnplItems || []).length;

  // Backup downloader helper
  const handleDownloadBothBackups = () => {
    try {
      const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      // Download Local Backup
      const localStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localData, null, 2));
      const aLocal = document.createElement('a');
      aLocal.setAttribute("href", localStr);
      aLocal.setAttribute("download", `local_machine_backup_${now}.json`);
      document.body.appendChild(aLocal);
      aLocal.click();
      aLocal.remove();

      // Download Cloud Backup
      setTimeout(() => {
        const cloudStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cloudData, null, 2));
        const aCloud = document.createElement('a');
        aCloud.setAttribute("href", cloudStr);
        aCloud.setAttribute("download", `cloud_server_backup_${now}.json`);
        document.body.appendChild(aCloud);
        aCloud.click();
        aCloud.remove();
      }, 500);

      toast('💾 ดาวน์โหลดไฟล์สำรองทั้ง 2 ชุดเรียบร้อยแล้ว!', { type: 'success' });
    } catch (e) {
      toast('⚠️ ดาวน์โหลดไฟล์สำรองไม่สำเร็จ', { type: 'error' });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 7, 13, 0.92)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '20px',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          padding: '30px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(20, 26, 43, 0.98), rgba(13, 18, 30, 0.99))',
          border: '2px solid var(--accent-amber)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 40px rgba(245, 158, 11, 0.25)',
          animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)'
          }}>
            <ShieldAlert size={26} color="var(--accent-amber)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
              ตรวจพบข้อมูลในเครื่องนี้ไม่ตรงกับบน Cloud (Conflict Guard)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              เพื่อป้องกันข้อมูลสูญหาย กรุณาเลือกว่าต้องการยึดข้อมูลจากฝั่งไหนเป็นหลัก
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '22px' }}>
          
          {/* Local Card */}
          <div style={{
            background: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
              <Laptop size={18} />
              <strong style={{ fontSize: '0.95rem' }}>🖥️ ข้อมูลที่มีอยู่ในเครื่องนี้ (Local)</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>เงินสดรวม:</span>
                <strong style={{ color: '#fff' }}>฿{localCash.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>รายการหนี้สิน:</span>
                <span style={{ color: '#fff' }}>{localDebtsCount} รายการ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>รายการช้อป SPay:</span>
                <span style={{ color: '#fff' }}>{localBnplCount} รายการ</span>
              </div>
            </div>

            <button
              onClick={onResolveUsingLocal}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginTop: '6px'
              }}
            >
              ⬆️ ใช้ข้อมูลเครื่องนี้ (ส่งขึ้น Cloud)
            </button>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              (เหมาะสำหรับเครื่องที่ทำงานที่มีตัวเลขล่าสุด)
            </span>
          </div>

          {/* Cloud Card */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)' }}>
              <Cloud size={18} />
              <strong style={{ fontSize: '0.95rem' }}>☁️ ข้อมูลที่อยู่บน Cloud (Supabase)</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>เงินสดรวม:</span>
                <strong style={{ color: '#fff' }}>฿{cloudCash.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>รายการหนี้สิน:</span>
                <span style={{ color: '#fff' }}>{cloudDebtsCount} รายการ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>รายการช้อป SPay:</span>
                <span style={{ color: '#fff' }}>{cloudBnplCount} รายการ</span>
              </div>
            </div>

            <button
              onClick={onResolveUsingCloud}
              className="btn btn-success"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginTop: '6px'
              }}
            >
              ⬇️ ใช้ข้อมูลบน Cloud (ทับเครื่องนี้)
            </button>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              (เหมาะสำหรับเครื่องใหม่ที่ต้องการดึงค่าจาก Cloud)
            </span>
          </div>

        </div>

        {/* Safety Backup Option */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            💡 หากไม่แน่ใจ สามารถกดดาวน์โหลด Backup ไฟล์ทั้งสองชุดไว้ก่อนได้ครับ
          </span>

          <button
            type="button"
            onClick={handleDownloadBothBackups}
            className="btn btn-outline"
            style={{
              fontSize: '0.78rem',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileDown size={14} /> ดาวน์โหลด Backup ทั้ง 2 ฝั่ง (.json)
          </button>
        </div>

      </div>
    </div>
  );
}
