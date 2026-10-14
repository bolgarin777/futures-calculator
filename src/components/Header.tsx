import React from 'react';
import type { TradingPlatform } from '../types/trading';
import { Sliders, Layers } from 'lucide-react';

interface HeaderProps {
  platform: TradingPlatform;
  onPlatformChange: (platform: TradingPlatform) => void;
}

export const Header: React.FC<HeaderProps> = ({
  platform,
  onPlatformChange,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <h1 className="brand-title">Калькулятор сітки доливів</h1>
        <span className="brand-badge">MT5 & Futures</span>
      </div>

      <div className="platform-toggle">
        <button
          type="button"
          className={`platform-btn ${platform === 'MT5_LOTS' ? 'active' : ''}`}
          onClick={() => onPlatformChange('MT5_LOTS')}
        >
          <Sliders size={14} />
          <span>MetaTrader 5 (Лоти)</span>
        </button>
        <button
          type="button"
          className={`platform-btn ${platform === 'CRYPTO_FUTURES' ? 'active' : ''}`}
          onClick={() => onPlatformChange('CRYPTO_FUTURES')}
        >
          <Layers size={14} />
          <span>Крипто Ф'ючерси</span>
        </button>
      </div>
    </header>
  );
};
