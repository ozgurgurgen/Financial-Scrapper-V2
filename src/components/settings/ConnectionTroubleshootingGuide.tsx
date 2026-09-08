import React, { useState } from 'react';
import { 
  HelpCircle, ChevronDown, ChevronUp, Copy, Check, Terminal, ExternalLink, 
  AlertTriangle, Network, Server, Cpu, Database, Key, ShieldAlert, Zap, Globe, Sparkles 
} from 'lucide-react';

interface GuideCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
}

export default function ConnectionTroubleshootingGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<'local_llm' | 'cloud_llm' | 'local_db' | '9router'>('local_llm');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const categories: GuideCategory[] = [
    { 
      id: 'local_llm', 
      title: 'Yerel LLM (Ollama & LM Studio)', 
      icon: Cpu, 
      badge: 'Port & Tünel', 
      badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' 
    },
    { 
      id: '9router', 
      title: '9router & Özel Proxy', 
      icon: Network, 
      badge: 'Proxy Endpoint', 
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' 
    },
    { 
      id: 'cloud_llm', 
      title: 'Bulut LLM Sağlayıcıları', 
      icon: Key, 
      badge: 'API Keys', 
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' 
    },
    { 
      id: 'local_db', 
      title: 'Local & Cloud PostgreSQL', 
      icon: Database, 
      badge: 'Connection String', 
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' 
    },
  ];

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 rounded-2xl overflow-hidden shadow-xs transition-all">
      {/* Header Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50 shrink-0">
            <HelpCircle size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                Bağlantı & Port Hata Kılavuzu (Local LLM & Database Rehberi)
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                Detaylı Rehber
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Local LLM port linkleri neden reddedilir? Hangi formatta link isteniyor? Local DB ve API anahtarı gereksinimleri.
            </p>
          </div>
        </div>
        <div className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expandable Guide Body */}
      {isOpen && (
        <div className="p-5 md:p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-6">
          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeGuide === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveGuide(cat.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <Icon size={14} />
                  <span>{cat.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isActive ? 'bg-white/20 text-white dark:bg-black/20 dark:text-neutral-900' : cat.badgeColor}`}>
                    {cat.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 1. YEREL LLM (Ollama & LM Studio) REHBERİ */}
          {activeGuide === 'local_llm' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Critical Core Reason Alert */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle size={18} className="shrink-0 text-amber-600" />
                  Neden "http://localhost:11434" Bağlantısı Reddediliyor / Kabul Edilmiyor?
                </div>
                <p>
                  <strong>Temel Ağ Mantığı:</strong> Bu web uygulaması <strong>Google Cloud (Cloud Run)</strong> sunucularında güvenli bir konteyner içinde çalışır. Siz <code>localhost</code> veya <code>127.0.0.1</code> yazdığınızda, bulut sunucusu <strong>kendi içine</strong> bakar; internet üzerinden sizin evinizdeki veya ofisinizdeki kişisel bilgisayarınızın iç döngüsüne (loopback) <u>fiziksel olarak doğrudan erişemez</u>.
                </p>
                <p>
                  Bu sebeple yerel bilgisayarınızdaki Ollama veya LM Studio'ya erişebilmek için <strong>Tünel Adresi (Tunnel URL)</strong> veya <strong>Statik IP</strong> gereklidir.
                </p>
              </div>

              {/* Exact Expected Formats */}
              <div className="bg-white dark:bg-neutral-800/80 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-4">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <Zap size={16} className="text-teal-600" />
                  Sistem Tam Olarak Nasıl Bir Port Linki İstiyor?
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700/70 space-y-1.5">
                    <div className="font-bold text-teal-700 dark:text-teal-300">Ollama Standart Formatı</div>
                    <code className="block p-2 bg-neutral-100 dark:bg-neutral-950 font-mono text-[11px] rounded text-neutral-800 dark:text-neutral-200 break-all select-all">
                      https://xxxx.trycloudflare.com/api/generate
                    </code>
                    <p className="text-[11px] text-neutral-500">
                      Sonunda <code>/api/generate</code> yolu olmalıdır (sistem otomatik tamamlar).
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700/70 space-y-1.5">
                    <div className="font-bold text-teal-700 dark:text-teal-300">LM Studio / vLLM Formatı</div>
                    <code className="block p-2 bg-neutral-100 dark:bg-neutral-950 font-mono text-[11px] rounded text-neutral-800 dark:text-neutral-200 break-all select-all">
                      https://xxxx.trycloudflare.com/v1/chat/completions
                    </code>
                    <p className="text-[11px] text-neutral-500">
                      OpenAI uyumlu <code>/v1/chat/completions</code> yolu kullanılır.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Steps Tunneling Guide */}
              <div className="bg-white dark:bg-neutral-800/80 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-4">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <Terminal size={16} className="text-blue-600" />
                  Kendi Bilgisayarınızdaki Ollama'yı 10 Saniyede Bağlama (Ücretsiz)
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <div className="flex-1 space-y-1.5">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-200">
                        Ollama'yı Dış Bağlantılara ve CORS'a Açın (Terminalinizde Çalıştırın):
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-neutral-900 text-emerald-400 font-mono text-[11px] rounded-lg">
                          OLLAMA_ORIGINS="*" OLLAMA_HOST="0.0.0.0" ollama serve
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('OLLAMA_ORIGINS="*" OLLAMA_HOST="0.0.0.0" ollama serve', 'ollama_serve')}
                          className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg hover:bg-neutral-300 text-neutral-700 dark:text-neutral-200"
                          title="Kopyala"
                        >
                          {copiedKey === 'ollama_serve' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        (Windows PowerShell için: <code>$env:OLLAMA_ORIGINS="*"; $env:OLLAMA_HOST="0.0.0.0"; ollama serve</code>)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <div className="flex-1 space-y-1.5">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-200">
                        Ücretsiz Tünel Başlatın (Cloudflare veya Ngrok):
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-neutral-900 text-teal-300 font-mono text-[11px] rounded-lg">
                          cloudflared tunnel --url http://localhost:11434
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('cloudflared tunnel --url http://localhost:11434', 'cf_ollama')}
                          className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg hover:bg-neutral-300 text-neutral-700 dark:text-neutral-200"
                          title="Kopyala"
                        >
                          {copiedKey === 'cf_ollama' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Alternatif Ngrok: <code>ngrok http 11434</code> veya <code>npx localtunnel --port 11434</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-200">
                        Üretilen HTTPS Linkini Ayarlar Kutusuna Yapıştırıp "Modelleri Tara" Butonuna Basın:
                      </div>
                      <p className="text-neutral-500 text-[11px]">
                        Örn: <code>https://example-random-subdomain.trycloudflare.com</code> linkini yapıştırdığınızda kurulu <code>llama3</code>, <code>mistral</code>, <code>deepseek-r1</code> vb. modeller otomatik olarak taranır ve model listesine yüklenir.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. 9ROUTER & ÖZEL PROXY REHBERİ */}
          {activeGuide === '9router' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-2">
                <div className="font-bold text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <Network size={16} /> 9router Proxy Bağlantı Gereksinimleri
                </div>
                <p>
                  9router, birden fazla AI modelini (Claude, GPT-4o, DeepSeek, Llama vb.) tek bir OpenAI uyumlu uç noktada toplayan yerel bir proxy sunucusudur.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div className="font-bold text-neutral-900 dark:text-white">İstenen Link Formatı</div>
                  <code className="block p-2 bg-neutral-100 dark:bg-neutral-950 font-mono text-[11px] rounded text-neutral-800 dark:text-neutral-200 break-all">
                    http://localhost:2165/v1/chat/completions
                  </code>
                  <p className="text-neutral-500 text-[11px]">
                    Buluttan kendi 9router'ınıza bağlanırken: <code>https://tünel-adresi.trycloudflare.com/v1/chat/completions</code>
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div className="font-bold text-neutral-900 dark:text-white">9router Tünelleme Komutu</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-neutral-900 text-rose-400 font-mono text-[11px] rounded">
                      cloudflared tunnel --url http://localhost:2165
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('cloudflared tunnel --url http://localhost:2165', 'cf_9router')}
                      className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded hover:bg-neutral-300"
                    >
                      {copiedKey === 'cf_9router' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. BULUT LLM SAĞLAYICILARI REHBERİ */}
          {activeGuide === 'cloud_llm' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                    <span>Google Gemini</span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">Varsayılan</span>
                  </div>
                  <p className="text-neutral-500">API Key Formatı: <code>AIzaSy...</code> (Boş bırakılırsa dahili AI Studio anahtarı kullanılır)</p>
                  <p className="text-neutral-400 text-[11px]">Önerilen Model: <code>gemini-3.8-flash</code></p>
                </div>

                <div className="p-3.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white">OpenAI</div>
                  <p className="text-neutral-500">API Key Formatı: <code>sk-proj-...</code> veya <code>sk-...</code></p>
                  <p className="text-neutral-400 text-[11px]">Önerilen Model: <code>gpt-4o-mini</code>, <code>gpt-4o</code></p>
                </div>

                <div className="p-3.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white">Anthropic Claude</div>
                  <p className="text-neutral-500">API Key Formatı: <code>sk-ant-api03-...</code></p>
                  <p className="text-neutral-400 text-[11px]">Önerilen Model: <code>claude-3-5-haiku-20241022</code>, <code>claude-3-5-sonnet-20241022</code></p>
                </div>

                <div className="p-3.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white">DeepSeek & Groq</div>
                  <p className="text-neutral-500">DeepSeek: <code>sk-...</code> | Groq: <code>gsk_...</code></p>
                  <p className="text-neutral-400 text-[11px]">Yüksek hızlı ve ekonomik finans analizi için idealdir.</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. VERİTABANI (Local & Cloud PostgreSQL) REHBERİ */}
          {activeGuide === 'local_db' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 space-y-2">
                <div className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Database size={16} /> PostgreSQL Connection String Formatı & Gereksinimleri
                </div>
                <p>
                  Veritabanı bağlantısı için standart PostgreSQL URI bağlantı dizesi gereklidir.
                </p>
              </div>

              <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="font-bold text-neutral-900 dark:text-white">İstenen Connection String Şeması:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2.5 bg-neutral-900 text-emerald-400 font-mono text-[11px] rounded-lg break-all">
                    postgresql://[KULLANICI]:[ŞİFRE]@[SUNUCU_IP_VEYA_HOST]:[PORT]/[VERİTABANI_ADI]?sslmode=require
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('postgresql://postgres:parola@localhost:5432/finance_db', 'pg_str')}
                    className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg hover:bg-neutral-300 text-neutral-700 dark:text-neutral-200"
                    title="Örnek Kopyala"
                  >
                    {copiedKey === 'pg_str' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Kendi Yerel PostgreSQL Sunucunuzu Bağlama:
                  </div>
                  <p className="text-neutral-500">
                    Tıpkı LLM gibi, bulut sunucusundan evdeki <code>localhost:5432</code> portuna doğrudan ulaşılamaz. Kendi yerel PostgreSQL'inizi bağlamak için <code>ngrok tcp 5432</code> tüneli açabilir veya ücretsiz <strong>Neon / Supabase</strong> gibi bir bulut PostgreSQL veritabanı adresi girebilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
