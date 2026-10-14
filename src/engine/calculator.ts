import type {
  CalculatorInputs,
  DcaStep,
  FullCalculationResult,
  GridSimulationResult,
} from '../types/trading';

/**
 * Округлення лотів вниз (Math.floor) до кратного minLotStep (стандарт ризик-менеджменту MT5)
 */
function floorLots(lots: number, minStep: number): number {
  const step = minStep > 0 ? minStep : 0.01;
  const factor = 1 / step;
  const floored = Math.floor((lots + 1e-7) * factor) / factor;
  return Math.max(step, floored);
}

/**
 * Розраховує ціну ліквідації / Stop Out
 */
export function calculateLiquidationPrice(
  direction: 'BUY' | 'SELL',
  platform: 'MT5_LOTS' | 'CRYPTO_FUTURES',
  balance: number,
  totalUnits: number,
  averagePrice: number,
  totalMargin: number,
  stopOutLevelPct: number
): number {
  if (totalUnits <= 0) return 0;

  if (platform === 'MT5_LOTS') {
    const targetPnl = totalMargin * (stopOutLevelPct / 100) - balance;
    if (direction === 'BUY') {
      const liqPrice = averagePrice + targetPnl / totalUnits;
      return Math.max(0, liqPrice);
    } else {
      const liqPrice = averagePrice - targetPnl / totalUnits;
      return Math.max(0, liqPrice);
    }
  } else {
    const mmrRatio = stopOutLevelPct / 100;
    if (direction === 'BUY') {
      const denominator = totalUnits * (1 - mmrRatio);
      if (denominator <= 0) return 0;
      const liqPrice = (averagePrice * totalUnits - balance) / denominator;
      return Math.max(0, liqPrice);
    } else {
      const denominator = totalUnits * (1 + mmrRatio);
      if (denominator <= 0) return 0;
      const liqPrice = (averagePrice * totalUnits + balance) / denominator;
      return Math.max(0, liqPrice);
    }
  }
}

/**
 * Внутрішній ліміт безпеки для запобігання нескінченному циклу.
 * Алгоритм природньо зупиняється при ліквідації — цей ліміт лише страховка.
 */
const MAX_DCA_SAFETY_LIMIT = 500;

/**
 * Генерація повної драбини доливів від startPrice до Stop Out
 */
