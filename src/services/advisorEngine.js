// Dual Advisor Engine: Sonar (Fact & Feasibility) & Best (Devil's Advocate & Risk Auditor)

export function runDualAdvisorAnalysis(drop, sotData) {
  const amount = drop.amount || 0;
  const accounts = sotData.accounts || [];
  const debts = sotData.debts || [];

  const baseNetSalary = 17993.32; // Real net base salary from Chonprathanwittaya payslip
  const foodAcc = accounts.find(a => a.id === 'KBANK-FOOD') || { balance: 0 };
  const snackAcc = accounts.find(a => a.id === 'KBANK-SNACK') || { balance: 0 };
  const homeAcc = accounts.find(a => a.id === 'KBANK-HOME') || { balance: 0 };
  const emergAcc = accounts.find(a => a.id === 'KBANK-EMERG') || { balance: 0 };
  const debitAcc = accounts.find(a => a.id === 'KBANK-DEBIT') || { balance: 0 };
  const spayLaterCredit = accounts.find(a => a.id === 'SPAYLATER') || { balance: 100000 };

  const totalMonthlyDebt = debts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const totalDebtRemaining = debts.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

  const textLower = drop.rawText.toLowerCase();
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
