import * as cheerio from 'cheerio';
import { db } from '../db';
import { ipos } from '../db/schema';
import { eq } from 'drizzle-orm';
import YahooFinance from 'yahoo-finance2';
import { kapCompanyService } from './KapCompanyService';
import { multiLLMService } from './MultiLLMService';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export class IpoScraperService {
  async fetchLatestIpos() {
    try {
      const res = await fetch('https://halkarz.com/');
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: any[] = [];
      
      // Select the first 15 IPOs from the homepage
      $('.index-list').slice(0, 15).each((i, el) => {
        const code = $(el).find('.il-bist-kod').text().trim();
        const name = $(el).find('h3.il-halka-arz-sirket').text().trim();
        const dateStr = $(el).find('.il-halka-arz-tarihi time').text().trim();
        const url = $(el).find('a').attr('href');

        if (code && name && url) {
          items.push({ code, name, dateStr, url });
        }
      });

      return items;
    } catch (e) {
      console.error('Error fetching halkarz.com homepage:', e);
      return [];
    }
  }

  async fetchIpoDetails(url: string) {
    try {
      const res = await fetch(url);
      const html = await res.text();
      const $ = cheerio.load(html);

      // Extract specific info based on labels or strong tags
      let price = '';
      let lotSize = '';
      
      // Halkarz.com detail pages typically have strong tags for details
      const strongTexts = $('strong').map((i, el) => $(el).text().trim()).get();
      
      // Try to find price (often the first strong tag)
      price = strongTexts.find(t => t.includes('TL')) || strongTexts[0] || 'Bilinmiyor';
      
      // Try to find lot size or distribution method
      lotSize = strongTexts.find(t => t.includes('Eşit') || t.includes('Oransal') || t.includes('Lot')) || strongTexts[1] || 'Bilinmiyor';

      // Status logic: if date is past, it might be LISTED.
      // If it contains "Taslak", it's DRAFT.
      let status = 'APPROVED';
      const lowercaseHtml = html.toLowerCase();
      if (lowercaseHtml.includes('taslak i̇zahname') || lowercaseHtml.includes('taslak izahname')) {
        status = 'DRAFT';
      } else if (lowercaseHtml.includes('talep toplama') || lowercaseHtml.includes('talep topladı')) {
        status = 'BOOK_BUILDING';
      }
      
      const contentText = $('body').text().replace(/\s+/g, ' ');
      const extract = (text: string, startKw: string, endKws: string[]) => {
          let minIdx = Number.MAX_SAFE_INTEGER;
          let startIdx = text.indexOf(startKw);
          if(startIdx === -1) return null;
          startIdx += startKw.length;
          
          for(let ekw of endKws) {
             let endIdx = text.indexOf(ekw, startIdx);
             if(endIdx !== -1 && endIdx < minIdx) {
                minIdx = endIdx;
             }
          }
          
          if (minIdx === Number.MAX_SAFE_INTEGER) {
             return text.substring(startIdx, startIdx + 200).trim();
          }
          return text.substring(startIdx, minIdx).trim();
      };

      const signals = {
         fundUsage: extract(contentText, 'Fonun Kullanım Yeri', ['Halka Arz Satış', 'Tahsisat', 'Dağıtılacak']),
         allocationGroups: extract(contentText, 'Tahsisat Grupları', ['Dağıtılacak Pay', 'Finansal Tablo', 'Fiyat İstikrarı']),
         priceStability: extract(contentText, 'Fiyat İstikrarı', ['Satmama Taahhüdü', 'Halka Açıklık']),
         lockupCommitment: extract(contentText, 'Satmama Taahhüdü', ['Halka Açıklık', 'Halka Arz İskontosu']),
         freeFloat: extract(contentText, 'Halka Açıklık', ['Halka Arz İskontosu', 'Halka Arz Büyüklüğü', 'T1-T2']),
         discountRate: extract(contentText, 'Halka Arz İskontosu', ['Halka Arz Büyüklüğü', 'T1-T2', 'Katılım Endeksine']),
         ipoSize: extract(contentText, 'Halka Arz Büyüklüğü', ['T1-T2', 'Katılım Endeksine', 'Bireysele Eşit', 'Tamamı Eşit'])
      };

      // Try to get a summary to send to AI
      const description = $('p').slice(0, 5).map((i, el) => $(el).text().trim()).get().join(' ') + 
                          `\n\nFon Kullanımı: ${signals.fundUsage || 'Bilinmiyor'}\n` +
                          `Fiyat İstikrarı: ${signals.priceStability || 'Bilinmiyor'}\n` +
                          `Satmama Taahhüdü: ${signals.lockupCommitment || 'Bilinmiyor'}\n` +
                          `İskonto: ${signals.discountRate || 'Bilinmiyor'}\n` +
                          `Tahsisat: ${signals.allocationGroups || 'Bilinmiyor'}\n`;

      return { price, lotSize, status, description, signals };
    } catch (e) {
      console.error('Error fetching IPO details for', url, e);
      return null;
    }
  }

  async analyzeWithAI(companyName: string, description: string) {
    try {
      const prompt = `Aşağıdaki halka arz olacak şirket için yatırımcı perspektifinden kısacık bir özet (1-2 cümle) ve bir potansiyel etiketi üret. 
      Şirket: ${companyName}
      Detaylar: ${description.substring(0, 1500)}
      
      Çıktı formatı SADECE JSON olmalı (markdown olmadan):
      {
        "sentiment": "YÜKSEK POTANSİYEL",
        "aiSummary": "kısa özet"
      }`;

      const resText = await multiLLMService.generateText({
        prompt,
        systemInstruction: 'Sen kıdemli bir SPK ve Halka Arz analistisin. Sadece geçerli JSON çıktısı ver.',
        temperature: 0.2
      });
      
      const cleanJson = (resText || '')
        .replace(/^```(json)?/i, '')
        .replace(/```$/i, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn('[IpoScraperService] AI Analysis failed for', companyName, e);
      return null;
    }
  }

  /**
   * Borsa İstanbul'da işlem gören halka arz edilmiş şirketler için
   * gerçek zamanlı fiyat, tavan serisi, getiri ve işlem günü verilerini hesaplar.
   */
  async fetchMarketTavanData(ticker: string) {
    if (!ticker) return null;
    try {
      const symbol = `${ticker.toUpperCase().trim()}.IS`;
      const chartRes: any = await yf.chart(symbol, {
        period1: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        interval: '1d'
      });
      const quotes = chartRes?.quotes || [];
      if (quotes.length === 0) return null;

      let ceilingStreak = 0;
      let maxCeilingStreak = 0;
      let brokeCeiling = false;
      let breakDate: string | null = null;
      const initialPrice = quotes[0].open || quotes[0].close;
      const lastPrice = quotes[quotes.length - 1].close;
      const totalReturnPct = initialPrice ? (((lastPrice - initialPrice) / initialPrice) * 100).toFixed(1) : '0';

      for (let i = 0; i < quotes.length; i++) {
        const q = quotes[i];
        const prevClose = i === 0 ? q.open : quotes[i - 1].close;
        const dailyChangePct = prevClose ? ((q.close - prevClose) / prevClose) * 100 : 0;
        
        // BIST tavan kuralı: günlük +9.2% ve üzeri veya günün en yükseğinden kapanış
        const isCeiling = dailyChangePct >= 9.2 || (q.close === q.high && dailyChangePct >= 8.5);

        if (isCeiling && !brokeCeiling) {
          ceilingStreak++;
          maxCeilingStreak = ceilingStreak;
        } else if (!brokeCeiling && i > 0) {
          brokeCeiling = true;
          breakDate = q.date ? new Date(q.date).toLocaleDateString('tr-TR') : null;
        }
      }

      const quote: any = await yf.quote(symbol);
      const currentPrice = quote?.regularMarketPrice ? `₺${quote.regularMarketPrice.toFixed(2)}` : null;
      const dayChangePct = quote?.regularMarketChangePercent !== undefined 
        ? `${quote.regularMarketChangePercent >= 0 ? '+' : ''}${quote.regularMarketChangePercent.toFixed(2)}%` 
        : null;

      return {
        isListed: true,
        currentPrice,
        dayChangePct,
        ceilingStreak,
        maxCeilingStreak,
        brokeCeiling,
        breakDate,
        totalReturnPct: `${parseFloat(totalReturnPct) >= 0 ? '+' : ''}${totalReturnPct}%`,
        tradingDays: quotes.length
      };
    } catch (e) {
      // Şirket henüz BIST'te işlem görmüyor veya ticker bulunamadı
      return null;
    }
  }

  async syncIpos() {
    console.log('Starting IPO sync from halkarz.com...');
    const list = await this.fetchLatestIpos();
    
    for (const item of list) {
      try {
        if (item.code && item.url) {
          kapCompanyService.registerIpoUrl(item.code, item.url);
        }
        // Check if exists
        const [existing] = await db.select().from(ipos).where(eq(ipos.companyCode, item.code));
        
        console.log(`Fetching details for ${item.code}...`);
        const details = await this.fetchIpoDetails(item.url);
        if (!details) continue;
        
        // Borsa İstanbul canlı tavan serisi ve fiyat verilerini çek
        const marketData = await this.fetchMarketTavanData(item.code);
        let finalStatus = details.status;
        if (marketData?.isListed) {
          finalStatus = 'LISTED';
        }

        let sentiment = existing?.sentiment || 'STANDART';
        let aiSummary = existing?.aiSummary || 'AI analizi yapılamadı.';
        let madeApiCall = false;
        
        // Sadece özet yoksa veya daha önce hata alındıysa API'ye git
        if (details.description && (!existing || aiSummary === 'AI analizi yapılamadı.')) {
           const aiRes = await this.analyzeWithAI(item.name, details.description);
           madeApiCall = true;
           if (aiRes) {
             sentiment = aiRes.sentiment;
             aiSummary = aiRes.aiSummary;
           }
        }
        
        const ipoData = {
          companyCode: item.code,
          companyName: item.name,
          dateStr: item.dateStr || 'Tarih Bekleniyor',
          status: finalStatus,
          price: details.price,
          lotSize: details.lotSize,
          sentiment: sentiment,
          aiSummary: aiSummary,
          ipoSize: details.signals?.ipoSize || null,
          freeFloat: details.signals?.freeFloat || null,
          priceStability: details.signals?.priceStability || null,
          lockupCommitment: details.signals?.lockupCommitment || null,
          fundUsage: details.signals?.fundUsage || null,
          discountRate: details.signals?.discountRate || null,
          allocationGroups: details.signals?.allocationGroups || null,
          currentPrice: marketData?.currentPrice || null,
          dayChangePct: marketData?.dayChangePct || null,
          ceilingStreak: marketData?.ceilingStreak ?? null,
          maxCeilingStreak: marketData?.maxCeilingStreak ?? null,
          brokeCeiling: marketData?.brokeCeiling ?? false,
          breakDate: marketData?.breakDate || null,
          totalReturnPct: marketData?.totalReturnPct || null,
          tradingDays: marketData?.tradingDays ?? null,
          updatedAt: new Date()
        };
        
        if (existing) {
          await db.update(ipos).set(ipoData).where(eq(ipos.id, existing.id));
        } else {
          await db.insert(ipos).values(ipoData);
        }
        
        // Gemini API kota limitlerine (örn. dakikada 5 istek) takılmamak için bekleme
        if (madeApiCall) {
          await new Promise(r => setTimeout(r, 15000));
        } else {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (e) {
        console.error('Error syncing IPO:', item.code, e);
      }
    }
    console.log('IPO sync completed.');
  }

  /**
   * Sadece Borsa İstanbul'da işlem gören IPO'ların tavan serisini ve fiyatlarını hızla tazeler
   */
  async syncTavanData() {
    console.log('Refreshing live IPO Tavan Series from Borsa Istanbul...');
    const allIpos = await db.select().from(ipos);
    let updatedCount = 0;

    for (const item of allIpos) {
      if (!item.companyCode) continue;
      const marketData = await this.fetchMarketTavanData(item.companyCode);
      if (marketData && marketData.isListed) {
        await db.update(ipos).set({
          status: 'LISTED',
          currentPrice: marketData.currentPrice,
          dayChangePct: marketData.dayChangePct,
          ceilingStreak: marketData.ceilingStreak,
          maxCeilingStreak: marketData.maxCeilingStreak,
          brokeCeiling: marketData.brokeCeiling,
          breakDate: marketData.breakDate,
          totalReturnPct: marketData.totalReturnPct,
          tradingDays: marketData.tradingDays,
          updatedAt: new Date()
        }).where(eq(ipos.id, item.id));
        updatedCount++;
      }
    }
    console.log(`Live IPO Tavan Series refreshed for ${updatedCount} companies.`);
    return updatedCount;
  }
}

export const ipoScraperService = new IpoScraperService();
