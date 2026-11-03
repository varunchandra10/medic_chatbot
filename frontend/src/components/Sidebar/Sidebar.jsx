import React from 'react';
import {
  Plus,
  MessageSquare,
  FileText,
  Trash2,
  HeartPulse,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { SidebarUserCard } from './SidebarUserCard';

export function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNewChat,
  conversations = [],
  activeChatId,
  onSelectChat,
  onDeleteChatClick,
  isDarkMode,
  onToggleTheme,
  user,
  onLogout,
  onOpenProfile,
  onOpenAuthPage,
  t
}) {
  return (
    <aside
      className={`bg-white dark:bg-obsidian-900 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between select-none shrink-0 h-full transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header & New Chat */}
      <div className={`shrink-0 ${isCollapsed ? 'p-2' : 'p-3.5 pb-2'}`}>
        {/* Brand Header with Expand/Collapse Button */}
        {isCollapsed ? (
          /* Collapsed Mini Header */
          <div className="flex flex-col items-center gap-2 pt-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>

            {/* Expand Sidebar Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </button>
          </div>
        ) : (
          /* Expanded Full Header */
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight block leading-none">
                  {t('brand', "Medi-Assist")}
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide uppercase">
                  Health AI v2.0
                </span>
              </div>
            </div>

            {/* Collapse Sidebar Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* New Chat Primary Button */}
        <div className="mt-2.5">
          {isCollapsed ? (
            <button
              type="button"
              onClick={onNewChat}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 mx-auto transition-all cursor-pointer"
              title={t('new_chat', "New chat")}
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewChat}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('new_chat', "New chat")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle Section: Direct Consultation History List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        {isCollapsed ? (
          /* Collapsed Mini History Icons */
          <div className="flex flex-col items-center gap-1.5">
            {conversations.slice(0, 8).map((chat) => {
              const isActive = activeChatId === chat.id;
              const isDoc = chat.title?.startsWith('Doc:');
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => onSelectChat && onSelectChat(chat.id)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-300 dark:border-indigo-800 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title={chat.title || "Health consultation"}
                >
                  {isDoc ? <FileText className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        ) : (
          /* Expanded Full History List */
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <span>{t('history', "Consultations")}</span>
              {conversations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
                  {conversations.length}
                </span>
              )}
            </div>

            {conversations.length === 0 ? (
              <div className="text-center py-8 px-2 text-slate-400 dark:text-slate-500 text-xs">
                <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="font-medium text-[11.5px] text-slate-500 dark:text-slate-400">No past chats yet</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
                  Your consultations and lab report chats will appear here.
                </p>
              </div>
            ) : (
              conversations.map((chat) => {
                const isActive = activeChatId === chat.id;
                const isDoc = chat.title?.startsWith('Doc:');

                return (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat && onSelectChat(chat.id)}
                    className={`group w-full px-2.5 py-2 rounded-xl text-left text-xs transition-all flex items-center justify-between cursor-pointer select-none ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold border border-indigo-200/80 dark:border-indigo-800/70 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isDoc ? (
                        <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      )}
                      <span className="truncate block flex-1 text-[12px] leading-tight">
                        {chat.title || "Health consultation"}
                      </span>
                    </div>

                    {onDeleteChatClick && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChatClick(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-all cursor-pointer shrink-0 ml-1"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-600" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Dedicated User Profile Card */}
      <div className="shrink-0">
        <SidebarUserCard
          isCollapsed={isCollapsed}
          user={user}
          onOpenProfile={onOpenProfile}
          onOpenAuthPage={onOpenAuthPage}
          onLogout={onLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={onToggleTheme}
          t={t}
        />
      </div>
    </aside>
  );
}

export default Sidebar;
