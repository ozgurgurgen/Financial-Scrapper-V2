import { DataSourceAdapter, SyncResult } from './DataSourceAdapter.ts';
import { syncManager } from './SyncManager.ts';
import { db } from '../db/index.ts';
import { kapDisclosures, kapCompanies } from '../db/schema.ts';
import { aiService } from './AIService.ts';
import axios from 'axios';
import * as cheerio from 'cheerio';

export type KAPDataGroup = 
  | 'FINANCIALS' 
  | 'SPECIAL_EVENTS' 
  | 'CAPITAL_DIVIDEND' 
  | 'GOVERNANCE' 
  | 'FUNDS';

export class KAPAdapter implements DataSourceAdapter {
  sourceName = 'KAP';

  /**
   * Categorizes a KAP disclosure into one of the 5 requested core groups
   */
  classifyDisclosure(basic: any): { group: KAPDataGroup; label: string } {
    const title = (basic.title || '').toLowerCase();
    const summary = (basic.summary || '').toLowerCase();
    const discClass = (basic.disclosureClass || '').toUpperCase();
    const discType = (basic.disclosureType || '').toUpperCase();
    const discCat = (basic.disclosureCategory || '').toUpperCase();
    const fundType = (basic.fundType || '').toUpperCase();

    // 1. Fon ve Menkul Kıymet Bilgileri
    if (
      fundType || 
      discCat === 'FON' || 
      discType === 'FON' || 
      discClass === 'FON' || 
      title.includes('fon') || 
      title.includes('iç tüzük') || 
      title.includes('izahname') || 
      title.includes('portföy dağılım') || 
      title.includes('sukuk') || 
      title.includes('kira sertifikası') || 
      title.includes('borçlanma aracı') || 
      title.includes('ihraç tavanı') || 
      title.includes('tahvil') || 
      title.includes('bono')
    ) {
      return { group: 'FUNDS', label: 'Fon ve Menkul Kıymet Bilgileri' };
    }

    // 2. Finansal Tablolar ve Raporlar
    if (
      discClass === 'FR' || 
      title.includes('finansal rapor') || 
      title.includes('bilanço') || 
      title.includes('gelir tablosu') || 
      title.includes('faaliyet raporu') || 
      title.includes('bağımsız denetim') || 
      title.includes('sorumluluk beyanı') || 
      title.includes('nakit akış') ||
      summary.includes('finansal rapor') ||
      summary.includes('faaliyet raporu')
    ) {
      return { group: 'FINANCIALS', label: 'Finansal Tablolar ve Raporlar' };
    }

    // 3. Sermaye, Ortaklık Yapısı ve Temettü
    if (
      title.includes('sermaye artır') || 
      title.includes('sermaye azalt') || 
      title.includes('bedelli') || 
      title.includes('bedelsiz') || 
      title.includes('temettü') || 
      title.includes('kâr payı') || 
      title.includes('pay alım') || 
      title.includes('pay satım') || 
      title.includes('geri alım') || 
      title.includes('ortaklık yapısı') || 
      title.includes('oy hakkı') || 
      title.includes('mkk pay') ||
      summary.includes('temettü') ||
      summary.includes('kâr payı')
    ) {
      return { group: 'CAPITAL_DIVIDEND', label: 'Sermaye, Ortaklık & Temettü' };
    }

    // 4. Kurumsal Yönetim ve Genel Kurul
    if (
      discClass === 'GK' || 
      discClass === 'KY' || 
      discClass === 'SGBF' || 
      title.includes('genel kurul') || 
      title.includes('yönetim kurulu') || 
      title.includes('komite') || 
      title.includes('esas sözleşme') || 
      title.includes('sürdürülebilirlik') || 
      title.includes('şirket genel bilgi') || 
      title.includes('atama') || 
      title.includes('istifa')
    ) {
      return { group: 'GOVERNANCE', label: 'Kurumsal Yönetim & Genel Kurul' };
    }

    // 5. Özel Durum Açıklamaları (ÖDA)
    return { group: 'SPECIAL_EVENTS', label: 'Özel Durum Açıklamaları (ÖDA)' };
  }

