import React from 'react';
import type { FullCalculationResult } from '../types/trading';
import { formatCurrency, formatPercent, formatPrice } from '../utils/formatters';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface TwoWayComparisonProps {
  simulation: FullCalculationResult;
}

export const TwoWayComparison: React.FC<TwoWayComparisonProps> = ({ simulation }) => {
  const { primaryResult: buyResult, oppositeResult: sellResult } = simulation;

  if (!sellResult || !simulation.inputs.startPrice || !simulation.inputs.endPrice || !simulation.inputs.balance) {
    return null;
  }

  return (
    <div className="two-way-card">
      <div className="two-way-header">
        <h3>Порівняння обох напрямків (Хеджування)</h3>
      </div>

      <div className="two-way-columns">
        <div className="leg-column">
          <div className="leg-title buy">
            <ArrowUp size={14} />
            <span>BUY (Long)</span>
          </div>
          <div className="leg-stats">
            <div className="stat-row">
              <span>Статус:</span>
              <strong>{buyResult.isLiquidated ? 'Stop Out' : buyResult.tpReached ? 'TP досягнуто' : 'В роботі'}</strong>
            </div>
            <div className="stat-row">
              <span>Доливів:</span>
              <strong>{buyResult.totalDcaTriggered}</strong>
            </div>
            <div className="stat-row">
              <span>Середня ціна:</span>
              <strong className="font-mono">${formatPrice(buyResult.finalAveragePrice)}</strong>
            </div>
            <div className="stat-row">
              <span>Take Profit:</span>
              <strong className="font-mono text-profit">${formatPrice(buyResult.finalTakeProfitPrice)}</strong>
            </div>
            <div className="stat-row">
              <span>Ціна Stop Out:</span>
              <strong className="font-mono text-loss">${formatPrice(buyResult.liquidationPrice)}</strong>
            </div>
            <div className="stat-row">
              <span>PnL:</span>
              <strong className={buyResult.netPnlUsd >= 0 ? 'text-profit' : 'text-loss'}>
                {formatCurrency(buyResult.netPnlUsd)} ({formatPercent(buyResult.netPnlPct)})
              </strong>
            </div>
          </div>
        </div>

        <div className="leg-column">
          <div className="leg-title sell">
            <ArrowDown size={14} />
            <span>SELL (Short)</span>
          </div>
          <div className="leg-stats">
            <div className="stat-row">
              <span>Статус:</span>
              <strong>{sellResult.isLiquidated ? 'Stop Out' : sellResult.tpReached ? 'TP досягнуто' : 'В роботі'}</strong>
            </div>
            <div className="stat-row">
              <span>Доливів:</span>
              <strong>{sellResult.totalDcaTriggered}</strong>
            </div>
            <div className="stat-row">
              <span>Середня ціна:</span>
              <strong className="font-mono">${formatPrice(sellResult.finalAveragePrice)}</strong>
            </div>
            <div className="stat-row">
              <span>Take Profit:</span>
              <strong className="font-mono text-profit">${formatPrice(sellResult.finalTakeProfitPrice)}</strong>
            </div>
            <div className="stat-row">
              <span>Ціна Stop Out:</span>
              <strong className="font-mono text-loss">${formatPrice(sellResult.liquidationPrice)}</strong>
            </div>
            <div className="stat-row">
              <span>PnL:</span>
              <strong className={sellResult.netPnlUsd >= 0 ? 'text-profit' : 'text-loss'}>
                {formatCurrency(sellResult.netPnlUsd)} ({formatPercent(sellResult.netPnlPct)})
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
