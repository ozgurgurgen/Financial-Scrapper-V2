import { db } from '../db/index';
import { 
  bistStocks, 
  usStocks, 
  usEtfs, 
  tefasFundHoldings, 
  analystReports, 
  kapDisclosures, 
  marketNews 
} from '../db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import { multiLLMService } from './MultiLLMService';

export interface SectorOverviewItem {
  name: string;
  market: 'BIST' | 'US';
  stockCount: number;
  totalMarketCap: number;
  totalMarketCapFormatted: string;
  avgChangePct: number;
  medianPe: number;
  avgPe: number;
  medianPb?: number;
  dividendYieldAvg?: number;
  // Feature 1: Kurumsal Para Akışı & Rotasyon
  institutionalHoldingsCount: number;
  institutionalCapitalExposure: number; // TL for BIST, USD for US
  institutionalExposureFormatted: string;
  flowSignal: 'GÜÇLÜ GİRİŞ' | 'GİRİŞ' | 'NÖTR' | 'ÇIKIŞ / ROTASYON';
  flowScore: number; // -100 to +100
  flowReason: string;
  topFundHoldings: Array<{ ticker: string; weightPct: number; fundCount: number }>;
  // Feature 3: Analist Konsensüsü
  analystCoverage: {
    reportCount: number;
    avgUpsidePct: number;
    consensus: 'GÜÇLÜ AL' | 'AL' | 'TUT' | 'SAT' | 'NÖTR' | 'KAPSAM DIŞI';
    buyRatioPct: number;
    topStockByUpside?: { ticker: string; upsidePct: number };
  };
  // Feature 4: Lider vs. Geride Kalan (Leader vs Laggard)
  leaders: Array<{ ticker: string; name: string; changePct: number; price: number; pe?: number }>;
  laggards: Array<{ ticker: string; name: string; changePct: number; price: number; pe?: number; discountVsSector?: number }>;
}

export interface SectorConstituentStock {
  ticker: string;
  name: string;
  market: 'BIST' | 'US';
  sector: string;
  industry?: string;
  price: number;
  currency: string;
  changePct: number;
  marketCap: number;
  marketCapFormatted: string;
  peRatio?: number;
  forwardPe?: number;
  pbRatio?: number;
  dividendYield?: number;
  sectorMedianPe: number;
  peDiscountPct: number; // positive = discounted (cheaper than median), negative = premium (more expensive)
  valuationStatus: 'YÜKSEK İSKONTO' | 'MAKUL' | 'PRİMLİ' | 'DEĞERLEME YOK';
  analystConsensus?: string;
  analystTargetPrice?: number;
  analystUpsidePct?: number;
  fundsHoldingCount?: number;
  fundsTotalWeight?: number;
}

export interface SectorDetailResponse {
  sector: SectorOverviewItem;
  stocks: SectorConstituentStock[];
  rotationInsights: {
    accumulationStage: string;
    smartMoneyVelocity: string;
    catalysts: string[];
    risks: string[];
  };
  analystReports: Array<{
    id: number;
    ticker: string;
    sourceName: string;
    title: string;
    recommendation: string;
    targetPrice: number | null;
    upsidePct: number | null;
    publishDate: string;
    aiSummary: string | null;
  }>;
  disclosuresAndNews: Array<{
    id: string | number;
    type: 'KAP' | 'NEWS';
    ticker?: string;
    title: string;
    date: string;
    source?: string;
    summary?: string;
    category?: string;
    url?: string;
  }>;
}

