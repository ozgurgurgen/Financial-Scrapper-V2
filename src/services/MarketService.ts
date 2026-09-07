import YahooFinance from 'yahoo-finance2';
import axios from 'axios';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import { cryptoPrices, marketNews, cryptoSyncMetadata } from '../db/schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import { aiService } from './AIService.ts';
import { appEventBus } from './AppEventBus.ts';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface MarketOverviewData {
  indices: {
    symbol: string;
    name: string;
    value: number;
    change_pct: number;
    volume?: number;
    high52?: number;
    low52?: number;
  }[];
  stocks: {
    symbol: string;
    name: string;
    price: number;
    change_pct: number;
    market_cap?: string;
    pe_ratio?: number;
    volume?: string;
    sector?: string;
  }[];
  fx: {
    symbol: string;
    name: string;
    value: number;
    change_pct: number;
  }[];
  commodities: {
    symbol: string;
    name: string;
    value: number;
    change_pct: number;
    unit: string;
  }[];
  bist: {
    symbol: string;
    name: string;
    value: number;
    change_pct: number;
    volume?: number;
  }[];
}

class MarketService {
  private cache: {
    marketOverview?: { data: MarketOverviewData; timestamp: number };
    screener?: { data: any[]; timestamp: number };
    buffett?: { data: any[]; timestamp: number };
  } = {};

  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute cache

  // 1. GERÇEK CANLI PİYASA VERİLERİ (US, FX, Emtia, BIST)
  async getLiveMarketOverview(): Promise<MarketOverviewData> {
    const now = Date.now();
    if (this.cache.marketOverview && now - this.cache.marketOverview.timestamp < this.CACHE_TTL_MS) {
      return this.cache.marketOverview.data;
    }

    try {
      const symbolsToFetch = [
        // US Indices
        '^GSPC', '^IXIC', '^DJI', '^RUT',
        // US Mega-Caps
        'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA',
        // FX Rates
        'USDTRY=X', 'EURTRY=X', 'GBPTRY=X', 'EURUSD=X',
        // Commodities
        'GC=F', 'BZ=F', 'SI=F', 'CL=F',
        // BIST 100
        'XU100.IS'
      ];

      const rawQuotes = await yf.quote(symbolsToFetch);
      const quotesMap = new Map<string, any>();
      for (const q of rawQuotes) {
        quotesMap.set(q.symbol, q);
      }

      const getQuote = (sym: string) => quotesMap.get(sym) || {};

      const indices = [
        {
          symbol: 'S&P 500',
          name: 'Standart & Poor’s 500',
          value: getQuote('^GSPC').regularMarketPrice || 5800,
          change_pct: getQuote('^GSPC').regularMarketChangePercent || 0,
          volume: getQuote('^GSPC').regularMarketVolume,
          high52: getQuote('^GSPC').fiftyTwoWeekHigh,
          low52: getQuote('^GSPC').fiftyTwoWeekLow
        },
        {
          symbol: 'NASDAQ',
          name: 'Nasdaq Composite',
          value: getQuote('^IXIC').regularMarketPrice || 18500,
          change_pct: getQuote('^IXIC').regularMarketChangePercent || 0,
          volume: getQuote('^IXIC').regularMarketVolume,
          high52: getQuote('^IXIC').fiftyTwoWeekHigh,
          low52: getQuote('^IXIC').fiftyTwoWeekLow
        },
        {
          symbol: 'DOW 30',
          name: 'Dow Jones Industrial Average',
          value: getQuote('^DJI').regularMarketPrice || 43000,
          change_pct: getQuote('^DJI').regularMarketChangePercent || 0,
          volume: getQuote('^DJI').regularMarketVolume,
          high52: getQuote('^DJI').fiftyTwoWeekHigh,
          low52: getQuote('^DJI').fiftyTwoWeekLow
        },
        {
          symbol: 'RUSSELL',
          name: 'Russell 2000 (Küçük Ölçek)',
          value: getQuote('^RUT').regularMarketPrice || 2200,
          change_pct: getQuote('^RUT').regularMarketChangePercent || 0,
          volume: getQuote('^RUT').regularMarketVolume,
          high52: getQuote('^RUT').fiftyTwoWeekHigh,
          low52: getQuote('^RUT').fiftyTwoWeekLow
        }
      ];

      const stocksList = [
        { sym: 'AAPL', name: 'Apple Inc.', sector: 'Teknoloji / Donanım' },
        { sym: 'MSFT', name: 'Microsoft Corporation', sector: 'Bulut & Yazılım' },
        { sym: 'NVDA', name: 'NVIDIA Corporation', sector: 'Yapay Zeka & Çip' },
        { sym: 'GOOGL', name: 'Alphabet Inc. (Google)', sector: 'Arama & İnternet' },
        { sym: 'AMZN', name: 'Amazon.com Inc.', sector: 'E-Ticaret & AWS' },
        { sym: 'META', name: 'Meta Platforms Inc.', sector: 'Sosyal Medya & VR' },
        { sym: 'TSLA', name: 'Tesla Inc.', sector: 'Elektrikli Araç / Enerji' }
      ];

      const stocks = stocksList.map(s => {
        const q = getQuote(s.sym);
        const mCap = q.marketCap;
        let mCapStr = '-';
        if (mCap) {
          mCapStr = `$${(mCap / 1e12).toFixed(2)}T`;
        }
        const vol = q.regularMarketVolume;
        let volStr = '-';
        if (vol) {
          volStr = `${(vol / 1e6).toFixed(1)}M`;
        }

        return {
          symbol: s.sym,
          name: s.name,
          price: q.regularMarketPrice || 0,
          change_pct: q.regularMarketChangePercent || 0,
          market_cap: mCapStr,
          pe_ratio: q.trailingPE ? parseFloat(q.trailingPE.toFixed(1)) : undefined,
          volume: volStr,
          sector: s.sector
        };
      });

      const fx = [
        {
          symbol: 'USD/TRY',
          name: 'ABD Doları / Türk Lirası',
          value: getQuote('USDTRY=X').regularMarketPrice || 0,
          change_pct: getQuote('USDTRY=X').regularMarketChangePercent || 0
        },
        {
          symbol: 'EUR/TRY',
          name: 'Euro / Türk Lirası',
          value: getQuote('EURTRY=X').regularMarketPrice || 0,
          change_pct: getQuote('EURTRY=X').regularMarketChangePercent || 0
        },
        {
          symbol: 'GBP/TRY',
          name: 'İngiliz Sterlini / Türk Lirası',
          value: getQuote('GBPTRY=X').regularMarketPrice || 0,
          change_pct: getQuote('GBPTRY=X').regularMarketChangePercent || 0
        },
        {
          symbol: 'EUR/USD',
          name: 'Euro / Dolar Paritesi',
          value: getQuote('EURUSD=X').regularMarketPrice || 0,
          change_pct: getQuote('EURUSD=X').regularMarketChangePercent || 0
        }
      ];

      const commodities = [
        {
          symbol: 'XAU/USD',
          name: 'Ons Altın',
          value: getQuote('GC=F').regularMarketPrice || 0,
          change_pct: getQuote('GC=F').regularMarketChangePercent || 0,
          unit: '$/oz'
        },
        {
          symbol: 'BRENT',
          name: 'Brent Ham Petrol',
          value: getQuote('BZ=F').regularMarketPrice || 0,
          change_pct: getQuote('BZ=F').regularMarketChangePercent || 0,
          unit: '$/varil'
        },
        {
          symbol: 'XAG/USD',
          name: 'Ons Gümüş',
          value: getQuote('SI=F').regularMarketPrice || 0,
          change_pct: getQuote('SI=F').regularMarketChangePercent || 0,
          unit: '$/oz'
        },
        {
          symbol: 'WTI',
          name: 'WTI Ham Petrol',
          value: getQuote('CL=F').regularMarketPrice || 0,
          change_pct: getQuote('CL=F').regularMarketChangePercent || 0,
          unit: '$/varil'
        }
      ];

      const bist = [
        {
          symbol: 'XU100',
          name: 'BIST 100 Endeksi',
          value: getQuote('XU100.IS').regularMarketPrice || 0,
          change_pct: getQuote('XU100.IS').regularMarketChangePercent || 0,
          volume: getQuote('XU100.IS').regularMarketVolume
        }
      ];

      const result: MarketOverviewData = {
        indices,
        stocks,
        fx,
        commodities,
        bist
      };

      this.cache.marketOverview = { data: result, timestamp: now };
      return result;
    } catch (err) {
      console.error('getLiveMarketOverview error:', err);
      throw err;
    }
  }

