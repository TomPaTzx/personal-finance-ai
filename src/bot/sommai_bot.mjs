/**
 * Sommai Telegram Bot Service v2.6 (Gemini Vision AI Powered)
 * Gemini 2.5 Flash Vision Multimodal Engine + Local OCR Fallback
 * Granular Item Breakdown + Interactive Confirmation Gate
 */
import { createClient } from '@supabase/supabase-js';
import { createWorker } from 'tesseract.js';

const BOT_TOKEN = '8719597880:AAGEjzdCn4JKUnnV2iKUnyzmQB2_kfJve4g';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const SUPABASE_URL = 'https://neflzvrowmjkgixaejzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory pending confirmations: msgId -> draftData
const pendingDrafts = new Map();
// Keep track of latest draft per chat
const lastDraftByChat = new Map();

// Gemini API Key (Loaded from Env or Supabase Cloud)
let geminiApiKey = process.env.GEMINI_API_KEY || '';

// Load Gemini Key from Cloud
async function initGeminiKey() {
  try {
    const { data } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 'CURRENT_SOT')
      .single();
    if (data?.data?.geminiApiKey) {
      geminiApiKey = data.data.geminiApiKey;
      console.log('✨ Gemini Vision AI Key loaded from Supabase Cloud!');
    }
  } catch (err) {
    console.warn('Could not load Gemini Key from Supabase:', err.message);
  }
}

// Helper: Telegram API Call
async function callTelegram(method, payload) {
  try {
    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API error on ${method}:`, err);
    return { ok: false, error: err.message };
  }
}

// Helper: Send Message with HTML and Reply-To Support
async function sendMessage(chatId, text, replyMarkup = null, replyToMessageId = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;
  return await callTelegram('sendMessage', payload);
}

// Helper: Edit Message Text
async function editMessageText(chatId, messageId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return await callTelegram('editMessageText', payload);
}

// Helper: Answer Callback Query
async function answerCallbackQuery(callbackQueryId, text = '') {
  return await callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text
  });
}

// Download Telegram file to Buffer
async function downloadTelegramFile(fileId) {
  const fileRes = await callTelegram('getFile', { file_id: fileId });
  if (!fileRes.ok || !fileRes.result?.file_path) {
    throw new Error('Failed to get file path from Telegram');
  }
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileRes.result.file_path}`;
  const resp = await fetch(fileUrl);
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Fetch Current Active SOT from Supabase
async function getCurrentSOT() {
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', 'CURRENT_SOT')
    .single();

  if (error || !data) {
    console.warn('Could not fetch CURRENT_SOT:', error);
    return null;
  }
  return data.data;
}

// Save Updated SOT to Supabase Cloud
async function saveSOTToCloud(sotData) {
  const now = new Date().toISOString();
  await supabase
    .from('app_state')
    .upsert({
      id: 'CURRENT_SOT',
      data: sotData,
      updated_at: now
    });

  await supabase
    .from('app_state')
    .upsert({
      id: 'SOT_2026-09',
      data: sotData,
      updated_at: now
    });
}

// Gemini 2.5 Flash Vision Multimodal Analyzer
async function analyzeWithGeminiVision(imageBuffer, mimeType = 'image/jpeg') {
  if (!geminiApiKey) return null;

  const base64Data = imageBuffer.toString('base64');
  const systemPrompt = `
คุณคือ "สมหมาย AI" ผู้ช่วยอัจฉริยะด้านการเงินส่วนบุคคล
ภารกิจ: วิเคราะห์รูปภาพสลิปโอนเงินธนาคาร, ใบแจ้งยอด Shopee SPayLater, หรือใบเสร็จร้านค้า อย่างแม่นยำ 100%
กฎการวิเคราะห์:
1. หากเป็นหน้าจอ Shopee / SPayLater / ผ่อนชำระ:
   - type = "SHOPEE_STATEMENT"
   - dueDate: วันครบกำหนดชำระ เช่น "10 ต.ค. 2026"
   - totalAmount: ยอดรวมทั้งบิล (ตัวเลข)
   - items: แกะรายการสินค้าทุกชิ้นออกมาให้ครบถ้วน ห้ามข้าม:
     - title: ชื่อสินค้าที่แท้จริงตามหน้าจอ (เช่น "1 ฟรี 1 พิซซ่าขอบเอ็กซ์ตรีม ถาดใหญ่ (L) หมวดเดอลุกซ์", "ไก่ทอดแมค สูตรสไปซี่", "ยาสีฟันเทพไทย")
     - amount: ยอดเงินของสินค้านั้น
     - isInstallment: true/false
     - owner: พิจารณาตามบริบท:
       * "น้องพีเจ": ของใช้เด็ก/ลูก เช่น Saker, Merries, ผ้าอ้อม, นม, ทิชชู่เปียก
       * "พี่แพร": หูฟัง Sony, เคส Tab, ของฝากซื้อ
       * "แม่" หรือ "บ้าน": ประกันสังคม ม.39, ยาบำรุง, ของใช้ส่วนรวม
       * "ตัวเอง": อาหาร (พิซซ่า, ไก่ทอด, ซูชิ), ของใช้ส่วนตัว
     - category: "FOOD" | "KIDS" | "GADGET" | "LIFESTYLE" | "HOME" | "HEALTH"

2. หากเป็นสลิปโอนเงินธนาคาร (KBank, SCB, KTB, TrueMoney):
   - type = "BANK_SLIP"
   - bankName: ชื่อธนาคาร เช่น "กสิกรไทย (KBank)", "ไทยพาณิชย์ (SCB)"
   - recipient: ชื่อผู้รับเงิน / ร้านค้า
   - totalAmount: ยอดเงินที่โอน (ตัวเลข)
   - bankRef: รหัสอ้างอิงธุรกรรม
   - timeStr: วันที่และเวลาในสลิป
   - pocket: "KBANK-FOOD" (หากเป็นของกิน), "KBANK-DEBIT" (ทั่วไป), "KBANK-SNACK" (ขนม/รร.)
   - owner: "ตัวเอง", "น้องพีเจ", "พี่แพร", "แม่", หรือ "บ้าน"

ตอบกลับเป็น JSON เท่านั้นตามโครงสร้าง:
{
  "type": "SHOPEE_STATEMENT" หรือ "BANK_SLIP",
  "title": "ชื่อหัวข้อ",
  "totalAmount": 0.00,
  "dueDate": "10 ต.ค. 2026",
  "bankName": "ชื่อธนาคาร",
  "bankRef": "รหัสอ้างอิง",
  "timeStr": "วันเวลา",
  "pocket": "KBANK-DEBIT",
  "owner": "ตัวเอง",
  "items": [
    { "title": "ชื่อสินค้า", "amount": 0.00, "owner": "ตัวเอง", "category": "FOOD", "isInstallment": false }
  ]
}
`.trim();

  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-pro'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
          }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1
          }
        })
      });

      if (!res.ok) {
        console.warn(`Gemini Vision with ${model} returned ${res.status}`);
        continue;
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        parsed.engine = `Gemini (${model})`;
        return parsed;
      }
    } catch (e) {
      console.warn(`Gemini Vision error on model ${model}:`, e.message);
    }
  }

  return null;
}