export class SectorAnalyticsService {
  /**
   * Helper to normalize sector names for BIST stocks based on company name, ticker, and TEFAS holdings
   */
  private classifyBistSector(ticker: string, companyName: string, knownHoldingsSector?: string): string {
    if (knownHoldingsSector && knownHoldingsSector.trim()) {
      const s = knownHoldingsSector.trim();
      if (s.includes('Ulaştırma') || s.includes('Havacılık')) return 'Ulaştırma & Havacılık';
      if (s.includes('Banka')) return 'Bankacılık & Finans';
      if (s.includes('Petrol') || s.includes('Enerji') || s.includes('Rafineri')) return 'Enerji & Petrol';
      if (s.includes('Perakende') || s.includes('Gıda') || s.includes('Tüketim')) return 'Gıda & Perakende';
      if (s.includes('Holding')) return 'Holding & Yatırım';
      if (s.includes('Otomotiv')) return 'Otomotiv & Yan Sanayi';
      if (s.includes('Savunma')) return 'Savunma Sanayii & Teknoloji';
      if (s.includes('İnşaat') || s.includes('Çimento')) return 'Çimento & İnşaat';
      if (s.includes('Cam') || s.includes('Sanayi') || s.includes('Kimya')) return 'Sanayi, Cam & Kimya';
      if (s.includes('Telekom')) return 'Telekomünikasyon';
      if (s.includes('Demir') || s.includes('Çelik') || s.includes('Madencilik')) return 'Demir-Çelik & Madencilik';
      if (s.includes('Gayrimenkul') || s.includes('GYO')) return 'Gayrimenkul (GYO)';
    }

    const t = ticker.toUpperCase();
    const n = (companyName || '').toUpperCase();

    if (t.endsWith('GYO') || n.includes('GAYRİMENKUL YATIRIM') || n.includes('GYO')) {
      return 'Gayrimenkul (GYO)';
    }
    if (['AKBNK', 'GARAN', 'ISCTR', 'YKBNK', 'VAKBN', 'HALKB', 'SKBNK', 'ALBRK', 'QNBFB', 'TSKB', 'KLNMA'].includes(t) || n.includes('BANKAS')) {
      return 'Bankacılık & Finans';
    }
    if (['THYAO', 'PGSUS', 'TAVHL', 'CLEBI', 'RYSAS', 'TMSN', 'GSDHO'].includes(t) || n.includes('HAVACILIK') || n.includes('ULAŞTIRMA')) {
      return 'Ulaştırma & Havacılık';
    }
    if (['TUPRS', 'ENJSA', 'AKSEN', 'AKENR', 'AHGAZ', 'AKFYE', 'CWENE', 'ASTOR', 'EUPWR', 'ALFAS', 'SMRTG', 'ODAS', 'ZOREN', 'CANTE', 'GWIND', 'AYDEM', 'BIOEN', 'MAGEN', 'KARYE', 'YEOTK'].includes(t) || n.includes('ENERJİ') || n.includes('ELEKTRİK') || n.includes('PETROL') || n.includes('GAZ')) {
      return 'Enerji & Petrol';
    }
    if (['BIMAS', 'MGROS', 'SOKM', 'BIZIM', 'CRFSA', 'ULKER', 'TATGD', 'PNSUT', 'CCOLA', 'AEFES', 'BANVT', 'KNFRT', 'FADE', 'SELVA', 'YAYLA'].includes(t) || n.includes('GIDA') || n.includes('PERAKENDE') || n.includes('İÇECEK') || n.includes('MAĞAZA')) {
      return 'Gıda & Perakende';
    }
    if (['FROTO', 'TOASO', 'TTRAK', 'DOAS', 'OTKAR', 'KARTN', 'BRISA', 'GOODY', 'BFREN', 'JANTS', 'EGEEN'].includes(t) || n.includes('OTOMOTİV') || n.includes('TRAKTÖR') || n.includes('LASTİK')) {
      return 'Otomotiv & Yan Sanayi';
    }
    if (['ASELS', 'MIATK', 'KONTR', 'LOGO', 'REEDR', 'SDTTR', 'ARDYZ', 'VBTYZ', 'KFEIN', 'SMART', 'FONET', 'FORTE', 'BINHO'].includes(t) || n.includes('SAVUNMA') || n.includes('YAZILIM') || n.includes('BİLİŞİM') || n.includes('TEKNOLOJİ')) {
      return 'Savunma Sanayii & Teknoloji';
    }
    if (['KCHOL', 'SAHOL', 'SISE', 'AGHOL', 'ALARK', 'DOHOL', 'TKFEN', 'BERA', 'GSDHO', 'GLYHO', 'POLHO', 'GOZDE'].includes(t) || n.includes('HOLDİNG') || n.includes('HOLDING')) {
      return 'Holding & Yatırım';
    }
    if (['AKCNS', 'CIMSA', 'OYAKC', 'BUCIM', 'NUHCM', 'AFYON', 'KONYA', 'GOLTS', 'BTCIM', 'BOBET', 'BSOKE'].includes(t) || n.includes('ÇİMENTO') || n.includes('BETON') || n.includes('İNŞAAT')) {
      return 'Çimento & İnşaat';
    }
    if (['EREGL', 'KRDMD', 'KRDMA', 'KRDMB', 'ISDMR', 'CEMTS', 'IZMDC', 'KOZAL', 'KOZAA', 'IPEKE', 'PRKME', 'CVKMD'].includes(t) || n.includes('DEMİR') || n.includes('ÇELİK') || n.includes('MADEN')) {
      return 'Demir-Çelik & Madencilik';
    }
    if (['SASA', 'HEKTS', 'PETKM', 'AKSA', 'KORDS', 'GUBRF', 'BAGFS', 'EGGUB', 'DEVA', 'SELEC', 'TRILC', 'GENIL', 'ECZYT'].includes(t) || n.includes('KİMYA') || n.includes('GÜBRE') || n.includes('İLAÇ')) {
      return 'Sanayi, Cam & Kimya';
    }
    if (['TCELL', 'TTKOM', 'NETAS', 'KAREL'].includes(t) || n.includes('TELEKOM') || n.includes('HABERLEŞME')) {
      return 'Telekomünikasyon';
    }
    if (['AKGRT', 'ANSGR', 'TURSG', 'AGESA', 'ANHYT', 'ISFIN', 'VAKFN', 'GARFA', 'SEKFK'].includes(t) || n.includes('SİGORTA') || n.includes('FAKTORİNG') || n.includes('FİNANSAL')) {
      return 'Sigorta & Finansal Hizmetler';
    }

    return 'Diğer İmalat & Hizmet';
  }

