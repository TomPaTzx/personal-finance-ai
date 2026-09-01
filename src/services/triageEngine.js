// Triage Engine: Dedup hashing & Ingestion classifier

// Simple fast SHA-256 hash simulator / Web Crypto wrapper
export async function generateDedupHash(text) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // 16-char prefix
  } catch (e) {
    // Fallback pseudo-hash
    let hash = 0;
    const str = text.trim().toLowerCase();
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

export function triageIntakeText(text) {
  const clean = text.trim().toLowerCase();
  
  // Extract potential amounts (e.g. 39,900 or 39900 or 500 บาท)
  const amountMatch = text.match(/([0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?|[0-9]+)\s*(บาท|k|b|thb)?/i);
  let amount = null;
  if (amountMatch) {
    const numStr = amountMatch[1].replace(/,/g, '');
    const parsed = parseFloat(numStr);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // 1. FINANCIAL_CONSULTATION / ADVISORY & PLANNING QUESTIONS
  const isQuestionOrConsult = 
    clean.includes('ช่วยคิด') || 
    clean.includes('ช่วยคำนวณ') || 
    clean.includes('เท่าไหร่ดี') || 
    clean.includes('ปรึกษา') || 
    clean.includes('วางแผน') || 
    clean.includes('เติมบัญชี') || 
    clean.includes('เติมเงิน') || 
    clean.includes('จัดสรร') || 
    clean.includes('โอเย็น') || 
    clean.includes('วันเสาร์') || 
    clean.includes('โอที') || 
    clean.includes('ยังไม่เข้า') || 
    clean.includes('ผ้าอ้อม') || 
    clean.includes('ลูก') || 
    clean.includes('น้องพีเจ') || 
    clean.includes('ค่าใช้จ่ายทั้งหมด') || 
    clean.includes('จะพอไหม') || 
    clean.includes('ทำยังไงดี') || 
    clean.includes('แนะนำหน่อย') ||
    clean.includes('แบ่งเงิน') ||
    clean.includes('กี่บาท') ||
    clean.includes('ควรเก็บ');

  if (isQuestionOrConsult) {
    let category = 'BUDGET_PLANNING';
    if (clean.includes('ลูก') || clean.includes('ผ้าอ้อม') || clean.includes('น้องพีเจ') || clean.includes('แจง') || clean.includes('นม') || clean.includes('เด็ก')) {
      category = 'KIDS_FAMILY_BUDGET';
    } else if (clean.includes('โอที') || clean.includes('โอเย็น') || clean.includes('วันเสาร์') || clean.includes('เงินเข้า')) {
      category = 'CASHFLOW_PLANNING';
    } else if (clean.includes('ผ่อน') || clean.includes('หนี้') || clean.includes('บิล')) {
      category = 'DEBT_OPTIMIZATION';
    }

    return {
      dropType: 'FINANCIAL_CONSULTATION',
      category,
      amount: amount || 0,
      confidence: 0.96
    };
  }

  // 2. SLIP_RECEIPT
  if (clean.includes('สลิป') || clean.includes('โอนเงิน') || clean.includes('ใบเสร็จ') || clean.includes('จ่ายค่า')) {
    return {
      dropType: 'SLIP_RECEIPT',
      category: 'EXPENSE_LOG',
      amount: amount || 0,
      confidence: 0.95
    };
  }

  // 3. PURCHASE_DECISION
  if (clean.includes('อยากได้') || clean.includes('อยากซื้อ') || clean.includes('ควรซื้อ') || clean.includes('ดีไหม') || clean.includes('ผ่อน') || clean.includes('ซื้อ')) {
    return {
      dropType: 'PURCHASE_DECISION',
      category: clean.includes('กล้อง') || clean.includes('เลนส์') || clean.includes('ไฟ') ? 'PRODUCTION' : 
                clean.includes('ipad') || clean.includes('macbook') || clean.includes('มือถือ') ? 'GADGET' : 'LIFESTYLE',
      amount: amount || 0,
      confidence: 0.98
    };
  }

  // 4. INCOME_LOG
  if (clean.includes('เงินเดือน') || clean.includes('รายได้') || clean.includes('รับเงิน') || clean.includes('โบนัส')) {
    return {
      dropType: 'INCOME_LOG',
      category: 'SALARY_INFLOW',
      amount: amount || 0,
      confidence: 0.92
    };
  }

  return {
    dropType: 'PURCHASE_DECISION',
    category: 'GENERAL',
    amount: amount || 0,
    confidence: 0.80
  };
}
