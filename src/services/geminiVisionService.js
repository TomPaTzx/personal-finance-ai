// Gemini Multimodal Vision Service for Sommai Money
// Supports gemini-2.5-flash, gemini-flash-latest, gemini-3.8-flash, or custom models

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

กฎพิเศษสำหรับการอ่านรูปภาพ (บิล Shopee, ตะกร้าสินค้า, ใบเสร็จร้านค้า, สลิปโอนเงิน):
1. หากเป็นหน้าจอ Shopee (เช่น หน้าคำสั่งซื้อ, หน้ารายละเอียดคำสั่งซื้อ, หน้ารายการผ่อน SPayLater):
   - documentType: "SPAYLATER_STATEMENT" หรือ "GENERAL_BILL"
   - isSpayLater = true (หากใช้ SPayLater หรือผ่อนชำระ)
   - amount: ยอดเงินรวมทั้งบิล (เช่น 930.00 หรือตามยอดสุทธิ)
2. lineItems (สำคัญมาก - Multi-Item Extraction):
   - ต้องแกะรายการสินค้าทุกรายการในรูปออกมาเป็นแถวๆ ให้ครบถ้วนทั้งหมด (เช่น มี 5-10 ชิ้น ก็ต้องใส่มาให้ครบทั้ง 10 ชิ้น ห้ามรวมเป็นชิ้นเดียวเด็ดขาด)
   - แต่ละชิ้นต้องระบุ:
     - name: ชื่อสินค้าที่ชัดเจน (เช่น "ยาสีฟันเทพไทย", "สเปรย์แอลกอฮอล์ Saker (น้องพีเจ)")
     - amount: ราคาสุทธิของสินค้านั้นๆ
     - owner: ตรวจสอบและระบุผู้จ่ายตามบริบท:
       * "น้องพีเจ" หรือ "แจง": ของใช้เด็ก/ลูก เช่น แบรนด์ Saker, D-nee, Merries, ผ้าอ้อม, นม, ทิชชู่เปียก
       * "พี่แพร": ของพี่แพร (เช่น หูฟัง Sony WH-1000XM, สายชาร์จ, ของที่พี่แพรฝากซื้อ)
       * "บ้าน" หรือ "แม่": ของใช้ส่วนรวมในบ้าน เช่น ปลั๊กไฟ, กริ่งบ้าน, น้ำยาล้างจาน, ของบำรุงสุขภาพแม่
       * "ตัวเอง": สินค้าส่วนตัว (เช่น ยาสีฟัน, อาหาร, ขนม, ของเล่น, คอมพิวเตอร์)
     - category: "KIDS" | "LIFESTYLE" | "FOOD" | "GADGET" | "HOME" | "HEALTH" | "BILL"
     - installments: จำนวนงวด (ถ้าจ่ายรอบเดียวให้เป็น 1, ถ้าผ่อนให้ดูเลขงวด เช่น 3, 6, 12)
     - monthlyPayment: ยอดจ่ายต่องวด

จงวิเคราะห์รูปภาพนี้แล้วตอบกลับเป็น JSON เท่านั้น ตามโครงสร้างนี้:
{
  "documentType": "TRANSFER_SLIP" | "SPAYLATER_STATEMENT" | "FOOD_RECEIPT" | "GENERAL_BILL" | "UNKNOWN",
  "title": "ชื่อหัวข้อรายการ เช่น ออเดอร์ Shopee SPayLater / บิลสินค้า Shopee / สลิปโอนเงิน",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "merchantOrReceiver": "ชื่อผู้รับเงินหรือร้านค้า เช่น Shopee / ShopeePay / ร้านค้า",
  "bankOrPlatform": "Shopee SPayLater / กสิกร / ไทยพาณิชย์ / etc",
  "transactionRef": "รหัสอ้างอิงธุรกรรม",
  "suggestedAction": "EXPENSE" | "DEBT_PAYMENT" | "INCOME" | "NEW_BNPL_ITEM",
  "suggestedAccountId": "KBANK-SPAY" | "KBANK-FOOD" | "KBANK-SNACK" | "KBANK-MAIN" | "KBANK-DEBIT",
  "suggestedAccountName": "ชื่อกระเป๋าเงินภาษาไทย",
  "lineItems": [
    {
      "name": "ชื่อสินค้า เช่น ยาสีฟันเทพไทย",
      "amount": 280.00,
      "owner": "ตัวเอง" | "น้องพีเจ" | "แจง" | "พี่แพร" | "แม่" | "บ้าน",
      "category": "LIFESTYLE" | "KIDS" | "FOOD" | "GADGET" | "HOME" | "HEALTH",
      "installments": 1,
      "monthlyPayment": 280.00
    }
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
  "coachWisdom": "คำแนะนำและจิตวิทยาการเงินสไตล์โค้ชหนุ่ม (กระชับ ให้กำลังใจ ชี้จุดช่วยประหยัด)",
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
    // If the error might be an unsupported model, try fallback to gemini-flash-latest or gemini-3.8-flash
    if (model !== 'gemini-flash-latest' && model !== 'gemini-3.8-flash') {
      console.warn(`Model ${model} failed, attempting fallback to gemini-flash-latest...`, err);
      try {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
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
              modelUsed: 'gemini-flash-latest (Fallback)',
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
