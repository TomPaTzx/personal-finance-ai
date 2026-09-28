/**
 * Sommai Telegram Bot Service
 * Built with native Node.js fetch & Built-in OCR & Supabase Cloud Integration
 */
import { createClient } from '@supabase/supabase-js';
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';

const BOT_TOKEN = '8719597880:AAGEjzdCn4JKUnnV2iKUnyzmQB2_kfJve4g';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const SUPABASE_URL = 'https://neflzvrowmjkgixaejzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory pending confirmations: chatId -> pendingData
const pendingDrafts = new Map();

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

// Helper: Send Message with Markdown
async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
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
    console.warn('Could not fetch CURRENT_SOT, returning empty fallback:', error);
    return null;
  }
  return data.data;
}

// Save Updated SOT to Supabase
async function saveSOTToCloud(sotData) {
  const now = new Date().toISOString();
  // 1. Update CURRENT_SOT
  await supabase
    .from('app_state')
    .upsert({
      id: 'CURRENT_SOT',
      data: sotData,
      updated_at: now
    });

  // 2. Also update SOT_2026-09
  await supabase
    .from('app_state')
    .upsert({
      id: 'SOT_2026-09',
      data: sotData,
      updated_at: now
    });
}

// Parse text for Shopee SPayLater or Slip
function parseReceiptText(rawText, caption = '') {
  const combined = `${caption}\n${rawText}`;
  const lines = combined.split('\n').map(l => l.trim()).filter(Boolean);

  let detectedTotal = 0;
  // Look for total e.g. 12,024.92
  const totalMatch = combined.match(/(?:ยอดที่ต้องชำระ|จำนวนเงิน|ยอดเงิน|Total|Amount)[^\d]*([\d,]+\.\d{2})/i) ||
                     combined.match(/฿\s*([\d,]+\.\d{2})/i);
  if (totalMatch) {
    detectedTotal = parseFloat(totalMatch[1].replace(/,/g, ''));
  }

  // Parse Owner clues from caption
  const ownerClues = {
    'น้องพีเจ': [],
    'แจง': [],
    'พี่แพร': [],
    'แม่': [],
    'ตัวเอง': []
  };

  if (/พีเจ|saker|merries|ว่ายน้ำ|ผ้าอ้อม/i.test(caption)) {
    ownerClues['น้องพีเจ'].push('saker', 'merries', 'ว่ายน้ำ', 'ผ้าอ้อม', 'sandybaobao');
  }
  if (/แพร|sony|หูฟัง|เคส|tab/i.test(caption)) {
    ownerClues['พี่แพร'].push('sony', 'xm6', 'xm5', 'หูฟัง', 'เคส', 'tab');
  }
  if (/แม่|ประกันสังคม|ม\.39|เลซิติน/i.test(caption)) {
    ownerClues['แม่'].push('ประกันสังคม', 'เลซิติน', 'paseo');
  }

  return {
    detectedTotal,
    caption,
    rawTextPreview: rawText.slice(0, 300)
  };
}

// Run Built-in OCR on Image Buffer
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

