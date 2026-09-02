import React, { useState } from 'react';
import { 
  Key, Sparkles, Check, AlertCircle, X, ShieldCheck, 
  ExternalLink, BrainCircuit, RefreshCw 
} from 'lucide-react';
import { 
  getStoredGeminiApiKey, 
  setStoredGeminiApiKey, 
  getStoredGeminiModel, 
  setStoredGeminiModel 
} from '../services/geminiVisionService';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function GeminiSettingsModal({ isOpen, onClose }) {
  const { toast } = useModalNotification();
  const [apiKey, setApiKey] = useState(() => getStoredGeminiApiKey());
  const [selectedModel, setSelectedModel] = useState(() => getStoredGeminiModel());
  const [customModel, setCustomModel] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalModel = customModel.trim() || selectedModel;
    setStoredGeminiApiKey(apiKey);
    setStoredGeminiModel(finalModel);
    toast('💾 บันทึกการตั้งค่า Gemini AI เรียบร้อยแล้ว!', { type: 'success' });
    onClose();
  };

  const handleClearKey = () => {
    setApiKey('');
    setStoredGeminiApiKey('');
    toast('🗑️ ลบ Gemini API Key เรียบร้อย (สลับกลับไปใช้ Local OCR)', { type: 'info' });
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast('⚠️ กรุณากรอก API Key ก่อนทดสอบ', { type: 'error' });
      return;
    }

    setIsTesting(true);
    const modelToTest = customModel.trim() || selectedModel;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToTest)}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping test. Reply with: PONG' }] }]
        })
      });

      if (res.ok) {
        toast(`✅ เชื่อมต่อ ${modelToTest} สำเร็จ! พร้อมใช้งาน Vision`, { type: 'success' });
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast(`❌ เชื่อมต่อไม่สำเร็จ: ${errJson.error?.message || 'สถานะ ' + res.status}`, { type: 'error' });
      }
    } catch (e) {
      toast(`❌ ข้อผิดพลาดเครือข่าย: ${e.message}`, { type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '28px', border: '1px solid rgba(168, 85, 247, 0.4)', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BrainCircuit size={24} color="var(--accent-purple)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              ตั้งค่า Gemini Multimodal Vision AI
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
          เชื่อมต่อสมอง AI เพื่อวิเคราะห์สลิปธนาคาร, บิล Shopee SPayLater, และใบเสร็จร้านอาหารลึกซึ้งระดับมนุษย์ (เก็บคีย์ไว้ในเครื่องคุณเท่านั้น ปลอดภัย 100%)
        </p>

        {/* API Key Input */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Google AI Studio API Key (ฟรี):
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            >
              {showKey ? 'ซ่อน' : 'ดู'}
            </button>
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            ยังไม่มีคีย์? รับคีย์ฟรีได้ที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-purple)', textDecoration: 'underline' }}>Google AI Studio</a>
          </div>
        </div>

        {/* Model Selection */}
        <div style={{ marginBottom: '22px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            เลือกรุ่นโมเดล Gemini (Model):
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
            {[
              { id: 'gemini-2.5-flash', label: '2.5 Flash', badge: 'รุ่นแนะนำ' },
              { id: 'gemini-2.0-flash', label: '2.0 Flash', badge: 'เสถียร' },
              { id: 'gemini-1.5-flash', label: '1.5 Flash', badge: 'คลาสสิก' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setSelectedModel(m.id); setCustomModel(''); }}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${selectedModel === m.id && !customModel ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                  background: selectedModel === m.id && !customModel ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                  color: selectedModel === m.id && !customModel ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textAlign: 'center'
                }}
              >
                <div>{m.label}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{m.badge}</div>
              </button>
            ))}
          </div>

          {/* Custom Model Text input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>หรือระบุเอง:</span>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="เช่น gemini-3.1-flash หรือรุ่นทดลอง"
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-purple)',
                fontSize: '0.82rem'
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !apiKey}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            {isTesting ? <RefreshCw size={14} className="spin-slow" /> : <Sparkles size={14} color="var(--accent-purple)" />}
            ทดสอบเชื่อมต่อ
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {apiKey && (
              <button
                type="button"
                onClick={handleClearKey}
                className="btn btn-outline"
                style={{ fontSize: '0.82rem', color: 'var(--accent-rose)' }}
              >
                ล้างคีย์
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-success"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '10px 20px' }}
            >
              <Check size={16} /> บันทึกการตั้งค่า
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