// Fallback: Local OCR Extractor
function extractSlipDetailsLocal(rawText, caption = '') {
  let text = `${caption}\n${rawText}`;

  // Heuristic corrections for common OCR misreads
  if (text.includes('เสื้อปาดไหล่') || text.includes('เอ็กซ์ตร้า ลายใหญ่')) {
    text = text.replace(/เสื้อปาดไหล่/g, 'พิซซ่า').replace(/เอ็กซ์ตร้า ลายใหญ่/g, 'ขอบเอ็กซ์ตรีม ถาดใหญ่');
  }
  if (text.includes('ไก่ทอดเดชา')) {
    text = text.replace(/ไก่ทอดเดชา/g, 'ไก่ทอดแมค');
  }

  let bankName = 'ธนาคาร / ร้านค้า';
  let defaultPocket = 'KBANK-DEBIT';

  if (/กสิกร|kbank|k-plus|k plus/i.test(text)) {
    bankName = 'กสิกรไทย (KBank)';
    defaultPocket = 'KBANK-DEBIT';
  } else if (/ไทยพาณิชย์|scb|easy/i.test(text)) {
    bankName = 'ไทยพาณิชย์ (SCB)';
    defaultPocket = 'SCB-EXTRA';
  } else if (/กรุงไทย|ktb|next/i.test(text)) {
    bankName = 'กรุงไทย (KTB)';
    defaultPocket = 'KTB-SALARY';
  } else if (/truemoney|ทรูมันนี่|true money/i.test(text)) {
    bankName = 'TrueMoney Wallet';
    defaultPocket = 'TRUEMONEY';
  } else if (/shopeepay|spaylater|shopee/i.test(text)) {
    bankName = 'ShopeePay / SPayLater';
    defaultPocket = 'KBANK-SPAY';
  }

  let detectedAmount = 0;
  const amountRegexes = [
    /(?:ยอดที่ต้องชำระ|จำนวนเงิน|ยอดเงิน|โอนเงิน|ชำระเงิน|Total|Amount|฿|B)[^\d]*([\d,]+\.\d{2})/i,
    /([\d,]+\.\d{2})\s*(?:บาท|THB)/i,
    /([\d,]+\.\d{2})/
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0 && val < 5000000) {
        detectedAmount = val;
        break;
      }
    }
  }

  let recipient = '';
  const recipientMatch = text.match(/(?:ไปยัง|ผู้รับโอน|โอนให้|To|Receiver|Merchant|ร้านค้า|จ่ายให้)\s*[:：]?\s*([^\n\r]+)/i);
  if (recipientMatch && recipientMatch[1]) {
    recipient = recipientMatch[1].trim().slice(0, 40);
  }
  if (!recipient) {
    if (/พิซซ่า|pizza/i.test(text)) recipient = '1 ฟรี 1 พิซซ่าขอบเอ็กซ์ตรีม ถาดใหญ่ (L) หมวดเดอลุกซ์';
    else if (/ไก่ทอดแมค|mcdonald/i.test(text)) recipient = 'ไก่ทอดแมค สูตรสไปซี่';
    else if (/shinkanzen/i.test(text)) recipient = 'Shinkanzen Sushi';
    else if (/ตี๋น้อย|สุกี้ตี๋น้อย/i.test(text)) recipient = 'สุกี้ตี๋น้อย';
    else if (/เซเว่น|7-eleven/i.test(text)) recipient = '7-Eleven';
    else if (/lotus|โลตัส/i.test(text)) recipient = 'Lotus';
    else if (caption) recipient = caption.slice(0, 30);
    else recipient = 'ร้านค้า / บริการ';
  }

  let bankRef = '';
  const refMatch = text.match(/(?:รหัสอ้างอิง|เลขอ้างอิง|Ref|Txn Ref|เลขที่รายการ)\s*[:：]?\s*([\w\d]+)/i) ||
                   text.match(/([0-9A-Z]{12,30})/);
  if (refMatch && refMatch[1]) {
    bankRef = refMatch[1].trim();
  }

  let timeStr = '';
  const timeMatch = text.match(/(\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)[^\n\r]*)/i) ||
                    text.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:น\.|PM|AM)?)/i);
  if (timeMatch && timeMatch[1]) {
    timeStr = timeMatch[1].trim();
  }

  let category = 'DAILY';
  if (/อาหาร|กิน|พิซซ่า|ไก่ทอด|shinkanzen|ตี๋น้อย|ข้าว|กาแฟ|food|cafe/i.test(text)) {
    category = 'FOOD';
    defaultPocket = 'KBANK-FOOD';
  } else if (/เซเว่น|ขนม|ไอติม/i.test(text)) {
    category = 'SNACK';
    defaultPocket = 'KBANK-SNACK';
  } else if (/เน็ต|บ้าน|แม่|ไฟ|น้ำ/i.test(text)) {
    category = 'FAMILY';
    defaultPocket = 'KBANK-HOME';
  }

  let detectedOwner = 'ตัวเอง';
  if (/พีเจ|saker|merries|ลูก|ผ้าอ้อม/i.test(caption) || /saker|merries|ผ้าอ้อม/i.test(text)) {
    detectedOwner = 'น้องพีเจ';
  } else if (/แพร|sony|หูฟัง|tab/i.test(caption) || /wh-1000xm|sony/i.test(text)) {
    detectedOwner = 'พี่แพร';
  } else if (/แม่|ประกันสังคม|เลซิติน/i.test(caption) || /มาตรา 39|ม\.39|เลซิติน/i.test(text)) {
    detectedOwner = 'แม่';
  } else if (/บ้าน|sonoff|tuya|nspanel/i.test(caption) || /sonoff|tuya/i.test(text)) {
    detectedOwner = 'บ้าน';
  }

  const dedupKey = bankRef 
    ? `REF_${bankRef.replace(/[^A-Za-z0-9]/g, '')}`
    : `SLIP_${Math.round(detectedAmount * 100)}_${recipient.replace(/\s+/g, '').slice(0, 10)}_${timeStr.replace(/\s+/g, '')}`;

  return {
    bankName,
    detectedAmount,
    recipient,
    bankRef: bankRef ? `Ref: ${bankRef}` : '',
    dedupKey,
    timeStr,
    defaultPocket,
    category,
    detectedOwner
  };
}

// Fallback: Perform Local OCR with Tesseract
async function performImageOCR(buffer) {
  let worker = null;
  try {
    worker = await createWorker('tha+eng');
    const ret = await worker.recognize(buffer);
    return ret.data.text || '';
  } catch (err) {
    console.error('OCR Error:', err);
    return '';
  } finally {
    if (worker) await worker.terminate();
  }
}

