import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react';

export function CitationBadge({ citations }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>Verified References ({citations.length} Medical Sources)</span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isExpanded && (
        <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
          {citations.map((cite, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-slate-50 dark:bg-obsidian-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs"
            >
              <div className="flex items-center justify-between font-semibold text-[11.5px] text-indigo-900 dark:text-indigo-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  {cite.book_title || cite.source}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-mono text-[10.5px]">
                  Page {cite.page || 'N/A'}
                </span>
              </div>
              {cite.excerpt && (
                <p className="mt-1.5 text-[11.5px] text-slate-600 dark:text-slate-300 italic pl-4 border-l-2 border-indigo-500/50 leading-relaxed">
                  "{cite.excerpt}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
