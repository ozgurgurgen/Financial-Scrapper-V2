import axios from 'axios';
import * as cheerio from 'cheerio';

// Pre-cached map of standard major and active BIST tickers to KAP member slugs
const INITIAL_KAP_SLUGS: Record<string, string> = {
  SARAE: '6246-sa-ra-enerji-insaat-ticaret-ve-sanayi-a-s',
  DURKN: '6023-durukan-sekerleme-sanayi-ve-ticaret-a-s',
  INTET: '6280-intetra-teknoloji-ve-bilisim-hizmetleri-a-s',
  THYAO: '1107-turk-hava-yollari-a-o',
  ASELS: '866-aselsan-elektronik-sanayi-ve-ticaret-a-s',
  BIMAS: '1406-bim-birlesik-magazalar-a-s',
  TUPRS: '1105-tupras-turkiye-petrol-rafinerileri-a-s',
  KCHOL: '1004-koc-holding-a-s',
  SAHOL: '1063-haci-omer-sabanci-holding-a-s',
  SISE: '1116-turkiye-sise-ve-cam-fabrikalari-a-s',
  AKBNK: '835-akbank-t-a-s',
  GARAN: '1118-turkiye-garanti-bankasi-a-s',
  ISCTR: '1119-turkiye-is-bankasi-a-s',
  YKBNK: '1134-yapi-ve-kredi-bankasi-a-s',
  EREGL: '942-eregli-demir-ve-celik-fabrikalari-t-a-s',
  FROTO: '951-ford-otomotiv-sanayi-a-s',
  TOASO: '1099-tofas-turk-otomobil-fabrikasi-a-s',
  PETKM: '1051-petkim-petrokimya-holding-a-s',
  PGSUS: '1589-pegasus-hava-tasimaciligi-a-s',
  TCELL: '1110-turkcell-iletisim-hizmetleri-a-s',
  TTKOM: '1398-turk-telekomunikasyon-a-s',
  ENKAI: '939-enka-insaat-ve-sanayi-a-s',
  HEKTS: '969-hektas-ticaret-t-a-s',
  KONTR: '4776-kontrolmatik-teknoloji-enerji-ve-muhendislik-a-s',
  SASA: '1068-sasa-polyester-sanayi-a-s',
  GUBRF: '961-gubre-fabrikalari-t-a-s',
  ASTOR: '5254-astor-enerji-a-s',
  EUPWR: '5356-euro-power-enerji-ve-otomasyon-teknolojileri-sanayi-ticaret-a-s',
  CWENE: '5360-cw-enerji-muhendislik-ticaret-ve-sanayi-a-s',
  ALARK: '840-alarko-holding-a-s',
  EKGYO: '1446-emlak-konut-gayrimenkul-yatirim-ortakligi-a-s',
  KOZAL: '1431-koza-altin-isletmeleri-a-s',
  KOZAA: '1008-koza-anadolu-metal-madencilik-isletmeleri-a-s',
  MGROS: '1029-migros-ticaret-a-s',
  SOKM: '1737-sok-marketler-ticaret-a-s',
  ARCLK: '858-arcelik-a-s',
  VESTL: '1129-vestel-elektronik-sanayi-ve-ticaret-a-s',
  CIMSA: '907-cimsa-cimento-sanayi-ve-ticaret-a-s',
  OYAKC: '1046-oyak-cimento-fabrikalari-a-s',
  TABGD: '5577-tab-gida-sanayi-ve-ticaret-a-s',
  BINHO: '5602-1000-yatirimlar-holding-a-s',
  AGROT: '5611-agrotech-yuksek-teknoloji-ve-yatirim-a-s',
  REEDR: '5543-reeder-teknoloji-sanayi-ve-ticaret-a-s',
  OBAMS: '5719-oba-makarnacilik-sanayi-ve-ticaret-a-s',
  MHRGY: '5570-mhr-gayrimenkul-yatirim-ortakligi-a-s',
  SURGY: '5631-sur-tatil-evleri-gayrimenkul-yatirim-ortakligi-a-s',
  MEKAG: '5557-meka-beton-santralleri-imalat-sanayi-ve-ticaret-a-s',
  DOFER: '5561-dofer-yapi-malzemeleri-sanayi-ve-ticaret-a-s',
  GIPTA: '5529-gipta-ofis-kirtasiye-ve-promosyon-urunleri-imalat-sanayi-a-s',
  TARKM: '5532-tarkim-bitki-koruma-sanayi-ve-ticaret-a-s',
  KLYSN: '5501-kale-seramik-canakkale-kalebodur-seramik-sanayi-a-s',
  ATAKP: '5492-atakey-patates-gida-sanayi-ve-ticaret-a-s',
  FORTE: '5426-forte-bilgi-iletisim-teknolojileri-ve-savunma-sanayi-a-s',
  PASEU: '5423-pasifik-eurasia-lojistik-dis-ticaret-a-s',
  KATMR: '1448-katmerciler-arac-ustu-ekipman-sanayi-ve-ticaret-a-s',
};

