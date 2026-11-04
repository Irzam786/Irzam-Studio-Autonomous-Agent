import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Pin, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Edit2,
  Check,
  X,
  GraduationCap,
  Cpu,
  Plug,
  Users,
  Megaphone,
  ListOrdered,
  Inbox,
  Globe,
  FileBarChart,
  History,
  Settings,
  Lock,
} from 'lucide-react';
import { ChatSession, DashboardTab } from '../types';

interface SidebarProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onTogglePinSession: (id: string) => void;
  onRenameSession?: (id: string, newTitle: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  onLockTerminal: () => void;
  pendingLeadsCount?: number;
  unreadRepliesCount?: number;
  scheduledQueueCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onTogglePinSession,
  onRenameSession,
  isOpen,
  onToggleOpen,
  isMobile = false,
  onCloseMobile,
  onLockTerminal,
  pendingLeadsCount = 0,
  unreadRepliesCount = 0,
  scheduledQueueCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  if (!isOpen && !isMobile) {
    return (
      <div className="hidden md:flex border-r border-white/[0.06] bg-[#07070a] p-2 flex-col items-center justify-between h-screen w-14 z-30 select-none">
        <div className="flex flex-col items-center gap-3">
          <div 
            onClick={onToggleOpen}
            className="w-9 h-9 rounded-xl bg-black border border-white/20 flex items-center justify-center text-white cursor-pointer hover:border-white/40 transition shadow-sm"
            title="Expand Sidebar"
          >
            <span className="font-bold text-sm">✦</span>
          </div>
          <button
            onClick={() => {
              onSelectTab('chat');
              onNewSession();
            }}
            title="New Chat"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onToggleOpen}
          title="Open Navigation"
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedSessions = filteredSessions.filter(s => s.pinned);
  const regularSessions = filteredSessions.filter(s => !s.pinned);

  const startRename = (s: ChatSession) => {
    setEditingSessionId(s.id);
    setEditingTitle(s.title);
  };

  const saveRename = (id: string) => {
    if (editingTitle.trim() && onRenameSession) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const navItems: Array<{
    tab: DashboardTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { tab: 'chat', label: 'Chat Workspace', icon: <MessageSquare className="w-4 h-4" /> },
    { tab: 'training', label: 'Personal Training', icon: <GraduationCap className="w-4 h-4 text-emerald-400" /> },
    { tab: 'brain', label: 'AI Brain', icon: <Cpu className="w-4 h-4 text-purple-400" /> },
    { tab: 'connectors', label: 'Connectors Marketplace', icon: <Plug className="w-4 h-4 text-cyan-400" /> },
    { tab: 'leads', label: 'Leads & Research', icon: <Users className="w-4 h-4 text-emerald-400" />, badge: pendingLeadsCount },
    { tab: 'campaigns', label: 'Campaigns', icon: <Megaphone className="w-4 h-4 text-amber-400" /> },
    { tab: 'queue', label: 'Outreach Queue', icon: <ListOrdered className="w-4 h-4 text-blue-400" />, badge: scheduledQueueCount },
    { tab: 'inbox', label: 'Inbox & Replies', icon: <Inbox className="w-4 h-4 text-rose-400" />, badge: unreadRepliesCount },
    { tab: 'demos', label: 'Demo Workspace', icon: <Globe className="w-4 h-4 text-teal-400" /> },
    { tab: 'reports', label: 'Daily Reports', icon: <FileBarChart className="w-4 h-4 text-indigo-400" /> },
    { tab: 'automation', label: 'Automation History', icon: <History className="w-4 h-4 text-zinc-400" /> },
    { tab: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 text-zinc-400" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobile && isOpen && (
        <div 
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        />
      )}

      <aside className={`
        ${isMobile 
          ? `fixed top-0 bottom-0 left-0 z-50 w-72 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}` 
          : 'w-64 relative'
        }
        bg-[#07070a] border-r border-white/[0.08] flex flex-col h-screen flex-shrink-0 select-none text-zinc-300
      `}>
        {/* Brand Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black border border-white/20 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              <span className="font-extrabold text-sm">✦</span>
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block uppercase">
                Irzam Studio
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block">
                Autonomous AI Agent
              </span>
            </div>
          </div>
          {!isMobile ? (
            <button
              onClick={onToggleOpen}
              title="Collapse Sidebar"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onCloseMobile}
              title="Close Drawer"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Action: New Chat */}
        <div className="p-3 pb-2">
          <button
            onClick={() => {
              onSelectTab('chat');
              onNewSession();
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition font-extrabold text-xs shadow-md shadow-white/10 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Chat</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-700 bg-zinc-200/80 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </button>
        </div>

        {/* Base44 / ChatGPT Navigation Menu */}
        <div className="px-2 py-1 space-y-0.5 border-b border-white/[0.06]">
          {navItems.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  onSelectTab(item.tab);
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800/90 text-white shadow-sm border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conversation History Section */}
        <div className="flex-1 flex flex-col min-h-0 pt-2">
          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">
              Chat History ({sessions.length})
            </span>
          </div>

          {/* Search Conversations */}
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full bg-zinc-900/60 border border-white/[0.06] rounded-lg pl-8 pr-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/20 font-sans"
              />
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1 no-scrollbar">
            {pinnedSessions.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-0.5 text-[9px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1 font-bold">
                  <Pin className="w-2.5 h-2.5 text-amber-400" />
                  <span>Pinned</span>
                </div>
                {pinnedSessions.map((session) => (
                  <ThreadItem
                    key={session.id}
                    session={session}
                    isActive={activeTab === 'chat' && activeSessionId === session.id}
                    isEditing={editingSessionId === session.id}
                    editingTitle={editingTitle}
                    setEditingTitle={setEditingTitle}
                    onSaveRename={() => saveRename(session.id)}
                    onCancelRename={() => setEditingSessionId(null)}
                    onStartRename={() => startRename(session)}
                    onSelect={() => {
                      onSelectTab('chat');
                      onSelectSession(session.id);
                      if (isMobile && onCloseMobile) onCloseMobile();
                    }}
                    onDelete={() => onDeleteSession(session.id)}
                    onTogglePin={() => onTogglePinSession(session.id)}
                  />
                ))}
              </div>
            )}

            <div>
              {regularSessions.map((session) => (
                <ThreadItem
                  key={session.id}
                  session={session}
                  isActive={activeTab === 'chat' && activeSessionId === session.id}
                  isEditing={editingSessionId === session.id}
                  editingTitle={editingTitle}
                  setEditingTitle={setEditingTitle}
                  onSaveRename={() => saveRename(session.id)}
                  onCancelRename={() => setEditingSessionId(null)}
                  onStartRename={() => startRename(session)}
                  onSelect={() => {
                    onSelectTab('chat');
                    onSelectSession(session.id);
                    if (isMobile && onCloseMobile) onCloseMobile();
                  }}
                  onDelete={() => onDeleteSession(session.id)}
                  onTogglePin={() => onTogglePinSession(session.id)}
                />
              ))}

              {filteredSessions.length === 0 && (
                <div className="p-4 text-center text-xs text-zinc-600">
                  No previous conversations found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Operative Profile & Terminal Lock */}
        <div className="p-3 border-t border-white/[0.06] bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              IS
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-white block truncate">Operative</span>
              <span className="text-[10px] text-emerald-400 font-mono block">Clearance Verified</span>
            </div>
          </div>
          <button
            onClick={onLockTerminal}
            title="Lock Terminal (Clearance PIN)"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
};

interface ThreadItemProps {
  session: ChatSession;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  setEditingTitle: (val: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onStartRename: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

const ThreadItem: React.FC<ThreadItemProps> = ({
  session,
  isActive,
  isEditing,
  editingTitle,
  setEditingTitle,
  onSaveRename,
  onCancelRename,
  onStartRename,
  onSelect,
  onDelete,
  onTogglePin,
}) => {
  if (isEditing) {
    return (
      <div className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-white/20 flex items-center gap-1.5">
        <input
          type="text"
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          autoFocus
          className="bg-transparent text-xs text-white focus:outline-none flex-1 font-sans"
        />
        <button onClick={onSaveRename} className="text-emerald-400 p-0.5 hover:text-emerald-300">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={onCancelRename} className="text-zinc-400 p-0.5 hover:text-zinc-200">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition ${
        isActive
          ? 'bg-zinc-800 text-white font-medium border border-white/10'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-2 truncate pr-2">
        <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
        <span className="truncate text-xs">{session.title}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartRename();
          }}
          title="Rename conversation"
          className="p-1 hover:text-zinc-200 text-zinc-500 transition cursor-pointer"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          title={session.pinned ? 'Unpin' : 'Pin to top'}
          className="p-1 hover:text-zinc-200 text-zinc-500 transition cursor-pointer"
        >
          <Pin className={`w-3 h-3 ${session.pinned ? 'text-amber-400 fill-amber-400' : ''}`} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete conversation"
          className="p-1 hover:text-rose-400 text-zinc-500 transition cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
