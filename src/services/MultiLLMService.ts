import { GoogleGenAI } from '@google/genai';
import { db } from '../db/index.ts';
import { settings } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import axios from 'axios';

export type AIProviderType = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'openrouter' | 'local' | '9router' | 'custom';

export interface LLMConfig {
  provider: AIProviderType;
  model?: string;
  apiKey?: string;
  customEndpoint?: string;
  endpointUrl?: string;
  temperature?: number;
  strict?: boolean;
}

export type ActiveAIConfig = LLMConfig;

export function sanitizeUrlProtocol(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';
  // Check if protocol is missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // If it's a secure tunnel domain or port 443, use https, otherwise http
    if (
      url.includes('ngrok-free.app') || 
      url.includes('trycloudflare.com') || 
      url.includes('loca.lt') || 
      url.includes('tailscale.net')
    ) {
      url = `https://${url}`;
    } else {
      url = `http://${url}`;
    }
  }
  return url;
}

export function normalizeOpenAIEndpoint(rawUrl: string, defaultFallback: string = 'http://localhost:2165/v1/chat/completions'): string {
  let url = (rawUrl || '').trim();
  if (!url) return defaultFallback;

  // Handle bare port numbers like "1234" or "2165"
  if (/^\d{2,5}$/.test(url)) {
    url = `http://localhost:${url}`;
  }

  url = sanitizeUrlProtocol(url);
  url = url.replace(/\/+$/, '');

  if (url.endsWith('/chat/completions')) {
    return url;
  }
  if (url.endsWith('/v1')) {
    return `${url}/chat/completions`;
  }
  if (url.includes('/v1/')) {
    return url;
  }
  return `${url}/v1/chat/completions`;
}

export function normalizeModelsEndpoint(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return 'http://localhost:2165/v1/models';

  if (/^\d{2,5}$/.test(url)) {
    url = `http://localhost:${url}`;
  }

  url = sanitizeUrlProtocol(url);
  url = url.replace(/\/+$/, '');

  if (url.endsWith('/chat/completions')) {
    url = url.replace(/\/chat\/completions$/, '');
  }
  if (url.endsWith('/models')) {
    return url;
  }
  if (url.endsWith('/v1')) {
    return `${url}/models`;
  }
  return `${url}/v1/models`;
}

export function normalizeOllamaEndpoint(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return 'http://localhost:11434/api/generate';

  if (/^\d{2,5}$/.test(url)) {
    url = `http://localhost:${url}`;
  }

  url = sanitizeUrlProtocol(url);
  url = url.replace(/\/+$/, '');

  if (url.endsWith('/api/generate') || url.endsWith('/v1/chat/completions')) {
    return url;
  }
  return `${url}/api/generate`;
}