  async sync(): Promise<SyncResult> {
    const startedAt = new Date();
    let recordsProcessed = 0;
    
    try {
      // 1. Prepare dynamic date range (last 5 days)
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const todayStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
      const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const fromStr = `${pad(pastDate.getDate())}.${pad(pastDate.getMonth() + 1)}.${pastDate.getFullYear()}`;

      let rawList: any[] = [];

      // Try the official Next.js KAP main list API endpoint
      try {
        const mainRes = await axios.post(
          'https://www.kap.org.tr/tr/api/disclosure/list/main',
          {
            fromDate: fromStr,
            toDate: todayStr,
            disclosureTypes: null,
            fundTypes: [],
            mkkMemberOid: null
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*'
            },
            timeout: 20000
          }
        );

        if (Array.isArray(mainRes.data) && mainRes.data.length > 0) {
          rawList = mainRes.data;
        }
      } catch (mainErr: any) {
        console.warn("KAP main endpoint failed, falling back to light endpoint:", mainErr.message);
      }

      // Fallback to light list if main list returned empty
      if (rawList.length === 0) {
        try {
          const lightRes = await axios.get('https://www.kap.org.tr/tr/api/disclosure/list/light', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            },
            timeout: 15000
          });
          if (Array.isArray(lightRes.data)) {
            rawList = lightRes.data;
          }
        } catch (lightErr: any) {
          console.error("KAP light endpoint also failed:", lightErr.message);
        }
      }

      if (rawList.length === 0) {
        throw new Error("KAP bildirim listesi çekilemedi.");
      }

      // We process the most recent 40 disclosures across different categories
      const targetDisclosures = rawList.slice(0, 40);

      // Load current AI Settings
      const aiConfig = await aiService.getSettings();
      let aiSummarizedCount = 0;
      const MAX_AI_PER_BATCH = 1;

      for (const item of targetDisclosures) {
        const basic = item.disclosureBasic || item;
        const index = basic.disclosureIndex?.toString();
        if (!index) continue;

        const classification = this.classifyDisclosure(basic);
        const symbol = basic.stockCode || (basic.relatedStocks ? String(basic.relatedStocks) : null);
        const companyTitle = basic.companyTitle || 'Borsa İstanbul Şirketi';
        const title = basic.title || basic.summary || 'KAP Bildirimi';
        const rawDate = basic.publishDate; // e.g. "03.09.2026 23:38:33"
        let publishDate: Date = new Date();

        if (rawDate) {
          try {
            // parse Turkish date string "DD.MM.YYYY HH:mm:ss" or ISO
            const parts = rawDate.split(' ');
            if (parts.length >= 2) {
              const [d, m, y] = parts[0].split('.').map(Number);
              const [hh, mm, ss] = parts[1].split(':').map(Number);
              publishDate = new Date(y, m - 1, d, hh, mm, ss || 0);
            } else {
              publishDate = new Date(rawDate);
            }
          } catch {
            publishDate = new Date();
          }
        }

        // 2. Fetch full detail from notification/attachment-detail/{index}
        let fullText = '';
        let attachmentList: Array<{ name: string; url: string; extension: string }> = [];

        try {
          const detailRes = await axios.get(
            `https://www.kap.org.tr/tr/api/notification/attachment-detail/${index}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
              },
              timeout: 10000
            }
          );

          const detailObj = Array.isArray(detailRes.data) ? detailRes.data[0] : detailRes.data;

          if (detailObj) {
            // Extract clean body text safely
            if (detailObj.disclosureBody) {
              try {
                const $ = cheerio.load(`<div>${detailObj.disclosureBody}</div>`);
                $('script, style, noscript').remove();
                fullText = $('div').text().replace(/\s+/g, ' ').trim();
              } catch {
                fullText = (detailObj.disclosureBody || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              }
            }

            // Extract attachments with verified official download endpoints
            if (Array.isArray(detailObj.attachments)) {
              attachmentList = detailObj.attachments.map((att: any) => ({
                name: att.fileName || 'Ek Belge',
                extension: att.fileExtension || (att.fileName?.split('.').pop()) || 'pdf',
                url: `https://www.kap.org.tr/tr/api/file/download/${att.objId}`
              }));
            }
          }
        } catch (detailErr: any) {
          console.warn(`Detail fetch failed for index ${index}:`, detailErr.message);
        }

        // If body text is empty, fall back to basic summary
        if (!fullText) {
          fullText = basic.summary || title;
        }

        // 3. AI Summarization for large documents (with quota protection)
        let aiSummary = '';
        if (aiConfig.enabled && fullText && fullText.length >= aiConfig.largeDocMinLength) {
          try {
            if (aiSummarizedCount < MAX_AI_PER_BATCH && !aiService.isQuotaCoolingDown()) {
              aiSummary = await aiService.summarizeText(fullText, false);
              if (aiSummary) aiSummarizedCount++;
            } else {
              // Use fast, quota-free local financial extractor
              aiSummary = aiService.generateLocalFinancialSummary(fullText);
            }
          } catch (aiErr: any) {
            aiSummary = aiService.generateLocalFinancialSummary(fullText);
          }
        } else if (fullText) {
          aiSummary = basic.summary || aiService.generateLocalFinancialSummary(fullText);
        }

        // 4. Prepare rich payload
        const disclosureUrl = `https://www.kap.org.tr/tr/Bildirim/${index}`;
        const categoryFormatted = `${classification.group} | ${classification.label}`;

        // Related company info stored in JSONB
        const relatedCompanyData = [{
          code: symbol,
          title: companyTitle,
          year: basic.year || null,
          period: basic.period || null,
          fundType: basic.fundType || null,
          disclosureClass: basic.disclosureClass || null,
          group: classification.group
        }];

        // 5. Upsert into database
        await db.insert(kapDisclosures)
          .values({
            disclosureIndex: index,
            symbol: symbol,
            title: `${companyTitle} - ${title}`,
            publishDate: publishDate,
            category: categoryFormatted,
            summary: aiSummary || basic.summary || null,
            fullText: fullText,
            hasAttachment: attachmentList.length > 0,
            attachmentUrls: attachmentList,
            relatedCompanies: relatedCompanyData,
            url: disclosureUrl,
            createdAt: new Date()
          })
          .onConflictDoUpdate({
            target: kapDisclosures.disclosureIndex,
            set: {
              title: `${companyTitle} - ${title}`,
              publishDate: publishDate,
              category: categoryFormatted,
              summary: aiSummary || basic.summary || null,
              fullText: fullText,
              hasAttachment: attachmentList.length > 0,
              attachmentUrls: attachmentList,
              relatedCompanies: relatedCompanyData,
              url: disclosureUrl
            }
          });

        recordsProcessed++;
      }

      return {
        source: this.sourceName,
        status: 'SUCCESS',
        recordsProcessed,
        startedAt,
        completedAt: new Date()
      };
    } catch (error: any) {
      console.error("KAP sync failed:", error);
      return {
        source: this.sourceName,
        status: 'ERROR',
        recordsProcessed,
        message: error.message,
        startedAt,
        completedAt: new Date()
      };
    }
  }
}

export const kapAdapter = new KAPAdapter();
syncManager.registerAdapter(kapAdapter);
