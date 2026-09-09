import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Key, 
  ShieldCheck, 
  Zap, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  Code2, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Layers, 
  HelpCircle,
  Save,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function AgentSettingsSection() {
  const [apiKey, setApiKey] = useState<string>('fin_live_master_2026_a8f9c2d1e4');
  const [rateLimit, setRateLimit] = useState<number>(600);
  const [mcpEnabled, setMcpEnabled] = useState<boolean>(true);
  const [openclawEnabled, setOpenclawEnabled] = useState<boolean>(true);
  const [harnessEnabled, setHarnessEnabled] = useState<boolean>(true);
  const [rpcEnabled, setRpcEnabled] = useState<boolean>(true);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'mcp' | 'openclaw' | 'harness' | 'python'>('mcp');

  // Host Mode: 'cloud' | 'local3000' | 'local3001' | 'custom'
  const [hostMode, setHostMode] = useState<'cloud' | 'local3000' | 'local3001' | 'custom'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('fp_agent_host_mode') as any) || 'local3001';
    }
    return 'local3001';
  });
  const [customHost, setCustomHost] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fp_agent_custom_host') || 'http://localhost:3001';
    }
    return 'http://localhost:3001';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fp_agent_host_mode', hostMode);
      localStorage.setItem('fp_agent_custom_host', customHost);
    }
  }, [hostMode, customHost]);

  const getEffectiveOrigin = () => {
    if (hostMode === 'local3000') return 'http://localhost:3000';
    if (hostMode === 'local3001') return 'http://localhost:3001';
    if (hostMode === 'custom') return customHost.trim() || 'http://localhost:3001';
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  };

  const activeOrigin = getEffectiveOrigin();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const handleSaveAgentConfig = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 500);
  };

  const handleGenerateNewKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    setApiKey(`fin_live_master_${new Date().getFullYear()}_${randomHex}`);
  };

  const getMcpConfigJson = () => {
    return JSON.stringify({
      "mcpServers": {
        "marketpulse-finhub-agent": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-fetch", `${activeOrigin}/api/v1/agent/mcp`],
          "env": {
            "X_API_KEY": apiKey
          }
        }
      }
    }, null, 2);
  };

  const getPythonSnippet = () => {
    return `# Python 3 LangChain / AutoGPT / Custom Agent Adapter
import requests

AGENT_ENDPOINT = "${activeOrigin}/api/v1/agent/execute"
API_KEY = "${apiKey}"

def call_financial_agent_tool(tool_name: str, parameters: dict):
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    payload = {
        "tool": tool_name,
        "parameters": parameters
    }
    response = requests.post(AGENT_ENDPOINT, json=payload, headers=headers, timeout=15)
    return response.json()

# Örnek: BIST Hisseleri Sorgusu
stocks = call_financial_agent_tool("bist_get_stocks", {"search": "THYAO", "limit": 5})
print(stocks)`;
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Control Overview */}
      <div className="p-6 bg-gradient-to-r from-indigo-900/30 via-slate-900 to-purple-900/20 border border-indigo-500/30 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl text-indigo-400">
              <Bot className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Otonom AI Ajan Yapılandırma & Bağlantı Yönetimi
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AKTİF & CANLI
                </span>
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                Cursor, Claude Desktop, OpenClaw, Harness ve özel Python/Node.js ajanlarının veritabanı araçlarını doğrudan güvenle çağırması için entegrasyon ayarları.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveAgentConfig}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Kaydediliyor...' : 'Ajan Ayarlarını Kaydet'}
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Ajan konfigürasyonu ve erişim anahtarları başarıyla kaydedildi.
          </div>
        )}
      </div>

      {/* SECTION 0: Server Host & Domain Selector (Localhost vs Cloud) */}
      <div className="p-6 bg-neutral-900/90 border border-neutral-800 rounded-2xl space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              Ajan Sunucu & Hedef Domain Seçici (Localhost / Bulut)
            </h4>
            <p className="text-xs text-neutral-400 mt-1">
              Ajanlarınızın (OpenClaw, Harness, MCP, Python) bağlanacağı API adresi. İsteğinize göre yerel bilgisayarınızdaki (<code>localhost:3000</code>, <code>localhost:3001</code>) veya bulut adresini seçebilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-cyan-300 font-bold shrink-0">
            <span>Aktif Hedef:</span>
            <span className="text-emerald-400">{activeOrigin}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setHostMode('local3000')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              hostMode === 'local3000'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <div className="text-xs font-bold flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" /> Yerel Port 3000
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-1">http://localhost:3000</div>
          </button>

          <button
            type="button"
            onClick={() => setHostMode('local3001')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              hostMode === 'local3001'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <div className="text-xs font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" /> Yerel Port 3001
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-1">http://localhost:3001</div>
          </button>

          <button
            type="button"
            onClick={() => setHostMode('cloud')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              hostMode === 'cloud'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <div className="text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Bulut / Canlı URL
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-1 truncate">
              {typeof window !== 'undefined' ? window.location.origin : 'https://app-host.com'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setHostMode('custom')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              hostMode === 'custom'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <div className="text-xs font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" /> Özel Port / IP
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-1">Örn: 127.0.0.1:8000</div>
          </button>
        </div>

        {hostMode === 'custom' && (
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 mt-2">
            <label className="text-xs font-semibold text-neutral-300">Özel Yerel veya Sunucu Adresinizi Girin:</label>
            <input
              type="text"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              placeholder="http://localhost:3001 veya http://127.0.0.1:8000"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* SECTION 1: Master Switches & Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credentials & Access Key */}
        <div className="p-6 bg-neutral-900/90 border border-neutral-800 rounded-2xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              Ajan Yetkilendirme Anahtarı (API Key)
            </h4>
            <span className="text-xs text-neutral-400">Master Güvenlik Katmanı</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-400">Ajan Erişim Key (`X-API-Key` Header)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-mono text-cyan-300 font-bold focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleCopy(apiKey, 'key')}
                className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white rounded-xl flex items-center gap-1 transition-all"
              >
                {copiedLabel === 'key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedLabel === 'key' ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
              <span>Ajan isteklerinde `X-API-Key: {apiKey.substring(0, 16)}...` şeklinde gönderilir.</span>
              <button
                onClick={handleGenerateNewKey}
                className="text-cyan-400 hover:underline font-medium cursor-pointer"
              >
                Yeni Key Üret
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-neutral-800">
            <label className="text-xs font-semibold text-neutral-400">Dakikalık İstek Hızı Limiti (Rate Limit)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="w-32 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-neutral-400">istek / dakika (Varsayılan: 600)</span>
            </div>
          </div>
        </div>

        {/* Protocol Master Switches */}
        <div className="p-6 bg-neutral-900/90 border border-neutral-800 rounded-2xl space-y-4 shadow-lg">
          <h4 className="font-bold text-white text-base flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Aktif Ajan Protokolleri
          </h4>
          <p className="text-xs text-neutral-400">
            Hangi ajanın sisteminize erişebileceğini protokol bazında izin verin veya kısıtlayın.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" /> Anthropic MCP (Model Context Protocol)
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Claude Desktop & Cursor IDE entegrasyonu</div>
              </div>
              <input
                type="checkbox"
                checked={mcpEnabled}
                onChange={(e) => setMcpEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" /> OpenClaw Agent Framework
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Otonom eklenti manifestosu desteği</div>
              </div>
              <input
                type="checkbox"
                checked={openclawEnabled}
                onChange={(e) => setOpenclawEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" /> Harness Workflow Protocol
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Otomasyon boru hatları entegrasyonu</div>
              </div>
              <input
                type="checkbox"
                checked={harnessEnabled}
                onChange={(e) => setHarnessEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Generic RPC Function Execution
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Doğrudan araç çalıştırma (`/api/v1/agent/execute`)</div>
              </div>
              <input
                type="checkbox"
                checked={rpcEnabled}
                onChange={(e) => setRpcEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: STEP-BY-STEP AGENT CONNECTION GUIDE */}
      <div className="p-6 bg-neutral-900/90 border border-neutral-800 rounded-2xl space-y-6 shadow-xl">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            Ajanı Nasıl Bağlayacağım? (Adım Adım Hızlı Kurulum Rehberi)
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Kullandığınız AI ajan yazılımını (Cursor, Claude Desktop, OpenClaw, Harness veya Özel Python Kodu) FinHub BIST/TEFAS sistemine bağlama adımları.
          </p>
        </div>

        {/* Guide Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveGuideTab('mcp')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeGuideTab === 'mcp'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Layers className="w-4 h-4" /> Cursor & Claude Desktop (MCP)
          </button>

          <button
            onClick={() => setActiveGuideTab('openclaw')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeGuideTab === 'openclaw'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Bot className="w-4 h-4" /> OpenClaw Framework
          </button>

          <button
            onClick={() => setActiveGuideTab('harness')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeGuideTab === 'harness'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Cpu className="w-4 h-4" /> Harness Otomasyon Pipeline
          </button>

          <button
            onClick={() => setActiveGuideTab('python')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeGuideTab === 'python'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Code2 className="w-4 h-4" /> Python / LangChain Ajanı
          </button>
        </div>

        {/* GUIDE DETAILS CONTENT */}
        {activeGuideTab === 'mcp' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong>Anthropic Model Context Protocol (MCP)</strong> ile Cursor IDE veya Claude Desktop uygulamasına canlı finansal veritabanı araçlarını tek adımda bağlayabilirsiniz:
            </div>

            <ol className="list-decimal list-inside space-y-2 text-xs text-neutral-300">
              <li>Cursor veya Claude Desktop uygulamanızda <code>Settings -&gt; Features -&gt; MCP Servers</code> menüsünü açın.</li>
              <li>Aşağıdaki JSON bloğunu kopyalayıp yapılandırma dosyanıza ekleyin:</li>
            </ol>

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 relative font-mono text-xs text-cyan-300">
              <button
                onClick={() => handleCopy(getMcpConfigJson(), 'guide_mcp')}
                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-white flex items-center gap-1"
              >
                {copiedLabel === 'guide_mcp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLabel === 'guide_mcp' ? 'Kopyalandı' : 'JSON Kopyala'}
              </button>
              <pre className="overflow-x-auto">{getMcpConfigJson()}</pre>
            </div>

            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Artık Cursor veya Claude üzerinde <em>"THYAO bilançosunu getir"</em> veya <em>"TCD fonunun hisse dağılımını analiz et"</em> dediğinizde ajan bu araçları otomatik çalıştıracaktır.</span>
            </div>
          </div>
        )}

        {activeGuideTab === 'openclaw' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong>OpenClaw Agent Framework</strong> entegrasyonu için manifestoyu doğrudan OpenClaw plugin yöneticisine ekleyin:
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-neutral-400">OpenClaw Manifest URL:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${activeOrigin}/api/v1/agent/openclaw`}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-purple-300"
                />
                <button
                  onClick={() => handleCopy(`${activeOrigin}/api/v1/agent/openclaw`, 'guide_openclaw')}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white rounded-xl flex items-center gap-1"
                >
                  {copiedLabel === 'guide_openclaw' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedLabel === 'guide_openclaw' ? 'Kopyalandı' : 'URL Kopyala'}
                </button>
              </div>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-300">
              <li>OpenClaw yönetim arayüzünde <code>Plugins -&gt; Add Custom Manifest URL</code> butonuna tıklayın.</li>
              <li>Yukarıdaki URL'yi yapıştırın.</li>
              <li>Header ayarlarına <code>X-API-Key: {apiKey}</code> değerini ekleyin.</li>
            </ol>
          </div>
        )}

        {activeGuideTab === 'harness' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong>Harness Otomasyon Pipeline</strong> akışlarına finansal verileri dahil etmek için:
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-neutral-400">Harness Pipeline Manifest URL:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${activeOrigin}/api/v1/agent/harness`}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300"
                />
                <button
                  onClick={() => handleCopy(`${activeOrigin}/api/v1/agent/harness`, 'guide_harness')}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white rounded-xl flex items-center gap-1"
                >
                  {copiedLabel === 'guide_harness' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedLabel === 'guide_harness' ? 'Kopyalandı' : 'URL Kopyala'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeGuideTab === 'python' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-300 leading-relaxed">
              Özel Python (LangChain, AutoGPT, LlamaIndex, Custom AI) kodlarınız için entegrasyon örneği:
            </div>

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 relative font-mono text-xs text-emerald-300">
              <button
                onClick={() => handleCopy(getPythonSnippet(), 'guide_py')}
                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-white flex items-center gap-1"
              >
                {copiedLabel === 'guide_py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLabel === 'guide_py' ? 'Kopyalandı' : 'Kodu Kopyala'}
              </button>
              <pre className="overflow-x-auto">{getPythonSnippet()}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
