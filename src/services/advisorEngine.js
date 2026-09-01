// Dual Advisor Engine: Sonar (Fact & Feasibility) & Best (Devil's Advocate & Risk Auditor) + Jason (Financial Coach)

export function runDualAdvisorAnalysis(drop, sotData) {
  const amount = drop.amount || 0;
  const accounts = sotData.accounts || [];
  const debts = sotData.debts || [];
  const bnplItems = sotData.bnplItems || [];
  const familySettlements = sotData.familySettlements || [];

  const baseNetSalary = 17993.32; // Real net base salary from Chonprathanwittaya payslip
  const foodAcc = accounts.find(a => a.id === 'KBANK-FOOD') || { balance: 0 };
  const snackAcc = accounts.find(a => a.id === 'KBANK-SNACK') || { balance: 0 };
  const homeAcc = accounts.find(a => a.id === 'KBANK-HOME') || { balance: 0 };
  const emergAcc = accounts.find(a => a.id === 'KBANK-EMERG') || { balance: 0 };
  const debitAcc = accounts.find(a => a.id === 'KBANK-DEBIT') || { balance: 0 };
  const ktbSalaryAcc = accounts.find(a => a.id === 'KTB-SALARY') || { balance: 0 };
  const spayLaterCredit = accounts.find(a => a.id === 'SPAYLATER') || { balance: 100000 };

  const totalMonthlyDebt = debts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const totalDebtRemaining = debts.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

  const textLower = drop.rawText.toLowerCase();

  // SPECIAL HANDLER: FINANCIAL_CONSULTATION (ถามคำถาม ปรึกษาการเงิน วางแผนงบประมาณ)
  if (drop.dropType === 'FINANCIAL_CONSULTATION') {
    const isKidsOrDiapers = textLower.includes('ผ้าอ้อม') || textLower.includes('ลูก') || textLower.includes('น้องพีเจ') || textLower.includes('แจง');
    const isOtCashflow = textLower.includes('โอเย็น') || textLower.includes('วันเสาร์') || textLower.includes('โอที') || textLower.includes('ยังไม่เข้า');
    
    // Calculate typical child expenses from BNPL / Family items
    // e.g. Merries Diaper ฿449, D-nee ฿399, Milk/Snack ~฿500
    const suggestedKidsBudget = 1800; // Recommended interim top-up
    const expectedEveningOt = 15 * 200; // ฿3,000 (15 days x ฿200)
    const expectedSatOt = 4 * 450; // ฿1,800 (~4 Saturdays)
    const totalExpectedOt = expectedEveningOt + expectedSatOt; // ~฿4,800

    let coachSummary = '';
    let sonarAnalysis = '';
    let bestAnalysis = '';
    let recommendedAmount = suggestedKidsBudget;

    if (isKidsOrDiapers) {
      coachSummary = `💡 **คำแนะนำจาก Jason (โค้ชการเงิน):**\nในช่วงที่เงินโอเย็นและโอเสาร์ยังไม่เข้า แนะนำให้ **ดึงเงินจากบัญชีกสิกร (KBANK-DEBIT) เติมเข้าบัญชีของใช้ลูก (น้องพีเจ) ไว้ที่ ฿1,500 – ฿2,000 ก่อน** ซึ่งยอดนี้ครอบคลุมค่าผ้าอ้อม Merries (฿449) 2-3 ห่อ + น้ำยาซักผ้า D-nee (฿399) และของใช้จำเป็นได้ 2-3 สัปดาห์เต็ม โดยไม่กระทบเงินสำรองฉุกเฉิน และเมื่อเงินโอทีเข้า (~฿4,800) ค่อยนำมาเติมสมทบส่วนที่เหลือครับ`;
      
      sonarAnalysis = `📊 **วิเคราะห์สภาพคล่องจริง:**\n• เงินเดือนฐานสุทธิ: ฿17,993.32 / เดือน\n• คาดการณ์เงินโอทีที่จะเข้า: โอเย็น ~฿3,000 + โอเสาร์ ~฿1,800 (รวม ~฿4,800)\n• บัญชี KBANK-DEBIT และเงินเดือนมีสภาพคล่องหมุนเวียน การดึงเงินสำรอง ฿1,500 - ฿2,000 คิดเป็นเพียง ~8-10% ของเงินเดือนฐาน ไม่กระทบยอดบิล Shopee SPayLater (฿13,639) และ Netflix (฿518)`;
      
      bestAnalysis = `🎯 **ข้อคิด & ลำดับความสำคัญ:**\nของใช้ลูกเป็น "Fixed Necessity (ความจำเป็นสูงสุด)" แต่เทคนิคการคุมเงินช่วงรอโอทีคือ **"ซื้อใช้ทีละงวดตามโปร"** (รอบละ 1-2 แพ็ค) อย่าเพิ่งกดสั่งตุนข้ามเดือน เพื่อให้กระแสเงินสดในมือกินอิ่มนอนหลับสบาย ไม่ตึงมือครับ`;
    } else {
      coachSummary = `💡 **คำแนะนำจาก Jason:**\nแนะนำให้จัดสรรงบแบบแยกกระเป๋าชัดเจน โดยล็อกเงินค่าบิลบังคับไว้ก่อน แล้วแบ่งงบส่วนที่เหลือตามความจำเป็นเร่งด่วน`;
      sonarAnalysis = `📊 **วิเคราะห์สภาพคล่อง:** เงินเดือนฐาน ฿${baseNetSalary.toLocaleString()} มีภาระผ่อนเดือนละ ฿${totalMonthlyDebt.toLocaleString()} สภาพคล่องโดยรวมยังอยู่ในเกณฑ์บริหารจัดการได้`;
      bestAnalysis = `🎯 **ข้อคิด:** ตรวจสอบให้แน่ใจว่าไม่มีการก่อหนี้ผ่อนสินค้าฟุ่มเฟือยใหม่ในช่วงที่กระแสเงินสดยังรอเงินโอที`;
    }

    return {
      isConsultation: true,
      coachSummary,
      recommendedAmount,
      sonarScore: 4.8,
      sonarAnalysis,
      bestScore: 4.9,
      bestAnalysis,
      valueScore: 5.0,
      overallRecommendation: 'ADVISED',
      decisionFinal: null,
      moneySaved: 0
    };
  }

  // STANDARD PURCHASE DECISION ADVISORY
  const isSchoolCardOrSnack = textLower.includes('เติมบัตร') || textLower.includes('โรงเรียน') || textLower.includes('ไอติม') || textLower.includes('ขนม') || textLower.includes('ไก่ทอด');
  const isBeerOrHangout = textLower.includes('เบียร์') || textLower.includes('เหล้า') || textLower.includes('สังสรรค์') || textLower.includes('เพื่อนร่วมงาน') || textLower.includes('ชลประทาน');
  const isBuffetOrFood = textLower.includes('shinkanzen') || textLower.includes('บุฟเฟต์') || textLower.includes('กิน') || textLower.includes('แซ่บ') || textLower.includes('อาหาร');
  const isHomeOrFamily = textLower.includes('บ้าน') || textLower.includes('แม่') || textLower.includes('พี่แพร') || textLower.includes('coway') || textLower.includes('ไฟ') || textLower.includes('น้ำ');
  const isShopeeOrGame = textLower.includes('shopee') || textLower.includes('spaylater') || textLower.includes('เกม') || textLower.includes('steam');
  const isUOBInstallment = textLower.includes('uob') || textLower.includes('ผ่อน') || amount > 10000;

  // 1. Advisor 1: Sonar (Fact, Liquidity, Accounts Check based on ฿17,993 Net Salary)
  let sonarScore = 3.5;
  let sonarAnalysis = '';

  if (isSchoolCardOrSnack) {
    sonarScore = 5.0;
    sonarAnalysis = `รายการนี้ใช้ระบบ "เหมาจ่ายก้อน (Lump-sum Allowance)" เติมเงินเข้าบัตรโรงเรียนชลประทานวิทยาได้เลย ฿${amount ? amount.toLocaleString() : '300-500'} โดยตัดยอดจากกระเป๋า "เติมบัตรโรงเรียน/ขนมจุบจิบ (KBANK-SNACK)" ครั้งเดียวจบ แล้วในโรงเรียนกินไอติม/ขนม/ไก่ทอดได้ตามใจ ไม่ต้องมานั่งจดย่อยให้เหนื่อย`;
  } else if (isBeerOrHangout) {
    sonarScore = 4.8;
    sonarAnalysis = `งบสังสรรค์/เบียร์กับเพื่อนร่วมงาน (฿${amount.toLocaleString()}) อยู่ในเกณฑ์ปกติ (100-200/สัปดาห์) ตัดจ่ายจากกระเป๋า "ค่ากินแซ่บ & สังสรรค์ (KBANK-FOOD)" มีเงินเหลือ ฿${foodAcc.balance.toLocaleString()} จ่ายได้สบายใจ ไม่กระทบเงินบ้านแม่`;
  } else if (isBuffetOrFood) {
    if (foodAcc.balance >= amount) {
      sonarScore = 4.8;
      sonarAnalysis = `ในกระเป๋า "ค่ากินแซ่บ" (KBANK-FOOD) มียอด ฿${foodAcc.balance.toLocaleString()} พอจ่าย ฿${amount.toLocaleString()} ได้สบาย และวงเงิน SPayLater มีเหลือ ฿${(spayLaterCredit.balance || 0).toLocaleString()} ไม่กระทบเงินบ้านแม่และเงินสำรอง`;
    } else {
      sonarScore = 2.8;
      sonarAnalysis = `กระเป๋า "ค่ากินแซ่บ" มี ฿${foodAcc.balance.toLocaleString()} ซึ่งน้อยกว่ายอดที่ต้องการ ฿${amount.toLocaleString()} หากใช้ SPayLater สแกน จะต้องดึงเงินจากกระเป๋าหลักมาเติม`;
    }
  } else if (isHomeOrFamily) {
    sonarScore = 4.9;
    sonarAnalysis = `รายการนี้เป็นภาระจำเป็นของครอบครัว (กระเป๋า "บ้าน แม่ พี่แพร" มี ฿${homeAcc.balance.toLocaleString()}) ควรจัดสรรจ่ายผ่านบัตรแม่/พี่แพร หรือโอนจ่ายตามรอบบิล`;
  } else if (amount > 0 && debitAcc.balance >= amount) {
    sonarScore = 4.5;
    sonarAnalysis = `กระเป๋าเดบิตออนไลน์/สแกน (KBANK-DEBIT) มี ฿${debitAcc.balance.toLocaleString()} พอจ่ายยอด ฿${amount.toLocaleString()} ได้ทันที ไม่กระทบเงินสำรองฉุกเฉิน ฿${emergAcc.balance.toLocaleString()}`;
  } else if (amount > 0 && spayLaterCredit.balance >= amount) {
    const estimatedMonthly = Math.round(amount / 5);
    const totalWithNewDebt = totalMonthlyDebt + estimatedMonthly;
    const dtiRatio = (totalWithNewDebt / baseNetSalary) * 100;

    if (dtiRatio > 40) {
      sonarScore = 2.2;
      sonarAnalysis = `เตือนเรื่องฐานเงินเดือน: เงินเดือนฐานสุทธิ ฿${baseNetSalary.toLocaleString()} ปัจจุบันมีภาระผ่อนเดือนละ ฿${totalMonthlyDebt.toLocaleString()} (~${((totalMonthlyDebt/baseNetSalary)*100).toFixed(0)}%) หากเพิ่มผ่อนใหม่อีก ฿${estimatedMonthly.toLocaleString()}/ด. สัดส่วนภาระหนี้จะพุ่งเป็น ${dtiRatio.toFixed(1)}% ของเงินเดือนฐาน ซึ่งจะตึงมากช่วงปิดเทอมที่ไม่มีโอเย็น`;
    } else {
      sonarScore = 3.8;
      sonarAnalysis = `สามารถใช้วงเงิน SPayLater ผ่อนได้ ตกเดือนละ ~฿${estimatedMonthly.toLocaleString()} ภาระผ่อนรวมยังอยู่ในกรอบที่รับได้`;
    }
  } else {
    sonarScore = 2.2;
    sonarAnalysis = `ยอดเงิน ฿${amount.toLocaleString()} สูงเมื่อเทียบกับสภาพคล่องในกระเป๋าใช้จ่ายประจำวัน และมีภาระผ่อนเดิมเดือนละ ฿${totalMonthlyDebt.toLocaleString()}`;
  }

  // 2. Advisor 2: Best (Devil's Advocate, Risk Auditor, Routine Tracker)
  let bestScore = 3.5;
  let bestAnalysis = '';

  if (isSchoolCardOrSnack) {
    bestScore = 4.9;
    bestAnalysis = `เตือนใจ: อย่ากลับไปใช้วิธีจดทีละ 20 บาทเด็ดขาด เพราะจะเกิด Tracking Fatigue แล้วเลิกทำในที่สุด การเติมบัตรทีละ 300-500 บาทต่อสัปดาห์คือการ "ล็อกเพดานเงินรั่วไหล" ไว้เรียบร้อยแล้ว กินไอติม/ไก่ทอดให้อร่อยได้เลยครับ!`;
  } else if (isBeerOrHangout) {
    bestScore = 4.5;
    bestAnalysis = `เข้าใจเรื่องโมโหหิวและคลายเครียดหลังสอน: เบียร์กับเพื่อนร่วมงานสัปดาห์ละ 1-200 บาท เป็นค่าบำรุงสุขภาพจิตที่คุ้มค่า ตราบใดที่ควบคุมไม่ให้เกินสัปดาห์ละ 300 บาท`;
  } else if (isBuffetOrFood) {
    bestScore = 4.0;
    bestAnalysis = `พฤติกรรม: ปกติไป Shinkanzen หรือกินบุฟเฟต์เดือนละ 3-4 ครั้ง ถ้าสแกนด้วย SPayLater แนะนำให้โอนเงิน ฿${amount.toLocaleString()} จาก "ค่ากินแซ่บ" ไปไว้ที่กระเป๋า "กันจ่าย Shopee SPayLater (KBANK-SPAY)" ทันทีเพื่อกันเงินไว้จ่ายบิล`;
  } else if (isShopeeOrGame && amount > 3000) {
    bestScore = 2.4;
    bestAnalysis = `เตือนสติ: ปัจจุบันมียอดผ่อนใน SPayLater อยู่แล้ว ฿${totalDebtRemaining.toLocaleString()} หากกดซื้อของชิ้นนี้เพิ่ม ค่างวดเดือนหน้าจะเพิ่มขึ้น แนะนำให้ Parked ใส่ Wishlist รอดูโปร Shopee Payday สิ้นเดือน`;
  } else if (isUOBInstallment) {
    bestScore = 3.2;
    bestAnalysis = `หากจะผ่อนผ่าน UOB หรือ SPayLater ให้เช็คดอกเบี้ยว่า 0% หรือไม่ อย่าเผลอกดผ่อนแบบมีดอกเบี้ย และเช็ควันตัดรอบบิลให้ตรงกับวันเงินเดือนออกที่ชลประทานวิทยา`;
  } else {
    bestScore = 3.8;
    bestAnalysis = `ระดับความเสี่ยงปกติ ไม่พบกับดักดอกเบี้ยรุนแรง หากจำเป็นต้องใช้ สามารถดำเนินการได้เลย`;
  }

  // 3. Value & Necessity Score
  let valueScore = parseFloat(((sonarScore + bestScore) / 2).toFixed(1));
  if (isHomeOrFamily || isSchoolCardOrSnack) valueScore = 5.0;

  // 4. Overall Recommendation Synthesis
  let overallRecommendation = 'APPROVED';
  if (sonarScore < 2.5 || bestScore < 2.5) {
    overallRecommendation = 'PARKED';
  } else if (sonarScore < 3.5 || bestScore < 3.5) {
    overallRecommendation = 'CONDITIONAL';
  }

  return {
    isConsultation: false,
    sonarScore: parseFloat(sonarScore.toFixed(1)),
    sonarAnalysis,
    bestScore: parseFloat(bestScore.toFixed(1)),
    bestAnalysis,
    valueScore,
    overallRecommendation,
    decisionFinal: null,
    moneySaved: 0
  };
}