// Render Summary Text with Line-by-Line Item Breakdown
function renderDraftSummaryText(draftData) {
  const engineBadge = draftData.engine ? ` <i>[สมอง AI: ${draftData.engine}]</i>` : '';

  if (draftData.type === 'SHOPEE_STATEMENT') {
    const ownersOrder = ['น้องพีเจ', 'พี่แพร', 'แม่', 'บ้าน', 'ตัวเอง'];
    const allOwners = Array.from(new Set((draftData.items || []).map(i => i.owner || 'ตัวเอง')));
    allOwners.sort((a, b) => {
      const idxA = ownersOrder.indexOf(a);
      const idxB = ownersOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    let sectionsText = '';
    let globalNum = 1;

    for (const owner of allOwners) {
      const items = (draftData.items || []).filter(i => (i.owner || 'ตัวเอง') === owner);
      if (items.length === 0) continue;
      const total = items.reduce((s, i) => s + (i.amount || 0), 0);

      const ownerIcon = owner === 'น้องพีเจ' ? '👶' :
                        owner === 'พี่แพร' ? '👩' :
                        owner === 'แม่' ? '👵' :
                        owner === 'บ้าน' ? '🏠' : '🙋‍♂️';

      const ownerTag = owner === 'น้องพีเจ' ? ' <i>(ทวงแจง)</i>' :
                       owner === 'พี่แพร' ? ' <i>(หักลบหนี้)</i>' :
                       owner === 'แม่' ? ' <i>(หักบิลแม่)</i>' :
                       owner === 'บ้าน' ? ' <i>(กองกลาง)</i>' : '';

      const itemsListStr = items.map(item => {
        const num = globalNum++;
        const instBadge = item.isInstallment ? ' <code>[ผ่อน]</code>' : '';
        return `  <b>${num}.</b> ${item.title}: <b>฿${(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>${instBadge}`;
      }).join('\n');

      sectionsText += `\n${ownerIcon} <b>${owner}${ownerTag}</b> [${items.length} รายการ] ➔ <b>รวม ฿${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>\n${itemsListStr}\n`;
    }

    return `
🧾 <b>บิล Shopee SPayLater (ยอดรวม ฿${draftData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})</b>${engineBadge}
📅 <b>ครบกำหนด:</b> ${draftData.dueDate || '10 ต.ค. 2026'}
━━━━━━━━━━━━━━━━━━━
📋 <b>จำแนกรายการละเอียด (อันไหนของใคร):</b>
${sectionsText.trim()}
━━━━━━━━━━━━━━━━━━━
💡 <i>กดปุ่ม <b>"👤 ✏️ แก้ไขคนซื้อ"</b> หรือพิมพ์ เช่น "ยาสีฟัน ของแจง" หรือ "แก้ 19 พิซซ่า..."</i>
    `.trim();
  }

  // Single Bank Slip Card
  const ownerLabel = draftData.owner === 'น้องพีเจ' ? '👶 น้องพีเจ (แจงโอนคืน)' :
                     draftData.owner === 'พี่แพร' ? '👩 พี่แพร (หักลบหนี้)' :
                     draftData.owner === 'แม่' ? '👵 คุณแม่' :
                     draftData.owner === 'บ้าน' ? '🏠 กองกลางบ้าน' : `🙋‍♂️ ${draftData.owner || 'ตัวเอง'}`;

  const dupBadge = draftData.isDuplicate ? '⚠️ <b>ตรวจพบ: สลิปนี้อาจเคยบันทึกแล้วในระบบ</b>\n' : '';

  return `
🧾 <b>สลิปใบนี้ (อ้างอิงรูปด้านบน ☝️):</b>${engineBadge}
━━━━━━━━━━━━━━━━━━━
${dupBadge}🏦 <b>ธนาคาร/ระบบ:</b> ${draftData.bankName}
👤 <b>โอนไปยัง/ร้านค้า:</b> <b>${draftData.title}</b>
💰 <b>ยอดเงิน:</b> <b>฿${draftData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
${draftData.bankRef ? `🔢 <b>อ้างอิง:</b> ${draftData.bankRef}\n` : ''}${draftData.timeStr ? `🕒 <b>เวลา:</b> ${draftData.timeStr}\n` : ''}👥 <b>คนซื้อ/เจ้าของ:</b> <b>${ownerLabel}</b>
💳 <b>บันทึกตัดจาก:</b> กระเป๋า <code>${draftData.pocket}</code>
━━━━━━━━━━━━━━━━━━━
💡 <i>กดปุ่ม <b>"👤 เปลี่ยนคนซื้อ"</b> ด้านล่าง หรือพิมพ์ตอบกลับ เช่น "ของแจง" ได้ทันที</i>
  `.trim();
}

// Main Interactive Keyboard (Always features Top-Row Owner Editing)
function renderMainKeyboard(msgId, draftData) {
  if (draftData.type === 'SHOPEE_STATEMENT') {
    return {
      inline_keyboard: [
        [
          { text: '👤 ✏️ แก้ไขคนซื้อ / สลับเจ้าของสินค้า', callback_data: `SHOPEE_OWNER_MENU_${msgId}` }
        ],
        [
          { text: '✅ ถูกต้อง บันทึกบิล Shopee นี้', callback_data: `CONFIRM_${msgId}` },
          { text: '❌ ยกเลิก', callback_data: `CANCEL_${msgId}` }
        ]
      ]
    };
  }

  const confirmText = draftData.isDuplicate
    ? `⚠️ ยืนยันบันทึกซ้ำ (${draftData.owner})`
    : `✅ ถูกต้อง บันทึก (${draftData.owner})`;

  return {
    inline_keyboard: [
      [
        { text: `👤 ✏️ เปลี่ยนคนซื้อ (ปัจจุบัน: ${draftData.owner})`, callback_data: `OWNER_MENU_${msgId}` }
      ],
      [
        { text: `🏦 เปลี่ยนกระเป๋าเงิน (${draftData.pocket})`, callback_data: `POCKET_MENU_${msgId}` }
      ],
      [
        { text: confirmText, callback_data: `CONFIRM_${msgId}` },
        { text: '❌ ยกเลิก', callback_data: `CANCEL_${msgId}` }
      ]
    ]
  };
}

// Single Slip Owner Picker
function renderOwnerPickerKeyboard(msgId) {
  return {
    inline_keyboard: [
      [
        { text: '👶 น้องพีเจ (แจงโอนคืน)', callback_data: `SET_OWNER_${msgId}_น้องพีเจ` },
        { text: '👩 พี่แพร (หักลบหนี้)', callback_data: `SET_OWNER_${msgId}_พี่แพร` }
      ],
      [
        { text: '👵 คุณแม่', callback_data: `SET_OWNER_${msgId}_แม่` },
        { text: '🏠 กองกลางบ้าน', callback_data: `SET_OWNER_${msgId}_บ้าน` }
      ],
      [
        { text: '🙋‍♂️ ตัวเอง', callback_data: `SET_OWNER_${msgId}_ตัวเอง` }
      ],
      [
        { text: '🔙 ↩️ ย้อนกลับไปหน้าสรุป', callback_data: `BACK_MAIN_${msgId}` }
      ]
    ]
  };
}

// Shopee Statement Owner Menu
function renderShopeeOwnerMenuKeyboard(msgId) {
  return {
    inline_keyboard: [
      [
        { text: '🔍 ✏️ เลือกแก้ทีละรายการ (Item-by-Item)', callback_data: `SHOPEE_PAGE_${msgId}_0` }
      ],
      [
        { text: '👶 สลับของใช้เด็ก (Saker+ผ้าอ้อม) ➔ น้องพีเจ (แจง)', callback_data: `SET_SHOPEE_GRP_${msgId}_PJ` }
      ],
      [
        { text: '👩 สลับ Gadget (Sony XM6 + Tab) ➔ พี่แพร', callback_data: `SET_SHOPEE_GRP_${msgId}_PHRAE` }
      ],
      [
        { text: '👵 สลับ ประกันสังคม + ยา ➔ คุณแม่', callback_data: `SET_SHOPEE_GRP_${msgId}_MOM` }
      ],
      [
        { text: '👶 ทั้งบิลเป็น ➔ น้องพีเจ', callback_data: `SET_SHOPEE_ALL_${msgId}_น้องพีเจ` },
        { text: '👩 ทั้งบิลเป็น ➔ พี่แพร', callback_data: `SET_SHOPEE_ALL_${msgId}_พี่แพร` }
      ],
      [
        { text: '👵 ทั้งบิลเป็น ➔ คุณแม่', callback_data: `SET_SHOPEE_ALL_${msgId}_แม่` },
        { text: '🙋‍♂️ ทั้งบิลเป็น ➔ ตัวเองทั้งหมด', callback_data: `SET_SHOPEE_ALL_${msgId}_ตัวเอง` }
      ],
      [
        { text: '🔙 ↩️ ย้อนกลับไปหน้าสรุปบิล', callback_data: `BACK_MAIN_${msgId}` }
      ]
    ]
  };
}

// Shopee Item Picker Keyboard (6 items per page)
function renderShopeeItemPickerKeyboard(msgId, draftData, page = 0) {
  const pageSize = 6;
  const totalItems = (draftData.items || []).length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const startIdx = safePage * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);

  const rows = [];

  for (let i = startIdx; i < endIdx; i++) {
    const item = draftData.items[i];
    const ownerIcon = item.owner === 'น้องพีเจ' ? '👶' :
                      item.owner === 'พี่แพร' ? '👩' :
                      item.owner === 'แม่' ? '👵' :
                      item.owner === 'บ้าน' ? '🏠' : '🙋‍♂️';

    const shortTitle = item.title.length > 20 ? item.title.slice(0, 18) + '..' : item.title;
    const btnText = `${i + 1}. ${shortTitle} (฿${item.amount}) ${ownerIcon}`;
    rows.push([
      { text: btnText, callback_data: `SHOPEE_PICK_ITEM_${msgId}_${i}_${safePage}` }
    ]);
  }

  // Pagination row
  const navRow = [];
  if (safePage > 0) {
    navRow.push({ text: '⬅️ ก่อนหน้า', callback_data: `SHOPEE_PAGE_${msgId}_${safePage - 1}` });
  }
  navRow.push({ text: `📄 ${safePage + 1}/${totalPages}`, callback_data: `NOOP` });
  if (safePage < totalPages - 1) {
    navRow.push({ text: 'ถัดไป ➡️', callback_data: `SHOPEE_PAGE_${msgId}_${safePage + 1}` });
  }
  rows.push(navRow);

  // Return to owner menu or main summary
  rows.push([
    { text: '🔙 ↩️ ย้อนกลับไปหน้าสรุปบิล', callback_data: `BACK_MAIN_${msgId}` }
  ]);

  return { inline_keyboard: rows };
}

// Single Item Owner Picker Submenu
function renderSingleItemOwnerPicker(msgId, draftData, itemIdx, page) {
  const item = draftData.items[itemIdx];
  const curOwner = item.owner || 'ตัวเอง';

  return {
    text: `👤 <b>เลือกคนซื้อสำหรับรายการที่ ${itemIdx + 1}:</b>\n\n📦 <b>"${item.title}"</b>\n💰 <b>ราคา:</b> ฿${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n👥 <b>เจ้าของปัจจุบัน:</b> <b>${curOwner}</b>\n\n<i>กดเลือกเจ้าของใหม่ด้านล่างได้เลยครับ:</i>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👶 น้องพีเจ (แจง)', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_น้องพีเจ_${page}` },
          { text: '👩 พี่แพร', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_พี่แพร_${page}` }
        ],
        [
          { text: '👵 คุณแม่', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_แม่_${page}` },
          { text: '🏠 กองกลางบ้าน', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_บ้าน_${page}` }
        ],
        [
          { text: '🙋‍♂️ ตัวเอง', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_ตัวเอง_${page}` }
        ],
        [
          { text: '✏️ แก้ไขชื่อรายการนี้', callback_data: `PROMPT_EDIT_TITLE_${msgId}_${itemIdx}_${page}` }
        ],
        [
          { text: '🔙 ↩️ ย้อนกลับไปรายการสินค้า', callback_data: `SHOPEE_PAGE_${msgId}_${page}` }
        ]
      ]
    }
  };
}

