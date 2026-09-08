import { db } from '../db/index.ts';
import { settings } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { appEventBus } from './AppEventBus.ts';
import { multiLLMService, type AIProviderType, type ActiveAIConfig } from './MultiLLMService.ts';

export interface AISettingsConfig {
  enabled: boolean;
  summarizeLargeDocs: boolean;
  largeDocMinLength: number;
  provider: AIProviderType;
  model?: string;
  key?: string;
  geminiModel?: string;
  openaiModel?: string;
  anthropicModel?: string;
  deepseekModel?: string;
  groqModel?: string;
  localUrl?: string;
  localModel?: string;
  openrouterModel?: string;
  ninerouterUrl?: string;
  ninerouterKey?: string;
  ninerouterModel?: string;
  customUrl?: string;
  customKey?: string;
  customModel?: string;
}

export class AIService {
  private summaryCache = new Map<string, string>();
  private quotaCooldownUntil: number = 0;
  private readonly DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

  public isQuotaCoolingDown(): boolean {
    return Date.now() < this.quotaCooldownUntil;
  }

  public getCooldownRemainingSeconds(): number {
    const remaining = Math.max(0, this.quotaCooldownUntil - Date.now());
    return Math.ceil(remaining / 1000);
  }

  async getSettings(): Promise<AISettingsConfig> {
    try {
      const settingRec = await db.select().from(settings).where(eq(settings.key, 'ai_settings')).limit(1);
      if (settingRec.length > 0 && settingRec[0].value) {
        const val = settingRec[0].value as any;
        const provider = val.provider || 'gemini';
        const savedModel = val.model || '';
        let geminiModel = (provider === 'gemini' && savedModel) ? savedModel : (val.geminiModel || this.DEFAULT_GEMINI_MODEL);
        if (geminiModel === 'gemini-2.5-flash') {
          geminiModel = this.DEFAULT_GEMINI_MODEL;
        }
        return {
          enabled: val.enabled ?? true,
          summarizeLargeDocs: val.summarizeLargeDocs ?? true,
          largeDocMinLength: val.largeDocMinLength ?? 1000,
          provider,
          model: (savedModel === 'gemini-2.5-flash') ? this.DEFAULT_GEMINI_MODEL : savedModel,
          key: val.key || process.env.GEMINI_API_KEY || '',
          geminiModel,
          openaiModel: (provider === 'openai' && savedModel) ? savedModel : (val.openaiModel || 'gpt-4o-mini'),
          anthropicModel: (provider === 'anthropic' && savedModel) ? savedModel : (val.anthropicModel || 'claude-3-5-haiku-20241022'),
          deepseekModel: (provider === 'deepseek' && savedModel) ? savedModel : (val.deepseekModel || 'deepseek-chat'),
          groqModel: (provider === 'groq' && savedModel) ? savedModel : (val.groqModel || 'llama-3.3-70b-versatile'),
          localUrl: val.localUrl || 'http://localhost:11434/api/generate',
          localModel: (provider === 'local' && savedModel) ? savedModel : (val.localModel || 'llama3'),
          openrouterModel: (provider === 'openrouter' && savedModel) ? savedModel : (val.openrouterModel || 'meta-llama/llama-3.1-8b-instruct'),
          ninerouterUrl: val.ninerouterUrl || 'http://localhost:2165/v1/chat/completions',
          ninerouterKey: val.ninerouterKey || '',
          ninerouterModel: (provider === '9router' && savedModel) ? savedModel : (val.ninerouterModel || 'default'),
          customUrl: val.customUrl || '',
          customKey: val.customKey || '',
          customModel: (provider === 'custom' && savedModel) ? savedModel : (val.customModel || 'default'),
        };
      }
    } catch (e) {
      console.warn("Failed to load AI settings, using defaults:", e);
    }

    return {
      enabled: true,
      summarizeLargeDocs: true,
      largeDocMinLength: 1000,
      provider: 'gemini',
      model: this.DEFAULT_GEMINI_MODEL,
      key: process.env.GEMINI_API_KEY || '',
      geminiModel: this.DEFAULT_GEMINI_MODEL,
      openaiModel: 'gpt-4o-mini',
      anthropicModel: 'claude-3-5-haiku-20241022',
      deepseekModel: 'deepseek-chat',
      groqModel: 'llama-3.3-70b-versatile',
      localUrl: 'http://localhost:11434/api/generate',
      localModel: 'llama3',
      openrouterModel: 'meta-llama/llama-3.1-8b-instruct',
      ninerouterUrl: 'http://localhost:2165/v1/chat/completions',
      ninerouterKey: '',
      ninerouterModel: 'default',
      customUrl: '',
      customKey: '',
      customModel: '',
    };
  }

