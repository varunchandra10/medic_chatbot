import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Sun, Moon, ChevronUp } from 'lucide-react';

export function SidebarUserCard({
  isCollapsed = false,
  user,
  onOpenProfile,
  onLogout,
  isDarkMode,
  onToggleTheme,
  t
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0][0] || 'U').toUpperCase();
  };

  const name = user?.name || 'User';
  const email = user?.email || '';

  return (
    <div
      className={`relative border-t border-slate-200 dark:border-slate-800/80 ${isCollapsed ? 'p-2 flex justify-center' : 'p-2.5'}`}
      ref={dropdownRef}
    >
      {/* Popover Action Menu */}
      {isOpen && (
        <div className={`absolute bottom-full mb-2 bg-white dark:bg-obsidian-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 z-50 ${
          isCollapsed ? 'left-2 w-56' : 'left-2 right-2'
        }`}>
          {/* User info header */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
              {name}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {email}
            </div>
          </div>

          {/* Profile & Settings */}
          <button
            type="button"
            onClick={() => { setIsOpen(false); onOpenProfile(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left font-medium cursor-pointer"
          >
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Profile & Settings</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left font-medium cursor-pointer"
          >
            {isDarkMode
              ? <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              : <Moon className="w-4 h-4 text-slate-400 shrink-0" />
            }
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={() => { setIsOpen(false); onLogout(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-500 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Clickable User Card */}
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative group p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center cursor-pointer"
          title={name}
        >
          {user?.picture && !imgError ? (
            <img
              src={user.picture}
              alt={name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-9 h-9 rounded-xl object-cover shadow-md shadow-indigo-500/20 group-hover:ring-2 group-hover:ring-indigo-400/50 transition-all"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:ring-2 group-hover:ring-indigo-400/50 transition-all select-none">
              {getInitials(name)}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-obsidian-900 rounded-full" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="relative shrink-0">
            {user?.picture && !imgError ? (
              <img
                src={user.picture}
                alt={name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-9 h-9 rounded-xl object-cover shadow-md shadow-indigo-500/20 group-hover:ring-2 group-hover:ring-indigo-400/50 transition-all"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:ring-2 group-hover:ring-indigo-400/50 transition-all select-none">
                {getInitials(name)}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-obsidian-900 rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors leading-tight">
              {name}
            </div>
            <div className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
              {email}
            </div>
          </div>

          <ChevronUp
            className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}
    </div>
  );
}

export default SidebarUserCard;
