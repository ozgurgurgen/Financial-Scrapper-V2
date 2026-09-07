import { useState } from 'react';
import { KapCompanyItem } from '../types';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  FileSpreadsheet, 
  Users, 
  Coins, 
  ShieldCheck, 
  Award,
  Layers,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

interface CompanyDetailModalProps {
  company: KapCompanyItem | null;
  onClose: () => void;
  isDark: boolean;
}

export default function CompanyDetailModal({ company, onClose, isDark }: CompanyDetailModalProps) {
  const [subTab, setSubTab] = useState<'overview' | 'financials' | 'cashflow' | 'shareholders' | 'corporate'>('overview');

  if (!company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold font-mono text-lg shadow-md shadow-blue-500/20">
              {company.ticker}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {company.company_name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {company.market}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Sektör: <span className="text-neutral-700 dark:text-neutral-200 font-medium">{company.sector}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono">
                ₺{company.price.toFixed(2)}
              </div>
              <div
                className={`text-xs font-semibold flex items-center justify-end gap-0.5 font-mono ${
                  company.day_change_pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {company.day_change_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                %{company.day_change_pct.toFixed(2)}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-5 border-b border-neutral-200 dark:border-neutral-800 flex gap-4 text-xs font-medium bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            onClick={() => setSubTab('overview')}
            className={`py-3 border-b-2 transition-all ${
              subTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Fiyat & Özet
          </button>
          <button
            onClick={() => setSubTab('financials')}
            className={`py-3 border-b-2 transition-all ${
              subTab === 'financials'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Mali Tablolar (Bilanço)
          </button>
          <button
            onClick={() => setSubTab('cashflow')}
            className={`py-3 border-b-2 transition-all ${
              subTab === 'cashflow'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Nakit Akış
          </button>
          <button
            onClick={() => setSubTab('shareholders')}
            className={`py-3 border-b-2 transition-all ${
              subTab === 'shareholders'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Ortaklar & Yönetim
          </button>
          <button
            onClick={() => setSubTab('corporate')}
            className={`py-3 border-b-2 transition-all ${
              subTab === 'corporate'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Temettü & Geri Alım
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {subTab === 'overview' && (
            <div className="space-y-5">
              {/* Key Valuation Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700">
                  <span className="text-neutral-400">Piyasa Değeri</span>
                  <div className="text-sm font-bold text-neutral-900 dark:text-white font-mono mt-1">
                    ₺{(company.market_cap / 1000000000).toFixed(1)} Milyar
                  </div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700">
                  <span className="text-neutral-400">F/K Oranı (P/E)</span>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono mt-1">
                    {company.pe_ratio}x
                  </div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700">
                  <span className="text-neutral-400">PD/DD (P/B)</span>
                  <div className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono mt-1">
                    {company.pb_ratio}x
                  </div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700">
                  <span className="text-neutral-400">Temettü Verimi</span>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    %{company.dividend_yield}
                  </div>
                </div>
              </div>

              {/* Price Trend Chart */}
              <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Hisse Fiyat Trendi (2025)
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">Kapanış Fiyatları</span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={company.price_history}>
                      <defs>
                        <linearGradient id="compPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e5e5'} />
                      <XAxis dataKey="trade_date" stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={10} />
                      <YAxis stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={10} domain={['auto', 'auto']} tickFormatter={(v) => `₺${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#171717' : '#ffffff',
                          borderColor: isDark ? '#262626' : '#e5e5e5',
                          borderRadius: '0.5rem',
                          fontSize: '11px',
                        }}
                      />
                      <Area type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={2} fill="url(#compPrice)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Disclosures for this company */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Son KAP Bildirimleri ({company.disclosures.length})
                </h4>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {company.disclosures.map((d, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          {d.title}
                          {d.is_catalyst && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                              ⚡ Katalizör
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                          {d.publish_date.replace('T', ' ')} • {d.category}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {subTab === 'financials' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                Finansal Tablo Özetleri (Bilanço & Gelir Tablosu)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500">
                      <th className="px-3 py-2">Dönem</th>
                      <th className="px-3 py-2">Hasılat (TL)</th>
                      <th className="px-3 py-2">Net Kâr (TL)</th>
                      <th className="px-3 py-2">EBITDA (TL)</th>
                      <th className="px-3 py-2">Toplam Varlıklar</th>
                      <th className="px-3 py-2">Özkaynaklar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                    {company.financials.map((fin, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="px-3 py-2 font-bold text-neutral-900 dark:text-white">
                          {fin.year}/{fin.period}
                        </td>
                        <td className="px-3 py-2">₺{(fin.revenue / 1000000000).toFixed(1)} Mr</td>
                        <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                          ₺{(fin.net_profit / 1000000000).toFixed(1)} Mr
                        </td>
                        <td className="px-3 py-2">₺{(fin.ebitda / 1000000000).toFixed(1)} Mr</td>
                        <td className="px-3 py-2">₺{(fin.total_assets / 1000000000).toFixed(1)} Mr</td>
                        <td className="px-3 py-2">₺{(fin.equity / 1000000000).toFixed(1)} Mr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subTab === 'cashflow' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                Nakit Akış Tablosu (Cash Flow Dynamics)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500">
                      <th className="px-3 py-2">Dönem</th>
                      <th className="px-3 py-2">İşletme Nakit Akışı</th>
                      <th className="px-3 py-2">Yatırım Nakit Akışı</th>
                      <th className="px-3 py-2">Finansman Nakit Akışı</th>
                      <th className="px-3 py-2">Net Nakit Değişimi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                    {company.cashflows.map((cf, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="px-3 py-2 font-bold text-neutral-900 dark:text-white">
                          {cf.year}/{cf.period}
                        </td>
                        <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400">
                          ₺{(cf.operating_cash_flow / 1000000000).toFixed(1)} Mr
                        </td>
                        <td className="px-3 py-2 text-rose-600 dark:text-rose-400">
                          ₺{(cf.investing_cash_flow / 1000000000).toFixed(1)} Mr
                        </td>
                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">
                          ₺{(cf.financing_cash_flow / 1000000000).toFixed(1)} Mr
                        </td>
                        <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">
                          ₺{(cf.net_change / 1000000000).toFixed(1)} Mr
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subTab === 'shareholders' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Users size={15} className="text-blue-500" />
                  Ortaklık Yapısı (Pay Sahipleri)
                </h4>
                <div className="space-y-2">
                  {company.shareholders.map((sh, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-neutral-900 dark:text-white">{sh.holder_name}</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">%{sh.share_ratio_percent}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-1">{sh.holder_type}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-purple-500" />
                  Yönetim Kurulu Üyeleri
                </h4>
                <div className="space-y-2">
                  {company.management.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 text-xs">
                      <div className="font-semibold text-neutral-900 dark:text-white">{m.name}</div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{m.title}</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 mt-1 inline-block">
                        {m.member_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {subTab === 'corporate' && (
            <div className="space-y-5">
              {/* Corporate Actions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Award size={15} className="text-emerald-500" />
                  Temettü ve Kurumsal İşlemler
                </h4>
                {company.corporate_actions.length === 0 ? (
                  <div className="text-xs text-neutral-400">Kayıtlı aktif temettü işlemi bulunmuyor.</div>
                ) : (
                  company.corporate_actions.map((ca, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-emerald-800 dark:text-emerald-300">{ca.action_type}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                          Hak Kullanım: {ca.ex_date} • Ödeme: {ca.payment_date}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-neutral-900 dark:text-white font-mono">
                          Net ₺{ca.net_per_share} / Pay
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Verim: %{ca.yield_percent}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Buybacks */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Coins size={15} className="text-amber-500" />
                  Pay Geri Alım Programları
                </h4>
                {company.buybacks.length === 0 ? (
                  <div className="text-xs text-neutral-400">Aktif pay geri alım programı bulunmamaktadır.</div>
                ) : (
                  company.buybacks.map((bb, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Toplam Bütçe:</span>
                        <span className="font-bold font-mono">₺{(bb.total_budget_tl / 1000000000).toFixed(2)} Milyar</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Alınan Pay Sayısı:</span>
                        <span className="font-bold font-mono">{bb.total_bought_shares.toLocaleString()} adet (%{bb.capital_ratio_percent})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Ortalama Alım Maliyeti:</span>
                        <span className="font-bold font-mono text-emerald-600">₺{bb.avg_buyback_price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
