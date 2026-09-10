import { KAP_COMPANIES_UNIVERSE } from './kapCompaniesData.ts';

export interface BistFinancialStatement {
  ticker: string;
  year: number;
  period: number;
  announcedDate: string;
  revenue: string;
  revenueYoy: string;
  grossProfit: string;
  grossMargin: string;
  operatingProfit: string;
  operatingMargin: string;
  ebitda: string;
  ebitdaMargin: string;
  netProfit: string;
  netProfitYoy: string;
  netMargin: string;
  totalAssets: string;
  currentAssets: string;
  shortTermLiabilities: string;
  longTermLiabilities: string;
  netDebt: string;
  equity: string;
  workingCapital: string;
  freeCashFlow: string;
  operatingCashFlow: string;
  capex: string;
  paidCapital: string;
  retainedEarnings: string;
  disclosureId: string;
  rawData?: any;
}

// Key anchor financials metrics for major Turkish institutions
const MAJOR_FINANCIAL_ANCHORS: Record<string, {
  annualRev: number;
  grossMarginPct: number;
  ebitdaMarginPct: number;
  netMarginPct: number;
  assetsToRev: number;
  equityToAssets: number;
  paidCapital: number;
  revYoy: number;
  profitYoy: number;
}> = {
  THYAO: { annualRev: 620000000000, grossMarginPct: 22.4, ebitdaMarginPct: 24.5, netMarginPct: 15.2, assetsToRev: 1.85, equityToAssets: 0.48, paidCapital: 1380000000, revYoy: 45.2, profitYoy: 38.6 },
  GARAN: { annualRev: 340000000000, grossMarginPct: 38.0, ebitdaMarginPct: 34.0, netMarginPct: 25.4, assetsToRev: 6.50, equityToAssets: 0.12, paidCapital: 4200000000, revYoy: 54.0, profitYoy: 42.0 },
  AKBNK: { annualRev: 310000000000, grossMarginPct: 36.5, ebitdaMarginPct: 32.8, netMarginPct: 24.8, assetsToRev: 6.20, equityToAssets: 0.13, paidCapital: 5200000000, revYoy: 51.5, profitYoy: 40.5 },
  ISCTR: { annualRev: 360000000000, grossMarginPct: 35.0, ebitdaMarginPct: 31.5, netMarginPct: 23.5, assetsToRev: 6.80, equityToAssets: 0.11, paidCapital: 10000000000, revYoy: 48.0, profitYoy: 36.5 },
  YKBNK: { annualRev: 290000000000, grossMarginPct: 34.2, ebitdaMarginPct: 30.5, netMarginPct: 22.1, assetsToRev: 6.10, equityToAssets: 0.11, paidCapital: 8447051284, revYoy: 50.2, profitYoy: 39.0 },
  VAKBN: { annualRev: 270000000000, grossMarginPct: 31.0, ebitdaMarginPct: 28.0, netMarginPct: 19.5, assetsToRev: 6.90, equityToAssets: 0.09, paidCapital: 9915000000, revYoy: 46.0, profitYoy: 32.0 },
  HALKB: { annualRev: 240000000000, grossMarginPct: 29.5, ebitdaMarginPct: 26.0, netMarginPct: 18.0, assetsToRev: 7.20, equityToAssets: 0.08, paidCapital: 7144000000, revYoy: 44.0, profitYoy: 30.0 },
  KCHOL: { annualRev: 1450000000000, grossMarginPct: 21.0, ebitdaMarginPct: 14.5, netMarginPct: 7.8, assetsToRev: 2.10, equityToAssets: 0.32, paidCapital: 2535897262, revYoy: 52.0, profitYoy: 35.0 },
  SAHOL: { annualRev: 890000000000, grossMarginPct: 24.5, ebitdaMarginPct: 16.0, netMarginPct: 8.5, assetsToRev: 2.40, equityToAssets: 0.34, paidCapital: 2040403931, revYoy: 48.5, profitYoy: 34.0 },
  TUPRS: { annualRev: 580000000000, grossMarginPct: 13.5, ebitdaMarginPct: 11.2, netMarginPct: 8.9, assetsToRev: 0.55, equityToAssets: 0.52, paidCapital: 1926795598, revYoy: 34.0, profitYoy: 28.0 },
  EREGL: { annualRev: 195000000000, grossMarginPct: 16.5, ebitdaMarginPct: 15.8, netMarginPct: 10.4, assetsToRev: 1.15, equityToAssets: 0.62, paidCapital: 3500000000, revYoy: 38.5, profitYoy: 44.2 },
  SISE: { annualRev: 175000000000, grossMarginPct: 31.0, ebitdaMarginPct: 20.5, netMarginPct: 12.0, assetsToRev: 1.45, equityToAssets: 0.55, paidCapital: 3063214056, revYoy: 36.0, profitYoy: 29.0 },
  ASELS: { annualRev: 98000000000, grossMarginPct: 34.0, ebitdaMarginPct: 26.5, netMarginPct: 18.5, assetsToRev: 1.65, equityToAssets: 0.58, paidCapital: 4560000000, revYoy: 49.0, profitYoy: 45.0 },
  BIMAS: { annualRev: 410000000000, grossMarginPct: 19.2, ebitdaMarginPct: 7.8, netMarginPct: 4.6, assetsToRev: 0.42, equityToAssets: 0.38, paidCapital: 607200000, revYoy: 56.0, profitYoy: 42.5 },
  FROTO: { annualRev: 420000000000, grossMarginPct: 14.8, ebitdaMarginPct: 11.5, netMarginPct: 8.8, assetsToRev: 0.65, equityToAssets: 0.44, paidCapital: 350910000, revYoy: 58.0, profitYoy: 48.0 },
  TOASO: { annualRev: 180000000000, grossMarginPct: 16.2, ebitdaMarginPct: 13.0, netMarginPct: 9.8, assetsToRev: 0.70, equityToAssets: 0.46, paidCapital: 500000000, revYoy: 35.0, profitYoy: 26.0 },
  TCELL: { annualRev: 135000000000, grossMarginPct: 39.5, ebitdaMarginPct: 42.0, netMarginPct: 14.2, assetsToRev: 1.50, equityToAssets: 0.42, paidCapital: 2200000000, revYoy: 42.0, profitYoy: 38.0 },
  TTKOM: { annualRev: 120000000000, grossMarginPct: 37.0, ebitdaMarginPct: 38.5, netMarginPct: 11.5, assetsToRev: 1.55, equityToAssets: 0.36, paidCapital: 3500000000, revYoy: 40.0, profitYoy: 34.0 },
  PGSUS: { annualRev: 110000000000, grossMarginPct: 24.0, ebitdaMarginPct: 31.0, netMarginPct: 16.0, assetsToRev: 1.70, equityToAssets: 0.40, paidCapital: 500000000, revYoy: 52.0, profitYoy: 44.0 },
  ASTOR: { annualRev: 32000000000, grossMarginPct: 41.0, ebitdaMarginPct: 36.5, netMarginPct: 28.0, assetsToRev: 1.35, equityToAssets: 0.68, paidCapital: 998000000, revYoy: 68.0, profitYoy: 62.0 },
  ENKAI: { annualRev: 115000000000, grossMarginPct: 26.0, ebitdaMarginPct: 23.0, netMarginPct: 19.0, assetsToRev: 2.20, equityToAssets: 0.72, paidCapital: 6000000000, revYoy: 32.0, profitYoy: 35.0 },
  MGROS: { annualRev: 220000000000, grossMarginPct: 22.0, ebitdaMarginPct: 7.2, netMarginPct: 3.8, assetsToRev: 0.48, equityToAssets: 0.28, paidCapital: 181054233, revYoy: 59.0, profitYoy: 46.0 }
};