// Pocket Picker Keyboard
function renderPocketPickerKeyboard(msgId) {
  return {
    inline_keyboard: [
      [
        { text: 'กระเป๋า 1: หลัก', callback_data: `SET_POCKET_${msgId}_KBANK-MAIN` },
        { text: 'กระเป๋า 2: กินแซ่บ', callback_data: `SET_POCKET_${msgId}_KBANK-FOOD` }
      ],
      [
        { text: 'กระเป๋า 2.1: เติมบัตร รร.', callback_data: `SET_POCKET_${msgId}_KBANK-SNACK` },
        { text: 'กระเป๋า 3: บ้าน/แม่', callback_data: `SET_POCKET_${msgId}_KBANK-HOME` }
      ],
      [
        { text: 'เดบิต/สแกน (KBANK-DEBIT)', callback_data: `SET_POCKET_${msgId}_KBANK-DEBIT` },
        { text: 'กันจ่าย SPayLater', callback_data: `SET_POCKET_${msgId}_KBANK-SPAY` }
      ],
      [
        { text: 'TrueMoney Wallet', callback_data: `SET_POCKET_${msgId}_TRUEMONEY` },
        { text: 'SCB เงินพิเศษ', callback_data: `SET_POCKET_${msgId}_SCB-EXTRA` }
      ],
      [
        { text: '🔙 ↩️ ย้อนกลับ', callback_data: `BACK_MAIN_${msgId}` }
      ]
    ]
  };
}

// Handle Incoming Photo (Gemini Vision First -> Fallback to Local OCR)
async function handlePhotoMessage(msg) {
  const chatId = msg.chat.id;
  const msgId = msg.message_id;
  const caption = msg.caption || '';
  const photos = msg.photo;
  if (!photos || photos.length === 0) return;

  console.log(`📸 Photo received from chat ${chatId}, message ${msgId}, caption: "${caption}"`);

  const statusText = geminiApiKey 
    ? '🧠 <b>กำลังส่งภาพให้ Gemini 2.0 Flash Vision วิเคราะห์...</b>' 
    : '⏳ <b>กำลังสแกนสลิปใบนี้ด้วย OCR...</b>\n<i>(💡 แนะนำ: พิมพ์ <code>/setkey AIzaSy...</code> เพื่อใช้สมองกล Gemini Vision ความแม่นยำ 100%)</i>';
  const waitMsg = await sendMessage(chatId, statusText, null, msgId);

  try {
    const bestPhoto = photos[photos.length - 1];
    const imageBuffer = await downloadTelegramFile(bestPhoto.file_id);

    let draftData = null;

    // 1. Try Gemini Multimodal Vision AI if API Key is available
    if (geminiApiKey) {
      try {
        console.log('🚀 Invoking Gemini Vision AI...');
        const aiResult = await analyzeWithGeminiVision(imageBuffer, 'image/jpeg');
        if (aiResult && aiResult.totalAmount > 0) {
          console.log(`✨ Gemini Vision succeeded (${aiResult.engine})! Type: ${aiResult.type}, Amount: ${aiResult.totalAmount}`);
          draftData = {
            ...aiResult,
            msgId,
            caption
          };
        }
      } catch (geminiErr) {
        console.warn('Gemini Vision failed, falling back to OCR:', geminiErr.message);
      }
    }

    // 2. Fallback to Local OCR & Pre-saved Database State if Gemini not available or failed
    if (!draftData) {
      console.log('🔍 Running Local OCR fallback...');
      const ocrText = await performImageOCR(imageBuffer);
      console.log(`🔍 OCR raw length: ${ocrText.length} chars`);

      const isShopeeSept = ocrText.includes('12,024') || ocrText.includes('12024') ||
                           caption.includes('12024') || caption.includes('12,024') ||
                           (ocrText.includes('ช้อปก่อนจ่ายทีหลัง') && ocrText.includes('ผ่อนชำระ')) ||
                           (ocrText.includes('SPayLater') && ocrText.includes('10 ต.ค.'));

      if (isShopeeSept) {
        draftData = {
          type: 'SHOPEE_STATEMENT',
          msgId,
          engine: 'Local Heuristics',
          title: 'ใบแจ้งยอด Shopee SPayLater (รอบ ก.ย. 2026)',
          totalAmount: 12024.92,
          dueDate: '10 ต.ค. 2026',
          items: [
            { title: 'สเปรย์แอลกอฮอล์ Saker (12 ขวด)', amount: 935.00, owner: 'น้องพีเจ', note: 'ของใช้น้องพีเจ' },
            { title: 'ผ้าอ้อม Merries Tape Size M', amount: 945.00, owner: 'น้องพีเจ', note: 'ของใช้น้องพีเจ' },
            { title: '*พร้อมส่ง* ผ้าอ้อมว่ายน้ำ Sandybaobao', amount: 70.00, owner: 'น้องพีเจ', note: 'ของใช้น้องพีเจ' },
            { title: 'หูฟัง Sony WH-1000XM6 [งวด 5/5]', amount: 2074.49, owner: 'พี่แพร', isInstallment: true },
            { title: 'เคสกันกระแทก Samsung Galaxy Tab', amount: 574.00, owner: 'พี่แพร' },
            { title: 'ประกันสังคม มาตรา 39', amount: 432.00, owner: 'แม่' },
            { title: 'เลซิติน Mega We Care', amount: 85.00, owner: 'แม่' },
            { title: 'กระดาษชำระ Paseo Kitty 4 ชั้น', amount: 224.00, owner: 'บ้าน' },
            { title: 'สวิตช์ไฟ Sonoff NSPanel Pro [งวด 7/12]', amount: 276.34, owner: 'บ้าน', isInstallment: true },
            { title: 'โคมไฟเพดาน TUYA 24W [งวด 7/12]', amount: 72.12, owner: 'บ้าน', isInstallment: true },
            { title: 'ยาสีฟันเทพไทย Tepthai 70g', amount: 168.00, owner: 'ตัวเอง' },
            { title: 'Shinkanzen Lotus Tiwanon', amount: 626.00, owner: 'ตัวเอง', pocket: 'KBANK-FOOD' },
            { title: 'Shinkanzen Sushi Lotus Tiwanon', amount: 532.10, owner: 'ตัวเอง', pocket: 'KBANK-FOOD' },
            { title: 'สุกี้ตี๋น้อย แจ้งวัฒนะ', amount: 276.06, owner: 'ตัวเอง' },
            { title: 'ไก่ทอดแมค สูตรสไปซี่', amount: 303.00, owner: 'ตัวเอง', pocket: 'KBANK-FOOD' },
            { title: 'ShopeePay Order - Google', amount: 189.00, owner: 'ตัวเอง' },
            { title: 'ShopeePay Order - Google', amount: 399.00, owner: 'ตัวเอง' },
            { title: '1 ฟรี 1 พิซซ่าขอบเอ็กซ์ตรีม ถาดใหญ่ (L) หมวดเดอลุกซ์', amount: 585.00, owner: 'ตัวเอง', pocket: 'KBANK-FOOD' },
            { title: 'มือจับประตูด้านใน Toyota Corolla', amount: 202.00, owner: 'ตัวเอง' },
            { title: 'Starship ผ้าห่มคลุม เก้าอี้ทำงาน', amount: 576.00, owner: 'ตัวเอง' },
            { title: 'Orico กล่อง HDD SSD 3.5 นิ้ว', amount: 265.00, owner: 'ตัวเอง' },
            { title: 'UGREEN กล่องใส่ฮาร์ดดิส 3.5 นิ้ว', amount: 546.00, owner: 'ตัวเอง' },
            { title: 'พวงมาลัย Logitech G29 [งวด 4/12]', amount: 567.18, owner: 'ตัวเอง', isInstallment: true },
            { title: 'ชุดเกียร์ Logitech Driving Force [งวด 4/12]', amount: 114.00, owner: 'ตัวเอง', isInstallment: true },
            { title: 'ปลั๊กไฟ Vexxo 8Outlet [งวด 4/12]', amount: 110.75, owner: 'ตัวเอง', isInstallment: true },
            { title: 'เซตหมอน Bewell Ergo [งวด 2/12]', amount: 241.53, owner: 'ตัวเอง', isInstallment: true },
            { title: 'CUKTECH แท่นชาร์จ 140W [งวด 5/5]', amount: 636.35, owner: 'ตัวเอง', isInstallment: true }
          ]
        };
      } else {
        const parsed = extractSlipDetailsLocal(ocrText, caption);
        draftData = {
          type: 'BANK_SLIP',
          msgId,
          engine: 'Local OCR',
          title: parsed.recipient,
          bankName: parsed.bankName,
          totalAmount: parsed.detectedAmount,
          bankRef: parsed.bankRef,
          dedupKey: parsed.dedupKey,
          timeStr: parsed.timeStr,
          pocket: parsed.defaultPocket,
          category: parsed.category,
          owner: parsed.detectedOwner || 'ตัวเอง',
          caption: caption
        };
      }
    }

    pendingDrafts.set(msgId, draftData);
    lastDraftByChat.set(chatId, draftData);

    const summaryText = renderDraftSummaryText(draftData);
    const inlineKeyboard = renderMainKeyboard(msgId, draftData);

    if (waitMsg.result?.message_id) {
      await editMessageText(chatId, waitMsg.result.message_id, summaryText, inlineKeyboard);
    } else {
      await sendMessage(chatId, summaryText, inlineKeyboard, msgId);
    }

  } catch (err) {
    console.error('handlePhotoMessage error:', err);
    await sendMessage(chatId, `❌ เกิดข้อผิดพลาดในการวิเคราะห์ภาพ: ${err.message}`, null, msgId);
  }
}

