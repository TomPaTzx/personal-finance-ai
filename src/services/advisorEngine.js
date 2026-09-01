// Dual Advisor Engine: Sonar (Fact & Feasibility) & Best (Devil's Advocate & Risk Auditor) + Jason (The Money Coach Wisdom)
import { applyTheMoneyCoachWisdom } from './coachKnowledgeBase';

export function runDualAdvisorAnalysis(drop, sotData) {
  const amount = drop.amount || 0;
  const accounts = sotData.accounts || [];
  const debts = sotData.debts || [];
  const bnplItems = sotData.bnplItems || [];
  const familySettlements = sotData.familySettlements || [];
  const subscriptions = sotData.subscriptions || [];

  // 1. DYNAMIC ACCOUNT BALANCES & SALARY (From live sotData.accounts)
  const salaryAcc = accounts.find(a => a.category === 'SALARY' || a.id === 'KTB-SALARY');
  const baseNetSalary = salaryAcc ? (salaryAcc.balance || 17993.32) : 17993.32;
  const totalLiquidCash = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  const foodAcc = accounts.find(a => a.id === 'KBANK-FOOD') || { balance: 0 };
  const snackAcc = accounts.find(a => a.id === 'KBANK-SNACK') || { balance: 0 };
  const homeAcc = accounts.find(a => a.id === 'KBANK-HOME') || { balance: 0 };
  const emergAcc = accounts.find(a => a.id === 'KBANK-EMERG') || { balance: 0 };
  const debitAcc = accounts.find(a => a.id === 'KBANK-DEBIT') || { balance: 0 };
  const spayAcc = accounts.find(a => a.id === 'KBANK-SPAY') || { balance: 0 };
  const scbAcc = accounts.find(a => a.id === 'SCB-EXTRA') || { balance: 0 };
  const spayLaterCredit = accounts.find(a => a.id === 'SPAYLATER') || { balance: 100000 };

  // 2. DYNAMIC DEBT OBLIGATIONS (From live sotData.debts)
  const activeDebts = debts.filter(d => d.status === 'ACTIVE' && (d.remainingInstallments > 0 || d.remainingAmount > 0));
  const myMonthlyDebt = activeDebts
    .filter(d => d.payerType === 'WE_PAY')
    .reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  const totalDebtRemaining = activeDebts.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

  // 3. DYNAMIC SUBSCRIPTIONS (From live sotData.subscriptions)
  // Only ACTIVE subscriptions are counted; if cancelled or changed, live total updates immediately!
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');
  const kbankDirectSubsList = activeSubs.filter(s => 
    !s.paymentMethod?.toLowerCase().includes('shopee') && 
    !s.paymentMethod?.toLowerCase().includes('spay')
  );
  const kbankDirectSubs = kbankDirectSubsList.reduce((sum, s) => sum + (s.fullAmount || s.ourShareAmount || 0), 0);
  const allActiveSubsOurShare = activeSubs.reduce((sum, s) => sum + (s.ourShareAmount || s.fullAmount || 0), 0);

  // 4. DYNAMIC FAMILY BILLS & SETTLEMENTS (From live sotData.familySettlements)
  // Mom / Home bill: sums only PENDING items we owe
  const momFamily = familySettlements.find(f => f.relation === 'MOM' || f.id === 'PERSON-MOM');
  const momPendingGross = (momFamily?.items || [])
    .filter(i => i.type === 'WE_OWE' && i.status === 'PENDING')
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const homeBillGross = momPendingGross > 0 ? momPendingGross : (homeAcc.balance || 8783.29);

  // Jang electricity contribution (if pending)
  const jangFamily = familySettlements.find(f => f.relation === 'WIFE' || f.id === 'PERSON-JAENG');
  const jangElecItem = (jangFamily?.items || []).find(i => (i.id === 'J-ELEC' || i.title?.includes('ค่าไฟ')) && i.status === 'PENDING');
  const jangHomeContrib = jangElecItem ? (jangElecItem.amount || 0) : 0;
  const homeBillNetWePay = Math.max(0, homeBillGross - jangHomeContrib);

  // 5. DYNAMIC CHILD EXPENSES (From live BNPL and Family Settlements)
  const merriesBnpl = bnplItems.find(b => b.title?.toLowerCase().includes('merries'));
  const merriesPackCost = merriesBnpl ? merriesBnpl.amount : 449;
  const dneeBnpl = bnplItems.find(b => b.title?.toLowerCase().includes('d-nee') || b.title?.toLowerCase().includes('ดีนี่'));
  const dneeDetergentCost = dneeBnpl ? dneeBnpl.amount : 399;

  // Total Mandatory Monthly Drain from Base Salary (100% Dynamic)
  const totalFixedObligations = homeBillNetWePay + kbankDirectSubs + myMonthlyDebt;
  const freeCashflowFromBase = Math.round((baseNetSalary - totalFixedObligations) * 100) / 100;

  // 6. SUPPLEMENTAL CASHFLOW ESTIMATES (OT TRACK RECORD)
  const avgEveningOt = 15 * 200; // ~฿3,000 (15 days x ฿200)
  const avgSatOt = 4 * 450; // ~฿1,800 (4 Saturdays x ฿450)
  const totalExpectedOt = avgEveningOt + avgSatOt; // ~฿4,800
  const totalTrueInflow = baseNetSalary + totalExpectedOt;
  const trueMonthlySurplus = Math.round((freeCashflowFromBase + totalExpectedOt) * 100) / 100;

  // Dynamic suggested interim budget for child
  const typicalMonthlyChildNeeds = (merriesPackCost * 2) + dneeDetergentCost + 500; // ฿1,797

  const textLower = drop.rawText.toLowerCase();

  // SPECIAL HANDLER: FINANCIAL_CONSULTATION (ถามคำถาม ปรึกษาการเงิน วางแผนงบประมาณ)
  if (drop.dropType === 'FINANCIAL_CONSULTATION') {
    const isKidsOrDiapers = textLower.includes('ผ้าอ้อม') || textLower.includes('ลูก') || textLower.includes('น้องพีเจ') || textLower.includes('แจง') || textLower.includes('นม');
    const isOtCashflow = textLower.includes('โอเย็น') || textLower.includes('วันเสาร์') || textLower.includes('โอที') || textLower.includes('ยังไม่เข้า');
    const isEmergencyOrSavings = textLower.includes('สำรอง') || textLower.includes('ฉุกเฉิน') || textLower.includes('ออม') || textLower.includes('เก็บเงิน');
    const isDebtPlan = textLower.includes('หนี้') || textLower.includes('ผ่อน') || textLower.includes('ปิดหนี้');

    let financialSnapshot = {
      baseNetSalary,
      totalLiquidCash,
      freeCashflowFromBase,
      totalExpectedOt,
      trueMonthlySurplus,
      myMonthlyDebt,
      homeBillNetWePay,
      kbankDirectSubs
    };

    // Apply The Money Coach wisdom tailored to teacher career cashflow & family goals
    const coachWisdom = applyTheMoneyCoachWisdom(
      drop.category || (isKidsOrDiapers ? 'KIDS_FAMILY_BUDGET' : 'BUDGET_PLANNING'),
      {
        baseNetSalary,
        totalLiquidCash,
        freeCashflowFromBase,
        totalExpectedOt,
        myMonthlyDebt,
        homeBillNetWePay,
        kbankDirectSubs,
        typicalMonthlyChildNeeds,
        merriesPackCost,
        dneeDetergentCost
      },
      drop.rawText
    );

    const coachSummary = coachWisdom.mainAdvice;
    const recommendedAmount = coachWisdom.recommendedAmount || Math.round(typicalMonthlyChildNeeds);

    const sonarAnalysis = `📊 **ภาพรวมการเงินปัจจุบัน (Dynamic SOT Snapshot):**\n` +
      `• 💵 **เงินสดในระบบทั้งหมด:** ฿${totalLiquidCash.toLocaleString()} (เงินในบัญชีหลัก/เดบิต/SCB มีสภาพคล่องพร้อมใช้หมุนเวียน)\n` +
      `• 🔒 **บิลบังคับที่ล็อกเงินไว้แล้ว:** ค่าบ้านแม่ (฿${homeBillGross.toLocaleString()} ${jangHomeContrib > 0 ? `- แจงช่วย ฿${jangHomeContrib.toLocaleString()} ` : ''}= ฿${homeBillNetWePay.toLocaleString()}), ค่า Subscriptions กสิกร (${kbankDirectSubsList.map(s => `${s.name} ฿${s.fullAmount || s.ourShareAmount}`).join(', ') || 'ไม่มี'} = ฿${kbankDirectSubs.toLocaleString()}), และหนี้ผ่อนส่วนตัว ฿${myMonthlyDebt.toLocaleString()}/ด.\n` +
      `• 📈 **กระแสเงินสดรอเข้า:** โอเย็น (~฿3,000) + โอเสาร์ (~฿1,800) รวม ~฿${totalExpectedOt.toLocaleString()}\n` +
      `• ⚖️ **ผลกระทบ:** การเติมงบลูก ฿${recommendedAmount.toLocaleString()} ตอนนี้ คิดเป็นเพียง ~${((recommendedAmount / baseNetSalary) * 100).toFixed(0)}% ของเงินเดือนฐาน ไม่ทำให้กระแสเงินสดติดลบ`;

    const bestAnalysis = `🎯 **ข้อคิด & สถิติในอดีต (Mindset & Past Pattern):**\n` +
      `• **สถิติรายจ่ายลูก:** ในอดีตของใช้น้องพีเจเรามักรูดผ่าน Shopee SPayLater ให้ก่อน (เช่น Merries ฿${merriesPackCost}, B-KOOL ฿2,732) แล้วแจงโอนเคลียร์คืนใน Family Hub\n` +
      `• **คำเตือนสติ:** ช่วงที่เงินโอทียังไม่เข้า ให้ **"ซื้อเฉพาะของที่ต้องใช้จริงใน 15 วันข้างหน้า"** ก่อน (อย่าเพิ่งกดตุนแพ็คใหญ่ 4-5 ลัง) จะช่วยให้เรากินอิ่มนอนหลับ มีสภาพคล่องเหลือใช้สบายใจ ไม่ตึงมือครับ`;

    return {
      isConsultation: true,
      financialSnapshot,
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
      sonarScore = 4.9;
      sonarAnalysis = `ในกระเป๋า "ค่ากินแซ่บ & แซลมอนคลายเครียด" (KBANK-FOOD) มียอด ฿${foodAcc.balance.toLocaleString()} เพียงพอสำหรับจ่าย ฿${amount.toLocaleString()} สภาพคล่องพร้อมจ่าย ไม่กระทบเงินบ้านแม่และเงินลูก`;
    } else {
      sonarScore = 3.2;
      sonarAnalysis = `กระเป๋า "ค่ากินแซ่บ" มียอดคงเหลือ ฿${foodAcc.balance.toLocaleString()} ซึ่งน้อยกว่ายอดบิล ฿${amount.toLocaleString()} หากสแกนด้วย SPayLater ให้ดึงเงินส่วนต่างจากกระเป๋าหลักมาสมทบในกระเป๋า [KBANK-SPAY]`;
    }
  } else if (isHomeOrFamily) {
    sonarScore = 4.9;
    sonarAnalysis = `รายการนี้เป็นภาระจำเป็นของครอบครัว (กระเป๋า "บ้าน แม่ พี่แพร" มี ฿${homeAcc.balance.toLocaleString()}) ควรจัดสรรจ่ายผ่านบัตรแม่/พี่แพร หรือโอนจ่ายตามรอบบิล`;
  } else if (amount > 0 && debitAcc.balance >= amount) {
    sonarScore = 4.5;
    sonarAnalysis = `กระเป๋าเดบิตออนไลน์/สแกน (KBANK-DEBIT) มี ฿${debitAcc.balance.toLocaleString()} พอจ่ายยอด ฿${amount.toLocaleString()} ได้ทันที ไม่กระทบเงินสำรองฉุกเฉิน ฿${emergAcc.balance.toLocaleString()}`;
  } else if (amount > 0 && spayLaterCredit.balance >= amount) {
    const estimatedMonthly = Math.round(amount / 5);
    const totalWithNewDebt = myMonthlyDebt + estimatedMonthly;
    const dtiRatio = (totalWithNewDebt / baseNetSalary) * 100;

    if (dtiRatio > 40) {
      sonarScore = 2.2;
      sonarAnalysis = `เตือนเรื่องฐานเงินเดือน: เงินเดือนฐานสุทธิ ฿${baseNetSalary.toLocaleString()} ปัจจุบันมีภาระผ่อนส่วนตัวเดือนละ ฿${myMonthlyDebt.toLocaleString()} (~${((myMonthlyDebt/baseNetSalary)*100).toFixed(0)}%) หากเพิ่มผ่อนใหม่อีก ฿${estimatedMonthly.toLocaleString()}/ด. สัดส่วนภาระหนี้จะพุ่งเป็น ${dtiRatio.toFixed(1)}% ของเงินเดือนฐาน ซึ่งจะตึงมากช่วงปิดเทอมที่ไม่มีโอเย็น`;
    } else {
      sonarScore = 3.8;
      sonarAnalysis = `สามารถใช้วงเงิน SPayLater ผ่อนได้ ตกเดือนละ ~฿${estimatedMonthly.toLocaleString()} ภาระผ่อนรวมยังอยู่ในกรอบที่รับได้`;
    }
  } else {
    sonarScore = 2.2;
    sonarAnalysis = `ยอดเงิน ฿${amount.toLocaleString()} สูงเมื่อเทียบกับสภาพคล่องในกระเป๋าใช้จ่ายประจำวัน และมีภาระผ่อนเดิมเดือนละ ฿${myMonthlyDebt.toLocaleString()}`;
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
    bestScore = 4.8;
    bestAnalysis = `เข้าใจและชื่นชมมากครับ: การกินบุฟเฟต์/แซลมอน Shinkanzen คือ "งบสุขภาพจิตทดแทนบุหรี่ที่คุณเลิกได้เพื่อลูกน้องพีเจ" (ประหยัดค่าบุหรี่ได้เดือนละ ฿2,500-3,500 อยู่แล้ว) ตราบใดที่อยู่ในงบ ฿2,500-3,000/ด. (สัปดาห์ละ 1 มื้อ ~600-700) กินให้ฟินและอิ่มอร่อยได้เต็มที่ 100% ไร้กังวลครับ! (หากสแกนผ่าน SPayLater โอน ฿${amount.toLocaleString()} ไป [KBANK-SPAY] ไว้ด้วยนะ)`;
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
