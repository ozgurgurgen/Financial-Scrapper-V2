import { db } from '../db/index.ts';
import { marketNews, cryptoNews, ipos, kapDisclosures, settings } from '../db/schema.ts';
import { desc, sql, eq, inArray } from 'drizzle-orm';
import { marketService } from './MarketService.ts';
import { cryptoService } from './CryptoService.ts';
import { kapCompanyService } from './KapCompanyService.ts';

export type NewsCategory = 'ALL' | 'BIST' | 'EKONOMI' | 'GLOBAL' | 'KRIPTO' | 'HALKA_ARZ';

export interface NewsRetentionSettings {
  maxTotalNews: number;
  categories: {
    BIST: number;
    EKONOMI: number;
    GLOBAL: number;
    KRIPTO: number;
    HALKA_ARZ: number;
  };
}

export const DEFAULT_NEWS_SETTINGS: NewsRetentionSettings = {
  maxTotalNews: 50,
  categories: {
    BIST: 50,
    EKONOMI: 50,
    GLOBAL: 50,
    KRIPTO: 50,
    HALKA_ARZ: 50,
  },
};

export interface UnifiedNewsItem {
  id: string;
  title: string;
  body: string;
  url: string;
  source: string;
  publishedOn: string;
  category: NewsCategory;
  sentiment: 'POZİTİF' | 'NÖTR' | 'NEGATİF';
  isIpo?: boolean;
  companyCode?: string;
}

export interface NewsQueryOptions {
  category?: string;
  sentiment?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface NewsSummary {
  total: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  positiveRatioPct: number;
  categoryCounts: {
    all: number;
    bist: number;
    ekonomi: number;
    global: number;
    crypto: number;
    halka_arz: number;
  };
  lastUpdated: string;
}

export class NewsAggregatorService {
  /**
   * KAP ve finans haber linklerini doğrula ve 404 hatalarını önle
   */
  public sanitizeUrl(rawUrl?: string | null, symbolOrCode?: string): string {
    if (!rawUrl || rawUrl.trim() === '' || rawUrl === '#' || rawUrl === 'https://www.kap.org.tr/tr/bist-sirketler') {
      if (symbolOrCode && symbolOrCode.length >= 2) {
        return kapCompanyService.getCompanyOrIpoUrl(symbolOrCode);
      }
      return 'https://halkarz.com/';
    }

    let url = rawUrl.trim();

    // 1. Yanlış /tr/sirketler/detay/ linklerini düzelt -> /tr/sirket-bilgileri/ozet/ veya direkt şirket/IPO linkine
    if (url.includes('kap.org.tr/tr/sirketler/detay/')) {
      const parts = url.split('kap.org.tr/tr/sirketler/detay/');
      if (parts[1]) {
        return kapCompanyService.getCompanyOrIpoUrl(parts[1].trim());
      }
      url = url.replace('kap.org.tr/tr/sirketler/detay/', 'kap.org.tr/tr/sirket-bilgileri/ozet/');
    }

    // 2. Eğer /tr/sirket-bilgileri/ozet/ arkasında sadece sembol varsa (örn: SARAE, BEWEN) ve slug içermiyorsa tam KAP/HalkArz linkine dönüştür
    if (url.includes('kap.org.tr/tr/sirket-bilgileri/ozet/')) {
      const match = url.match(/kap\.org\.tr\/tr\/sirket-bilgileri\/ozet\/([A-Za-z0-9]+)$/);
      if (match && match[1]) {
        return kapCompanyService.getCompanyOrIpoUrl(match[1]);
      }
    }

    // 3. Küçük harfli /tr/bildirim/ linklerini düzelt -> /tr/Bildirim/ (KAP'ta büyük B zorunludur)
    if (url.includes('kap.org.tr/tr/bildirim/')) {
      url = url.replace('kap.org.tr/tr/bildirim/', 'kap.org.tr/tr/Bildirim/');
    }

    // 4. Yanlış SPK bülten linklerini düzelt
    if (url.includes('spk.gov.tr/bultenler') || url.includes('spk.gov.tr/kurumsal/bultenler')) {
      url = 'https://spk.gov.tr/bulten';
    }

    return url;
  }

