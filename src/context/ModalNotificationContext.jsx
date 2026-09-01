import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  XCircle, 
  Sparkles, 
  X,
  HelpCircle
} from 'lucide-react';

const ModalNotificationContext = createContext(null);

export function ModalNotificationProvider({ children }) {
  // Modal State
  const [modalConfig, setModalConfig] = useState(null);
  const resolveRef = useRef(null);

  // Toast State
  const [toasts, setToasts] = useState([]);

  // Toast Trigger
  const toast = useCallback((message, { type = 'success', duration = 3500 } = {}) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Async Confirm Modal (returns Promise<boolean>)
  const confirm = useCallback(({
    title = 'ยืนยันการทำรายการ',
    message = 'คุณต้องการดำเนินการนี้หรือไม่?',
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    variant = 'primary', // 'primary' | 'success' | 'danger' | 'warning'
    icon = null
  }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModalConfig({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        variant,
        icon
      });
    });
  }, []);

  // Async Alert Modal (returns Promise<void>)
  const alertModal = useCallback(({
    title = 'แจ้งเตือน',
    message = '',
    confirmText = 'รับทราบ',
    variant = 'info',
    icon = null
  }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModalConfig({
        type: 'alert',
        title,
        message,
        confirmText,
        variant,
        icon
      });
    });
  }, []);

  const handleConfirm = () => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setModalConfig(null);
  };

  const handleCancel = () => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setModalConfig(null);
  };

  // Helper icon selection
  const getModalIcon = () => {
    if (modalConfig?.icon) return modalConfig.icon;
    switch (modalConfig?.variant) {
      case 'danger':
        return <AlertTriangle size={32} color="#f43f5e" />;
      case 'warning':
        return <AlertTriangle size={32} color="#f59e0b" />;
      case 'success':
        return <CheckCircle2 size={32} color="#10b981" />;
      case 'primary':
      default:
        return <HelpCircle size={32} color="#06b6d4" />;
    }
  };

  const getVariantStyles = () => {
    switch (modalConfig?.variant) {
      case 'danger':
        return {
          headerColor: 'var(--accent-rose)',
          glowColor: 'rgba(244, 63, 94, 0.3)',
          confirmBtnClass: 'btn btn-danger',
          border: '1px solid rgba(244, 63, 94, 0.4)'
        };
      case 'warning':
        return {
          headerColor: 'var(--accent-amber)',
          glowColor: 'rgba(245, 158, 11, 0.3)',
          confirmBtnClass: 'btn btn-warning',
          border: '1px solid rgba(245, 158, 11, 0.4)'
        };
      case 'success':
        return {
          headerColor: 'var(--accent-emerald)',
          glowColor: 'rgba(16, 185, 129, 0.3)',
          confirmBtnClass: 'btn btn-success',
          border: '1px solid rgba(16, 185, 129, 0.4)'
        };
      case 'primary':
      default:
        return {
          headerColor: 'var(--accent-cyan)',
          glowColor: 'rgba(6, 182, 212, 0.3)',
          confirmBtnClass: 'btn btn-primary',
          border: '1px solid rgba(6, 182, 212, 0.4)'
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <ModalNotificationContext.Provider value={{ confirm, alert: alertModal, toast }}>
      {children}

      {/* Modern Glassmorphic Modal Dialog */}
      {modalConfig && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 7, 13, 0.82)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div 
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.95))',
              border: vStyles.border,
              boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 30px ${vStyles.glowColor}`,
              transform: 'scale(1)',
              animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Header / Icon */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 20px ${vStyles.glowColor}`
              }}>
                {getModalIcon()}
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: 700, 
                  color: vStyles.headerColor,
                  letterSpacing: '-0.01em',
                  marginBottom: '6px'
                }}>
                  {modalConfig.title}
                </h3>
                <div style={{ 
                  fontSize: '0.92rem', 
                  color: 'var(--text-secondary)', 
                  lineHeight: '1.6',
                  whiteSpace: 'pre-line'
                }}>
                  {modalConfig.message}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              marginTop: '22px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              {modalConfig.type === 'confirm' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-outline"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.88rem'
                  }}
                >
                  {modalConfig.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                className={vStyles.confirmBtnClass}
                style={{
                  padding: '8px 22px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  boxShadow: `0 0 15px ${vStyles.glowColor}`
                }}
              >
                {modalConfig.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Modern Toast Container */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => {
          let borderCol = 'rgba(6, 182, 212, 0.4)';
          let bgCol = 'rgba(15, 23, 42, 0.95)';
          let iconEl = <Sparkles size={18} color="var(--accent-cyan)" />;

          if (t.type === 'error') {
            borderCol = 'rgba(244, 63, 94, 0.4)';
            iconEl = <XCircle size={18} color="var(--accent-rose)" />;
          } else if (t.type === 'success') {
            borderCol = 'rgba(16, 185, 129, 0.4)';
            iconEl = <CheckCircle2 size={18} color="var(--accent-emerald)" />;
          } else if (t.type === 'warning') {
            borderCol = 'rgba(245, 158, 11, 0.4)';
            iconEl = <AlertTriangle size={18} color="var(--accent-amber)" />;
          }

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                background: bgCol,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${borderCol}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                animation: 'slideInRight 0.25s ease-out'
              }}
            >
              {iconEl}
              <span style={{ flex: 1, lineHeight: '1.4' }}>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

    </ModalNotificationContext.Provider>
  );
}

export const useModalNotification = () => {
  const context = useContext(ModalNotificationContext);
  if (!context) {
    throw new Error('useModalNotification must be used within a ModalNotificationProvider');
  }
  return context;
};
