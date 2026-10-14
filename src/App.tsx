import { useState, useMemo, useEffect } from 'react';
import type { CalculatorInputs, TradingPlatform } from './types/trading';
import {
  CLEAN_INPUTS,
  DEMO_INPUTS_MT5,
  DEMO_INPUTS_CRYPTO,
} from './constants/defaults';
import { calculateFullSimulation } from './engine/calculator';
import { Header } from './components/Header';
import { ParametersForm } from './components/ParametersForm';
import { SummaryCards } from './components/SummaryCards';
import { GridTable } from './components/GridTable';
import { TwoWayComparison } from './components/TwoWayComparison';
import './App.css';

const SESSION_STORAGE_KEY = 'trading_calc_session_inputs';

export function App() {
  // При вході на сайт форма чиста (якщо в поточному сеансі ще нічого не зберігалося)
  // Між оновленнями сторінки (F5 / reload) значення надійно зберігаються в sessionStorage
  const [inputs, setInputs] = useState<CalculatorInputs>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...CLEAN_INPUTS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to restore session inputs:', e);
    }
    return CLEAN_INPUTS;
  });

  // Автоматичне збереження будь-яких змін форми в межах сеансу
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(inputs));
    } catch (e) {
      console.warn('Failed to save session inputs:', e);
    }
  }, [inputs]);

  const simulation = useMemo(() => {
    return calculateFullSimulation(inputs);
  }, [inputs]);

  const handleInputChange = (updated: Partial<CalculatorInputs>) => {
    setInputs((prev) => ({ ...prev, ...updated }));
  };

  const handlePlatformChange = (platform: TradingPlatform) => {
    if (platform === 'CRYPTO_FUTURES') {
      setInputs((prev) => ({
        ...prev,
        platform,
        contractSize: 1,
        minLotStep: 0.001,
        stopOutLevelPct: 1,
      }));
    } else {
      setInputs((prev) => ({
        ...prev,
        platform,
        contractSize: 100,
        minLotStep: 0.01,
        initialLot: prev.initialLot || 0.01,
        stopOutLevelPct: 50,
      }));
    }
  };

  // Повне очищення форми
  const handleReset = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear sessionStorage:', e);
    }
    setInputs({
      ...CLEAN_INPUTS,
      platform: inputs.platform,
      contractSize: inputs.platform === 'CRYPTO_FUTURES' ? 1 : 100,
      minLotStep: inputs.platform === 'CRYPTO_FUTURES' ? 0.001 : 0.01,
      stopOutLevelPct: inputs.platform === 'CRYPTO_FUTURES' ? 1 : 50,
    });
  };

  // Завантаження демонстраційного прикладу
  const handleLoadDemo = () => {
    const demo = inputs.platform === 'CRYPTO_FUTURES' ? DEMO_INPUTS_CRYPTO : DEMO_INPUTS_MT5;
    setInputs(demo);
  };

  return (
    <div className="app-container">
      <Header
        platform={inputs.platform}
        onPlatformChange={handlePlatformChange}
      />

      <main className="main-content">
        <ParametersForm
          inputs={inputs}
          onChange={handleInputChange}
          onReset={handleReset}
          onLoadDemo={handleLoadDemo}
        />

        <SummaryCards simulation={simulation} />

        {inputs.direction === 'BOTH' && (
          <TwoWayComparison simulation={simulation} />
        )}

        <GridTable
          inputs={inputs}
          executedSteps={simulation.primaryResult.steps}
          direction={inputs.direction === 'BOTH' ? 'BUY' : inputs.direction}
        />
      </main>

      <footer className="app-footer">
        <p>
          Калькулятор сітки доливів за алгоритмом мартингейлу • MT5 (Лоти 0.01) & Крипто Ф'ючерси
        </p>
      </footer>
    </div>
  );
}

export default App;