export class MultiLLMService {
  /**
   * Reads the active LLM provider configuration from settings table (ai_settings or ai_* keys) or env
   */
  async getActiveConfig(): Promise<LLMConfig> {
    try {
      const rows = await db.select().from(settings);
      const map: Record<string, any> = {};
      rows.forEach((r) => {
        map[r.key] = r.value;
      });

      // 1. Check unified ai_settings JSON object (from SettingsTab)
      const aiSettings = map['ai_settings'] || {};
      
      const provider = (
        aiSettings.provider || 
        map['ai_provider']?.value || 
        map['ai_provider'] || 
        'gemini'
      ) as LLMConfig['provider'];

      let model = '';
      let apiKey = '';
      let customEndpoint = '';

      // Direct model override from aiSettings.model takes highest priority
      const savedModel = (aiSettings.model || '').trim();

      if (provider === 'gemini') {
        const candidateModel = savedModel || aiSettings.geminiModel || 'gemini-3.8-flash';
        model = candidateModel === 'gemini-2.5-flash' ? 'gemini-3.8-flash' : candidateModel;
        apiKey = aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.GEMINI_API_KEY || '';
      } else if (provider === 'openai') {
        model = savedModel || aiSettings.openaiModel || 'gpt-4o-mini';
        apiKey = aiSettings.openaiKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.OPENAI_API_KEY || '';
      } else if (provider === 'anthropic') {
        model = savedModel || aiSettings.anthropicModel || 'claude-3-5-sonnet-20241022';
        apiKey = aiSettings.anthropicKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.ANTHROPIC_API_KEY || '';
      } else if (provider === 'deepseek') {
        model = savedModel || aiSettings.deepseekModel || 'deepseek-chat';
        apiKey = aiSettings.deepseekKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.DEEPSEEK_API_KEY || '';
      } else if (provider === 'groq') {
        model = savedModel || aiSettings.groqModel || 'llama-3.3-70b-versatile';
        apiKey = aiSettings.groqKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.GROQ_API_KEY || '';
      } else if (provider === 'openrouter') {
        model = savedModel || aiSettings.openrouterModel || 'meta-llama/llama-3.3-70b-instruct';
        apiKey = aiSettings.openrouterKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.OPENROUTER_API_KEY || '';
      } else if (provider === 'local') {
        model = savedModel || aiSettings.localModel || 'llama3';
        customEndpoint = normalizeOllamaEndpoint(aiSettings.localUrl || map['ai_custom_endpoint']?.value || map['ai_custom_endpoint'] || 'http://localhost:11434/api/generate');
      } else if (provider === '9router') {
        model = savedModel || aiSettings.ninerouterModel || 'default';
        apiKey = aiSettings.ninerouterKey || aiSettings.key || '';
        customEndpoint = normalizeOpenAIEndpoint(aiSettings.ninerouterUrl || map['ai_custom_endpoint']?.value || map['ai_custom_endpoint'] || 'http://localhost:2165/v1/chat/completions');
      } else {
        model = savedModel || aiSettings.customModel || 'default';
        apiKey = aiSettings.customKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || '';
        customEndpoint = normalizeOpenAIEndpoint(aiSettings.customUrl || aiSettings.customEndpoint || map['ai_custom_endpoint']?.value || map['ai_custom_endpoint'] || 'http://localhost:4000/v1/chat/completions');
      }

      // If still empty, fall back to map['ai_model']
      if (!model && map['ai_model']) {
        model = map['ai_model']?.value || map['ai_model'];
      }

      const temperature = parseFloat(aiSettings.temperature || map['ai_temperature']?.value || map['ai_temperature'] || '0.3');

      return {
        provider,
        model: model || 'default',
        apiKey,
        customEndpoint,
        temperature: isNaN(temperature) ? 0.3 : temperature,
      };
    } catch (e) {
      console.warn('[MultiLLMService] Failed to read settings, falling back to gemini:', e);
      return {
        provider: 'gemini',
        model: 'gemini-3.8-flash',
        apiKey: process.env.GEMINI_API_KEY || '',
        temperature: 0.3,
      };
    }
  }