  /**
   * 1. GET ALL SECTORS OVERVIEW (BIST & US)
   * Calculates performance, median multiples, institutional money flow, analyst sentiment, leaders/laggards
   */
  async getSectorsOverview(marketFilter: 'BIST' | 'US' | 'ALL' = 'ALL'): Promise<{
    sectors: SectorOverviewItem[];
    stats: {
      totalSectors: number;
      totalMarketCapUsd: number;
      topAdvancingSector: string;
      topDecliningSector: string;
      mostUnderValuedSector: string;
      highestInstitutionalInflowSector: string;
    };
  }> {
    // 1. Fetch TEFAS holdings for mapping and fund exposure
    const holdings = await db.select({
      symbol: tefasFundHoldings.assetSymbol,
      sector: tefasFundHoldings.sector,
      fundCode: tefasFundHoldings.fundCode,
      weightPct: tefasFundHoldings.weightPct,
      marketValue: tefasFundHoldings.marketValue,
    }).from(tefasFundHoldings);

    const holdingsMap = new Map<string, { sector: string; funds: Set<string>; totalWeight: number; totalValue: number }>();
    for (const h of holdings) {
      const sym = h.symbol.toUpperCase();
      const existing = holdingsMap.get(sym) || { 
        sector: h.sector || '', 
        funds: new Set<string>(), 
        totalWeight: 0, 
        totalValue: 0 
      };
      existing.funds.add(h.fundCode);
      existing.totalWeight += Number(h.weightPct || 0);
      existing.totalValue += Number(h.marketValue || 0);
      if (h.sector && !existing.sector) existing.sector = h.sector;
      holdingsMap.set(sym, existing);
    }

    // 2. Fetch Analyst Reports
    const reports = await db.select({
      ticker: analystReports.ticker,
      market: analystReports.market,
      recommendation: analystReports.recommendation,
      targetPrice: analystReports.targetPrice,
      upsidePct: analystReports.upsidePct,
    }).from(analystReports);

    const analystMap = new Map<string, typeof reports>();
    for (const r of reports) {
      const sym = r.ticker.toUpperCase();
      const list = analystMap.get(sym) || [];
      list.push(r);
      analystMap.set(sym, list);
    }

    const sectorGroups = new Map<string, {
      market: 'BIST' | 'US';
      stocks: Array<{
        ticker: string;
        name: string;
        price: number;
        changePct: number;
        marketCap: number;
        peRatio?: number;
        pbRatio?: number;
        volume?: number;
      }>;
    }>();

    // 3. Process BIST Stocks if requested
    if (marketFilter === 'BIST' || marketFilter === 'ALL') {
      const bistRows = await db.select().from(bistStocks);
      for (const s of bistRows) {
        if (!s.ticker || s.ticker.startsWith('XU')) continue; // Skip index
        const holdData = holdingsMap.get(s.ticker.toUpperCase());
        const sectorName = this.classifyBistSector(s.ticker, s.companyName || '', holdData?.sector);
        const groupKey = `BIST:${sectorName}`;
        
        const group = sectorGroups.get(groupKey) || { market: 'BIST', stocks: [] };
        group.stocks.push({
          ticker: s.ticker,
          name: s.companyName || s.ticker,
          price: Number(s.price || 0),
          changePct: Number(s.changePct || 0),
          marketCap: Number(s.marketCap || 0),
          peRatio: s.peRatio ? Number(s.peRatio) : undefined,
          volume: Number(s.volume || 0),
        });
        sectorGroups.set(groupKey, group);
      }
    }

    // 4. Process US Stocks if requested
    if (marketFilter === 'US' || marketFilter === 'ALL') {
      const usRows = await db.select().from(usStocks);
      for (const s of usRows) {
        if (!s.sector) continue;
        const groupKey = `US:${s.sector}`;
        const group = sectorGroups.get(groupKey) || { market: 'US', stocks: [] };
        group.stocks.push({
          ticker: s.ticker,
          name: s.companyName || s.ticker,
          price: Number(s.price || 0),
          changePct: Number(s.changePct || 0),
          marketCap: Number(s.marketCap || 0),
          peRatio: s.peRatio ? Number(s.peRatio) : undefined,
          pbRatio: s.priceToBook ? Number(s.priceToBook) : undefined,
          volume: Number(s.volume || 0),
        });
        sectorGroups.set(groupKey, group);
      }
    }

    // 5. Aggregate metrics for each sector
    const resultSectors: SectorOverviewItem[] = [];

    for (const [key, data] of sectorGroups.entries()) {
      const [mkt, sectorName] = key.split(':');
      const stocks = data.stocks;
      if (stocks.length === 0) continue;

      const totalMarketCap = stocks.reduce((acc, cur) => acc + cur.marketCap, 0);
      const avgChangePct = stocks.reduce((acc, cur) => acc + cur.changePct, 0) / stocks.length;
      
      // Calculate Median & Average P/E (filtering positive reasonable P/E ratios)
      const validPes = stocks
        .map(s => s.peRatio)
        .filter((pe): pe is number => pe !== undefined && pe > 0 && pe < 300)
        .sort((a, b) => a - b);
      
      const medianPe = validPes.length > 0
        ? validPes[Math.floor(validPes.length / 2)]
        : 0;
      
      const avgPe = validPes.length > 0
        ? validPes.reduce((a, b) => a + b, 0) / validPes.length
        : 0;

      // Calculate Fund / Institutional Exposure
      let totalFundExposure = 0;
      let totalFundHoldingsCount = 0;
      const stockFundMap: Array<{ ticker: string; weightPct: number; fundCount: number }> = [];

      for (const st of stocks) {
        const h = holdingsMap.get(st.ticker.toUpperCase());
        if (h) {
          totalFundExposure += h.totalValue;
          totalFundHoldingsCount += h.funds.size;
          const avgWeight = h.funds.size > 0 ? Math.round((h.totalWeight / h.funds.size) * 10) / 10 : 0;
          stockFundMap.push({
            ticker: st.ticker,
            weightPct: avgWeight,
            fundCount: h.funds.size,
          });
        }
      }

      stockFundMap.sort((a, b) => b.weightPct - a.weightPct);

      // Flow Signal & Momentum
      let flowSignal: SectorOverviewItem['flowSignal'] = 'NÖTR';
      let flowScore = 0;
      let flowReason = '';

      if (avgChangePct >= 0.8 && totalFundHoldingsCount >= 20) {
        flowSignal = 'GÜÇLÜ GİRİŞ';
        flowScore = 85;
        flowReason = 'Kurumsal fon pozisyonlanması ve güçlü alım hacmiyle net para girişi.';
      } else if (avgChangePct > 0.15 && totalFundHoldingsCount >= 10) {
        flowSignal = 'GİRİŞ';
        flowScore = 45;
        flowReason = 'Pozitif fiyat momentumu ve seçici kurumsal alımlar.';
      } else if (avgChangePct < -0.3 || (avgChangePct < 0 && totalFundHoldingsCount < 10)) {
        flowSignal = 'ÇIKIŞ / ROTASYON';
        flowScore = -65;
        flowReason = 'Sektör genelinde kâr satışı ve diğer sektörlere likidite rotasyonu.';
      } else {
        flowSignal = 'NÖTR';
        flowScore = 15;
        flowReason = 'Yatay fiyat hareketi ve dengeli kurumsal pozisyon koruma.';
      }

      // Analyst Consensus by Sector
      let totalUpside = 0;
      let reportCount = 0;
      let buyCount = 0;
      let holdCount = 0;
      let sellCount = 0;
      let topUpsideStock = { ticker: '', upsidePct: 0 };

      for (const st of stocks) {
        const repList = analystMap.get(st.ticker.toUpperCase()) || [];
        for (const r of repList) {
          reportCount++;
          const up = Number(r.upsidePct || 0);
          totalUpside += up;
          const rec = (r.recommendation || '').toUpperCase();
          if (rec.includes('AL') || rec.includes('BUY') || rec.includes('OUTPERFORM') || rec.includes('BULLISH')) {
            buyCount++;
          } else if (rec.includes('SAT') || rec.includes('SELL') || rec.includes('UNDERPERFORM') || rec.includes('BEARISH')) {
            sellCount++;
          } else {
            holdCount++;
          }
          if (up > topUpsideStock.upsidePct) {
            topUpsideStock = { ticker: st.ticker, upsidePct: up };
          }
        }
      }

      const avgUpsidePct = reportCount > 0 ? Math.round((totalUpside / reportCount) * 10) / 10 : 0;
      const buyRatioPct = reportCount > 0 ? Math.round((buyCount / reportCount) * 100) : 0;
      
      let consensus: SectorOverviewItem['analystCoverage']['consensus'] = 'KAPSAM DIŞI';
      if (reportCount > 0) {
        if (buyRatioPct >= 75) {
          consensus = 'GÜÇLÜ AL';
        } else if (buyRatioPct >= 50) {
          consensus = 'AL';
        } else if (sellCount > buyCount && sellCount > holdCount) {
          consensus = 'SAT';
        } else {
          consensus = 'TUT';
        }
      }

      // Sort stocks to identify Leaders (Outperformers) and Laggards
      const sortedByPerf = [...stocks].sort((a, b) => b.changePct - a.changePct);
      const leaders = sortedByPerf.slice(0, 3).map(s => ({
        ticker: s.ticker,
        name: s.name,
        changePct: Math.round(s.changePct * 100) / 100,
        price: s.price,
        pe: s.peRatio ? Math.round(s.peRatio * 10) / 10 : undefined,
      }));

      // Laggards: Worst performers with valuation discounts vs median
      const laggards = sortedByPerf.slice(-3).reverse().map(s => {
        const discount = (medianPe > 0 && s.peRatio && s.peRatio > 0)
          ? Math.round(((medianPe - s.peRatio) / medianPe) * 100)
          : undefined;
        return {
          ticker: s.ticker,
          name: s.name,
          changePct: Math.round(s.changePct * 100) / 100,
          price: s.price,
          pe: s.peRatio ? Math.round(s.peRatio * 10) / 10 : undefined,
          discountVsSector: discount,
        };
      });

      // Market Cap Formatting
      const isUs = mkt === 'US';
      const capFormatted = isUs 
        ? `$${(totalMarketCap / 1e9).toFixed(1)}B`
        : `₺${(totalMarketCap / 1e9).toFixed(1)} Mr`;

      const expFormatted = isUs
        ? (totalFundExposure >= 1e9 ? `$${(totalFundExposure / 1e9).toFixed(2)}B` : `$${(totalFundExposure / 1e6).toFixed(1)}M`)
        : (totalFundExposure >= 1e9 ? `₺${(totalFundExposure / 1e9).toFixed(2)} Mr` : `₺${(totalFundExposure / 1e6).toFixed(1)}M`);

      resultSectors.push({
        name: sectorName,
        market: mkt as 'BIST' | 'US',
        stockCount: stocks.length,
        totalMarketCap,
        totalMarketCapFormatted: capFormatted,
        avgChangePct: Math.round(avgChangePct * 100) / 100,
        medianPe: Math.round(medianPe * 10) / 10,
        avgPe: Math.round(avgPe * 10) / 10,
        institutionalHoldingsCount: totalFundHoldingsCount,
        institutionalCapitalExposure: totalFundExposure,
        institutionalExposureFormatted: expFormatted,
        flowSignal,
        flowScore,
        flowReason,
        topFundHoldings: stockFundMap.slice(0, 3),
        analystCoverage: {
          reportCount,
          avgUpsidePct,
          consensus,
          buyRatioPct,
          topStockByUpside: topUpsideStock.upsidePct > 0 ? topUpsideStock : undefined,
        },
        leaders,
        laggards,
      });
    }

    // Sort by performance descending
    resultSectors.sort((a, b) => b.avgChangePct - a.avgChangePct);

    // Calculate Global Sector Stats
    const topAdvancing = resultSectors[0]?.name || '-';
    const topDeclining = resultSectors[resultSectors.length - 1]?.name || '-';
    
    // Most undervalued (positive median PE with lowest multiple)
    const validPeSectors = resultSectors.filter(s => s.medianPe > 0).sort((a, b) => a.medianPe - b.medianPe);
    const mostUnderValued = validPeSectors[0]?.name || '-';

    // Highest inflow
    const sortedFlow = [...resultSectors].sort((a, b) => b.flowScore - a.flowScore);
    const highestInflow = sortedFlow[0]?.name || '-';

    // Calculate total market cap in USD
    const totalUsdCap = resultSectors.reduce((acc, s) => {
      const usdVal = s.market === 'US' ? s.totalMarketCap : (s.totalMarketCap / 36.5);
      return acc + usdVal;
    }, 0);

    return {
      sectors: resultSectors,
      stats: {
        totalSectors: resultSectors.length,
        totalMarketCapUsd: Math.round(totalUsdCap),
        topAdvancingSector: topAdvancing,
        topDecliningSector: topDeclining,
        mostUnderValuedSector: mostUnderValued,
        highestInstitutionalInflowSector: highestInflow,
      }
    };
  }