  /**
   * Sanitizes text to completely remove Summernote WYSIWYG remnants, HTML, and editor shortcuts
   */
  public sanitizeRawText(rawText: string): string {
    if (!rawText) return '';
    return rawText
      .replace(/Summernote[\s\S]*?(?:100%50%25%|Kısayollar|$)/gi, '')
      .replace(/\[CONSOLIDATION_METHOD_TITLE\][\s\S]*?oda_[a-zA-Z0-9_]+/gi, '')
      .replace(/(?:Ctrl\s*\+\s*[A-Za-z0-9]+|Kısayollar|Girintiyi\s*azalt|Girintiyi\s*artır|Yatay\s*çizgi\s*ekle|Resim\s*ekle|Bağlantı\s*ekle|Paragraf\s*biçimlendirme|Yazı\s*biçimlendirme|NormalCtrl|Başlık\s*[0-9]|Sola\s*hizala|Ortaya\s*hizala|Sağa\s*hizala|Numaralı\s*liste|Madde\s*işaretli\s*liste)+/gi, ' ')
      .replace(/\b(?:TurkishİngilizceEnglish|TürkçeTurkishİngilizceEnglish|oda_[a-zA-Z0-9_]+)\b/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate an intelligent extractive financial summary without calling external LLM APIs.
   */
  public generateLocalFinancialSummary(
    rawText: string, 
    context?: { symbol?: string; companyTitle?: string; title?: string; category?: string }
  ): string {
    const cleanText = this.sanitizeRawText(rawText);
    const symbol = context?.symbol || '';
    const compName = context?.companyTitle || symbol || 'Şirket';
    const topic = context?.title || 'KAP Bildirimi';
    const category = context?.category || 'Genel';

    const sentences = cleanText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => {
        if (s.length < 25) return false;
        const lower = s.toLowerCase();
        if (lower.includes('summernote') || lower.includes('ctrl +') || lower.includes('kısayollar') || lower.includes('resim ekle') || lower.includes('bağlantı ekle')) {
          return false;
        }
        return true;
      });

    const importantKeywords = [
      'karar', 'temettü', 'bedelsiz', 'bedelli', 'sözleşme', 'anlaşma', 'ihale',
      'gelir', 'ciro', 'satış', 'milyon', 'milyar', 'tl', 'usd', 'euro', '%',
      'yatırım', 'pay', 'hisse', 'tahsisli', 'sermaye', 'onay', 'spk', 'ortaklık',
      'faaliyet', 'fabrika', 'kapasite', 'sipariş', 'üretim', 'ihracat', 'kredi'
    ];

    const scored = sentences.map((sentence, index) => {
      let score = 0;
      const lower = sentence.toLowerCase();

      for (const kw of importantKeywords) {
        if (lower.includes(kw)) score += 2;
      }
      if (/\d+([.,]\d+)?\s*(milyon|milyar|tl|usd|\$|€|%)/i.test(sentence)) {
        score += 3;
      }
      if (index === 0) score += 2;
      if (sentence.length > 250) score -= 1;

      return { sentence, score, index };
    });

    const topSentences = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => a.index - b.index);

    const keyPoints = topSentences.map(t => t.sentence);

    const summaryPart = keyPoints[0] 
      ? keyPoints[0]
      : `${compName} tarafından Kamuyu Aydınlatma Platformu'na sunulan "${topic}" konulu bildirim incelenmiştir.`;

    const impactPart = keyPoints[1]
      ? keyPoints[1]
      : `${category} kapsamında açıklanan operasyonel ve finansal detaylar şirketin kurumsal takvimi ve mevzuat yükümlülüklerine uygun olarak paylaşılmıştır.`;

    const marketPart = keyPoints[2]
      ? keyPoints[2]
      : `Açıklama şirket faaliyetlerinin şeffaflığı ve yatırımcı bilgilendirmesi açısından olağan piyasa işleyişi çerçevesinde takip edilmektedir.`;

    return [
      `📌 Yönetici Özeti: ${summaryPart}`,
      `📊 Finansal & Operasyonel Etki: ${impactPart}`,
      `💡 Piyasa & Hisse Yorumu: ${marketPart}`
    ].join('\n\n');
  }