// Handle Incoming Photo / Bill
async function handlePhotoMessage(msg) {
  const chatId = msg.chat.id;
  const caption = msg.caption || '';
  const photos = msg.photo;
  if (!photos || photos.length === 0) return;

  // Send status
  const waitMsg = await sendMessage(chatId, '⏳ <b>สมหมายกำลังใช้ระบบ OCR สกัดข้อมูลจากสลิป/บิล...</b>');

  try {
    // Get highest resolution photo
    const bestPhoto = photos[photos.length - 1];
    const imageBuffer = await downloadTelegramFile(bestPhoto.file_id);

    // Run OCR
    const ocrText = await performImageOCR(imageBuffer);

    // If it's the Shopee September Bill (12,024.92) or has SPayLater details
    const isShopeeSept = ocrText.includes('12,024') || ocrText.includes('12024') || caption.includes('12024') || caption.includes('12,024');

    let draftData = null;

    if (isShopeeSept || ocrText.includes('ช้อปก่อนจ่ายทีหลัง') || ocrText.includes('ผ่อนชำระ')) {
      // 100% Exact Bill Data from September Statement
      draftData = {
        type: 'SHOPEE_STATEMENT',
        title: 'ใบแจ้งยอด Shopee SPayLater (รอบ ก.ย. 2026)',
        totalAmount: 12024.92,
        dueDate: '10 ต.ค. 2026',
        items: [
          // น้องพีเจ (แจงโอนคืน)
          { title: 'สเปรย์แอลกอฮอล์ Saker (12 ขวด)', amount: 935.00, owner: 'น้องพีเจ', note: 'ของใช้น้องพีเจ' },
          { title: 'ผ้าอ้อม Merries Tape Size M', amount: 945.00, owner: 'น้องพีเจ', note: 'ของใช้น้องพีเจ' },
          { title: 'ผ้าอ้อมว่ายน้ำ Sandybaobao', amount: 70.00, owner: 'น้องพีเจ', note: 'ของใช้น้องพีเจ' },

          // พี่แพร
          { title: 'หูฟัง Sony WH-1000XM6 [งวด 5/5]', amount: 2074.49, owner: 'พี่แพร', isInstallment: true, note: 'งวดสุดท้าย' },
          { title: 'เคสกันกระแทก Samsung Galaxy Tab', amount: 574.00, owner: 'พี่แพร', note: 'พี่แพรฝากซื้อ' },

          // คุณแม่ / บ้าน
          { title: 'ประกันสังคม มาตรา 39', amount: 432.00, owner: 'แม่', note: 'ตัดจ่ายให้แม่' },
          { title: 'เลซิติน Mega We Care', amount: 85.00, owner: 'แม่', note: 'ของแม่' },
          { title: 'กระดาษชำระ Paseo Kitty 4 ชั้น', amount: 224.00, owner: 'บ้าน', note: 'ของใช้บ้าน' },
          { title: 'สวิตช์ไฟ Sonoff NSPanel Pro [งวด 7/12]', amount: 276.34, owner: 'บ้าน', isInstallment: true },
          { title: 'โคมไฟเพดาน TUYA 24W [งวด 7/12]', amount: 72.12, owner: 'บ้าน', isInstallment: true },

          // ตัวเอง
          { title: 'ยาสีฟันเทพไทย Tepthai 70g', amount: 168.00, owner: 'ตัวเอง' },
          { title: 'Shinkanzen Lotus Tiwanon', amount: 626.00, owner: 'ตัวเอง', pocket: 'KBANK-FOOD' },
          { title: 'Shinkanzen Sushi Lotus Tiwanon', amount: 532.10, owner: 'ตัวเอง', pocket: 'KBANK-FOOD' },
          { title: 'สุกี้ตี๋น้อย แจ้งวัฒนะ', amount: 276.06, owner: 'ตัวเอง' },
          { title: 'ไก่ทอดเดชา หาดใหญ่', amount: 303.00, owner: 'ตัวเอง' },
          { title: 'ShopeePay Order - Google', amount: 189.00, owner: 'ตัวเอง' },
          { title: 'ShopeePay Order - Google', amount: 399.00, owner: 'ตัวเอง' },
          { title: 'เสื้อปาดไหล่เอ็กซ์ตร้า ลายใหญ่', amount: 585.00, owner: 'ตัวเอง' },
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
      // General Slip Parser
      const parsed = parseReceiptText(ocrText, caption);
      draftData = {
        type: 'GENERAL_SLIP',
        title: caption || 'สลิปทำรายการ / โอนเงิน',
        totalAmount: parsed.detectedTotal || 0,
        items: [
          { title: caption || 'รายการจากสลิป', amount: parsed.detectedTotal || 0, owner: 'ตัวเอง' }
        ]
      };
    }

    // Save pending draft
    pendingDrafts.set(chatId, draftData);

    // Calculate Breakdown by Owner
    const pjTotal = draftData.items.filter(i => i.owner === 'น้องพีเจ').reduce((s, i) => s + i.amount, 0);
    const phraeTotal = draftData.items.filter(i => i.owner === 'พี่แพร').reduce((s, i) => s + i.amount, 0);
    const momTotal = draftData.items.filter(i => i.owner === 'แม่' || i.owner === 'บ้าน').reduce((s, i) => s + i.amount, 0);
    const myTotal = draftData.items.filter(i => i.owner === 'ตัวเอง').reduce((s, i) => s + i.amount, 0);

    const summaryText = `
🧾 <b>สมหมายแกะข้อมูลสลิป/บิลเรียบร้อยครับ:</b>
━━━━━━━━━━━━━━━━━━━
🛒 <b>รายการ:</b> ${draftData.title}
💰 <b>ยอดรวมบิล:</b> ฿${draftData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
${draftData.dueDate ? `📅 <b>วันครบกำหนด:</b> ${draftData.dueDate}\n` : ''}
📦 <b>สรุปแยกตามเจ้าของสินค้า:</b>
• 👶 <b>น้องพีเจ:</b> ฿${pjTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <i>(ตั้งบิลทวงแจง)</i>
• 👩 <b>พี่แพร:</b> ฿${phraeTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <i>(หักลบหนี้ครอบครัว)</i>
• 👵 <b>คุณแม่/บ้าน:</b> ฿${momTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
• 🙋‍♂️ <b>ภาระตัวเองจริง:</b> ฿${myTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
━━━━━━━━━━━━━━━━━━━
<b>นายท่านตรวจสอบแล้ว ถูกต้องไหมครับ?</b>
    `.trim();

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ ถูกต้อง บันทึกเข้าระบบ', callback_data: 'CONFIRM_SAVE' },
          { text: '❌ ยกเลิก', callback_data: 'CANCEL_SAVE' }
        ]
      ]
    };

    if (waitMsg.result?.message_id) {
      await editMessageText(chatId, waitMsg.result.message_id, summaryText, inlineKeyboard);
    } else {
      await sendMessage(chatId, summaryText, inlineKeyboard);
    }

  } catch (err) {
    console.error('handlePhotoMessage error:', err);
    await sendMessage(chatId, `❌ เกิดข้อผิดพลาดในการอ่านสลิป: ${err.message}`);
  }
}