export function generateDcaLadder(
  inputs: CalculatorInputs,
  direction: 'BUY' | 'SELL'
): DcaStep[] {
  const steps: DcaStep[] = [];
  const {
    platform,
    startPrice,
    balance,
    leverage,
    contractSize,
    minLotStep,
    spread,
    firstOrderMode,
    initialLot,
    firstOrderMarginPct,
    takeProfitPct,
    takeProfitMode,
    dcaTriggerLossPct,
    dcaStepRatioPct,
    stopOutLevelPct,
  } = inputs;

  const isMt5 = platform === 'MT5_LOTS';
  const effectiveContractSize = isMt5 ? contractSize : 1;

  // Якщо основні параметри не заповнені (чиста форма) — повертаємо пусту драбину
  if (!startPrice || startPrice <= 0 || !balance || balance <= 0 || !leverage || leverage <= 0) {
    return [];
  }

  // Фактична ціна відкриття першого ордера з урахуванням спреду
  const actualStartPrice =
    direction === 'BUY'
      ? startPrice + (spread || 0)
      : startPrice - (spread || 0);

  // Крок 0: Перша угода
  let initialVolume: number;
  let initialMargin: number;
  let initialNotional: number;

  if (isMt5) {
    if (firstOrderMode === 'LOTS') {
      initialVolume = floorLots(initialLot, minLotStep);
      initialNotional = initialVolume * effectiveContractSize * actualStartPrice;
      initialMargin = initialNotional / leverage;
    } else {
      const targetMargin = balance * (firstOrderMarginPct / 100);
      const targetNotional = targetMargin * leverage;
      const rawLots = targetNotional / (effectiveContractSize * actualStartPrice);
      initialVolume = floorLots(rawLots, minLotStep);
      initialNotional = initialVolume * effectiveContractSize * actualStartPrice;
      initialMargin = initialNotional / leverage;
    }
  } else {
    const targetMargin = balance * (firstOrderMarginPct / 100);
    initialNotional = targetMargin * leverage;
    initialVolume = initialNotional / actualStartPrice;
    initialMargin = targetMargin;
  }

  const initialEffectiveUnits = initialVolume * effectiveContractSize;
  let currentTotalMargin = initialMargin;
  let currentTotalUnits = initialEffectiveUnits;
  let currentTotalCost = actualStartPrice * initialEffectiveUnits;
  let currentAvgPrice = actualStartPrice;

  // Take Profit для кроку 0
  const initialTpUsd =
    takeProfitMode === 'FIXED_FIRST_ORDER'
      ? initialMargin * (takeProfitPct / 100)
      : takeProfitMode === 'DYNAMIC_TOTAL_MARGIN'
      ? initialMargin * (takeProfitPct / 100)
      : initialNotional * (takeProfitPct / 100);

  const initialTpPrice =
    direction === 'BUY'
      ? actualStartPrice + initialTpUsd / currentTotalUnits
      : actualStartPrice - initialTpUsd / currentTotalUnits;

  // Наступний тригер для кроку 0
  const initialTriggerLossUsd = currentTotalMargin * (dcaTriggerLossPct / 100);
  const nextTriggerPrice0 =
    direction === 'BUY'
      ? currentAvgPrice - initialTriggerLossUsd / currentTotalUnits
      : currentAvgPrice + initialTriggerLossUsd / currentTotalUnits;

  const liqPrice0 = calculateLiquidationPrice(
    direction,
    platform,
    balance,
    currentTotalUnits,
    currentAvgPrice,
    currentTotalMargin,
    stopOutLevelPct
  );

  steps.push({
    stepIndex: 0,
    orderType: direction,
    openPrice: actualStartPrice,
    volume: initialVolume,
    cumulativeVolume: initialVolume,
    notionalUsd: initialNotional,
    stepMarginUsd: initialMargin,
    totalMarginUsd: currentTotalMargin,
    totalVolume: initialVolume,
    averageEntryPrice: currentAvgPrice,
    takeProfitPrice: initialTpPrice,
    takeProfitProfitUsd: initialTpUsd,
    requiredBouncePct:
      Math.abs((initialTpPrice - actualStartPrice) / actualStartPrice) * 100,
    floatingLossUsd: 0,
    floatingLossPctOfMargin: 0,
    accountEquityUsd: balance,
    marginLevelPct: (balance / currentTotalMargin) * 100,
    nextDcaPrice: nextTriggerPrice0,
    isTriggered: true,
    isLiquidated: false,
    liquidationPrice: liqPrice0,
  });

  // Генерація наступних доливів — цикл зупиниться природньо при ліквідації
  for (let k = 1; k <= MAX_DCA_SAFETY_LIMIT; k++) {
    const prevStep = steps[k - 1];
    if (!prevStep.nextDcaPrice || prevStep.isLiquidated) break;

    const triggerPrice = prevStep.nextDcaPrice;
    if (triggerPrice <= 0) break;

    // Фактична ціна відкриття ордера доливу з урахуванням спреду
    const actualOpenPrice =
      direction === 'BUY'
        ? triggerPrice + (spread || 0)
        : triggerPrice - (spread || 0);

    const floatingLossAtTrigger =
      direction === 'BUY'
        ? (triggerPrice - currentAvgPrice) * currentTotalUnits
        : (currentAvgPrice - triggerPrice) * currentTotalUnits;

    const equityAtTrigger = balance + floatingLossAtTrigger;
    const marginLevelAtTrigger = (equityAtTrigger / currentTotalMargin) * 100;

    const isStopOut =
      isMt5
        ? marginLevelAtTrigger <= stopOutLevelPct || equityAtTrigger <= 0
        : equityAtTrigger <= (currentTotalUnits * triggerPrice * (stopOutLevelPct / 100)) || equityAtTrigger <= 0;

    if (isStopOut) {
      steps.push({
        stepIndex: k,
        orderType: direction,
        openPrice: actualOpenPrice,
        volume: 0,
        cumulativeVolume: currentTotalUnits / effectiveContractSize,
        notionalUsd: 0,
        stepMarginUsd: 0,
        totalMarginUsd: currentTotalMargin,
        totalVolume: currentTotalUnits / effectiveContractSize,
        averageEntryPrice: currentAvgPrice,
        takeProfitPrice: prevStep.takeProfitPrice,
        takeProfitProfitUsd: prevStep.takeProfitProfitUsd,
        requiredBouncePct: 0,
        floatingLossUsd: floatingLossAtTrigger,
        floatingLossPctOfMargin: (Math.abs(floatingLossAtTrigger) / currentTotalMargin) * 100,
        accountEquityUsd: Math.max(0, equityAtTrigger),
        marginLevelPct: marginLevelAtTrigger,
        nextDcaPrice: null,
        isTriggered: false,
        isLiquidated: true,
        liquidationPrice: prevStep.liquidationPrice,
      });
      break;
    }

    // Сума доливу: +30% від накопиченої маржі
    const desiredStepMargin = currentTotalMargin * (dcaStepRatioPct / 100);
    let stepVolume: number;
    let stepNotional: number;
    let stepMargin: number;

    if (isMt5) {
      const rawNotional = desiredStepMargin * leverage;
      const rawLots = rawNotional / (effectiveContractSize * actualOpenPrice);
      stepVolume = floorLots(rawLots, minLotStep);
      stepNotional = stepVolume * effectiveContractSize * actualOpenPrice;
      stepMargin = stepNotional / leverage;
    } else {
      stepMargin = desiredStepMargin;
      stepNotional = stepMargin * leverage;
      stepVolume = stepNotional / actualOpenPrice;
    }

    const stepUnits = stepVolume * effectiveContractSize;

    currentTotalMargin += stepMargin;
    currentTotalUnits += stepUnits;
    currentTotalCost += actualOpenPrice * stepUnits;
    currentAvgPrice = currentTotalCost / currentTotalUnits;

    let targetProfitUsd = initialTpUsd;
    if (takeProfitMode === 'DYNAMIC_TOTAL_MARGIN') {
      targetProfitUsd = currentTotalMargin * (takeProfitPct / 100);
    } else if (takeProfitMode === 'FIXED_PRICE_PCT') {
      targetProfitUsd = (currentAvgPrice * (takeProfitPct / 100)) * currentTotalUnits;
    }

    const stepTpPrice =
      direction === 'BUY'
        ? currentAvgPrice + targetProfitUsd / currentTotalUnits
        : currentAvgPrice - targetProfitUsd / currentTotalUnits;

    const requiredBounce =
      Math.abs((stepTpPrice - actualOpenPrice) / actualOpenPrice) * 100;

    const triggerLossTargetUsd = currentTotalMargin * (dcaTriggerLossPct / 100);
    const nextTrigger =
      direction === 'BUY'
        ? currentAvgPrice - triggerLossTargetUsd / currentTotalUnits
        : currentAvgPrice + triggerLossTargetUsd / currentTotalUnits;

    const currentLiqPrice = calculateLiquidationPrice(
      direction,
      platform,
      balance,
      currentTotalUnits,
      currentAvgPrice,
      currentTotalMargin,
      stopOutLevelPct
    );

    const cumLots = currentTotalUnits / effectiveContractSize;

    steps.push({
      stepIndex: k,
      orderType: direction,
      openPrice: actualOpenPrice,
      volume: stepVolume,
      cumulativeVolume: cumLots,
      notionalUsd: stepNotional,
      stepMarginUsd: stepMargin,
      totalMarginUsd: currentTotalMargin,
      totalVolume: cumLots,
      averageEntryPrice: currentAvgPrice,
      takeProfitPrice: stepTpPrice,
      takeProfitProfitUsd: targetProfitUsd,
      requiredBouncePct: requiredBounce,
      floatingLossUsd: floatingLossAtTrigger,
      floatingLossPctOfMargin: (Math.abs(floatingLossAtTrigger) / (currentTotalMargin - stepMargin)) * 100,
      accountEquityUsd: equityAtTrigger,
      marginLevelPct: (equityAtTrigger / currentTotalMargin) * 100,
      nextDcaPrice: nextTrigger > 0 ? nextTrigger : null,
      isTriggered: true,
      isLiquidated: false,
      liquidationPrice: currentLiqPrice,
    });
  }

  return steps;
}

