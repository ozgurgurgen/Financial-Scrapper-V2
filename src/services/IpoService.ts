import axios from 'axios';
import { aiService } from './AIService.ts';
import { appEventBus } from './AppEventBus.ts';

export interface HalkaArzRecord {
  companyName: string;
  summary: string;
  sentiment: string;
  publishDate: string;
  link: string;
}

export class IpoService {
  /**
   * Fetches the latest disclosures from KAP API and uses AI to filter and analyze 
   * specifically "Halka Arz" (IPO) and "İzahname" disclosures.
   */
  async trackIpos(): Promise<{ processed: number; newIpos: HalkaArzRecord[] }> {
    try {
      appEventBus.emitOfficeEvent({
        type: 'DATA_FETCH_INITIATED',
        actor: 'IPO_SERVICE',
        department: 'HALKA_ARZ',
        status: 'BUSY',
        detail: 'KAP API üzerinden yeni izahname ve halka arz bildirimleri taranıyor...'
      });

      // 1. Fetch latest disclosures from KAP Light API
      const res = await axios.get('https://www.kap.org.tr/tr/api/disclosure/list/light', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      let rawList = Array.isArray(res.data) ? res.data : [];
      if (rawList.length === 0) {
        return { processed: 0, newIpos: [] };
      }

      // 2. Local heuristic filter for Halka Arz & Izahname keywords
      const ipoCandidates = rawList.filter(item => {
        const title = (item.title || '').toLowerCase();
        const summary = (item.summary || '').toLowerCase();
        return title.includes('halka arz') || title.includes('i̇zahname') || title.includes('izahname') ||
               summary.includes('halka arz') || summary.includes('izahname');
      }).slice(0, 5); // Take top 5 recent candidates

      if (ipoCandidates.length === 0) {
         appEventBus.emitOfficeEvent({
          type: 'DATA_NORMALIZED',
          actor: 'IPO_SERVICE',
          department: 'HALKA_ARZ',
          status: 'SUCCESS',
          detail: 'Tarama tamamlandı. Yeni onaylanmış Halka Arz veya İzahname bulunamadı.'
        });
        return { processed: 0, newIpos: [] };
      }

      appEventBus.emitOfficeEvent({
        type: 'AI_SUMMARIZE_TRIGGERED',
        actor: 'AI_SERVICE',
        department: 'HALKA_ARZ',
        status: 'BUSY',
        detail: `${ipoCandidates.length} adet potansiyel Halka Arz bildirimi bulundu. Yapay Zeka analizine gönderiliyor...`
      });

      const parsedIpos: HalkaArzRecord[] = [];

      // 3. Process with AI
      for (const candidate of ipoCandidates) {
        const textToAnalyze = `Şirket/Bildirim Özeti: ${candidate.summary || candidate.title}. Başlık: ${candidate.title}`;
        let aiAnalysis = 'AI Analizi yapılamadı.';
        let sentiment = 'NÖTR';
        
        try {
          if (!aiService.isQuotaCoolingDown()) {
            const prompt = `Şu KAP Halka Arz/İzahname bildirimini analiz et. Sadece şu iki bilgiyi ver: 
1. Bu halka arz yatırımcı için ne kadar büyük/önemli? Kısa bir cümle ile özetle.
2. Duyarlılık (Sadece şu kelimelerden biri: YÜKSEK POTANSİYEL, STANDART, RİSKLİ).
Metin: ${textToAnalyze}`;
            
            const aiResponse = await aiService.summarizeText(prompt, false);
            if (aiResponse) {
               aiAnalysis = aiResponse;
               if (aiResponse.includes('YÜKSEK')) sentiment = 'YÜKSEK POTANSİYEL';
               else if (aiResponse.includes('RİSK')) sentiment = 'RİSKLİ';
               else sentiment = 'STANDART';
            }
          }
        } catch (e) {
          console.error("AI IPO Analysis failed", e);
        }

        parsedIpos.push({
           companyName: candidate.stockCodes ? candidate.stockCodes : (candidate.title?.substring(0, 30) + '...'),
           summary: aiAnalysis,
           sentiment,
           publishDate: new Date(candidate.publishDate).toISOString(),
           link: `https://www.kap.org.tr/tr/Bildirim/${candidate.disclosureIndex}`
        });
      }

      appEventBus.emitOfficeEvent({
        type: 'DATA_NORMALIZED',
        actor: 'IPO_SERVICE',
        department: 'HALKA_ARZ',
        status: 'SUCCESS',
        detail: `${parsedIpos.length} adet Halka Arz / İzahname bildirimi AI ile analiz edildi ve sisteme işlendi.`
      });

      return { processed: parsedIpos.length, newIpos: parsedIpos };

    } catch (error) {
      console.error('[IpoService] Halka Arz tarama hatası:', error);
      appEventBus.emitOfficeEvent({
        type: 'DATA_FETCH_FAILED',
        actor: 'IPO_SERVICE',
        department: 'HALKA_ARZ',
        status: 'ERROR',
        detail: 'SPK/KAP Bülten taraması sırasında bağlantı hatası oluştu.'
      });
      return { processed: 0, newIpos: [] };
    }
  }
}

export const ipoService = new IpoService();
