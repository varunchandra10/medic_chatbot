import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

export function DeleteModal({ isOpen, onClose, onConfirm, t }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-3">
          <Trash2 className="w-5 h-5" />
        </div>

        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">
          {t('delete_title', "Delete Conversation?")}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          {t('delete_confirm', "This action cannot be undone. All messages in this session will be permanently removed.")}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel', "Cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors shadow-sm"
          >
            {t('delete', "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