/**
 * Симулює рух ціни від startPrice до endPrice
 */
export function simulateSingleDirectionGrid(
  inputs: CalculatorInputs,
  direction: 'BUY' | 'SELL'
): GridSimulationResult {
  const {
    platform,
    startPrice,
    endPrice,
    balance,
    contractSize,
    commissionPerLot,
    swap,
    stopOutLevelPct,
  } = inputs;

  const isMt5 = platform === 'MT5_LOTS';
  const effectiveContractSize = isMt5 ? contractSize : 1;
  const isPriceDropping = endPrice < startPrice;
  const isAdverseMove = direction === 'BUY' ? isPriceDropping : !isPriceDropping;

  const fullLadder = generateDcaLadder(inputs, direction);
  if (fullLadder.length === 0) {
    return {
      direction,
      steps: [],
      totalDcaTriggered: 0,
      totalOrdersTriggered: 0,
      initialMarginUsd: 0,
      finalUsedMarginUsd: 0,
      finalAveragePrice: 0,
      finalTakeProfitPrice: 0,
      isLiquidated: false,
      liquidationPrice: 0,
      liquidationStepIndex: null,
      finalEquityUsd: balance || 0,
      finalBalanceUsd: balance || 0,
      floatingPnlAtEndPriceUsd: 0,
      realizedPnlUsd: 0,
      grossPnlUsd: 0,
      commissionUsd: 0,
      swapUsd: 0,
      netPnlUsd: 0,
      netPnlPct: 0,
      tpReached: false,
      tpCount: 0,
      tpClosePrice: null,
    };
  }

  let currentBalance = balance;
  let realizedPnl = 0;
  let tpCount = 0;
  let isLiquidated = false;
  let liquidationPrice = 0;
  let liquidationStepIndex: number | null = null;

  // Якщо рух у сприятливий бік
  if (!isAdverseMove) {
    const step0 = fullLadder[0];
    const tpPrice = step0.takeProfitPrice;
    const isTpReached =
      direction === 'BUY' ? endPrice >= tpPrice : endPrice <= tpPrice;

    if (isTpReached) {
      const priceDeltaPerTp = Math.abs(tpPrice - startPrice);
      const totalDelta = Math.abs(endPrice - startPrice);
      const possibleTpCycles = Math.max(1, Math.floor(totalDelta / (priceDeltaPerTp || 1)));

      const actualCycles = Math.min(possibleTpCycles, 100);
      const profitPerCycle = step0.takeProfitProfitUsd;
      realizedPnl = profitPerCycle * actualCycles;
      currentBalance += realizedPnl;
      tpCount = actualCycles;

      const totalLots = step0.volume * actualCycles;
      const totalCommission = totalLots * (commissionPerLot || 0);
      const totalSwap = swap || 0;
      const netPnl = realizedPnl - totalCommission - totalSwap;

      return {
        direction,
        steps: [
          {
            ...step0,
            isTriggered: true,
            pnlAtEndPriceUsd: 0,
          },
        ],
        totalDcaTriggered: 0,
        totalOrdersTriggered: 1,
        initialMarginUsd: step0.stepMarginUsd,
        finalUsedMarginUsd: 0,
        finalAveragePrice: step0.averageEntryPrice,
        finalTakeProfitPrice: tpPrice,
        isLiquidated: false,
        liquidationPrice: step0.liquidationPrice,
        liquidationStepIndex: null,
        finalEquityUsd: balance + netPnl,
        finalBalanceUsd: balance + netPnl,
        floatingPnlAtEndPriceUsd: 0,
        realizedPnlUsd: realizedPnl,
        grossPnlUsd: realizedPnl,
        commissionUsd: totalCommission,
        swapUsd: totalSwap,
        netPnlUsd: netPnl,
        netPnlPct: (netPnl / balance) * 100,
        tpReached: true,
        tpCount,
        tpClosePrice: tpPrice,
      };
    } else {
      const units = step0.volume * effectiveContractSize;
      const floatingPnl =
        direction === 'BUY'
          ? (endPrice - step0.openPrice) * units
          : (step0.openPrice - endPrice) * units;

      const totalCommission = step0.volume * (commissionPerLot || 0);
      const totalSwap = swap || 0;
      const netPnl = floatingPnl - totalCommission - totalSwap;

      return {
        direction,
        steps: [
          {
            ...step0,
            pnlAtEndPriceUsd: floatingPnl,
          },
        ],
        totalDcaTriggered: 0,
        totalOrdersTriggered: 1,
        initialMarginUsd: step0.stepMarginUsd,
        finalUsedMarginUsd: step0.stepMarginUsd,
        finalAveragePrice: step0.averageEntryPrice,
        finalTakeProfitPrice: tpPrice,
        isLiquidated: false,
        liquidationPrice: step0.liquidationPrice,
        liquidationStepIndex: null,
        finalEquityUsd: balance + netPnl,
        finalBalanceUsd: balance,
        floatingPnlAtEndPriceUsd: floatingPnl,
        realizedPnlUsd: 0,
        grossPnlUsd: floatingPnl,
        commissionUsd: totalCommission,
        swapUsd: totalSwap,
        netPnlUsd: netPnl,
        netPnlPct: (netPnl / balance) * 100,
        tpReached: false,
        tpCount: 0,
        tpClosePrice: null,
      };
    }
  }

  // Рух у несприятливий бік
  const executedSteps: DcaStep[] = [];
  let currentTotalMargin = 0;
  let currentTotalUnits = 0;
  let currentAvgPrice = startPrice;

  for (let i = 0; i < fullLadder.length; i++) {
    const step = fullLadder[i];

    // «Stop out маркер» — генерується generateDcaLadder коли тригер наступного доливу
    // вже за межею ліквідації. Ціна реальної ліквідації — step.liquidationPrice (liqPrice з
    // попереднього кроку), а НЕ step.openPrice (triggerPrice ≥ liqPrice).
    if (step.isLiquidated) {
      // Перевіряємо, чи endPrice взагалі досягнув ціни ліквідації.
      // Якщо ні — ціна просто не дійшла до небезпечної зони.
      const isLiqReached =
        direction === 'BUY'
          ? endPrice <= step.liquidationPrice && step.liquidationPrice > 0
          : endPrice >= step.liquidationPrice && step.liquidationPrice > 0;

      if (isLiqReached) {
        isLiquidated = true;
        liquidationPrice = step.liquidationPrice; // реальна liqPrice, не triggerPrice
        liquidationStepIndex = i;
        executedSteps.push({
          ...step,
          isTriggered: true,
        });
      }
      break;
    }

    const isStepReached =
      direction === 'BUY'
        ? endPrice <= step.openPrice
        : endPrice >= step.openPrice;

    if (i === 0 || isStepReached) {
      const orderUnits = step.volume * effectiveContractSize;
      const orderPnlAtEnd =
        direction === 'BUY'
          ? (endPrice - step.openPrice) * orderUnits
          : (step.openPrice - endPrice) * orderUnits;

      executedSteps.push({
        ...step,
        isTriggered: true,
        pnlAtEndPriceUsd: orderPnlAtEnd,
      });

      currentTotalMargin = step.totalMarginUsd;
      currentTotalUnits = step.totalVolume * effectiveContractSize;
      currentAvgPrice = step.averageEntryPrice;

      const currentLiq = calculateLiquidationPrice(
        direction,
        platform,
        balance,
        currentTotalUnits,
        currentAvgPrice,
        currentTotalMargin,
        stopOutLevelPct
      );

      // Перевіряємо, чи наступний долив відкривається ДО того, як ціна досягне liqPrice.
      // Якщо долив відкривається раніше — він змінить позицію, тому ліквідація тут ще не настала.
      const nextLadderStep = fullLadder[i + 1];
      const nextOpenPrice = nextLadderStep?.openPrice;
      const liqBeforeNextDca =
        direction === 'BUY'
          ? !nextOpenPrice || currentLiq >= nextOpenPrice   // BUY: liq (нижче) досягається до наступного доливу (ще нижче)
          : !nextOpenPrice || currentLiq <= nextOpenPrice;  // SELL: liq (вище) досягається до наступного доливу (ще вище)

      const isLiqHit =
        direction === 'BUY'
          ? endPrice <= currentLiq && currentLiq > 0 && liqBeforeNextDca
          : endPrice >= currentLiq && currentLiq > 0 && liqBeforeNextDca;

      if (isLiqHit) {
        isLiquidated = true;
        liquidationPrice = currentLiq;
        liquidationStepIndex = i;
        break;
      }
    } else {
      break;
    }
  }


  const lastActiveStep = executedSteps.findLast((s) => s.isTriggered && !s.isLiquidated) || executedSteps[0];
  const finalAvg = lastActiveStep.averageEntryPrice;
  const finalMargin = lastActiveStep.totalMarginUsd;
  const finalTp = lastActiveStep.takeProfitPrice;

  // Чистий сумарний PnL з урахуванням усіх угод
  const grossPnlAtEnd = executedSteps.reduce(
    (acc, s) => acc + (s.pnlAtEndPriceUsd || 0),
    0
  );

  const totalLotsExecuted = executedSteps.reduce((acc, s) => acc + s.volume, 0);
  const totalCommission = totalLotsExecuted * (commissionPerLot || 0);
  const totalSwap = swap || 0;
  const netPnl = isLiquidated ? -balance : grossPnlAtEnd - totalCommission - totalSwap;

  let finalEquity = balance;
  if (isLiquidated) {
    finalEquity = 0;
    currentBalance = 0;
  } else {
    finalEquity = Math.max(0, balance + netPnl);
  }

  const netPnlPct = (netPnl / balance) * 100;
  const totalOrdersCount = executedSteps.filter((s) => s.isTriggered && !s.isLiquidated).length;
  const triggeredAdditionsCount = Math.max(0, totalOrdersCount - 1);

  return {
    direction,
    steps: executedSteps,
    totalDcaTriggered: triggeredAdditionsCount,
    totalOrdersTriggered: totalOrdersCount,
    initialMarginUsd: fullLadder[0].stepMarginUsd,
    finalUsedMarginUsd: isLiquidated ? 0 : finalMargin,
    finalAveragePrice: finalAvg,
    finalTakeProfitPrice: finalTp,
    isLiquidated,
    liquidationPrice: liquidationPrice || lastActiveStep.liquidationPrice,
    liquidationStepIndex,
    finalEquityUsd: finalEquity,
    finalBalanceUsd: isLiquidated ? 0 : currentBalance,
    floatingPnlAtEndPriceUsd: grossPnlAtEnd,
    realizedPnlUsd: 0,
    grossPnlUsd: grossPnlAtEnd,
    commissionUsd: totalCommission,
    swapUsd: totalSwap,
    netPnlUsd: netPnl,
    netPnlPct,
    tpReached: false,
    tpCount: 0,
    tpClosePrice: null,
  };
}