  /**
   * 1b. GET STOCKS HEATMAP (FINVIZ / TREEMAP STYLED BY MARKET & SECTOR)
   * Returns constituent stocks grouped by sector, sorted by market cap,
   * ready for responsive nested treemap visualization.
   */
  async getStocksHeatmap(marketFilter: 'BIST' | 'US' | 'ALL' = 'BIST') {
    const isBist = marketFilter !== 'US';
    const isUs = marketFilter !== 'BIST';

    const sectorsMap = new Map<string, {
      name: string;
      market: 'BIST' | 'US';
      avgChangePct: number;
      totalMarketCap: number;
      stocks: Array<{
        ticker: string;
        name: string;
        price: number;
        changePct: number;
        marketCap: number;
        peRatio?: number;
        pbRatio?: number;
        volume?: number;
      }>;
    }>();

    if (isBist) {
      const bistRows = await db.select().from(bistStocks);
      for (const s of bistRows) {
        const secName = this.classifyBistSector(s.ticker, s.companyName, (s as any).sector);
        const groupKey = `BIST:${secName}`;
        const group = sectorsMap.get(groupKey) || {
          name: secName,
          market: 'BIST' as const,
          avgChangePct: 0,
          totalMarketCap: 0,
          stocks: []
        };
        group.stocks.push({
          ticker: s.ticker,
          name: s.companyName || s.ticker,
          price: Number(s.price || 0),
          changePct: Number(s.changePct || 0),
          marketCap: Number(s.marketCap || 0),
          peRatio: s.peRatio ? Number(s.peRatio) : undefined,
          pbRatio: (s as any).pbRatio ? Number((s as any).pbRatio) : undefined,
          volume: Number(s.volume || 0),
        });
        sectorsMap.set(groupKey, group);
      }
    }

    if (isUs) {
      const usRows = await db.select().from(usStocks);
      for (const s of usRows) {
        if (!s.sector) continue;
        const groupKey = `US:${s.sector}`;
        const group = sectorsMap.get(groupKey) || {
          name: s.sector,
          market: 'US' as const,
          avgChangePct: 0,
          totalMarketCap: 0,
          stocks: []
        };
        group.stocks.push({
          ticker: s.ticker,
          name: s.companyName || s.ticker,
          price: Number(s.price || 0),
          changePct: Number(s.changePct || 0),
          marketCap: Number(s.marketCap || 0),
          peRatio: s.peRatio ? Number(s.peRatio) : undefined,
          pbRatio: s.priceToBook ? Number(s.priceToBook) : undefined,
          volume: Number(s.volume || 0),
        });
        sectorsMap.set(groupKey, group);
      }
    }

    const result = Array.from(sectorsMap.values()).map(sec => {
      // Sort stocks by marketCap descending
      sec.stocks.sort((a, b) => b.marketCap - a.marketCap);
      sec.totalMarketCap = sec.stocks.reduce((acc, st) => acc + st.marketCap, 0);
      const totalChg = sec.stocks.reduce((acc, st) => acc + st.changePct, 0);
      sec.avgChangePct = sec.stocks.length > 0 ? Number((totalChg / sec.stocks.length).toFixed(2)) : 0;
      return sec;
    });

    // Sort sectors by totalMarketCap descending
    result.sort((a, b) => b.totalMarketCap - a.totalMarketCap);

    return result;
  }

