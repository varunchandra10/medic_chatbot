import React from 'react';
import { Lightbulb, X, AlertTriangle, FileText, Lock, PhoneCall } from 'lucide-react';

export function QuickTipsDrawer({ isOpen, onClose, t }) {
  if (!isOpen) return null;

  const tips = [
    {
      icon: <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />,
      title: "Be specific",
      desc: t('tip_1', "Be specific: include duration and severity.")
    },
    {
      icon: <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />,
      title: "Lab Reports",
      desc: t('tip_2', "Upload lab reports (CBC/LFT) for interpretation.")
    },
    {
      icon: <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />,
      title: "Privacy First",
      desc: t('tip_3', "Do not share personal identifiers or patient names.")
    },
    {
      icon: <PhoneCall className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />,
      title: "Emergencies",
      desc: t('tip_4', "In life-threatening emergencies, immediately contact local emergency services (112 / 911 / 108).")
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150">
      <div className="w-80 bg-white dark:bg-obsidian-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              {t('tips_title', "Quick tips")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {tips.map((tip, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5"
            >
              {tip.icon}
              <div>
                <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 mb-0.5">
                  {tip.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {tip.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

