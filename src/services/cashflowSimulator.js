// Proactive Cashflow Simulator (30 - 90 Days)
// With Dynamic Academic Calendar & Real Teacher OT Awareness (โอทีเสาร์ + โอทีเย็น)

/**
 * Detect if a specific date falls into Thai school semester break
 * @param {Date} date 
 * @returns {boolean}
 */
export function isAcademicTermBreak(date) {
  const month = date.getMonth(); // 0 = Jan ... 8 = Sep, 9 = Oct
  const day = date.getDate();
  // Semester 1 Break (October): typically Oct 11 to Oct 31
  if (month === 9 && day >= 11) return true;
  // Summer Break (March - April): typically Mar 11 to Apr 30
  if (month === 2 && day >= 11) return true;
  if (month === 3) return true;
  return false;
}

/**
 * Simulate daily cashflow trajectory for the next N days
 * @param {Object} sotData 
 * @param {Object} options 
 * @returns {Object} Simulation results with daily timeline, pinch points, and actionable directives
 */
export function simulateCashflow(sotData, options = {}) {
  const days = options.days || 30;
  const prepayMode = options.prepayMode !== undefined ? options.prepayMode : true; // Default to user's real habit
  const forceTermBreak = options.isTermBreak || false;
  const familySettlementDay = options.familySettlementDay || 31; // User insight: e.g. 31st at 21:18
  const spayPrepayDay = options.spayPrepayDay || 2; // User insight: e.g. 2nd early settlement

  // Teacher OT Parameters (supports direct user manual calculation / override)
  const saturdayOtCountLimit = options.saturdayOtCount !== undefined ? options.saturdayOtCount : 3;
  const saturdayOtRate = options.saturdayOtRate !== undefined ? options.saturdayOtRate : 1000;
  const saturdayTotalOverride = options.saturdayTotalOverride !== undefined ? options.saturdayTotalOverride : null;
  const effectiveSaturdayRate = saturdayTotalOverride !== null && saturdayOtCountLimit > 0
    ? (saturdayTotalOverride / saturdayOtCountLimit)
    : saturdayOtRate;

  const eveningLumpSumOverride = options.eveningLumpSumOverride !== undefined ? options.eveningLumpSumOverride : null;
  const eveningOtCountLimit = options.eveningOtCount !== undefined ? options.eveningOtCount : 20; // Default ~20 working days
  const eveningOtRate = options.eveningOtRate !== undefined ? options.eveningOtRate : 350;
  const eveningLumpSum = eveningLumpSumOverride !== null 
    ? eveningLumpSumOverride 
    : (eveningOtCountLimit * eveningOtRate);

  const accounts = sotData.accounts || [];
  const subscriptions = sotData.subscriptions || [];
  const familyList = sotData.familySettlements || [];

  // Calculate Real Net Balances from Family Settlement Hub
  const getFamilyNet = (personId, fallbackNet = 0) => {
    const person = familyList.find(p => p.id === personId);
    if (!person) return { net: fallbackNet, weOwe: 0, theyOwe: 0, name: '' };
    const pending = (person.items || []).filter(i => i.status === 'PENDING');
    if (pending.length === 0) {
      // If all items settled, use fallback net (e.g. recent real net transfer of ฿475 to Phrae on the 31st at 21:18)
      return { net: fallbackNet, weOwe: Math.max(0, fallbackNet), theyOwe: Math.max(0, -fallbackNet), name: person.personName };
    }
    const weOwe = pending.filter(i => i.type === 'WE_OWE').reduce((sum, i) => sum + i.amount, 0);
    const theyOwe = pending.filter(i => i.type === 'THEY_OWE').reduce((sum, i) => sum + i.amount, 0);
    const net = weOwe - theyOwe; // Positive = We owe them (outflow), Negative = They owe us (inflow)
    return { net, weOwe, theyOwe, name: person.personName };
  };

  // Sister Phrae: Net is ฿475 (we owe her after netting Sony XM5 vs meals/filter)
  const phraeNet = getFamilyNet('PERSON-PHRAE', 475.00); 
  // Wife Jaeng: Net is -฿2,000 (she reimburses us for electricity share)
  const jaengNet = getFamilyNet('PERSON-JAENG', -2000.00);
  // Mom: Home bills net
  const momNet = getFamilyNet('PERSON-MOM', 2000.00);

  // Starting Balances
  const mainAcc = accounts.find(a => a.id === 'KBANK-MAIN') || { balance: 0 };
  const foodAcc = accounts.find(a => a.id === 'KBANK-FOOD') || { balance: 0 };
  const snackAcc = accounts.find(a => a.id === 'KBANK-SNACK') || { balance: 0 };
  const spayAcc = accounts.find(a => a.id === 'KBANK-SPAY') || { balance: 0 };
  const emergAcc = accounts.find(a => a.id === 'KBANK-EMERG') || { balance: 0 };

  let currentMain = mainAcc.balance || 0;
  let currentFood = foodAcc.balance || 0;
  let currentSnack = snackAcc.balance || 0;
  let currentSpay = spayAcc.balance || 0;
  let currentEmerg = emergAcc.balance || 0;

  const dailyTimeline = [];
  const pinchPoints = [];
  const proactiveDirectives = [];

  const startDate = new Date(); // Real time opening date (e.g. 2 Sep 2026)
  let spayBillPaidThisMonth = sotData.spayStatementStatus === 'PAID';
  const monthlySpayEstimate = 13639.22;
  const teacherSalary = 17993.32;

  let currentMonthTracked = startDate.getMonth();
  let saturdaysCountedInMonth = 0;
  let eveningOtCountedInMonth = 0;

  for (let i = 0; i < days; i++) {
    const simDate = new Date(startDate);
    simDate.setDate(startDate.getDate() + i);

    const dayOfMonth = simDate.getDate();
    const dayOfWeek = simDate.getDay(); // 0 = Sun, 2 = Tue, 4 = Thu, 6 = Sat
    const month = simDate.getMonth();
    const eventsToday = [];
    let netChangeToday = 0;

    // Reset monthly bill and OT counters on 1st of month
    if (month !== currentMonthTracked) {
      currentMonthTracked = month;
      spayBillPaidThisMonth = false;
      saturdaysCountedInMonth = 0;
      eveningOtCountedInMonth = 0;
    }

    const isInBreak = forceTermBreak || isAcademicTermBreak(simDate);

    // 1. INFLOWS
    // 1.1 Base Teacher Salary on 25th of month
    if (dayOfMonth === 25) {
      currentMain += teacherSalary;
      netChangeToday += teacherSalary;
      eventsToday.push({
        type: 'INCOME',
        title: '💵 เงินเดือนครูชลประทานเข้าบัญชี',
        amount: teacherSalary,
        category: 'SALARY'
      });
    }

    // 1.2 Saturday Teaching OT (Pays every 2 Saturdays, not immediate!)
    if (dayOfWeek === 6 && !isInBreak) {
      if (saturdaysCountedInMonth < saturdayOtCountLimit) {
        saturdaysCountedInMonth++;
        // Check if this is an even Saturday (every 2 Saturdays payout)
        if (saturdaysCountedInMonth % 2 === 0) {
          const batchAmount = effectiveSaturdayRate * 2;
          currentMain += batchAmount;
          netChangeToday += batchAmount;
          eventsToday.push({
            type: 'INCOME',
            title: `📚 เงินค่าสอนพิเศษวันเสาร์ออก (รวบยอดตัดจ่าย 2 เสาร์: ฿${batchAmount.toLocaleString()})`,
            amount: batchAmount,
            category: 'OT'
          });
        } else {
          // Odd Saturday - teaching completed, but pending payout
          eventsToday.push({
            type: 'NOTICE',
            title: `📚 สอนพิเศษวันเสาร์ที่ ${saturdaysCountedInMonth}/${saturdayOtCountLimit} (สะสมรอบจ่าย ทุก 2 เสาร์)`,
            amount: 0,
            category: 'OT_PENDING'
          });
        }
      }
    }

    // 1.3 Evening Teaching OT (Accumulates and pays out in a lump sum AFTER salary day on 26th after monthly report!)
    if (dayOfMonth === 26 && !isInBreak && eveningLumpSum > 0) {
      currentMain += eveningLumpSum;
      netChangeToday += eveningLumpSum;
      eventsToday.push({
        type: 'INCOME',
        title: eveningLumpSumOverride !== null
          ? `🌙 เงินค่าสอนพิเศษโอทีเย็นออกรวบยอด (ยอดคำนวณตามปฏิทินวันทำงาน: ฿${eveningLumpSum.toLocaleString()})`
          : `🌙 เงินค่าสอนพิเศษโอทีเย็นออกรวบยอด (ทำรายงานส่งประจำเดือน: ${eveningOtCountLimit} วัน x ฿${eveningOtRate})`,
        amount: eveningLumpSum,
        category: 'OT'
      });
    }

    // 1.4 Term Break Notice on first day of break
    if (isInBreak && dayOfMonth === 11 && (month === 9 || month === 2)) {
      eventsToday.push({
        type: 'NOTICE',
        title: '🏖️ เริ่มช่วงปิดเทอม (ไม่มีโอทีสอนพิเศษเสาร์และโอเย็น)',
        amount: 0,
        category: 'ACADEMIC'
      });
    }

    // 1.5 Family Net Settlements on Custom Settlement Day (Default 31st at 21:18)
    if (dayOfMonth === familySettlementDay) {
      // Phrae Net Settlement
      if (phraeNet.net > 0) {
        currentMain -= phraeNet.net;
        netChangeToday -= phraeNet.net;
        eventsToday.push({
          type: 'EXPENSE',
          title: `🎧 โอนหักลบกลบหนี้สุทธิให้พี่แพร (฿${phraeNet.net.toLocaleString()} หักลบ Sony XM5 แล้ว)`,
          amount: phraeNet.net,
          category: 'FAMILY_NET'
        });
      } else if (phraeNet.net < 0) {
        const amt = Math.abs(phraeNet.net);
        currentMain += amt;
        netChangeToday += amt;
        eventsToday.push({
          type: 'INCOME',
          title: `🎧 พี่แพรโอนหักลบกลบหนี้สุทธิคืนเรา (฿${amt.toLocaleString()} หักลบ Sony XM5 แล้ว)`,
          amount: amt,
          category: 'FAMILY_NET'
        });
      }

      // Jaeng Net Settlement (e.g. electricity share)
      if (jaengNet.net < 0) {
        const amt = Math.abs(jaengNet.net);
        currentMain += amt;
        netChangeToday += amt;
        eventsToday.push({
          type: 'INCOME',
          title: `⚡ แจงโอนสมทบค่าไฟบ้าน/ของใช้สุทธิ (฿${amt.toLocaleString()})`,
          amount: amt,
          category: 'FAMILY_NET'
        });
      }

      // Mom Net Settlement
      if (momNet.net > 0) {
        currentMain -= momNet.net;
        netChangeToday -= momNet.net;
        eventsToday.push({
          type: 'EXPENSE',
          title: `🏡 เคลียร์บิลค่าใช้จ่ายบ้าน/คุณแม่ (฿${momNet.net.toLocaleString()})`,
          amount: momNet.net,
          category: 'FAMILY_NET'
        });
      }
    }

    // 2. OUTFLOWS & PREPAYMENTS
    // 2.1 SPayLater Bill Settlement
    // Real User Insight: If prepayMode is ON, settle early on chosen spayPrepayDay (e.g. day 2)!
    const isPrepayDay = (dayOfMonth === spayPrepayDay);
    const isRegularDueDay = (dayOfMonth === 10);

    if (!spayBillPaidThisMonth) {
      if ((prepayMode && isPrepayDay) || (!prepayMode && isRegularDueDay)) {
        // Attempt settlement: use KBANK-SPAY first, cover remainder from MAIN
        const needed = monthlySpayEstimate;
        const fromSpayWallet = Math.min(currentSpay, needed);
        const fromMain = Math.max(0, needed - fromSpayWallet);

        currentSpay -= fromSpayWallet;
        currentMain -= fromMain;
        netChangeToday -= needed;
        spayBillPaidThisMonth = true;

        eventsToday.push({
          type: 'DEBT',
          title: prepayMode 
            ? `⚡ ชำระบิล Shopee SPayLater ล่วงหน้า (วันที่ ${spayPrepayDay} ตัดไฟแต่ต้นลมเพื่อความสบายใจ)` 
            : '💳 ชำระบิล Shopee SPayLater (วันครบกำหนดปกติ 10 ก.ย.)',
          amount: needed,
          category: 'SPAYLATER',
          isPrepay: prepayMode
        });
      }
    }

    // 2.2 Subscriptions on 15th
    if (dayOfMonth === 15) {
      const subsTotal = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0) || 518;
      currentMain -= subsTotal;
      netChangeToday -= subsTotal;
      eventsToday.push({
        type: 'EXPENSE',
        title: '📺 ตัดบิลสมาชิกรายเดือน (Netflix, etc.)',
        amount: subsTotal,
        category: 'SUBS'
      });
    }

    // 2.3 Daily Living Burn (Food, snacks, baby diapers, travel ~฿300/day)
    const dailyLivingCost = 300;
    if (currentFood >= 150) currentFood -= 150; else currentMain -= 150;
    if (currentSnack >= 50) currentSnack -= 50; else currentMain -= 50;
    currentMain -= 100; // General baby/travel
    netChangeToday -= dailyLivingCost;

    const totalLiquidCash = currentMain + currentFood + currentSnack + currentSpay;

    // Detect Pinch Point
    if (currentMain < 1000 && !pinchPoints.some(p => Math.abs(p.dayIndex - i) <= 2)) {
      pinchPoints.push({
        dayIndex: i,
        dateString: simDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        mainBalance: currentMain,
        totalLiquid: totalLiquidCash,
        severity: currentMain < 0 ? 'CRITICAL' : 'WARNING',
        reason: currentMain < 0 
          ? `เงินในกระเป๋าหลักติดลบ (฿${currentMain.toLocaleString()}) ต้องดึงเงินสำรองฉุกเฉินช่วย` 
          : `เงินสดตึงมือ เหลือเพียง ฿${currentMain.toLocaleString()}`
      });
    }

    dailyTimeline.push({
      dayIndex: i,
      date: simDate,
      dateString: simDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
      mainBalance: Math.round(currentMain * 100) / 100,
      foodBalance: Math.round(currentFood * 100) / 100,
      spayBalance: Math.round(currentSpay * 100) / 100,
      totalLiquid: Math.round(totalLiquidCash * 100) / 100,
      emergBalance: currentEmerg,
      netChange: netChangeToday,
      events: eventsToday
    });
  }

  // 3. GENERATE ACTIONABLE PROACTIVE DIRECTIVES
  if (prepayMode) {
    proactiveDirectives.push({
      id: 'PREPAY_ACTIVE',
      badge: `⚡ ชำระล่วงหน้าทุกวันที่ ${spayPrepayDay} (Peace of Mind)`,
      variant: 'success',
      directive: `ระบบจำลองการกดจ่ายหนี้ SPayLater ตั้งแต่วันที่ ${spayPrepayDay} ช่วยล็อคความสบายใจ และตัดความเสี่ยงที่เงินจะรั่วไหลไปกับสิ่งอื่นได้ 100%`
    });
  }

  const isOctInTimeline = days >= 45 || startDate.getMonth() === 9;
  if (isOctInTimeline) {
    proactiveDirectives.push({
      id: 'OCT_BREAK_RADAR',
      badge: '🏖️ เรดาร์ตรวจพบช่วงปิดเทอม 1 (11-31 ต.ค.)',
      variant: 'amber',
      directive: 'ช่วงกลางถึงปลายเดือน ต.ค. เป็นช่วงปิดเทอม 1 โอทีเสาร์และโอเย็นจะหยุด แนะนำให้สะสมเงินโอทีจากเดือน ก.ย. (3 เสาร์) เข้ากระเป๋าสำรองไว้ล่วงหน้า'
    });
  }

  if (saturdayOtCountLimit > 0 || eveningOtCountLimit > 0 || eveningLumpSum > 0) {
    const saturdayTotalAmount = saturdayTotalOverride !== null 
      ? saturdayTotalOverride 
      : (saturdayOtCountLimit * effectiveSaturdayRate);
    const totalEstOt = saturdayTotalAmount + eveningLumpSum;
    const effectiveEveningDays = eveningOtRate > 0 && eveningLumpSumOverride !== null
      ? Math.round(eveningLumpSum / eveningOtRate)
      : eveningOtCountLimit;

    proactiveDirectives.push({
      id: 'OT_SUMMARY',
      badge: `📚 แผนโอทีเดือนนี้: คาดการณ์ ~฿${totalEstOt.toLocaleString()}`,
      variant: 'cyan',
      directive: `คำนวณจากเสาร์ที่สอนจริง ${saturdayOtCountLimit} เสาร์ (฿${saturdayTotalAmount.toLocaleString()}) + โอทีเย็น ${effectiveEveningDays} วัน (฿${eveningLumpSum.toLocaleString()}) เป็นตัวเร่งการเก็บเงินชั้นยอด`
    });
  }

  return {
    days,
    prepayMode,
    isTermBreak: forceTermBreak,
    familySettlementDay,
    spayPrepayDay,
    saturdayOtCount: saturdayOtCountLimit,
    saturdayOtRate,
    eveningOtCount: eveningOtCountLimit,
    eveningOtRate,
    dailyTimeline,
    pinchPoints,
    proactiveDirectives,
    summary: {
      minMainBalance: Math.min(...dailyTimeline.map(d => d.mainBalance)),
      endTotalLiquid: dailyTimeline[dailyTimeline.length - 1]?.totalLiquid || 0,
      totalPinchPointsCount: pinchPoints.length
    }
  };
}
