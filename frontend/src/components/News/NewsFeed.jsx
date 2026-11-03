import React, { useState, useEffect } from 'react';
import { Newspaper, RefreshCw, ExternalLink, AlertCircle, X, MapPin } from 'lucide-react';

const REGIONS = [
  { code: 'in', label: 'India', flag: '🇮🇳' },
  { code: 'us', label: 'USA', flag: '🇺🇸' },
  { code: 'gb', label: 'UK', flag: '🇬🇧' },
  { code: 'global', label: 'Global', flag: '🌐' }
];

export function NewsFeed({ isOnline, onClose }) {
  const detectUserCountry = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('Asia/Colombo')) return 'in';
      if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles') || tz.includes('America/')) return 'us';
      if (tz.includes('London') || tz.includes('Europe/')) return 'gb';
      return 'in';
    } catch {
      return 'in';
    }
  };

  const [selectedCountry, setSelectedCountry] = useState(() => detectUserCountry());
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNews = async (countryToFetch) => {
    const c = countryToFetch || selectedCountry;
    setLoading(true);
    try {
      const res = await fetch(`/api/news?country=${c}`);
      if (res.ok) {
        const data = await res.json();
        setNews(data.news || []);
      }
    } catch (err) {
      console.warn("Could not load news feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(selectedCountry);
  }, [selectedCountry, isOnline]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-84 sm:w-96 max-w-[92vw] bg-white dark:bg-obsidian-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col cursor-default select-none transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Newspaper className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                {isOnline ? "Live Health News" : "Health Advisories"}
              </h2>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                <span>Location-Aware Feed</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => fetchNews(selectedCountry)}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh Feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Region Selector Tabs */}
        <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-obsidian-850 flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          {REGIONS.map((r) => {
            const isSelected = selectedCountry === r.code;
            return (
              <button
                key={r.code}
                type="button"
                onClick={() => setSelectedCountry(r.code)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <span>{r.flag}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feed List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {!isOnline && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-[11px] flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Currently offline. Displaying cached regional health guidelines.</span>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Fetching location headlines…</span>
            </div>
          )}

          {!loading && news.length === 0 && (
            <div className="text-center py-16 text-xs text-slate-400">
              <p>No medical alerts available for this region.</p>
            </div>
          )}

          {!loading && news.map((item, idx) => (
            <article
              key={idx}
              className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 hover:shadow-md transition-all bg-white dark:bg-obsidian-850 overflow-hidden flex flex-col"
            >
              {item.image && (
                <div className="relative w-full h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.parentElement.style.display = 'none';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium mb-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider text-[9px]">
                      {item.source || 'Health Advisory'}
                    </span>
                    <span>{item.published || item.time || 'Latest'}</span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {item.summary || item.snippet}
                  </p>
                </div>

                {item.link && item.link !== '#' && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline"
                  >
                    <span>Read Full Article</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NewsFeed;
