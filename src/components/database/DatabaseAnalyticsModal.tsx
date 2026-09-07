import React from 'react';
import { X, Database, Maximize2, ExternalLink } from 'lucide-react';
import { DatabaseAnalyticsView } from './DatabaseAnalyticsView';

interface DatabaseAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const DatabaseAnalyticsModal: React.FC<DatabaseAnalyticsModalProps> = ({
  isOpen,
  onClose,
  isDark = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-6xl max-h-[92vh] bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                PostgreSQL Veritabanı Telemetrisi &amp; Depolama Analitiği
              </h2>
              <p className="text-xs text-neutral-400">
                Bulut veritabanı kullanım oranları, anlık debi, tablo boyutları ve dışa aktarma (Export)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              title="Kapat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <DatabaseAnalyticsView isDark={isDark} />
        </div>
      </div>
    </div>
  );
};