  /**
   * 2. GET DEEP DIVE FOR A SPECIFIC SECTOR
   * Includes full benchmarking matrix of all constituent stocks, TEFAS ownership, analyst reports, news/KAP
   */
  async getSectorDetail(sectorName: string, marketFilter?: 'BIST' | 'US'): Promise<SectorDetailResponse> {
    const overviewData = await this.getSectorsOverview(marketFilter || 'ALL');
    const targetSector = overviewData.sectors.find(
      s => s.name.toLowerCase() === sectorName.toLowerCase() && (!marketFilter || s.market === marketFilter)
    ) || overviewData.sectors[0];

    const isBist = targetSector.market === 'BIST';
    const medianPe = targetSector.medianPe;

    // Fetch TEFAS holdings for mapping
    const holdings = await db.select({
      symbol: tefasFundHoldings.assetSymbol,
      sector: tefasFundHoldings.sector,
      fundCode: tefasFundHoldings.fundCode,
      weightPct: tefasFundHoldings.weightPct,
      marketValue: tefasFundHoldings.marketValue,
    }).from(tefasFundHoldings);

    const holdingsMap = new Map<string, { fundsCount: number; totalWeight: number }>();
    for (const h of holdings) {
      const sym = h.symbol.toUpperCase();
      const cur = holdingsMap.get(sym) || { fundsCount: 0, totalWeight: 0 };
      cur.fundsCount++;
      cur.totalWeight += Number(h.weightPct || 0);
      holdingsMap.set(sym, cur);
    }

    // Fetch Analyst Reports
    const reports = await db.select().from(analystReports);
    const analystMap = new Map<string, typeof reports[0]>();
    for (const r of reports) {
      if (!analystMap.has(r.ticker.toUpperCase())) {
        analystMap.set(r.ticker.toUpperCase(), r);
      }
    }

    const constituentStocks: SectorConstituentStock[] = [];
    const sectorTickers: string[] = [];

    if (isBist) {
      const bistRows = await db.select().from(bistStocks);
      for (const s of bistRows) {
        if (!s.ticker || s.ticker.startsWith('XU')) continue;
        const sName = this.classifyBistSector(s.ticker, s.companyName || '');
        if (sName.toLowerCase() === targetSector.name.toLowerCase()) {
          sectorTickers.push(s.ticker);
          const pe = s.peRatio ? Number(s.peRatio) : undefined;
          
          let peDiscountPct = 0;
          let valStatus: SectorConstituentStock['valuationStatus'] = 'DEĞERLEME YOK';
          if (medianPe > 0 && pe && pe > 0) {
            peDiscountPct = Math.round(((medianPe - pe) / medianPe) * 100);
            valStatus = peDiscountPct > 20 ? 'YÜKSEK İSKONTO' : peDiscountPct < -25 ? 'PRİMLİ' : 'MAKUL';
          }

          const h = holdingsMap.get(s.ticker.toUpperCase());
          const a = analystMap.get(s.ticker.toUpperCase());

          constituentStocks.push({
            ticker: s.ticker,
            name: s.companyName || s.ticker,
            market: 'BIST',
            sector: targetSector.name,
            price: Number(s.price || 0),
            currency: 'TRY',
            changePct: Number(s.changePct || 0),
            marketCap: Number(s.marketCap || 0),
            marketCapFormatted: `₺${(Number(s.marketCap || 0) / 1e9).toFixed(2)} Mr`,
            peRatio: pe,
            sectorMedianPe: medianPe,
            peDiscountPct,
            valuationStatus: valStatus,
            analystConsensus: a?.recommendation || undefined,
            analystTargetPrice: a?.targetPrice ? Number(a.targetPrice) : undefined,
            analystUpsidePct: a?.upsidePct ? Number(a.upsidePct) : undefined,
            fundsHoldingCount: h?.fundsCount || 0,
            fundsTotalWeight: h?.totalWeight ? Math.round(h.totalWeight * 100) / 100 : 0,
          });
        }
      }
    } else {
      const usRows = await db.select().from(usStocks).where(eq(usStocks.sector, targetSector.name));
      for (const s of usRows) {
        sectorTickers.push(s.ticker);
        const pe = s.peRatio ? Number(s.peRatio) : undefined;
        let peDiscountPct = 0;
        let valStatus: SectorConstituentStock['valuationStatus'] = 'DEĞERLEME YOK';
        if (medianPe > 0 && pe && pe > 0) {
          peDiscountPct = Math.round(((medianPe - pe) / medianPe) * 100);
          valStatus = peDiscountPct > 20 ? 'YÜKSEK İSKONTO' : peDiscountPct < -25 ? 'PRİMLİ' : 'MAKUL';
        }

        constituentStocks.push({
          ticker: s.ticker,
          name: s.companyName || s.ticker,
          market: 'US',
          sector: targetSector.name,
          industry: s.industry || undefined,
          price: Number(s.price || 0),
          currency: 'USD',
          changePct: Number(s.changePct || 0),
          marketCap: Number(s.marketCap || 0),
          marketCapFormatted: s.marketCapFormatted || `$${(Number(s.marketCap || 0) / 1e9).toFixed(1)}B`,
          peRatio: pe,
          forwardPe: s.forwardPe ? Number(s.forwardPe) : undefined,
          pbRatio: s.priceToBook ? Number(s.priceToBook) : undefined,
          dividendYield: s.dividendYield ? Number(s.dividendYield) : undefined,
          sectorMedianPe: medianPe,
          peDiscountPct,
          valuationStatus: valStatus,
          analystConsensus: s.recommendation || undefined,
          analystTargetPrice: s.targetPrice ? Number(s.targetPrice) : undefined,
        });
      }
    }

    // Sort stocks by market cap descending
    constituentStocks.sort((a, b) => b.marketCap - a.marketCap);

    // Filter analyst reports for this sector
    const sectorReports = reports
      .filter(r => sectorTickers.includes(r.ticker.toUpperCase()))
      .map(r => ({
        id: r.id,
        ticker: r.ticker,
        sourceName: r.sourceName,
        title: r.title,
        recommendation: r.recommendation || 'TUT',
        targetPrice: r.targetPrice ? Number(r.targetPrice) : null,
        upsidePct: r.upsidePct ? Number(r.upsidePct) : null,
        publishDate: r.publishDate ? new Date(r.publishDate).toISOString() : new Date().toISOString(),
        aiSummary: r.aiSummary,
      }));

    // Filter KAP Disclosures and News for this sector
    const kapRows = await db.select().from(kapDisclosures).limit(100);
    const newsRows = await db.select().from(marketNews).limit(100);

    const disclosuresAndNews: SectorDetailResponse['disclosuresAndNews'] = [];

    for (const k of kapRows) {
      if (k.symbol && sectorTickers.includes(k.symbol.toUpperCase())) {
        disclosuresAndNews.push({
          id: `KAP-${k.id}`,
          type: 'KAP',
          ticker: k.symbol,
          title: k.title,
          date: k.publishDate ? new Date(k.publishDate).toISOString() : new Date().toISOString(),
          category: k.category || 'Özel Durum Açıklaması',
          summary: k.summary || undefined,
          url: k.url || undefined,
        });
      }
    }

    for (const n of newsRows) {
      const match = sectorTickers.some(t => n.title.includes(t) || (n.body && n.body.includes(t)));
      if (match || n.title.toLowerCase().includes(targetSector.name.toLowerCase())) {
        disclosuresAndNews.push({
          id: `NEWS-${n.id}`,
          type: 'NEWS',
          title: n.title,
          date: n.publishedOn ? new Date(n.publishedOn).toISOString() : new Date().toISOString(),
          source: n.source || 'Piyasa Haberleri',
          summary: n.body ? n.body.slice(0, 180) + '...' : undefined,
          url: n.url || undefined,
        });
      }
    }

    return {
      sector: targetSector,
      stocks: constituentStocks,
      rotationInsights: {
        accumulationStage: targetSector.flowSignal === 'GÜÇLÜ GİRİŞ' ? 'Erken Aşama Akümülasyon (Smart Money Girişi)' : targetSector.flowSignal === 'ÇIKIŞ / ROTASYON' ? 'Kâr Realizasyonu & Sektörden Kaçış' : 'Konsolidasyon & Dengeli Pozisyon Koruma',
        smartMoneyVelocity: `${targetSector.flowScore > 0 ? '+' : ''}${targetSector.flowScore}/100 Rotasyon Skoru`,
        catalysts: [
          `${targetSector.name} sektöründe toplam ${targetSector.institutionalHoldingsCount} kurumsal fon pozisyonu bulunmaktadır.`,
          `Sektörün medyan F/K çarpanı ${targetSector.medianPe} seviyesinde konsolide olmaktadır.`,
          `Analistlerin ortalama konsensüs hedef primi %${targetSector.analystCoverage.avgUpsidePct} seviyesindedir.`,
        ],
        risks: [
          'Makroekonomik faiz ve likidite dinamiklerinin sektör çarpanları üzerindeki baskısı.',
          'Girdi maliyetleri ve döviz kurlarındaki dönemsel dalgalanmalar.',
        ],
      },
      analystReports: sectorReports.slice(0, 10),
      disclosuresAndNews: disclosuresAndNews.slice(0, 15),
    };
  }

