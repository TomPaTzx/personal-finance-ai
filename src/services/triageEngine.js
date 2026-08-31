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

  // Determine Drop Type
  if (clean.includes('สลิป') || clean.includes('โอนเงิน') || clean.includes('ใบเสร็จ') || clean.includes('จ่ายค่า')) {
    return {
      dropType: 'SLIP_RECEIPT',
      category: 'EXPENSE_LOG',
      amount: amount || 0,
      confidence: 0.95
    };
  }

  if (clean.includes('อยากได้') || clean.includes('อยากซื้อ') || clean.includes('ควรซื้อ') || clean.includes('ดีไหม') || clean.includes('ผ่อน')) {
    return {
      dropType: 'PURCHASE_DECISION',
      category: clean.includes('กล้อง') || clean.includes('เลนส์') || clean.includes('ไฟ') ? 'PRODUCTION' : 
                clean.includes('ipad') || clean.includes('macbook') || clean.includes('มือถือ') ? 'GADGET' : 'LIFESTYLE',
      amount: amount || 0,
      confidence: 0.98
    };
  }

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
