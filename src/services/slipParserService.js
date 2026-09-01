import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';

// Parse Thai Bank / PromptPay QR code if present on slip
export function parseQRCodeFromImage(imageData) {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      const raw = code.data;
      // PromptPay EMVCo QR code standard parsing (Tag 54 = Amount, Tag 29/30 = Ref)
      let amount = null;
      let bankRef = null;

      // Extract amount tag (54)
      const amtMatch = raw.match(/54(\d{2})(\d+(\.\d+)?)/);
      if (amtMatch && amtMatch[2]) {
        amount = parseFloat(amtMatch[2]);
      }

      // Extract ref tag
      const refMatch = raw.match(/0016A000000677010111(\d+)/i) || raw.match(/TXN[\w\d]+/i);
      if (refMatch) {
        bankRef = refMatch[0];
      }

      return {
        found: true,
        raw: raw,
        amount,
        bankRef
      };
    }
  } catch (e) {
    console.warn('QR scan skipped or failed:', e);
  }
  return { found: false };
}

// Smart Regex Parser for Thai Bank Slips / Bills text
export function extractSlipDetailsFromText(rawText) {
  let detectedAmount = 0;
  let detectedMerchant = '';
  let detectedBankRef = '';
  let detectedCategory = 'FOOD';
  let suggestedAction = 'EXPENSE'; // 'EXPENSE' | 'DEBT_PAYMENT' | 'INCOME'
  let matchedDebtId = null;

  // 1. Amount Extraction Regex
  // Matches: 1,250.00 | 1250.00 บาท | จำนวนเงิน 350.00 | ฿13,639.22
  const amountRegexes = [
    /(?:จำนวนเงิน|ยอดเงิน|โอนเงิน|ชำระเงิน|Total|Amount|Bath|THB|บาท)[^\d]*([\d,]+\.\d{2})/i,
    /(?:฿|B)\s*([\d,]+\.\d{2})/i,
    /([\d,]+\.\d{2})\s*(?:บาท|THB)/i,
    /([\d,]+\.\d{2})/
  ];

  for (const regex of amountRegexes) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0 && val < 5000000) {
        detectedAmount = val;
        break;
      }
    }
  }

  // 2. Merchant / Recipient Extraction
  const merchantRegexes = [
    /(?:ไปยัง|ผู้รับโอน|โอนให้|To|Receiver|Merchant|ร้านค้า|จ่ายให้)\s*[:：]?\s*([^\n\r]+)/i,
    /(?:ShopeePay|SPayLater|TrueMoney|7-Eleven|Grab|Lineman|Big C|Lotus|Starbucks|Shopee)/i
  ];

  for (const regex of merchantRegexes) {
    const match = rawText.match(regex);
    if (match) {
      detectedMerchant = (match[1] || match[0]).trim().slice(0, 40);
      break;
    }
  }

  if (!detectedMerchant) {
    if (rawText.toLowerCase().includes('shopee') || rawText.toLowerCase().includes('spaylater')) {
      detectedMerchant = 'Shopee / SPayLater';
    } else if (rawText.includes('เซเว่น') || rawText.includes('7-Eleven')) {
      detectedMerchant = '7-Eleven';
    } else {
      detectedMerchant = 'ร้านค้า / บริการ (ตรวจพบจากสลิป)';
    }
  }

  // 3. Bank Ref Extraction
  const refRegexes = [
    /(?:รหัสอ้างอิง|เลขอ้างอิง|Ref|Transaction ID|Txn Ref|เลขที่รายการ)\s*[:：]?\s*([\w\d]+)/i,
    /([0-9A-Z]{15,35})/
  ];

  for (const regex of refRegexes) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      detectedBankRef = match[1].trim();
      break;
    }
  }

  if (!detectedBankRef) {
    detectedBankRef = 'SLIP-' + Date.now().toString().slice(-8);
  }

  // 4. SPayLater & BNPL Special Extraction
  let detectedItemName = '';
  let detectedInstallments = 0;
  let detectedMonthlyAmount = 0;
  let detectedOwner = 'ตัวเอง';

  // Check for installments e.g., "3 เดือน", "งวดละ ฿2,370.52", "x 5 งวด"
  const installmentRegex = /(?:ผ่อน|งวด|จำนวนงวด|ระยะเวลาผ่อน)[^\d]*(\d+)\s*(?:งวด|เดือน)/i;
  const instMatch = rawText.match(installmentRegex);
  if (instMatch && instMatch[1]) {
    detectedInstallments = parseInt(instMatch[1]);
  }

  const monthlyRegex = /(?:งวดละ|ต่อเดือน|Monthly)[^\d]*([\d,]+\.?\d*)/i;
  const monthMatch = rawText.match(monthlyRegex);
  if (monthMatch && monthMatch[1]) {
    detectedMonthlyAmount = parseFloat(monthMatch[1].replace(/,/g, ''));
  }

  // Check for item names in Shopee
  const itemMatch = rawText.match(/(?:สินค้า|Item|คำสั่งซื้อ|Order)[^\n\r]*[:：]?\s*([^\n\r]+)/i);
  if (itemMatch && itemMatch[1]) {
    detectedItemName = itemMatch[1].trim().slice(0, 50);
  }

  // 5. Smart Categorization & Suggested Action
  const lower = rawText.toLowerCase() + ' ' + detectedMerchant.toLowerCase();
  
  if (lower.includes('spay') || lower.includes('shopee') || lower.includes('ผ่อน') || lower.includes('หนี้') || lower.includes('งวด') || lower.includes('บิลของฉัน')) {
    detectedCategory = 'SHOPPING_BNPL';
    
    // If it looks like a new purchase order
    if (detectedInstallments > 1 || rawText.includes('สั่งซื้อสำเร็จ') || rawText.includes('คำสั่งซื้อ')) {
      suggestedAction = 'NEW_BNPL_ITEM';
      detectedMerchant = detectedItemName || 'สินค้า Shopee SPayLater';
    } else {
      suggestedAction = 'DEBT_PAYMENT';
      matchedDebtId = 'SPAY-01';
    }
  } else if (lower.includes('อาหาร') || lower.includes('grab') || lower.includes('food') || lower.includes('หมูกระทะ') || lower.includes('กาแฟ') || lower.includes('cafe')) {
    detectedCategory = 'FOOD';
    suggestedAction = 'EXPENSE';
  } else if (lower.includes('เงินเดือน') || lower.includes('salary') || lower.includes('ค่าจ้าง') || lower.includes('โอที') || lower.includes('โอนเงินเข้า')) {
    detectedCategory = 'SALARY';
    suggestedAction = 'INCOME';
  } else if (lower.includes('บ้าน') || lower.includes('แม่') || lower.includes('แพร') || lower.includes('ครอบครัว')) {
    detectedCategory = 'FAMILY';
    suggestedAction = 'EXPENSE';
    if (lower.includes('แพร')) detectedOwner = 'พี่แพร';
    if (lower.includes('แม่') || lower.includes('บ้าน')) detectedOwner = 'บ้าน';
  }

  return {
    amount: detectedAmount || (detectedMonthlyAmount && detectedInstallments ? detectedMonthlyAmount * detectedInstallments : 0),
    merchant: detectedMerchant,
    bankRef: detectedBankRef,
    detectedCategory,
    suggestedAction,
    matchedDebtId,
    detectedItemName: detectedItemName || detectedMerchant,
    detectedInstallments: detectedInstallments || 1,
    detectedMonthlyAmount: detectedMonthlyAmount || (detectedAmount && detectedInstallments ? detectedAmount / detectedInstallments : detectedAmount),
    detectedOwner,
    confidence: detectedAmount > 0 ? 0.92 : 0.60
  };
}