  /**
   * 3. RELATIVE VALUATION SCREENER (Sektör İçi En İskontolu / En Primli Hisseler)
   */
  async getRelativeValuationScreener(marketFilter: 'BIST' | 'US' = 'BIST', minDiscountPct: number = 10) {
    const overview = await this.getSectorsOverview(marketFilter);
    const sectorMedianMap = new Map(overview.sectors.map(s => [s.name.toLowerCase(), s.medianPe]));

    const discountedStocks: SectorConstituentStock[] = [];
    const premiumStocks: SectorConstituentStock[] = [];

    const isBist = marketFilter !== 'US';
    const stocks = isBist ? await db.select().from(bistStocks) : await db.select().from(usStocks);
    const reports = await db.select().from(analystReports);
    const analystMap = new Map<string, typeof reports[0]>();
    for (const r of reports) {
      if (!analystMap.has(r.ticker.toUpperCase())) {
        analystMap.set(r.ticker.toUpperCase(), r);
      }
    }

    for (const s of stocks) {
      if (!s.ticker || s.ticker.startsWith('XU')) continue;
      const secName = isBist 
        ? this.classifyBistSector(s.ticker, (s as any).sector || (s as any).companyName || '')
        : ((s as any).sector || 'Other');
      
      const medianPe = sectorMedianMap.get(secName.toLowerCase()) || 0;
      const pe = s.peRatio ? Number(s.peRatio) : undefined;

      if (pe && pe > 0 && medianPe > 0) {
        const peDiscountPct = Math.round(((medianPe - pe) / medianPe) * 100);
        const a = analystMap.get(s.ticker.toUpperCase());
        const stockItem: SectorConstituentStock = {
          ticker: s.ticker,
          name: (s as any).companyName || s.ticker,
          market: isBist ? 'BIST' : 'US',
          sector: secName,
          price: Number(s.price || 0),
          currency: isBist ? 'TRY' : 'USD',
          changePct: Number(s.changePct || 0),
          marketCap: Number(s.marketCap || 0),
          marketCapFormatted: isBist 
            ? `₺${(Number(s.marketCap || 0) / 1e9).toFixed(2)} Mr` 
            : `$${(Number(s.marketCap || 0) / 1e9).toFixed(2)}B`,
          peRatio: pe,
          sectorMedianPe: medianPe,
          peDiscountPct,
          valuationStatus: peDiscountPct > 20 ? 'YÜKSEK İSKONTO' : peDiscountPct < -25 ? 'PRİMLİ' : 'MAKUL',
          analystConsensus: a?.recommendation || undefined,
          analystTargetPrice: a?.targetPrice ? Number(a.targetPrice) : undefined,
          analystUpsidePct: a?.upsidePct ? Number(a.upsidePct) : undefined,
          fundsHoldingCount: 0,
          fundsTotalWeight: 0,
        };

        if (peDiscountPct >= minDiscountPct) {
          discountedStocks.push(stockItem);
        } else if (peDiscountPct <= -minDiscountPct) {
          premiumStocks.push(stockItem);
        }
      }
    }

    discountedStocks.sort((a, b) => b.peDiscountPct - a.peDiscountPct);
    premiumStocks.sort((a, b) => a.peDiscountPct - b.peDiscountPct);

    return {
      mostDiscounted: discountedStocks.slice(0, 20),
      mostPremium: premiumStocks.slice(0, 20),
    };
  }

