import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, TrendingUp, BarChart2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function DataAnalytics({ isDark }: { isDark?: boolean }) {
  const [allFunds, setAllFunds] = useState<any[]>([]);
  const [fundData, setFundData] = useState<any[]>([]);
  const [disclosureData, setDisclosureData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'1M' | '1Y' | '5Y'>('5Y');

  const updateFundDataForPeriod = (funds: any[], period: '1M' | '1Y' | '5Y') => {
    const key = period === '5Y' ? 'return5Y' : period === '1Y' ? 'return1Y' : 'return1M';
    const sorted = (funds || [])
      .filter((f: any) => f.code && f[key] !== null && f[key] !== undefined && !isNaN(Number(f[key])))
      .sort((a: any, b: any) => (Number(b[key]) || 0) - (Number(a[key]) || 0))
      .slice(0, 8)
      .map((f: any) => ({
        fund: f.code,
        name: f.name?.slice(0, 20) || f.code,
        returnVal: Number(Number(f[key]).toFixed(1)) || 0,
        return1M: Number(f.return1M?.toFixed(1)) || 0,
        return1Y: Number(f.return1Y?.toFixed(1)) || 0,
        return5Y: Number(f.return5Y?.toFixed(1)) || 0,
      }));
    setFundData(sorted);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fundsRes, kapRes] = await Promise.all([
        fetch('/api/tefas/funds').catch(() => null),
        fetch('/api/kap/disclosures').catch(() => null)
      ]);

      if (fundsRes && fundsRes.ok) {
        const funds = await fundsRes.json();
        setAllFunds(funds || []);
        updateFundDataForPeriod(funds || [], selectedPeriod);
      }

      if (kapRes && kapRes.ok) {
        const disclosures = await kapRes.json();
        const counts: Record<string, number> = {};
        (disclosures || []).forEach((d: any) => {
          const key = d.companyCode || d.companyName?.split(' ')[0] || 'Genel';
          counts[key] = (counts[key] || 0) + 1;
        });

        const grouped = Object.entries(counts)
          .map(([company, count]) => ({ company, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 7);

        setDisclosureData(grouped);
      }
    } catch (e) {
      console.error('Analytics load error', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (p: '1M' | '1Y' | '5Y') => {
    setSelectedPeriod(p);
    updateFundDataForPeriod(allFunds, p);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-100">
            Piyasa &amp; Veritabanı Canlı Analitikleri
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            TEFAS Fon Getirileri ve KAP Bildirim İstatistikleri
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Yenile</span>
          </button>
          <button 
            onClick={() => exportToCSV(fundData, 'tefas_fon_performans')}
            disabled={fundData.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
          >
            <FileSpreadsheet size={15} />
            Fonları Dışa Aktar (CSV)
          </button>
          <button 
            onClick={() => exportToCSV(disclosureData, 'kap_bildirim_istatistik')}
            disabled={disclosureData.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
          >
            <Download size={15} />
            KAP Verilerini Dışa Aktar (CSV)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar Chart: TEFAS Fund Performance */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              <div>
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-100 text-sm">
                  En Yüksek Getirili TEFAS Fonları ({selectedPeriod === '5Y' ? '5 Yıllık %' : selectedPeriod === '1Y' ? '1 Yıllık %' : '1 Aylık %'})
                </h4>
                <p className="text-[11px] text-neutral-400">Resmi TEFAS Verisi • Mock Yok</p>
              </div>
            </div>
            
            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg self-start sm:self-auto">
              {(['1M', '1Y', '5Y'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    selectedPeriod === p
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {p === '5Y' ? '5 Yıl' : p === '1Y' ? '1 Yıl' : '1 Ay'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                Veriler yükleniyor...
              </div>
            ) : fundData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                Görüntülenecek fon verisi bulunamadı.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fundData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#404040" : "#e5e5e5"} />
                  <XAxis dataKey="fund" axisLine={false} tickLine={false} tick={{fill: isDark ? '#a3a3a3' : '#737373', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#a3a3a3' : '#737373', fontSize: 11}} tickFormatter={(v) => `%${v}`} dx={-10} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: isDark ? '1px solid #262626' : 'none', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: isDark ? '#171717' : '#fff',
                      color: isDark ? '#f5f5f5' : '#000',
                      fontSize: '11px'
                    }}
                    formatter={(val: any) => [`%${val}`, `${selectedPeriod === '5Y' ? '5 Yıllık' : selectedPeriod === '1Y' ? '1 Yıllık' : '1 Aylık'} Getiri`]}
                  />
                  <Bar dataKey="returnVal" fill={selectedPeriod === '5Y' ? '#8b5cf6' : '#3b82f6'} radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart: Disclosures by Company */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart2 size={20} className="text-emerald-500" />
              <h4 className="font-semibold text-neutral-800 dark:text-neutral-100 text-sm">
                KAP Bildirim Yoğunluğu (Şirket Bazlı)
              </h4>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">Canlı KAP Akışı</span>
          </div>
          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                Veriler yükleniyor...
              </div>
            ) : disclosureData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                Görüntülenecek KAP bildirimi bulunamadı.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={disclosureData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#404040" : "#e5e5e5"} />
                  <XAxis dataKey="company" axisLine={false} tickLine={false} tick={{fill: isDark ? '#a3a3a3' : '#737373', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#a3a3a3' : '#737373', fontSize: 11}} dx={-10} />
                  <Tooltip 
                    cursor={{fill: isDark ? '#262626' : '#f5f5f5'}}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: isDark ? '1px solid #262626' : 'none', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: isDark ? '#171717' : '#fff',
                      color: isDark ? '#f5f5f5' : '#000',
                      fontSize: '11px'
                    }}
                    formatter={(val: any) => [val, 'Bildirim Sayısı']}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
