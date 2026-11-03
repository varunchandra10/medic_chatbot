import React, { useState } from 'react';
import { X, Cpu, Cloud, Database, RefreshCw, CheckCircle2 } from 'lucide-react';

export function SettingsModal({ isOpen, onClose }) {
  const [modelType, setModelType] = useState('local');
  const [geminiKey, setGeminiKey] = useState('');
  const [isUpdatingCorpus, setIsUpdatingCorpus] = useState(false);
  const [corpusStatus, setCorpusStatus] = useState(null);

  if (!isOpen) return null;

  const handleUpdateCorpus = async () => {
    setIsUpdatingCorpus(true);
    setCorpusStatus(null);
    try {
      const res = await fetch('/api/corpus/update', { method: 'POST' });
      const data = await res.json();
      setCorpusStatus(data.message || 'Corpus updated successfully');
    } catch (err) {
      setCorpusStatus('Could not trigger update. Please check backend.');
    } finally {
      setIsUpdatingCorpus(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <h2 className="font-semibold text-sm text-slate-800">System & AI Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs text-slate-600">
          {/* Inference Mode */}
          <div>
            <label className="font-medium text-slate-800 block mb-1.5">LLM Inference Engine</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModelType('local')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all ${
                  modelType === 'local'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Cpu className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-xs">Local (Ollama)</div>
                  <div className="text-[10px] text-slate-500">100% Offline & Private</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModelType('cloud')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all ${
                  modelType === 'cloud'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Cloud className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-xs">Cloud (Gemini)</div>
                  <div className="text-[10px] text-slate-500">Google Gemini API</div>
                </div>
              </button>
            </div>

            {modelType === 'cloud' && (
              <div className="mt-2.5">
                <input
                  type="password"
                  placeholder="Enter Gemini API Key"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Local Knowledge Base Status */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Local Vector Knowledge Base</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                Active (ChromaDB)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              19,712 embedded clinical chunks from CMDT, Harrison's Manual, and Gale Encyclopedia.
            </p>

            <button
              onClick={handleUpdateCorpus}
              disabled={isUpdatingCorpus}
              className="mt-2.5 w-full py-1.5 px-3 rounded bg-white border border-slate-300 hover:bg-slate-100 font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingCorpus ? 'animate-spin' : ''}`} />
              <span>{isUpdatingCorpus ? 'Scanning & Ingesting...' : 'Scan & Update Knowledge Base'}</span>
            </button>

            {corpusStatus && (
              <p className="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{corpusStatus}</span>
              </p>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}

