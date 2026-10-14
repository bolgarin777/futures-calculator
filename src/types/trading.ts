export type TradingPlatform = 'MT5_LOTS' | 'CRYPTO_FUTURES';

export type TradeDirection = 'BUY' | 'SELL' | 'BOTH';

export type TakeProfitMode = 'FIXED_FIRST_ORDER' | 'DYNAMIC_TOTAL_MARGIN' | 'FIXED_PRICE_PCT';

export type FirstOrderMode = 'LOTS' | 'PERCENT';

export interface CalculatorInputs {
  platform: TradingPlatform;
  direction: TradeDirection;
  
  // Базові параметри
  startPrice: number;
  endPrice: number;
  balance: number;
  leverage: number;
  
  // MT5 специфікація
  firstOrderMode: FirstOrderMode; // 'LOTS' (фіксований лот) або 'PERCENT' (% від балансу)
  initialLot: number;             // Початковий лот у MT5 (наприклад 0.01)
  contractSize: number;           // Розмір контракту (100 для золота, 100 000 для форексу)
  minLotStep: number;             // Мінімальний крок лоту (0.01)
  
  // Спред та витрати брокера
  spread: number;                 // Спред брокера в $ (наприклад 0.30 для XAUUSD)
  commissionPerLot: number;       // Комісія за 1 лот ($)
  swap: number;                   // Своп / додаткові витрати ($)
  
  // Стратегія з ТЗ
  firstOrderMarginPct: number;    // % маржі на старті (0.5%)
  takeProfitPct: number;          // % тейк-профіту (25%)
  takeProfitMode: TakeProfitMode; // 'FIXED_FIRST_ORDER' або 'DYNAMIC_TOTAL_MARGIN'
  
  // Доливи (Мартингейл)
  dcaTriggerLossPct: number;      // Просадка для доливу (-80% або -70%)
  dcaStepRatioPct: number;        // Сума доливу (+30% від накопиченої маржі)
  // maxDcaSteps більше не є параметром користувача — алгоритм зупиняється природньо при ліквідації
  
  // Ризик
  stopOutLevelPct: number;        // Margin level stop out (50% для MT5)

}

export interface DcaStep {
  stepIndex: number;              // 0 = старт, 1 = долив 1...
  orderType: 'BUY' | 'SELL';
  openPrice: number;
  volume: number;                 // Лоти ордера (Math.floor до 0.01)
  cumulativeVolume: number;       // Сумарні лоти на цьому кроці
  notionalUsd: number;
  stepMarginUsd: number;
  totalMarginUsd: number;
  totalVolume: number;
  averageEntryPrice: number;
  
  takeProfitPrice: number;
  takeProfitProfitUsd: number;
  requiredBouncePct: number;
  
  // Збиток ордерів
  floatingLossUsd: number;        // Плаваючий збиток сітки на момент відкриття
  floatingLossPctOfMargin: number; // % від маржі
  pnlAtEndPriceUsd?: number;      // PnL цього конкретного ордера на End Price (як у MT5)
  accountEquityUsd: number;
  marginLevelPct: number;
  
  nextDcaPrice: number | null;
  isTriggered: boolean;
  isLiquidated: boolean;
  liquidationPrice: number;
}

export interface GridSimulationResult {
  direction: 'BUY' | 'SELL';
  steps: DcaStep[];
  totalDcaTriggered: number;
  totalOrdersTriggered: number;
  initialMarginUsd: number;
  finalUsedMarginUsd: number;
  finalAveragePrice: number;
  finalTakeProfitPrice: number;
  
  isLiquidated: boolean;
  liquidationPrice: number;
  liquidationStepIndex: number | null;
  
  finalEquityUsd: number;
  finalBalanceUsd: number;
  floatingPnlAtEndPriceUsd: number;
  realizedPnlUsd: number;
  grossPnlUsd: number;
  commissionUsd: number;
  swapUsd: number;
  netPnlUsd: number;
  netPnlPct: number;
  
  tpReached: boolean;
  tpCount: number;
  tpClosePrice: number | null;
}

export interface FullCalculationResult {
  inputs: CalculatorInputs;
  primaryResult: GridSimulationResult;
  oppositeResult?: GridSimulationResult;
  
  combinedTotalDca: number;
  combinedTotalOrders: number;
  combinedFinalBalance: number;
  combinedFinalEquity: number;
  combinedGrossPnlUsd: number;
  combinedCommissionUsd: number;
  combinedSwapUsd: number;
  combinedNetPnlUsd: number;
  combinedNetPnlPct: number;
  isAccountLiquidated: boolean;
  liquidationReason?: string;
}
