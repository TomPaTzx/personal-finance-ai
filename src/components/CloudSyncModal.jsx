import React, { useState, useRef } from 'react';
import { 
  Cloud, 
  UploadCloud, 
  DownloadCloud, 
  FileDown, 
  FileUp, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Database,
  Smartphone,
  Laptop,
  HardDrive,
  Copy
} from 'lucide-react';
import { fetchCloudSOTData, pushCloudSOTData } from '../services/storageService';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function CloudSyncModal({ isOpen, onClose, sotData, updateSOTData, cloudStatus, lastSyncTime, onRefreshCloud }) {
  const { confirm: modalConfirm, toast } = useModalNotification();
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const fileInputRef = useRef(null);

  const handleCopyQuickSync = () => {
    try {
      const jsonStr = JSON.stringify(sotData);
      navigator.clipboard.writeText(jsonStr);
      toast('📋 คัดลอกโค้ดข้อมูลทั้งหมดเรียบร้อยแล้ว! ส่งเข้าไลน์แล้วนำไปวางในมือถือได้เลย', { type: 'success' });
    } catch (e) {
      toast('⚠️ คัดลอกไม่สำเร็จ', { type: 'error' });
    }
  };

  const handleApplyQuickSync = async () => {
    if (!syncCodeInput.trim()) {
      toast('⚠️ กรุณาวางโค้ดข้อมูลก่อนกดซิงค์', { type: 'error' });
      return;
    }
    try {
      const parsed = JSON.parse(syncCodeInput.trim());
      if (!parsed || !parsed.accounts) {
        toast('⚠️ โครงสร้างโค้ดไม่ถูกต้อง', { type: 'error' });
        return;
      }
      const ok = await modalConfirm({
        title: '📥 ยืนยันซิงค์ข้อมูลลงเครื่องนี้',
        message: 'ต้องการนำเข้าข้อมูลทั้งหมดและเขียนทับข้อมูลในเครื่องนี้ทันทีหรือไม่?',
        variant: 'success'
      });
      if (ok) {
        updateSOTData(parsed);
        toast('🎉 ซิงค์ข้อมูลทั้งหมดข้ามเครื่องสำเร็จแล้ว!', { type: 'success' });
        setSyncCodeInput('');
        onClose();
      }
    } catch (e) {
      toast('⚠️ โค้ดข้อมูลผิดพลาด ไม่สามารถอ่านได้ (กรุณาคัดลอกมาให้ครบ)', { type: 'error' });
    }
  };

  if (!isOpen) return null;

  // 1. Force Push Local to Cloud
  const handleForcePush = async () => {
    const ok = await modalConfirm({
      title: '⬆️ ส่งข้อมูลเครื่องนี้ขึ้น Cloud',
      message: 'ต้องการนำตัวเลขและข้อมูลทั้งหมดในเครื่องนี้ ไปบันทึกทับบน Supabase Cloud หรือไม่?\n\n(เครื่องอื่นและมือถือจะเปลี่ยนมาใช้ข้อมูลชุดนี้ทันที)',
      variant: 'primary',
      confirmText: 'ยืนยันอัปโหลดขึ้น Cloud',
      cancelText: 'ยกเลิก'
    });
    if (!ok) return;

    setIsPushing(true);
    const res = await pushCloudSOTData(sotData);
    setIsPushing(false);

    if (res.success) {
      toast('☁️ อัปโหลดข้อมูลเครื่องนี้ขึ้น Cloud สำเร็จแล้ว!', { type: 'success' });
      if (onRefreshCloud) onRefreshCloud(true);
    } else {
      toast(`⚠️ อัปโหลดไม่สำเร็จ: ${res.error}`, { type: 'error' });
    }
  };

  // 2. Force Pull from Cloud to Local
  const handleForcePull = async () => {
    const ok = await modalConfirm({
      title: '⬇️ ดึงข้อมูลจาก Cloud มาใส่เครื่องนี้',
      message: 'ต้องการดึงข้อมูลล่าสุดจาก Supabase Cloud มาแสดงบนเครื่องนี้หรือไม่?\n\n(ข้อมูลบนเครื่องนี้จะถูกอัปเดตให้ตรงกับ Cloud ล่าสุด)',
      variant: 'primary',
      confirmText: 'ยืนยันดึงข้อมูลจาก Cloud',
      cancelText: 'ยกเลิก'
    });
    if (!ok) return;

    setIsPulling(true);
    const res = await fetchCloudSOTData();
    setIsPulling(false);

    if (res.success && res.data) {
      updateSOTData(res.data);
      toast('📥 ดึงข้อมูลล่าสุดจาก Cloud เรียบร้อยแล้ว!', { type: 'success' });
      if (onRefreshCloud) onRefreshCloud(true);
      onClose();
    } else {
      toast(`⚠️ ดึงข้อมูลไม่สำเร็จ: ${res.error}`, { type: 'error' });
    }
  };

  // 3. Export JSON Backup
  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sotData, null, 2));
      const downloadAnchor = document.createElement('a');
      const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `personal_finance_backup_${now}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast('💾 ดาวน์โหลดไฟล์สำรอง .json เรียบร้อยแล้ว!', { type: 'success' });
    } catch (e) {
      toast('⚠️ ไม่สามารถส่งออกไฟล์ได้', { type: 'error' });
    }
  };

  // 4. Import JSON File
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || typeof parsed !== 'object' || !parsed.accounts) {
          toast('⚠️ ไฟล์ JSON ไม่ถูกต้องตามโครงสร้างระบบ', { type: 'error' });
          return;
        }

        const ok = await modalConfirm({
          title: '📂 ยืนยันนำเข้าข้อมูลจากไฟล์',
          message: `พบข้อมูลในไฟล์ ${file.name}\n\nต้องการนำเข้าข้อมูลชุดนี้ และส่งขึ้น Supabase Cloud ทันทีหรือไม่?`,
          variant: 'success',
          confirmText: 'ยืนยันนำเข้าข้อมูล',
          cancelText: 'ยกเลิก'
        });

        if (ok) {
          updateSOTData(parsed);
          await pushCloudSOTData(parsed);
          toast('🎉 นำเข้าข้อมูลและซิงค์ขึ้น Cloud เรียบร้อยแล้ว!', { type: 'success' });
          onClose();
        }
      } catch (err) {
        toast('⚠️ ไม่สามารถอ่านไฟล์ JSON ได้', { type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 7, 13, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(11, 17, 32, 0.98))',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(6, 182, 212, 0.2)',
          animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)'
            }}>
              <Cloud size={22} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                ศูนย์จัดการ Cloud Sync & สำรองข้อมูล
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                เชื่อมต่อ Supabase PostgreSQL (Singapore Region)
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: cloudStatus === 'synced' ? 'var(--accent-emerald)' : cloudStatus === 'error' ? 'var(--accent-rose)' : 'var(--accent-cyan)',
              boxShadow: `0 0 8px ${cloudStatus === 'synced' ? 'var(--accent-emerald)' : cloudStatus === 'error' ? 'var(--accent-rose)' : 'var(--accent-cyan)'}`
            }}></div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                {cloudStatus === 'synced' ? 'สถานะ: เชื่อมต่อ Cloud สำเร็จ 🟢' : cloudStatus === 'error' ? 'สถานะ: Supabase Cloud ออฟไลน์ 🔴' : 'สถานะ: กำลังเชื่อมต่อ... 🟡'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {cloudStatus === 'error' ? 'โปรเจกต์อาจถูกระงับ (Paused) ใน Supabase' : `ซิงค์ล่าสุด: ${lastSyncTime ? lastSyncTime.toLocaleTimeString('th-TH') : 'เมื่อเริ่มต้นระบบ'}`}
              </div>
            </div>
          </div>

          <button 
            onClick={() => onRefreshCloud && onRefreshCloud(false)}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
          >
            <RefreshCw size={13} /> รีเฟรชสถานะ
          </button>
        </div>

        {/* Offline Diagnostic Alert */}
        {cloudStatus === 'error' && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            marginBottom: '16px',
            fontSize: '0.8rem',
            color: '#fff',
            lineHeight: 1.5
          }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <AlertTriangle size={16} /> Supabase Cloud ออฟไลน์ (ข้อมูลจึงยังไม่วิ่งข้ามเครื่องอัตโนมัติ)
            </div>
            โปรเจกต์ฐานข้อมูล <code>neflzvrowmjkgixaejzt</code> บน Supabase อาจถูก Pause (โควตาฟรีหลัง 7 วัน) ทำให้คอมและมือถืออ่านข้อมูลเฉพาะในเครื่องตัวเอง<br/>
            👉 <strong>วิธีให้ตัวเลขตรงกันทันที:</strong> ใช้กล่อง <strong>"ซิงค์ด่วนข้ามเครื่องผ่านโค้ด"</strong> ด้านล่างเพื่อส่งข้อมูลจากคอมเข้ามือถือได้ทันที 100%!
          </div>
        )}

        {/* Quick Text Sync (Peer-to-Peer without Cloud) */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.05)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Copy size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                ⚡ ซิงค์ด่วนข้ามเครื่องผ่านโค้ด (Quick Text Sync)
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyQuickSync}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '5px 12px' }}
            >
              <Copy size={13} /> คัดลอกโค้ดข้อมูลเครื่องนี้
            </button>
          </div>

          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
            หาก Cloud ออฟไลน์: กดคัดลอกโค้ดจากคอม ➔ ส่งเข้าไลน์ ➔ แล้วนำมาวางในมือถือ ตัวเลขจะตรงกันทันที
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text"
              value={syncCodeInput}
              onChange={(e) => setSyncCodeInput(e.target.value)}
              placeholder="วางโค้ดข้อมูลที่คัดลอกมาจากอีกเครื่องที่นี่..."
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: '0.78rem'
              }}
            />
            <button
              type="button"
              onClick={handleApplyQuickSync}
              className="btn btn-success"
              style={{ fontSize: '0.78rem', padding: '8px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              📥 นำเข้าลงเครื่องนี้
            </button>
          </div>
        </div>

        {/* Device Sync Scenarios Guide */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          marginBottom: '20px'
        }}>
          💡 <strong>เคล็ดลับการย้ายเครื่อง (บ้าน ↔️ ที่ทำงาน):</strong>
          <ul style={{ paddingLeft: '18px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>หากแก้ตัวเลขที่เครื่องนี้แล้วอยากให้อีกเครื่องเห็นทันที กด <strong>"ส่งข้อมูลเครื่องนี้ขึ้น Cloud"</strong></li>
            <li>หากเปิดอีกเครื่องแล้วอยากดึงค่าล่าสุดจากเครื่องแรก กด <strong>"ดึงข้อมูลจาก Cloud มาใส่เครื่องนี้"</strong></li>
          </ul>
        </div>

        {/* Action Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          
          {/* Force Push */}
          <button
            onClick={handleForcePush}
            disabled={isPushing}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '6px',
              padding: '14px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.9rem' }}>
              <UploadCloud size={18} /> ⬆️ ส่งข้อมูลเครื่องนี้ขึ้น Cloud
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              นำข้อมูลล่าสุดในเครื่องนี้ ส่งไปบันทึกทับบน Cloud
            </span>
          </button>

          {/* Force Pull */}
          <button
            onClick={handleForcePull}
            disabled={isPulling}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '6px',
              padding: '14px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.9rem' }}>
              <DownloadCloud size={18} /> ⬇️ ดึงข้อมูลจาก Cloud มาเครื่องนี้
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ดึงตัวเลขและรายการจาก Cloud มาทับเครื่องนี้
            </span>
          </button>

          {/* Export JSON Backup */}
          <button
            onClick={handleExportBackup}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '6px',
              padding: '14px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-purple)', fontWeight: 700, fontSize: '0.9rem' }}>
              <FileDown size={18} /> 💾 ดาวน์โหลด Backup (.json)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              บันทึกไฟล์สำรองเก็บไว้ในเครื่อง เผื่อฉุกเฉิน
            </span>
          </button>

          {/* Import JSON File */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '6px',
              padding: '14px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-amber)', fontWeight: 700, fontSize: '0.9rem' }}>
              <FileUp size={18} /> 📂 นำเข้าไฟล์ Backup (.json)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              เลือกไฟล์สำรองจากเครื่องมาโหลดและซิงค์ทันที
            </span>
          </button>

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportFile} 
            accept=".json" 
            style={{ display: 'none' }} 
          />

        </div>

        {/* Footer Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '8px 24px' }}
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