  /**
   * 4. SEKTÖRE EN ÇOK YATIRIM YAPAN TEFAS FONLARI (SECTOR MUTUAL FUND EXPOSURE)
   */
  async getSectorTopFunds(sectorName: string, market: 'BIST' | 'US' = 'BIST') {
    const isBist = market !== 'US';
    const allStocks = isBist ? await db.select().from(bistStocks) : await db.select().from(usStocks);
    const sectorTickers = new Set(
      allStocks
        .filter(s => {
          if (!s.ticker || s.ticker.startsWith('XU')) return false;
          const sName = isBist 
            ? this.classifyBistSector(s.ticker, (s as any).sector || (s as any).companyName || '')
            : ((s as any).sector || 'Other');
          return sName.toLowerCase() === sectorName.toLowerCase();
        })
        .map(s => s.ticker.toUpperCase())
    );

    const holdings = await db.select({
      symbol: tefasFundHoldings.assetSymbol,
      fundCode: tefasFundHoldings.fundCode,
      weightPct: tefasFundHoldings.weightPct,
      marketValue: tefasFundHoldings.marketValue,
    }).from(tefasFundHoldings);

    // Aggregate by fundCode
    const fundMap = new Map<string, {
      fundCode: string;
      totalWeight: number;
      totalValue: number;
      stockHoldings: Array<{ ticker: string; weight: number }>;
    }>();

    for (const h of holdings) {
      if (!h.symbol || !sectorTickers.has(h.symbol.toUpperCase())) continue;
      const fCode = (h.fundCode || '').toUpperCase();
      if (!fCode) continue;

      const cur = fundMap.get(fCode) || {
        fundCode: fCode,
        totalWeight: 0,
        totalValue: 0,
        stockHoldings: [],
      };

      const w = Number(h.weightPct || 0);
      const val = Number(h.marketValue || 0);
      cur.totalWeight += w;
      cur.totalValue += val;
      cur.stockHoldings.push({ ticker: h.symbol.toUpperCase(), weight: w });
      fundMap.set(fCode, cur);
    }

    const topFunds = Array.from(fundMap.values())
      .filter(f => f.totalWeight > 0.5)
      .sort((a, b) => b.totalWeight - a.totalWeight)
      .slice(0, 12)
      .map(f => {
        f.stockHoldings.sort((a, b) => b.weight - a.weight);
        return {
          fundCode: f.fundCode,
          sectorWeightPct: Math.round(f.totalWeight * 100) / 100,
          sectorExposureValue: f.totalValue,
          formattedValue: f.totalValue >= 1e9 
            ? `₺${(f.totalValue / 1e9).toFixed(2)} Mr` 
            : `₺${(f.totalValue / 1e6).toFixed(1)}M`,
          topPicksInSector: f.stockHoldings.slice(0, 4).map(sp => `${sp.ticker} (%${Math.round(sp.weight * 10) / 10})`),
        };
      });

    return {
      sectorName,
      market,
      totalFundsInvesting: fundMap.size,
      topFunds,
    };
  }

  /**
   * 5. SEKTÖRLER ARASI KARŞILAŞTIRMA MATRİSİ (BENCHMARKING COMPARATOR)
   */
  async compareSectors(sectorNames: string[], market: 'BIST' | 'US' = 'BIST') {
    const overview = await this.getSectorsOverview(market);
    const matched = overview.sectors.filter(s => 
      sectorNames.some(sn => sn.toLowerCase() === s.name.toLowerCase())
    );

    return {
      comparedSectors: matched,
      matrixMetrics: {
        highestMomentum: [...matched].sort((a, b) => b.avgChangePct - a.avgChangePct)[0]?.name,
        cheapestByPe: [...matched].filter(s => s.medianPe > 0).sort((a, b) => a.medianPe - b.medianPe)[0]?.name,
        highestFundCapital: [...matched].sort((a, b) => b.institutionalCapitalExposure - a.institutionalCapitalExposure)[0]?.name,
        highestAnalystUpside: [...matched].sort((a, b) => b.analystCoverage.avgUpsidePct - a.analystCoverage.avgUpsidePct)[0]?.name,
      }
    };
  }