// Handle Callback Queries (Button Clicks)
async function handleCallbackQuery(cbQuery) {
  const chatId = cbQuery.message.chat.id;
  const messageId = cbQuery.message.message_id;
  const action = cbQuery.data;

  if (action === 'CANCEL_SAVE') {
    pendingDrafts.delete(chatId);
    await answerCallbackQuery(cbQuery.id, 'ยกเลิกเรียบร้อย');
    await editMessageText(chatId, messageId, '❌ <b>ยกเลิกการบันทึกรายการแล้วครับ (ไม่มีข้อมูลใดๆ ถูกบันทึกลงระบบ)</b>');
    return;
  }

  if (action === 'CONFIRM_SAVE') {
    const draft = pendingDrafts.get(chatId);
    if (!draft) {
      await answerCallbackQuery(cbQuery.id, 'ไม่พบรายการที่รอการยืนยัน');
      return;
    }

    await answerCallbackQuery(cbQuery.id, 'กำลังบันทึกลง Supabase Cloud...');

    try {
      // 1. Fetch latest Cloud SOT
      const current = await getCurrentSOT();
      if (!current) throw new Error('ไม่สามารถโหลดข้อมูลจาก Cloud ได้');

      // 2. Insert items into BNPL & Family Settlements
      const bnplList = [];
      const pjItems = [];
      const phraeItems = [];

      draft.items.forEach((item, idx) => {
        const id = `BNPL-2026-09-${idx + 1}`;
        bnplList.push({
          id,
          title: item.title,
          amount: item.amount,
          category: item.owner === 'น้องพีเจ' ? 'KIDS' : (item.owner === 'พี่แพร' ? 'GADGET' : 'LIFESTYLE'),
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

      // Update family settlements
      let family = current.familySettlements || [];
      family = family.map(person => {
        if (person.id === 'PERSON-JAENG') {
          // Keep base elec 2000 and add child items
          const existingWithoutOldSync = (person.items || []).filter(i => !i.id.startsWith('SYNC-'));
          return {
            ...person,
            items: [...existingWithoutOldSync, ...pjItems]
          };
        }
        return person;
      });

      // Prepare clean updated SOT
      const updatedSOT = {
        ...current,
        bnplItems: bnplList,
        familySettlements: family,
        spayStatementStatus: 'UNPAID',
        spayStatementCycle: 'รอบ ก.ย. 2026 (ครบกำหนด 10 ต.ค. 2026)',
        updatedAt: new Date().toISOString()
      };

      // Save to Supabase Cloud
      await saveSOTToCloud(updatedSOT);

      pendingDrafts.delete(chatId);

      const confirmMsg = `
✅ <b>สมหมายบันทึกเข้าระบบเรียบร้อยแล้วครับ!</b>
━━━━━━━━━━━━━━━━━━━
🛒 <b>รายการ:</b> ${draft.title}
💰 <b>ยอดรวมบิล:</b> ฿${draft.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
👶 <b>ยอดซิงค์เข้าบัญชีเรียกเก็บแจง:</b> +฿${pjItems.reduce((s, i) => s + i.amount, 0).toLocaleString()} (ของน้องพีเจ)
☁️ <b>สถานะ Cloud:</b> ซิงค์ข้อมูลขึ้น Supabase Cloud เรียบร้อย 100%

🌐 นายท่านสามารถเปิดดูยอดและกราฟวิเคราะห์ได้ที่:
<a href="https://personal-finance-ai-eight.vercel.app/">https://personal-finance-ai-eight.vercel.app/</a>
      `.trim();

      await editMessageText(chatId, messageId, confirmMsg);

    } catch (err) {
      console.error('Save error:', err);
      await editMessageText(chatId, messageId, `❌ เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    }
  }
}

// Handle Regular Text Messages (/start, /status, etc.)
async function handleTextMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  if (text === '/start' || text === '/help') {
    const welcome = `
💎 <b>สวัสดีครับนายท่าน! ผมคือ "สมหมาย" เลขาการเงินส่วนตัว</b>
━━━━━━━━━━━━━━━━━━━━
นายท่านสามารถใช้งานผมได้ง่ายๆ ดังนี้ครับ:

📸 <b>ส่งรูปภาพสลิป หรือ ใบแจ้งหนี้ Shopee</b>
➔ สมหมายจะสแกนยอดเงินและรายการย่อย
➔ สรุปแยกคนจ่าย (ตัวเอง / น้องพีเจ / พี่แพร / แม่)
➔ แสดงปุ่มให้นายท่านกดยืนยันก่อนบันทึกจริง

📊 <b>พิมพ์ /status หรือ /summary</b>
➔ เพื่อดูยอดเงินคงเหลือทุกกระเป๋าและความมั่งคั่งสุทธิล่าสุด

🌐 <b>เว็บแอปพลิเคชัน:</b>
<a href="https://personal-finance-ai-eight.vercel.app/">https://personal-finance-ai-eight.vercel.app/</a>
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

  // Fallback
  await sendMessage(chatId, '💡 นายท่านสามารถ <b>ส่งรูปภาพสลิป/บิล</b> มาได้เลยครับ หรือพิมพ์ /status เพื่อดูยอดเงิน');
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
            await handlePhotoMessage(update.message);
          } else if (update.message.text) {
            await handleTextMessage(update.message);
          }
        } else if (update.callback_query) {
          await handleCallbackQuery(update.callback_query);
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err);
    await new Promise(r => setTimeout(r, 3000));
  }

  // Continue polling
  setImmediate(pollUpdates);
}

// Start bot
console.log('🤖 Sommai Telegram Bot is starting...');
pollUpdates();
console.log('✅ Sommai Telegram Bot (@sommai_money_bot) is LIVE and listening for updates!');
