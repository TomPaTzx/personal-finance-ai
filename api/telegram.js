/**
 * Sommai Telegram Bot - 24/7 Cloud Serverless Webhook Handler (Vercel)
 * Powered by Gemini 2.5 Flash Multimodal Vision AI + Supabase Cloud SOT
 */
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = '8719597880:AAGEjzdCn4JKUnnV2iKUnyzmQB2_kfJve4g';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const SUPABASE_URL = 'https://neflzvrowmjkgixaejzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory cache per lambda instance + Cloud persistence
const localDraftsCache = new Map();

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

// Telegram Helpers
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

async function answerCallbackQuery(callbackQueryId, text = '') {
  return await callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text
  });
}

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

// Supabase Cloud SOT Helpers
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

async function saveSOTToCloud(sotData) {
  const now = new Date().toISOString();
  await supabase
    .from('app_state')
    .upsert({ id: 'CURRENT_SOT', data: sotData, updated_at: now });
  await supabase
    .from('app_state')
    .upsert({ id: 'SOT_2026-09', data: sotData, updated_at: now });
}

// Persistent Draft Management in Supabase (Stateless Serverless Safe)
async function saveDraft(msgId, draftData) {
  localDraftsCache.set(String(msgId), draftData);
  try {
    await supabase.from('app_state').upsert({
      id: `BOT_DRAFT_${msgId}`,
      data: draftData,
      updated_at: new Date().toISOString()
    });
    if (draftData.chatId) {
      await supabase.from('app_state').upsert({
        id: `BOT_LATEST_${draftData.chatId}`,
        data: draftData,
        updated_at: new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn('Error saving draft to cloud:', e.message);
  }
}

async function getDraft(msgId) {
  const cached = localDraftsCache.get(String(msgId));
  if (cached) return cached;
  try {
    const { data } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', `BOT_DRAFT_${msgId}`)
      .single();
    if (data?.data) {
      localDraftsCache.set(String(msgId), data.data);
      return data.data;
    }
  } catch (e) {}
  return null;
}

async function getLatestDraftByChat(chatId) {
  try {
    const { data } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', `BOT_LATEST_${chatId}`)
      .single();
    return data?.data || null;
  } catch (e) {
    return null;
  }
}

async function deleteDraft(msgId) {
  localDraftsCache.delete(String(msgId));
  try {
    await supabase.from('app_state').delete().eq('id', `BOT_DRAFT_${msgId}`);
  } catch (e) {}
}

// Gemini API Key Resolver
async function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
  try {
    const { data } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 'CURRENT_SOT')
      .single();
    if (data?.data?.geminiApiKey) return data.data.geminiApiKey;
  } catch (e) {}
  return '';
}

// Gemini 2.5 Flash Vision Multimodal Analyzer
async function analyzeWithGeminiVision(imageBuffer, mimeType = 'image/jpeg') {
  const geminiApiKey = await getGeminiApiKey();
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
     * กฎการตรวจจับ "รายการผ่อน" vs "ช้อปก่อนจ่ายทีหลัง":
       - หากชื่อสินค้ามีสัญลักษณ์ [X/Y] เช่น [1/12], [5/5], [4/12], [2/12], [7/12] นำหน้าหรืออยู่ในชื่อ:
         * isInstallment = true
         * paymentType = "INSTALLMENT"
         * installmentInfo = "งวด X/Y" (เช่น "งวด 1/12", "งวด 5/5")
         * title = ชื่อสินค้าเต็มที่มี [งวด X/Y] เช่น "[1/12] พวงมาลัย Logitech" หรือ "หูฟัง Sony WH-1000XM6 [งวด 5/5]"
       - หากไม่มีสัญลักษณ์ [X/Y] (เช่น ซื้อของกิน, ของใช้, สเปรย์ Saker, ผ้าอ้อม, ยาสีฟัน):
         * isInstallment = false
         * paymentType = "BNPL_PAY_LATER" (ช้อปก่อนจ่ายทีหลัง จ่ายงวดเดียวเดือนหน้า)
         * installmentInfo = null
     * amount: ยอดเงินของสินค้านั้น
     * owner: พิจารณาตามบริบท:
       - "น้องพีเจ": ของใช้เด็ก/ลูก เช่น Saker, Merries, ผ้าอ้อม, นม, ทิชชู่เปียก
       - "พี่แพร": หูฟัง Sony, เคส Tab, ของฝากซื้อ
       - "แม่" หรือ "บ้าน": ประกันสังคม ม.39, ยาบำรุง, ของใช้ส่วนรวม
       - "ตัวเอง": อาหาร (พิซซ่า, ไก่ทอด, ซูชิ), ของใช้ส่วนตัว
     * category: "FOOD" | "KIDS" | "GADGET" | "LIFESTYLE" | "HOME" | "HEALTH"

2. หากเป็นสลิปโอนเงินธนาคาร (KBank, SCB, KTB, TrueMoney):
   - type = "BANK_SLIP"
   - bankName: ชื่อธนาคาร เช่น "กสิกรไทย (KBank)", "ไทยพาณิชย์ (SCB)"
   - recipient: ชื่อผู้รับเงิน / ร้านค้า
   - purpose: ระบุวัตถุประสงค์ให้ชัดเจนว่า "เป็นการโอนค่าใช้จ่ายอะไร" เช่น "ค่าอาหาร (สุกี้ตี๋น้อย)", "ของใช้น้องพีเจ", "โอนเงินให้แม่", "ค่าขนม/เติมบัตร รร.", "ค่าของใช้ทั่วไป"
   - totalAmount: ยอดเงินที่โอน (ตัวเลข)
   - bankRef: รหัสอ้างอิงธุรกรรม
   - timeStr: วันที่และเวลาในสลิป
   - pocket: "KBANK-FOOD" (หากเป็นค่าอาหาร/ของกิน), "KBANK-SNACK" (ขนม/เติมบัตรรร.), "KBANK-HOME" (โอนให้แม่/บ้าน), "KBANK-DEBIT" (ทั่วไป)
   - owner: "ตัวเอง", "น้องพีเจ", "พี่แพร", "แม่", หรือ "บ้าน"

ตอบกลับเป็น JSON เท่านั้นตามโครงสร้าง:
{
  "type": "SHOPEE_STATEMENT" หรือ "BANK_SLIP",
  "title": "ชื่อหัวข้อ",
  "totalAmount": 0.00,
  "dueDate": "10 ต.ค. 2026",
  "bankName": "ชื่อธนาคาร",
  "recipient": "ชื่อผู้รับ/ร้านค้า",
  "purpose": "วัตถุประสงค์การโอน",
  "bankRef": "รหัสอ้างอิง",
  "timeStr": "วันเวลา",
  "pocket": "KBANK-DEBIT",
  "owner": "ตัวเอง",
  "items": [
    { 
      "title": "ชื่อสินค้า", 
      "amount": 0.00, 
      "owner": "ตัวเอง", 
      "category": "FOOD", 
      "isInstallment": false,
      "paymentType": "BNPL_PAY_LATER",
      "installmentInfo": null 
    }
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

        // Post-processing Regex Safety Net for Shopee [X/Y] Installments
        if (parsed.items && Array.isArray(parsed.items)) {
          parsed.items.forEach(item => {
            const instMatch = (item.title || '').match(/\[?(\d+)\s*\/\s*(\d+)\]?/);
            if (instMatch) {
              item.isInstallment = true;
              item.paymentType = 'INSTALLMENT';
              item.installmentInfo = `งวด ${instMatch[1]}/${instMatch[2]}`;
              if (!item.title.includes(`[งวด ${instMatch[1]}/${instMatch[2]}]`) && !item.title.startsWith(`[${instMatch[1]}/${instMatch[2]}]`)) {
                item.title = `${item.title} [งวด ${instMatch[1]}/${instMatch[2]}]`;
              }
            } else if (!item.isInstallment) {
              item.paymentType = 'BNPL_PAY_LATER';
              item.installmentInfo = null;
            }
          });
        }

        return parsed;
      }
    } catch (e) {
      console.warn(`Gemini Vision error on model ${model}:`, e.message);
    }
  }

  return null;
}