/**
 * Головний калькулятор
 */
export function calculateFullSimulation(inputs: CalculatorInputs): FullCalculationResult {
  const { direction, balance, startPrice, endPrice } = inputs;

  // Якщо основні параметри не заповнені (чиста форма)
  if (!startPrice || startPrice <= 0 || !endPrice || endPrice <= 0 || !balance || balance <= 0) {
    const emptyGrid: GridSimulationResult = {
      direction: direction === 'BOTH' ? 'BUY' : direction,
      steps: [],
      totalDcaTriggered: 0,
      totalOrdersTriggered: 0,
      initialMarginUsd: 0,
      finalUsedMarginUsd: 0,
      finalAveragePrice: 0,
      finalTakeProfitPrice: 0,
      isLiquidated: false,
      liquidationPrice: 0,
      liquidationStepIndex: null,
      finalEquityUsd: balance || 0,
      finalBalanceUsd: balance || 0,
      floatingPnlAtEndPriceUsd: 0,
      realizedPnlUsd: 0,
      grossPnlUsd: 0,
      commissionUsd: 0,
      swapUsd: 0,
      netPnlUsd: 0,
      netPnlPct: 0,
      tpReached: false,
      tpCount: 0,
      tpClosePrice: null,
    };

    return {
      inputs,
      primaryResult: emptyGrid,
      oppositeResult: direction === 'BOTH' ? { ...emptyGrid, direction: 'SELL' } : undefined,
      combinedTotalDca: 0,
      combinedTotalOrders: 0,
      combinedFinalBalance: balance || 0,
      combinedFinalEquity: balance || 0,
      combinedGrossPnlUsd: 0,
      combinedCommissionUsd: 0,
      combinedSwapUsd: 0,
      combinedNetPnlUsd: 0,
      combinedNetPnlPct: 0,
      isAccountLiquidated: false,
      liquidationReason: undefined,
    };
  }

  if (direction === 'BOTH') {
    const buyResult = simulateSingleDirectionGrid(inputs, 'BUY');
    const sellResult = simulateSingleDirectionGrid(inputs, 'SELL');

    const combinedTotalDca = buyResult.totalDcaTriggered + sellResult.totalDcaTriggered;
    const combinedTotalOrders = buyResult.totalOrdersTriggered + sellResult.totalOrdersTriggered;
    const combinedRealized = buyResult.realizedPnlUsd + sellResult.realizedPnlUsd;
    const combinedGross = buyResult.grossPnlUsd + sellResult.grossPnlUsd;
    const combinedCommission = buyResult.commissionUsd + sellResult.commissionUsd;
    const combinedSwap = buyResult.swapUsd + sellResult.swapUsd;
    const combinedNetPnl = combinedRealized + combinedGross - combinedCommission - combinedSwap;
    const combinedNetPnlPct = (combinedNetPnl / balance) * 100;

    const isAccountLiquidated = buyResult.isLiquidated || sellResult.isLiquidated;
    const finalBalance = isAccountLiquidated ? 0 : balance + combinedRealized;
    const finalEquity = isAccountLiquidated ? 0 : Math.max(0, balance + combinedNetPnl);

    let liquidationReason = undefined;
    if (buyResult.isLiquidated && sellResult.isLiquidated) {
      liquidationReason = 'Ліквідація обох напрямків сітки через перевищення просадки';
    } else if (buyResult.isLiquidated) {
      liquidationReason = `Stop Out за Long-позицією при ціні ${buyResult.liquidationPrice.toFixed(4)}$`;
    } else if (sellResult.isLiquidated) {
      liquidationReason = `Stop Out за Short-позицією при ціні ${sellResult.liquidationPrice.toFixed(4)}$`;
    }

    return {
      inputs,
      primaryResult: buyResult,
      oppositeResult: sellResult,
      combinedTotalDca,
      combinedTotalOrders,
      combinedFinalBalance: finalBalance,
      combinedFinalEquity: finalEquity,
      combinedGrossPnlUsd: combinedGross,
      combinedCommissionUsd: combinedCommission,
      combinedSwapUsd: combinedSwap,
      combinedNetPnlUsd: combinedNetPnl,
      combinedNetPnlPct,
      isAccountLiquidated,
      liquidationReason,
    };
  }

  const singleResult = simulateSingleDirectionGrid(inputs, direction);
  const isAccountLiquidated = singleResult.isLiquidated;
  const liquidationReason = isAccountLiquidated
    ? `Stop Out за ${direction} позицією на ціні ${singleResult.liquidationPrice.toFixed(4)}$`
    : undefined;

  return {
    inputs,
    primaryResult: singleResult,
    combinedTotalDca: singleResult.totalDcaTriggered,
    combinedTotalOrders: singleResult.totalOrdersTriggered,
    combinedFinalBalance: singleResult.finalBalanceUsd,
    combinedFinalEquity: singleResult.finalEquityUsd,
    combinedGrossPnlUsd: singleResult.grossPnlUsd,
    combinedCommissionUsd: singleResult.commissionUsd,
    combinedSwapUsd: singleResult.swapUsd,
    combinedNetPnlUsd: singleResult.netPnlUsd,
    combinedNetPnlPct: singleResult.netPnlPct,
    isAccountLiquidated,
    liquidationReason,
  };
}