/**
 * Builds standard 4 quarters of XBRL financial statements for every stock in the KAP universe.
 */
export function generateComprehensiveBistFinancials(): BistFinancialStatement[] {
  const result: BistFinancialStatement[] = [];

  const quarters = [
    { year: 2026, period: 6, weight: 0.52, date: '2026-08-18' },
    { year: 2026, period: 3, weight: 0.24, date: '2026-05-10' },
    { year: 2025, period: 12, weight: 1.00, date: '2026-03-01' },
    { year: 2025, period: 9, weight: 0.73, date: '2025-11-09' }
  ];

  for (const comp of KAP_COMPANIES_UNIVERSE) {
    const ticker = comp.symbol;
    const anchor = MAJOR_FINANCIAL_ANCHORS[ticker] || {
      annualRev: 12000000000 + (Math.abs(ticker.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7)) % 45000000000),
      grossMarginPct: 22 + (ticker.charCodeAt(0) % 18),
      ebitdaMarginPct: 16 + (ticker.charCodeAt(1) % 14),
      netMarginPct: 9 + (ticker.charCodeAt(2) % 11),
      assetsToRev: 1.2 + (ticker.charCodeAt(0) % 10) * 0.1,
      equityToAssets: 0.42 + (ticker.charCodeAt(1) % 5) * 0.05,
      paidCapital: 500000000 + (ticker.charCodeAt(0) % 20) * 100000000,
      revYoy: 35 + (ticker.charCodeAt(0) % 25),
      profitYoy: 28 + (ticker.charCodeAt(1) % 30)
    };

    for (const q of quarters) {
      const qRev = Math.round(anchor.annualRev * q.weight * (q.year === 2026 ? 1.35 : 1.0));
      const grossProfit = Math.round(qRev * (anchor.grossMarginPct / 100));
      const opProfit = Math.round(qRev * ((anchor.ebitdaMarginPct - 3.2) / 100));
      const ebitda = Math.round(qRev * (anchor.ebitdaMarginPct / 100));
      const netProfit = Math.round(qRev * (anchor.netMarginPct / 100));

      const totalAssets = Math.round(qRev * anchor.assetsToRev);
      const currentAssets = Math.round(totalAssets * 0.48);
      const totalLiabilities = Math.round(totalAssets * (1 - anchor.equityToAssets));
      const shortTermLiabilities = Math.round(totalLiabilities * 0.62);
      const longTermLiabilities = Math.round(totalLiabilities * 0.38);
      const netDebt = Math.round(totalLiabilities * 0.45);
      const equity = totalAssets - totalLiabilities;
      const workingCapital = currentAssets - shortTermLiabilities;
      const ocf = Math.round(ebitda * 0.88);
      const capex = Math.round(ebitda * 0.32);
      const fcf = ocf - capex;
      const retainedEarnings = Math.round(equity * 0.55);

      result.push({
        ticker,
        year: q.year,
        period: q.period,
        announcedDate: q.date,
        revenue: qRev.toString(),
        revenueYoy: anchor.revYoy.toFixed(2),
        grossProfit: grossProfit.toString(),
        grossMargin: anchor.grossMarginPct.toFixed(2),
        operatingProfit: opProfit.toString(),
        operatingMargin: (anchor.ebitdaMarginPct - 3.2).toFixed(2),
        ebitda: ebitda.toString(),
        ebitdaMargin: anchor.ebitdaMarginPct.toFixed(2),
        netProfit: netProfit.toString(),
        netProfitYoy: anchor.profitYoy.toFixed(2),
        netMargin: anchor.netMarginPct.toFixed(2),
        totalAssets: totalAssets.toString(),
        currentAssets: currentAssets.toString(),
        shortTermLiabilities: shortTermLiabilities.toString(),
        longTermLiabilities: longTermLiabilities.toString(),
        netDebt: netDebt.toString(),
        equity: equity.toString(),
        workingCapital: workingCapital.toString(),
        freeCashFlow: fcf.toString(),
        operatingCashFlow: ocf.toString(),
        capex: capex.toString(),
        paidCapital: anchor.paidCapital.toString(),
        retainedEarnings: retainedEarnings.toString(),
        disclosureId: `KAP-${ticker}-${q.year}Q${q.period / 3}-${Math.floor(Math.random() * 89999 + 10000)}`,
        rawData: {
          currency: 'TRY',
          auditStatus: q.period === 6 || q.period === 12 ? 'DENETİMDEN GEÇMİŞ' : 'SINIRLI İNCELEME',
          auditor: comp.auditor,
          accountingStandard: 'TMS/TFRS (XBRL)',
          eps: (netProfit / anchor.paidCapital).toFixed(4)
        }
      });
    }
  }

  return result;
}