  /**
   * Deep Financial AI Analysis for BIST/KAP Companies & Disclosures
   */
  async analyzeCompanyDisclosure(params: {
    symbol?: string;
    companyTitle?: string;
    title: string;
    fullText?: string;
    category?: string;
    force?: boolean;
  }): Promise<string> {
    const rawContent = params.fullText || params.title;
    const cleanContent = this.sanitizeRawText(rawContent);
    const symbol = params.symbol || '';
    const companyTitle = params.companyTitle || symbol || 'BIST Şirketi';
    const title = params.title;
    const category = params.category || 'KAP Bildirimi';

    const cacheKey = `analysis_${symbol}_${title.substring(0, 50)}_${cleanContent.length}`;
    if (!params.force && this.summaryCache.has(cacheKey)) {
      return this.summaryCache.get(cacheKey)!;
    }

    // If quota cooldown active and not forced, return structured local analysis
    if (!params.force && this.isQuotaCoolingDown()) {
      const local = this.generateLocalFinancialSummary(cleanContent, {
        symbol,
        companyTitle,
        title,
        category
      });
      this.summaryCache.set(cacheKey, local);
      return local;
    }

    try {
      const maxChars = 20000;
      const truncatedText = cleanContent.length > maxChars
        ? cleanContent.substring(0, maxChars) + '...[kalan metin özet için kesildi]'
        : cleanContent;

      const prompt = `Sen Borsa İstanbul (BIST) ve KAP konusunda uzmanlaşmış kıdemli bir Finansal Yapay Zeka Analistisin.
Aşağıda yer alan şirket bildirimini profesyonel bir bakış açısıyla analiz et ve doğrudan yatırımcıya yol gösterecek şu 3 başlık altında net, profesyonel Türkçe bir analiz oluştur:

Şirket / Hisse Kodu: ${symbol || 'BIST'} - ${companyTitle}
Kategori: ${category}
Konu: ${title}

Bildirim İçeriği & Veriler:
${truncatedText || title}

Lütfen analizini tam olarak şu 3 yapılandırılmış başlık altında ver:
📌 Yönetici Özeti: (Bildirimin temel içeriği, alınan karar, sözleşme tutarı, oran veya ana mesaj)
📊 Finansal & Operasyonel Etki: (Ciro, nakit akışı, kârlılık, serbest nakit akışı, sermaye yapısı veya operasyonel kapasiteye olası etkiler)
💡 Piyasa & Hisse Yorumu: (Hisse senedi performansı, BIST yatırımcı algısı ve kısa/orta vadeli görünüm değerlendirmesi)`;

      appEventBus.emitOfficeEvent({
        type: 'AI_SUMMARIZE_TRIGGERED',
        actor: 'AI_SERVICE',
        department: 'KAP',
        status: 'BUSY',
        detail: `${symbol || 'KAP'} şirket bildirimi analiz ediliyor (Yapay Zeka)`,
        payload: { symbol, title, docLength: cleanContent.length }
      });

      const resultText = await multiLLMService.generateText({
        prompt,
        systemInstruction: 'Sen kıdemli bir Borsa İstanbul (BIST) ve KAP finansal analistisin. Analizlerini her zaman 📌 Yönetici Özeti, 📊 Finansal & Operasyonel Etki, 💡 Piyasa & Hisse Yorumu başlıklarıyla sun.',
        temperature: 0.2,
      });

      if (resultText && resultText.trim().length > 30) {
        const cleanResult = resultText.trim();
        this.summaryCache.set(cacheKey, cleanResult);
        return cleanResult;
      }
    } catch (err: any) {
      console.warn(`[AIService] AI generation failed for ${symbol}:`, err.message);
      const isQuota = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('Quota exceeded');
      if (isQuota) {
        this.quotaCooldownUntil = Date.now() + 60000;
      }
    }

    // Fallback to structured local financial intelligence
    const fallback = this.generateLocalFinancialSummary(cleanContent, {
      symbol,
      companyTitle,
      title,
      category
    });
    this.summaryCache.set(cacheKey, fallback);
    return fallback;
  }

