import axios from 'axios';
import { aiService } from './AIService.ts';
import { appEventBus } from './AppEventBus.ts';
import * as cheerio from 'cheerio';

export interface NewsRecord {
  title: string;
  link: string;
  sentiment: 'POZİTİF' | 'NEGATİF' | 'NÖTR';
  aiSummary: string;
}

export class NewsService {
  /**
   * Scrapes top headlines from real finance RSS feeds and uses AI for sentiment analysis.
   */
  async trackNews(): Promise<{ processed: number; records: NewsRecord[] }> {
    try {
      appEventBus.emitOfficeEvent({
        type: 'DATA_FETCH_INITIATED',
        actor: 'NEWS_SERVICE',
        department: 'HABERLER',
        status: 'BUSY',
        detail: 'Global & Yerel finans kaynaklarından (TRT Haber, Habertürk, Yahoo Finance, Cointelegraph) son haberler toplanıyor...'
      });

      const feeds = [
        { url: 'https://www.trthaber.com/ekonomi_articles.rss', source: 'TRT Ekonomi' },
        { url: 'https://www.haberturk.com/rss/kategori/ekonomi.xml', source: 'Habertürk Ekonomi' },
        { url: 'https://finance.yahoo.com/news/rssindex', source: 'Yahoo Finance' },
        { url: 'https://cointelegraph.com/rss', source: 'Cointelegraph' }
      ];

      const newsItems: { title: string; description: string; link: string; source: string }[] = [];

      for (const f of feeds) {
        try {
          const res = await axios.get(f.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 6000
          });
          const xml = typeof res.data === 'string' ? res.data : '';
          const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) || [];

          for (const itemXml of itemMatches.slice(0, 5)) {
            const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
            const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

            const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            const link = linkMatch ? linkMatch[1].trim() : '';
            const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

            if (title && !newsItems.some(n => n.title === title)) {
              newsItems.push({
                title,
                description: desc.substring(0, 300),
                link,
                source: f.source
              });
            }
          }
        } catch (feedErr: any) {
          console.warn(`[NewsService] Feed error for ${f.source}:`, feedErr.message);
        }
      }

      if (newsItems.length === 0) {
        console.log('[NewsService] Haber bulunamadı veya API hatası oluştu, boş dönülüyor.');
        return { processed: 0, records: [] };
      }

      appEventBus.emitOfficeEvent({
        type: 'AI_SUMMARIZE_TRIGGERED',
        actor: 'AI_SERVICE',
        department: 'HABERLER',
        status: 'BUSY',
        detail: `${newsItems.length} gerçek piyasa haberi toplandı. AI Sentiment (Duyarlılık) Analizine başlanıyor...`
      });

      const processedNews: NewsRecord[] = [];
      let posCount = 0;
      let negCount = 0;
      let neuCount = 0;

      for (const item of newsItems.slice(0, 15)) {
        let aiSummary = item.description || item.title;
        let sentiment: 'POZİTİF' | 'NEGATİF' | 'NÖTR' = 'NÖTR';
        
        try {
          if (!aiService.isQuotaCoolingDown()) {
            const prompt = `Şu finansal haberi analiz et. Bana sadece şu formata uygun cevap ver: [DUYARLILIK] - [KISA ÖZET].
Duyarlılık kelimesi sadece POZİTİF, NEGATİF veya NÖTR olabilir.
Haber Başlığı: ${item.title}
Haber Detayı: ${item.description}`;
            
            const aiResponse = await aiService.summarizeText(prompt, false);
            if (aiResponse) {
               if (aiResponse.includes('POZİTİF') || aiResponse.includes('POSITIVE')) {
                   sentiment = 'POZİTİF'; posCount++;
               } else if (aiResponse.includes('NEGATİF') || aiResponse.includes('NEGATIVE')) {
                   sentiment = 'NEGATİF'; negCount++;
               } else {
                   sentiment = 'NÖTR'; neuCount++;
               }
               // Extract summary part
               const parts = aiResponse.split('-');
               aiSummary = parts.length > 1 ? parts.slice(1).join('-').trim() : aiResponse;
            }
          }
        } catch (e) {
          console.error("AI News Analysis failed", e);
        }

        processedNews.push({
           title: item.title,
           link: item.link,
           sentiment,
           aiSummary
        });
      }

      appEventBus.emitOfficeEvent({
        type: 'DATA_NORMALIZED',
        actor: 'NEWS_SERVICE',
        department: 'HABERLER',
        status: 'SUCCESS',
        detail: `${processedNews.length} haber analiz edildi (${posCount} POZİTİF, ${negCount} NEGATİF, ${neuCount} NÖTR).`
      });

      return { processed: processedNews.length, records: processedNews };

    } catch (error) {
      console.error('[NewsService] Haber tarama hatası:', error);
      appEventBus.emitOfficeEvent({
        type: 'DATA_FETCH_FAILED',
        actor: 'NEWS_SERVICE',
        department: 'HABERLER',
        status: 'ERROR',
        detail: 'Haber kaynaklarına bağlanırken hata oluştu.'
      });
      return { processed: 0, records: [] };
    }
  }
}

export const newsService = new NewsService();
