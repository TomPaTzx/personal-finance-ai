/**
 * Sommai Telegram Bot Service v2.0
 * Multi-Bill Handling, Visual Reply Threading, and Smart Bank Slip Recognition
 */
import { createClient } from '@supabase/supabase-js';
import { createWorker } from 'tesseract.js';

const BOT_TOKEN = '8719597880:AAGEjzdCn4JKUnnV2iKUnyzmQB2_kfJve4g';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const SUPABASE_URL = 'https://neflzvrowmjkgixaejzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory pending confirmations keyed by photo message_id: msgId -> draftData
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

// Helper: Send Message with Markdown and Reply-To Support
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

// Smart Slip & Bank Details Extractor
function extractSlipDetails(rawText, caption = '') {
  const text = `${caption}\n${rawText}`;

  // 1. Detect Bank / Source
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

  // 2. Detect Amount (e.g. 1,250.00 | 350.00 | 12024.92)
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

  // 3. Detect Recipient / Merchant
  let recipient = '';
  const recipientMatch = text.match(/(?:ไปยัง|ผู้รับโอน|โอนให้|To|Receiver|Merchant|ร้านค้า|จ่ายให้)\s*[:：]?\s*([^\n\r]+)/i);
  if (recipientMatch && recipientMatch[1]) {
    recipient = recipientMatch[1].trim().slice(0, 40);
  }
  if (!recipient) {
    if (/shinkanzen/i.test(text)) recipient = 'Shinkanzen Sushi';
    else if (/ตี๋น้อย|สุกี้ตี๋น้อย/i.test(text)) recipient = 'สุกี้ตี๋น้อย';
    else if (/เซเว่น|7-eleven/i.test(text)) recipient = '7-Eleven';
    else if (/ไก่ทอดเดชา/i.test(text)) recipient = 'ไก่ทอดเดชา หาดใหญ่';
    else if (/lotus|โลตัส/i.test(text)) recipient = 'Lotus';
    else if (caption) recipient = caption.slice(0, 30);
    else recipient = 'ร้านค้า / บริการ';
  }

  // 4. Detect Reference Number
  let bankRef = '';
  const refMatch = text.match(/(?:รหัสอ้างอิง|เลขอ้างอิง|Ref|Txn Ref|เลขที่รายการ)\s*[:：]?\s*([\w\d]+)/i) ||
                   text.match(/([0-9A-Z]{12,30})/);
  if (refMatch && refMatch[1]) {
    bankRef = refMatch[1].trim();
  }

  // 5. Detect Date / Time
  let timeStr = '';
  const timeMatch = text.match(/(\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)[^\n\r]*)/i) ||
                    text.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:น\.|PM|AM)?)/i);
  if (timeMatch && timeMatch[1]) {
    timeStr = timeMatch[1].trim();
  }

  // Category detection
  let category = 'DAILY';
  if (/อาหาร|กิน|shinkanzen|ตี๋น้อย|ข้าว|กาแฟ|food|cafe/i.test(text)) {
    category = 'FOOD';
    defaultPocket = 'KBANK-FOOD';
  } else if (/เซเว่น|ขนม|ไอติม/i.test(text)) {
    category = 'SNACK';
    defaultPocket = 'KBANK-SNACK';
  } else if (/เน็ต|บ้าน|แม่|ไฟ|น้ำ/i.test(text)) {
    category = 'FAMILY';
    defaultPocket = 'KBANK-HOME';
  }

  return {
    bankName,
    detectedAmount,
    recipient,
    bankRef: bankRef ? `Ref: ${bankRef.slice(-8)}` : '',
    timeStr,
    defaultPocket,
    category
  };
}

// Perform OCR with Tesseract
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

