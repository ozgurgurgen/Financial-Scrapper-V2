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
  private readonly DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

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
        return {
          enabled: val.enabled ?? true,
          summarizeLargeDocs: val.summarizeLargeDocs ?? true,
          largeDocMinLength: val.largeDocMinLength ?? 1000,
          provider: val.provider || 'gemini',
          key: val.key || process.env.GEMINI_API_KEY || '',
          geminiModel: val.geminiModel || this.DEFAULT_GEMINI_MODEL,
          openaiModel: val.openaiModel || 'gpt-4o-mini',
          anthropicModel: val.anthropicModel || 'claude-3-5-haiku-20241022',
          deepseekModel: val.deepseekModel || 'deepseek-chat',
          groqModel: val.groqModel || 'llama-3.3-70b-versatile',
          localUrl: val.localUrl || 'http://localhost:11434/api/generate',
          localModel: val.localModel || 'llama3',
          openrouterModel: val.openrouterModel || 'meta-llama/llama-3.1-8b-instruct',
          ninerouterUrl: val.ninerouterUrl || 'http://localhost:4000/v1/chat/completions',
          ninerouterKey: val.ninerouterKey || '',
          ninerouterModel: val.ninerouterModel || 'default',
          customUrl: val.customUrl || '',
          customKey: val.customKey || '',
          customModel: val.customModel || '',
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
      key: process.env.GEMINI_API_KEY || '',
      geminiModel: this.DEFAULT_GEMINI_MODEL,
      openaiModel: 'gpt-4o-mini',
      anthropicModel: 'claude-3-5-haiku-20241022',
      deepseekModel: 'deepseek-chat',
      groqModel: 'llama-3.3-70b-versatile',
      localUrl: 'http://localhost:11434/api/generate',
      localModel: 'llama3',
      openrouterModel: 'meta-llama/llama-3.1-8b-instruct',
      ninerouterUrl: 'http://localhost:4000/v1/chat/completions',
      ninerouterKey: '',
      ninerouterModel: 'default',
      customUrl: '',
      customKey: '',
      customModel: '',
    };
  }

  /**
   * Generate an intelligent extractive financial summary without calling external LLM APIs.
   */
  public generateLocalFinancialSummary(rawText: string): string {
    if (!rawText) return '';

    const cleanText = rawText
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanText.length < 50) return cleanText;

    const sentences = cleanText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 25);

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
      .slice(0, 4)
      .sort((a, b) => a.index - b.index);

    const selectedSentences = topSentences.length > 0
      ? topSentences.map(t => t.sentence)
      : sentences.slice(0, 3);

    const bullets = selectedSentences.map(s => `• ${s}`).join('\n');
    return bullets;
  }

  async summarizeText(text: string, force: boolean = false): Promise<string> {
    try {
      const config = await this.getSettings();

      if (!config.enabled || !text) return '';

      if (!force && config.summarizeLargeDocs && text.length < config.largeDocMinLength) {
        return '';
      }

      const cacheKey = text.substring(0, 200) + '_' + text.length;
      if (this.summaryCache.has(cacheKey)) {
        return this.summaryCache.get(cacheKey)!;
      }

      const maxChars = 25000;
      const truncatedText = text.length > maxChars 
        ? text.substring(0, maxChars) + '\n...[Metin devamı sınır nedeniyle kesildi]' 
        : text;

      const systemPrompt = `Sen kıdemli bir Borsa İstanbul (BIST) ve KAP finansal analistisin. 
Aşağıdaki KAP bildirimini/raporunu inceleyerek yatırımcılar için en önemli noktaları (finansal rakamlar, yüzdeler, tarihler, yönetim kararları veya anlaşma detayları) içeren 3-5 maddelik kısa, net, profesyonel Türkçe bir özet çıkar:

${truncatedText}`;

      appEventBus.emitOfficeEvent({
        type: 'AI_SUMMARIZE_TRIGGERED',
        actor: 'AI_SERVICE',
        department: 'KAP',
        status: 'BUSY',
        detail: `KAP şirket bildirimi özetleniyor (${config.provider.toUpperCase()})`,
        payload: { docLength: text.length, engine: config.provider.toUpperCase() }
      });

      try {
        const resultText = await multiLLMService.generateText({
          prompt: systemPrompt,
          systemInstruction: 'Sen kıdemli bir Borsa İstanbul (BIST) ve KAP finansal analistisin. Net ve profesyonel Türkçe maddeli özet hazırla.',
          temperature: 0.2,
        });

        if (resultText && resultText.trim().length > 0) {
          const clean = resultText.trim();
          this.summaryCache.set(cacheKey, clean);
          return clean;
        }
      } catch (err: any) {
        console.warn(`[AIService] MultiLLM generation failed (${config.provider}):`, err.message);
      }

      // Local heuristic fallback
      const localSummary = this.generateLocalFinancialSummary(text);
      const fallbackFormatted = `• 📌 [Akıllı Finansal Çıkarım]:\n${localSummary}`;
      this.summaryCache.set(cacheKey, fallbackFormatted);
      return fallbackFormatted;
    } catch (e: any) {
      console.warn("[AIService] Fallback to local financial summary:", e.message);
      return this.generateLocalFinancialSummary(text);
    }
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
          model: config.geminiModel || 'gemini-2.5-flash',
        };
      } else if (config.provider === 'openai') {
        const apiKey = config.key || (config as any).openaiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) return { success: false, message: "OpenAI API anahtarı girilmedi." };
        activeConfig = {
          provider: 'openai',
          apiKey,
          model: config.openaiModel || 'gpt-4o-mini',
        };
      } else if (config.provider === 'anthropic') {
        const apiKey = config.key || (config as any).anthropicKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return { success: false, message: "Anthropic Claude API anahtarı girilmedi." };
        activeConfig = {
          provider: 'anthropic',
          apiKey,
          model: config.anthropicModel || 'claude-3-5-haiku-20241022',
        };
      } else if (config.provider === 'deepseek') {
        const apiKey = config.key || (config as any).deepseekKey || process.env.DEEPSEEK_API_KEY;
        if (!apiKey) return { success: false, message: "DeepSeek API anahtarı girilmedi." };
        activeConfig = {
          provider: 'deepseek',
          apiKey,
          model: config.deepseekModel || 'deepseek-chat',
        };
      } else if (config.provider === 'groq') {
        const apiKey = config.key || (config as any).groqKey || process.env.GROQ_API_KEY;
        if (!apiKey) return { success: false, message: "Groq API anahtarı girilmedi." };
        activeConfig = {
          provider: 'groq',
          apiKey,
          model: config.groqModel || 'llama-3.3-70b-versatile',
        };
      } else if (config.provider === 'openrouter') {
        const apiKey = config.key || (config as any).openrouterKey || process.env.OPENROUTER_API_KEY;
        if (!apiKey) return { success: false, message: "OpenRouter API anahtarı girilmedi." };
        activeConfig = {
          provider: 'openrouter',
          apiKey,
          model: config.openrouterModel || 'meta-llama/llama-3.1-8b-instruct',
        };
      } else if (config.provider === 'local') {
        activeConfig = {
          provider: 'local',
          endpointUrl: config.localUrl || 'http://localhost:11434/api/generate',
          model: config.localModel || 'llama3',
        };
      } else if (config.provider === '9router') {
        activeConfig = {
          provider: '9router',
          apiKey: config.ninerouterKey || '',
          endpointUrl: config.ninerouterUrl || 'http://localhost:4000/v1/chat/completions',
          model: config.ninerouterModel || 'default',
        };
      } else {
        activeConfig = {
          provider: 'custom',
          apiKey: config.customKey || '',
          endpointUrl: config.customUrl || '',
          model: config.customModel || 'default',
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
    
    if (!config.enabled) {
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
      console.warn('[AIService] AI Batch News Error:', e.message);
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
