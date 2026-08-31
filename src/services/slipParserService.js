// Slip Parser Service (Receipt / Bank Transfer OCR Simulator)

export function simulateSlipOCR(fileOrText) {
  // If text or simulated slip data
  const sampleMerchants = ['ร้านอาหารตามสั่งรสเด็ด', '7-Eleven สาขาสี่แยก', 'GrabFood Delivery', 'Big C Supercenter', 'Starbucks Coffee'];
  const sampleAmounts = [85, 120, 240, 350, 480, 1250];

  const randomMerchant = sampleMerchants[Math.floor(Math.random() * sampleMerchants.length)];
  const randomAmount = sampleAmounts[Math.floor(Math.random() * sampleAmounts.length)];

  return {
    success: true,
    data: {
      merchant: randomMerchant,
      amount: randomAmount,
      currency: 'THB',
      datetime: new Date().toISOString(),
      bankRef: 'TXN' + Math.floor(10000000 + Math.random() * 90000000),
      detectedCategory: randomAmount > 500 ? 'SHOPPING' : 'FOOD',
      confidence: 0.96
    }
  };
}
