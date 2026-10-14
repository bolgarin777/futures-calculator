import type { CalculatorInputs } from '../types/trading';

/**
 * Чисті початкові параметри форми при першому заході на сайт
 */
export const CLEAN_INPUTS: CalculatorInputs = {
  platform: 'MT5_LOTS',
  direction: 'BUY',
  startPrice: 0,
  endPrice: 0,
  balance: 0,
  leverage: 100,
  firstOrderMode: 'LOTS',
  initialLot: 0.01,
  contractSize: 100, // 100 для золота XAUUSD у MT5
  minLotStep: 0.01,
  spread: 0.0,
  commissionPerLot: 0.0,
  swap: 0.0,
  firstOrderMarginPct: 0.5,
  takeProfitPct: 25,
  takeProfitMode: 'FIXED_FIRST_ORDER',
  dcaTriggerLossPct: 80,
  dcaStepRatioPct: 30,
  stopOutLevelPct: 50,
};

/**
 * Демонстраційні приклади для швидкого тестування
 */
export const DEMO_INPUTS_MT5: CalculatorInputs = {
  ...CLEAN_INPUTS,
  startPrice: 4181.54,
  endPrice: 4077.21,
  balance: 11300,
};

export const DEMO_INPUTS_CRYPTO: CalculatorInputs = {
  ...CLEAN_INPUTS,
  platform: 'CRYPTO_FUTURES',
  direction: 'BUY',
  startPrice: 65000,
  endPrice: 60000,
  balance: 5000,
  leverage: 20,
  firstOrderMode: 'PERCENT',
  contractSize: 1,
  minLotStep: 0.001,
  stopOutLevelPct: 1,
};

export const DEFAULT_INPUTS: CalculatorInputs = CLEAN_INPUTS;
