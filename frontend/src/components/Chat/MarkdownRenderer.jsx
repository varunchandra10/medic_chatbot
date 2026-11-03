import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none text-[13.5px] leading-relaxed text-slate-800 dark:text-slate-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm font-bold text-indigo-950 dark:text-indigo-300 mt-3.5 mb-1.5 flex items-center gap-1.5" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mt-3 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="my-1.5 text-slate-700 dark:text-slate-300 leading-normal" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="my-2 space-y-1 pl-4 list-disc marker:text-indigo-500" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-indigo-600 font-medium" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-slate-700 dark:text-slate-300 pl-1" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="my-2 pl-3 py-1 border-l-3 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-r-md text-xs italic text-slate-600 dark:text-slate-300" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full text-xs text-left divide-y divide-slate-200 dark:divide-slate-800" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-semibold text-slate-700 dark:text-slate-200" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-2 text-left" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/60" {...props} />
          ),
          code: ({ node, inline, ...props }) =>
            inline ? (
              <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-obsidian-800 font-mono text-[12px] text-indigo-700 dark:text-indigo-300" {...props} />
            ) : (
              <pre className="p-3 my-2 rounded-lg bg-obsidian-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
                <code {...props} />
              </pre>
            )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