  /**
   * Determine the most fitting category for a news item based on content and metadata
   */
  private detectCategory(title: string, body: string, dbCategory?: string | null, source?: string): NewsCategory {
    const text = `${title} ${body} ${dbCategory || ''} ${source || ''}`.toLowerCase();

    // 1. Kripto check
    if (
      dbCategory?.toLowerCase() === 'crypto' ||
      text.includes('bitcoin') ||
      text.includes('btc') ||
      text.includes('ethereum') ||
      text.includes('kripto') ||
      text.includes('binance') ||
      text.includes('altcoin') ||
      text.includes('blockchain') ||
      text.includes('intotheblock') ||
      text.includes('coindesk')
    ) {
      return 'KRIPTO';
    }

    // 2. Halka Arz check
    if (
      text.includes('halka arz') ||
      text.includes('izahname') ||
      text.includes('spk bülteni') ||
      text.includes('spk onay') ||
      text.includes('talep toplama') ||
      text.includes('tavan serisi') ||
      text.includes('borsada işlem görmeye')
    ) {
      return 'HALKA_ARZ';
    }

    // 3. Global Markets check
    if (
      dbCategory === 'Global' ||
      text.includes('wall street') ||
      text.includes('fed ') ||
      text.includes('s&p 500') ||
      text.includes('nasdaq') ||
      text.includes('dow jones') ||
      text.includes('ecb ') ||
      text.includes('brent petrol') ||
      text.includes('küresel piyasa') ||
      text.includes('yahoo finance') ||
      text.includes('wsj')
    ) {
      return 'GLOBAL';
    }

    // 4. Türkiye Makro Ekonomi check
    if (
      text.includes('enflasyon') ||
      text.includes('tcmb') ||
      text.includes('faiz kararı') ||
      text.includes('tüik') ||
      text.includes('hazine') ||
      text.includes('orta vadeli program') ||
      text.includes('ovp') ||
      text.includes('cari açık') ||
      text.includes('bütçe açığı') ||
      text.includes('merkez bankası') ||
      text.includes('ihracat') ||
      text.includes('istihdam') ||
      text.includes('asgari ücret') ||
      text.includes('vergi')
    ) {
      return 'EKONOMI';
    }

    // 5. Default to BIST for Turkish market news
    return 'BIST';
  }

  private normalizeSentiment(sentiment?: string | null): 'POZİTİF' | 'NÖTR' | 'NEGATİF' {
    if (!sentiment) return 'NÖTR';
    const upper = sentiment.toUpperCase();
    if (upper.includes('POS') || upper.includes('POZ') || upper.includes('BULLISH')) return 'POZİTİF';
    if (upper.includes('NEG') || upper.includes('BEARISH')) return 'NEGATİF';
    return 'NÖTR';
  }

  /**
   * Reads user news settings from database or returns defaults
   */
  async getNewsSettings(): Promise<NewsRetentionSettings> {
    try {
      const rows = await db.select().from(settings).where(eq(settings.key, 'news_retention_settings')).limit(1);
      if (rows.length > 0 && rows[0].value) {
        const val = rows[0].value as any;
        return {
          maxTotalNews: Number(val.maxTotalNews) || DEFAULT_NEWS_SETTINGS.maxTotalNews,
          categories: {
            BIST: Number(val.categories?.BIST) || DEFAULT_NEWS_SETTINGS.categories.BIST,
            EKONOMI: Number(val.categories?.EKONOMI) || DEFAULT_NEWS_SETTINGS.categories.EKONOMI,
            GLOBAL: Number(val.categories?.GLOBAL) || DEFAULT_NEWS_SETTINGS.categories.GLOBAL,
            KRIPTO: Number(val.categories?.KRIPTO) || DEFAULT_NEWS_SETTINGS.categories.KRIPTO,
            HALKA_ARZ: Number(val.categories?.HALKA_ARZ) || DEFAULT_NEWS_SETTINGS.categories.HALKA_ARZ,
          },
        };
      }
    } catch (e) {
      console.warn('[NewsAggregatorService] Failed to read settings, using defaults:', e);
    }
    return DEFAULT_NEWS_SETTINGS;
  }

