import React from 'react';
import type { FullCalculationResult } from '../types/trading';
import {
  formatCurrency,
  formatPrice,
  formatPercent,
} from '../utils/formatters';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
} from 'lucide-react';

interface SummaryCardsProps {
  simulation: FullCalculationResult;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ simulation }) => {
  const {
    inputs,
    primaryResult,
    combinedTotalDca,
    combinedTotalOrders,
    combinedFinalBalance,
    combinedFinalEquity,
    combinedNetPnlUsd,
    combinedNetPnlPct,
    isAccountLiquidated,
    liquidationReason,
  } = simulation;

  const isMt5 = inputs.platform === 'MT5_LOTS';
  const isWaiting = !inputs.startPrice || !inputs.endPrice || !inputs.balance;
  const isProfit = combinedNetPnlUsd >= 0;

  const currentPrice = inputs.endPrice;
  const liqPrice = primaryResult.liquidationPrice;
  const distanceToLiqPct =
    liqPrice > 0 && currentPrice > 0
      ? Math.abs(((liqPrice - currentPrice) / currentPrice) * 100)
      : 0;

  const marginLevel =
    primaryResult.finalUsedMarginUsd > 0
      ? (combinedFinalEquity / primaryResult.finalUsedMarginUsd) * 100
      : 0;

  return (
    <div className="summary-section">
      {isAccountLiquidated && (
        <div className="alert-banner">
          <AlertTriangle size={18} className="alert-icon" />
          <div className="alert-text">
            <strong>Stop Out / Ліквідація депозиту!</strong>
            <span> {liquidationReason || 'Рівень маржі впав нижче критичного порогу.'}</span>
            <div className="alert-stats">
              <span>Ціна Stop Out: <strong>${formatPrice(liqPrice)}</strong></span>
              <span>Крок: <strong>#{primaryResult.liquidationStepIndex ?? primaryResult.totalDcaTriggered}</strong></span>
              <span>Баланс: <strong>$0.00 (-100%)</strong></span>
            </div>
          </div>
        </div>
      )}

      <div className="summary-grid">
        {/* Баланс та результат */}
        <div className="kpi-card">
          <div className="kpi-label">Фінальний результат (Equity)</div>
          <div className="kpi-value">
            {isWaiting ? '$0.00' : formatCurrency(combinedFinalEquity)}
          </div>
          <div className="kpi-sub">
            {isWaiting ? (
              <span className="text-secondary">Баланс: $0.00</span>
            ) : (
              <>
                <span className={isProfit ? 'text-profit font-bold' : 'text-loss font-bold'}>
                  {formatCurrency(combinedNetPnlUsd)} ({formatPercent(combinedNetPnlPct)})
                </span>
                <span className="text-secondary">
                  Баланс: {formatCurrency(combinedFinalBalance)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Статус циклу */}
        <div className="kpi-card">
          <div className="kpi-label">Статус циклу</div>
          <div className="kpi-value text-normal">
            {isWaiting ? (
              <span className="status-item text-secondary">
                <Info size={16} /> Очікування вводу
              </span>
            ) : isAccountLiquidated ? (
              <span className="status-item text-loss">
                <AlertTriangle size={16} /> Stop Out
              </span>
            ) : primaryResult.tpReached ? (
              <span className="status-item text-profit">
                <CheckCircle size={16} /> TP виконано ({primaryResult.tpCount})
              </span>
            ) : (
              <span className="status-item text-secondary">
                <Clock size={16} /> В роботі
              </span>
            )}
          </div>
          <div className="kpi-sub">
            {isWaiting ? (
              <span className="text-dim">Введіть ціни та депозит</span>
            ) : (
              <span>
                Угод у сітці: <strong>{combinedTotalOrders}</strong> (1 старт + {combinedTotalDca} доливів)
              </span>
            )}
          </div>
        </div>

        {/* Ціна Stop Out */}
        <div className="kpi-card">
          <div className="kpi-label">Ціна Stop Out (Ліквідація)</div>
          <div className="kpi-value font-mono">
            {isWaiting || liqPrice <= 0 ? '—' : `$${formatPrice(liqPrice)}`}
          </div>
          <div className="kpi-sub">
            {isWaiting ? (
              <span className="text-dim">Дистанція: —</span>
            ) : isAccountLiquidated ? (
              <span className="text-loss">Спрацював Stop Out</span>
            ) : (
              <span>Дистанція: <strong>{distanceToLiqPct.toFixed(2)}%</strong></span>
            )}
          </div>
        </div>

        {/* Take Profit */}
        <div className="kpi-card">
          <div className="kpi-label">Рівень Take Profit</div>
          <div className="kpi-value font-mono text-profit">
            {isWaiting || primaryResult.finalTakeProfitPrice <= 0
              ? '—'
              : `$${formatPrice(primaryResult.finalTakeProfitPrice)}`}
          </div>
          <div className="kpi-sub">
            {isWaiting ? (
              <span className="text-dim">Ціль: —</span>
            ) : (
              <span>
                Ціль: <strong>+{formatCurrency(primaryResult.steps[primaryResult.steps.length - 1]?.takeProfitProfitUsd || 0)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Маржа */}
        <div className="kpi-card">
          <div className="kpi-label">Задіяна маржа</div>
          <div className="kpi-value font-mono">
            {isWaiting ? '$0.00' : formatCurrency(primaryResult.finalUsedMarginUsd)}
          </div>
          <div className="kpi-sub">
            {isWaiting ? (
              <span className="text-dim">Вільна маржа: $0.00</span>
            ) : (
              <span>
                {isMt5
                  ? `Margin Level: ${marginLevel > 0 ? marginLevel.toFixed(0) + '%' : '0%'}`
                  : `Вільна маржа: ${formatCurrency(Math.max(0, combinedFinalEquity - primaryResult.finalUsedMarginUsd))}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