  async summarizeText(text: string, force: boolean = false): Promise<string> {
    const cleanText = this.sanitizeRawText(text);
    return this.analyzeCompanyDisclosure({
      title: cleanText.substring(0, 100),
      fullText: cleanText,
      force
    });
  }

  async testConnection(configOverride?: Partial<AISettingsConfig>): Promise<{ success: boolean; message: string; output?: string }> {
    try {
      const currentConfig = await this.getSettings();
      const config = { ...currentConfig, ...configOverride };

      let activeConfig: ActiveAIConfig;

      if (config.provider === 'gemini') {
        const apiKey = config.key || (config as any).geminiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) return { success: false, message: "Gemini API anahtarı girilmedi." };
        activeConfig = {
          provider: 'gemini',
          apiKey,
          model: config.model || config.geminiModel || this.DEFAULT_GEMINI_MODEL,
        };
      } else if (config.provider === 'openai') {
        const apiKey = config.key || (config as any).openaiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) return { success: false, message: "OpenAI API anahtarı girilmedi." };
        activeConfig = {
          provider: 'openai',
          apiKey,
          model: config.model || config.openaiModel || 'gpt-4o-mini',
        };
      } else if (config.provider === 'anthropic') {
        const apiKey = config.key || (config as any).anthropicKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return { success: false, message: "Anthropic Claude API anahtarı girilmedi." };
        activeConfig = {
          provider: 'anthropic',
          apiKey,
          model: config.model || config.anthropicModel || 'claude-3-5-haiku-20241022',
        };
      } else if (config.provider === 'deepseek') {
        const apiKey = config.key || (config as any).deepseekKey || process.env.DEEPSEEK_API_KEY;
        if (!apiKey) return { success: false, message: "DeepSeek API anahtarı girilmedi." };
        activeConfig = {
          provider: 'deepseek',
          apiKey,
          model: config.model || config.deepseekModel || 'deepseek-chat',
        };
      } else if (config.provider === 'groq') {
        const apiKey = config.key || (config as any).groqKey || process.env.GROQ_API_KEY;
        if (!apiKey) return { success: false, message: "Groq API anahtarı girilmedi." };
        activeConfig = {
          provider: 'groq',
          apiKey,
          model: config.model || config.groqModel || 'llama-3.3-70b-versatile',
        };
      } else if (config.provider === 'openrouter') {
        const apiKey = config.key || (config as any).openrouterKey || process.env.OPENROUTER_API_KEY;
        if (!apiKey) return { success: false, message: "OpenRouter API anahtarı girilmedi." };
        activeConfig = {
          provider: 'openrouter',
          apiKey,
          model: config.model || config.openrouterModel || 'meta-llama/llama-3.1-8b-instruct',
        };
      } else if (config.provider === 'local') {
        activeConfig = {
          provider: 'local',
          endpointUrl: config.localUrl || 'http://localhost:11434/api/generate',
          model: config.model || config.localModel || 'llama3',
        };
      } else if (config.provider === '9router') {
        activeConfig = {
          provider: '9router',
          apiKey: config.ninerouterKey || config.key || '',
          endpointUrl: config.ninerouterUrl || 'http://localhost:2165/v1/chat/completions',
          model: config.model || config.ninerouterModel || 'default',
        };
      } else {
        activeConfig = {
          provider: 'custom',
          apiKey: config.customKey || config.key || '',
          endpointUrl: config.customUrl || '',
          model: config.model || config.customModel || 'default',
        };
      }

      const prompt = 'KAP ve BIST finansal analiz sistemi için bağlantı testi. Tek cümleyle "Finans Analiz Motoru Bağlandı." yanıtı ver.';
      
      const responseText = await multiLLMService.generateText({
        prompt,
        systemInstruction: 'Finansal analiz sistemi test yanıtı.',
        temperature: 0.1,
        strict: true,
      }, { ...activeConfig, strict: true });

