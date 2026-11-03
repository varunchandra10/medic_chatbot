import React from 'react';
import { Activity, ShieldCheck, Stethoscope, Sparkles, BookOpen, HeartPulse, Zap } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: BugIcon,
    title: "Understanding Malaria",
    subtitle: "CMDT (Page 1541)",
    prompt: "What are the common symptoms, causes, and treatment approaches for malaria according to CMDT?"
  },
  {
    icon: Activity,
    title: "Diabetic Ketoacidosis (DKA)",
    subtitle: "Harrison's Manual",
    prompt: "What is diabetic ketoacidosis, what causes it, and what are the warning signs to look out for?"
  },
  {
    icon: HeartPulse,
    title: "Heart Health & Warning Signs",
    subtitle: "AHA Reference",
    prompt: "What are the key warning signs of a heart condition that require prompt medical attention?"
  },
  {
    icon: Stethoscope,
    title: "Understanding Blood Pressure",
    subtitle: "Health Guide",
    prompt: "What do Stage 1 and Stage 2 high blood pressure mean, and how can lifestyle changes help?"
  }
];

function BugIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  );
}

export function WelcomeHero({ onSelectSuggestion }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Icon Badge */}
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/10">
          <HeartPulse className="w-7 h-7" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-obsidian-900 rounded-full p-1 shadow-xs border border-slate-200 dark:border-slate-800">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
        Evidence-Based Health Assistant
      </h2>
      <p className="mt-2 text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
        Helping you understand diseases, symptoms, and health conditions using verified medical textbooks: <span className="text-indigo-600 dark:text-indigo-400 font-medium">CMDT 2022</span>, <span className="text-indigo-600 dark:text-indigo-400 font-medium">Harrison's</span>, and <span className="text-indigo-600 dark:text-indigo-400 font-medium">Gale Encyclopedia</span>.
      </p>

      {/* Trust Badges */}
      <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 font-medium">
          <ShieldCheck className="w-3 h-3 text-indigo-600" />
          Zero-Data-Leakage Local
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 font-medium">
          <Zap className="w-3 h-3 text-blue-600" />
          ReAct & CoT Enabled
        </span>
      </div>

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-7 w-full text-left">
        {SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectSuggestion(item.prompt)}
              className="group p-3 rounded-xl bg-white dark:bg-obsidian-850 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/60 dark:hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/5 transition-all text-left flex items-start gap-2.5"
            >
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-obsidian-800 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 transition-colors shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                  {item.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

