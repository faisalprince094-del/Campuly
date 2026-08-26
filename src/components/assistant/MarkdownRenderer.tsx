import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed break-words space-y-3 font-normal text-[14px]">
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-3 mb-2 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-2 border-b border-slate-200/60 dark:border-slate-800 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5 mb-1.5 flex items-center gap-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 my-2 text-slate-700 dark:text-slate-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 my-2 text-slate-700 dark:text-slate-300">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-700 dark:text-slate-300">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-600 pl-3.5 py-1 italic text-slate-600 dark:text-slate-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg my-2">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-[#1E293B]">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-[#1E293B] text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-[#101823] font-bold text-slate-800 dark:text-slate-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200/60 dark:divide-[#1E293B]/60 bg-white dark:bg-[#0B1017]">
              {children}
            </tbody>
          ),
          th: ({ children }) => <th className="px-3 py-2 text-left">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2">{children}</td>,
          code: ({ children }) => {
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1E293B] text-blue-600 dark:text-blue-400 font-mono text-xs">
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            return (
              <pre className="p-3 rounded-xl bg-slate-900 dark:bg-[#05070A] text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 my-2">
                {children}
              </pre>
            );
          },
          hr: () => <hr className="my-3 border-slate-200/80 dark:border-[#1E293B]" />,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