      return {
        success: true,
        message: `${activeConfig.provider.toUpperCase()} (${activeConfig.model}) bağlantısı başarılı!`,
        output: responseText.trim(),
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Bağlantı hatası: ${e.message}`,
      };
    }
  }

  /**
   * Batch process news items to get summaries and sentiment analysis using AI.
   */
  public async batchAnalyzeNews(newsItems: { id: string; title: string; body: string }[]): Promise<{ id: string; summary: string; sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' }[]> {
    if (!newsItems || newsItems.length === 0) return [];
    
    const config = await this.getSettings();
    
    if (!config.enabled || this.isQuotaCoolingDown()) {
      return this.fallbackNewsAnalysis(newsItems);
    }

    const prompt = `Aşağıda finans piyasalarından toplanmış haberlerin bir listesi JSON formatında verilmektedir. 
Lütfen her bir haber için:
1. Haberin içeriğini ve bağlamını koruyan, okuyucuya asıl olayı net ve akıcı bir şekilde anlatan 1-2 cümlelik kısa bir TÜRKÇE özet (summary) yaz.
2. Haberin piyasalar (veya ilgili varlık) üzerindeki duyarlılığını (sentiment) belirle. Sadece "POSITIVE", "NEGATIVE" veya "NEUTRAL" dönebilirsin.

Girdi Listesi:
${JSON.stringify(newsItems.map(n => ({ id: n.id, title: n.title, text: (n.body || '').substring(0, 500) })))}

LÜTFEN SADECE AŞAĞIDAKİ FORMATTA GEÇERLİ BİR JSON DİZİSİ DÖNDÜR, BAŞKA HİÇBİR METİN YAZMA (MARKDOWN KOD BLOKLARI DAHİL OLMASIN):
[
  { "id": "...", "summary": "...", "sentiment": "POSITIVE" }
]`;

    try {
      appEventBus.emitOfficeEvent({
        type: 'AI_SUMMARIZE_TRIGGERED',
        actor: 'AI_SERVICE',
        department: 'KRIPTO',
        status: 'BUSY',
        detail: `Haberler için toplu duyarlılık analizi yapılıyor (${newsItems.length} haber - ${config.provider.toUpperCase()})`,
        payload: { docLength: prompt.length, engine: config.provider.toUpperCase() }
      });

      let text = await multiLLMService.generateText({
        prompt,
        systemInstruction: 'Sen finansal duyarlılık analistisin. Sadece geçerli JSON çıktısı üret.',
        temperature: 0.1,
      });

      text = text.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
      }
      
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed as { id: string; summary: string; sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' }[];
      }
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded') || errMsg.includes('rate limit');
      if (isQuota) {
        let delayMs = 60000;
        const match = errMsg.match(/retry in ([0-9.]+)s/i) || errMsg.match(/retryDelay":"([0-9]+)s"/i);
        if (match && match[1]) {
          delayMs = Math.ceil(parseFloat(match[1]) * 1000) + 2000;
        }
        this.quotaCooldownUntil = Date.now() + delayMs;
        console.warn(`[AIService] AI Batch News kota sınırına ulaştı (429). ${Math.ceil(delayMs / 1000)}s boyunca yerel duyarlılık analizi uygulanacak.`);
      } else {
        console.warn('[AIService] AI Batch News Error:', errMsg);
      }
    }
    
    return this.fallbackNewsAnalysis(newsItems);
  }

  private fallbackNewsAnalysis(newsItems: { id: string; title: string; body: string }[]): { id: string; summary: string; sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' }[] {
    return newsItems.map(item => {
      const titleLower = item.title.toLowerCase();
      let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
      if (titleLower.match(/surge|bull|gain|rally|up|high|artış|yükseliş|zirve/i)) sentiment = 'POSITIVE';
      else if (titleLower.match(/drop|crash|bear|risk|down|low|hack|scam|düşüş|kayıp|kriz/i)) sentiment = 'NEGATIVE';
      
      return {
        id: item.id,
        summary: (item.body && item.body.length > 10) ? item.body.substring(0, 200) + '...' : item.title,
        sentiment
      };
    });
  }
}

export const aiService = new AIService();
