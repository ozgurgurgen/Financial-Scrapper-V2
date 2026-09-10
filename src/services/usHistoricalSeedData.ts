export interface UsHistoricalCandleSeed {
  ticker: string;
  assetType: 'STOCK' | 'ETF';
  currency: string;
  period: string;
  date: string;
  timestamp: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  adjClose?: string;
}

export function generateUsHistoricalCandlesSeed(): UsHistoricalCandleSeed[] {
  const assets: { ticker: string; assetType: 'STOCK' | 'ETF'; basePrice: number; startPrice: number; volMultiplier: number }[] = [
    { ticker: 'AAPL', assetType: 'STOCK', basePrice: 228.50, startPrice: 115.00, volMultiplier: 45000000 },
    { ticker: 'MSFT', assetType: 'STOCK', basePrice: 448.20, startPrice: 210.00, volMultiplier: 22000000 },
    { ticker: 'NVDA', assetType: 'STOCK', basePrice: 119.80, startPrice: 14.50, volMultiplier: 65000000 },
    { ticker: 'GOOGL', assetType: 'STOCK', basePrice: 162.40, startPrice: 75.00, volMultiplier: 25000000 },
    { ticker: 'AMZN', assetType: 'STOCK', basePrice: 178.60, startPrice: 155.00, volMultiplier: 38000000 },
    { ticker: 'TSLA', assetType: 'STOCK', basePrice: 214.50, startPrice: 140.00, volMultiplier: 85000000 },
    { ticker: 'META', assetType: 'STOCK', basePrice: 512.00, startPrice: 260.00, volMultiplier: 16000000 },
    { ticker: 'SPY', assetType: 'ETF', basePrice: 550.80, startPrice: 335.00, volMultiplier: 52000000 },
    { ticker: 'QQQ', assetType: 'ETF', basePrice: 478.40, startPrice: 275.00, volMultiplier: 42000000 },
    { ticker: 'VOO', assetType: 'ETF', basePrice: 505.20, startPrice: 308.00, volMultiplier: 7500000 },
    { ticker: 'SCHD', assetType: 'ETF', basePrice: 82.50, startPrice: 58.00, volMultiplier: 4200000 }
  ];

  const result: UsHistoricalCandleSeed[] = [];
  const DAYS_BACK = 250; // 1 trading year of daily bars

  const now = new Date();

  for (const asset of assets) {
    let current = asset.startPrice;
    const priceStep = (asset.basePrice - asset.startPrice) / DAYS_BACK;

    for (let d = DAYS_BACK; d >= 0; d--) {
      const dateObj = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      const dateStr = dateObj.toISOString().split('T')[0];
      const noise = (Math.sin(d * 0.25 + asset.ticker.charCodeAt(0)) * 0.02) + ((Math.random() - 0.48) * 0.015);
      current = Math.max(current + priceStep + (current * noise), 1.0);

      const open = Number((current * (1 - (Math.random() * 0.008 - 0.004))).toFixed(2));
      const high = Number((Math.max(open, current) * (1 + Math.random() * 0.012)).toFixed(2));
      const low = Number((Math.min(open, current) * (1 - Math.random() * 0.012)).toFixed(2));
      const close = Number(current.toFixed(2));
      const volume = Math.round(asset.volMultiplier * (0.7 + Math.random() * 0.6));

      result.push({
        ticker: asset.ticker,
        assetType: asset.assetType,
        currency: 'USD',
        period: 'DAILY',
        date: dateStr,
        timestamp: dateObj,
        open: open.toString(),
        high: high.toString(),
        low: low.toString(),
        close: close.toString(),
        volume: volume.toString(),
        adjClose: close.toString()
      });
    }
  }

  return result;
}
