import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  CheckCircle, 
  Receipt, 
  ArrowDownRight, 
  Sparkles, 
  Camera, 
  Image as ImageIcon, 
  FileText, 
  RefreshCw, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Trash2,
  Lock,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Tag,
  BrainCircuit,
  Key,
  Mail
} from 'lucide-react';
import { performSlipOCR } from '../services/slipParserService';
import { analyzeSlipWithGeminiVision, getStoredGeminiApiKey, getStoredGeminiModel } from '../services/geminiVisionService';
import { addAuditEvent } from '../services/storageService';
import { supabase } from '../services/supabaseClient';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function SlipScanner({ sotData, updateSOTData, onOpenSettings }) {
  const { confirm: modalConfirm, toast } = useModalNotification();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Editable Form states
  const [actionType, setActionType] = useState('EXPENSE'); // 'EXPENSE' | 'DEBT_PAYMENT' | 'NEW_BNPL_ITEM' | 'INCOME'
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [selectedAccount, setSelectedAccount] = useState('KBANK-FOOD');
  const [selectedDebtId, setSelectedDebtId] = useState('SPAY-01');
  const [customNote, setCustomNote] = useState('');

  // BNPL Specific states
  const [itemName, setItemName] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('3');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [owner, setOwner] = useState('ตัวเอง');

  const fileInputRef = useRef(null);
  const geminiApiKey = getStoredGeminiApiKey();
  const geminiModel = getStoredGeminiModel();

  // Live Email Ingestion State (Make.com Automation)
  const [emailInbox, setEmailInbox] = useState(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  const fetchEmailInbox = async () => {
    setIsLoadingEmail(true);
    try {
      const { data } = await supabase
        .from('app_state')
        .select('*')
        .eq('id', 'EMAIL_INBOX')
        .single();
      if (data && data.data && data.data.subject) {
        setEmailInbox(data.data);
      }
    } catch (e) {
      console.warn('Failed to fetch EMAIL_INBOX:', e);
    } finally {
      setIsLoadingEmail(false);
    }
  };

  useEffect(() => {
    fetchEmailInbox();
  }, []);

  // Intelligent parser for K PLUS / Thai bank transaction email body
  const parseKPlusEmailText = (rawText) => {
    if (!rawText) return null;
    const cleanText = rawText.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

    // Amount: e.g. "จำนวนเงิน (บาท): 432.00" or "Amount (THB): 432.00"
    const amountMatch = cleanText.match(/จำนวนเงิน\s*\((?:บาท|THB)\):\s*([\d,]+\.?\d*)/i) || 
                        cleanText.match(/Amount\s*\((?:THB|บาท)\):\s*([\d,]+\.?\d*)/i);
    const parsedAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

    // Receiver: e.g. "ชื่อบัญชี: นาย กษิดิษ รุจาคม" or "Account Name: MR. KASIDIT RUJARKOM"
    const nameMatch = cleanText.match(/ชื่อบัญชี:\s*([^\r\n]+)/) || cleanText.match(/Account Name:\s*([^\r\n]+)/i);
    const receiverName = nameMatch ? nameMatch[1].trim() : '';

    // Ref: e.g. "เลขที่รายการ: 016245133006ATF06040"
    const refMatch = cleanText.match(/เลขที่รายการ:\s*([^\r\n]+)/) || cleanText.match(/Transaction Number:\s*([^\r\n]+)/i);
    const txRef = refMatch ? refMatch[1].trim() : '';

    // Balance: e.g. "ยอดถอนได้ (บาท): 518.00"
    const balanceMatch = cleanText.match(/ยอดถอนได้\s*\((?:บาท|THB)\):\s*([\d,]+\.?\d*)/i) || 
                         cleanText.match(/Available Balance\s*\((?:THB|บาท)\):\s*([\d,]+\.?\d*)/i);
    const availableBalance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;

    // Date: e.g. "วันที่ทำรายการ: 02/09/2026 13:30:06"
    const dateMatch = cleanText.match(/วันที่ทำรายการ:\s*([^\r\n]+)/) || cleanText.match(/Transaction Date:\s*([^\r\n]+)/i);
    const txDate = dateMatch ? dateMatch[1].trim() : '';

    return {
      amount: parsedAmount,
      receiverName,
      txRef,
      availableBalance,
      txDate
    };
  };

  // Handle Real File Selection / Drag-Drop
  const handleFileChange = async (file) => {
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/') && !file.name.endsWith('.pdf')) {
      toast('⚠️ กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP) หรือ PDF สลิป', { type: 'error' });
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setIsScanning(true);

    let parsedSuccess = false;

    // 1. Try Gemini Multimodal Vision if API Key is configured
    if (geminiApiKey) {
      try {
        setScanProgress(`🧠 กำลังส่งภาพให้ ${geminiModel} วิเคราะห์...`);
        const geminiRes = await analyzeSlipWithGeminiVision(file, {
          accounts: sotData.accounts,
          debts: sotData.debts,
          bnplItems: sotData.bnplItems
        });

        if (geminiRes.success && geminiRes.data) {
          const gData = geminiRes.data;
          setScannedResult({
            ...gData,
            modelUsed: geminiRes.modelUsed,
            isGeminiVision: true
          });

          setAmount(gData.amount > 0 ? gData.amount.toString() : '');
          setMerchant(gData.merchantOrReceiver || gData.title || '');
          setBankRef(gData.transactionRef || 'GEMINI-' + Date.now().toString().slice(-6));
          setActionType(gData.suggestedAction || 'EXPENSE');

          if (gData.suggestedAccountId) {
            setSelectedAccount(gData.suggestedAccountId);
          } else if (gData.documentType === 'SPAYLATER_STATEMENT') {
            setSelectedAccount('KBANK-SPAY');
          } else {
            setSelectedAccount('KBANK-FOOD');
          }

          if (gData.lineItems && gData.lineItems.length > 0) {
            setItemName(gData.lineItems[0].name || '');
          }

          toast(`✨ วิเคราะห์ด้วย ${geminiRes.modelUsed} สำเร็จ!`, { type: 'success' });
          parsedSuccess = true;
        }
      } catch (geminiErr) {
        console.warn('Gemini Vision failed, falling back to Local OCR:', geminiErr);
        toast(`⚠️ เชื่อมต่อ AI ไม่สำเร็จ (${geminiErr.message}): กำลังสลับไปใช้ Local OCR สำรอง...`, { type: 'info' });
      }
    }

    // 2. Fallback to Local OCR (Tesseract + jsQR) if Gemini was not run or failed
    if (!parsedSuccess) {
      setScanProgress('🔍 กำลังใช้ Local OCR & QR Code ถอดรหัส...');
      const res = await performSlipOCR(file, (msg) => setScanProgress(msg));

      if (res.success && res.data) {
        setScannedResult({
          ...res.data,
          isGeminiVision: false,
          modelUsed: 'Local Tesseract + QR Engine'
        });
        setAmount(res.data.amount > 0 ? res.data.amount.toString() : '');
        setMerchant(res.data.merchant || '');
        setBankRef(res.data.bankRef || '');
        setCategory(res.data.detectedCategory || 'FOOD');
        setActionType(res.data.suggestedAction || 'EXPENSE');
        if (res.data.matchedDebtId) setSelectedDebtId(res.data.matchedDebtId);
        if (res.data.detectedItemName) setItemName(res.data.detectedItemName);
        if (res.data.detectedInstallments) setTotalInstallments(res.data.detectedInstallments.toString());
        if (res.data.detectedMonthlyAmount) setMonthlyPayment(res.data.detectedMonthlyAmount.toString());
        if (res.data.detectedOwner) setOwner(res.data.detectedOwner);
        
        toast('✨ สแกนสลิปด้วย Local OCR สำเร็จ!', { type: 'success' });
      } else {
        toast(`⚠️ สแกนสลิปไม่สำเร็จ: ${res.error || 'ไม่พบข้อความ'}`, { type: 'error' });
        setScannedResult({
          merchant: 'รายการจากสลิป',
          amount: 0,
          bankRef: 'SLIP-' + Date.now().toString().slice(-6),
          detectedCategory: 'FOOD',
          isGeminiVision: false
        });
        setAmount('');
        setMerchant('รายการจากสลิป');
        setBankRef('SLIP-' + Date.now().toString().slice(-6));
      }
    }

    setIsScanning(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  // Submit and Apply Slip to SOT
  const handleConfirmSlip = async () => {
    const numAmount = parseFloat(amount);

    // 0. If NEW_BNPL_ITEM -> Add new installment item to debts & bnplItems
    if (actionType === 'NEW_BNPL_ITEM') {
      const instNum = parseInt(totalInstallments) || 1;
      const monthNum = parseFloat(monthlyPayment) || (numAmount / instNum);
      const totalVal = numAmount || (instNum * monthNum);

      const newBnpl = {
        id: `BNPL-${Date.now().toString().slice(-4)}`,
        itemName: itemName || merchant || 'สินค้า SPayLater',
        owner: owner,
        totalInstallments: instNum,
        remainingInstallments: instNum,
        monthlyPayment: monthNum,
        remainingAmount: totalVal,
        payerType: owner === 'ตัวเอง' ? 'WE_PAY' : 'THEY_PAY',
        status: 'ACTIVE',
        startDate: new Date().toISOString()
      };

      const newDebt = {
        id: `SPAY-${Date.now().toString().slice(-4)}`,
        itemName: itemName || merchant || 'สินค้า SPayLater',
        owner: owner,
        category: 'SPAYLATER',
        remainingAmount: totalVal,
        monthlyPayment: monthNum,
        remainingInstallments: instNum,
        payerType: owner === 'ตัวเอง' ? 'WE_PAY' : 'THEY_PAY',
        status: 'ACTIVE'
      };

      let nextData = {
        ...sotData,
        bnplItems: [newBnpl, ...(sotData.bnplItems || [])],
        debts: [newDebt, ...(sotData.debts || [])]
      };

      nextData = addAuditEvent(nextData, 'SLIP_OCR', bankRef, 'BNPL_ITEM_ADDED', {
        itemName: newBnpl.itemName,
        owner,
        totalAmount: totalVal,
        monthlyPayment: monthNum
      });

      updateSOTData(nextData);
      toast(`🛍️ เพิ่มรายการผ่อน [${newBnpl.itemName}] เข้า Debt Tracker เรียบร้อยแล้ว!`, { type: 'success' });
      setScannedResult(null);
      setPreviewUrl(null);
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      toast('⚠️ กรุณาระบุยอดเงินให้ถูกต้อง', { type: 'error' });
      return;
    }

    let updatedAccounts = [...(sotData.accounts || [])];
    let updatedDebts = [...(sotData.debts || [])];
    let noteText = merchant + (customNote ? ` (${customNote})` : '') + ` [Ref: ${bankRef}]`;

    // 1. If EXPENSE -> deduct from selectedAccount
    if (actionType === 'EXPENSE') {
      const sourceAcc = updatedAccounts.find(a => a.id === selectedAccount);
      if (sourceAcc && sourceAcc.balance < numAmount) {
        const ok = await modalConfirm({
          title: 'ยอดเงินในกระเป๋าไม่พอ',
          message: `กระเป๋า [${sourceAcc.name}] มีเงิน ฿${sourceAcc.balance.toLocaleString()} แต่มียอดจ่าย ฿${numAmount.toLocaleString()}\n\nต้องการตัดเงินต่อจนยอดติดลบหรือไม่?`,
          variant: 'warning'
        });
        if (!ok) return;
      }

      updatedAccounts = updatedAccounts.map(acc => {
        if (acc.id === selectedAccount) {
          return {
            ...acc,
            balance: Math.max(0, acc.balance - numAmount),
            updatedAt: new Date().toISOString()
          };
        }
        return acc;
      });
    }

    // 2. If DEBT_PAYMENT -> deduct from account AND reduce debt amount
    else if (actionType === 'DEBT_PAYMENT') {
      updatedAccounts = updatedAccounts.map(acc => {
        if (acc.id === selectedAccount) {
          return {
            ...acc,
            balance: Math.max(0, acc.balance - numAmount),
            updatedAt: new Date().toISOString()
          };
        }
        return acc;
      });

      updatedDebts = updatedDebts.map(d => {
        if (d.id === selectedDebtId) {
          const newRemaining = Math.max(0, (d.remainingAmount || 0) - numAmount);
          return {
            ...d,
            remainingAmount: newRemaining,
            status: newRemaining === 0 ? 'COMPLETED' : d.status
          };
        }
        return d;
      });
      noteText = `ชำระหนี้/ผ่อนของ [${selectedDebtId}]: ${noteText}`;
    }

    // 3. If INCOME -> add to selectedAccount
    else if (actionType === 'INCOME') {
      updatedAccounts = updatedAccounts.map(acc => {
        if (acc.id === selectedAccount) {
          return {
            ...acc,
            balance: (acc.balance || 0) + numAmount,
            updatedAt: new Date().toISOString()
          };
        }
        return acc;
      });
    }

    // Create transaction log
    const newTx = {
      id: `TX-${Date.now().toString().slice(-5)}`,
      accountId: selectedAccount,
      type: actionType,
      amount: numAmount,
      category: category,
      note: noteText,
      bankRef: bankRef,
      date: new Date().toISOString()
    };

    let nextData = {
      ...sotData,
      accounts: updatedAccounts,
      debts: updatedDebts,
      transactions: [newTx, ...(sotData.transactions || [])]
    };

    nextData = addAuditEvent(nextData, 'SLIP_OCR', bankRef, 'SLIP_INGESTED', {
      merchant,
      amount: numAmount,
      actionType,
      account: selectedAccount
    });

    updateSOTData(nextData);

    toast(`✅ บันทึกสลิปสำเร็จ! ยอด ฿${numAmount.toLocaleString()} ลงระบบเรียบร้อย`, { type: 'success' });
    setScannedResult(null);
    setPreviewUrl(null);
    setAmount('');
    setMerchant('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={22} color="var(--accent-cyan)" />
              สแกนสลิปโอนเงิน & ใบเสร็จชำระหนี้ (Real OCR & PromptPay QR)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              อัปโหลดสลิปธนาคารจริง AI อ่าน QR Code & ถอดตัวเลข ตัดยอดกระเป๋าหรือชำระหนี้เข้า Cloud ทันที
            </p>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Camera size={16} /> ถ่ายภาพ / เลือกรูปสลิป
          </button>
        </div>
      </div>

      {/* Live Email Ingestion Banner (Make.com Automation) */}
      {emailInbox && (() => {
        const parsed = parseKPlusEmailText(emailInbox.text || emailInbox.snippet);
        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>🟢 Make.com ส่งสดเข้าแอป</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={16} color="var(--accent-emerald)" />
                  {emailInbox.subject || 'แจ้งเตือนการเงิน'}
                </span>
                {parsed?.txDate && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🕒 {parsed.txDate}</span>
                )}
              </div>

              {parsed?.amount ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    ฿{parsed.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {parsed.receiverName && (
                    <div style={{ fontSize: '0.82rem', color: '#fff' }}>
                      โอนให้: <strong>{parsed.receiverName}</strong>
                    </div>
                  )}
                  {parsed.availableBalance !== null && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                      (คงเหลือในบัญชี: ฿{parsed.availableBalance.toLocaleString()})
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '700px', lineHeight: 1.4, margin: '4px 0 0 0' }}>
                  {emailInbox.snippet || 'ได้รับข้อมูลแจ้งเตือนตัดเงินสำเร็จจาก K PLUS'}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={fetchEmailInbox}
                className="btn btn-outline"
                disabled={isLoadingEmail}
                style={{ fontSize: '0.75rem', padding: '8px 12px' }}
                title="รีเฟรชอีเมลล่าสุด"
              >
                <RefreshCw size={14} className={isLoadingEmail ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => {
                  if (parsed?.amount) {
                    setAmount(parsed.amount.toString());
                    setMerchant(parsed.receiverName || 'K PLUS Transfer');
                    setBankRef(parsed.txRef || '');
                    setCustomNote(`โอนเงินสำเร็จ ${parsed.txDate} (คงเหลือ ฿${parsed.availableBalance?.toLocaleString()})`);
                    setActionType('EXPENSE');
                    toast(`⚡ ดึงยอด ฿${parsed.amount.toLocaleString()} โอนให้ [${parsed.receiverName}] ลงแบบฟอร์มแล้ว!`, { type: 'success' });
                  } else {
                    setMerchant(emailInbox.subject || 'K PLUS Bill Payment');
                    setCustomNote(emailInbox.snippet || '');
                    toast('📋 ดึงข้อความจากอีเมลมาลงในแบบฟอร์มแล้ว! ใส่ยอดเงินแล้วกดยืนยันได้ทันที', { type: 'success' });
                  }
                }}
                className="btn btn-success"
                style={{ fontSize: '0.85rem', padding: '8px 16px', fontWeight: 700 }}
              >
                ⚡ ดึงยอด ฿{parsed?.amount ? parsed.amount.toLocaleString() : ''} ลงฟอร์ม
              </button>
            </div>
          </div>
        );
      })()}

      {/* AI Vision Engine Status & Settings Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: geminiApiKey ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${geminiApiKey ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
        padding: '10px 16px',
        borderRadius: 'var(--radius-sm)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BrainCircuit size={18} color={geminiApiKey ? "var(--accent-purple)" : "var(--text-muted)"} />
          <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
            {geminiApiKey ? `🧠 Gemini Multimodal Vision (${geminiModel})` : '🔍 โหมดพื้นฐาน: Local OCR & QR Code'}
          </span>
          {geminiApiKey ? (
            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>AI Vision Active</span>
          ) : (
            <span className="badge badge-slate" style={{ fontSize: '0.65rem' }}>ออฟไลน์ / ไร้ API Key</span>
          )}
        </div>

        <button 
          onClick={onOpenSettings}
          className="btn btn-secondary"
          style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Key size={14} /> {geminiApiKey ? 'ตั้งค่าโมเดล / API Key' : 'ใส่ Gemini API Key (เปิดโหมดฉลาดเต็มขั้น)'}
        </button>
      </div>

      {/* Upload Drop Zone */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="glass-panel glass-panel-glow-cyan" 
        style={{ 
          padding: '36px 20px', 
          textAlign: 'center', 
          border: '2px dashed var(--accent-cyan)',
          cursor: 'pointer',
          borderRadius: 'var(--radius-lg)',
          background: isScanning ? 'rgba(6, 182, 212, 0.08)' : 'rgba(15, 23, 42, 0.6)',
          transition: 'all 0.2s ease'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          accept="image/*,.pdf" 
          capture="environment"
          style={{ display: 'none' }} 
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(6, 182, 212, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
          }}>
            {isScanning ? (
              <RefreshCw size={32} color="var(--accent-cyan)" className="spin-slow" />
            ) : (
              <UploadCloud size={32} color="var(--accent-cyan)" />
            )}
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
            {isScanning ? (scanProgress || 'AI กำลังประมวลผลสลิป...') : 'ลากไฟล์สลิปมาวางที่นี่ หรือคลิกเพื่ออัปโหลดรูปภาพจริง'}
          </h3>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '450px' }}>
            รองรับภาพถ่ายสลิป K PLUS, Krungthai NEXT, SCB EASY, Shopee/SPayLater, TrueMoney, PromptPay QR
          </p>
        </div>
      </div>

      {/* Scanned Result & Confirmation Form */}
      {scannedResult && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(6, 182, 212, 0.4)', animation: 'fadeIn 0.25s ease-out' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={`badge ${scannedResult.isGeminiVision ? 'badge-purple' : 'badge-emerald'}`}>
                {scannedResult.isGeminiVision ? `🧠 ${scannedResult.modelUsed || 'GEMINI VISION'}` : '✨ AI OCR DETECTED'}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>เลขอ้างอิง: {bankRef || 'SLIP-AUTO'}</span>
            </div>

            <button 
              onClick={() => { setScannedResult(null); setPreviewUrl(null); }}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              ยกเลิก
            </button>
          </div>

          {/* Gemini Coach Wisdom */}
          {scannedResult.coachWisdom && (
            <div style={{
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <Sparkles size={18} color="var(--accent-purple)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '2px' }}>
                  คำแนะนำ The Money Coach (โดย {scannedResult.modelUsed}):
                </div>
                <div style={{ fontSize: '0.82rem', color: '#fff', lineHeight: 1.5 }}>
                  {scannedResult.coachWisdom}
                </div>
              </div>
            </div>
          )}

          {/* Line Items Breakdown (If any) */}
          {scannedResult.lineItems && scannedResult.lineItems.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                รายการย่อยที่ AI ตรวจพบในภาพ:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {scannedResult.lineItems.map((item, iIdx) => (
                  <span key={iIdx} className="badge badge-slate" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    {item.name} {item.amount > 0 ? `(฿${item.amount.toLocaleString()})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* Left: Image Preview */}
            {previewUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ตัวอย่างภาพสลิป:</span>
                <div style={{
                  maxHeight: '340px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                  background: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img src={previewUrl} alt="Slip Preview" style={{ maxWidth: '100%', maxHeight: '340px', objectFit: 'contain' }} />
                </div>
              </div>
            )}

            {/* Right: Confirmation & Adjustment Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Action Type Selector */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  ประเภทการทำรายการ:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActionType('EXPENSE')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: actionType === 'EXPENSE' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${actionType === 'EXPENSE' ? 'var(--accent-rose)' : 'var(--border-subtle)'}`,
                      color: actionType === 'EXPENSE' ? 'var(--accent-rose)' : 'var(--text-secondary)'
                    }}
                  >
                    💳 ตัดจ่ายทั่วไป
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('DEBT_PAYMENT')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: actionType === 'DEBT_PAYMENT' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${actionType === 'DEBT_PAYMENT' ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
                      color: actionType === 'DEBT_PAYMENT' ? 'var(--accent-amber)' : 'var(--text-secondary)'
                    }}
                  >
                    🔒 ชำระหนี้/ผ่อน
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('NEW_BNPL_ITEM')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: actionType === 'NEW_BNPL_ITEM' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${actionType === 'NEW_BNPL_ITEM' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                      color: actionType === 'NEW_BNPL_ITEM' ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                    }}
                  >
                    🛍️ เพิ่มผ่อนของ SPay
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('INCOME')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: actionType === 'INCOME' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${actionType === 'INCOME' ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                      color: actionType === 'INCOME' ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                    }}
                  >
                    📥 รับเงินเข้า
                  </button>
                </div>
              </div>

              {/* If NEW_BNPL_ITEM -> Show BNPL Custom Fields */}
              {actionType === 'NEW_BNPL_ITEM' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>
                      📦 ชื่อสินค้าที่สั่งซื้อ:
                    </label>
                    <input 
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="เช่น Sony WH-1000XM5, ลำโพงบลูทูธ"
                      style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        จำนวนงวดทั้งหมด:
                      </label>
                      <input 
                        type="number"
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(e.target.value)}
                        placeholder="เช่น 3 หรือ 5"
                        style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        ค่างวดต่อเดือน (บาท):
                      </label>
                      <input 
                        type="number"
                        step="0.01"
                        value={monthlyPayment}
                        onChange={(e) => setMonthlyPayment(e.target.value)}
                        placeholder="เช่น 2370.52"
                        style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)', fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      ใครเป็นเจ้าของ / ผู้รับผิดชอบยอดผ่อน:
                    </label>
                    <select 
                      value={owner} 
                      onChange={(e) => setOwner(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                    >
                      <option value="ตัวเอง">🙋‍♂️ ตัวเอง (นับเป็นหนี้สินส่วนตัว)</option>
                      <option value="พี่แพร">👩 พี่แพร (พี่แพรโอนเงินคืนเราทุกงวด)</option>
                      <option value="บ้าน">🏠 บ้าน / คุณแม่</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  {/* Amount Field */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      ยอดเงินจากสลิป (บาท):
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="เช่น 350.00"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        color: 'var(--accent-cyan)',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--accent-cyan)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    />
                  </div>

                  {/* Merchant / Receiver */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      ร้านค้า / ผู้รับโอน / บันทึก:
                    </label>
                    <input 
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="เช่น GrabFood, 7-Eleven, ShopeePay"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fff'
                      }}
                    />
                  </div>

                  {/* Account Selector */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      {actionType === 'INCOME' ? 'ฝากเข้ากระเป๋า:' : 'ตัดจ่ายจากกระเป๋า:'}
                    </label>
                    <select 
                      value={selectedAccount} 
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fff'
                      }}
                    >
                      {(sotData.accounts || []).map(a => (
                        <option key={a.id} value={a.id}>{a.name} (คงเหลือ ฿{a.balance.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* If Debt Payment -> Select Debt */}
              {actionType === 'DEBT_PAYMENT' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', display: 'block', marginBottom: '4px' }}>
                    หักลดยอดหนี้/รายการผ่อน:
                  </label>
                  <select 
                    value={selectedDebtId} 
                    onChange={(e) => setSelectedDebtId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid var(--accent-amber)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#fff'
                    }}
                  >
                    {(sotData.debts || []).map(d => (
                      <option key={d.id} value={d.id}>
                        {d.itemName} ({d.owner}) - คงเหลือ ฿{(d.remainingAmount || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Submit Button */}
              <button 
                onClick={handleConfirmSlip}
                className="btn btn-success"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle size={18} /> ยืนยันบันทึกสลิปและปรับยอดเงินจริง
              </button>

            </div>

          </div>

        </div>
      )}

      {/* Recent Transactions List */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--accent-cyan)" /> ประวัติการบันทึกสลิป & ตัดจ่ายล่าสุด
        </h3>
        
        {(sotData.transactions || []).length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            ยังไม่มีประวัติการบันทึกสลิป
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(sotData.transactions || []).map(tx => (
              <div 
                key={tx.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 14px', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: tx.type === 'INCOME' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {tx.type === 'INCOME' ? (
                      <TrendingUp size={16} color="var(--accent-emerald)" />
                    ) : (
                      <TrendingDown size={16} color="var(--accent-rose)" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 500 }}>{tx.note}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(tx.date).toLocaleString('th-TH')} • กระเป๋า: {tx.accountId}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  color: tx.type === 'INCOME' ? 'var(--accent-emerald)' : 'var(--accent-rose)', 
                  fontWeight: 700,
                  fontSize: '0.95rem'
                }}>
                  {tx.type === 'INCOME' ? '+' : '-'}฿{tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
