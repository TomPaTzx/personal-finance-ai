import React, { useState } from 'react';
import { UploadCloud, CheckCircle, Receipt, ArrowDownRight, Sparkles } from 'lucide-react';
import { simulateSlipOCR } from '../services/slipParserService';
import { addAuditEvent } from '../services/storageService';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function SlipScanner({ sotData, updateSOTData }) {
  const { toast } = useModalNotification();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('ACC-02');

  const handleSimulateUpload = () => {
    setIsScanning(true);
    setTimeout(() => {
      const res = simulateSlipOCR();
      setScannedResult(res.data);
      setIsScanning(false);
    }, 900);
  };

  const handleConfirmSlip = () => {
    if (!scannedResult) return;

    const amount = scannedResult.amount;

    // Deduce from selected account
    const updatedAccounts = sotData.accounts.map(acc => {
      if (acc.id === selectedAccount) {
        return {
          ...acc,
          balance: Math.max(0, acc.balance - amount),
          updatedAt: new Date().toISOString()
        };
      }
      return acc;
    });

    // Create transaction
    const newTx = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      accountId: selectedAccount,
      type: 'EXPENSE',
      amount,
      category: scannedResult.detectedCategory,
      note: `${scannedResult.merchant} (Slip Ref: ${scannedResult.bankRef})`,
      date: new Date().toISOString()
    };

    let nextData = {
      ...sotData,
      accounts: updatedAccounts,
      transactions: [newTx, ...(sotData.transactions || [])]
    };

    nextData = addAuditEvent(nextData, 'SLIP_OCR', scannedResult.bankRef, 'SLIP_INGESTED', {
      merchant: scannedResult.merchant,
      amount,
      account: selectedAccount
    });

    updateSOTData(nextData);
    toast(`✅ บันทึกสลิปเรียบร้อย! ตัดยอด ฿${amount.toLocaleString()} จาก ${selectedAccount}`, { type: 'success' });
    setScannedResult(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>สแกนสลิปโอนเงิน & ใบเสร็จ (Receipt / Slip Ingestion)</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          ระบบดึงยอดเงิน ร้านค้า และเลขอ้างอิงอัตโนมัติ พร้อมเชื่อมต่อลงบัญชี SOT ทันที
        </p>
      </div>

      {/* Upload Drop Zone */}
      <div 
        onClick={handleSimulateUpload}
        className="glass-panel glass-panel-glow-cyan" 
        style={{ 
          padding: '40px 20px', 
          textAlign: 'center', 
          border: '2px dashed var(--border-glow)',
          cursor: 'pointer',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            background: 'rgba(6, 182, 212, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <UploadCloud size={32} color="var(--accent-cyan)" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {isScanning ? 'กำลังวิเคราะห์สลิปและสกัดข้อความ...' : 'คลิกเพื่อจำลองอัปโหลดสลิปโอนเงิน / ใบเสร็จ'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            รองรับไฟล์ภาพ JPG, PNG, PDF สลิปธนาคารทุกสาขา (ระบบจำลอง OCR)
          </p>
          <button className="btn btn-outline" style={{ marginTop: '8px' }}>
            <Sparkles size={16} /> ทดสอบส่งสลิปสแกน
          </button>
        </div>
      </div>

      {/* Scanned Result Preview */}
      {scannedResult && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-glow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="badge badge-emerald">✨ OCR DETECTED</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{scannedResult.bankRef}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ร้านค้า / ผู้รับโอน</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>{scannedResult.merchant}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ยอดเงินสลิป</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>฿{scannedResult.amount.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>หมวดหมู่อัตโนมัติ</div>
              <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--accent-purple)' }}>{scannedResult.detectedCategory}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              ตัดเงินจากกระเป๋า:
            </label>
            <select 
              value={selectedAccount} 
              onChange={(e) => setSelectedAccount(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
            >
              {sotData.accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} (คงเหลือ ฿{a.balance.toLocaleString()})</option>
              ))}
            </select>
            <button onClick={handleConfirmSlip} className="btn btn-success">
              <CheckCircle size={16} /> ยืนยันบันทึกและตัดยอดเงิน
            </button>
          </div>
        </div>
      )}

      {/* Recent Transactions List */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>ประวัติการตัดจ่ายล่าสุด</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(sotData.transactions || []).map(tx => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#fff' }}>{tx.note}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleString('th-TH')} • {tx.accountId}</div>
              </div>
              <div style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>
                -฿{tx.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