  /**
   * Saves updated retention and category limits to settings and triggers automatic pruning
   */
  async saveNewsSettings(newSettings: Partial<NewsRetentionSettings>): Promise<NewsRetentionSettings> {
    const current = await this.getNewsSettings();
    const updated: NewsRetentionSettings = {
      maxTotalNews: Math.max(5, Math.min(500, Number(newSettings.maxTotalNews) || current.maxTotalNews)),
      categories: {
        BIST: Math.max(5, Math.min(500, Number(newSettings.categories?.BIST) || current.categories.BIST)),
        EKONOMI: Math.max(5, Math.min(500, Number(newSettings.categories?.EKONOMI) || current.categories.EKONOMI)),
        GLOBAL: Math.max(5, Math.min(500, Number(newSettings.categories?.GLOBAL) || current.categories.GLOBAL)),
        KRIPTO: Math.max(5, Math.min(500, Number(newSettings.categories?.KRIPTO) || current.categories.KRIPTO)),
        HALKA_ARZ: Math.max(5, Math.min(500, Number(newSettings.categories?.HALKA_ARZ) || current.categories.HALKA_ARZ)),
      },
    };

    await db
      .insert(settings)
      .values({
        key: 'news_retention_settings',
        value: updated,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: updated,
          updatedAt: new Date(),
        },
      });

    // Prune excess news immediately when settings change
    await this.pruneExcessNews(updated);

    return updated;
  }

  /**
   * Automatically deletes older news whenever new ones arrive or limit is exceeded (FIFO - En eski olanlar silinir)
   */
  async pruneExcessNews(customSettings?: NewsRetentionSettings): Promise<{ prunedCount: number }> {
    try {
      const cfg = customSettings || (await this.getNewsSettings());
      let prunedCount = 0;

      // 1. Prune marketNews for BIST category
      const bistLimit = cfg.categories.BIST || 50;
      const excessBist = await db
        .select({ id: marketNews.id })
        .from(marketNews)
        .where(eq(marketNews.categories, 'BIST'))
        .orderBy(desc(marketNews.publishedOn))
        .offset(bistLimit);

      if (excessBist.length > 0) {
        const idsToDelete = excessBist.map((r) => r.id);
        await db.delete(marketNews).where(inArray(marketNews.id, idsToDelete));
        prunedCount += idsToDelete.length;
      }

      // 2. Prune marketNews for Global category
      const globalLimit = cfg.categories.GLOBAL || 50;
      const excessGlobal = await db
        .select({ id: marketNews.id })
        .from(marketNews)
        .where(eq(marketNews.categories, 'Global'))
        .orderBy(desc(marketNews.publishedOn))
        .offset(globalLimit);

      if (excessGlobal.length > 0) {
        const idsToDelete = excessGlobal.map((r) => r.id);
        await db.delete(marketNews).where(inArray(marketNews.id, idsToDelete));
        prunedCount += idsToDelete.length;
      }

      // 3. Prune cryptoNews for Kripto category
      const cryptoLimit = cfg.categories.KRIPTO || 50;
      const excessCrypto = await db
        .select({ id: cryptoNews.id })
        .from(cryptoNews)
        .orderBy(desc(cryptoNews.publishedOn))
        .offset(cryptoLimit);

      if (excessCrypto.length > 0) {
        const idsToDelete = excessCrypto.map((r) => r.id);
        await db.delete(cryptoNews).where(inArray(cryptoNews.id, idsToDelete));
        prunedCount += idsToDelete.length;
      }

      // 4. Prune kapDisclosures (e.g. keep max 60 most recent)
      const kapLimit = Math.max(cfg.categories.BIST, cfg.categories.HALKA_ARZ, 50);
      const excessKap = await db
        .select({ id: kapDisclosures.id })
        .from(kapDisclosures)
        .orderBy(desc(kapDisclosures.publishDate))
        .offset(kapLimit);

      if (excessKap.length > 0) {
        const idsToDelete = excessKap.map((r) => r.id);
        await db.delete(kapDisclosures).where(inArray(kapDisclosures.id, idsToDelete));
        prunedCount += idsToDelete.length;
      }

      return { prunedCount };
    } catch (err) {
      console.error('[NewsAggregatorService] Error during news pruning:', err);
      return { prunedCount: 0 };
    }
  }

