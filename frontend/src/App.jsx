import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { QuickTipsDrawer } from './components/Sidebar/QuickTipsDrawer';
import { HistoryDrawer } from './components/Sidebar/HistoryDrawer';
import { DeleteModal } from './components/Sidebar/DeleteModal';
import { ChatWindow } from './components/Chat/ChatWindow';
import { NewsFeed } from './components/News/NewsFeed';
import { UserProfilePage } from './components/Profile/UserProfilePage';
import { AuthPage } from './components/Auth/AuthPage';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import translationsData from './translations.json';

export default function App() {
  const { isOnline } = useNetworkStatus();

  // ── Auth state ──────────────────────────────────────────
  // null  = not yet checked (loading)
  // false = checked, not logged in → show AuthPage
  // obj   = authenticated user object
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false); // prevents flash

  // Active view: 'chat' | 'profile'  (auth is its own full-screen)
  const [activeView, setActiveView] = useState('chat');

  // Language
  const [currentLanguage, setCurrentLanguage] = useState(
    () => localStorage.getItem('medi_assist_lang') || 'en'
  );

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem('medi_assist_theme') === 'dark'
  );

  // ReAct Agentic Mode
  const [agenticMode, setAgenticMode] = useState(
    () => localStorage.getItem('medi_assist_agentic') !== 'false'
  );

  // Sidebar collapse (default open on desktop so history is immediately visible)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('medi_assist_sidebar_collapsed');
    return saved !== null ? saved === 'true' : false;
  });

  // Drawers & modals
  const [isQuickTipsOpen, setIsQuickTipsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, chatId: null });

  // ── Session & Consultation History Management ────────────
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('medi_assist_saved_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem('medi_assist_active_session_id') || null;
  });

  const [messages, setMessages] = useState(() => {
    try {
      const savedId = localStorage.getItem('medi_assist_active_session_id');
      if (savedId) {
        const savedSessions = JSON.parse(localStorage.getItem('medi_assist_saved_sessions') || '[]');
        const found = savedSessions.find((s) => s.id === savedId);
        if (found && Array.isArray(found.messages)) return found.messages;
      }
    } catch (_) {}
    return [];
  });

  const handleUpdateMessages = (updater) => {
    setMessages((prev) => {
      const nextMessages = typeof updater === 'function' ? updater(prev) : updater;

      let currentId = activeSessionId;
      if (!currentId && nextMessages.length > 0) {
        currentId = `session-${Date.now()}`;
        setActiveSessionId(currentId);
        localStorage.setItem('medi_assist_active_session_id', currentId);
      }

      if (currentId && nextMessages.length > 0) {
        setSessions((prevSessions) => {
          const firstUserMsg = nextMessages.find((m) => m.role === 'user');
          let title = 'General Health Consultation';
          if (firstUserMsg) {
            if (firstUserMsg.file?.name) {
              title = `Doc: ${firstUserMsg.file.name}`;
            } else if (firstUserMsg.content) {
              const clean = firstUserMsg.content.trim();
              title = clean.slice(0, 42) + (clean.length > 42 ? '…' : '');
            }
          }

          const existingIndex = prevSessions.findIndex((s) => s.id === currentId);
          let updated;
          if (existingIndex >= 0) {
            updated = [...prevSessions];
            updated[existingIndex] = {
              ...updated[existingIndex],
              title: updated[existingIndex].title || title,
              messages: nextMessages,
              updatedAt: new Date().toISOString()
            };
          } else {
            const newSession = {
              id: currentId,
              title,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: nextMessages
            };
            updated = [newSession, ...prevSessions];
          }

          try {
            localStorage.setItem('medi_assist_saved_sessions', JSON.stringify(updated));
          } catch (e) {
            console.warn('Failed to save session to localStorage:', e);
          }
          return updated;
        });
      }

      return nextMessages;
    });
  };

  // ── Check existing session on mount ────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        // Only set user if truly authenticated (not the guest fallback)
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(false); // not logged in
        }
      })
      .catch(() => {
        setCurrentUser(false); // backend offline → show auth page
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // ── Dark mode side-effect ───────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('medi_assist_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // ── Translation helper ──────────────────────────────────
  const t = (key, fallback = '') => {
    const langDict = translationsData[currentLanguage];
    if (langDict?.[key]) return langDict[key];
    if (translationsData[key]) return translationsData[key];
    return fallback;
  };

  // ── Handlers ────────────────────────────────────────────
  const handleLanguageChange = (langCode) => {
    setCurrentLanguage(langCode);
    localStorage.setItem('medi_assist_lang', langCode);
  };

  const handleToggleAgenticMode = () => {
    setAgenticMode((prev) => {
      const next = !prev;
      localStorage.setItem('medi_assist_agentic', String(next));
      return next;
    });
  };

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('medi_assist_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Ctrl+B / Cmd+B toggles sidebar
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelectChat = (id) => {
    const selected = sessions.find((s) => s.id === id);
    if (selected) {
      setActiveSessionId(id);
      localStorage.setItem('medi_assist_active_session_id', id);
      setMessages(selected.messages || []);
    }
    setIsHistoryOpen(false);
    if (activeView !== 'chat') setActiveView('chat');
  };

  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    setActiveSessionId(newId);
    localStorage.setItem('medi_assist_active_session_id', newId);
    setMessages([]);
    setIsHistoryOpen(false);
    if (activeView !== 'chat') setActiveView('chat');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) { /* offline */ }
    setCurrentUser(false);   // false = not authenticated, triggers AuthPage
    setActiveView('chat');   // reset view for next login
  };

  const handleDeleteChatConfirm = () => {
    const targetId = deleteModalState.chatId;
    if (targetId) {
      setSessions((prev) => {
        const filtered = prev.filter((c) => c.id !== targetId);
        try {
          localStorage.setItem('medi_assist_saved_sessions', JSON.stringify(filtered));
        } catch (_) {}
        return filtered;
      });

      if (activeSessionId === targetId) {
        const nextId = `session-${Date.now()}`;
        setActiveSessionId(nextId);
        localStorage.setItem('medi_assist_active_session_id', nextId);
        setMessages([]);
      }
    }
    setDeleteModalState({ isOpen: false, chatId: null });
  };

  // ── Render ──────────────────────────────────────────────

  // While we're waiting for the session check, show a minimal loading screen
  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-obsidian-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading Medi-Assist…</p>
        </div>
      </div>
    );
  }

  // Not authenticated → show full-screen auth page
  if (!currentUser) {
    return (
      <AuthPage
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setActiveView('chat');
        }}
      />
    );
  }

  // Authenticated → show main app
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-obsidian-950 text-slate-800 dark:text-slate-100 font-sans">

      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        onNewChat={handleNewChat}
        conversations={sessions}
        activeChatId={activeSessionId}
        onSelectChat={handleSelectChat}
        onDeleteChatClick={(id) => setDeleteModalState({ isOpen: true, chatId: id })}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        user={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setActiveView('profile')}
        t={t}
      />

      {/* 2. Main Application Panel */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {activeView === 'chat' ? (
          <div className="flex-1 flex overflow-hidden">
            <ChatWindow
              messages={messages}
              setMessages={handleUpdateMessages}
              onOpenHistory={() => setIsHistoryOpen(true)}
              isOnline={isOnline}
              currentLanguage={currentLanguage}
              agenticMode={agenticMode}
              user={currentUser}
              t={t}
              onOpenQuickTips={() => setIsQuickTipsOpen(true)}
              onToggleNews={() => setIsNewsOpen(!isNewsOpen)}
              isNewsOpen={isNewsOpen}
            />
          </div>
        ) : (
          <UserProfilePage
            onBackToChat={() => setActiveView('chat')}
            currentUser={currentUser}
            onUserUpdate={setCurrentUser}
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            agenticMode={agenticMode}
            onToggleAgenticMode={handleToggleAgenticMode}
            onLogout={handleLogout}
            t={t}
          />
        )}
      </div>

      {/* 3. Overlay Drawers & Modals */}
      <QuickTipsDrawer
        isOpen={isQuickTipsOpen}
        onClose={() => setIsQuickTipsOpen(false)}
        t={t}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={sessions}
        activeChatId={activeSessionId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChatClick={(id) => setDeleteModalState({ isOpen: true, chatId: id })}
        t={t}
      />

      {isNewsOpen && (
        <NewsFeed isOnline={isOnline} onClose={() => setIsNewsOpen(false)} />
      )}

      <DeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, chatId: null })}
        onConfirm={handleDeleteChatConfirm}
        t={t}
      />
    </div>
  );
}