  /**
   * 6. AI DESTEKLİ MAKRO VE SEKTÖREL ROTASYON SENTEZİ (KULLANICI AYARLI MODEL)
   */
  async getSectorAiSynthesis(sectorName: string, market: 'BIST' | 'US' = 'BIST') {
    const detail = await this.getSectorDetail(sectorName, market);
    const sector = detail.sector;

    const prompt = `
Sen kıdemli bir Kurumsal Portföy Yöneticisi ve Hisse Senedi Baş Stratejistisin.
Aşağıdaki gerçek borsa ve TEFAS kurumsal fon verilerine göre "${sector.name}" (${market}) sektörü için Türkçe derinlemesine bir Sektörel İstihbarat ve Rotasyon Raporu hazırla.

Veriler:
- Sektör: ${sector.name} (${market})
- Şirket Sayısı: ${sector.stockCount}
- Toplam Piyasa Değeri: ${sector.totalMarketCapFormatted}
- Ortalama Günlük Değişim: %${sector.avgChangePct}
- Medyan F/K: ${sector.medianPe}x (Ortalama F/K: ${sector.avgPe}x)
- Kurumsal Fon Pozisyon Sayısı: ${sector.institutionalHoldingsCount}
- Kurumsal Fon Büyüklüğü: ${sector.institutionalExposureFormatted}
- Akıllı Para Akış Sinyali: ${sector.flowSignal} (Skor: ${sector.flowScore}/100)
- Analist Konsensüsü: ${sector.analystCoverage.consensus} (AL Oranı: %${sector.analystCoverage.buyRatioPct}, Ortalama Prim Potansiyeli: %${sector.analystCoverage.avgUpsidePct})
- Sektör Liderleri: ${sector.leaders.map(l => `${l.ticker} (%${l.changePct})`).join(', ')}
- Geride Kalanlar: ${sector.laggards.map(l => `${l.ticker} (%${l.changePct})`).join(', ')}

Lütfen tam olarak aşağıdaki JSON şemasında yanıt dön (markdown kod bloğu olmadan SADECE geçerli JSON):
{
  "summary": "2-3 cümlelik üst düzey kurumsal strateji özeti",
  "macroSensitivity": {
    "interestRateImpact": "Faiz politikalarına duyarlılık açıklaması",
    "inflationSensitivity": "Enflasyon ve fiyatlama gücü açıklaması",
    "fxSensitivity": "Döviz kuru ve ihracat duyarlılığı açıklaması"
  },
  "strategicAction": "Ağırlık Artır (Overweight) | Piyasa Ağırlığı (Neutral) | Ağırlık Azalt (Underweight)",
  "catalysts": ["Katalizör 1", "Katalizör 2", "Katalizör 3"],
  "risks": ["Risk 1", "Risk 2"]
}
`;

    const activeConfig = await multiLLMService.getActiveConfig();

    try {
      const text = await multiLLMService.generateText({
        prompt,
        systemInstruction: 'Sen kıdemli bir BIST ve global hisse senedi stratejistisin. Sadece geçerli JSON çıktısı üret.',
        temperature: 0.2,
      });

      const cleanJson = (text || '')
        .replace(/^```(json)?/i, '')
        .replace(/```$/i, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanJson);

      return {
        isAiGenerated: true,
        provider: activeConfig.provider,
        model: activeConfig.model,
        ...parsed,
      };
    } catch (e: any) {
      console.warn('[SectorAnalyticsService] AI synthesis call failed, using heuristic extraction:', e?.message || e);
      return {
        isAiGenerated: false,
        provider: activeConfig.provider,
        model: activeConfig.model,
        summary: `${sector.name} sektörü, medyan ${sector.medianPe}x F/K çarpanı ve ortalama %${sector.analystCoverage.avgUpsidePct} analist hedef potansiyeli ile ${sector.flowSignal.toLowerCase()} evresindedir.`,
        macroSensitivity: {
          interestRateImpact: sector.name.includes('Banka') || sector.name.includes('Finans') ? 'Faiz indirim döngüsünde marj genişlemesi ve kredi hacmi büyümesi.' : 'Yüksek faiz ortamında sermaye maliyeti baskısı.',
          inflationSensitivity: sector.name.includes('Gıda') || sector.name.includes('Perakende') ? 'Yüksek fiyat geçişkenliği sayesinde enflasyona karşı güçlü defansif kalkan.' : 'Maliyet enflasyonu yönetimi kritik.',
          fxSensitivity: sector.name.includes('Ulaştırma') || sector.name.includes('Sanayi') ? 'Döviz gelirleri ve ihracat gücüyle TL değer kaybına karşı doğal hedge.' : 'İç piyasa talebine duyarlı.',
        },
        strategicAction: sector.flowSignal === 'GÜÇLÜ GİRİŞ' ? 'Ağırlık Artır (Overweight)' : sector.flowSignal === 'ÇIKIŞ / ROTASYON' ? 'Kâr Al / Kısmi Azalt' : 'Piyasa Ağırlığı (Neutral)',
        catalysts: [
          `Sektör lideri ${sector.leaders[0]?.ticker || '-'} hissesinin güçlü operasyonel marjları.`,
          `Toplam ${sector.institutionalHoldingsCount} kurumsal fonun portföy ağırlığı.`,
          `Sektör içi iskontolu hisselerde medyana doğru yakınsama (mean-reversion) beklentisi.`
        ],
        risks: [
          'Jeopolitik gerilimler ve küresel talep yavaşlaması.',
          'Sektörel regülasyon ve vergi değişiklikleri.'
        ]
      };
    }
  }
}

export const sectorAnalyticsService = new SectorAnalyticsService();