  /**
   * Universal text generation supporting all configured providers & models
   */
  async generateText(
    params: {
      prompt: string;
      systemInstruction?: string;
      temperature?: number;
      strict?: boolean;
      overrideConfig?: Partial<LLMConfig>;
    },
    configOverride?: Partial<LLMConfig>
  ): Promise<string> {
    const baseConfig = await this.getActiveConfig();
    const config = { 
      ...baseConfig, 
      ...(params.overrideConfig || {}), 
      ...(configOverride || {}) 
    };
    if (config.endpointUrl && !config.customEndpoint) {
      config.customEndpoint = config.endpointUrl;
    }
    const temp = params.temperature ?? config.temperature ?? 0.3;
    const isStrict = params.strict || config.strict || false;

    const executeProvider = async (cfg: typeof config) => {
      switch (cfg.provider) {
        case 'openai':
          return await this.callOpenAICompatible({
            endpoint: cfg.customEndpoint || 'https://api.openai.com/v1/chat/completions',
            apiKey: cfg.apiKey || process.env.OPENAI_API_KEY || '',
            model: cfg.model || 'gpt-4o-mini',
            prompt: params.prompt,
            systemInstruction: params.systemInstruction,
            temperature: temp,
          });

        case 'anthropic':
          return await this.callAnthropic({
            apiKey: cfg.apiKey || process.env.ANTHROPIC_API_KEY || '',
            model: cfg.model || 'claude-3-5-sonnet-20241022',
            prompt: params.prompt,
            systemInstruction: params.systemInstruction,
            temperature: temp,
          });

        case 'deepseek':
          return await this.callOpenAICompatible({
            endpoint: 'https://api.deepseek.com/v1/chat/completions',
            apiKey: cfg.apiKey || process.env.DEEPSEEK_API_KEY || '',
            model: cfg.model || 'deepseek-chat',
            prompt: params.prompt,
            systemInstruction: params.systemInstruction,
            temperature: temp,
          });

        case 'groq':
          return await this.callOpenAICompatible({
            endpoint: 'https://api.groq.com/openai/v1/chat/completions',
            apiKey: cfg.apiKey || process.env.GROQ_API_KEY || '',
            model: cfg.model || 'llama-3.3-70b-versatile',
            prompt: params.prompt,
            systemInstruction: params.systemInstruction,
            temperature: temp,
          });

        case 'openrouter':
          return await this.callOpenAICompatible({
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
            apiKey: cfg.apiKey || process.env.OPENROUTER_API_KEY || '',
            model: cfg.model || 'meta-llama/llama-3.3-70b-instruct',
            prompt: params.prompt,
            systemInstruction: params.systemInstruction,
            temperature: temp,
            extraHeaders: {
              'HTTP-Referer': 'https://aistudio.google.com',
              'X-Title': 'Financial Dashboard',
            }
          });

        case 'local':
          return await this.callLocalOllama({
            endpoint: cfg.customEndpoint || 'http://localhost:11434/api/generate',
            model: cfg.model || 'llama3',
            prompt: params.prompt,
            systemInstruction: params.systemInstruction,
            temperature: temp,
          });

        case '9router':
        case 'custom':
          return await this.callOpenAICompatible({
            endpoint: normalizeOpenAIEndpoint(cfg.customEndpoint || (cfg.provider === '9router' ? 'http://localhost:2165/v1/chat/completions' : 'http://localhost:4000/v1/chat/completions')),
            apiKey: cfg.apiKey || 'dummy',
            model: cfg.model || 'default',
            prompt: params.prompt,
            systemInstruction: params.systemInstruction,
            temperature: temp,
          });

        case 'gemini':
        default:
          return await this.callGemini({
            apiKey: cfg.apiKey || process.env.GEMINI_API_KEY || '',
            model: cfg.model || 'gemini-3.8-flash',
            prompt: params.prompt,
            systemInstruction: params.systemInstruction,
            temperature: temp,
          });
      }
    };

    try {
      return await executeProvider(config);
    } catch (err: any) {
      if (isStrict) {
        throw err;
      }

      // Resilient automatic failover to Google Gemini
      if (config.provider !== 'gemini' && process.env.GEMINI_API_KEY) {
        console.warn(`[MultiLLMService] Sağlayıcı '${config.provider}' başarısız oldu (${err.message}). Otomatik Gemini yedek motoruna geçiliyor...`);
        try {
          return await this.callGemini({
            apiKey: process.env.GEMINI_API_KEY,
            model: 'gemini-3.8-flash',
            prompt: params.prompt,
            systemInstruction: params.systemInstruction,
            temperature: temp,
          });
        } catch (geminiErr: any) {
          console.error('[MultiLLMService] Gemini yedek motoru da başarısız oldu:', geminiErr.message);
          throw err;
        }
      }

      throw err;
    }
  }

  private async callGemini(params: {
    apiKey: string;
    model: string;
    prompt: string;
    systemInstruction?: string;
    temperature: number;
  }): Promise<string> {
    const key = params.apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Gemini API anahtarı yapılandırılmamış. Lütfen Ayarlar sayfasından anahtarınızı girin.');
    }
    const ai = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Quota and model fallback resilience:
    // Try requested model first, then alternate official Gemini models if quota 429 occurs
    const requested = (params.model || '').trim();
    const primary = (requested && requested !== 'default' && requested !== 'gemini-2.5-flash') 
      ? requested 
      : 'gemini-3.8-flash';

