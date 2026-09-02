// Gemini Multimodal Vision Service for Sommai Money
// Supports gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, or custom models

const GEMINI_API_KEY_STORAGE = 'SOMMAI_GEMINI_API_KEY';
const GEMINI_MODEL_STORAGE = 'SOMMAI_GEMINI_MODEL';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export const getStoredGeminiApiKey = () => {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
};

export const setStoredGeminiApiKey = (key) => {
  if (key) {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  }
};

export const getStoredGeminiModel = () => {
  return localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_MODEL;
};

export const setStoredGeminiModel = (model) => {
  if (model) {
    localStorage.setItem(GEMINI_MODEL_STORAGE, model.trim());
  } else {
    localStorage.setItem(GEMINI_MODEL_STORAGE, DEFAULT_MODEL);
  }
};

// Convert Blob or File to Base64 (stripping data:image/xxx;base64, prefix)
export const fileToBase64 = (fileOrBlob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1];
        const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
        resolve({ base64, mimeType });
      } else {
        reject(new Error('Failed to read image as base64 string'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
};

/**
 * Analyze financial slip, bill, or receipt using Gemini Vision API
 * @param {Blob|File} imageFile 
 * @param {Object} context { accounts, debts, bnplItems, familySettlements }
 * @returns {Promise<Object>}
 */
export async function analyzeSlipWithGeminiVision(imageFile, context = {}) {
  const apiKey = getStoredGeminiApiKey();
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const model = getStoredGeminiModel();
  const { base64, mimeType } = await fileToBase64(imageFile);

  const systemPrompt = `
คุณคือ "สมหมาย AI" ผู้ช่วยอัจฉริยะด้านการเงินส่วนบุคคลของผู้ใช้ (คุณครูชลประทานเงินเดือน ฿17,993.32, มีเงินโอทีสอนพิเศษ, มีลูกคือน้องพีเจ, มีภรรยาคือแจง, มีแม่, และมีพี่แพร)
แนวคิดหลัก: ใช้หลัก The Money Coach (โค้ชหนุ่ม) 5 เสาหลัก + จัดสรรเงิน Make by KBank:
- กระเป๋า [KBANK-FOOD]: ค่ากินแซ่บ แซลมอน & บุฟเฟต์คลายเครียด (รางวัลการเลิกบุหรี่เพื่อลูก งบ ~฿2,500-3,000/เดือน)
- กระเป๋า [KBANK-SPAY]: บิล Shopee SPayLater ยอดเต็ม (ชำระล่วงหน้าได้ทันทีเพื่อความสบายใจ)
- กระเป๋า [KBANK-SNACK]: ขนม กาแฟ ของกินเล่น รร.
- กระเป๋า [KBANK-EMERG]: เงินสำรองฉุกเฉิน
- กระเป๋า [KBANK-MAIN]: เงินเดือนหลักเข้า

กฎพิเศษสำหรับใบแจ้งยอด Shopee SPayLater (เช่น หน้าจอมีคำว่า "ยอดที่ยังไม่ได้ชำระ", "วันครบกำหนดชำระ 10 ต.ค.", "ผ่อนชำระ [X/Y]"):
1. documentType ต้องเป็น "SPAYLATER_STATEMENT"
2. amount คือยอดเงินรวมที่เรียกเก็บทั้งหมด (เช่น 4092.76)
3. isSpayLater = true
4. spayDetails ต้องระบุ:
   - "totalStatement": ยอดรวมทั้งหมด (เช่น 4092.76)
   - "dueDate": "10 ต.ค. 2026" (หรือตามที่ระบุในรูป)
   - "cycle": "รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค.)"
   - "installmentAmount": ยอดรวมผ่อนทั้งหมด
5. lineItems: จงแกะรายการผ่อนชำระทุกรายการในรูปออกมาเป็นแถวๆ ให้ครบถ้วน (เช่น 8 รายการ) ระบุชื่อสินค้าพร้อมงวด [X/Y], ยอดเงินของงวดนั้น, และเจ้าของ (เช่น ถ้าเป็นหูฟัง Sony WH-1000XM ให้ใส่ owner: "พี่แพร", ถ้าเป็นอุปกรณ์บ้านให้ใส่ "บ้าน", นอกนั้นเป็น "ตัวเอง")

จงวิเคราะห์รูปภาพนี้ (สลิปโอนเงิน / แคปหน้าจอ Shopee SPayLater / ใบเสร็จร้านอาหาร / ใบแจ้งหนี้) แล้วตอบกลับเป็น JSON เท่านั้น ตามโครงสร้างนี้:
{
  "documentType": "TRANSFER_SLIP" | "SPAYLATER_STATEMENT" | "FOOD_RECEIPT" | "GENERAL_BILL" | "UNKNOWN",
  "title": "ชื่อหัวข้อรายการ เช่น บิล Shopee SPayLater (ครบกำหนด 10 ต.ค. 2026) / สลิปโอนเงิน / ชินคันเซ็น ซูชิ",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "merchantOrReceiver": "ชื่อผู้รับเงินหรือร้านค้า",
  "bankOrPlatform": "กสิกร / ไทยพาณิชย์ / Shopee SPayLater / etc",
  "transactionRef": "รหัสอ้างอิงธุรกรรม",
  "suggestedAction": "EXPENSE" | "DEBT_PAYMENT" | "INCOME",
  "suggestedAccountId": "KBANK-FOOD" | "KBANK-SPAY" | "KBANK-SNACK" | "KBANK-MAIN" | "KBANK-DEBIT",
  "suggestedAccountName": "ชื่อกระเป๋าเงินภาษาไทย",
  "lineItems": [
    { "name": "[2/12] Bewell Ergo-multi Pillow Set", "amount": 241.53, "owner": "ตัวเอง" | "พี่แพร" | "บ้าน", "category": "FOOD" | "BABY" | "GADGET" | "BILL" | "GAMING" | "SMARTHOME" | "HEALTH" }
  ],
  "isSpayLater": boolean,
  "spayDetails": {
    "totalStatement": 0.00,
    "minimumPayment": 0.00,
    "dueDate": "10 ต.ค. 2026",
    "cycle": "รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค.)",
    "bnplAmount": 0.00,
    "installmentAmount": 0.00,
    "familyPortion": 0.00,
    "selfPortion": 0.00
  },
  "coachWisdom": "คำแนะนำและจิตวิทยาการเงินสไตล์โค้ชหนุ่ม (เช่น ถ้าเป็นบิล SPayLater เดือนนี้ยอดลดลงเหลือ 4,092.76 เพราะพี่แพรช่วย 2,074 และมี 2 รายการผ่อนงวดสุดท้ายแล้ว!)",
  "confidenceScore": 0.95
}
`;

  const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: base64
            }
          }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1
    }
  };

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini API Error (Status ${response.status})`);
    }

    const jsonRes = await response.json();
    const candidateText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini did not return text content in response');
    }

    const parsed = JSON.parse(candidateText);
    return {
      success: true,
      modelUsed: model,
      data: parsed
    };
  } catch (err) {
    // If the error might be an unsupported model, try fallback to gemini-2.0-flash or gemini-1.5-flash
    if (model !== 'gemini-2.0-flash' && model !== 'gemini-1.5-flash') {
      console.warn(`Model ${model} failed, attempting fallback to gemini-2.0-flash...`, err);
      try {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          const fallbackText = fallbackJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (fallbackText) {
            return {
              success: true,
              modelUsed: 'gemini-2.0-flash (Fallback)',
              data: JSON.parse(fallbackText)
            };
          }
        }
      } catch (fallbackErr) {
        console.warn('Fallback also failed:', fallbackErr);
      }
    }
    throw err;
  }
}