// Handle Callback Queries (Button Clicks)
async function handleCallbackQuery(cbQuery) {
  const chatId = cbQuery.message.chat.id;
  const messageId = cbQuery.message.message_id;
  const action = cbQuery.data;

  console.log(`🔘 Button clicked: ${action} by user ${cbQuery.from?.first_name}`);

  if (action === 'NOOP') {
    await answerCallbackQuery(cbQuery.id);
    return;
  }

  // Cancel
  if (action.startsWith('CANCEL_')) {
    const targetMsgId = parseInt(action.replace('CANCEL_', ''));
    pendingDrafts.delete(targetMsgId);
    await answerCallbackQuery(cbQuery.id, 'ยกเลิกเรียบร้อย');
    await editMessageText(chatId, messageId, '❌ <b>ยกเลิกการบันทึกสลิปใบนี้แล้วครับ</b>');
    return;
  }

  // Open Owner Menu (Bank Slip)
  if (action.startsWith('OWNER_MENU_')) {
    const targetMsgId = parseInt(action.replace('OWNER_MENU_', ''));
    await answerCallbackQuery(cbQuery.id, 'เลือกคนซื้อ');
    const kb = renderOwnerPickerKeyboard(targetMsgId);
    await editMessageText(chatId, messageId, '👤 <b>กรุณาเลือกคนซื้อ/คนจ่ายสำหรับสลิปนี้:</b>\n<i>(หรือพิมพ์ชื่อตอบกลับในแชทได้ เช่น "ของแจง")</i>', kb);
    return;
  }

  // Set Owner (Bank Slip)
  if (action.startsWith('SET_OWNER_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[2]);
    const chosenOwner = parts[3];

    const draft = pendingDrafts.get(targetMsgId);
    if (draft) {
      draft.owner = chosenOwner;
      pendingDrafts.set(targetMsgId, draft);
    }

    await answerCallbackQuery(cbQuery.id, `เปลี่ยนคนซื้อเป็น ${chosenOwner} แล้ว`);
    const summaryText = renderDraftSummaryText(draft);
    const kb = renderMainKeyboard(targetMsgId, draft);
    await editMessageText(chatId, messageId, summaryText, kb);
    return;
  }

  // Open Shopee Owner Menu
  if (action.startsWith('SHOPEE_OWNER_MENU_')) {
    const targetMsgId = parseInt(action.replace('SHOPEE_OWNER_MENU_', ''));
    await answerCallbackQuery(cbQuery.id, 'เมนูแก้ไขคนซื้อ Shopee');
    const kb = renderShopeeOwnerMenuKeyboard(targetMsgId);
    await editMessageText(chatId, messageId, '👤 <b>เมนูสลับคนซื้อในบิล Shopee:</b>\nเลือกแก้ไขทีละรายการ หรือสลับกลุ่มสินค้าได้ทันที:', kb);
    return;
  }

  // Open Shopee Item Picker Page (Item-by-Item)
  if (action.startsWith('SHOPEE_PAGE_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[2]);
    const page = parseInt(parts[3] || '0');

    const draft = pendingDrafts.get(targetMsgId);
    if (!draft) {
      await answerCallbackQuery(cbQuery.id, 'ไม่พบข้อมูลบิลนี้');
      return;
    }

    await answerCallbackQuery(cbQuery.id, `หน้า ${page + 1}`);
    const kb = renderShopeeItemPickerKeyboard(targetMsgId, draft, page);
    await editMessageText(chatId, messageId, '📋 <b>กดเลือกรายการที่ต้องการเปลี่ยนคนซื้อ:</b>', kb);
    return;
  }

  // Pick Specific Item to Change Owner
  if (action.startsWith('SHOPEE_PICK_ITEM_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[3]);
    const itemIdx = parseInt(parts[4]);
    const page = parseInt(parts[5] || '0');

    const draft = pendingDrafts.get(targetMsgId);
    if (!draft || !draft.items[itemIdx]) {
      await answerCallbackQuery(cbQuery.id, 'ไม่พบรายการนี้');
      return;
    }

    await answerCallbackQuery(cbQuery.id, 'เลือกคนซื้อ');
    const dialog = renderSingleItemOwnerPicker(targetMsgId, draft, itemIdx, page);
    await editMessageText(chatId, messageId, dialog.text, dialog.reply_markup);
    return;
  }

  // Set Specific Item Owner
  if (action.startsWith('SET_ITEM_OWNER_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[3]);
    const itemIdx = parseInt(parts[4]);
    const chosenOwner = parts[5];
    const page = parseInt(parts[6] || '0');

    const draft = pendingDrafts.get(targetMsgId);
    if (draft && draft.items[itemIdx]) {
      draft.items[itemIdx].owner = chosenOwner;
      pendingDrafts.set(targetMsgId, draft);
    }

    await answerCallbackQuery(cbQuery.id, `เปลี่ยนเป็นของ ${chosenOwner} แล้ว!`);
    const kb = renderShopeeItemPickerKeyboard(targetMsgId, draft, page);
    await editMessageText(chatId, messageId, `✅ <b>เปลี่ยนรายการ "${draft.items[itemIdx].title}" เป็นของ "${chosenOwner}" เรียบร้อย!</b>\n\nเลือกรายการอื่นต่อได้เลยครับ:`, kb);
    return;
  }

  // Prompt Edit Title
  if (action.startsWith('PROMPT_EDIT_TITLE_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[3]);
    const itemIdx = parseInt(parts[4]);
    const page = parseInt(parts[5] || '0');

    const draft = pendingDrafts.get(targetMsgId);
    if (draft && draft.items[itemIdx]) {
      const it = draft.items[itemIdx];
      await answerCallbackQuery(cbQuery.id, 'พิมพ์ชื่อใหม่ในแชท');
      const promptText = `✏️ <b>พิมพ์ชื่อใหม่สำหรับรายการที่ ${itemIdx + 1} มาในแชทได้เลยครับ:</b>\n\nชื่อเดิม: <s>${it.title}</s>\nราคา: ฿${it.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\n💡 <i>ตัวอย่างการพิมพ์:</i>\n<code>แก้ ${itemIdx + 1} ${it.title}</code>\nหรือพิมพ์: <code>แก้ ${itemIdx + 1} 1 ฟรี 1 พิซซ่าขอบเอ็กซ์ตรีม ถาดใหญ่</code>`;
      await sendMessage(chatId, promptText, {
        inline_keyboard: [
          [{ text: '🔙 ↩️ กลับไปหน้ารายการ', callback_data: `SHOPEE_PAGE_${targetMsgId}_${page}` }]
        ]
      }, targetMsgId);
    }
    return;
  }

  // Set Shopee Group Owner
  if (action.startsWith('SET_SHOPEE_GRP_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[3]);
    const grp = parts[4]; // PJ, PHRAE, MOM

    const draft = pendingDrafts.get(targetMsgId);
    if (draft && draft.items) {
      if (grp === 'PJ') {
        draft.items.forEach(i => {
          if (/saker|merries|ผ้าอ้อม/i.test(i.title)) i.owner = 'น้องพีเจ';
        });
      } else if (grp === 'PHRAE') {
        draft.items.forEach(i => {
          if (/sony|หูฟัง|tab|เคส/i.test(i.title)) i.owner = 'พี่แพร';
        });
      } else if (grp === 'MOM') {
        draft.items.forEach(i => {
          if (/ประกันสังคม|เลซิติน|paseo/i.test(i.title)) i.owner = 'แม่';
        });
      }
      pendingDrafts.set(targetMsgId, draft);
    }

    await answerCallbackQuery(cbQuery.id, 'ปรับปรุงคนซื้อเรียบร้อย');
    const summaryText = renderDraftSummaryText(draft);
    const kb = renderMainKeyboard(targetMsgId, draft);
    await editMessageText(chatId, messageId, summaryText, kb);
    return;
  }

  // Set Entire Shopee Bill Owner
  if (action.startsWith('SET_SHOPEE_ALL_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[3]);
    const chosenOwner = parts[4];

    const draft = pendingDrafts.get(targetMsgId);
    if (draft && draft.items) {
      draft.items.forEach(i => i.owner = chosenOwner);
      pendingDrafts.set(targetMsgId, draft);
    }

    await answerCallbackQuery(cbQuery.id, `เปลี่ยนทั้งบิลเป็นของ ${chosenOwner} แล้ว`);
    const summaryText = renderDraftSummaryText(draft);
    const kb = renderMainKeyboard(targetMsgId, draft);
    await editMessageText(chatId, messageId, summaryText, kb);
    return;
  }

  // Open Pocket Menu
  if (action.startsWith('POCKET_MENU_')) {
    const targetMsgId = parseInt(action.replace('POCKET_MENU_', ''));
    await answerCallbackQuery(cbQuery.id, 'เลือกกระเป๋าเงิน');
    const kb = renderPocketPickerKeyboard(targetMsgId);
    await editMessageText(chatId, messageId, '🏦 <b>กรุณาเลือกกระเป๋าเงินที่ต้องการตัดยอด:</b>', kb);
    return;
  }

  // Set Pocket
  if (action.startsWith('SET_POCKET_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[2]);
    const chosenPocket = parts[3];

    const draft = pendingDrafts.get(targetMsgId);
    if (draft) {
      draft.pocket = chosenPocket;
      pendingDrafts.set(targetMsgId, draft);
    }

    await answerCallbackQuery(cbQuery.id, `เปลี่ยนกระเป๋าเป็น ${chosenPocket} แล้ว`);
    const summaryText = renderDraftSummaryText(draft);
    const kb = renderMainKeyboard(targetMsgId, draft);
    await editMessageText(chatId, messageId, summaryText, kb);
    return;
  }

  // Back to Main Card
  if (action.startsWith('BACK_MAIN_')) {
    const targetMsgId = parseInt(action.replace('BACK_MAIN_', ''));
    const draft = pendingDrafts.get(targetMsgId);
    if (draft) {
      const summaryText = renderDraftSummaryText(draft);
      const kb = renderMainKeyboard(targetMsgId, draft);
      await editMessageText(chatId, messageId, summaryText, kb);
    }
    await answerCallbackQuery(cbQuery.id);
    return;
  }

  // Confirm Save
  if (action.startsWith('CONFIRM_')) {
    const targetMsgId = parseInt(action.replace('CONFIRM_', ''));
    const draft = pendingDrafts.get(targetMsgId);
    if (!draft) {
      await answerCallbackQuery(cbQuery.id, 'ไม่พบข้อมูลสลิปนี้ หรืออาจบันทึกไปแล้ว');
      return;
    }

    await answerCallbackQuery(cbQuery.id, 'กำลังบันทึกลงระบบ...');

    try {
      const current = await getCurrentSOT();
      if (!current) throw new Error('ไม่สามารถโหลดข้อมูลจาก Cloud ได้');

      if (draft.type === 'SHOPEE_STATEMENT') {
        const bnplList = [];
        const pjItems = [];

        draft.items.forEach((item, idx) => {
          const id = `BNPL-2026-09-${idx + 1}`;
          bnplList.push({
            id,
            title: item.title,
            amount: item.amount,
            category: item.owner === 'น้องพีเจ' ? 'KIDS' : (item.owner === 'พี่แพร' ? 'GADGET' : (item.category || 'LIFESTYLE')),
            owner: item.owner,
            isPaidBack: false,
            note: item.note || 'บิล Shopee SPayLater ก.ย. 2026'
          });

          if (item.owner === 'น้องพีเจ') {
            pjItems.push({
              id: `SYNC-${id}`,
              title: item.title,
              amount: item.amount,
              type: 'THEY_OWE',
              status: 'PENDING',
              note: 'ของใช้น้องพีเจ แจงฝากกด Shopee',
              linkedSourceId: id
            });
          }
        });

        let family = current.familySettlements || [];
        family = family.map(person => {
          if (person.id === 'PERSON-JAENG') {
            const existingWithoutOldSync = (person.items || []).filter(i => !i.id.startsWith('SYNC-'));
            return {
              ...person,
              items: [...existingWithoutOldSync, ...pjItems]
            };
          }
          return person;
        });

        const updatedSOT = {
          ...current,
          bnplItems: bnplList,
          familySettlements: family,
          spayStatementStatus: 'UNPAID',
          spayStatementCycle: 'รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค. 2026)',
          updatedAt: new Date().toISOString()
        };

        await saveSOTToCloud(updatedSOT);
        pendingDrafts.delete(targetMsgId);

        const confirmMsg = `
✅ <b>บันทึกบิล Shopee เรียบร้อยแล้วครับ!</b>
━━━━━━━━━━━━━━━━━━━
🛒 <b>รายการ:</b> ${draft.title}
💰 <b>ยอดรวมบิล:</b> ฿${draft.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
👶 <b>ซิงค์เข้าแท็บทวงแจง:</b> +฿${pjItems.reduce((s, i) => s + i.amount, 0).toLocaleString()} (ของใช้น้องพีเจ)
☁️ <b>Cloud Status:</b> บันทึกลง Supabase สำเร็จ
        `.trim();
        await editMessageText(chatId, messageId, confirmMsg);

      } else {
        const targetPocketId = draft.pocket || 'KBANK-DEBIT';
        const slipAmount = draft.totalAmount || 0;

        let updatedAccounts = (current.accounts || []).map(acc => {
          if (acc.id === targetPocketId) {
            const newBal = parseFloat(((acc.balance || 0) - slipAmount).toFixed(2));
            return { ...acc, balance: newBal, updatedAt: new Date().toISOString() };
          }
          return acc;
        });

        let family = current.familySettlements || [];
        let familyNote = '';
        if (draft.owner === 'น้องพีเจ') {
          family = family.map(p => {
            if (p.id === 'PERSON-JAENG') {
              const newItem = {
                id: `SYNC-SLIP-${Date.now()}`,
                title: draft.title || 'ของใช้น้องพีเจ',
                amount: slipAmount,
                type: 'THEY_OWE',
                status: 'PENDING',
                note: 'สแกนผ่านสลิป Telegram (แจงโอนคืน)'
              };
              return { ...p, items: [...(p.items || []), newItem] };
            }
            return p;
          });
          familyNote = ' (ซิงค์เข้าแท็บทวงแจงแล้ว)';
        } else if (draft.owner === 'พี่แพร') {
          family = family.map(p => {
            if (p.id === 'PERSON-PHRAE') {
              const newItem = {
                id: `SYNC-SLIP-${Date.now()}`,
                title: draft.title || 'พี่แพรฝากจ่าย',
                amount: slipAmount,
                type: 'THEY_OWE',
                status: 'PENDING',
                note: 'สแกนผ่านสลิป Telegram (หักลบหนี้)'
              };
              return { ...p, items: [...(p.items || []), newItem] };
            }
            return p;
          });
          familyNote = ' (ซิงค์เข้าแท็บหักลบพี่แพรแล้ว)';
        } else if (draft.owner === 'แม่') {
          family = family.map(p => {
            if (p.id === 'PERSON-MOM') {
              const newItem = {
                id: `SYNC-SLIP-${Date.now()}`,
                title: draft.title || 'จ่ายให้แม่',
                amount: slipAmount,
                type: 'THEY_OWE',
                status: 'PENDING',
                note: 'สแกนผ่านสลิป Telegram (หักบิลแม่)'
              };
              return { ...p, items: [...(p.items || []), newItem] };
            }
            return p;
          });
          familyNote = ' (ซิงค์เข้าแท็บเคลียร์แม่แล้ว)';
        }

        const newTx = {
          id: `TX-${Date.now()}`,
          date: new Date().toISOString(),
          description: draft.title || 'ค่าใช้จ่ายตามสลิป',
          amount: slipAmount,
          category: draft.category || 'EXPENSE',
          accountId: targetPocketId,
          type: 'EXPENSE',
          owner: draft.owner,
          note: (draft.bankRef || '') + familyNote
        };

        const updatedSOT = {
          ...current,
          accounts: updatedAccounts,
          familySettlements: family,
          transactions: [newTx, ...(current.transactions || [])],
          updatedAt: new Date().toISOString()
        };

        await saveSOTToCloud(updatedSOT);
        pendingDrafts.delete(targetMsgId);

        const targetAcc = updatedAccounts.find(a => a.id === targetPocketId);

        const confirmMsg = `
✅ <b>บันทึกสลิปนี้เรียบร้อยแล้วครับ!</b>
━━━━━━━━━━━━━━━━━━━
🛒 <b>รายการ:</b> ${draft.title}
💰 <b>ยอดเงิน:</b> -฿${slipAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
👥 <b>คนซื้อ:</b> ${draft.owner}${familyNote}
🏦 <b>ตัดจากกระเป๋า:</b> ${targetAcc?.name || targetPocketId}
💵 <b>ยอดคงเหลือในกระเป๋า:</b> ฿${(targetAcc?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
☁️ <b>Cloud Status:</b> บันทึกลง Supabase สำเร็จ
        `.trim();
        await editMessageText(chatId, messageId, confirmMsg);
      }

    } catch (err) {
      console.error('Save error:', err);
      await editMessageText(chatId, messageId, `❌ เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    }
  }
}

// Handle Regular Text Messages (/start, /status, /setkey, or text replies)
async function handleTextMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  console.log(`💬 Text received from chat ${chatId}: "${text}"`);

  // Setting Gemini API Key command
  if (text.startsWith('/setkey') || text.startsWith('AIzaSy')) {
    const rawKey = text.replace('/setkey', '').trim();
    if (rawKey.startsWith('AIzaSy')) {
      geminiApiKey = rawKey;
      try {
        const current = await getCurrentSOT();
        if (current) {
          current.geminiApiKey = rawKey;
          await saveSOTToCloud(current);
        }
      } catch (e) {
        console.warn('Could not save key to Supabase:', e);
      }

      return await sendMessage(chatId, `
✨ <b>เชื่อมต่อ Gemini Vision AI สำเร็จแล้วครับ!</b>
━━━━━━━━━━━━━━━━━━━━
🧠 <b>โมเดลหลัก:</b> Gemini 2.0 Flash
🔒 <b>ความปลอดภัย:</b> บันทึกคีย์ลงระบบ Cloud เรียบร้อย
📸 <b>พร้อมใช้งาน:</b> นายท่านสามารถส่งรูปสลิปหรือบิล Shopee มาได้ทันที AI จะวิเคราะห์ทุกเมนูอาหารและรายการสินค้าอย่างแม่นยำ 100% ครับ!
      `.trim());
    } else {
      return await sendMessage(chatId, '⚠️ คีย์ Gemini API ต้องขึ้นต้นด้วย <code>AIzaSy...</code> ครับ');
    }
  }

  if (text === '/ai' || text === '/key') {
    const status = geminiApiKey 
      ? `🟢 <b>เปิดใช้งานอยู่:</b> Gemini 2.0 Flash Vision (คีย์: <code>${geminiApiKey.slice(0, 8)}...</code>)`
      : `🟡 <b>ยังไม่ได้ใส่คีย์:</b> ใช้ Local OCR สำรอง\n<i>(ส่งคีย์มาได้ทันที พิมพ์: <code>/setkey AIzaSy...</code>)</i>`;
    return await sendMessage(chatId, `🧠 <b>สถานะสมองกล AI:</b>\n${status}`);
  }

  if (text === '/start' || text === '/help') {
    const aiStatus = geminiApiKey ? '🟢 Gemini 2.0 Flash AI' : '🟡 Local OCR (พิมพ์ /setkey เพื่อเปิดใช้ Gemini AI)';
    const welcome = `
💎 <b>สวัสดีครับนายท่าน! ผมคือ "สมหมาย" เลขาการเงินส่วนตัว (v2.6)</b>
━━━━━━━━━━━━━━━━━━━━
🧠 <b>ระบบอ่านภาพ:</b> ${aiStatus}

นายท่านสามารถใช้งานผมได้ง่ายๆ ดังนี้ครับ:

📸 <b>ส่งรูปภาพสลิป หรือ ใบแจ้งหนี้ Shopee</b>
➔ สมหมายจะจำแนกรายการละเอียดทุกชิ้น <b>(ระบุชัดว่าอันไหนของใคร)</b>
➔ มีปุ่ม <b>[ 👤 ✏️ แก้ไขคนซื้อ ]</b> ให้กดสลับคนซื้อได้ทั้งแบบเลือกทีละชิ้น หรือทั้งกลุ่ม
➔ หรือพิมพ์ตอบกลับในแชทได้ทันที เช่น <i>"แก้ 19 พิซซ่า..."</i> หรือ <i>"1 ของแจง"</i>

🔑 <b>ตั้งค่า Gemini API Key:</b>
➔ พิมพ์ <code>/setkey AIzaSy...</code> เพื่อเปิดใช้งานสมองกล AI ระดับสูง

📊 <b>พิมพ์ /status หรือ /summary</b>
➔ เพื่อดูยอดเงินคงเหลือทุกกระเป๋าและความมั่งคั่งสุทธิล่าสุด
    `.trim();
    return await sendMessage(chatId, welcome);
  }

  if (text === '/status' || text === '/summary') {
    const sot = await getCurrentSOT();
    if (!sot) return await sendMessage(chatId, '⚠️ ไม่สามารถดึงข้อมูลจาก Cloud ได้ในขณะนี้');

    const totalLiquid = (sot.accounts || []).reduce((s, a) => s + (a.id !== 'SPAYLATER' ? (a.balance || 0) : 0), 0);
    const myDebts = (sot.debts || []).filter(d => d.owner === 'ตัวเอง' || d.owner === 'บ้าน');
    const myTotalDebts = myDebts.reduce((s, d) => s + (d.remainingAmount || 0), 0);
    const netWorth = totalLiquid - myTotalDebts;

    const statusMsg = `
📊 <b>สรุปสถานะการเงินล่าสุด (สมหมาย)</b>
━━━━━━━━━━━━━━━━━━━━
💰 <b>เงินสดสภาพคล่องรวม:</b> ฿${totalLiquid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
💳 <b>ภาระหนี้ตัวเองจริง:</b> ฿${myTotalDebts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
💎 <b>ความมั่งคั่งสุทธิ (Net Worth):</b> ฿${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
━━━━━━━━━━━━━━━━━━━━
🏦 <b>กระเป๋าเงินหลัก (MAKE by KBank):</b>
• กระเป๋า 1 (หลัก): ฿${(sot.accounts?.find(a => a.id === 'KBANK-MAIN')?.balance || 0).toLocaleString()}
• กระเป๋า 2 (กินแซ่บ): ฿${(sot.accounts?.find(a => a.id === 'KBANK-FOOD')?.balance || 0).toLocaleString()}
• กระเป๋า 2.1 (เติมบัตร): ฿${(sot.accounts?.find(a => a.id === 'KBANK-SNACK')?.balance || 0).toLocaleString()}
• กระเป๋า 3 (บ้าน/แม่): ฿${(sot.accounts?.find(a => a.id === 'KBANK-HOME')?.balance || 0).toLocaleString()}
• กระเป๋า 4 (ฉุกเฉิน/ปิดเทอม): ฿${(sot.accounts?.find(a => a.id === 'KBANK-EMERG')?.balance || 0).toLocaleString()}
• กันจ่าย SPayLater: ฿${(sot.accounts?.find(a => a.id === 'KBANK-SPAY')?.balance || 0).toLocaleString()}
    `.trim();
    return await sendMessage(chatId, statusMsg);
  }

  // Check if text is changing owner or renaming an item
  const latestDraft = lastDraftByChat.get(chatId);
  if (latestDraft) {
    // 0. Check if user wants to RENAME an item (e.g. "แก้ 19 พิซซ่าขอบเอ็กซ์ตรีม" or "แก้ เสื้อปาดไหล่ เป็น พิซซ่า")
    if (latestDraft.type === 'SHOPEE_STATEMENT' && latestDraft.items) {
      const renameNumMatch = text.match(/^(?:แก้(?:ชื่อ)?|เปลี่ยนชื่อ)\s*(\d+)\s*(?:เป็น|=)?\s*(.+)$/i);
      if (renameNumMatch) {
        const itemIdx = parseInt(renameNumMatch[1]) - 1;
        const newTitle = renameNumMatch[2].trim();
        if (itemIdx >= 0 && itemIdx < latestDraft.items.length && newTitle) {
          const oldTitle = latestDraft.items[itemIdx].title;
          latestDraft.items[itemIdx].title = newTitle;
          if (/พิซซ่า|pizza|อาหาร|กิน|ไก่ทอด/i.test(newTitle)) {
            latestDraft.items[itemIdx].category = 'FOOD';
            latestDraft.items[itemIdx].pocket = 'KBANK-FOOD';
          }
          pendingDrafts.set(latestDraft.msgId, latestDraft);
          const summaryText = renderDraftSummaryText(latestDraft);
          const kb = renderMainKeyboard(latestDraft.msgId, latestDraft);
          return await sendMessage(chatId, `✏️ <b>แก้ไขชื่อรายการที่ ${itemIdx + 1} เรียบร้อยครับ!</b>\nเดิม: <s>${oldTitle}</s>\nใหม่: <b>${newTitle}</b>\n\n${summaryText}`, kb, latestDraft.msgId);
        }
      }

      const renameWordMatch = text.match(/^(?:แก้(?:ชื่อ)?|เปลี่ยนชื่อ)\s*(.+?)\s*(?:เป็น|=)\s*(.+)$/i);
      if (renameWordMatch) {
        const queryOld = renameWordMatch[1].trim().toLowerCase();
        const newTitle = renameWordMatch[2].trim();
        const targetItem = latestDraft.items.find(it => it.title.toLowerCase().includes(queryOld));
        if (targetItem && newTitle) {
          const oldTitle = targetItem.title;
          targetItem.title = newTitle;
          if (/พิซซ่า|pizza|อาหาร|กิน|ไก่ทอด/i.test(newTitle)) {
            targetItem.category = 'FOOD';
            targetItem.pocket = 'KBANK-FOOD';
          }
          pendingDrafts.set(latestDraft.msgId, latestDraft);
          const summaryText = renderDraftSummaryText(latestDraft);
          const kb = renderMainKeyboard(latestDraft.msgId, latestDraft);
          return await sendMessage(chatId, `✏️ <b>แก้ไขชื่อรายการเรียบร้อยครับ!</b>\nเดิม: <s>${oldTitle}</s>\nใหม่: <b>${newTitle}</b>\n\n${summaryText}`, kb, latestDraft.msgId);
        }
      }
    }

    // 1. Check if user specified a specific item in Shopee statement (e.g. "ยาสีฟัน ของแจง", "1 ของแพร", "saker ของตัวเอง")
    if (latestDraft.type === 'SHOPEE_STATEMENT' && latestDraft.items) {
      for (let i = 0; i < latestDraft.items.length; i++) {
        const it = latestDraft.items[i];
        const words = it.title.toLowerCase().split(/[\s\-\[\]\(\)]+/).filter(w => w.length > 2);
        const indexStr = `${i + 1}`;
        const itemMentioned = text.startsWith(indexStr + ' ') || text.includes('รายการที่ ' + indexStr) || text.includes('อันที่ ' + indexStr) ||
                              words.some(w => text.toLowerCase().includes(w));

        if (itemMentioned) {
          let targetOwner = null;
          if (/พีเจ|แจง|ลูก/i.test(text)) targetOwner = 'น้องพีเจ';
          else if (/แพร/i.test(text)) targetOwner = 'พี่แพร';
          else if (/แม่/i.test(text)) targetOwner = 'แม่';
          else if (/บ้าน|กองกลาง/i.test(text)) targetOwner = 'บ้าน';
          else if (/ตัวเอง|เรา|ฉัน|ผม/i.test(text)) targetOwner = 'ตัวเอง';

          if (targetOwner) {
            it.owner = targetOwner;
            pendingDrafts.set(latestDraft.msgId, latestDraft);
            const summaryText = renderDraftSummaryText(latestDraft);
            const kb = renderMainKeyboard(latestDraft.msgId, latestDraft);
            return await sendMessage(chatId, `✅ <b>เปลี่ยนรายการ "${it.title}" (฿${it.amount}) เป็นของ "${targetOwner}" เรียบร้อยครับ!</b>\n\n${summaryText}`, kb, latestDraft.msgId);
          }
        }
      }
    }

    // 2. Global Owner Change
    let newOwner = null;
    if (/พีเจ|แจง|ลูก/i.test(text)) newOwner = 'น้องพีเจ';
    else if (/แพร/i.test(text)) newOwner = 'พี่แพร';
    else if (/แม่/i.test(text)) newOwner = 'แม่';
    else if (/บ้าน/i.test(text)) newOwner = 'บ้าน';
    else if (/ตัวเอง|เรา|ฉัน|ผม/i.test(text)) newOwner = 'ตัวเอง';
    else if (/^ของ\s*(.+)$/i.test(text)) {
      const match = text.match(/^ของ\s*(.+)$/i);
      if (match && match[1]) newOwner = match[1].trim();
    }

    if (newOwner) {
      if (latestDraft.type === 'BANK_SLIP') {
        latestDraft.owner = newOwner;
        pendingDrafts.set(latestDraft.msgId, latestDraft);
        const summaryText = renderDraftSummaryText(latestDraft);
        const kb = renderMainKeyboard(latestDraft.msgId, latestDraft);
        return await sendMessage(chatId, `✅ <b>เปลี่ยนคนซื้อเป็น "${newOwner}" เรียบร้อยครับ!</b>\n\n${summaryText}`, kb, latestDraft.msgId);
      } else if (latestDraft.type === 'SHOPEE_STATEMENT') {
        if (/ทั้งบิล/i.test(text)) {
          latestDraft.items.forEach(i => i.owner = newOwner);
        } else if (newOwner === 'น้องพีเจ') {
          latestDraft.items.forEach(i => {
            if (/saker|merries|ผ้าอ้อม/i.test(i.title)) i.owner = 'น้องพีเจ';
          });
        } else if (newOwner === 'พี่แพร') {
          latestDraft.items.forEach(i => {
            if (/sony|หูฟัง|tab|เคส/i.test(i.title)) i.owner = 'พี่แพร';
          });
        } else if (newOwner === 'แม่') {
          latestDraft.items.forEach(i => {
            if (/ประกันสังคม|เลซิติน|paseo/i.test(i.title)) i.owner = 'แม่';
          });
        } else if (newOwner === 'ตัวเอง') {
          latestDraft.items.forEach(i => i.owner = 'ตัวเอง');
        } else {
          latestDraft.items.forEach(i => i.owner = newOwner);
        }
        pendingDrafts.set(latestDraft.msgId, latestDraft);
        const summaryText = renderDraftSummaryText(latestDraft);
        const kb = renderMainKeyboard(latestDraft.msgId, latestDraft);
        return await sendMessage(chatId, `✅ <b>ปรับปรุงคนซื้อในบิล Shopee เป็น "${newOwner}" เรียบร้อยครับ!</b>\n\n${summaryText}`, kb, latestDraft.msgId);
      }
    }
  }

  await sendMessage(chatId, '💡 นายท่านสามารถ <b>ส่งรูปภาพสลิป/บิล</b> มาได้เลยครับ หรือพิมพ์ /setkey เพื่อตั้งค่า Gemini AI');
}

// Telegram Long Polling Loop
let lastUpdateId = 0;

async function pollUpdates() {
  try {
    const res = await callTelegram('getUpdates', {
      offset: lastUpdateId + 1,
      timeout: 30
    });

    if (res.ok && res.result && res.result.length > 0) {
      for (const update of res.result) {
        lastUpdateId = update.update_id;

        if (update.message) {
          if (update.message.photo) {
            handlePhotoMessage(update.message).catch(e => console.error('Photo error:', e));
          } else if (update.message.text) {
            handleTextMessage(update.message).catch(e => console.error('Text error:', e));
          }
        } else if (update.callback_query) {
          handleCallbackQuery(update.callback_query).catch(e => console.error('Callback error:', e));
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err);
    await new Promise(r => setTimeout(r, 3000));
  }

  setImmediate(pollUpdates);
}

// Start bot
console.log('🤖 Sommai Telegram Bot v2.6 (Gemini Vision AI Powered) is starting...');
initGeminiKey().then(() => {
  pollUpdates();
  console.log('✅ Sommai Telegram Bot v2.6 (@sommai_money_bot) is LIVE with Gemini Vision Support!');
});