// Known direct HalkArz IPO company pages
const INITIAL_IPO_URLS: Record<string, string> = {
  BEWEN: 'https://halkarz.com/bewen-enerji-a-s/',
  NETGL: 'https://halkarz.com/net-global-endustriyel-yatirimlar-a-s/',
  BKRGY: 'https://halkarz.com/bakirci-gayrimenkul-yatirim-ortakligi-a-s/',
  VEYAS: 'https://halkarz.com/turker-vangolu-enerji-yatirim-a-s/',
  KPEKS: 'https://halkarz.com/kapeks-kimya-sanayi-a-s/',
  TKNKA: 'https://halkarz.com/teknika-plast-teknik-kalip-plastik-san-ve-tic-a-s/',
  CITAS: 'https://halkarz.com/citlekci-magazacilik-gida-a-s/',
  QUICK: 'https://halkarz.com/quick-sigorta-a-s/',
  KARCL: 'https://halkarz.com/kardemir-celik-sanayi-a-s/',
  MASFN: 'https://halkarz.com/masfen-enerji-a-s/',
  ALBTN: 'https://halkarz.com/albayrak-hazir-beton-san-ve-tic-a-s/',
  METEN: 'https://halkarz.com/metgun-enerji-yatirimlari-a-s/',
  SSAAT: 'https://halkarz.com/saat-ve-saat-san-ve-tic-a-s/',
  SARAE: 'https://halkarz.com/sa-ra-enerji-insaat-tic-ve-san-a-s/',
  INTET: 'https://halkarz.com/intetra-teknoloji-ve-bilisim-hizmetleri-a-s/',
};

class KapCompanyService {
  private tickerToSlugMap: Map<string, string> = new Map(Object.entries(INITIAL_KAP_SLUGS));
  private ipoUrlMap: Map<string, string> = new Map(Object.entries(INITIAL_IPO_URLS));
  private lastFetchTime: number = 0;
  private isFetching: boolean = false;

  constructor() {
    // Initial async sync in background
    this.refreshMappingFromKAP().catch((e) => {
      console.warn('[KapCompanyService] Initial background sync failed, using static map:', e.message);
    });
  }

  /**
   * Registers or updates a known IPO URL dynamically
   */
  registerIpoUrl(code: string, url: string) {
    if (code && url) {
      this.ipoUrlMap.set(code.trim().toUpperCase(), url.trim());
    }
  }

  /**
   * Returns known direct HalkArz URL if available
   */
  getIpoUrl(code: string): string | undefined {
    return this.ipoUrlMap.get(code.trim().toUpperCase());
  }

  /**
   * Fetches latest BIST companies directory from KAP to map all tickers and company names to their slug URLs
   */
  async refreshMappingFromKAP(): Promise<number> {
    if (this.isFetching) return this.tickerToSlugMap.size;
    this.isFetching = true;

    try {
      const res = await axios.get('https://www.kap.org.tr/tr/bist-sirketler', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(res.data);
      let count = 0;

      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('/sirket-bilgileri/ozet/')) {
          const text = $(el).text().trim().toUpperCase();
          const slug = href.replace('/tr/sirket-bilgileri/ozet/', '').trim();
          if (text && slug && slug.length > 3) {
            this.tickerToSlugMap.set(text, slug);
            count++;
          }
        }
      });

      this.lastFetchTime = Date.now();
      console.log(`[KapCompanyService] Synced ${this.tickerToSlugMap.size} KAP company slugs (new parsed: ${count})`);
      return this.tickerToSlugMap.size;
    } catch (err: any) {
      console.warn('[KapCompanyService] KAP mapping refresh error:', err.message);
      return this.tickerToSlugMap.size;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Checks whether a ticker or company code exists in the active KAP BIST slug directory
   */
  hasSlug(tickerOrCode?: string | null): boolean {
    if (!tickerOrCode) return false;
    const clean = tickerOrCode.trim().toUpperCase();
    return this.tickerToSlugMap.has(clean);
  }

  /**
   * Returns exact, verified KAP company URL for a given ticker or code.
   * e.g., 'SARAE' -> 'https://www.kap.org.tr/tr/sirket-bilgileri/ozet/6246-sa-ra-enerji-insaat-ticaret-ve-sanayi-a-s'
   * If not listed on BIST / KAP (e.g. BEWEN in SPK approval / draft stage), returns its specific HalkArz page.
   */
  getKapCompanyUrl(tickerOrCode?: string | null, fallbackUrl?: string): string {
    if (!tickerOrCode || tickerOrCode.trim() === '') {
      return fallbackUrl || 'https://halkarz.com/';
    }

    const clean = tickerOrCode.trim().toUpperCase();

    // 1. If it's already a full valid URL
    if (clean.startsWith('HTTP://') || clean.startsWith('HTTPS://')) {
      return tickerOrCode;
    }

    // 2. Check if we have a direct slug mapping on KAP
    const slug = this.tickerToSlugMap.get(clean);
    if (slug) {
      return `https://www.kap.org.tr/tr/sirket-bilgileri/ozet/${slug}`;
    }

    // 3. If explicit fallback provided, use it
    if (fallbackUrl) {
      return fallbackUrl;
    }

    // 4. Check known direct HalkArz IPO company page (e.g. BEWEN -> https://halkarz.com/bewen-enerji-a-s/)
    const ipoUrl = this.ipoUrlMap.get(clean);
    if (ipoUrl) {
      return ipoUrl;
    }

    // 5. Fallback for unlisted IPO companies to direct HalkArz company search
    return `https://halkarz.com/?s=${encodeURIComponent(clean)}`;
  }

  /**
   * Returns exact company or IPO profile URL:
   * 1. If listed on KAP -> KAP profile
   * 2. If IPO -> Direct HalkArz company profile
   * 3. Fallback -> HalkArz search
   */
  getCompanyOrIpoUrl(tickerOrCode?: string | null): string {
    return this.getKapCompanyUrl(tickerOrCode);
  }

  /**
   * Helper to get slug directly
   */
  getSlug(ticker: string): string | undefined {
    return this.tickerToSlugMap.get(ticker.toUpperCase().trim());
  }
}

export const kapCompanyService = new KapCompanyService();