// UI Renderers
function renderDraftSummaryText(draftData) {
  const engineBadge = draftData.engine ? ` <i>[สมองกล: ${draftData.engine}]</i>` : '';

  if (draftData.type === 'SHOPEE_STATEMENT') {
    const itemsByOwner = {};
    (draftData.items || []).forEach(item => {
      const o = item.owner || 'ตัวเอง';
      if (!itemsByOwner[o]) itemsByOwner[o] = [];
      itemsByOwner[o].push(item);
    });

    const ownerOrder = ['น้องพีเจ', 'พี่แพร', 'แม่', 'บ้าน', 'ตัวเอง'];
    let sectionsText = '';

    for (const owner of ownerOrder) {
      const items = itemsByOwner[owner];
      if (!items || items.length === 0) continue;

      const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);
      const ownerIcon = owner === 'น้องพีเจ' ? '👶' :
                        owner === 'พี่แพร' ? '👩' :
                        owner === 'แม่' ? '👵' :
                        owner === 'บ้าน' ? '🏠' : '🙋‍♂️';
      const ownerTag = owner === 'น้องพีเจ' ? ' (แจงโอนคืน)' :
                       owner === 'พี่แพร' ? ' (หักลบหนี้)' : '';

      const itemsListStr = items.map(i => {
        let badge = '';
        if (i.isInstallment || i.paymentType === 'INSTALLMENT') {
          badge = ` 🏷️[${i.installmentInfo || 'ผ่อน'}]`;
        } else {
          badge = ' 🛍️[ช้อปก่อนจ่าย]';
        }
        return `   • ${i.title}${badge} ➔ ฿${i.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
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
  const purposeLine = draftData.purpose ? `🎯 <b>วัตถุประสงค์:</b> <b>${draftData.purpose}</b>\n` : '';

  return `
🧾 <b>สลิปโอนเงิน (อ้างอิงรูปด้านบน ☝️):</b>${engineBadge}
━━━━━━━━━━━━━━━━━━━
${dupBadge}🏦 <b>ธนาคาร/ระบบ:</b> ${draftData.bankName}
👤 <b>โอนไปยัง/ร้านค้า:</b> <b>${draftData.title || draftData.recipient || 'ร้านค้า'}</b>
${purposeLine}💰 <b>ยอดเงิน:</b> <b>฿${draftData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
${draftData.bankRef ? `🔢 <b>อ้างอิง:</b> ${draftData.bankRef}\n` : ''}${draftData.timeStr ? `🕒 <b>เวลา:</b> ${draftData.timeStr}\n` : ''}👥 <b>คนซื้อ/เจ้าของ:</b> <b>${ownerLabel}</b>
💳 <b>บันทึกตัดจาก:</b> กระเป๋า <code>${draftData.pocket}</code>
━━━━━━━━━━━━━━━━━━━
💡 <i>กดปุ่ม <b>"👤 เปลี่ยนคนซื้อ"</b> ด้านล่าง หรือพิมพ์ตอบกลับ เช่น "ของแจง" ได้ทันที</i>
  `.trim();
}

function renderMainKeyboard(msgId, draftData) {
  if (draftData.type === 'SHOPEE_STATEMENT') {
    return {
      inline_keyboard: [
        [{ text: '👤 ✏️ แก้ไขคนซื้อ / สลับเจ้าของสินค้า', callback_data: `SHOPEE_OWNER_MENU_${msgId}` }],
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
      [{ text: `👤 ✏️ เปลี่ยนคนซื้อ (ปัจจุบัน: ${draftData.owner})`, callback_data: `OWNER_MENU_${msgId}` }],
      [{ text: `🏦 เปลี่ยนกระเป๋าเงิน (${draftData.pocket})`, callback_data: `POCKET_MENU_${msgId}` }],
      [
        { text: confirmText, callback_data: `CONFIRM_${msgId}` },
        { text: '❌ ยกเลิก', callback_data: `CANCEL_${msgId}` }
      ]
    ]
  };
}

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
      [{ text: '🙋‍♂️ ตัวเอง', callback_data: `SET_OWNER_${msgId}_ตัวเอง` }],
      [{ text: '🔙 ↩️ ย้อนกลับไปหน้าสรุป', callback_data: `BACK_MAIN_${msgId}` }]
    ]
  };
}

function renderShopeeOwnerMenuKeyboard(msgId) {
  return {
    inline_keyboard: [
      [{ text: '🔍 ✏️ เลือกแก้ทีละรายการ (Item-by-Item)', callback_data: `SHOPEE_PAGE_${msgId}_0` }],
      [{ text: '👶 สลับของใช้เด็ก (Saker+ผ้าอ้อม) ➔ น้องพีเจ (แจง)', callback_data: `SET_SHOPEE_GRP_${msgId}_PJ` }],
      [{ text: '👩 สลับ Gadget (Sony XM6 + Tab) ➔ พี่แพร', callback_data: `SET_SHOPEE_GRP_${msgId}_PHRAE` }],
      [{ text: '👵 สลับ ประกันสังคม + ยา ➔ คุณแม่', callback_data: `SET_SHOPEE_GRP_${msgId}_MOM` }],
      [
        { text: '👶 ทั้งบิลเป็น ➔ น้องพีเจ', callback_data: `SET_SHOPEE_ALL_${msgId}_น้องพีเจ` },
        { text: '👩 ทั้งบิลเป็น ➔ พี่แพร', callback_data: `SET_SHOPEE_ALL_${msgId}_พี่แพร` }
      ],
      [
        { text: '👵 ทั้งบิลเป็น ➔ คุณแม่', callback_data: `SET_SHOPEE_ALL_${msgId}_แม่` },
        { text: '🙋‍♂️ ทั้งบิลเป็น ➔ ตัวเองทั้งหมด', callback_data: `SET_SHOPEE_ALL_${msgId}_ตัวเอง` }
      ],
      [{ text: '🔙 ↩️ ย้อนกลับไปหน้าสรุปบิล', callback_data: `BACK_MAIN_${msgId}` }]
    ]
  };
}

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
    rows.push([{ text: btnText, callback_data: `SHOPEE_PICK_ITEM_${msgId}_${i}_${safePage}` }]);
  }

  const navRow = [];
  if (safePage > 0) {
    navRow.push({ text: '⬅️ ก่อนหน้า', callback_data: `SHOPEE_PAGE_${msgId}_${safePage - 1}` });
  }
  navRow.push({ text: `📄 หน้า ${safePage + 1}/${totalPages}`, callback_data: 'NOOP' });
  if (safePage < totalPages - 1) {
    navRow.push({ text: 'ถัดไป ➡️', callback_data: `SHOPEE_PAGE_${msgId}_${safePage + 1}` });
  }
  rows.push(navRow);
  rows.push([{ text: '🔙 ↩️ ย้อนกลับไปหน้าสรุปบิล', callback_data: `BACK_MAIN_${msgId}` }]);

  return { inline_keyboard: rows };
}

function renderSingleItemOwnerPicker(msgId, draftData, itemIdx, page = 0) {
  const item = draftData.items[itemIdx];
  const title = `✏️ <b>เลือกคนซื้อสำหรับรายการที่ ${itemIdx + 1}:</b>\n\n<b>${item.title}</b>\n💰 ยอด: <b>฿${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>\n👤 ปัจจุบัน: <b>${item.owner}</b>`;

  return {
    text: title,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👶 น้องพีเจ (แจงโอนคืน)', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_น้องพีเจ_${page}` },
          { text: '👩 พี่แพร (หักลบหนี้)', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_พี่แพร_${page}` }
        ],
        [
          { text: '👵 คุณแม่', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_แม่_${page}` },
          { text: '🏠 กองกลางบ้าน', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_บ้าน_${page}` }
        ],
        [{ text: '🙋‍♂️ ตัวเอง', callback_data: `SET_ITEM_OWNER_${msgId}_${itemIdx}_ตัวเอง_${page}` }],
        [{ text: '🔙 ↩️ ย้อนกลับไปรายการสินค้า', callback_data: `SHOPEE_PAGE_${msgId}_${page}` }]
      ]
    }
  };
}

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
      [{ text: '🔙 ↩️ ย้อนกลับ', callback_data: `BACK_MAIN_${msgId}` }]
    ]
  };
}

// Handlers
async function handlePhotoMessage(msg) {
  const chatId = msg.chat.id;
  const msgId = msg.message_id;
  const caption = msg.caption || '';
  const photos = msg.photo;
  if (!photos || photos.length === 0) return;

  const waitMsg = await sendMessage(chatId, '🧠 <b>กำลังส่งภาพให้ Gemini 2.5 Flash Vision วิเคราะห์ (24/7 Cloud)...</b>', null, msgId);

  try {
    const bestPhoto = photos[photos.length - 1];
    const imageBuffer = await downloadTelegramFile(bestPhoto.file_id);

    let draftData = await analyzeWithGeminiVision(imageBuffer, 'image/jpeg');
    if (!draftData || !draftData.totalAmount) {
      throw new Error('ไม่สามารถวิเคราะห์ข้อมูลจากภาพนี้ได้ กรุณาลองใหม่อีกครั้ง');
    }

    draftData = {
      ...draftData,
      msgId,
      chatId,
      caption
    };

    await saveDraft(msgId, draftData);

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

async function handleCallbackQuery(cbQuery) {
  const chatId = cbQuery.message.chat.id;
  const messageId = cbQuery.message.message_id;
  const action = cbQuery.data;

  if (action === 'NOOP') {
    await answerCallbackQuery(cbQuery.id);
    return;
  }

  // Cancel
  if (action.startsWith('CANCEL_')) {
    const targetMsgId = parseInt(action.replace('CANCEL_', ''));
    await deleteDraft(targetMsgId);
    await answerCallbackQuery(cbQuery.id, 'ยกเลิกเรียบร้อย');
    await editMessageText(chatId, messageId, '❌ <b>ยกเลิกการบันทึกสลิปใบนี้แล้วครับ</b>');
    return;
  }

  // Owner Menu (Single Slip)
  if (action.startsWith('OWNER_MENU_')) {
    const targetMsgId = parseInt(action.replace('OWNER_MENU_', ''));
    await answerCallbackQuery(cbQuery.id, 'เลือกคนซื้อ');
    const kb = renderOwnerPickerKeyboard(targetMsgId);
    await editMessageText(chatId, messageId, '👤 <b>กรุณาเลือกคนซื้อ/คนจ่ายสำหรับสลิปนี้:</b>\n<i>(หรือพิมพ์ชื่อตอบกลับในแชทได้ เช่น "ของแจง")</i>', kb);
    return;
  }

  // Set Owner (Single Slip)
  if (action.startsWith('SET_OWNER_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[2]);
    const chosenOwner = parts[3];

    const draft = await getDraft(targetMsgId);
    if (draft) {
      draft.owner = chosenOwner;
      await saveDraft(targetMsgId, draft);
      await answerCallbackQuery(cbQuery.id, `เปลี่ยนคนซื้อเป็น ${chosenOwner} แล้ว`);
      const summaryText = renderDraftSummaryText(draft);
      const kb = renderMainKeyboard(targetMsgId, draft);
      await editMessageText(chatId, messageId, summaryText, kb);
    }
    return;
  }

  // Shopee Owner Menu
  if (action.startsWith('SHOPEE_OWNER_MENU_')) {
    const targetMsgId = parseInt(action.replace('SHOPEE_OWNER_MENU_', ''));
    await answerCallbackQuery(cbQuery.id, 'เมนูแก้ไขคนซื้อ Shopee');
    const kb = renderShopeeOwnerMenuKeyboard(targetMsgId);
    await editMessageText(chatId, messageId, '👤 <b>เมนูสลับคนซื้อในบิล Shopee:</b>\nเลือกแก้ไขทีละรายการ หรือสลับกลุ่มสินค้าได้ทันที:', kb);
    return;
  }

  // Shopee Item Picker Page
  if (action.startsWith('SHOPEE_PAGE_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[2]);
    const page = parseInt(parts[3] || '0');

    const draft = await getDraft(targetMsgId);
    if (!draft) {
      await answerCallbackQuery(cbQuery.id, 'ไม่พบข้อมูลบิลนี้');
      return;
    }

    await answerCallbackQuery(cbQuery.id, `หน้า ${page + 1}`);
    const kb = renderShopeeItemPickerKeyboard(targetMsgId, draft, page);
    await editMessageText(chatId, messageId, '📋 <b>กดเลือกรายการที่ต้องการเปลี่ยนคนซื้อ:</b>', kb);
    return;
  }

  // Shopee Pick Item
  if (action.startsWith('SHOPEE_PICK_ITEM_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[3]);
    const itemIdx = parseInt(parts[4]);
    const page = parseInt(parts[5] || '0');

    const draft = await getDraft(targetMsgId);
    if (!draft || !draft.items[itemIdx]) {
      await answerCallbackQuery(cbQuery.id, 'ไม่พบรายการนี้');
      return;
    }

    await answerCallbackQuery(cbQuery.id, 'เลือกคนซื้อ');
    const dialog = renderSingleItemOwnerPicker(targetMsgId, draft, itemIdx, page);
    await editMessageText(chatId, messageId, dialog.text, dialog.reply_markup);
    return;
  }

  // Set Shopee Item Owner
  if (action.startsWith('SET_ITEM_OWNER_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[3]);
    const itemIdx = parseInt(parts[4]);
    const chosenOwner = parts[5];
    const page = parseInt(parts[6] || '0');

    const draft = await getDraft(targetMsgId);
    if (draft && draft.items[itemIdx]) {
      draft.items[itemIdx].owner = chosenOwner;
      await saveDraft(targetMsgId, draft);
      await answerCallbackQuery(cbQuery.id, `เปลี่ยนเป็นของ ${chosenOwner} แล้ว!`);
      const kb = renderShopeeItemPickerKeyboard(targetMsgId, draft, page);
      await editMessageText(chatId, messageId, `✅ <b>เปลี่ยนรายการ "${draft.items[itemIdx].title}" เป็นของ "${chosenOwner}" เรียบร้อย!</b>\n\nเลือกรายการอื่นต่อได้เลยครับ:`, kb);
    }
    return;
  }

  // Set Shopee Group
  if (action.startsWith('SET_SHOPEE_GRP_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[3]);
    const grp = parts[4];

    const draft = await getDraft(targetMsgId);
    if (draft) {
      if (grp === 'PJ') {
        draft.items.forEach(i => {
          if (/saker|merries|ผ้าอ้อม|แอลกอฮอล์/i.test(i.title)) i.owner = 'น้องพีเจ';
        });
      } else if (grp === 'PHRAE') {
        draft.items.forEach(i => {
          if (/sony|หูฟัง|tab|เคส/i.test(i.title)) i.owner = 'พี่แพร';
        });
      } else if (grp === 'MOM') {
        draft.items.forEach(i => {
          if (/ประกันสังคม|เลซิติน|ยา/i.test(i.title)) i.owner = 'แม่';
        });
      }
      await saveDraft(targetMsgId, draft);
      await answerCallbackQuery(cbQuery.id, 'สลับกลุ่มสินค้าเรียบร้อย');
      const summaryText = renderDraftSummaryText(draft);
      const kb = renderMainKeyboard(targetMsgId, draft);
      await editMessageText(chatId, messageId, summaryText, kb);
    }
    return;
  }

  // Set All Shopee Items Owner
  if (action.startsWith('SET_SHOPEE_ALL_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[3]);
    const chosenOwner = parts[4];

    const draft = await getDraft(targetMsgId);
    if (draft) {
      draft.items.forEach(i => i.owner = chosenOwner);
      await saveDraft(targetMsgId, draft);
      await answerCallbackQuery(cbQuery.id, `ทั้งบิลเป็นของ ${chosenOwner}`);
      const summaryText = renderDraftSummaryText(draft);
      const kb = renderMainKeyboard(targetMsgId, draft);
      await editMessageText(chatId, messageId, summaryText, kb);
    }
    return;
  }

  // Pocket Menu
  if (action.startsWith('POCKET_MENU_')) {
    const targetMsgId = parseInt(action.replace('POCKET_MENU_', ''));
    await answerCallbackQuery(cbQuery.id, 'เลือกกระเป๋าเงิน');
    const kb = renderPocketPickerKeyboard(targetMsgId);
    await editMessageText(chatId, messageId, '🏦 <b>เลือกกระเป๋าเงินที่ต้องการตัดยอด:</b>', kb);
    return;
  }

  // Set Pocket
  if (action.startsWith('SET_POCKET_')) {
    const parts = action.split('_');
    const targetMsgId = parseInt(parts[2]);
    const chosenPocket = parts[3];

    const draft = await getDraft(targetMsgId);
    if (draft) {
      draft.pocket = chosenPocket;
      await saveDraft(targetMsgId, draft);
      await answerCallbackQuery(cbQuery.id, `เปลี่ยนกระเป๋าเป็น ${chosenPocket} แล้ว`);
      const summaryText = renderDraftSummaryText(draft);
      const kb = renderMainKeyboard(targetMsgId, draft);
      await editMessageText(chatId, messageId, summaryText, kb);
    }
    return;
  }

  // Back to Main Card
  if (action.startsWith('BACK_MAIN_')) {
    const targetMsgId = parseInt(action.replace('BACK_MAIN_', ''));
    const draft = await getDraft(targetMsgId);
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
    const draft = await getDraft(targetMsgId);
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
        await deleteDraft(targetMsgId);

        const confirmMsg = `
✅ <b>บันทึกบิล Shopee เรียบร้อยแล้วครับ!</b>
━━━━━━━━━━━━━━━━━━━
🛒 <b>รายการ:</b> ${draft.title}
💰 <b>ยอดรวมบิล:</b> ฿${draft.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
👶 <b>ซิงค์เข้าแท็บทวงแจง:</b> +฿${pjItems.reduce((s, i) => s + i.amount, 0).toLocaleString()} (ของใช้น้องพีเจ)
☁️ <b>Cloud Status:</b> บันทึกลง Supabase สำเร็จ (24/7 Cloud)
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
          familyNote = ' (ซิงค์เข้าแท็บเคลียร์พี่แพรแล้ว)';
        }

        const newTx = {
          id: `TX-SLIP-${Date.now()}`,
          date: new Date().toISOString(),
          type: 'EXPENSE',
          amount: slipAmount,
          category: draft.category || 'GENERAL',
          accountId: targetPocketId,
          note: `${draft.title} [${draft.owner}] (${draft.bankName})`,
          owner: draft.owner,
          bankRef: draft.bankRef
        };

        const existingTxs = current.transactions || [];
        const updatedSOT = {
          ...current,
          accounts: updatedAccounts,
          familySettlements: family,
          transactions: [newTx, ...existingTxs].slice(0, 100),
          updatedAt: new Date().toISOString()
        };

        await saveSOTToCloud(updatedSOT);
        await deleteDraft(targetMsgId);

        const targetPocketName = (updatedAccounts.find(a => a.id === targetPocketId)?.name) || targetPocketId;
        const confirmMsg = `
✅ <b>บันทึกสลิปเข้าระบบเรียบร้อยแล้วครับ!</b>
━━━━━━━━━━━━━━━━━━━
💰 <b>ยอดเงิน:</b> ฿${slipAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
👥 <b>เจ้าของ:</b> ${draft.owner}${familyNote}
💳 <b>ตัดยอดจาก:</b> ${targetPocketName}
☁️ <b>Cloud Status:</b> บันทึกลง Supabase สำเร็จ (24/7 Cloud)
        `.trim();
        await editMessageText(chatId, messageId, confirmMsg);
      }
    } catch (err) {
      console.error('Confirm error:', err);
      await sendMessage(chatId, `❌ เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    }
    return;
  }
}

async function handleTextMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  if (text === '/start') {
    const welcome = `
👋 <b>สวัสดีครับนายท่าน! ผมคือ "สมหมาย AI (24/7 Cloud Edition)"</b>
เลขาการเงินส่วนตัวของนายท่าน รันสดตลอดเวลา 24 ชม. บน Cloud!

📸 <b>วิธีใช้งาน:</b>
• ถ่ายรูปสลิปโอนเงิน หรือแคปหน้าจอ Shopee SPayLater ส่งมาในนี้ได้เลย
• ผมจะใช้สมองกล <b>Gemini 2.5 Flash Vision</b> แกะรายการและคำนวณยอดเงินให้อัตโนมัติ
• มีปุ่มให้เลือกสลับคนซื้อ และตัดเงินจากกระเป๋าต่างๆ ได้อย่างอิสระ

พิมพ์ /status เพื่อดูยอดเงินคงเหลือทุกกระเป๋าได้ตลอดเวลาครับ!
    `.trim();
    return await sendMessage(chatId, welcome);
  }

  if (text === '/status') {
    const current = await getCurrentSOT();
    if (!current) {
      return await sendMessage(chatId, '❌ ไม่สามารถดึงข้อมูลสถานะกระเป๋าเงินจาก Cloud ได้ในขณะนี้');
    }
    const accounts = current.accounts || [];
    const totalCash = accounts
      .filter(a => a.type === 'CASH' || a.type === 'BANK')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const pocketLines = accounts.map(a => `• <b>${a.name}:</b> ฿${(a.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`).join('\n');
    const msgText = `
📊 <b>สถานะกระเป๋าเงินปัจจุบัน (Live SOT Cloud):</b>
━━━━━━━━━━━━━━━━━━━
${pocketLines}
━━━━━━━━━━━━━━━━━━━
💰 <b>ยอดเงินรวมทุกกระเป๋า:</b> <b>฿${totalCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
☁️ <i>ระบบออนไลน์ 24 ชม. บน Vercel Cloud Serverless</i>
    `.trim();
    return await sendMessage(chatId, msgText);
  }

  // Set Gemini API Key dynamically via chat
  if (text.startsWith('/setkey')) {
    const parts = text.split(/\s+/);
    const newKey = parts[1]?.trim();
    if (!newKey || !newKey.startsWith('AIzaSy')) {
      return await sendMessage(chatId, '💡 <b>วิธีตั้งค่า Gemini API Key:</b>\nพิมพ์ <code>/setkey AIzaSy...</code> โดยนำคีย์จาก <a href="https://aistudio.google.com/app/apikey">Google AI Studio</a> มาใส่ครับ');
    }

    try {
      const current = (await getCurrentSOT()) || {};
      current.geminiApiKey = newKey;
      current.geminiModel = 'gemini-2.5-flash';
      await saveSOTToCloud(current);
      return await sendMessage(chatId, '✨ <b>บันทึก Gemini API Key ลง Supabase Cloud สำเร็จแล้วครับ!</b>\nสมองกล Gemini 2.5 Flash Vision พร้อมตรวจจับสลิปและบิล [X/Y] 24 ชม. ทันทีครับ!');
    } catch (e) {
      return await sendMessage(chatId, `❌ เกิดข้อผิดพลาดในการบันทึกคีย์: ${e.message}`);
    }
  }

  // Quick Owner Switch via Chat Text
  const latestDraft = await getLatestDraftByChat(chatId);
  if (latestDraft) {
    let newOwner = null;
    if (/แจง|พีเจ|น้องพีเจ|ลูก/i.test(text)) newOwner = 'น้องพีเจ';
    else if (/แพร|พี่แพร/i.test(text)) newOwner = 'พี่แพร';
    else if (/แม่/i.test(text)) newOwner = 'แม่';
    else if (/บ้าน|กองกลาง/i.test(text)) newOwner = 'บ้าน';
    else if (/ตัวเอง|เรา|กู|ผม/i.test(text)) newOwner = 'ตัวเอง';

    if (newOwner) {
      if (latestDraft.type === 'BANK_SLIP') {
        latestDraft.owner = newOwner;
        await saveDraft(latestDraft.msgId, latestDraft);
        const summaryText = renderDraftSummaryText(latestDraft);
        const kb = renderMainKeyboard(latestDraft.msgId, latestDraft);
        return await sendMessage(chatId, `✅ <b>เปลี่ยนคนซื้อเป็น "${newOwner}" เรียบร้อยครับ!</b>\n\n${summaryText}`, kb, latestDraft.msgId);
      } else if (latestDraft.type === 'SHOPEE_STATEMENT') {
        latestDraft.items.forEach(i => i.owner = newOwner);
        await saveDraft(latestDraft.msgId, latestDraft);
        const summaryText = renderDraftSummaryText(latestDraft);
        const kb = renderMainKeyboard(latestDraft.msgId, latestDraft);
        return await sendMessage(chatId, `✅ <b>ปรับปรุงคนซื้อในบิล Shopee เป็น "${newOwner}" เรียบร้อยครับ!</b>\n\n${summaryText}`, kb, latestDraft.msgId);
      }
    }
  }

  await sendMessage(chatId, '💡 นายท่านสามารถ <b>ส่งรูปภาพสลิป/บิล</b> มาได้เลยครับ หรือพิมพ์ /status เพื่อดูยอดเงิน');
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send('Sommai Telegram Webhook v3.0 (24/7 Cloud Serverless) is LIVE & READY!');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const update = req.body;
    if (!update) return res.status(200).json({ ok: true });

    if (update.message) {
      if (update.message.photo) {
        await handlePhotoMessage(update.message);
      } else if (update.message.text) {
        await handleTextMessage(update.message);
      }
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook execution error:', err);
    return res.status(200).json({ ok: true, error: err.message });
  }
}