  /**
   * Fetch all news from database, merge, categorize and filter
   */
  async getAggregatedNews(options: NewsQueryOptions = {}): Promise<{
    items: UnifiedNewsItem[];
    summary: NewsSummary;
    settings: NewsRetentionSettings;
  }> {
    const currentSettings = await this.getNewsSettings();
    const effectiveLimit = options.limit ? Math.min(options.limit, currentSettings.maxTotalNews) : currentSettings.maxTotalNews;

    // 1. Fetch from marketNews
    const mRows = await db
      .select()
      .from(marketNews)
      .orderBy(desc(marketNews.publishedOn))
      .limit(Math.max(currentSettings.categories.BIST, currentSettings.categories.GLOBAL, 50));

    // 2. Fetch from cryptoNews
    const cRows = await db
      .select()
      .from(cryptoNews)
      .orderBy(desc(cryptoNews.publishedOn))
      .limit(currentSettings.categories.KRIPTO || 50);

    // 3. Fetch from kapDisclosures
    const kRows = await db
      .select()
      .from(kapDisclosures)
      .orderBy(desc(kapDisclosures.publishDate))
      .limit(Math.max(currentSettings.categories.BIST, currentSettings.categories.HALKA_ARZ, 50));

    // 4. Fetch recent IPO events to weave in as IPO news
    const ipoRows = await db
      .select()
      .from(ipos)
      .orderBy(desc(ipos.createdAt))
      .limit(Math.min(currentSettings.categories.HALKA_ARZ, 20));

    const merged: UnifiedNewsItem[] = [];

    // Map Market News
    for (const row of mRows) {
      const cat = this.detectCategory(row.title, row.body || '', row.categories, row.source);
      merged.push({
        id: `m-${row.id}`,
        title: row.title,
        body: row.body || '',
        url: this.sanitizeUrl(row.url),
        source: row.source || 'Piyasa Gündemi',
        publishedOn: (row.publishedOn || new Date()).toISOString(),
        category: cat,
        sentiment: this.normalizeSentiment(row.sentiment),
      });
    }

    // Map KAP Disclosures (Resmi Kamuyu Aydınlatma Bildirimleri)
    for (const row of kRows) {
      const cat = this.detectCategory(row.title, row.summary || row.fullText || '', row.category, 'KAP');
      const validKapUrl = row.disclosureIndex
        ? `https://www.kap.org.tr/tr/Bildirim/${row.disclosureIndex}`
        : this.sanitizeUrl(row.url, row.symbol || undefined);

      merged.push({
        id: `kap-${row.id}`,
        title: `${row.symbol ? `[${row.symbol}] ` : ''}${row.title}`,
        body: row.summary || (row.fullText ? row.fullText.substring(0, 300) + '...' : 'KAP Bildirimi detayları için tıklayınız.'),
        url: validKapUrl,
        source: row.symbol ? `KAP (${row.symbol})` : 'Kamuyu Aydınlatma Platformu (KAP)',
        publishedOn: (row.publishDate || row.createdAt || new Date()).toISOString(),
        category: cat,
        sentiment: this.normalizeSentiment(row.summary),
        companyCode: row.symbol || undefined,
      });
    }

    // Map Crypto News
    for (const row of cRows) {
      merged.push({
        id: `c-${row.id}`,
        title: row.title,
        body: row.body || '',
        url: this.sanitizeUrl(row.url || 'https://cryptocompare.com/news'),
        source: row.source || 'Kripto Ajansı',
        publishedOn: (row.publishedOn || new Date()).toISOString(),
        category: 'KRIPTO',
        sentiment: this.normalizeSentiment(row.sentiment),
      });
    }

    // Map Recent IPO events as fresh IPO news
    for (const ipo of ipoRows) {
      const statusTr =
        ipo.status === 'LISTED'
          ? 'Borsada İşlem Görmeye Başladı'
          : ipo.status === 'BOOK_BUILDING'
          ? 'Talep Toplama Sürecinde'
          : ipo.status === 'APPROVED'
          ? 'SPK Onayı Aldı'
          : 'Taslak İzahname Yayınlandı';

      const tavanInfo = ipo.ceilingStreak && ipo.ceilingStreak > 0
        ? ` Hisse şu anda ${ipo.ceilingStreak}. gün tavan serisinde işlem görüyor.`
        : ipo.brokeCeiling && ipo.breakDate
        ? ` Tavan serisi ${ipo.breakDate} tarihinde sonlandı.`
        : '';

      const validIpoUrl = kapCompanyService.getKapCompanyUrl(ipo.companyCode);

      merged.push({
        id: `ipo-${ipo.id}`,
        title: `${ipo.companyCode} (${ipo.companyName}) ${statusTr}`,
        body: `${ipo.companyName} halka arzında ${ipo.price} arz fiyatı ve ${ipo.lotSize || ''} büyüklük belirlendi.${tavanInfo} ${ipo.aiSummary ? ipo.aiSummary.substring(0, 180) + '...' : ''}`,
        url: validIpoUrl,
        source: 'SPK & KAP Halka Arz Bülteni',
        publishedOn: (ipo.createdAt || new Date()).toISOString(),
        category: 'HALKA_ARZ',
        sentiment: ipo.sentiment === 'BULLISH' || (ipo.ceilingStreak || 0) > 0 ? 'POZİTİF' : 'NÖTR',
        isIpo: true,
        companyCode: ipo.companyCode,
      });
    }

    // Sort by publishedOn descending
    merged.sort((a, b) => new Date(b.publishedOn).getTime() - new Date(a.publishedOn).getTime());

    // Calculate Summary counts across all items before filtering
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    const catCounts = {
      all: merged.length,
      bist: 0,
      ekonomi: 0,
      global: 0,
      crypto: 0,
      halka_arz: 0,
    };

    for (const item of merged) {
      if (item.sentiment === 'POZİTİF') positiveCount++;
      else if (item.sentiment === 'NEGATİF') negativeCount++;
      else neutralCount++;

      if (item.category === 'BIST') catCounts.bist++;
      else if (item.category === 'EKONOMI') catCounts.ekonomi++;
      else if (item.category === 'GLOBAL') catCounts.global++;
      else if (item.category === 'KRIPTO') catCounts.crypto++;
      else if (item.category === 'HALKA_ARZ') catCounts.halka_arz++;
    }

    const positiveRatioPct = merged.length > 0 ? Math.round((positiveCount / merged.length) * 100) : 50;

    // Apply filters
    let filtered = merged;

    // Category filter
    if (options.category && options.category.toUpperCase() !== 'ALL') {
      const catUpper = options.category.toUpperCase();
      filtered = filtered.filter((i) => i.category === catUpper);
    }

    // Sentiment filter
    if (options.sentiment && options.sentiment.toUpperCase() !== 'ALL') {
      const sentUpper = options.sentiment.toUpperCase();
      filtered = filtered.filter((i) => i.sentiment === sentUpper);
    }

    // Search query filter
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.body.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q) ||
          (i.companyCode && i.companyCode.toLowerCase().includes(q))
      );
    }

    // Limit items to effectiveLimit (default max 50 or configured value)
    const paginatedItems = filtered.slice(0, effectiveLimit);

    return {
      items: paginatedItems,
      summary: {
        total: merged.length,
        positiveCount,
        neutralCount,
        negativeCount,
        positiveRatioPct,
        categoryCounts: catCounts,
        lastUpdated: new Date().toISOString(),
      },
      settings: currentSettings,
    };
  }

  /**
   * Force refresh news feeds across all sources and auto-prune oldest items
   */
  async refreshAllNews(): Promise<{ updatedCount: number; prunedCount: number; message: string }> {
    try {
      const [bistNews, globalNews, cryptoNewsRes] = await Promise.allSettled([
        marketService.getBistNews(true),
        marketService.getGlobalNews(true),
        cryptoService.getNews(true),
      ]);

      const bistCount = bistNews.status === 'fulfilled' ? bistNews.value?.length || 0 : 0;
      const globalCount = globalNews.status === 'fulfilled' ? globalNews.value?.length || 0 : 0;
      const cryptoCount = cryptoNewsRes.status === 'fulfilled' ? cryptoNewsRes.value?.length || 0 : 0;

      const totalFetched = bistCount + globalCount + cryptoCount;

      // Auto prune oldest news when new items arrive
      const pruneRes = await this.pruneExcessNews();

      return {
        updatedCount: totalFetched,
        prunedCount: pruneRes.prunedCount,
        message: `Haberler güncellendi: ${bistCount} BIST/Ekonomi, ${globalCount} Küresel Piyasa, ${cryptoCount} Kripto haberi. ${pruneRes.prunedCount > 0 ? `(${pruneRes.prunedCount} eski haber arşivlendi/temizlendi)` : ''}`,
      };
    } catch (e: any) {
      console.error('[NewsAggregatorService] Refresh error:', e);
      return {
        updatedCount: 0,
        prunedCount: 0,
        message: `Güncelleme sırasında hata: ${e.message || 'Bilinmeyen hata'}`,
      };
    }
  }
}

export const newsAggregatorService = new NewsAggregatorService();
