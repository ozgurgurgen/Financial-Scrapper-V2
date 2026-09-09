import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Cpu, 
  Terminal, 
  Code2, 
  Copy, 
  Check, 
  Play, 
  Zap, 
  ShieldCheck, 
  Layers, 
  Radio, 
  FileText, 
  RefreshCw, 
  ExternalLink, 
  Server,
  Key,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface AgentToolDef {
  name: string;
  description: string;
  category: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: any;
    }>;
    required?: string[];
  };
}

export default function AgentIntegrationTab() {
  const [tools, setTools] = useState<AgentToolDef[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTool, setSelectedTool] = useState<AgentToolDef | null>(null);
  const [paramInputs, setParamInputs] = useState<Record<string, string>>({});
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [execStatus, setExecStatus] = useState<number | null>(null);
  const [execDuration, setExecDuration] = useState<number | null>(null);
  const [activeProtocol, setActiveProtocol] = useState<'rpc' | 'openclaw' | 'harness' | 'mcp'>('rpc');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('fin_live_master_2026_a8f9c2d1e4');
  const [searchCategory, setSearchCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Host Mode Selection (Localhost vs Cloud)
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

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/agent/tools');
      const data = await res.json();
      if (data.success && Array.isArray(data.tools)) {
        setTools(data.tools);
        if (data.tools.length > 0) {
          setSelectedTool(data.tools[0]);
          initParams(data.tools[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch agent tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const initParams = (tool: AgentToolDef) => {
    const initial: Record<string, string> = {};
    const props = tool.parameters?.properties || {};
    Object.keys(props).forEach((key) => {
      if (key === 'ticker') initial[key] = 'THYAO';
      else if (key === 'code') initial[key] = 'TCD';
      else if (key === 'symbol') initial[key] = 'BTCUSDT';
      else if (key === 'search') initial[key] = '';
      else if (key === 'limit') initial[key] = '10';
      else if (key === 'market') initial[key] = 'ALL';
      else if (key === 'type') initial[key] = 'stock';
      else initial[key] = '';
    });
    setParamInputs(initial);
  };

  const handleSelectTool = (tool: AgentToolDef) => {
    setSelectedTool(tool);
    initParams(tool);
    setExecutionResult(null);
    setExecStatus(null);
  };

  const handleRunExecution = async () => {
    if (!selectedTool) return;
    setExecuting(true);
    setExecutionResult(null);
    setExecStatus(null);
    const start = performance.now();

    const formattedParams: Record<string, any> = {};
    Object.entries(paramInputs).forEach(([k, v]) => {
      if (v !== '' && v !== undefined) {
        if (!isNaN(Number(v)) && k !== 'ticker' && k !== 'code' && k !== 'symbol') {
          formattedParams[k] = Number(v);
        } else {
          formattedParams[k] = v;
        }
      }
    });

    try {
      const res = await fetch('/api/v1/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          tool: selectedTool.name,
          parameters: formattedParams
        })
      });
      const end = performance.now();
      setExecDuration(Math.round(end - start));
      setExecStatus(res.status);
      const json = await res.json();
      setExecutionResult(json);
    } catch (err: any) {
      const end = performance.now();
      setExecDuration(Math.round(end - start));
      setExecStatus(500);
      setExecutionResult({ success: false, error: err.message || 'Execution error' });
    } finally {
      setExecuting(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredTools = tools.filter((t) => {
    const matchesCat = searchCategory === 'ALL' || t.category === searchCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getMcpConfigSnippet = () => {
    return JSON.stringify({
      "mcpServers": {
        "marketpulse-ai": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-fetch", `${activeOrigin}/api/v1/agent/mcp`],
          "env": {
            "X_API_KEY": apiKey
          }
        }
      }
    }, null, 2);
  };

  const getCodeSnippet = (lang: 'python' | 'node' | 'curl') => {
    if (!selectedTool) return '';
    const formattedParams = JSON.stringify(paramInputs, null, 2);

    if (lang === 'curl') {
      return `curl -X POST "${activeOrigin}/api/v1/agent/execute" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "tool": "${selectedTool.name}",
    "parameters": ${formattedParams}
  }'`;
    }

    if (lang === 'python') {
      return `# Python 3 Agent Tool Calling Client
import requests

url = "${activeOrigin}/api/v1/agent/execute"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
}

payload = {
    "tool": "${selectedTool.name}",
    "parameters": ${formattedParams}
}

response = requests.post(url, json=payload, headers=headers)
print("Response Status:", response.status_code)
print("Tool Output:", response.json())`;
    }

    return `// Node.js / TypeScript Agent Function Call
import fetch from 'node-fetch';

async function executeAgentTool() {
  const url = '${activeOrigin}/api/v1/agent/execute';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': '${apiKey}'
    },
    body: JSON.stringify({
      tool: '${selectedTool.name}',
      parameters: ${formattedParams}
    })
  });

  const data = await response.json();
  console.log('Tool Result:', data);
}

executeAgentTool();`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Bot className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  Otonom AI Ajan Entegrasyon Merkezi
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    OPENCLAW & HARNESS READY
                  </span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  OpenClaw, Harness, Anthropic MCP ve custom LLM ajanlarının BIST, TEFAS, ABD Piyasaları ve KAP verilerini doğrudan otonom olarak sorgulamasını sağlayan entegrasyon altyapısı.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 shrink-0">
            <Key className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ajan Yetkilendirme Key</div>
              <input 
                type="text" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-transparent text-xs font-mono text-cyan-300 font-semibold focus:outline-none w-56"
              />
            </div>
          </div>
        </div>

        {/* Host Target Address Selector Bar */}
        <div className="mt-4 p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              Ajan Sunucu Target Link Seçici:
              <span className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{activeOrigin}</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setHostMode('local3000')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  hostMode === 'local3000'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Localhost:3000
              </button>

              <button
                type="button"
                onClick={() => setHostMode('local3001')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  hostMode === 'local3001'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Localhost:3001
              </button>

              <button
                type="button"
                onClick={() => setHostMode('cloud')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  hostMode === 'cloud'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Bulut Canlı URL
              </button>

              <button
                type="button"
                onClick={() => setHostMode('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  hostMode === 'custom'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Özel Port/IP
              </button>
            </div>
          </div>

          {hostMode === 'custom' && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Özel Adres:</span>
              <input
                type="text"
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value)}
                placeholder="http://localhost:3001 veya http://127.0.0.1:8000"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Integration Protocol Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => setActiveProtocol('rpc')}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
              activeProtocol === 'rpc'
                ? 'bg-indigo-600/10 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5 text-indigo-300">
                <Zap className="w-4 h-4 text-indigo-400" /> Function Call (RPC)
              </div>
              <div className="text-xs text-slate-400 mt-1">Doğrudan Tool İcrası</div>
              <div className="text-[11px] font-mono text-cyan-400 mt-2">POST /api/v1/agent/execute</div>
            </div>
          </button>

          <button
            onClick={() => setActiveProtocol('openclaw')}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
              activeProtocol === 'openclaw'
                ? 'bg-purple-600/10 border-purple-500/50 text-white shadow-lg shadow-purple-500/10'
                : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5 text-purple-300">
                <Bot className="w-4 h-4 text-purple-400" /> OpenClaw Framework
              </div>
              <div className="text-xs text-slate-400 mt-1">Eklenti Manifestosu</div>
              <div className="text-[11px] font-mono text-purple-400 mt-2">GET /api/v1/agent/openclaw</div>
            </div>
          </button>

          <button
            onClick={() => setActiveProtocol('harness')}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
              activeProtocol === 'harness'
                ? 'bg-cyan-600/10 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5 text-cyan-300">
                <Cpu className="w-4 h-4 text-cyan-400" /> Harness Workflow
              </div>
              <div className="text-xs text-slate-400 mt-1">Otomasyon Manifestosu</div>
              <div className="text-[11px] font-mono text-cyan-400 mt-2">GET /api/v1/agent/harness</div>
            </div>
          </button>

          <button
            onClick={() => setActiveProtocol('mcp')}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
              activeProtocol === 'mcp'
                ? 'bg-emerald-600/10 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10'
                : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5 text-emerald-300">
                <Layers className="w-4 h-4 text-emerald-400" /> Anthropic MCP
              </div>
              <div className="text-xs text-slate-400 mt-1">JSON-RPC 2.0 Protocol</div>
              <div className="text-[11px] font-mono text-emerald-400 mt-2">POST /api/v1/agent/mcp</div>
            </div>
          </button>
        </div>
      </div>

      {/* Protocol Spec Drawer */}
      {activeProtocol !== 'rpc' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              {activeProtocol === 'openclaw' && 'OpenClaw Agent Entegrasyon Manifestosu'}
              {activeProtocol === 'harness' && 'Harness Workflow Pipeline Yapılandırması'}
              {activeProtocol === 'mcp' && 'Model Context Protocol (MCP) Yapılandırma Snippet\'i'}
            </h2>
            <a
              href={`${activeOrigin}/api/v1/agent/${activeProtocol}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 font-medium flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Manifestoyu Tarayıcıda Aç
            </a>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 relative font-mono text-xs text-slate-300 overflow-x-auto">
            <button
              onClick={() => handleCopy(
                activeProtocol === 'mcp' ? getMcpConfigSnippet() : `${activeOrigin}/api/v1/agent/${activeProtocol}`,
                activeProtocol
              )}
              className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1"
            >
              {copiedText === activeProtocol ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedText === activeProtocol ? 'Kopyalandı' : 'Kopyala'}
            </button>
            <pre>
              {activeProtocol === 'mcp' 
                ? getMcpConfigSnippet() 
                : `// OpenClaw / Harness Akış Endpoint'i
GET ${activeOrigin}/api/v1/agent/${activeProtocol}
X-API-Key: ${apiKey}`
              }
            </pre>
          </div>
        </div>
      )}

      {/* Interactive Tool Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Tool Catalog */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              Ajan Veri Araçları ({filteredTools.length})
            </h2>
            <button
              onClick={fetchTools}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              title="Araçları Yenile"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Category Filters */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Araç adı veya işlev ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
              {['ALL', 'BIST', 'TEFAS', 'US_MARKETS', 'KAP', 'CRYPTO', 'MACRO', 'ANALYST', '360_ASSETS'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSearchCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                    searchCategory === cat
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tools List */}
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">Ajan araçları yükleniyor...</div>
          ) : (
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredTools.map((t) => {
                const isSelected = selectedTool?.name === t.name;
                return (
                  <div
                    key={t.name}
                    onClick={() => handleSelectTool(t)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        {t.name}
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-900 text-indigo-300 border border-slate-700">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{t.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Live Tester & Code Snippets */}
        <div className="lg:col-span-7 space-y-6">
          {selectedTool ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    {selectedTool.name}
                  </h3>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    {selectedTool.category}
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-2 leading-relaxed">{selectedTool.description}</p>
              </div>

              {/* Tool Parameters Form */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fonksiyon Parametreleri</h4>
                
                {Object.keys(selectedTool.parameters?.properties || {}).length === 0 ? (
                  <div className="text-xs text-slate-500 italic">Bu araç parametre gerektirmez.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(selectedTool.parameters.properties).map(([propKey, meta]) => {
                      const propMeta = meta as { type?: string; description?: string };
                      const isRequired = selectedTool.parameters.required?.includes(propKey);
                      return (
                        <div key={propKey} className="space-y-1">
                          <label className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1">
                            {propKey}
                            {isRequired && <span className="text-rose-400 font-bold">*</span>}
                          </label>
                          <input
                            type="text"
                            value={paramInputs[propKey] ?? ''}
                            onChange={(e) => setParamInputs({ ...paramInputs, [propKey]: e.target.value })}
                            placeholder={propMeta.description}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-indigo-500"
                          />
                          <div className="text-[10px] text-slate-500">{propMeta.description}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Execute Button */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleRunExecution}
                    disabled={executing}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {executing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                    {executing ? 'Araç Çalıştırılıyor...' : 'Aracı Çalıştır (Execute Tool)'}
                  </button>

                  {execStatus && (
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                        execStatus === 200 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        HTTP {execStatus}
                      </span>
                      {execDuration && <span className="text-slate-400">{execDuration} ms</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Output Box */}
              {executionResult && (
                <div className="space-y-2 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Yanıt Çıktısı (JSON Output)
                    </span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(executionResult, null, 2), 'output')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedText === 'output' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Kopyala
                    </button>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 max-h-72 overflow-y-auto custom-scrollbar">
                    <pre>{JSON.stringify(executionResult, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Client Code Integration Snippets */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ajan Müşteri İstemci Kodları</h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative font-mono text-xs text-slate-300">
                  <button
                    onClick={() => handleCopy(getCodeSnippet('python'), 'code_py')}
                    className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1"
                  >
                    {copiedText === 'code_py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Kopyala
                  </button>
                  <pre className="max-h-56 overflow-y-auto custom-scrollbar">{getCodeSnippet('python')}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
              Lütfen sol taraftan çalıştırmak istediğiniz otonom ajan aracını seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
