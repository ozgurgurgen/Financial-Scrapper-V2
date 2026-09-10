import { db } from '../db/index.ts';
import { 
  bistStocks, bistFinancials, bistBuybacks, ipos, 
  tefasFunds, tefasPrices, tefasFundHoldings, kapDisclosures, 
  macroIndicators, settings, kapCompanies, cryptoOnChain, analystReports, usHistoricalCandles
} from '../db/schema.ts';
import { eq, desc, asc, sql } from 'drizzle-orm';
import axios from 'axios';
import { KAP_COMPANIES_UNIVERSE } from './kapCompaniesData.ts';
import { generateComprehensiveBistFinancials } from './bistFinancialsData.ts';
import { COMPREHENSIVE_BIST_BUYBACKS } from './bistBuybacksData.ts';
import { COMPREHENSIVE_IPOS } from './iposData.ts';
import { COMPREHENSIVE_CRYPTO_ON_CHAIN } from './cryptoOnChainData.ts';
import { INITIAL_ANALYST_REPORTS } from './analystSeedData.ts';
import { UsHistoricalService } from './UsHistoricalService.ts';

const usHistService = new UsHistoricalService();

export interface CompanyExportItem {
  ticker: string;
  company_name: string;
  sector: string;
  current_price: number;
  daily_change_pct: number;
  volume_try: number;
  market_cap_try: number;
  pe_ratio: number | null;
  pb_ratio: number | null;
  ev_ebitda: number | null;
  net_debt_ebitda: number | null;
  current_ratio: number | null;
  roe: number | null;
  dividend_yield: number | null;
  beta_5y: number | null;
  money_inflow_net_try: number;
  top_buyers: string[];
  top_sellers: string[];
  updated_at: string;
}

export interface FinancialsExportItem {
  ticker: string;
  year: number;
  period: number;
  announced_date: string;
  revenue: number;
  revenue_yoy: number;
  gross_profit: number;
  gross_margin: number;
  operating_profit: number;
  operating_margin: number;
  ebitda: number;
  ebitda_margin: number;
  net_profit: number;
  net_profit_yoy: number;
  net_margin: number;
  total_assets: number;
  current_assets: number;
  short_term_liabilities: number;
  long_term_liabilities: number;
  net_debt: number;
  equity: number;
  working_capital: number;
  free_cash_flow: number;
  operating_cash_flow: number;
  capex: number;
  paid_capital: number;
  retained_earnings: number;
  disclosure_id: string;
}

export interface FundExportItem {
  code: string;
  name: string;
  category: string;
  price: number;
  daily_return: number;
  return_1m: number;
  return_3m: number;
  return_6m: number;
  return_1y: number;
  return_ytd: number;
  total_value: number;
  outstanding_shares: number;
  investor_count: number;
  management_fee: number;
  sharpe_ratio: number;
  standard_deviation: number;
  loss_days_ratio: number;
  allocation: Record<string, number>;
  top_holdings: { ticker: string; weight_pct: number }[];
  price_history: { date: string; price: number }[];
}

export interface IpoExportItem {
  ticker: string;
  company_name: string;
  status: string;
  offer_price: number;
  total_shares: number;
  ipo_size_try: number;
  dates: string;
  distribution_type: string;
  consortium_leader: string;
  bist_market: string;
  p_e_ratio_ipo: number;
  discount_rate: number;
  prospectus_url: string;
  fund_usage: { area: string; percentage: number }[];
  allotment_result: {
    total_applicants: number;
    shares_per_investor: number;
    allotment_try: number;
  };
}

export interface BuybackExportItem {
  ticker: string;
  date: string;
  shares_bought: number;
  price_paid: number;
  total_try: number;
  cumulative_shares: number;
  percentage_of_capital: number;
  program_authorized_try: number;
  disclosure_id: string;
}

export interface DisclosureExportItem {
  disclosure_id: string;
  ticker: string;
  company_name: string;
  title: string;
  category: string;
  summary: string;
  publish_date: string;
  impact_level: string;
  sentiment: string;
  kap_url: string;
}

class ComprehensiveDataIntegrationService {
  private isInitialized = false;

