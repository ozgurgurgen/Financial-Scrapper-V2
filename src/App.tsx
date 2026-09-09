import { useState, useEffect } from 'react';
import { TabType, ServiceStatus, ProgressInfo } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { motion, AnimatePresence } from 'motion/react';

// 14 Comprehensive Tab Components
import ServicesTab from './components/tabs/ServicesTab';
import LiveOfficeTab from './components/tabs/LiveOfficeTab';
import DataFlowTab from './components/tabs/DataFlowTab';
import TefasFundsTab from './components/tabs/TefasFundsTab';
import FundHoldingsTab from './components/tabs/FundHoldingsTab';
import MarketTab from './components/tabs/MarketTab';
import CryptoTab from './components/tabs/CryptoTab';
import CryptoAllCoinsTab from './components/tabs/CryptoAllCoinsTab';
import KapTab from './components/tabs/KapTab';
import IpoTab from './components/tabs/IpoTab';
import NewsTab from './components/tabs/NewsTab';
import SchedulerTab from './components/tabs/SchedulerTab';
import TechnicalAnalysisTab from './components/tabs/TechnicalAnalysisTab';
import ScreenerTab from './components/tabs/ScreenerTab';
import BuffettTab from './components/tabs/BuffettTab';
import MacroTab from './components/tabs/MacroTab';
import CalendarTab from './components/tabs/CalendarTab';
import UsMarketsTab from './components/tabs/UsMarketsTab';
import AnalystReportsTab from './components/tabs/AnalystReportsTab';
import ApiDocsTab from './components/tabs/ApiDocsTab';
import AgentIntegrationTab from './components/tabs/AgentIntegrationTab';
import ApiChartsTab from './components/tabs/ApiChartsTab';
import SystemLogsTab from './components/tabs/SystemLogsTab';
import DbStocksTab from './components/tabs/DbStocksTab';
import SettingsTab from './components/tabs/SettingsTab';
import AssetsTab from './components/tabs/AssetsTab';
import DataSourceHealthSubApp from './components/tabs/DataSourceHealthSubApp';
import { SectorAnalyticsTab } from './components/tabs/SectorAnalyticsTab';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('services');
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('fp_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('fp_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };


  const handleOpenTechnical = (_ticker: string) => {
    setCurrentTab('technical');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans antialiased overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileNavOpen(false);
          }}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Header
            currentTab={currentTab}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
            isMobileNavOpen={isMobileNavOpen}
          />

          <main className={`flex-1 overflow-y-auto custom-scrollbar ${currentTab === 'live-office' ? 'p-2 sm:p-3 md:p-4 lg:p-6 2xl:p-8' : 'p-3 sm:p-5 md:p-7 lg:p-8'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className={currentTab === 'live-office' ? 'w-full max-w-[2560px] 3xl:max-w-full mx-auto' : 'max-w-7xl mx-auto'}
              >
                {currentTab === 'services' && (
                  <ServicesTab onNavigateTab={(tab) => setCurrentTab(tab as TabType)} />
                )}

                {currentTab === 'data-health' && <DataSourceHealthSubApp />}

                {currentTab === 'live-office' && <LiveOfficeTab />}

                {currentTab === 'dataflow' && <DataFlowTab />}

                {currentTab === 'funds' && <TefasFundsTab isDark={isDark} />}

                {currentTab === 'fund-holdings' && <FundHoldingsTab />}

                {currentTab === 'market' && <MarketTab />}

                {currentTab === 'crypto' && <CryptoTab isDark={isDark} />}
                {currentTab === 'crypto-all' && <CryptoAllCoinsTab />}

                {currentTab === 'kap' && <KapTab isDark={isDark} />}

                {currentTab === 'ipo' && <IpoTab />}
                {currentTab === 'news' && <NewsTab />}

                {currentTab === 'schedule' && <SchedulerTab />}

                {currentTab === 'technical' && <TechnicalAnalysisTab isDark={isDark} />}

                {currentTab === 'screener' && (
                  <ScreenerTab onOpenTechnical={handleOpenTechnical} />
                )}

                {currentTab === 'buffett' && <BuffettTab />}

                {currentTab === 'macro' && <MacroTab isDark={isDark} />}

                {currentTab === 'calendar' && <CalendarTab />}

                {currentTab === 'us' && <UsMarketsTab />}

                {currentTab === 'analyst' && <AnalystReportsTab />}

                {currentTab === 'sector-analytics' && <SectorAnalyticsTab />}

                {currentTab === 'api' && <ApiDocsTab />}
                {currentTab === 'agents' && <AgentIntegrationTab />}
                {currentTab === 'api-charts' && <ApiChartsTab />}
                {currentTab === 'system-logs' && <SystemLogsTab />}

                {currentTab === 'db_stocks' && <DbStocksTab />}

                {currentTab === 'assets' && <AssetsTab />}

                {currentTab === 'settings' && <SettingsTab />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
