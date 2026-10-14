import React, { useState } from 'react';
import type { CalculatorInputs, DcaStep } from '../types/trading';
import { generateDcaLadder } from '../engine/calculator';
import {
  formatCurrency,
  formatPrice,
  formatVolume,
} from '../utils/formatters';

interface GridTableProps {
  inputs: CalculatorInputs;
  executedSteps: DcaStep[];
  direction: 'BUY' | 'SELL';
}

export const GridTable: React.FC<GridTableProps> = ({
  inputs,
  executedSteps,
  direction,
}) => {
  const [viewMode, setViewMode] = useState<'EXECUTED' | 'FULL_LADDER'>('EXECUTED');

  const fullLadder = generateDcaLadder(inputs, direction);
  const isMt5 = inputs.platform === 'MT5_LOTS';

  const triggeredSteps = executedSteps.filter((s) => s.isTriggered);
  const stepsToDisplay = viewMode === 'EXECUTED' ? triggeredSteps : fullLadder;

  return (
    <div className="grid-table-card">
      <div className="table-header-wrap">
        <div className="table-title">
          <h3>Таблиця ордерів сітки ({direction})</h3>
        </div>

        <div className="table-view-toggle">
          <button
            type="button"
            className={`view-btn ${viewMode === 'EXECUTED' ? 'active' : ''}`}
            onClick={() => setViewMode('EXECUTED')}
          >
            Відкриті ордери ({triggeredSteps.length})
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'FULL_LADDER' ? 'active' : ''}`}
            onClick={() => setViewMode('FULL_LADDER')}
          >
            Повна драбина до Stop Out ({fullLadder.length})
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="trading-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ціна ордера</th>
              <th>{isMt5 ? 'Лоти (Крок / Разом)' : 'Об\'єм'}</th>
              <th>Номінал ($)</th>
              <th>Маржа</th>
              <th>Сумарна маржа</th>
              <th>Середня ціна</th>
              <th>Take Profit (Відскок)</th>
              <th>PnL на End Price</th>
              <th>Тригер просадки</th>
              <th>Margin Level</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {stepsToDisplay.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  Заповніть початкову ціну, кінцеву ціну та депозит у формі вище для розрахунку сітки ордерів
                </td>
              </tr>
            ) : (
              stepsToDisplay.map((step) => {
                const isStart = step.stepIndex === 0;
              const isExecuted = executedSteps.some(
                (es) => es.stepIndex === step.stepIndex && es.isTriggered
              );

              return (
                <tr
                  key={step.stepIndex}
                  className={`table-row ${
                    step.isLiquidated
                      ? 'row-liquidated'
                      : isExecuted
                      ? 'row-executed'
                      : 'row-pending'
                  }`}
                >
                  <td className="cell-step font-mono">
                    {isStart ? '0 (Старт)' : `#${step.stepIndex}`}
                  </td>

                  <td className="cell-price font-mono">
                    ${formatPrice(step.openPrice)}
                  </td>

                  <td className="cell-volume font-mono">
                    {formatVolume(step.volume, inputs.platform)}
                    {isMt5 && (
                      <span className="sub-hint">
                        ({step.cumulativeVolume.toFixed(2)})
                      </span>
                    )}
                  </td>

                  <td className="cell-notional font-mono">
                    {formatCurrency(step.notionalUsd, 0)}
                  </td>

                  <td className="cell-margin font-mono">
                    {formatCurrency(step.stepMarginUsd)}
                  </td>

                  <td className="cell-total-margin font-mono font-bold">
                    {formatCurrency(step.totalMarginUsd)}
                  </td>

                  <td className="cell-avg font-mono">
                    ${formatPrice(step.averageEntryPrice)}
                  </td>

                  <td className="cell-tp font-mono text-profit">
                    ${formatPrice(step.takeProfitPrice)}
                    <span className="sub-hint">
                      (+{step.requiredBouncePct.toFixed(2)}%)
                    </span>
                  </td>

                  {/* PnL конкретного ордера на End Price (як у MT5) */}
                  <td className="cell-loss font-mono">
                    {step.pnlAtEndPriceUsd !== undefined ? (
                      <span className={step.pnlAtEndPriceUsd >= 0 ? 'text-profit font-bold' : 'text-loss font-bold'}>
                        {formatCurrency(step.pnlAtEndPriceUsd)}
                      </span>
                    ) : (
                      <span className="text-secondary">—</span>
                    )}
                  </td>

                  {/* Просадка на тригері */}
                  <td className="cell-loss font-mono">
                    {isStart ? (
                      <span className="text-secondary">—</span>
                    ) : (
                      <span className="text-loss">
                        -{step.floatingLossPctOfMargin.toFixed(0)}%
                        <span className="sub-hint">({formatCurrency(step.floatingLossUsd)})</span>
                      </span>
                    )}
                  </td>

                  <td className="cell-ml font-mono">
                    <span
                      className={`ml-tag ${
                        step.marginLevelPct < 100
                          ? 'danger'
                          : step.marginLevelPct < 300
                          ? 'warning'
                          : 'safe'
                      }`}
                    >
                      {step.marginLevelPct.toFixed(0)}%
                    </span>
                  </td>

                  <td className="cell-status">
                    {step.isLiquidated ? (
                      <span className="status-pill liquidated">Stop Out</span>
                    ) : isExecuted ? (
                      <span className="status-pill executed">Виконано</span>
                    ) : (
                      <span className="status-pill pending">Очікує</span>
                    )}
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
