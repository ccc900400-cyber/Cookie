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
  Eye,
  Languages,
  LayoutDashboard,
  Menu,
  X as CloseIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AgentType, AppSettings } from './types';
import { useTranslation } from './lib/i18n';
import AnalysisAgent from './components/agents/AnalysisAgent';
import QAAgent from './components/agents/QAAgent';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [activeAgent, setActiveAgent] = useState<AgentType>('qa');
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Default collapsed on mobile
  const [settings, setSettings] = useState<AppSettings>({
    language: 'zh-CN',
    theme: 'light'
  });

  const t = useTranslation(settings.language);

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.remove('dark', 'eye-protection');
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'eye-protection') {
      document.documentElement.classList.add('eye-protection');
    }
  }, [settings.theme]);

  const navItems = [
    { id: 'qa', icon: MessageSquare, label: t.qa, description: t.qaDesc },
    { id: 'analysis', icon: FileText, label: t.analysis, description: t.analysisDesc },
  ];

  return (
    <TooltipProvider delay={0}>
      <div className={cn(
        "flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-300",
        settings.theme === 'eye-protection' && "bg-[#f4ecd8]"
      )}>
        {/* Mobile Menu Toggle */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-xl bg-background/80 backdrop-blur-sm shadow-md"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <CloseIcon size={20} />}
          </Button>
        </div>

        {/* Backdrop for mobile */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarCollapsed(true)}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ 
            width: sidebarCollapsed ? (window.innerWidth < 768 ? 0 : 80) : 260,
            x: window.innerWidth < 768 && sidebarCollapsed ? -260 : 0
          }}
          className={cn(
            "flex flex-col border-r bg-card shadow-sm z-50",
            "fixed inset-y-0 left-0 md:relative transition-all duration-300 ease-in-out"
          )}
        >
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <LayoutDashboard size={20} />
            </div>
            {(!sidebarCollapsed || window.innerWidth < 768) && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-lg tracking-tight whitespace-nowrap"
              >
                {t.appName}
              </motion.span>
            )}
          </div>

          <nav className="flex-1 px-3 space-y-2 mt-4">
            {navItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger
                  onClick={() => {
                    setActiveAgent(item.id as AgentType);
                    setShowSettings(false);
                    if (window.innerWidth < 768) setSidebarCollapsed(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer",
                    activeAgent === item.id && !showSettings
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon size={22} className={cn(
                    "shrink-0",
                    activeAgent === item.id && !showSettings ? "text-white" : "group-hover:scale-110 transition-transform"
                  )} />
                  {(!sidebarCollapsed || window.innerWidth < 768) && (
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="font-medium text-sm">{item.label}</span>
                      <span className="text-[10px] opacity-70 truncate w-full">{item.description}</span>
                    </div>
                  )}
                  {activeAgent === item.id && !showSettings && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                    />
                  )}
                </TooltipTrigger>
                {sidebarCollapsed && window.innerWidth >= 768 && <TooltipContent side="right">{item.label}</TooltipContent>}
              </Tooltip>
            ))}
          </nav>

          <div className="p-4 border-t space-y-2">
            <Tooltip>
              <TooltipTrigger
                onClick={() => {
                  setShowSettings(true);
                  if (window.innerWidth < 768) setSidebarCollapsed(true);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                  showSettings 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                <Settings size={22} className={cn(
                  "shrink-0",
                  showSettings ? "text-white" : "group-hover:rotate-45 transition-transform"
                )} />
                {(!sidebarCollapsed || window.innerWidth < 768) && <span className="font-medium text-sm">{t.settings}</span>}
              </TooltipTrigger>
              {sidebarCollapsed && window.innerWidth >= 768 && <TooltipContent side="right">{t.settings}</TooltipContent>}
            </Tooltip>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex w-full items-center justify-center p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-background/50 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {showSettings ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full w-full"
              >
                <SettingsPanel settings={settings} setSettings={setSettings} />
              </motion.div>
            ) : activeAgent === 'analysis' ? (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full w-full"
              >
                <AnalysisAgent settings={settings} />
              </motion.div>
            ) : (
              <motion.div
                key="qa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full w-full"
              >
                <QAAgent settings={settings} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </TooltipProvider>
  );
}
