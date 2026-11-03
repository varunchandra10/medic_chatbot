import React from 'react';
import { History, X, MessageSquare, Trash2, Plus, Clock, FileText } from 'lucide-react';

export function HistoryDrawer({
  isOpen,
  onClose,
  conversations = [],
  activeChatId,
  onSelectChat,
  onDeleteChatClick,
  onNewChat,
  t
}) {
  if (!isOpen) return null;

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24 && d.getDate() === now.getDate()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-start z-50 animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-84 sm:w-96 max-w-[90vw] bg-white dark:bg-obsidian-900 h-full shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                {t('history', "Consultation History")}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {conversations.length} saved {conversations.length === 1 ? 'chat' : 'chats'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onNewChat && (
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 transition-colors cursor-pointer"
                title="Start a new chat"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of past conversations */}
        <div className="p-3 space-y-2 overflow-y-auto flex-1">
          {conversations.length === 0 ? (
            <div className="text-center py-16 text-slate-400 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <MessageSquare className="w-6 h-6 opacity-60" />
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No Past Consultations Yet</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Your questions, symptom checks, and lab report explanations will appear here automatically.
              </p>
            </div>
          ) : (
            conversations.map((chat) => {
              const isActive = activeChatId === chat.id;
              const isDoc = chat.title?.startsWith('Doc:');
              const messageCount = chat.messages?.length || 0;

              return (
                <div
                  key={chat.id}
                  className={`group p-3 rounded-2xl border transition-all flex items-start justify-between cursor-pointer ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/40 dark:bg-obsidian-800/30 hover:bg-white dark:hover:bg-obsidian-850'
                  }`}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2 flex-1">
                    <div className="mt-0.5 shrink-0">
                      {isDoc ? (
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                          {chat.title || "Health topic inquiry"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                        {chat.updatedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(chat.updatedAt)}
                          </span>
                        )}
                        {messageCount > 0 && (
                          <span>• {messageCount} {messageCount === 1 ? 'msg' : 'msgs'}</span>
                        )}
                        {isActive && (
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">• Active</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChatClick(chat.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryDrawer;
