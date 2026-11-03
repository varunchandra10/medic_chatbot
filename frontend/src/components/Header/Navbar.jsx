import React from 'react';
import { PanelLeftClose, PanelLeftOpen, Database, Brain, Newspaper } from 'lucide-react';
import { NetworkStatusBadge } from './NetworkStatusBadge';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
];

export function Navbar({
  isSidebarOpen,
  onToggleSidebar,
  currentLanguage,
  onLanguageChange,
  isOnline,
  agenticMode = true,
  onToggleAgenticMode,
  isNewsOpen,
  onToggleNews,
  t
}) {
  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between select-none relative z-20">
      {/* Left: Sidebar Toggle Button + Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isSidebarOpen ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            M
          </div>
          <h1 className="font-bold text-sm text-slate-800 dark:text-slate-100 tracking-tight">
            {t('chat_title', "Medi-Assist AI")}
          </h1>
        </div>
      </div>

      {/* Center: Language Selector Pills */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
        {LANGUAGES.map((lang) => {
          const isActive = currentLanguage === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => onLanguageChange(lang.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>

      {/* Right: Vectors Badge + Agentic ReAct Pill + News + Status */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Agentic ReAct Mode Toggle */}
        <button
          type="button"
          onClick={onToggleAgenticMode}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
            agenticMode
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 shadow-2xs'
              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 opacity-80'
          }`}
          title="Toggle ReAct (Reasoning + Acting) Agentic Cycle"
        >
          <Brain
            className={`w-3.5 h-3.5 ${
              agenticMode ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-slate-400'
            }`}
          />
          <span className="font-semibold text-[11px] hidden sm:inline">
            {agenticMode ? 'ReAct Agent (CoT)' : 'Direct RAG'}
          </span>
        </button>

        {/* Health News Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleNews}
          className={`p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1.5 ${
            isNewsOpen
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
          title="Toggle Health Bulletins Feed"
        >
          <Newspaper className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[11px] font-medium hidden md:inline">Bulletins</span>
        </button>

        {/* Vector DB Badge */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-medium text-[11px]">19,712 Vectors</span>
        </div>

        {/* Online / Offline Sync Badge */}
        <NetworkStatusBadge isOnline={isOnline} />
      </div>
    </header>
  );
}
