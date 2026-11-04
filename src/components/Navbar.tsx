import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Sun, 
  Moon, 
  Menu, 
  Lock,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { DashboardTab, ThemeMode } from '../types';

interface NavbarProps {
  activeTab: DashboardTab;
  onOpenCompose: () => void;
  onLockTerminal: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onOpenCompose,
  onLockTerminal,
  theme = 'dark',
  onToggleTheme,
  onToggleMobileSidebar,
}) => {
  // PKT (UTC+5) Clock
  const [pktTime, setPktTime] = useState<string>('');

  useEffect(() => {
    const updatePKT = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pktDate = new Date(utc + (3600000 * 5));
      const hours = pktDate.getHours();
      const minutes = pktDate.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      setPktTime(`${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm} PKT`);
    };
    updatePKT();
    const interval = setInterval(updatePKT, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTabLabel = (tab: DashboardTab): string => {
    switch (tab) {
      case 'chat': return 'Chat Workspace';
      case 'training': return 'Personal Training & Operational Rules';
      case 'brain': return 'AI Brain & Models';
      case 'connectors': return 'Connectors Marketplace';
      case 'leads': return 'Leads & Business Research';
      case 'campaigns': return 'Outreach Campaigns';
      case 'queue': return 'Hourly Outreach Queue';
      case 'inbox': return 'Inbox & AI Reply Monitor';
      case 'demos': return 'Client Demo Workspace';
      case 'reports': return '10 PM PKT Daily Reports';
      case 'automation': return 'Automation History & Cron';
      case 'settings': return 'System Settings';
      default: return 'Workspace';
    }
  };

  return (
    <header className="h-14 border-b border-white/[0.08] bg-[#07070a]/90 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none text-zinc-100">
      {/* Left: Mobile Sidebar Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-extrabold text-white tracking-tight font-sans uppercase hidden sm:inline">
            Irzam Studio
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 hidden sm:inline" />
          <span className="font-bold text-zinc-300 text-xs truncate max-w-[180px] sm:max-w-none">
            {getTabLabel(activeTab)}
          </span>
        </div>
      </div>

      {/* Right Controls: PKT Time, New Outreach, Theme, Lock */}
      <div className="flex items-center gap-2.5">
        {/* Real-time PKT Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs font-mono text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{pktTime || 'PKT'}</span>
        </div>

        <button
          onClick={onOpenCompose}
          className="flex items-center gap-1.5 bg-white text-zinc-950 font-extrabold text-xs px-3.5 py-1.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer shadow-sm shadow-white/10"
        >
          <Send className="w-3 h-3 stroke-[2.5]" />
          <span className="hidden sm:inline">New Outreach</span>
        </button>

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/[0.08] transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        )}

        <button
          onClick={onLockTerminal}
          title="Lock Terminal"
          className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/[0.08] transition cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
