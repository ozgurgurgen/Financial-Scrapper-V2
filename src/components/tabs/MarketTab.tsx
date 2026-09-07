import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Coins, 
  Flame, 
  Globe2,
  RefreshCw,
  BarChart3,
  LayoutGrid
} from 'lucide-react';

interface MarketOverview {
  indices: any[];
  stocks: any[];
  fx: any[];
  commodities: any[];
  bist: any[];
}

export default function MarketTab() {
  const [data, setData] = useState<MarketOverview | null>(null);
  const [cryptoData, setCryptoData] = useState<any[]>([]);
  const [macroData, setMacroData] = useState<any[]>([]);
  const [stocksHeatmap, setStocksHeatmap] = useState<any[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [hoveredStock, setHoveredStock] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [marketRes, cryptoRes, macroRes, heatmapRes] = await Promise.all([
        fetch('/api/market/overview'),
        fetch('/api/crypto/prices'),
        fetch('/api/macro/indicators').catch(() => null),
        fetch('/api/v1/sectors/stocks-heatmap?market=BIST').catch(() => null)
      ]);

      if (!marketRes.ok) throw new Error('Piyasa verileri alınamadı');
      const marketJson = await marketRes.json();
      setData(marketJson);

      if (cryptoRes.ok) {
        const cryptoJson = await cryptoRes.json();
        setCryptoData(cryptoJson);
      }

      if (macroRes && macroRes.ok) {
        const macroJson = await macroRes.json();
        setMacroData(macroJson);
      }

      if (heatmapRes && heatmapRes.ok) {
        const heatmapJson = await heatmapRes.json();
        if (heatmapJson && heatmapJson.success && Array.isArray(heatmapJson.sectors)) {
          setStocksHeatmap(heatmapJson.sectors);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const bistItem = data?.bist?.[0];
  const spItem = data?.indices?.find(i => i.symbol === 'S&P 500');
  const usdItem = data?.fx?.find(f => f.symbol === 'USD/TRY');
  const goldItem = data?.commodities?.find(c => c.symbol === 'XAU/USD');

  return (
    <div className="space-y-6">
      {/* VAP - Piyasa Göstergeleri (Hero Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe2 size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Canlı Piyasa & BIST Makro Göstergeleri
            </h3>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Yenile</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              BIST 100 Endeksi
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono">
                {bistItem ? bistItem.value?.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '-'}
              </span>
              {bistItem && (
                <span className={`text-xs font-semibold ${bistItem.change_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  %{bistItem.change_pct >= 0 ? '+' : ''}{bistItem.change_pct?.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              S&P 500
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono">
                {spItem ? spItem.value?.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '-'}
              </span>
              {spItem && (
                <span className={`text-xs font-semibold ${spItem.change_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  %{spItem.change_pct >= 0 ? '+' : ''}{spItem.change_pct?.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Dolar / TL (USD/TRY)
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono">
                {usdItem ? `₺${usdItem.value?.toFixed(2)}` : '-'}
              </span>
              {usdItem && (
                <span className={`text-xs font-semibold ${usdItem.change_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  %{usdItem.change_pct >= 0 ? '+' : ''}{usdItem.change_pct?.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Ons Altın (XAU/USD)
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono">
                {goldItem ? `$${goldItem.value?.toLocaleString('en-US', { maximumFractionDigits: 1 })}` : '-'}
              </span>
              {goldItem && (
                <span className={`text-xs font-semibold ${goldItem.change_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  %{goldItem.change_pct >= 0 ? '+' : ''}{goldItem.change_pct?.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid for FX, Crypto, Commodities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Döviz Kurları */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-500" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Döviz Kurları (Canlı Piyasa)
              </h4>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">Gerçek Zamanlı</span>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {(data?.fx || []).map((item) => (
              <div key={item.symbol} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-neutral-900 dark:text-white font-mono">{item.symbol}</div>
                  <div className="text-[11px] text-neutral-400">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-neutral-900 dark:text-white text-sm">
                    {item.symbol.endsWith('/TRY') ? `₺${item.value?.toFixed(2)}` : `$${item.value?.toFixed(4)}`}
                  </div>
                  <div
                    className={`text-[11px] font-mono flex items-center justify-end gap-0.5 ${
                      (item.change_pct ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {(item.change_pct ?? 0) >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    %{item.change_pct?.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kripto Paralar */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-amber-500" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Kripto Varlıklar (Canlı Spot)
              </h4>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">24s Hacimli</span>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {cryptoData.slice(0, 5).map((item) => (
              <div key={item.symbol} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-neutral-900 dark:text-white font-mono">{item.symbol}</div>
                  <div className="text-[11px] text-neutral-400">{item.symbol}/USDT</div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-neutral-900 dark:text-white text-sm">
                    ${parseFloat(item.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`text-[11px] font-mono flex items-center justify-end gap-0.5 ${
                      parseFloat(item.change24h || '0') >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {parseFloat(item.change24h || '0') >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    %{parseFloat(item.change24h || '0').toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
            {cryptoData.length === 0 && !loading && (
              <div className="py-4 text-center text-xs text-neutral-400">
                Kripto fiyatları yükleniyor...
              </div>
            )}
          </div>
        </div>

        {/* Emtia & Altın */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-rose-500" />
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Kıymetli Maden & Emtia
              </h4>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">Piyasa Fiyatı</span>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {(data?.commodities || []).map((item) => (
              <div key={item.symbol} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-neutral-900 dark:text-white font-mono">{item.symbol}</div>
                  <div className="text-[11px] text-neutral-400">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-neutral-900 dark:text-white text-sm">
                    ${item.value?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`text-[11px] font-mono flex items-center justify-end gap-0.5 ${
                      (item.change_pct ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {(item.change_pct ?? 0) >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    %{item.change_pct?.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CANLI PİYASA VE BIST 100 ISI HARİTASI (HEATMAP TREEMAP) */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <LayoutGrid size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                BIST Piyasa Isı Haritası (Finviz Treemap)
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Canlı
                </span>
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Sektörler ve BIST 100 hisselerinin anlık getiri performansına göre renklendirilmiş piyasa ısı haritası
              </p>
            </div>
          </div>

          {/* Color Scale Legend */}
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-neutral-400 mr-0.5">Düşüş</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-800 text-white font-bold">&lt; -3%</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white">-1%</span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-500 text-white">0%</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white">+1%</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white font-bold">&gt; +3%</span>
            <span className="text-neutral-400 ml-0.5">Yükseliş</span>
          </div>
        </div>

        {/* Hovered Stock Inspector Strip */}
        <div className="min-h-[34px] px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between text-xs">
          {hoveredStock ? (
            <div className="flex flex-wrap items-center gap-3 w-full">
              <span className="font-extrabold text-neutral-900 dark:text-white text-sm">
                {hoveredStock.ticker}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                {hoveredStock.name}
              </span>
              <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                ₺{Number(hoveredStock.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
              <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                hoveredStock.changePct >= 0 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {hoveredStock.changePct >= 0 ? `+${hoveredStock.changePct}%` : `${hoveredStock.changePct}%`}
              </span>
              {hoveredStock.peRatio && (
                <span className="text-neutral-500 text-[11px]">
                  F/K: <strong className="text-neutral-800 dark:text-neutral-200">{hoveredStock.peRatio}x</strong>
                </span>
              )}
            </div>
          ) : (
            <span className="text-neutral-400 text-xs italic">
              Hisse detaylarını (Fiyat, Günlük Değişim, F/K, Piyasa Değeri) görmek için fareyi kutuların üzerine getirin
            </span>
          )}
        </div>

        {/* Heatmap Treemap Blocks */}
        {stocksHeatmap.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-neutral-400">
            <RefreshCw size={20} className="animate-spin text-emerald-500 mb-2" />
            <span className="text-xs">Isı haritası yükleniyor...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {stocksHeatmap.slice(0, 12).map((secGroup) => {
              const topStocks = secGroup.stocks.slice(0, 10);
              const isSecPositive = secGroup.avgChangePct >= 0;

              return (
                <div 
                  key={`market-sec-${secGroup.name}`}
                  className="bg-neutral-50 dark:bg-neutral-800/40 rounded-xl p-2.5 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1 mb-2 px-1">
                    <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 truncate">
                      {secGroup.name}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isSecPositive 
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40' 
                        : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                    }`}>
                      {isSecPositive ? `+${secGroup.avgChangePct}%` : `${secGroup.avgChangePct}%`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 flex-1 items-stretch">
                    {topStocks.map((stock: any) => {
                      const chg = stock.changePct;
                      let tileBg = 'bg-neutral-500 text-white';
                      if (chg >= 3) tileBg = 'bg-emerald-700 hover:bg-emerald-600 text-white';
                      else if (chg >= 1) tileBg = 'bg-emerald-600 hover:bg-emerald-500 text-white';
                      else if (chg > 0) tileBg = 'bg-emerald-500 hover:bg-emerald-400 text-white';
                      else if (chg <= -3) tileBg = 'bg-rose-800 hover:bg-rose-700 text-white';
                      else if (chg <= -1) tileBg = 'bg-rose-600 hover:bg-rose-500 text-white';
                      else if (chg < 0) tileBg = 'bg-rose-500 hover:bg-rose-400 text-white';

                      const isLarge = stock.marketCap > 40_000_000_000;

                      return (
                        <div
                          key={stock.ticker}
                          onMouseEnter={() => setHoveredStock(stock)}
                          onMouseLeave={() => setHoveredStock(null)}
                          className={`relative rounded-lg text-left transition-all duration-150 flex flex-col justify-between cursor-pointer select-none ${tileBg} ${
                            isLarge 
                              ? 'flex-[2_1_85px] min-h-[50px] p-2' 
                              : 'flex-[1_1_60px] min-h-[44px] p-1.5'
                          }`}
                        >
                          <div className="w-full flex items-baseline justify-between gap-1 leading-none">
                            <span className="font-black text-xs tracking-tight drop-shadow-xs">
                              {stock.ticker}
                            </span>
                          </div>
                          <div className="w-full flex items-baseline justify-between gap-1 mt-1 leading-none">
                            <span className="font-extrabold text-[11px] tracking-tighter drop-shadow-xs">
                              {chg >= 0 ? `+${chg.toFixed(1)}%` : `${chg.toFixed(1)}%`}
                            </span>
                            <span className="text-[9px] opacity-85 font-mono drop-shadow-xs">
                              ₺{stock.price >= 100 ? Math.round(stock.price) : stock.price.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
