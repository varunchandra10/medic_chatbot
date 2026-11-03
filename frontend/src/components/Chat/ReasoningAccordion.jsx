import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Terminal, Eye, Sparkles, Check, Copy } from 'lucide-react';

export function ReasoningAccordion({ steps = [], isLive = false }) {
  // Closed by default - stays closed until user explicitly clicks to open
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!steps || steps.length === 0) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    const trace = steps
      .map((s) => `[${s.type.toUpperCase()}${s.step ? ` ${s.step}` : ''}]: ${s.text}`)
      .join('\n');
    navigator.clipboard.writeText(trace);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-3 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/40 overflow-hidden shadow-2xs transition-all">
      {/* Header Bar - Closed by default */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-indigo-100/30 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-5 h-5 rounded-md bg-indigo-600/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-tight text-indigo-950 dark:text-indigo-200">
            Health Reasoning Trace
          </span>

          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-medium">
            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </span>

          {/* Small loader shown while reasoning is live and closed */}
          {isLive && (
            <span className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <Sparkles className="w-3 h-3 animate-spin text-indigo-500" />
              <span className="text-[10.5px]">Reasoning...</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 rounded text-indigo-500 transition-colors cursor-pointer"
            title="Copy Reasoning Trace"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Step Trace (Only when user explicitly clicks to open) */}
      {isOpen && (
        <div className="px-3.5 pb-3 pt-1 space-y-2 text-xs border-t border-indigo-100 dark:border-indigo-900/40">
          {steps.map((step, idx) => {
            const isThought = step.type === 'thought';
            const isAction = step.type === 'action';
            const isObservation = step.type === 'observation';

            return (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
              >
                <div className="flex items-center gap-1.5 mb-1 font-medium text-[11.5px]">
                  {isThought && (
                    <>
                      <div className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Brain className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-purple-700 dark:text-purple-300 font-semibold">
                        Thought {step.step ? `(Step ${step.step})` : ''}
                      </span>
                    </>
                  )}
                  {isAction && (
                    <>
                      <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Terminal className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-blue-700 dark:text-blue-300 font-semibold">
                        Tool Action
                      </span>
                    </>
                  )}
                  {isObservation && (
                    <>
                      <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Eye className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                        Observation & Evidence
                      </span>
                    </>
                  )}
                </div>
                <div className="text-slate-700 dark:text-slate-300 pl-5 whitespace-pre-wrap font-mono text-[11px] leading-relaxed select-text">
                  {step.text}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ReasoningAccordion;