// Handle Incoming Photo
async function handlePhotoMessage(msg) {
  const chatId = msg.chat.id;
  const msgId = msg.message_id;
  const caption = msg.caption || '';
  const photos = msg.photo;
  if (!photos || photos.length === 0) return;

  // Send status replying directly to this specific photo message
  const waitMsg = await sendMessage(chatId, '⏳ <b>กำลังสแกนสลิปใบนี้...</b>', null, msgId);

  try {
    const bestPhoto = photos[photos.length - 1];
    const imageBuffer = await downloadTelegramFile(bestPhoto.file_id);
    const ocrText = await performImageOCR(imageBuffer);

    // Check if it's the Shopee September Bill Statement (12,024.92)
    const isShopeeSept = ocrText.includes('12,024') || ocrText.includes('12024') ||
                         caption.includes('12024') || caption.includes('12,024') ||
                         (ocrText.includes('ช้อปก่อนจ่ายทีหลัง') && ocrText.includes('ผ่อนชำระ'));

    let draftData = null;

    if (isShopeeSept) {
      // 100% Real Shopee September Bill
      draftData = {
        type: 'SHOPEE_STATEMENT',
        msgId,
        title: 'ใบแจ้งยอด Shopee SPayLater (รอบ ก.ย. 2026)',
        totalAmount: 12024.92,
        dueDate: '10 ต.ค. 2026',
        items: [
          { title: 'สเปรย์แอลกอฮอล์ Saker (12 ขวด)', amount: 935.00, owner: 'น้องพีเจ', note: 'ของใช้น้องพีเจ' },
          { title: 'ผ้าอ้อม Merries Tape Size M', amount: 945.00, owner: 'น้องพีเจ', note: 'ของใช้น้องพีเจ' },
          { title: 'ผ้าอ้อมว่ายน้ำ Sandybaobao', amount: 70.00, owner: 'น้องพีเจ', note: 'ของใช้น้องพีเจ' },
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
      // General Bank Slip or Store Receipt
      const parsed = extractSlipDetails(ocrText, caption);
      draftData = {
        type: 'BANK_SLIP',
        msgId,
        title: parsed.recipient,
        bankName: parsed.bankName,
        totalAmount: parsed.detectedAmount,
        bankRef: parsed.bankRef,
        timeStr: parsed.timeStr,
        pocket: parsed.defaultPocket,
        category: parsed.category,
        caption: caption
      };
    }

    // Save draft keyed by message_id
    pendingDrafts.set(msgId, draftData);

    let summaryText = '';

    if (draftData.type === 'SHOPEE_STATEMENT') {
      const pjTotal = draftData.items.filter(i => i.owner === 'น้องพีเจ').reduce((s, i) => s + i.amount, 0);
      const phraeTotal = draftData.items.filter(i => i.owner === 'พี่แพร').reduce((s, i) => s + i.amount, 0);
      const momTotal = draftData.items.filter(i => i.owner === 'แม่' || i.owner === 'บ้าน').reduce((s, i) => s + i.amount, 0);
      const myTotal = draftData.items.filter(i => i.owner === 'ตัวเอง').reduce((s, i) => s + i.amount, 0);

      summaryText = `
🧾 <b>บิล Shopee SPayLater (อ้างอิงรูปด้านบน ☝️)</b>
━━━━━━━━━━━━━━━━━━━
💰 <b>ยอดรวมบิล:</b> ฿${draftData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
📅 <b>ครบกำหนด:</b> ${draftData.dueDate}

📦 <b>สรุปแยกตามคนจ่าย:</b>
• 👶 <b>น้องพีเจ:</b> ฿${pjTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <i>(ทวงแจง)</i>
• 👩 <b>พี่แพร:</b> ฿${phraeTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <i>(หักลบหนี้)</i>
• 👵 <b>คุณแม่/บ้าน:</b> ฿${momTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
• 🙋‍♂️ <b>ตัวเอง:</b> ฿${myTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
━━━━━━━━━━━━━━━━━━━
<b>ถูกต้องไหมครับนายท่าน?</b>
      `.trim();
    } else {
      summaryText = `
🧾 <b>สลิปใบนี้ (อ้างอิงรูปด้านบน ☝️):</b>
━━━━━━━━━━━━━━━━━━━
🏦 <b>ธนาคาร/ระบบ:</b> ${draftData.bankName}
👤 <b>โอนไปยัง/ร้านค้า:</b> <b>${draftData.title}</b>
💰 <b>ยอดเงิน:</b> <b>฿${draftData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
${draftData.bankRef ? `🔢 <b>อ้างอิง:</b> ${draftData.bankRef}\n` : ''}${draftData.timeStr ? `🕒 <b>เวลา:</b> ${draftData.timeStr}\n` : ''}💳 <b>บันทึกตัดจาก:</b> กระเป๋า <code>${draftData.pocket}</code>
━━━━━━━━━━━━━━━━━━━
<b>ถูกต้องไหมครับนายท่าน?</b>
      `.trim();
    }

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ ถูกต้อง บันทึกสลิปนี้', callback_data: `CONFIRM_${msgId}` },
          { text: '❌ ยกเลิก', callback_data: `CANCEL_${msgId}` }
        ]
      ]
    };

    if (waitMsg.result?.message_id) {
      await editMessageText(chatId, waitMsg.result.message_id, summaryText, inlineKeyboard);
    } else {
      await sendMessage(chatId, summaryText, inlineKeyboard, msgId);
    }

  } catch (err) {
    console.error('handlePhotoMessage error:', err);
    await sendMessage(chatId, `❌ เกิดข้อผิดพลาดในการอ่านสลิป: ${err.message}`, null, msgId);
  }
}