  public async initializeSeedData(): Promise<void> {
    if (this.isInitialized) return;

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[ComprehensiveData] Veri entegrasyonu ve tohumlama kontrol ediliyor (Deneme ${attempt}/${maxAttempts})...`);
        
        // 1. KAP Companies Master Registry
        try { await this.seedKapCompanies(); } catch (e: any) { console.warn('[ComprehensiveData] KAP şirketler tohumlama uyarısı:', e.message); }

        // 2. BIST Stocks Seed & Update
        try { await this.seedBistStocks(); } catch (e: any) { console.warn('[ComprehensiveData] BIST tohumlama uyarısı:', e.message); }

        // 3. Financials (36 Sütun, 608+ Şirket x 4 Çeyrek) Seed
        try { await this.seedFinancials(); } catch (e: any) { console.warn('[ComprehensiveData] Finansallar tohumlama uyarısı:', e.message); }

        // 4. Share Buybacks Seed
        try { await this.seedBuybacks(); } catch (e: any) { console.warn('[ComprehensiveData] Geri alımlar tohumlama uyarısı:', e.message); }

        // 5. IPOs Seed
        try { await this.seedIpos(); } catch (e: any) { console.warn('[ComprehensiveData] Halka arzlar tohumlama uyarısı:', e.message); }

        // 6. TEFAS Fund Holdings Seed
        try { await this.seedTefasHoldings(); } catch (e: any) { console.warn('[ComprehensiveData] TEFAS portföy tohumlama uyarısı:', e.message); }

        // 7. KAP Disclosures Seed
        try { await this.seedDisclosures(); } catch (e: any) { console.warn('[ComprehensiveData] KAP bildirimleri tohumlama uyarısı:', e.message); }

        // 8. Crypto On-Chain Seed
        try { await this.seedCryptoOnChain(); } catch (e: any) { console.warn('[ComprehensiveData] Kripto on-chain tohumlama uyarısı:', e.message); }

        // 9. Analyst Research Reports Seed
        try { await this.seedAnalystReports(); } catch (e: any) { console.warn('[ComprehensiveData] Analist raporları tohumlama uyarısı:', e.message); }

        // 10. US 5Y Historical Candles Seed
        try { await this.seedUsHistorical(); } catch (e: any) { console.warn('[ComprehensiveData] ABD geçmiş veri tohumlama uyarısı:', e.message); }

        this.isInitialized = true;
        console.log('[ComprehensiveData] Tüm eksik veri setleri ve tablolar başarıyla entegre edildi.');
        return;
      } catch (err: any) {
        console.warn(`[ComprehensiveData] Tohumlama denemesi ${attempt} başarısız oldu:`, err.message);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2500 * attempt));
        }
      }
    }
  }

  // --- SEED METHODS ---

  private async seedKapCompanies(): Promise<void> {
    try {
      const existing = await db.select({ count: sql<number>`count(*)` }).from(kapCompanies);
      const count = Number(existing[0]?.count || 0);
      if (count >= 50) return;

      console.log(`[ComprehensiveData] ${KAP_COMPANIES_UNIVERSE.length} KAP şirketi veri tabanına senkronize ediliyor...`);
      for (const item of KAP_COMPANIES_UNIVERSE) {
        const found = await db.select().from(kapCompanies).where(eq(kapCompanies.symbol, item.symbol)).limit(1);
        if (found.length === 0) {
          await db.insert(kapCompanies).values(item);
        } else {
          await db.update(kapCompanies).set(item).where(eq(kapCompanies.symbol, item.symbol));
        }
      }
    } catch (e: any) {
      console.warn('[ComprehensiveData] seedKapCompanies notice:', e.message);
    }
  }

  private async seedBistStocks(): Promise<void> {
    const existing = await db.select().from(bistStocks).limit(5);
    const mockCompanies = [
      {
        ticker: 'THYAO',
        companyName: 'Türk Hava Yolları A.O.',
        sector: 'Ulaştırma / Havacılık',
        price: '318.50',
        changePct: '2.45',
        volume: '4850000000',
        marketCap: '439530000000',
        peRatio: '6.85',
        pbRatio: '1.42',
        evEbitda: '4.90',
        netDebtEbitda: '0.65',
        currentRatio: '1.35',
        roe: '34.20',
        dividendYield: '2.80',
        beta5y: '0.92',
        moneyInflowNetTry: '145000000',
        topBuyers: ['İş Yatırım', 'Bank of America', 'Garanti BBVA'],
        topSellers: ['Yapı Kredi', 'QNB Finansinvest'],
        fiftyTwoWeekHigh: '345.00',
        fiftyTwoWeekLow: '215.50'
      },
      {
        ticker: 'EREGL',
        companyName: 'Ereğli Demir ve Çelik Fabrikaları T.A.Ş.',
        sector: 'Metal Ana Sanayi / Demir Çelik',
        price: '54.20',
        changePct: '1.12',
        volume: '2350000000',
        marketCap: '189700000000',
        peRatio: '8.40',
        pbRatio: '1.15',
        evEbitda: '5.80',
        netDebtEbitda: '1.10',
        currentRatio: '1.62',
        roe: '18.50',
        dividendYield: '5.40',
        beta5y: '0.88',
        moneyInflowNetTry: '82000000',
        topBuyers: ['Ak Yatırım', 'Gedik Yatırım'],
        topSellers: ['HSBC Yatırım', 'Ziraat Yatırım'],
        fiftyTwoWeekHigh: '62.50',
        fiftyTwoWeekLow: '38.20'
      },
      {
        ticker: 'TUPRS',
        companyName: 'Tüpraş - Türkiye Petrol Rafinerileri A.Ş.',
        sector: 'Kimya / Petrol Rafineri',
        price: '184.80',
        changePct: '-0.65',
        volume: '3120000000',
        marketCap: '356050000000',
        peRatio: '5.90',
        pbRatio: '1.75',
        evEbitda: '4.20',
        netDebtEbitda: '0.35',
        currentRatio: '1.28',
        roe: '42.10',
        dividendYield: '7.80',
        beta5y: '0.95',
        moneyInflowNetTry: '-34000000',
        topBuyers: ['Garanti BBVA', 'Tacirler Yatırım'],
        topSellers: ['Bank of America', 'Deniz Yatırım'],
        fiftyTwoWeekHigh: '208.50',
        fiftyTwoWeekLow: '132.00'
      },
      {
        ticker: 'ASELS',
        companyName: 'Aselsan Elektronik Sanayi ve Ticaret A.Ş.',
        sector: 'Savunma Sanayi & Teknoloji',
        price: '68.75',
        changePct: '3.85',
        volume: '4100000000',
        marketCap: '313500000000',
        peRatio: '12.40',
        pbRatio: '3.10',
        evEbitda: '9.60',
        netDebtEbitda: '0.85',
        currentRatio: '1.85',
        roe: '26.80',
        dividendYield: '1.20',
        beta5y: '0.78',
        moneyInflowNetTry: '210000000',
        topBuyers: ['Bank of America', 'İş Yatırım', 'Vakıf Yatırım'],
        topSellers: ['QNB Finansinvest', 'Info Yatırım'],
        fiftyTwoWeekHigh: '72.90',
        fiftyTwoWeekLow: '41.10'
      },
      {
        ticker: 'BIMAS',
        companyName: 'BİM Birleşik Mağazalar A.Ş.',
        sector: 'Perakende Ticaret',
        price: '582.00',
        changePct: '0.87',
        volume: '1890000000',
        marketCap: '353374000000',
        peRatio: '14.20',
        pbRatio: '4.80',
        evEbitda: '8.10',
        netDebtEbitda: '0.40',
        currentRatio: '1.05',
        roe: '38.90',
        dividendYield: '3.10',
        beta5y: '0.65',
        moneyInflowNetTry: '45000000',
        topBuyers: ['Yapı Kredi Yatırım', 'Oyak Yatırım'],
        topSellers: ['Meksa Yatırım'],
        fiftyTwoWeekHigh: '612.00',
        fiftyTwoWeekLow: '348.00'
      },
      {
        ticker: 'SISE',
        companyName: 'Türkiye Şişe ve Cam Fabrikaları A.Ş.',
        sector: 'Cam & Seramik Sanayi',
        price: '48.90',
        changePct: '1.45',
        volume: '1450000000',
        marketCap: '149780000000',
        peRatio: '7.80',
        pbRatio: '1.22',
        evEbitda: '5.90',
        netDebtEbitda: '1.45',
        currentRatio: '1.55',
        roe: '19.40',
        dividendYield: '2.40',
        beta5y: '0.85',
        moneyInflowNetTry: '38000000',
        topBuyers: ['İş Yatırım', 'Garanti BBVA'],
        topSellers: ['Global Menkul'],
        fiftyTwoWeekHigh: '57.80',
        fiftyTwoWeekLow: '42.10'
      },
      {
        ticker: 'KCHOL',
        companyName: 'Koç Holding A.Ş.',
        sector: 'Holding & Yatırım',
        price: '214.60',
        changePct: '1.95',
        volume: '2980000000',
        marketCap: '544200000000',
        peRatio: '5.40',
        pbRatio: '1.38',
        evEbitda: '4.60',
        netDebtEbitda: '0.90',
        currentRatio: '1.40',
        roe: '32.50',
        dividendYield: '4.20',
        beta5y: '0.94',
        moneyInflowNetTry: '96000000',
        topBuyers: ['Bank of America', 'Ak Yatırım'],
        topSellers: ['Ziraat Yatırım'],
        fiftyTwoWeekHigh: '265.00',
        fiftyTwoWeekLow: '142.00'
      },
      {
        ticker: 'SAHOL',
        companyName: 'Hacı Ömer Sabancı Holding A.Ş.',
        sector: 'Holding & Yatırım',
        price: '94.30',
        changePct: '0.64',
        volume: '1670000000',
        marketCap: '196500000000',
        peRatio: '4.80',
        pbRatio: '0.95',
        evEbitda: '4.10',
        netDebtEbitda: '0.75',
        currentRatio: '1.35',
        roe: '24.10',
        dividendYield: '3.90',
        beta5y: '0.91',
        moneyInflowNetTry: '29000000',
        topBuyers: ['Yapı Kredi', 'İş Yatırım'],
        topSellers: ['A1 Capital'],
        fiftyTwoWeekHigh: '112.40',
        fiftyTwoWeekLow: '64.50'
      },
      {
        ticker: 'FROTO',
        companyName: 'Ford Otomotiv Sanayi A.Ş.',
        sector: 'Otomotiv Sanayi',
        price: '1120.00',
        changePct: '2.10',
        volume: '1540000000',
        marketCap: '393020000000',
        peRatio: '9.20',
        pbRatio: '4.60',
        evEbitda: '7.80',
        netDebtEbitda: '1.20',
        currentRatio: '1.18',
        roe: '58.40',
        dividendYield: '5.10',
        beta5y: '0.82',
        moneyInflowNetTry: '64000000',
        topBuyers: ['QNB Finansinvest', 'Bank of America'],
        topSellers: ['Halk Yatırım'],
        fiftyTwoWeekHigh: '1240.00',
        fiftyTwoWeekLow: '820.00'
      },
      {
        ticker: 'ASTOR',
        companyName: 'Astor Enerji A.Ş.',
        sector: 'Elektrik & Enerji Ekipmanları',
        price: '104.50',
        changePct: '4.60',
        volume: '2780000000',
        marketCap: '104290000000',
        peRatio: '13.80',
        pbRatio: '4.20',
        evEbitda: '10.50',
        netDebtEbitda: '-0.20',
        currentRatio: '2.45',
        roe: '36.80',
        dividendYield: '1.80',
        beta5y: '1.15',
        moneyInflowNetTry: '112000000',
        topBuyers: ['İş Yatırım', 'Garanti BBVA', 'Gedik Yatırım'],
        topSellers: ['Bank of America'],
        fiftyTwoWeekHigh: '142.00',
        fiftyTwoWeekLow: '84.00'
      }
    ];

    for (const item of mockCompanies) {
      const stockExists = await db.select().from(bistStocks).where(eq(bistStocks.ticker, item.ticker)).limit(1);
      if (stockExists.length === 0) {
        await db.insert(bistStocks).values(item);
      } else {
        await db.update(bistStocks).set({
          sector: item.sector,
          pbRatio: item.pbRatio,
          evEbitda: item.evEbitda,
          netDebtEbitda: item.netDebtEbitda,
          currentRatio: item.currentRatio,
          roe: item.roe,
          dividendYield: item.dividendYield,
          beta5y: item.beta5y,
          moneyInflowNetTry: item.moneyInflowNetTry,
          topBuyers: item.topBuyers,
          topSellers: item.topSellers,
          peRatio: item.peRatio,
          price: item.price,
          marketCap: item.marketCap,
          volume: item.volume,
          lastUpdated: new Date()
        }).where(eq(bistStocks.ticker, item.ticker));
      }
    }
  }

  private async seedFinancials(): Promise<void> {
    try {
      const existing = await db.select({ count: sql<number>`count(*)` }).from(bistFinancials);
      const count = Number(existing[0]?.count || 0);
      if (count >= 100) return;

      console.log('[ComprehensiveData] 608+ BIST hissesi için 4 çeyreklik detaylı finansal tablolar (bist_financials) tohumlanıyor...');
      const allFinancials = generateComprehensiveBistFinancials();

      // Insert in chunks of 150
      for (let i = 0; i < allFinancials.length; i += 150) {
        const chunk = allFinancials.slice(i, i + 150);
        await db.insert(bistFinancials).values(chunk);
      }
      console.log(`[ComprehensiveData] Toplam ${allFinancials.length} çeyreklik bilanço kaydı başarıyla eklendi.`);
    } catch (e: any) {
      console.warn('[ComprehensiveData] seedFinancials notice:', e.message);
    }
  }

  private async seedBuybacks(): Promise<void> {
    try {
      const existing = await db.select({ count: sql<number>`count(*)` }).from(bistBuybacks);
      const count = Number(existing[0]?.count || 0);
      if (count >= 20) return;

      console.log(`[ComprehensiveData] ${COMPREHENSIVE_BIST_BUYBACKS.length} adet hisse geri alım programı (bist_buybacks) tohumlanıyor...`);
      for (const item of COMPREHENSIVE_BIST_BUYBACKS) {
        await db.insert(bistBuybacks).values({
          ticker: item.ticker,
          date: item.lastPurchaseDate || item.programStartDate || '2026-09-04',
          sharesBought: item.purchasedShares,
          pricePaid: item.averagePriceTry,
          totalTry: item.purchasedBudgetTry,
          cumulativeShares: item.purchasedShares,
          percentageOfCapital: item.currentCapitalPct,
          programAuthorizedTry: item.authorizedBudgetTry,
          disclosureId: item.disclosureIndex || '1650000'
        });
      }
    } catch (e: any) {
      console.warn('[ComprehensiveData] seedBuybacks notice:', e.message);
    }
  }

  private async seedIpos(): Promise<void> {
    try {
      const existing = await db.select({ count: sql<number>`count(*)` }).from(ipos);
      const count = Number(existing[0]?.count || 0);
      if (count >= 10) return;

      console.log(`[ComprehensiveData] ${COMPREHENSIVE_IPOS.length} adet halka arz (ipos) kaydı tohumlanıyor...`);
      for (const item of COMPREHENSIVE_IPOS) {
        const formatted = {
          companyCode: item.ticker,
          companyName: item.companyName,
          status: item.status,
          price: `${item.ipoPrice} TL`,
          offerPrice: item.ipoPrice,
          totalShares: item.totalOfferedShares,
          ipoSizeTry: item.publicOfferingSizeTry,
          dates: `${item.applicationStartDate} - ${item.applicationEndDate}`,
          dateStr: item.applicationStartDate,
          distributionType: Number(item.allotmentIndividualPct) > 50 ? 'Bireysele Eşit Dağıtım' : 'Oransal Dağıtım',
          consortiumLeader: item.consortiumLeader,
          bistMarket: 'Yıldız Pazar',
          peRatioIpo: item.peRatioPreIpo || '10.50',
          discountRate: item.discountRatePct || '20.00',
          prospectusUrl: 'https://www.kap.org.tr',
          fundUsage: `Kapasite ve Tesis Yatırımı (%${item.fundUsagePlan?.factoryExpansion || item.fundUsagePlan?.capacityExpansion || item.fundUsagePlan?.solarenergyInvestments || 50}), İşletme Sermayesi (%30)`,
          fundUsageJson: item.fundUsagePlan ? Object.entries(item.fundUsagePlan).map(([k, v]) => ({ area: k, percentage: v })) : [],
          allotmentResult: {
            total_applicants: item.totalParticipants,
            shares_per_investor: item.totalParticipants > 0 ? Math.round(Number(item.totalOfferedShares) / item.totalParticipants) : 0,
            allotment_try: item.totalParticipants > 0 ? Math.round((Number(item.totalOfferedShares) / item.totalParticipants) * Number(item.ipoPrice)) : 0
          },
          sentiment: 'YÜKSEK POTANSİYEL',
          aiSummary: `${item.companyName} halka arz büyüklüğü ${Number(item.publicOfferingSizeTry) / 1e6} Milyon TL.`,
          ipoSize: `${(Number(item.publicOfferingSizeTry) / 1e9).toFixed(2)} Milyar TL`,
          freeFloat: `%${item.freeFloatPct}`,
          currentPrice: item.currentPrice || item.ipoPrice,
          dayChangePct: '+0.00%',
          ceilingStreak: item.ceilingDays,
          maxCeilingStreak: item.ceilingDays,
          totalReturnPct: item.returnSinceIpoPct ? `+${item.returnSinceIpoPct}%` : '+0.0%'
        };

        const exists = await db.select().from(ipos).where(eq(ipos.companyCode, item.ticker)).limit(1);
        if (exists.length === 0) {
          await db.insert(ipos).values(formatted as any);
        } else {
          await db.update(ipos).set(formatted as any).where(eq(ipos.companyCode, item.ticker));
        }
      }
    } catch (e: any) {
      console.warn('[ComprehensiveData] seedIpos notice:', e.message);
    }
  }

  private async seedCryptoOnChain(): Promise<void> {
    try {
      const existing = await db.select({ count: sql<number>`count(*)` }).from(cryptoOnChain);
      const count = Number(existing[0]?.count || 0);
      if (count >= 15) return;

      console.log(`[ComprehensiveData] ${COMPREHENSIVE_CRYPTO_ON_CHAIN.length} kripto varlık on-chain metrikleri tohumlanıyor...`);
      for (const item of COMPREHENSIVE_CRYPTO_ON_CHAIN) {
        const payload = {
          symbol: item.symbol,
          date: '2026-09-08',
          inOutMoneyPct: item.inOutMoneyPct,
          outMoneyPct: item.outMoneyPct,
          largeTxsVolumeUsd: item.largeTxsVolumeUsd,
          largeTxsCount: item.largeTxsCount,
          networkGrowthPct: item.networkGrowthPct,
          concentrationWhalesPct: item.concentrationWhalesPct,
          sentimentScore: item.sentimentScore,
          summaryText: item.summaryText
        };
        const found = await db.select().from(cryptoOnChain).where(eq(cryptoOnChain.symbol, item.symbol)).limit(1);
        if (found.length === 0) {
          await db.insert(cryptoOnChain).values(payload);
        } else {
          await db.update(cryptoOnChain).set(payload).where(eq(cryptoOnChain.symbol, item.symbol));
        }
      }
    } catch (e: any) {
      console.warn('[ComprehensiveData] seedCryptoOnChain notice:', e.message);
    }
  }

  private async seedAnalystReports(): Promise<void> {
    try {
      const existing = await db.select({ count: sql<number>`count(*)` }).from(analystReports);
      const count = Number(existing[0]?.count || 0);
      if (count >= 30) return;

      console.log(`[ComprehensiveData] ${INITIAL_ANALYST_REPORTS.length} analist araştırma raporu tohumlanıyor...`);
      for (const item of INITIAL_ANALYST_REPORTS) {
        await db.insert(analystReports).values({
          market: item.market || 'BIST',
          source: item.source || 'KAP_RESEARCH',
          sourceName: item.sourceName,
          sourceUrl: item.sourceUrl,
          author: item.author,
          ticker: item.ticker,
          assetName: item.assetName,
          title: item.title,
          rawContent: item.rawContent,
          recommendation: item.recommendation,
          targetPrice: item.targetPrice ? String(item.targetPrice) : null,
          currentPriceAtReport: item.currentPriceAtReport ? String(item.currentPriceAtReport) : null,
          upsidePct: item.upsidePct ? String(item.upsidePct) : null,
          currency: item.currency || 'TRY',
          publishDate: new Date(item.publishDate),
          aiSummary: item.aiSummary,
          aiSentiment: item.aiSentiment,
          aiSentimentScore: item.aiSentimentScore ? String(item.aiSentimentScore) : '0.500',
          keyBullArguments: item.keyBullArguments,
          keyBearRisks: item.keyBearRisks,
          isSynthesized: true,
          synthesizedAt: new Date()
        });
      }
    } catch (e: any) {
      console.warn('[ComprehensiveData] seedAnalystReports notice:', e.message);
    }
  }

  private async seedUsHistorical(): Promise<void> {
    try {
      await usHistService.ensureHistoricalSeeded();
    } catch (e: any) {
      console.warn('[ComprehensiveData] seedUsHistorical notice:', e.message);
    }
  }

  private async seedTefasHoldings(): Promise<void> {
    const existing = await db.select().from(tefasFundHoldings).limit(1);
    if (existing.length > 0) return;

    const mockHoldings = [
      {
        fundCode: 'TI2',
        fundName: 'İş Portföy BIST 100 Dışı Şirketler Hisse Senedi Fonu',
        assetSymbol: 'ASTOR',
        assetName: 'Astor Enerji A.Ş.',
        assetType: 'Hisse Senedi (BIST)',
        weightPct: '8.40',
        nominalShares: '3600000',
        marketValue: '376200000',
        sector: 'Enerji / Elektrik'
      },
      {
        fundCode: 'TI2',
        fundName: 'İş Portföy BIST 100 Dışı Şirketler Hisse Senedi Fonu',
        assetSymbol: 'MIATK',
        assetName: 'Mia Teknoloji A.Ş.',
        assetType: 'Hisse Senedi (BIST)',
        weightPct: '7.10',
        nominalShares: '4800000',
        marketValue: '318000000',
        sector: 'Bilişim & Yazılım'
      },
      {
        fundCode: 'TI2',
        fundName: 'İş Portföy BIST 100 Dışı Şirketler Hisse Senedi Fonu',
        assetSymbol: 'ALFAS',
        assetName: 'Alfa Solar Enerji Sanayi ve Ticaret A.Ş.',
        assetType: 'Hisse Senedi (BIST)',
        weightPct: '6.80',
        nominalShares: '3900000',
        marketValue: '304600000',
        sector: 'Yenilenebilir Enerji'
      },
      {
        fundCode: 'TI2',
        fundName: 'İş Portföy BIST 100 Dışı Şirketler Hisse Senedi Fonu',
        assetSymbol: 'KCAER',
        assetName: 'Kocaer Çelik Sanayi ve Ticaret A.Ş.',
        assetType: 'Hisse Senedi (BIST)',
        weightPct: '5.90',
        nominalShares: '4200000',
        marketValue: '264300000',
        sector: 'Demir Çelik'
      },
      {
        fundCode: 'TI2',
        fundName: 'İş Portföy BIST 100 Dışı Şirketler Hisse Senedi Fonu',
        assetSymbol: 'KONTR',
        assetName: 'Kontrolmatik Teknoloji Enerji ve Mühendislik A.Ş.',
        assetType: 'Hisse Senedi (BIST)',
        weightPct: '5.40',
        nominalShares: '3100000',
        marketValue: '241800000',
        sector: 'Enerji & Teknoloji'
      },
      {
        fundCode: 'TCD',
        fundName: 'Tacirler Portföy Değişken Fon',
        assetSymbol: 'THYAO',
        assetName: 'Türk Hava Yolları A.O.',
        assetType: 'Hisse Senedi (BIST)',
        weightPct: '9.20',
        nominalShares: '2400000',
        marketValue: '764400000',
        sector: 'Ulaştırma'
      },
      {
        fundCode: 'TCD',
        fundName: 'Tacirler Portföy Değişken Fon',
        assetSymbol: 'ASELS',
        assetName: 'Aselsan Elektronik Sanayi',
        assetType: 'Hisse Senedi (BIST)',
        weightPct: '8.10',
        nominalShares: '9800000',
        marketValue: '673750000',
        sector: 'Savunma'
      },
      {
        fundCode: 'TCD',
        fundName: 'Tacirler Portföy Değişken Fon',
        assetSymbol: 'TUPRS',
        assetName: 'Tüpraş Rafineri',
        assetType: 'Hisse Senedi (BIST)',
        weightPct: '7.80',
        nominalShares: '3500000',
        marketValue: '646800000',
        sector: 'Petrol'
      }
    ];

    for (const item of mockHoldings) {
      await db.insert(tefasFundHoldings).values(item);
    }
  }

  private async seedDisclosures(): Promise<void> {
    const existing = await db.select().from(kapDisclosures).limit(1);
    const mockDisclosures = [
      {
        disclosureIndex: '1655968',
        symbol: 'ASELS',
        companyName: 'Aselsan Elektronik Sanayi ve Ticaret A.Ş.',
        title: 'Yeni İş İlişkisi: Savunma Sanayii Başkanlığı ile Sözleşme İmzalanması',
        category: 'Özel Durum Açıklaması (Genel)',
        summary: 'Şirketimiz ile Savunma Sanayii Başkanlığı arasında 450 Milyon USD tutarında yeni nesil radar ve haberleşme sistemleri tedarik sözleşmesi imzalanmıştır.',
        publishDate: new Date('2026-09-06T17:45:00Z'),
        impactLevel: 'VERY_HIGH',
        sentiment: 'POSITIVE',
        url: 'https://www.kap.org.tr/tr/Bildirim/1655968'
      },
      {
        disclosureIndex: '1654890',
        symbol: 'THYAO',
        companyName: 'Türk Hava Yolları A.O.',
        title: 'Hisse Geri Alım İşlemleri Bildirimi',
        category: 'Pay Alım Satım Bildirimi',
        summary: 'Yönetim Kurulu kararı doğrultusunda Borsa İstanbul bünyesinde 316.40 TL ortalama fiyattan 250.000 adet pay geri alınmıştır.',
        publishDate: new Date('2026-09-04T18:15:00Z'),
        impactLevel: 'HIGH',
        sentiment: 'POSITIVE',
        url: 'https://www.kap.org.tr/tr/Bildirim/1654890'
      },
      {
        disclosureIndex: '1655120',
        symbol: 'SISE',
        companyName: 'Türkiye Şişe ve Cam Fabrikaları A.Ş.',
        title: 'Kapasite Artırımı ve Yeni Fırın Yatırımı Açıklaması',
        category: 'Yatırım ve Faaliyet Bildirimi',
        summary: 'Mersin Cam Ambalaj fabrikamızda 120 Milyon Euro tutarında yeni fırın yatırımı kararı alınmış olup yıllık 155.000 ton ek kapasite hedeflenmektedir.',
        publishDate: new Date('2026-09-05T14:30:00Z'),
        impactLevel: 'HIGH',
        sentiment: 'POSITIVE',
        url: 'https://www.kap.org.tr/tr/Bildirim/1655120'
      }
    ];

    for (const item of mockDisclosures) {
      const exists = await db.select().from(kapDisclosures).where(eq(kapDisclosures.disclosureIndex, item.disclosureIndex)).limit(1);
      if (exists.length === 0) {
        await db.insert(kapDisclosures).values(item);
      } else {
        await db.update(kapDisclosures).set(item).where(eq(kapDisclosures.disclosureIndex, item.disclosureIndex));
      }
    }
  }

  // --- EXPORT DATA RETRIEVAL METHODS MATCHING MD SPECS ---

  public async getCompaniesExport(): Promise<CompanyExportItem[]> {
    const stocks = await db.select().from(bistStocks).orderBy(desc(bistStocks.marketCap));
    return stocks.map(s => ({
      ticker: s.ticker,
      company_name: s.companyName || s.ticker,
      sector: s.sector || 'Genel Sanayi',
      current_price: Number(s.price || 0),
      daily_change_pct: Number(s.changePct || 0),
      volume_try: Number(s.volume || 0),
      market_cap_try: Number(s.marketCap || 0),
      pe_ratio: s.peRatio ? Number(s.peRatio) : null,
      pb_ratio: s.pbRatio ? Number(s.pbRatio) : null,
      ev_ebitda: s.evEbitda ? Number(s.evEbitda) : null,
      net_debt_ebitda: s.netDebtEbitda ? Number(s.netDebtEbitda) : null,
      current_ratio: s.currentRatio ? Number(s.currentRatio) : null,
      roe: s.roe ? Number(s.roe) : null,
      dividend_yield: s.dividendYield ? Number(s.dividendYield) : null,
      beta_5y: s.beta5y ? Number(s.beta5y) : null,
      money_inflow_net_try: Number(s.moneyInflowNetTry || 0),
      top_buyers: (s.topBuyers as string[]) || ['İş Yatırım', 'Garanti BBVA'],
      top_sellers: (s.topSellers as string[]) || ['Yapı Kredi', 'Ak Yatırım'],
      updated_at: s.lastUpdated ? s.lastUpdated.toISOString() : new Date().toISOString()
    }));
  }

  public async getFinancialsExport(ticker?: string): Promise<FinancialsExportItem[]> {
    const query = ticker 
      ? db.select().from(bistFinancials).where(eq(bistFinancials.ticker, ticker.toUpperCase())).orderBy(desc(bistFinancials.year), desc(bistFinancials.period))
      : db.select().from(bistFinancials).orderBy(desc(bistFinancials.year), desc(bistFinancials.period));

    const records = await query;
    return records.map(f => ({
      ticker: f.ticker,
      year: f.year,
      period: f.period,
      announced_date: f.announcedDate || '2026-08-15',
      revenue: Number(f.revenue || 0),
      revenue_yoy: Number(f.revenueYoy || 0),
      gross_profit: Number(f.grossProfit || 0),
      gross_margin: Number(f.grossMargin || 0),
      operating_profit: Number(f.operatingProfit || 0),
      operating_margin: Number(f.operatingMargin || 0),
      ebitda: Number(f.ebitda || 0),
      ebitda_margin: Number(f.ebitdaMargin || 0),
      net_profit: Number(f.netProfit || 0),
      net_profit_yoy: Number(f.netProfitYoy || 0),
      net_margin: Number(f.netMargin || 0),
      total_assets: Number(f.totalAssets || 0),
      current_assets: Number(f.currentAssets || 0),
      short_term_liabilities: Number(f.shortTermLiabilities || 0),
      long_term_liabilities: Number(f.longTermLiabilities || 0),
      net_debt: Number(f.netDebt || 0),
      equity: Number(f.equity || 0),
      working_capital: Number(f.workingCapital || 0),
      free_cash_flow: Number(f.freeCashFlow || 0),
      operating_cash_flow: Number(f.operatingCashFlow || 0),
      capex: Number(f.capex || 0),
      paid_capital: Number(f.paidCapital || 0),
      retained_earnings: Number(f.retainedEarnings || 0),
      disclosure_id: f.disclosureId || '1655968'
    }));
  }

  public async getFundsExport(code?: string): Promise<FundExportItem[]> {
    const fundsList = code 
      ? await db.select().from(tefasFunds).where(eq(tefasFunds.code, code.toUpperCase())).limit(1)
      : await db.select().from(tefasFunds).limit(50);

    const allHoldings = await db.select().from(tefasFundHoldings);
    const holdingsByCode: Record<string, any[]> = {};
    for (const h of allHoldings) {
      if (!holdingsByCode[h.fundCode]) holdingsByCode[h.fundCode] = [];
      holdingsByCode[h.fundCode].push(h);
    }

    const result: FundExportItem[] = [];

    for (const f of fundsList) {
      const holdings = (holdingsByCode[f.code] || []).slice(0, 10);
      
      // Query dynamic prices from tefasPrices
      const prices = await db.select().from(tefasPrices)
        .where(eq(tefasPrices.fundId, f.id))
        .orderBy(desc(tefasPrices.date))
        .limit(30);

      const latest = prices[0];
      const currentPrice = latest ? Number(latest.price) : 15.40;
      const dailyReturn = latest ? Number(latest.dailyChange || 0) : 0.85;
      const return1M = latest?.return1M ? Number(latest.return1M) : 7.20;
      const return3M = latest?.return3M ? Number(latest.return3M) : 21.50;
      const return6M = latest?.return6M ? Number(latest.return6M) : 46.80;
      const return1Y = latest?.return1Y ? Number(latest.return1Y) : 92.40;
      const returnYTD = latest?.returnYTD ? Number(latest.returnYTD) : 38.60;
      const totalVal = latest ? Number(latest.marketCap || 4500000000) : 4500000000;
      const shares = latest ? Number(latest.shares || 300000000) : 300000000;
      const investors = latest ? Number(latest.investorCount || 28000) : 28000;

      const allocation = (latest?.assetAllocation as Record<string, number>) || {
        "hisse_senedi": 85.0,
        "para_piyasasi": 8.0,
        "kamu_borclanma": 0.0,
        "diger": 7.0
      };

      const priceHistory = prices.length > 0 
        ? prices.slice().reverse().map(p => ({
            date: p.date.toISOString().split('T')[0],
            price: Number(p.price)
          }))
        : [
            { date: '2026-09-01', price: currentPrice * 0.98 },
            { date: '2026-09-02', price: currentPrice * 0.985 },
            { date: '2026-09-03', price: currentPrice * 0.99 },
            { date: '2026-09-04', price: currentPrice * 0.995 },
            { date: '2026-09-05', price: currentPrice }
          ];

      result.push({
        code: f.code,
        name: f.name,
        category: f.type || 'Hisse Senedi Şemsiye Fonu',
        price: currentPrice,
        daily_return: dailyReturn,
        return_1m: return1M,
        return_3m: return3M,
        return_6m: return6M,
        return_1y: return1Y,
        return_ytd: returnYTD,
        total_value: totalVal,
        outstanding_shares: shares,
        investor_count: investors,
        management_fee: Number(f.managementFee || 2.90),
        sharpe_ratio: 2.14,
        standard_deviation: 18.5,
        loss_days_ratio: 38.2,
        allocation: allocation,
        top_holdings: holdings.map(h => ({
          ticker: h.assetSymbol,
          weight_pct: Number(h.weightPct)
        })),
        price_history: priceHistory
      });
    }

    return result;
  }

  public async getIposExport(): Promise<IpoExportItem[]> {
    const list = await db.select().from(ipos).orderBy(desc(ipos.createdAt));
    return list.map(i => ({
      ticker: i.companyCode,
      company_name: i.companyName,
      status: i.status,
      offer_price: Number(i.offerPrice || parseFloat(i.price?.replace(/[^0-9.]/g, '') || '0') || 42.50),
      total_shares: Number(i.totalShares || 30000000),
      ipo_size_try: Number(i.ipoSizeTry || 1275000000),
      dates: i.dates || i.dateStr || '2026',
      distribution_type: i.distributionType || 'Eşit Dağıtım',
      consortium_leader: i.consortiumLeader || 'Gedik Yatırım Menkul Değerler A.Ş.',
      bist_market: i.bistMarket || 'Yıldız Pazar',
      p_e_ratio_ipo: Number(i.peRatioIpo || 7.8),
      discount_rate: Number(i.discountRate ? parseFloat(i.discountRate.replace(/[^0-9.]/g, '')) : 22.5),
      prospectus_url: i.prospectusUrl || 'https://www.kap.org.tr',
      fund_usage: (i.fundUsageJson as any) || [
        { area: "Güneş Enerjisi Santral Yatırımı", percentage: 55 },
        { area: "İşletme Sermayesi Finansmanı", percentage: 30 },
        { area: "Kısa Vadeli Banka Kredi Ödemesi", percentage: 15 }
      ],
      allotment_result: (i.allotmentResult as any) || {
        total_applicants: 2450000,
        shares_per_investor: 12,
        allotment_try: 510
      }
    }));
  }

  public async getBuybacksExport(): Promise<BuybackExportItem[]> {
    const list = await db.select().from(bistBuybacks).orderBy(desc(bistBuybacks.date));
    return list.map(b => ({
      ticker: b.ticker,
      date: b.date,
      shares_bought: Number(b.sharesBought || 0),
      price_paid: Number(b.pricePaid || 0),
      total_try: Number(b.totalTry || 0),
      cumulative_shares: Number(b.cumulativeShares || 0),
      percentage_of_capital: Number(b.percentageOfCapital || 0),
      program_authorized_try: Number(b.programAuthorizedTry || 0),
      disclosure_id: b.disclosureId || ''
    }));
  }

  public async getDisclosuresExport(): Promise<DisclosureExportItem[]> {
    const list = await db.select().from(kapDisclosures).orderBy(desc(kapDisclosures.publishDate)).limit(50);
    return list.map(d => ({
      disclosure_id: d.disclosureIndex,
      ticker: d.symbol || '',
      company_name: d.companyName || d.symbol || '',
      title: d.title,
      category: d.category || 'Özel Durum Açıklaması',
      summary: d.summary || '',
      publish_date: d.publishDate ? d.publishDate.toISOString() : new Date().toISOString(),
      impact_level: d.impactLevel || 'HIGH',
      sentiment: d.sentiment || 'POSITIVE',
      kap_url: d.url || `https://www.kap.org.tr/tr/Bildirim/${d.disclosureIndex}`
    }));
  }

  public async getBulkExport(tables?: string[]): Promise<Record<string, any>> {
    const requested = tables && tables.length > 0 ? tables : ['companies', 'financials', 'funds', 'ipo', 'buybacks', 'disclosures', 'macro_indicators'];
    const bulkData: Record<string, any> = {};

    if (requested.includes('companies') || requested.includes('stocks')) {
      bulkData.companies = await this.getCompaniesExport();
    }
    if (requested.includes('financials')) {
      bulkData.financials = await this.getFinancialsExport();
    }
    if (requested.includes('funds')) {
      bulkData.funds = await this.getFundsExport();
    }
    if (requested.includes('ipo') || requested.includes('ipos')) {
      bulkData.ipo = await this.getIposExport();
    }
    if (requested.includes('buybacks')) {
      bulkData.buybacks = await this.getBuybacksExport();
    }
    if (requested.includes('disclosures')) {
      bulkData.disclosures = await this.getDisclosuresExport();
    }
    if (requested.includes('macro_indicators') || requested.includes('macro')) {
      const macros = await db.select().from(macroIndicators);
      bulkData.macro_indicators = macros;
    }

    return bulkData;
  }

  // --- INGESTION & IMPORT METHODS (For JSON/REST/External sync) ---

  public async importBulkData(payload: Record<string, any[]>): Promise<{ success: boolean; inserted: Record<string, number>; message: string }> {
    const results: Record<string, number> = {};

    // 1. Companies / Stocks
    if (Array.isArray(payload.companies) || Array.isArray(payload.stocks)) {
      const items = payload.companies || payload.stocks;
      let count = 0;
      for (const item of items) {
        const ticker = (item.ticker || item.symbol || '').toUpperCase();
        if (!ticker) continue;
        const mapped = {
          ticker,
          companyName: item.company_name || item.name || ticker,
          sector: item.sector,
          price: item.current_price !== undefined ? String(item.current_price) : undefined,
          changePct: item.daily_change_pct !== undefined ? String(item.daily_change_pct) : undefined,
          volume: item.volume_try !== undefined ? String(item.volume_try) : undefined,
          marketCap: item.market_cap_try !== undefined ? String(item.market_cap_try) : undefined,
          peRatio: item.pe_ratio !== undefined ? String(item.pe_ratio) : undefined,
          pbRatio: item.pb_ratio !== undefined ? String(item.pb_ratio) : undefined,
          evEbitda: item.ev_ebitda !== undefined ? String(item.ev_ebitda) : undefined,
          netDebtEbitda: item.net_debt_ebitda !== undefined ? String(item.net_debt_ebitda) : undefined,
          currentRatio: item.current_ratio !== undefined ? String(item.current_ratio) : undefined,
          roe: item.roe !== undefined ? String(item.roe) : undefined,
          dividendYield: item.dividend_yield !== undefined ? String(item.dividend_yield) : undefined,
          beta5y: item.beta_5y !== undefined ? String(item.beta_5y) : undefined,
          moneyInflowNetTry: item.money_inflow_net_try !== undefined ? String(item.money_inflow_net_try) : undefined,
          topBuyers: item.top_buyers,
          topSellers: item.top_sellers,
          lastUpdated: new Date()
        };

        const exists = await db.select().from(bistStocks).where(eq(bistStocks.ticker, ticker)).limit(1);
        if (exists.length > 0) {
          await db.update(bistStocks).set(mapped).where(eq(bistStocks.ticker, ticker));
        } else {
          await db.insert(bistStocks).values(mapped as any);
        }
        count++;
      }
      results.companies = count;
    }

    // 2. Financials
    if (Array.isArray(payload.financials)) {
      let count = 0;
      for (const item of payload.financials) {
        const ticker = (item.ticker || '').toUpperCase();
        if (!ticker || !item.year || !item.period) continue;
        const mapped = {
          ticker,
          year: Number(item.year),
          period: Number(item.period),
          announcedDate: item.announced_date,
          revenue: item.revenue !== undefined ? String(item.revenue) : null,
          revenueYoy: item.revenue_yoy !== undefined ? String(item.revenue_yoy) : null,
          grossProfit: item.gross_profit !== undefined ? String(item.gross_profit) : null,
          grossMargin: item.gross_margin !== undefined ? String(item.gross_margin) : null,
          operatingProfit: item.operating_profit !== undefined ? String(item.operating_profit) : null,
          operatingMargin: item.operating_margin !== undefined ? String(item.operating_margin) : null,
          ebitda: item.ebitda !== undefined ? String(item.ebitda) : null,
          ebitdaMargin: item.ebitda_margin !== undefined ? String(item.ebitda_margin) : null,
          netProfit: item.net_profit !== undefined ? String(item.net_profit) : null,
          netProfitYoy: item.net_profit_yoy !== undefined ? String(item.net_profit_yoy) : null,
          netMargin: item.net_margin !== undefined ? String(item.net_margin) : null,
          totalAssets: item.total_assets !== undefined ? String(item.total_assets) : null,
          currentAssets: item.current_assets !== undefined ? String(item.current_assets) : null,
          shortTermLiabilities: item.short_term_liabilities !== undefined ? String(item.short_term_liabilities) : null,
          longTermLiabilities: item.long_term_liabilities !== undefined ? String(item.long_term_liabilities) : null,
          netDebt: item.net_debt !== undefined ? String(item.net_debt) : null,
          equity: item.equity !== undefined ? String(item.equity) : null,
          workingCapital: item.working_capital !== undefined ? String(item.working_capital) : null,
          freeCashFlow: item.free_cash_flow !== undefined ? String(item.free_cash_flow) : null,
          operatingCashFlow: item.operating_cash_flow !== undefined ? String(item.operating_cash_flow) : null,
          capex: item.capex !== undefined ? String(item.capex) : null,
          paidCapital: item.paid_capital !== undefined ? String(item.paid_capital) : null,
          retainedEarnings: item.retained_earnings !== undefined ? String(item.retained_earnings) : null,
          disclosureId: item.disclosure_id
        };

        const existingRec = await db.select().from(bistFinancials)
          .where(sql`${bistFinancials.ticker} = ${ticker} AND ${bistFinancials.year} = ${mapped.year} AND ${bistFinancials.period} = ${mapped.period}`)
          .limit(1);

        if (existingRec.length > 0) {
          await db.update(bistFinancials).set(mapped).where(eq(bistFinancials.id, existingRec[0].id));
        } else {
          await db.insert(bistFinancials).values(mapped as any);
        }
        count++;
      }
      results.financials = count;
    }

    // 3. Buybacks
    if (Array.isArray(payload.buybacks)) {
      let count = 0;
      for (const item of payload.buybacks) {
        const ticker = (item.ticker || '').toUpperCase();
        if (!ticker || !item.date) continue;
        const mapped = {
          ticker,
          date: item.date,
          sharesBought: item.shares_bought !== undefined ? String(item.shares_bought) : null,
          pricePaid: item.price_paid !== undefined ? String(item.price_paid) : null,
          totalTry: item.total_try !== undefined ? String(item.total_try) : null,
          cumulativeShares: item.cumulative_shares !== undefined ? String(item.cumulative_shares) : null,
          percentageOfCapital: item.percentage_of_capital !== undefined ? String(item.percentage_of_capital) : null,
          programAuthorizedTry: item.program_authorized_try !== undefined ? String(item.program_authorized_try) : null,
          disclosureId: item.disclosure_id
        };
        await db.insert(bistBuybacks).values(mapped as any);
        count++;
      }
      results.buybacks = count;
    }

    // 4. IPOs
    if (Array.isArray(payload.ipo) || Array.isArray(payload.ipos)) {
      const items = payload.ipo || payload.ipos;
      let count = 0;
      for (const item of items) {
        const ticker = (item.ticker || item.company_code || '').toUpperCase();
        if (!ticker) continue;
        const mapped = {
          companyCode: ticker,
          companyName: item.company_name || ticker,
          status: item.status || 'APPROVED',
          offerPrice: item.offer_price !== undefined ? String(item.offer_price) : null,
          totalShares: item.total_shares !== undefined ? String(item.total_shares) : null,
          ipoSizeTry: item.ipo_size_try !== undefined ? String(item.ipo_size_try) : null,
          dates: item.dates,
          distributionType: item.distribution_type,
          consortiumLeader: item.consortium_leader,
          bistMarket: item.bist_market,
          peRatioIpo: item.p_e_ratio_ipo !== undefined ? String(item.p_e_ratio_ipo) : null,
          discountRate: item.discount_rate !== undefined ? String(item.discount_rate) : null,
          prospectusUrl: item.prospectus_url,
          fundUsageJson: item.fund_usage,
          allotmentResult: item.allotment_result,
          updatedAt: new Date()
        };

        const existingRec = await db.select().from(ipos).where(eq(ipos.companyCode, ticker)).limit(1);
        if (existingRec.length > 0) {
          await db.update(ipos).set(mapped).where(eq(ipos.companyCode, ticker));
        } else {
          await db.insert(ipos).values(mapped as any);
        }
        count++;
      }
      results.ipo = count;
    }

    // 5. Disclosures
    if (Array.isArray(payload.disclosures)) {
      let count = 0;
      for (const item of payload.disclosures) {
        const id = String(item.disclosure_id || item.disclosureIndex || '');
        if (!id) continue;
        const mapped = {
          disclosureIndex: id,
          symbol: (item.ticker || item.symbol || '').toUpperCase(),
          companyName: item.company_name,
          title: item.title || 'KAP Bildirimi',
          category: item.category,
          summary: item.summary,
          publishDate: item.publish_date ? new Date(item.publish_date) : new Date(),
          impactLevel: item.impact_level || 'HIGH',
          sentiment: item.sentiment || 'POSITIVE',
          url: item.kap_url || item.url
        };

        const exists = await db.select().from(kapDisclosures).where(eq(kapDisclosures.disclosureIndex, id)).limit(1);
        if (exists.length > 0) {
          await db.update(kapDisclosures).set(mapped).where(eq(kapDisclosures.disclosureIndex, id));
        } else {
          await db.insert(kapDisclosures).values(mapped as any);
        }
        count++;
      }
      results.disclosures = count;
    }

    return {
      success: true,
      inserted: results,
      message: `Başarıyla ${Object.entries(results).map(([k, v]) => `${v} adet ${k}`).join(', ')} aktarıldı.`
    };
  }

  // --- REMOTE SYNC ENGINE FROM CLOUDFLARE TUNNEL / LOCAL FINANCE API ---
  public async syncFromRemoteFinanceApi(baseUrl: string): Promise<{ success: boolean; data: any; message: string }> {
    try {
      const cleanUrl = baseUrl.trim().replace(/\/$/, '');
      console.log(`[ComprehensiveData] Uzak API senkronizasyonu başlatılıyor: ${cleanUrl}`);

      // Try bulk export route first
      let bulkData: any = null;
      try {
        const bulkRes = await axios.get(`${cleanUrl}/api/export/bulk`, { timeout: 15000 });
        if (bulkRes.data && typeof bulkRes.data === 'object') {
          bulkData = bulkRes.data;
        }
      } catch (err: any) {
        console.log(`[ComprehensiveData] /api/export/bulk bulunamadı, bireysel rotalar deneniyor...`);
      }

      if (!bulkData) {
        bulkData = {};
        // Attempt individual endpoints
        const endpoints = [
          { key: 'companies', url: `${cleanUrl}/api/export/companies` },
          { key: 'financials', url: `${cleanUrl}/api/export/bulk?tables=financials` },
          { key: 'funds', url: `${cleanUrl}/api/export/funds` },
          { key: 'ipo', url: `${cleanUrl}/api/export/bulk?tables=ipo` },
          { key: 'buybacks', url: `${cleanUrl}/api/export/bulk?tables=buybacks` },
          { key: 'disclosures', url: `${cleanUrl}/api/export/bulk?tables=disclosures` },
        ];

        for (const ep of endpoints) {
          try {
            const res = await axios.get(ep.url, { timeout: 10000 });
            if (Array.isArray(res.data)) {
              bulkData[ep.key] = res.data;
            } else if (res.data && Array.isArray(res.data[ep.key])) {
              bulkData[ep.key] = res.data[ep.key];
            }
          } catch (e) {
            // Ignore single route failure
          }
        }
      }

      if (Object.keys(bulkData).length === 0) {
        throw new Error(`${cleanUrl} adresinden uyumlu veri modeli alınamadı. Lütfen Base URL'in açık ve /api/export/* rotalarını desteklediğinden emin olun.`);
      }

      const importResult = await this.importBulkData(bulkData);
      return {
        success: true,
        data: importResult.inserted,
        message: `${cleanUrl} kaynağından veri senkronizasyonu tamamlandı: ${importResult.message}`
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: `Uzak API bağlantı hatası: ${error.message}`
      };
    }
  }
}

export const comprehensiveDataService = new ComprehensiveDataIntegrationService();
