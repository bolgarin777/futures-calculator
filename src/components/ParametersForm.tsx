import React from 'react';
import type {
  CalculatorInputs,
  TakeProfitMode,
} from '../types/trading';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ParametersFormProps {
  inputs: CalculatorInputs;
  onChange: (updated: Partial<CalculatorInputs>) => void;
  onReset?: () => void;
  onLoadDemo?: () => void;
}

export const ParametersForm: React.FC<ParametersFormProps> = ({
  inputs,
  onChange,
  onReset,
  onLoadDemo,
}) => {
  const isMt5 = inputs.platform === 'MT5_LOTS';

  return (
    <div className="parameters-card">
      <div className="parameters-header">
        <h2 className="section-title">Параметри розрахунку</h2>
        <div className="form-actions">
          {onLoadDemo && (
            <button
              type="button"
              className="action-pill-btn demo"
              onClick={onLoadDemo}
              title="Заповнити форму тестовим прикладом"
            >
              <Sparkles size={13} />
              <span>Демо-приклад</span>
            </button>
          )}
          {onReset && (
            <button
              type="button"
              className="action-pill-btn reset"
              onClick={onReset}
              title="Очистити всі поля форми"
            >
              <RotateCcw size={13} />
              <span>Очистити форму</span>
            </button>
          )}
        </div>
      </div>

      <div className="params-grid">
        {/* Базові параметри */}
        <div className="param-group-box">
          <div className="group-title">Базові дані</div>

          <div className="input-field">
            <label>Початкова ціна (Start Price)</label>
            <div className="input-with-addon">
              <span className="input-addon">$</span>
              <input
                type="number"
                step="any"
                min="0.000001"
                placeholder="0.00"
                value={inputs.startPrice || ''}
                onChange={(e) =>
                  onChange({
                    startPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="input-field">
            <label>Кінцева ціна (End Price)</label>
            <div className="input-with-addon">
              <span className="input-addon">$</span>
              <input
                type="number"
                step="any"
                min="0.000001"
                placeholder="0.00"
                value={inputs.endPrice || ''}
                onChange={(e) =>
                  onChange({
                    endPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <span className="field-hint">
              {inputs.startPrice > 0 && inputs.endPrice > 0 ? (
                `Зміна: ${(((inputs.endPrice - inputs.startPrice) / inputs.startPrice) * 100).toFixed(2)}%`
              ) : (
                'Зміна: —'
              )}
            </span>
          </div>

          <div className="input-field">
            <label>Баланс депозиту</label>
            <div className="input-with-addon">
              <span className="input-addon">$</span>
              <input
                type="number"
                step="100"
                min="1"
                placeholder="0.00"
                value={inputs.balance || ''}
                onChange={(e) =>
                  onChange({
                    balance: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="input-field">
            <label>Плече (Leverage)</label>
            <div className="input-with-addon">
              <span className="input-addon">1:</span>
              <input
                type="number"
                step="1"
                min="1"
                max="3000"
                placeholder="100"
                value={inputs.leverage || ''}
                onChange={(e) =>
                  onChange({
                    leverage: e.target.value === '' ? 0 : Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Напрямок та Специфікація об'єму */}
        <div className="param-group-box">
          <div className="group-title">Напрямок та Об'єм</div>

          <div className="input-field">
            <label>Напрямок торгівлі</label>
            <div className="direction-toggle">
              <button
                type="button"
                className={`dir-btn buy ${inputs.direction === 'BUY' ? 'active' : ''}`}
                onClick={() => onChange({ direction: 'BUY' })}
              >
                <ArrowUp size={13} />
                <span>BUY</span>
              </button>
              <button
                type="button"
                className={`dir-btn sell ${inputs.direction === 'SELL' ? 'active' : ''}`}
                onClick={() => onChange({ direction: 'SELL' })}
              >
                <ArrowDown size={13} />
                <span>SELL</span>
              </button>
              <button
                type="button"
                className={`dir-btn both ${inputs.direction === 'BOTH' ? 'active' : ''}`}
                onClick={() => onChange({ direction: 'BOTH' })}
              >
                <ArrowUpDown size={13} />
                <span>2 Напрями</span>
              </button>
            </div>
          </div>

          {isMt5 ? (
            <>
              <div className="input-field">
                <label>Розрахунок 1-ї угоди в MT5</label>
                <div className="mini-toggle">
                  <button
                    type="button"
                    className={`mini-toggle-btn ${inputs.firstOrderMode === 'LOTS' ? 'active' : ''}`}
                    onClick={() => onChange({ firstOrderMode: 'LOTS' })}
                  >
                    Фіксований лот
                  </button>
                  <button
                    type="button"
                    className={`mini-toggle-btn ${inputs.firstOrderMode === 'PERCENT' ? 'active' : ''}`}
                    onClick={() => onChange({ firstOrderMode: 'PERCENT' })}
                  >
                    % від балансу
                  </button>
                </div>
              </div>

              {inputs.firstOrderMode === 'LOTS' ? (
                <div className="input-field">
                  <label>Початковий лот (мін. 0.01)</label>
                  <div className="input-with-addon">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.01"
                      value={inputs.initialLot || ''}
                      onChange={(e) =>
                        onChange({
                          initialLot: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0.01,
                        })
                      }
                    />
                    <span className="input-addon-right">лот</span>
                  </div>
                </div>
              ) : (
                <div className="input-field">
                  <label>Маржа 1-ї угоди (% від балансу)</label>
                  <div className="input-with-addon">
                    <input
                      type="number"
                      step="0.1"
                      min="0.01"
                      max="100"
                      placeholder="0.5"
                      value={inputs.firstOrderMarginPct || ''}
                      onChange={(e) =>
                        onChange({
                          firstOrderMarginPct: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0.5,
                        })
                      }
                    />
                    <span className="input-addon-right">%</span>
                  </div>
                </div>
              )}

              <div className="input-field">
                <label>Розмір контракту (Contract Size)</label>
                <div className="input-with-addon">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="100"
                    value={inputs.contractSize || ''}
                    onChange={(e) =>
                      onChange({
                        contractSize: e.target.value === '' ? 0 : parseFloat(e.target.value) || 1,
                      })
                    }
                  />
                  <span className="input-addon-right">од./лот</span>
                </div>
              </div>
            </>
          ) : (
            <div className="input-field">
              <label>Маржа 1-ї угоди (% від балансу)</label>
              <div className="input-with-addon">
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  max="100"
                  placeholder="0.5"
                  value={inputs.firstOrderMarginPct || ''}
                  onChange={(e) =>
                    onChange({
                      firstOrderMarginPct: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0.5,
                    })
                  }
                />
                <span className="input-addon-right">%</span>
              </div>
            </div>
          )}
        </div>

        {/* Доливи та Stop Out */}
        <div className="param-group-box">
          <div className="group-title">Мартингейл / Доливи</div>

          <div className="input-field">
            <label>Тригер доливу (просадка від маржі)</label>
            <div className="input-with-addon">
              <span className="input-addon negative">-</span>
              <input
                type="number"
                step="1"
                min="1"
                max="300"
                placeholder="80"
                value={inputs.dcaTriggerLossPct || ''}
                onChange={(e) =>
                  onChange({
                    dcaTriggerLossPct: e.target.value === '' ? 0 : parseFloat(e.target.value) || 1,
                  })
                }
              />
              <span className="input-addon-right">%</span>
            </div>
          </div>

          <div className="input-field">
            <label>Сума доливу (% від накопиченої маржі)</label>
            <div className="input-with-addon">
              <span className="input-addon positive">+</span>
              <input
                type="number"
                step="1"
                min="1"
                max="500"
                placeholder="30"
                value={inputs.dcaStepRatioPct || ''}
                onChange={(e) =>
                  onChange({
                    dcaStepRatioPct: e.target.value === '' ? 0 : parseFloat(e.target.value) || 1,
                  })
                }
              />
              <span className="input-addon-right">%</span>
            </div>
          </div>

          <div className="input-field">
            <label>Рівень Stop Out / Ліквідації</label>
            <div className="input-with-addon">
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="50"
                value={inputs.stopOutLevelPct !== undefined && inputs.stopOutLevelPct !== null ? inputs.stopOutLevelPct : ''}
                onChange={(e) =>
                  onChange({
                    stopOutLevelPct: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                  })
                }
              />
              <span className="input-addon-right">
                {isMt5 ? '% ML' : '% MMR'}
              </span>
            </div>
          </div>
        </div>

        {/* Take Profit та Витрати */}
        <div className="param-group-box">
          <div className="group-title">Take Profit та Витрати</div>

          <div className="input-field">
            <label>Цільовий TP (%)</label>
            <div className="input-with-addon">
              <input
                type="number"
                step="1"
                min="0.1"
                max="500"
                placeholder="25"
                value={inputs.takeProfitPct || ''}
                onChange={(e) =>
                  onChange({
                    takeProfitPct: e.target.value === '' ? 0 : parseFloat(e.target.value) || 1,
                  })
                }
              />
              <span className="input-addon-right">%</span>
            </div>
          </div>

          <div className="input-field">
            <label>Логіка перерахунку TP</label>
            <select
              className="select-input"
              value={inputs.takeProfitMode}
              onChange={(e) => onChange({ takeProfitMode: e.target.value as TakeProfitMode })}
            >
              <option value="FIXED_FIRST_ORDER">
                Фіксований у $ від 1-ї угоди
              </option>
              <option value="DYNAMIC_TOTAL_MARGIN">
                Від поточної сумарної маржі ($ зростає)
              </option>
              <option value="FIXED_PRICE_PCT">
                Фіксований ціновий % від точки беззбитковості
              </option>
            </select>
          </div>

          <div className="input-field">
            <label>Спред брокера ($ / пункти)</label>
            <div className="input-with-addon">
              <span className="input-addon">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={inputs.spread === 0 ? '' : inputs.spread}
                onChange={(e) =>
                  onChange({
                    spread: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="input-field">
            <label>Комісія ($ за 1 лот)</label>
            <div className="input-with-addon">
              <span className="input-addon">$</span>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0.00"
                value={inputs.commissionPerLot === 0 ? '' : inputs.commissionPerLot}
                onChange={(e) =>
                  onChange({
                    commissionPerLot: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="input-field">
            <label>Своп / Разом витрати ($)</label>
            <div className="input-with-addon">
              <span className="input-addon">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={inputs.swap === 0 ? '' : inputs.swap}
                onChange={(e) =>
                  onChange({
                    swap: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