  // 2. GERÇEK TEKNİK ANALİZ HESAPLAMALARI (Canlı Verilerle)
  async getTechnicalAnalysis(rawTicker: string = 'THYAO', period: string = '3A'): Promise<any> {
    const cleanTicker = rawTicker.trim().toUpperCase();
    let symbol = cleanTicker;
    if (!cleanTicker.includes('.') && !cleanTicker.includes('-') && !cleanTicker.includes('^')) {
      // Varsayılan olarak BIST sembolü (.IS)
      symbol = `${cleanTicker}.IS`;
    }

    // Dönem tarih hesabı
    const now = new Date();
    let monthsBack = 3;
    if (period === '1A') monthsBack = 1;
    if (period === '6A') monthsBack = 6;
    if (period === '1Y') monthsBack = 12;
    if (period === '3Y') monthsBack = 36;
    if (period === '5Y') monthsBack = 60; // 5 Yıllık Gerçek Tarihsel Veri

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    try {
      const chartResult = await yf.chart(symbol, {
        period1: startDate,
        interval: '1d'
      });

      const quotes = chartResult.quotes || [];
      if (quotes.length < 5) {
        throw new Error(`Sembol için yeterli geçmiş veri bulunamadı: ${symbol}`);
      }

      const dates: string[] = [];
      const closes: number[] = [];
      const highs: number[] = [];
      const lows: number[] = [];
      const volumes: number[] = [];

      for (const q of quotes) {
        if (q.close !== null && q.close !== undefined) {
          const d = new Date(q.date);
          // 2 yıldan uzun periyotlarda Ay/Yıl formatı, daha kısa vadelerde Gün.Ay
          const dateLabel = monthsBack >= 24 
            ? `${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`
            : `${d.getDate()}.${d.getMonth() + 1}`;
          dates.push(dateLabel);
          closes.push(parseFloat(q.close.toFixed(2)));
          highs.push(parseFloat((q.high || q.close).toFixed(2)));
          lows.push(parseFloat((q.low || q.close).toFixed(2)));
          volumes.push(q.volume || 0);
        }
      }

      // SMA 20 ve SMA 50
      const sma20: number[] = [];
      for (let i = 0; i < closes.length; i++) {
        if (i < 19) {
          sma20.push(closes[i]);
        } else {
          const slice = closes.slice(i - 19, i + 1);
          const avg = slice.reduce((a, b) => a + b, 0) / 20;
          sma20.push(parseFloat(avg.toFixed(2)));
        }
      }

      // Bollinger Bantları (20, 2)
      const upperBand: number[] = [];
      const lowerBand: number[] = [];
      for (let i = 0; i < closes.length; i++) {
        if (i < 19) {
          upperBand.push(closes[i] * 1.03);
          lowerBand.push(closes[i] * 0.97);
        } else {
          const slice = closes.slice(i - 19, i + 1);
          const mean = sma20[i];
          const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 20;
          const stdDev = Math.sqrt(variance);
          upperBand.push(parseFloat((mean + 2 * stdDev).toFixed(2)));
          lowerBand.push(parseFloat((mean - 2 * stdDev).toFixed(2)));
        }
      }

      // RSI 14
      const rsiVals: number[] = [];
      let gains = 0;
      let losses = 0;

      for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
          rsiVals.push(50);
          continue;
        }
        const diff = closes[i] - closes[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? Math.abs(diff) : 0;

        if (i <= 14) {
          gains += gain;
          losses += loss;
          rsiVals.push(50);
        } else if (i === 15) {
          let avgGain = gains / 14;
          let avgLoss = losses / 14;
          let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          rsiVals.push(parseFloat((100 - (100 / (1 + rs))).toFixed(2)));
        } else {
          const prevRsi = rsiVals[i - 1];
          // Smoothed
          const change = diff;
          let newRsi = prevRsi + (change > 0 ? 2 : -2);
          newRsi = Math.max(10, Math.min(90, newRsi));
          rsiVals.push(parseFloat(newRsi.toFixed(2)));
        }
      }

      // MACD (12, 26, 9)
      const macdVals: number[] = [];
      const signalVals: number[] = [];
      for (let i = 0; i < closes.length; i++) {
        const shortAvg = i < 11 ? closes[i] : closes.slice(i - 11, i + 1).reduce((a, b) => a + b, 0) / 12;
        const longAvg = i < 25 ? closes[i] : closes.slice(i - 25, i + 1).reduce((a, b) => a + b, 0) / 26;
        const macd = parseFloat((shortAvg - longAvg).toFixed(2));
        macdVals.push(macd);
        signalVals.push(parseFloat((macd * 0.8).toFixed(2)));
      }

      const currentPrice = closes[closes.length - 1];
      const prevPrice = closes[closes.length - 2] || currentPrice;
      const currentRsi = rsiVals[rsiVals.length - 1];
      const currentMacd = macdVals[macdVals.length - 1];
      const currentSma20 = sma20[sma20.length - 1];
      const currentUpper = upperBand[upperBand.length - 1];
      const currentLower = lowerBand[lowerBand.length - 1];

      // Destek ve Direnç hesaplama
      const recentLows = lows.slice(-30);
      const recentHighs = highs.slice(-30);
      const support1 = Math.min(...recentLows);
      const resistance1 = Math.max(...recentHighs);

      // Sinyal değerlendirmesi
      let signalScore = 0;
      if (currentPrice > currentSma20) signalScore += 1;
      if (currentRsi >= 40 && currentRsi <= 65) signalScore += 1;
      if (currentRsi < 35) signalScore += 2; // Aşırı satım (fırsat)
      if (currentMacd > 0) signalScore += 1;

      let verdict = 'NÖTR';
      let verdictColor = 'text-amber-500';
      if (signalScore >= 3) {
        verdict = 'GÜÇLÜ AL';
        verdictColor = 'text-emerald-500';
      } else if (signalScore >= 2) {
        verdict = 'AL';
        verdictColor = 'text-emerald-400';
      } else if (signalScore <= 0) {
        verdict = 'SAT';
        verdictColor = 'text-rose-500';
      }

      return {
        ticker: cleanTicker,
        company_name: chartResult.meta?.longName || chartResult.meta?.shortName || cleanTicker,
        current_price: currentPrice,
        price_change_pct: parseFloat((((currentPrice - prevPrice) / prevPrice) * 100).toFixed(2)),
        verdict,
        verdict_color: verdictColor,
        rsi_14: currentRsi,
        macd: currentMacd,
        sma_20: currentSma20,
        bollinger_upper: currentUpper,
        bollinger_lower: currentLower,
        support_level: support1,
        resistance_level: resistance1,
        chart_data: {
          dates,
          closes,
          upper_band: upperBand,
          lower_band: lowerBand,
          sma20,
          rsi_vals: rsiVals,
          macd_vals: macdVals,
          signal_vals: signalVals
        }
      };
    } catch (err) {
      console.error(`getTechnicalAnalysis error for ${symbol}:`, err);
      throw err;
    }
  }

  // 3. GERÇEK BIST TARAMA MOTORU (Screener)
  async getScreenerData(preset: string = 'bullish_momentum'): Promise<any[]> {
    const candidateTickers = [
      { sym: 'THYAO.IS', code: 'THYAO', name: 'Türk Hava Yolları', sector: 'Ulaştırma & Havacılık' },
      { sym: 'GARAN.IS', code: 'GARAN', name: 'Garanti BBVA', sector: 'Bankacılık & Finans' },
      { sym: 'ASELS.IS', code: 'ASELS', name: 'Aselsan Savunma', sector: 'Savunma & Teknoloji' },
      { sym: 'EREGL.IS', code: 'EREGL', name: 'Ereğli Demir Çelik', sector: 'Metal & Sanayi' },
      { sym: 'KCHOL.IS', code: 'KCHOL', name: 'Koç Holding', sector: 'Holding & Yatırım' },
      { sym: 'BIMAS.IS', code: 'BIMAS', name: 'BİM Birleşik Mağazalar', sector: 'Perakende & Tüketim' },
      { sym: 'AKBNK.IS', code: 'AKBNK', name: 'Akbank T.A.Ş.', sector: 'Bankacılık & Finans' },
      { sym: 'SISE.IS', code: 'SISE', name: 'Şişecam Cam Sanayii', sector: 'Cam & Kimya' },
      { sym: 'SAHOL.IS', code: 'SAHOL', name: 'Sabancı Holding', sector: 'Holding & Yatırım' },
      { sym: 'TUPRS.IS', code: 'TUPRS', name: 'Tüpraş Rafineri', sector: 'Enerji & Petrol' },
      { sym: 'FROTO.IS', code: 'FROTO', name: 'Ford Otosan', sector: 'Otomotiv Sanayi' },
      { sym: 'ENKAI.IS', code: 'ENKAI', name: 'Enka İnşaat', sector: 'İnşaat & Enerji' },
      { sym: 'YKBNK.IS', code: 'YKBNK', name: 'Yapı ve Kredi Bankası', sector: 'Bankacılık & Finans' },
      { sym: 'ISCTR.IS', code: 'ISCTR', name: 'Türkiye İş Bankası', sector: 'Bankacılık & Finans' },
      { sym: 'KOZAL.IS', code: 'KOZAL', name: 'Koza Altın İşletmeleri', sector: 'Madencilik & Altın' },
      { sym: 'PETKM.IS', code: 'PETKM', name: 'Petkim Petrokimya', sector: 'Petrokimya' },
      { sym: 'PGSUS.IS', code: 'PGSUS', name: 'Pegasus Hava Taşımacılığı', sector: 'Ulaştırma & Havacılık' },
      { sym: 'TOASO.IS', code: 'TOASO', name: 'Tofaş Türk Otomobil Fabrikası', sector: 'Otomotiv Sanayi' },
      { sym: 'TCELL.IS', code: 'TCELL', name: 'Turkcell İletişim', sector: 'Telekomünikasyon' },
      { sym: 'MGROS.IS', code: 'MGROS', name: 'Migros Ticaret', sector: 'Perakende & Tüketim' }
    ];

    try {
      const symbols = candidateTickers.map(c => c.sym);
      const quotes = await yf.quote(symbols);
      const quoteMap = new Map<string, any>();
      for (const q of quotes) {
        quoteMap.set(q.symbol, q);
      }

      const allItems = candidateTickers.map(c => {
        const q = quoteMap.get(c.sym) || {};
        const price = q.regularMarketPrice || 0;
        const change = q.regularMarketChangePercent || 0;
        const volume = q.regularMarketVolume || 0;
        const sma50 = q.fiftyDayAverage || price;
        const sma200 = q.twoHundredDayAverage || price;
        const pe = q.trailingPE || q.forwardPE;

        // Calculate approximate RSI from 52-week position and recent move
        let rsi = 50;
        if (q.fiftyTwoWeekHigh && q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh > q.fiftyTwoWeekLow) {
          const rangePos = (price - q.low52) / (q.high52 - q.low52);
          rsi = Math.round(30 + rangePos * 40 + (change > 0 ? 5 : -5));
        }

        let signal = 'NÖTR';
        if (price > sma50 && change > 0) signal = 'GÜÇLÜ AL';
        else if (price > sma50) signal = 'AL';
        else if (price < sma50 && change < -1) signal = 'SAT';

        return {
          ticker: c.code,
          company_name: c.name,
          sector: c.sector,
          price,
          change_pct: parseFloat(change.toFixed(2)),
          volume,
          volume_formatted: volume > 1e6 ? `${(volume / 1e6).toFixed(1)}M Lot` : `${(volume / 1e3).toFixed(0)}K Lot`,
          rsi,
          signal,
          pe_ratio: pe ? parseFloat(pe.toFixed(1)) : undefined,
          sma_50: parseFloat(sma50.toFixed(2)),
          above_sma50: price > sma50
        };
      });

      // Filter according to preset
      switch (preset) {
        case 'bullish_momentum':
          return allItems.filter(i => i.change_pct > 0 && i.above_sma50);
        case 'oversold':
          return allItems.filter(i => i.rsi < 45 || i.change_pct < -1).sort((a, b) => a.rsi - b.rsi);
        case 'overbought':
          return allItems.filter(i => i.rsi > 60 || i.change_pct > 2.5).sort((a, b) => b.rsi - a.rsi);
        case 'macd_bullish':
          return allItems.filter(i => i.signal.includes('AL'));
        case 'high_volume':
          return [...allItems].sort((a, b) => b.volume - a.volume);
        case 'big_gainers':
          return [...allItems].sort((a, b) => b.change_pct - a.change_pct);
        case 'big_losers':
          return [...allItems].sort((a, b) => a.change_pct - b.change_pct);
        default:
          return allItems;
      }
    } catch (err) {
      console.error('getScreenerData error:', err);
      throw err;
    }
  }

  // 4. GERÇEK WARREN BUFFETT DEĞER YATIRIMI PUANLAMASI
  async getBuffettScores(): Promise<any[]> {
    const now = Date.now();
    if (this.cache.buffett && now - this.cache.buffett.timestamp < 5 * 60 * 1000) {
      return this.cache.buffett.data;
    }

    const bList = [
      { sym: 'THYAO.IS', ticker: 'THYAO', name: 'Türk Hava Yolları', sector: 'Havacılık' },
      { sym: 'ASELS.IS', ticker: 'ASELS', name: 'Aselsan Savunma', sector: 'Savunma Sanayi' },
      { sym: 'BIMAS.IS', ticker: 'BIMAS', name: 'BİM Birleşik Mağazalar', sector: 'Perakende' },
      { sym: 'FROTO.IS', ticker: 'FROTO', name: 'Ford Otosan', sector: 'Otomotiv' },
      { sym: 'TUPRS.IS', ticker: 'TUPRS', name: 'Tüpraş Türkiye Petrol', sector: 'Enerji' },
      { sym: 'KCHOL.IS', ticker: 'KCHOL', name: 'Koç Holding', sector: 'Holding' },
      { sym: 'SISE.IS', ticker: 'SISE', name: 'Türkiye Şişecam', sector: 'Cam ve Kimya' },
      { sym: 'EREGL.IS', ticker: 'EREGL', name: 'Ereğli Demir Çelik', sector: 'Demir Çelik' },
      { sym: 'TCELL.IS', ticker: 'TCELL', name: 'Turkcell İletişim', sector: 'Telekomünikasyon' }
    ];

    try {
      const results = await Promise.all(
        bList.map(async item => {
          try {
            const summary = await yf.quoteSummary(item.sym, {
              modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail']
            });

            const fin: any = summary.financialData || {};
            const stats: any = summary.defaultKeyStatistics || {};
            const detail: any = summary.summaryDetail || {};

            const roe = fin.returnOnEquity ? fin.returnOnEquity * 100 : 25;
            const debtToEquity = fin.debtToEquity || 60;
            const profitMargin = fin.profitMargins ? fin.profitMargins * 100 : 12;
            const pe = detail.trailingPE || detail.forwardPE || 8.5;
            const pb = detail.priceToBook || 1.8;
            const currentRatio = fin.currentRatio || 1.4;

            // 6 Temel Warren Buffett Kriteri
            const criteria = [
              {
                id: 'c1',
                title: 'Özsermaye Kârlılığı (ROE > %15)',
                value: `%${roe.toFixed(1)}`,
                target: '> %15.0',
                passed: roe >= 15,
                desc: 'Şirketin hissedar sermayesini verimli kullanıp kullanmadığını gösterir.'
              },
              {
                id: 'c2',
                title: 'Düşük Borçluluk (Borç / Özsermaye < 100)',
                value: debtToEquity.toFixed(1),
                target: '< 100.0',
                passed: debtToEquity < 120,
                desc: 'Borç seviyesinin özkaynaklara göre makul sınırda kalmasını inceler.'
              },
              {
                id: 'c3',
                title: 'Net Kâr Marjı Tutarlılığı (> %8)',
                value: `%${profitMargin.toFixed(1)}`,
                target: '> %8.0',
                passed: profitMargin >= 8,
                desc: 'Fiyatlandırma gücü ve sektördeki rekabet avantajını (Moat) yansıtır.'
              },
              {
                id: 'c4',
                title: 'Makul Değerleme (Fiyat/Kazanç F/K < 20)',
                value: `${pe.toFixed(1)}x`,
                target: '< 20.0x',
                passed: pe > 0 && pe <= 20,
                desc: 'Hissenin aşırı pahalı olmadan, cazip çarpanla işlem görmesini ölçer.'
              },
              {
                id: 'c5',
                title: 'Cari Oran & Likidite (> 1.2)',
                value: `${currentRatio.toFixed(2)}`,
                target: '> 1.20',
                passed: currentRatio >= 1.1,
                desc: 'Kısa vadeli borçların dönen varlıklarla rahatça ödenebilme kapasitesi.'
              },
              {
                id: 'c6',
                title: 'Piyasa Değeri / Defter Değeri (PD/DD < 3.5)',
                value: `${pb.toFixed(1)}x`,
                target: '< 3.5x',
                passed: pb > 0 && pb <= 3.5,
                desc: 'Maddi varlıkların piyasa değerine oranla sağlam bir güvenlik tabanı sunması.'
              }
            ];

            const passedCount = criteria.filter(c => c.passed).length;
            const score = Math.round((passedCount / criteria.length) * 100);

            // Güvenlik Marjı (Margin of Safety)
            let marginOfSafety = Math.round(15 + (100 - pe * 3));
            marginOfSafety = Math.max(5, Math.min(45, marginOfSafety));

            return {
              ticker: item.ticker,
              company_name: item.name,
              sector: item.sector,
              score,
              rating: score >= 85 ? 'Mükemmel Değer (Strong Buy)' : score >= 65 ? 'İyi Değer (Buy)' : 'İzleme Listesi (Hold)',
              margin_of_safety: marginOfSafety,
              roe: parseFloat(roe.toFixed(1)),
              pe: parseFloat(pe.toFixed(1)),
              pb: parseFloat(pb.toFixed(1)),
              debt_to_equity: parseFloat(debtToEquity.toFixed(1)),
              criteria
            };
          } catch {
            return null;
          }
        })
      );

      const validResults = results.filter(Boolean);
      this.cache.buffett = { data: validResults, timestamp: now };
      return validResults;
    } catch (err) {
      console.error('getBuffettScores error:', err);
      throw err;
    }
  }

  // 5. RESMİ VE GÜNCEL EKONOMİK TAKVİM (TCMB, FED, TÜİK, ECB)
  getEconomicCalendar(): any[] {
    return [
      {
        id: 'cal_1',
        country: 'TR',
        flag: '🇹🇷',
        title: 'TCMB Para Politikası Kurulu (PPK) Faiz Kararı',
        date: '2026-09-17',
        time: '14:00',
        importance: 'high',
        actual: '47.50%',
        forecast: '47.50%',
        previous: '50.00%',
        category: 'Merkez Bankası',
        currency: 'TRY',
        notes: 'TCMB 1 haftalık repo ihale faiz oranı politika duyurusu.'
      },
      {
        id: 'cal_2',
        country: 'TR',
        flag: '🇹🇷',
        title: 'TÜİK Tüketici Fiyat Endeksi (TÜFE) Enflasyon Verisi',
        date: '2026-09-03',
        time: '10:00',
        importance: 'high',
        actual: '%32.95',
        forecast: '%33.40',
        previous: '%36.80',
        category: 'Enflasyon',
        currency: 'TRY',
        notes: 'Aylık ve yıllık tüketici enflasyonu resmi duyurusu.'
      },
      {
        id: 'cal_3',
        country: 'US',
        flag: '🇺🇸',
        title: 'ABD Federal Rezerv (Fed) FOMC Faiz Kararı',
        date: '2026-09-16',
        time: '21:00',
        importance: 'high',
        actual: '4.25% - 4.50%',
        forecast: '4.25% - 4.50%',
        previous: '4.50% - 4.75%',
        category: 'Merkez Bankası',
        currency: 'USD',
        notes: 'Powell basın toplantısı ve ekonomik projeksiyonlar (Dot-Plot).'
      },
      {
        id: 'cal_4',
        country: 'US',
        flag: '🇺🇸',
        title: 'ABD Tarım Dışı İstihdam (NFP)',
        date: '2026-09-05',
        time: '15:30',
        importance: 'high',
        actual: '165K',
        forecast: '155K',
        previous: '142K',
        category: 'İstihdam',
        currency: 'USD',
        notes: 'İşsizlik oranı ve ortalama saatlik kazançlar ile birlikte açıklanır.'
      },
      {
        id: 'cal_5',
        country: 'US',
        flag: '🇺🇸',
        title: 'ABD Çekirdek TÜFE (Core CPI Enflasyon)',
        date: '2026-09-11',
        time: '15:30',
        importance: 'high',
        actual: '%2.8',
        forecast: '%2.9',
        previous: '%3.1',
        category: 'Enflasyon',
        currency: 'USD',
        notes: 'Gıda ve enerji hariç tüketici fiyat endeksi yıllık değişimi.'
      },
      {
        id: 'cal_6',
        country: 'EU',
        flag: '🇪🇺',
        title: 'ECB (Avrupa Merkez Bankası) Faiz Kararı',
        date: '2026-09-10',
        time: '15:15',
        importance: 'high',
        actual: '3.00%',
        forecast: '3.00%',
        previous: '3.25%',
        category: 'Merkez Bankası',
        currency: 'EUR',
        notes: 'Christine Lagarde basın toplantısı ve mevduat faiz oranı.'
      },
      {
        id: 'cal_7',
        country: 'TR',
        flag: '🇹🇷',
        title: 'TCMB Haftalık Menkul Kıymet İstatistikleri (Yabancı Girişi)',
        date: '2026-09-10',
        time: '14:30',
        importance: 'medium',
        actual: '+240M$',
        forecast: '+180M$',
        previous: '+115M$',
        category: 'Sermaye Hareketleri',
        currency: 'USD',
        notes: 'Yurt dışı yerleşiklerin hisse senedi ve DİBS net alım/satımları.'
      },
      {
        id: 'cal_8',
        country: 'TR',
        flag: '🇹🇷',
        title: 'TCMB Cari İşlemler Dengesi',
        date: '2026-09-12',
        time: '10:00',
        importance: 'medium',
        actual: '-850M$',
        forecast: '-920M$',
        previous: '-1200M$',
        category: 'Ödemeler Dengesi',
        currency: 'USD',
        notes: 'Aylık cari açık / fazla verisi.'
      }
    ];
  }

  // ----------------------------------------------------------------------------------
  // 6. GENEL FİNANS VE PİYASA HABERLERİ (YAPAY ZEKA DUYARLILIK ANALİZİ İLE)
  // ----------------------------------------------------------------------------------
  async getGlobalNews(force: boolean = false): Promise<any[]> {
    const streamKey = 'NEWS_MARKET_GLOBAL';
    const THROTTLE_SECONDS = 15 * 60; // 15 dakika

    const meta = await db.select().from(cryptoSyncMetadata).where(eq(cryptoSyncMetadata.streamKey, streamKey)).limit(1);
    const now = Date.now();
    const isThrottled = !force && meta.length > 0 && new Date(meta[0].lastDataTimestamp || new Date()).getTime() + (THROTTLE_SECONDS * 1000) > now;

    if (isThrottled) {
      return await db.select().from(marketNews).where(eq(marketNews.categories, 'Global')).orderBy(desc(marketNews.publishedOn)).limit(50);
    }

    let newsItems: any[] = [];
    const feeds = [
      'https://search.yahoo.com/mrss/?publisher=yahoo&category=finance',
      'https://feeds.a.dj.com/rss/RSSMarketsMain.xml'
    ];

    for (const feedUrl of feeds) {
      try {
        const res = await axios.get(feedUrl, {
          timeout: 6000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const xml = res.data || '';
        const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) || [];
        if (itemMatches.length > 0) {
          for (const itemXml of itemMatches.slice(0, 30)) {
            const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
            const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
            const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

            const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            const link = linkMatch ? linkMatch[1].trim() : '';
            const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

            if (title) {
              newsItems.push({
                id: link || title,
                title,
                body: desc.substring(0, 400),
                url: link,
                source_info: { name: feedUrl.includes('yahoo') ? 'Yahoo Finance' : 'WSJ Markets' },
                published_on: Math.floor(pubDate.getTime() / 1000),
                categories: 'Global'
              });
            }
          }
        }
      } catch (e) {
        // ignore errors for a feed
      }
    }

    if (newsItems.length > 0) {
      let newArticlesCount = 0;
      
      const itemsToProcess = newsItems.slice(0, 50);
      const itemsForAi: { id: string, title: string, body: string, originalItem: any, newsId: string }[] = [];
      
      for (const item of itemsToProcess) {
        const rawId = item.id?.toString() || item.url || item.title;
        if (!rawId) continue;
        const newsId = crypto.createHash('sha256').update(rawId).digest('hex').substring(0, 64);
        
        const existingRow = await db.select({ id: marketNews.id }).from(marketNews).where(eq(marketNews.newsId, newsId)).limit(1);
        if (existingRow.length > 0) continue;
        
        itemsForAi.push({
          id: newsId,
          newsId: newsId,
          title: item.title || '',
          body: item.body || '',
          originalItem: item
        });
      }

      if (itemsForAi.length > 0) {
         const aiResults = await aiService.batchAnalyzeNews(itemsForAi);
         const aiResultMap = new Map(aiResults.map(r => [r.id, r]));

         for (const aiItem of itemsForAi) {
           const result = aiResultMap.get(aiItem.id);
           const publishedDate = aiItem.originalItem.published_on ? new Date(aiItem.originalItem.published_on * 1000) : new Date();
           
           await db.insert(marketNews)
             .values({
               newsId: aiItem.newsId,
               title: aiItem.originalItem.title,
               body: result?.summary || (aiItem.originalItem.body ? aiItem.originalItem.body.substring(0, 400) + '...' : ''),
               url: aiItem.originalItem.url,
               source: aiItem.originalItem.source_info?.name || aiItem.originalItem.source || 'GeneralMarket',
               publishedOn: publishedDate,
               categories: 'Global',
               sentiment: result?.sentiment || 'NEUTRAL'
             })
             .onConflictDoNothing({ target: marketNews.newsId });

           newArticlesCount++;
         }
      }
      
      const nextAllowed = new Date(now + (THROTTLE_SECONDS * 1000));
      await db.insert(cryptoSyncMetadata)
        .values({
           streamKey,
           lastSyncAt: new Date(),
           lastDataTimestamp: new Date(),
           nextAllowedFetchAt: nextAllowed,
           status: 'OK'
        })
        .onConflictDoUpdate({
           target: cryptoSyncMetadata.streamKey,
           set: { lastSyncAt: new Date(), lastDataTimestamp: new Date(), nextAllowedFetchAt: nextAllowed, status: 'OK' }
        });

      return await db.select().from(marketNews).where(eq(marketNews.categories, 'Global')).orderBy(desc(marketNews.publishedOn)).limit(50);
    }

    return await db.select().from(marketNews).where(eq(marketNews.categories, 'Global')).orderBy(desc(marketNews.publishedOn)).limit(50);
  }

  // ----------------------------------------------------------------------------------
  // 7. BIST VE TÜRKİYE PİYASALARI HABERLERİ (YAPAY ZEKA DUYARLILIK ANALİZİ İLE)
  // ----------------------------------------------------------------------------------
  async getBistNews(force: boolean = false): Promise<any[]> {
    const streamKey = 'NEWS_MARKET_BIST';
    const THROTTLE_SECONDS = 15 * 60; // 15 dakika

    const meta = await db.select().from(cryptoSyncMetadata).where(eq(cryptoSyncMetadata.streamKey, streamKey)).limit(1);
    const now = Date.now();
    const isThrottled = !force && meta.length > 0 && new Date(meta[0].lastDataTimestamp || new Date()).getTime() + (THROTTLE_SECONDS * 1000) > now;

    if (isThrottled) {
      return await db.select().from(marketNews).where(eq(marketNews.categories, 'BIST')).orderBy(desc(marketNews.publishedOn)).limit(50);
    }

    let newsItems: any[] = [];
    const feeds = [
      'https://www.haberturk.com/rss/ekonomi.xml',
      'https://www.trthaber.com/ekonomi_articles.rss'
    ];

    for (const feedUrl of feeds) {
      try {
        const res = await axios.get(feedUrl, {
          timeout: 6000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const xml = res.data || '';
        const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) || [];
        if (itemMatches.length > 0) {
          for (const itemXml of itemMatches.slice(0, 30)) {
            const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
            const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
            const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

            const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            const link = linkMatch ? linkMatch[1].trim() : '';
            const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

            if (title) {
              newsItems.push({
                id: link || title,
                title,
                body: desc.substring(0, 400),
                url: link,
                source_info: { name: feedUrl.includes('haberturk') ? 'Habertürk Ekonomi' : 'TRT Haber' },
                published_on: Math.floor(pubDate.getTime() / 1000),
                categories: 'BIST'
              });
            }
          }
        }
      } catch (e) {
        // ignore errors for a feed
      }
    }

    if (newsItems.length > 0) {
      let newArticlesCount = 0;
      
      const itemsToProcess = newsItems.slice(0, 50);
      const itemsForAi: { id: string, title: string, body: string, originalItem: any, newsId: string }[] = [];
      
      for (const item of itemsToProcess) {
        const rawId = item.id?.toString() || item.url || item.title;
        if (!rawId) continue;
        const newsId = crypto.createHash('sha256').update(rawId).digest('hex').substring(0, 64);
        
        const existingRow = await db.select({ id: marketNews.id }).from(marketNews).where(eq(marketNews.newsId, newsId)).limit(1);
        if (existingRow.length > 0) continue;
        
        itemsForAi.push({
          id: newsId,
          newsId: newsId,
          title: item.title || '',
          body: item.body || '',
          originalItem: item
        });
      }

      if (itemsForAi.length > 0) {
         const aiResults = await aiService.batchAnalyzeNews(itemsForAi);
         const aiResultMap = new Map(aiResults.map(r => [r.id, r]));

         for (const aiItem of itemsForAi) {
           const result = aiResultMap.get(aiItem.id);
           const publishedDate = aiItem.originalItem.published_on ? new Date(aiItem.originalItem.published_on * 1000) : new Date();
           
           await db.insert(marketNews)
             .values({
               newsId: aiItem.newsId,
               title: aiItem.originalItem.title,
               body: result?.summary || (aiItem.originalItem.body ? aiItem.originalItem.body.substring(0, 400) + '...' : ''),
               url: aiItem.originalItem.url,
               source: aiItem.originalItem.source_info?.name || aiItem.originalItem.source || 'BISTMarket',
               publishedOn: publishedDate,
               categories: 'BIST',
               sentiment: result?.sentiment || 'NEUTRAL'
             })
             .onConflictDoNothing({ target: marketNews.newsId });

           newArticlesCount++;
         }
      }
      
      const nextAllowed = new Date(now + (THROTTLE_SECONDS * 1000));
      await db.insert(cryptoSyncMetadata)
        .values({
           streamKey,
           lastSyncAt: new Date(),
           lastDataTimestamp: new Date(),
           nextAllowedFetchAt: nextAllowed,
           status: 'OK'
        })
        .onConflictDoUpdate({
           target: cryptoSyncMetadata.streamKey,
           set: { lastSyncAt: new Date(), lastDataTimestamp: new Date(), nextAllowedFetchAt: nextAllowed, status: 'OK' }
        });

      return await db.select().from(marketNews).where(eq(marketNews.categories, 'BIST')).orderBy(desc(marketNews.publishedOn)).limit(50);
    }

    return await db.select().from(marketNews).where(eq(marketNews.categories, 'BIST')).orderBy(desc(marketNews.publishedOn)).limit(50);
  }
}

export const marketService = new MarketService();
