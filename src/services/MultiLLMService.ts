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
}

export type ActiveAIConfig = LLMConfig;

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

      if (provider === 'gemini') {
        model = aiSettings.geminiModel || map['ai_model']?.value || map['ai_model'] || 'gemini-2.5-flash';
        apiKey = aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.GEMINI_API_KEY || '';
      } else if (provider === 'openai') {
        model = aiSettings.openaiModel || map['ai_model']?.value || map['ai_model'] || 'gpt-4o-mini';
        apiKey = aiSettings.openaiKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.OPENAI_API_KEY || '';
      } else if (provider === 'anthropic') {
        model = aiSettings.anthropicModel || map['ai_model']?.value || map['ai_model'] || 'claude-3-5-sonnet-20241022';
        apiKey = aiSettings.anthropicKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.ANTHROPIC_API_KEY || '';
      } else if (provider === 'deepseek') {
        model = aiSettings.deepseekModel || map['ai_model']?.value || map['ai_model'] || 'deepseek-chat';
        apiKey = aiSettings.deepseekKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.DEEPSEEK_API_KEY || '';
      } else if (provider === 'groq') {
        model = aiSettings.groqModel || map['ai_model']?.value || map['ai_model'] || 'llama-3.3-70b-versatile';
        apiKey = aiSettings.groqKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.GROQ_API_KEY || '';
      } else if (provider === 'openrouter') {
        model = aiSettings.openrouterModel || map['ai_model']?.value || map['ai_model'] || 'meta-llama/llama-3.3-70b-instruct';
        apiKey = aiSettings.openrouterKey || aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || process.env.OPENROUTER_API_KEY || '';
      } else if (provider === 'local') {
        model = aiSettings.localModel || map['ai_model']?.value || map['ai_model'] || 'llama3';
        customEndpoint = aiSettings.localUrl || map['ai_custom_endpoint']?.value || map['ai_custom_endpoint'] || 'http://localhost:11434/api/generate';
      } else if (provider === '9router') {
        model = aiSettings.ninerouterModel || 'default';
        apiKey = aiSettings.ninerouterKey || '';
        customEndpoint = aiSettings.ninerouterUrl || 'http://localhost:4000/v1/chat/completions';
      } else {
        model = aiSettings.customModel || map['ai_model']?.value || map['ai_model'] || 'default';
        apiKey = aiSettings.key || map['ai_api_key']?.value || map['ai_api_key'] || '';
        customEndpoint = aiSettings.customEndpoint || map['ai_custom_endpoint']?.value || map['ai_custom_endpoint'] || 'http://localhost:11434/v1/chat/completions';
      }

      const temperature = parseFloat(aiSettings.temperature || map['ai_temperature']?.value || map['ai_temperature'] || '0.3');

      return {
        provider,
        model,
        apiKey,
        customEndpoint,
        temperature: isNaN(temperature) ? 0.3 : temperature,
      };
    } catch (e) {
      console.warn('[MultiLLMService] Failed to read settings, falling back to gemini:', e);
      return {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
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

    switch (config.provider) {
      case 'openai':
        return this.callOpenAICompatible({
          endpoint: config.customEndpoint || 'https://api.openai.com/v1/chat/completions',
          apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
          model: config.model || 'gpt-4o-mini',
          prompt: params.prompt,
          systemInstruction: params.systemInstruction,
          temperature: temp,
        });

      case 'anthropic':
        return this.callAnthropic({
          apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
          model: config.model || 'claude-3-5-sonnet-20241022',
          prompt: params.prompt,
          systemInstruction: params.systemInstruction,
          temperature: temp,
        });

      case 'deepseek':
        return this.callOpenAICompatible({
          endpoint: 'https://api.deepseek.com/v1/chat/completions',
          apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY || '',
          model: config.model || 'deepseek-chat',
          prompt: params.prompt,
          systemInstruction: params.systemInstruction,
          temperature: temp,
        });

      case 'groq':
        return this.callOpenAICompatible({
          endpoint: 'https://api.groq.com/openai/v1/chat/completions',
          apiKey: config.apiKey || process.env.GROQ_API_KEY || '',
          model: config.model || 'llama-3.3-70b-versatile',
          prompt: params.prompt,
          systemInstruction: params.systemInstruction,
          temperature: temp,
        });

      case 'openrouter':
        return this.callOpenAICompatible({
          endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          apiKey: config.apiKey || process.env.OPENROUTER_API_KEY || '',
          model: config.model || 'meta-llama/llama-3.3-70b-instruct',
          prompt: params.prompt,
          systemInstruction: params.systemInstruction,
          temperature: temp,
          extraHeaders: {
            'HTTP-Referer': 'https://aistudio.google.com',
            'X-Title': 'Financial Dashboard',
          }
        });

      case 'local':
        return this.callLocalOllama({
          endpoint: config.customEndpoint || 'http://localhost:11434/api/generate',
          model: config.model || 'llama3',
          prompt: params.prompt,
          systemInstruction: params.systemInstruction,
          temperature: temp,
        });

      case '9router':
      case 'custom':
        return this.callOpenAICompatible({
          endpoint: config.customEndpoint || 'http://localhost:4000/v1/chat/completions',
          apiKey: config.apiKey || 'dummy',
          model: config.model || 'default',
          prompt: params.prompt,
          systemInstruction: params.systemInstruction,
          temperature: temp,
        });

      case 'gemini':
      default:
        return this.callGemini({
          apiKey: config.apiKey || process.env.GEMINI_API_KEY || '',
          model: config.model || 'gemini-2.5-flash',
          prompt: params.prompt,
          systemInstruction: params.systemInstruction,
          temperature: temp,
        });
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
    const response = await ai.models.generateContent({
      model: params.model || 'gemini-2.5-flash',
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature,
      },
    });
    return response.text || 'Yanıt alınamadı.';
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
    if (!params.apiKey && !params.endpoint.includes('localhost')) {
      throw new Error(`${params.endpoint} için API anahtarı belirtilmemiş. Lütfen Ayarlar sayfasından anahtarınızı girin.`);
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
    if (params.apiKey) {
      headers['Authorization'] = `Bearer ${params.apiKey}`;
    }

    const res = await axios.post(
      params.endpoint,
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
        timeout: 60000,
      }
    );

    const block = res.data?.content?.[0];
    return block?.text || 'Boş yanıt döndü.';
  }

  private async callLocalOllama(params: {
    endpoint: string;
    model: string;
    prompt: string;
    systemInstruction?: string;
    temperature: number;
  }): Promise<string> {
    const fullPrompt = params.systemInstruction 
      ? `System: ${params.systemInstruction}\n\nUser: ${params.prompt}` 
      : params.prompt;

    const res = await axios.post(
      params.endpoint,
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
  }
}

export const multiLLMService = new MultiLLMService();
