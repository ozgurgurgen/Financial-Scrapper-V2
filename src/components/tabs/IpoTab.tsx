import React, { useState } from 'react';
import { IpoCalendarWidget, IpoEvent } from '../office/IpoCalendarWidget';
import IpoDetailPage from '../ipo/IpoDetailPage';

export default function IpoTab() {
  const [selectedIpo, setSelectedIpo] = useState<IpoEvent | null>(null);

  const handleRefreshSelectedIpo = async () => {
    if (!selectedIpo) return;
    try {
      const res = await fetch(`/api/v1/ipos/${selectedIpo.companyCode}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedIpo(data.data);
      }
    } catch (err) {
      console.error('Error refreshing selected IPO:', err);
    }
  };

  if (selectedIpo) {
    return (
      <div className="w-full">
        <IpoDetailPage
          ipo={selectedIpo}
          onBack={() => setSelectedIpo(null)}
          onRefreshIpo={handleRefreshSelectedIpo}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Halka Arz & İzahname (IPO) İzleyici
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          SPK Bülteni ve KAP izahnamelerini tarayarak yeni halka arzları (IPO), tavan serilerini ve yapay zeka analizlerini takip edin. Herhangi bir halka arzın kartındaki "Detaylı İzahname & Analiz Sayfası" butonuna tıklayarak ayrıntılı detay sayfasına ulaşabilirsiniz.
        </p>
      </div>

      <div className="w-full">
        <IpoCalendarWidget isFullScreen={true} onSelectIpo={setSelectedIpo} />
      </div>
    </div>
  );
}
