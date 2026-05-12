/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  MessageSquare, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  Languages,
  LayoutDashboard,
  Cookie,
  Menu,
  X as CloseIcon,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AgentType, AppSettings } from './types';
import { useTranslation } from './lib/i18n';
import AnalysisAgent from './components/agents/AnalysisAgent';
import QAAgent from './components/agents/QAAgent';
import MinutesAgent from './components/agents/MinutesAgent';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [activeAgent, setActiveAgent] = useState<AgentType>('qa');
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse on tablet, expand on desktop
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setSidebarCollapsed(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [settings, setSettings] = useState<AppSettings>({
    language: 'zh-CN',
    theme: 'light'
  });

  const t = useTranslation(settings.language);

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.remove('dark');
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, [settings.theme]);

  const navItems = [
    { id: 'qa', icon: MessageSquare, label: t.qa, description: t.qaDesc },
    { id: 'analysis', icon: FileText, label: t.analysis, description: t.analysisDesc },
    { id: 'minutes', icon: Mic, label: t.minutes, description: t.minutesDesc },
  ];

  return (
    <TooltipProvider delay={0}>
      <div className={cn(
        "flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-300"
      )}>
        {/* Mobile Menu Toggle */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-xl bg-background/80 backdrop-blur-sm shadow-md border-primary/20"
          >
            {!sidebarCollapsed ? <CloseIcon size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Backdrop for mobile */}
        <AnimatePresence>
          {isMobile && !sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarCollapsed(true)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ 
            width: isMobile ? (sidebarCollapsed ? 0 : 280) : (sidebarCollapsed ? 80 : 260),
            x: isMobile && sidebarCollapsed ? -280 : 0
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300,
            damping: 30
          }}
          className={cn(
            "flex flex-col border-r bg-card shadow-xl z-50 fixed inset-y-0 left-0 md:relative md:shadow-none",
            !isMobile && "translate-x-0"
          )}
        >
          <div className="p-6 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-1.1-.18-2.16-.51-3.15-1.18 1.34-2.89 2.15-4.49 2.15-3.31 0-6-2.69-6-6 0-1.6.81-3.31 2.15-4.49C14.16 2.18 13.1 2 12 2z" />
              </svg>
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden"
                >
                  {t.appName}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger
                  onClick={() => {
                    setActiveAgent(item.id as AgentType);
                    setShowSettings(false);
                    if (isMobile) setSidebarCollapsed(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer",
                    activeAgent === item.id && !showSettings
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon size={22} className={cn(
                    "shrink-0",
                    activeAgent === item.id && !showSettings ? "text-white" : "group-hover:scale-110 transition-transform"
                  )} />
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="font-semibold text-sm whitespace-nowrap">{item.label}</span>
                      <span className="text-[10px] opacity-70 truncate w-full text-left">{item.description}</span>
                    </div>
                  )}
                  {activeAgent === item.id && !showSettings && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                    />
                  )}
                </TooltipTrigger>
                {sidebarCollapsed && !isMobile && <TooltipContent side="right">{item.label}</TooltipContent>}
              </Tooltip>
            ))}
          </nav>

          <div className="p-4 border-t space-y-2 shrink-0">
            <Tooltip>
              <TooltipTrigger
                onClick={() => {
                  setShowSettings(true);
                  if (isMobile) setSidebarCollapsed(true);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                  showSettings 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                <Settings size={22} className={cn(
                  "shrink-0",
                  showSettings ? "text-white" : "group-hover:rotate-45 transition-transform"
                )} />
                {!sidebarCollapsed && <span className="font-semibold text-sm">{t.settings}</span>}
              </TooltipTrigger>
              {sidebarCollapsed && !isMobile && <TooltipContent side="right">{t.settings}</TooltipContent>}
            </Tooltip>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex w-full items-center justify-center p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-background/50 backdrop-blur-sm">
          {/* Settings Panel is still conditionally rendered as it's an overlay/full screen modal-like state */}
          <AnimatePresence mode="wait">
            {showSettings && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full w-full absolute inset-0 z-20 bg-background"
              >
                <SettingsPanel settings={settings} setSettings={setSettings} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Agents are always mounted but hidden to support background tasks */}
          <div className={cn("h-full w-full", (activeAgent !== 'analysis' || showSettings) && "hidden invisible pointer-events-none")}>
            <AnalysisAgent settings={settings} />
          </div>
          
          <div className={cn("h-full w-full", (activeAgent !== 'minutes' || showSettings) && "hidden invisible pointer-events-none")}>
            <MinutesAgent settings={settings} />
          </div>
          
          <div className={cn("h-full w-full", (activeAgent !== 'qa' || showSettings) && "hidden invisible pointer-events-none")}>
            <QAAgent settings={settings} />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
