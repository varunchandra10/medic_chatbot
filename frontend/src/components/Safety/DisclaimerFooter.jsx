import React from 'react';
import { ShieldAlert } from 'lucide-react';

export function DisclaimerFooter() {
  return (
    <footer className="py-2 px-4 bg-white dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 select-none shrink-0">
      <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <span>
        <strong className="text-slate-700 dark:text-slate-300">Medical Disclaimer:</strong> Evidence-based educational health information only. Designed to help people understand diseases and symptoms. Does not substitute professional medical diagnosis, physician consultation, or emergency care.
      </span>
    </footer>
  );
}