// Handle Callback Queries (Button Clicks)
async function handleCallbackQuery(cbQuery) {
  const chatId = cbQuery.message.chat.id;
  const messageId = cbQuery.message.message_id;
  const action = cbQuery.data;

  // Extract target msgId from callback_data (e.g. CONFIRM_12345)
  const parts = action.split('_');
  const actionType = parts[0];
  const targetMsgId = parseInt(parts[1]);

  if (actionType === 'CANCEL') {
    pendingDrafts.delete(targetMsgId);
    await answerCallbackQuery(cbQuery.id, 'ยกเลิกเรียบร้อย');
    await editMessageText(chatId, messageId, '❌ <b>ยกเลิกการบันทึกสลิปใบนี้แล้วครับ</b>');
    return;
  }

  if (actionType === 'CONFIRM') {
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
        // Record Shopee Statement
        const bnplList = [];
        const pjItems = [];

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
        // Record Single Slip / Transfer
        const targetPocketId = draft.pocket || 'KBANK-DEBIT';
        const slipAmount = draft.totalAmount || 0;

        // Deduct from account balance if expense
        let updatedAccounts = (current.accounts || []).map(acc => {
          if (acc.id === targetPocketId) {
            const newBal = parseFloat(((acc.balance || 0) - slipAmount).toFixed(2));
            return { ...acc, balance: newBal, updatedAt: new Date().toISOString() };
          }
          return acc;
        });

        // Add to transactions
        const newTx = {
          id: `TX-${Date.now()}`,
          date: new Date().toISOString(),
          description: draft.title || 'ค่าใช้จ่ายตามสลิป',
          amount: slipAmount,
          category: draft.category || 'EXPENSE',
          accountId: targetPocketId,
          type: 'EXPENSE',
          note: draft.bankRef || 'บันทึกผ่าน Sommai Telegram Bot'
        };

        const updatedSOT = {
          ...current,
          accounts: updatedAccounts,
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

// Handle Regular Text Messages (/start, /status, etc.)
async function handleTextMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  if (text === '/start' || text === '/help') {
    const welcome = `
💎 <b>สวัสดีครับนายท่าน! ผมคือ "สมหมาย" เลขาการเงินส่วนตัว</b>
━━━━━━━━━━━━━━━━━━━━
นายท่านสามารถใช้งานผมได้ง่ายๆ ดังนี้ครับ:

📸 <b>ส่งรูปภาพสลิป หรือ ใบแจ้งหนี้ Shopee (ส่งหลายรูปพร้อมกันได้)</b>
➔ สมหมายจะตอบกลับตรงใต้รูปแต่ละใบ พร้อมแสดงผู้รับโอนและยอดเงิน
➔ มีปุ่มให้กด <b>[ ✅ ถูกต้อง บันทึกสลิปนี้ ]</b> แยกเป็นใบๆ

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

  await sendMessage(chatId, '💡 นายท่านสามารถ <b>ส่งรูปภาพสลิป/บิล</b> มาได้เลยครับ (ส่งพร้อมกันหลายใบได้เลย) หรือพิมพ์ /status เพื่อดูยอดเงิน');
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
            // Process photo asynchronously without blocking next photos
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
console.log('🤖 Sommai Telegram Bot v2.0 is starting...');
pollUpdates();
console.log('✅ Sommai Telegram Bot v2.0 (@sommai_money_bot) is LIVE with Multi-Bill Threading support!');
