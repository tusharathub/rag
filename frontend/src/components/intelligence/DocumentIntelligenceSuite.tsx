'use client';

import React, { useState } from 'react';
import { 
  FileText, Lightbulb, HelpCircle, CheckSquare, Clock, 
  Table, Tag, Cpu, GitCompare, Sparkles, Loader2 
} from 'lucide-react';

interface Props {
  documentId: string;
  documentTitle: string;
}

export function DocumentIntelligenceSuite({ documentId, documentTitle }: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'takeaways' | 'timeline' | 'tables' | 'entities' | 'keywords' | 'compare'>('summary');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchFeature = async (endpoint: string, payload?: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/intelligence/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Intelligence request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setData(null);
    if (tab !== 'compare') {
      fetchFeature(`${tab}/${documentId}`);
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl text-slate-100 font-sans">
      {/* Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Document Intelligence Suite</h2>
            <p className="text-xs text-slate-400">Analyzing: <span className="text-indigo-300 font-medium">{documentTitle}</span></p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 bg-slate-950/50 overflow-x-auto scrollbar-none">
        {[
          { id: 'summary', label: 'Summary', icon: FileText },
          { id: 'flashcards', label: 'Flashcards', icon: Lightbulb },
          { id: 'quiz', label: 'Quiz', icon: HelpCircle },
          { id: 'takeaways', label: 'Takeaways', icon: CheckSquare },
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'tables', label: 'Tables', icon: Table },
          { id: 'entities', label: 'Entities', icon: Cpu },
          { id: 'keywords', label: 'Keywords', icon: Tag },
          { id: 'compare', label: 'Compare', icon: GitCompare },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Workspace Area */}
      <div className="p-6 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Processing document with AI engine...</p>
          </div>
        ) : (
          <div className="text-sm leading-relaxed">
            {activeTab === 'summary' && data && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-indigo-300">{data.title}</h3>
                <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50">
                  <span className="text-xs font-bold uppercase text-indigo-400 tracking-wider">Executive Summary</span>
                  <p className="mt-1 text-slate-300">{data.executive_summary}</p>
                </div>
                {data.tldr && (
                  <div className="bg-amber-950/20 border border-amber-800/40 p-3 rounded-lg text-amber-200 text-xs">
                    <strong>TL;DR:</strong> {data.tldr}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2">Key Highlights</h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    {data.key_points?.map((pt: string, i: number) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'flashcards' && data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.cards?.map((c: any, i: number) => (
                  <div key={i} className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-indigo-400 uppercase">Q{i+1}: {c.difficulty}</span>
                      <p className="font-medium text-white mt-1">{c.question}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-700/60 text-slate-300 text-xs bg-slate-900/40 p-2 rounded">
                      <strong>Answer:</strong> {c.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'quiz' && data && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-slate-200">{data.title}</h3>
                {data.questions?.map((q: any, idx: number) => (
                  <div key={idx} className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl space-y-3">
                    <p className="font-medium text-indigo-200">{idx + 1}. {q.question}</p>
                    {q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt: any) => (
                          <div key={opt.option_id} className="p-2 rounded bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                            <span className="font-bold text-indigo-400 mr-2">{opt.option_id}.</span>
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
                      <strong>Correct Answer:</strong> {q.correct_answer} — {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'timeline' && data && (
              <div className="relative border-l border-indigo-500/30 ml-4 pl-6 space-y-6">
                {data.timeline?.map((ev: any, i: number) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-900" />
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/40">
                      {ev.date_or_period}
                    </span>
                    <h4 className="font-medium text-white mt-1">{ev.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'entities' && data && (
              <div className="flex flex-wrap gap-2">
                {data.entities?.map((ent: any, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 flex items-center gap-2">
                    <span className="text-indigo-400 font-bold uppercase text-[10px]">{ent.category}</span>
                    <span className="text-slate-200">{ent.name}</span>
                  </span>
                ))}
              </div>
            )}

            {!data && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Sparkles className="w-10 h-10 mb-2 stroke-[1.5]" />
                <p className="text-sm">Click a tab to generate AI insights for this document.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