// Perform Real OCR on Image File or Canvas
export async function performSlipOCR(imageFileOrUrl, onProgress) {
  try {
    if (onProgress) onProgress('กำลังประมวลผลรูปภาพ...');

    // 1. Create Image Object & Canvas for fast QR extraction
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const imageLoadedPromise = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      if (typeof imageFileOrUrl === 'string') {
        img.src = imageFileOrUrl;
      } else {
        img.src = URL.createObjectURL(imageFileOrUrl);
      }
    });

    await imageLoadedPromise;

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // 2. Check QR Code first
    let qrData = null;
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      qrData = parseQRCodeFromImage(imgData);
    } catch (err) {
      console.warn('Canvas QR read warning:', err);
    }

    if (onProgress) onProgress('กำลังสกัดตัวหนังสือด้วย AI OCR Engine...');

    // 3. Tesseract OCR processing
    let extractedText = '';
    try {
      const worker = await createWorker('tha+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(`กำลังอ่านข้อความภาษาไทย (${Math.round(m.progress * 100)}%)...`);
          }
        }
      });

      const ret = await worker.recognize(canvas);
      extractedText = ret.data.text;
      await worker.terminate();
    } catch (ocrErr) {
      console.warn('Tesseract OCR error, falling back to basic extraction:', ocrErr);
    }

    // 4. Parse Details
    const parsed = extractSlipDetailsFromText(extractedText);

    // If QR code found an amount, prefer QR code amount for 100% precision
    if (qrData && qrData.found && qrData.amount) {
      parsed.amount = qrData.amount;
      if (qrData.bankRef) parsed.bankRef = qrData.bankRef;
    }

    return {
      success: true,
      data: {
        ...parsed,
        rawText: extractedText,
        imageUrl: typeof imageFileOrUrl === 'string' ? imageFileOrUrl : img.src,
        scannedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Slip OCR error:', error);
    return {
      success: false,
      error: error.message || 'ไม่สามารถสแกนสลิปได้'
    };
  }
}
