export function formatCurrency(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPrice(price: number): string {
  if (isNaN(price) || !isFinite(price)) return '0.00';
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } else {
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }
}

export function formatVolume(volume: number, platform: 'MT5_LOTS' | 'CRYPTO_FUTURES'): string {
  if (isNaN(volume) || !isFinite(volume)) return '0.00';
  if (platform === 'MT5_LOTS') {
    return `${volume.toFixed(2)} lots`;
  }
  return volume >= 10 ? volume.toFixed(3) : volume.toFixed(4);
}

export function formatPercent(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '0.00%';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}%`;
}