    const fallbackList = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
    const modelsToTry: string[] = [primary];
    for (const fb of fallbackList) {
      if (!modelsToTry.includes(fb)) {
        modelsToTry.push(fb);
      }
    }

    let lastErr: any = null;
    for (const currentModel of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: params.prompt,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature,
          },
        });
        if (currentModel !== primary) {
          console.log(`[MultiLLMService] Gemini model '${primary}' yerine kota yedeği '${currentModel}' başarıyla çalıştı.`);
        }
        return response.text || 'Yanıt alınamadı.';
      } catch (err: any) {
        lastErr = err;
        const errMsg = err?.message || String(err);
        const isRetryable = errMsg.includes('429') || 
                            errMsg.includes('RESOURCE_EXHAUSTED') || 
                            errMsg.includes('Quota exceeded') ||
                            errMsg.includes('rate limit') ||
                            errMsg.includes('503') ||
                            errMsg.includes('UNAVAILABLE') ||
                            errMsg.includes('high demand');
        if (isRetryable) {
          console.warn(`[MultiLLMService] Gemini model '${currentModel}' geçici olarak erişilemez veya kota sınırında (429/503), bir sonraki model deneniyor...`);
          continue;
        }
        throw err;
      }
    }

    throw lastErr;
  }

  private async callOpenAICompatible(params: {
    endpoint: string;
    apiKey: string;
    model: string;
    prompt: string;
    systemInstruction?: string;
    temperature: number;
    extraHeaders?: Record<string, string>;
  }): Promise<string> {
    const normEndpoint = normalizeOpenAIEndpoint(params.endpoint);

    // Only strictly require API key if using commercial public APIs like OpenAI, Groq, DeepSeek, OpenRouter
    const isPublicCloudApi = normEndpoint.includes('api.openai.com') ||
      normEndpoint.includes('api.groq.com') ||
      normEndpoint.includes('api.deepseek.com') ||
      normEndpoint.includes('openrouter.ai');

    if (isPublicCloudApi && !params.apiKey) {
      throw new Error(`${normEndpoint} için API anahtarı belirtilmemiş. Lütfen Ayarlar sayfasından anahtarınızı girin.`);
    }

    const messages = [];
    if (params.systemInstruction) {
      messages.push({ role: 'system', content: params.systemInstruction });
    }
    messages.push({ role: 'user', content: params.prompt });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(params.extraHeaders || {})
    };
    if (params.apiKey && params.apiKey.trim() !== '') {
      headers['Authorization'] = params.apiKey.startsWith('Bearer ') ? params.apiKey.trim() : `Bearer ${params.apiKey.trim()}`;
    }

    try {
      const res = await axios.post(
        normEndpoint,
        {
          model: params.model,
          messages,
          temperature: params.temperature,
        },
        {
          headers,
          timeout: 60000,
        }
      );

      const text = res.data?.choices?.[0]?.message?.content;
      return text || 'Boş yanıt döndü.';
    } catch (err: any) {
      const apiMsg = err.response?.data?.error?.message || err.response?.data?.error || err.response?.data?.message;
      const status = err.response?.status;

      if (status === 401 || status === 403) {
        throw new Error(`${params.model} (${normEndpoint}) yetkilendirme hatası (HTTP ${status}): API Anahtarı geçersiz veya eksik.`);
      }
      if (status === 404) {
        throw new Error(`${normEndpoint} uç noktası bulunamadı (HTTP 404). Lütfen port linkinin sonundaki '/v1/chat/completions' yolunu ve model adını (${params.model}) kontrol edin.`);
      }
      if (status === 429) {
        throw new Error(`${params.model} hız / bakiye sınırı hatası (HTTP 429): API sağlayıcısında bakiye yetersiz veya istek limiti aşıldı.`);
      }
      if (apiMsg) {
        throw new Error(`${params.model} (${normEndpoint}) hatası: ${typeof apiMsg === 'object' ? JSON.stringify(apiMsg) : apiMsg}`);
      }
      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        const isLocalHost = normEndpoint.includes('localhost') || normEndpoint.includes('127.0.0.1');
        if (isLocalHost) {
          throw new Error(
            `${normEndpoint} adresine bağlanılamadı (Bağlantı Reddedildi - ECONNREFUSED). ` +
            `DİKKAT: Uygulama bulut sunucusunda (Cloud Run) çalıştığı için 'localhost' kendi içine bakar, sizin bilgisayarınıza ulaşamaz. ` +
            `Kendi bilgisayarınızdaki LLM servisini bağlamak için Ngrok (ngrok http <port>) veya Cloudflare Tunnel (cloudflared tunnel --url http://localhost:<port>) tünel URL'sini girmelisiniz.`
          );
        }
        throw new Error(`${normEndpoint} adresine bağlanılamadı (ECONNREFUSED). Sunucu kapalı veya belirtilen portta dinleme yapmıyor.`);
      }
      if (err.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
        throw new Error(`${normEndpoint} ana bilgisayar adı çözümlenemedi (ENOTFOUND DNS Hatası). URL yazımını kontrol ediniz.`);
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error(`${normEndpoint} 60 saniye içinde yanıt vermedi (Zaman Aşımı / Timeout). Model belleğe yüklenirken gecikiyor olabilir.`);
      }
      throw err;
    }
  }

  private async callAnthropic(params: {
    apiKey: string;
    model: string;
    prompt: string;
    systemInstruction?: string;
    temperature: number;
  }): Promise<string> {
    if (!params.apiKey) {
      throw new Error('Anthropic API anahtarı belirtilmemiş. Lütfen Ayarlar sayfasından Anthropic API anahtarınızı girin.');
    }

    try {
      const res = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: params.model,
          max_tokens: 4096,
          system: params.systemInstruction,
          messages: [{ role: 'user', content: params.prompt }],
          temperature: params.temperature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': params.apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 30000,
        }
      );

      const block = res.data?.content?.[0];
      return block?.text || 'Boş yanıt döndü.';
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error('Anthropic servisi zaman aşımına uğradı.');
      }
      throw err;
    }
  }

  private async callLocalOllama(params: {
    endpoint: string;
    model: string;
    prompt: string;
    systemInstruction?: string;
    temperature: number;
  }): Promise<string> {
    const normEndpoint = normalizeOllamaEndpoint(params.endpoint);
    const fullPrompt = params.systemInstruction 
      ? `System: ${params.systemInstruction}\n\nUser: ${params.prompt}` 
      : params.prompt;

    try {
      const res = await axios.post(
        normEndpoint,
        {
          model: params.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: params.temperature,
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000,
        }
      );

      return res.data?.response || res.data?.message?.content || 'Boş yanıt döndü.';
    } catch (err: any) {
      const apiMsg = err.response?.data?.error || err.response?.data?.message;
      const status = err.response?.status;

      if (status === 404) {
        throw new Error(`${normEndpoint} adresinde '${params.model}' modeli bulunamadı (HTTP 404). Lütfen 'ollama list' veya 'ollama pull ${params.model}' komutuyla modelin bilgisayarınızda yüklü olduğunu kontrol edin.`);
      }
      if (apiMsg) {
        throw new Error(`Ollama (${params.model}) hatası: ${typeof apiMsg === 'object' ? JSON.stringify(apiMsg) : apiMsg}`);
      }
      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        const isLocalHost = normEndpoint.includes('localhost') || normEndpoint.includes('127.0.0.1');
        if (isLocalHost) {
          throw new Error(
            `${normEndpoint} yerel Ollama servisine bağlanılamadı (ECONNREFUSED). ` +
            `DİKKAT: Uygulama bulut konteynerinde çalıştığından 'localhost' sunucunun kendi içine bakar, yerel bilgisayarınızdaki Ollama'ya ulaşamaz. ` +
            `Ollama'nızı bağlamak için Cloudflare Tunnel (cloudflared tunnel --url http://localhost:11434) veya Ngrok (ngrok http 11434) URL'si kullanınız. Ayrıca terminalde OLLAMA_ORIGINS="*" ve OLLAMA_HOST="0.0.0.0" ayarlandığından emin olunuz.`
          );
        }
        throw new Error(`${normEndpoint} yerel Ollama servisine bağlanılamadı (ECONNREFUSED). Ollama servisinin açık olduğundan emin olun.`);
      }
      if (err.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
        throw new Error(`${normEndpoint} adresi çözümlenemedi (ENOTFOUND). Tünel veya IP adresinizi kontrol ediniz.`);
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error(`${normEndpoint} yerel Ollama servisi 60 saniye içinde yanıt vermedi (Zaman aşımı). Model RAM/VRAM'e yüklenirken gecikmiş olabilir.`);
      }
      throw err;
    }
  }

  /**
   * Dynamically fetch accessible models for a provider or return curated presets
   */
  async fetchAvailableModels(params: {
    provider: AIProviderType;
    endpointUrl?: string;
    apiKey?: string;
  }): Promise<{ success: boolean; models: string[]; message?: string; source: 'live' | 'preset' }> {
    const { provider, endpointUrl, apiKey } = params;

    const PRESETS: Record<string, string[]> = {
      gemini: [
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.5-pro'
      ],
      openai: [
        'gpt-4o-mini',
        'gpt-4o',
        'o3-mini',
        'o1',
        'o1-mini',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
      ],
      anthropic: [
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229'
      ],
      deepseek: [
        'deepseek-chat',
        'deepseek-reasoner'
      ],
      groq: [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'deepseek-r1-distill-llama-70b',
        'mixtral-8x7b-32768',
        'gemma2-9b-it'
      ],
      openrouter: [
        'meta-llama/llama-3.3-70b-instruct',
        'meta-llama/llama-3.1-8b-instruct',
        'deepseek/deepseek-r1',
        'deepseek/deepseek-chat',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3.7-sonnet',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'google/gemini-2.0-flash-001',
        'qwen/qwen-2.5-72b-instruct',
        'mistralai/mistral-large-2411'
      ],
      local: [
        'llama3',
        'llama3.1',
        'llama3.2',
        'mistral',
        'qwen2.5',
        'deepseek-r1',
        'phi3',
        'gemma2'
      ],
      '9router': [
        'gpt-4o',
        'gpt-4o-mini',
        'claude-3-5-sonnet',
        'deepseek-chat',
        'deepseek-r1',
        'llama-3.3-70b',
        'gemini-2.5-flash',
        'default'
      ],
      custom: [
        'default',
        'gpt-4o',
        'gpt-4o-mini',
        'llama-3.3-70b'
      ]
    };

    try {
      if (provider === '9router' || provider === 'custom') {
        const rawUrl = endpointUrl || (provider === '9router' ? 'http://localhost:2165/v1/chat/completions' : 'http://localhost:4000/v1/chat/completions');
        const modelsUrl = normalizeModelsEndpoint(rawUrl);
        const isLocalHost = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
        const timeoutMs = isLocalHost ? 2500 : 8000;
        const headers: Record<string, string> = {};
        if (apiKey && apiKey.trim()) {
          headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey.trim() : `Bearer ${apiKey.trim()}`;
        }

        let res;
        try {
          res = await axios.get(modelsUrl, { headers, timeout: timeoutMs });
        } catch (e1: any) {
          const fallbackUrl = rawUrl.replace(/\/chat\/completions$/, '').replace(/\/v1$/, '') + '/models';
          if (fallbackUrl !== modelsUrl) {
            res = await axios.get(fallbackUrl, { headers, timeout: timeoutMs });
          } else {
            throw e1;
          }
        }

        let modelList: string[] = [];
        if (Array.isArray(res.data?.data)) {
          modelList = res.data.data.map((m: any) => typeof m === 'string' ? m : m.id || m.name).filter(Boolean);
        } else if (Array.isArray(res.data?.models)) {
          modelList = res.data.models.map((m: any) => typeof m === 'string' ? m : m.id || m.name).filter(Boolean);
        } else if (Array.isArray(res.data)) {
          modelList = res.data.map((m: any) => typeof m === 'string' ? m : m.id || m.name).filter(Boolean);
        }

        if (modelList.length > 0) {
          return {
            success: true,
            models: Array.from(new Set(modelList)),
            message: `${modelList.length} model proxy sunucusundan başarıyla getirildi.`,
            source: 'live'
          };
        }
      } else if (provider === 'local') {
        const rawUrl = endpointUrl || 'http://localhost:11434/api/generate';
        const baseUrl = rawUrl.replace(/\/api\/generate$/, '').replace(/\/v1\/chat\/completions$/, '').replace(/\/+$/, '');
        const isLocalHost = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
        const timeoutMs = isLocalHost ? 2500 : 8000;
        
        let modelList: string[] = [];
        try {
          const res = await axios.get(`${baseUrl}/api/tags`, { timeout: timeoutMs });
          if (Array.isArray(res.data?.models)) {
            modelList = res.data.models.map((m: any) => m.name || m.model).filter(Boolean);
          }
        } catch {
          try {
            const res2 = await axios.get(`${baseUrl}/v1/models`, { timeout: timeoutMs });
            if (Array.isArray(res2.data?.data)) {
              modelList = res2.data.data.map((m: any) => m.id || m.name).filter(Boolean);
            }
          } catch {}
        }

        if (modelList.length > 0) {
          return {
            success: true,
            models: Array.from(new Set(modelList)),
            message: `${modelList.length} yerel model bulundu.`,
            source: 'live'
          };
        }
      } else if (provider === 'openrouter') {
        const headers: Record<string, string> = {};
        if (apiKey && apiKey.trim()) {
          headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        }
        const res = await axios.get('https://openrouter.ai/api/v1/models', { headers, timeout: 10000 });
        if (Array.isArray(res.data?.data)) {
          const allIds: string[] = res.data.data.map((m: any) => m.id).filter(Boolean);
          const popular = PRESETS.openrouter.filter(id => allIds.includes(id));
          const others = allIds.filter(id => !PRESETS.openrouter.includes(id)).sort();
          return {
            success: true,
            models: [...popular, ...others],
            message: `${allIds.length} OpenRouter modeli listelendi.`,
            source: 'live'
          };
        }
      } else if (provider === 'openai' && apiKey) {
        const res = await axios.get('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey.trim()}` },
          timeout: 10000
        });
        if (Array.isArray(res.data?.data)) {
          const gptModels = res.data.data
            .map((m: any) => m.id)
            .filter((id: string) => id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('chatgpt'))
            .sort();
          return {
            success: true,
            models: Array.from(new Set([...PRESETS.openai, ...gptModels])),
            message: `${gptModels.length} OpenAI modeli bulundu.`,
            source: 'live'
          };
        }
      } else if (provider === 'groq' && apiKey) {
        const res = await axios.get('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey.trim()}` },
          timeout: 10000
        });
        if (Array.isArray(res.data?.data)) {
          const groqModels = res.data.data.map((m: any) => m.id).sort();
          return {
            success: true,
            models: Array.from(new Set([...PRESETS.groq, ...groqModels])),
            message: `${groqModels.length} Groq modeli bulundu.`,
            source: 'live'
          };
        }
      }
    } catch (err: any) {
      const isConnError = err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED') || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT';
      if (!isConnError) {
        console.warn(`[MultiLLMService] Live model fetch failed for ${provider}:`, err.message);
      }
      return {
        success: false,
        models: PRESETS[provider] || ['default'],
        message: isConnError 
          ? `Yerel ${provider} servisine bağlanılamadı (${endpointUrl || 'localhost'}). Önerilen varsayılan modeller yüklendi.`
          : `Canlı model listesi alırken hata oluştu (${err.message}). Önerilen modeller listelendi.`,
        source: 'preset'
      };
    }

    return {
      success: true,
      models: PRESETS[provider] || ['default'],
      message: 'Önerilen modeller listelendi.',
      source: 'preset'
    };
  }
}

export const multiLLMService = new MultiLLMService();
