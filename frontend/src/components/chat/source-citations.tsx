"use client";

import * as React from "react";
import { FileText, ExternalLink, ShieldCheck, X, Sparkles, Layout } from "lucide-react";
import { ChatMessageSource } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SourceCitations({ sources }: { sources: ChatMessageSource[] }) {
  const [selectedSource, setSelectedSource] = React.useState<ChatMessageSource | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const getPageString = (src: ChatMessageSource) => {
    if (src.pageStart === undefined) return "N/A";
    if (src.pageStart === src.pageEnd) return `Page ${src.pageStart}`;
    return `Pages ${src.pageStart}-${src.pageEnd}`;
  };

  // Highlights important RAG terms in paragraph context
  const highlightContent = (text: string) => {
    if (!text) return "";
    const terms = [
      "Subscriptions", "recurring", "revenue", "AI", "semantic search", 
      "RAG", "hybrid search", "BM25", "embeddings", "GraphQL", "REST", 
      "metadata", "endpoints", "uploads"
    ];
    let highlighted = text;
    terms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-indigo-500/20 text-indigo-400 border-b border-indigo-500/30 px-0.5 rounded font-medium">$1</mark>');
    });
    return highlighted;
  };

  return (
    <div className="space-y-1.5 pl-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Citations:</span>
        <div className="flex flex-wrap gap-1.5">
          {sources.map((src) => (
            <button
              key={src.id}
              onClick={() => setSelectedSource(src)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-slate-100 dark:hover:bg-slate-850 transition-all text-slate-700 dark:text-slate-300"
            >
              <FileText className="h-3 w-3 text-indigo-500" />
              <span>{src.documentName || "Reference"}</span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                {getPageString(src)}
              </span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <Badge variant="success" className="text-[9px] px-1.5 py-0 rounded font-bold">
                {Math.round(src.relevanceScore * 100)}% Match
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Citation Detail Modal */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedSource(null)}
          />
          
          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-xl bg-background border rounded-2xl p-6 shadow-2xl glass-panel animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-foreground">Verified AI Citation Source</h3>
              </div>
              <button
                onClick={() => setSelectedSource(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200/40 dark:border-slate-800/40">
              <div>
                <span className="text-muted-foreground block font-medium">Document Source</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  {selectedSource.documentName}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block font-medium">Location</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {getPageString(selectedSource)} {selectedSource.sectionPath ? `(${selectedSource.sectionPath.split(" > ").pop()})` : ""}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block font-medium">Confidence Match</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-emerald-500">
                    {Math.round(selectedSource.relevanceScore * 100)}% Match
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    (score: {selectedSource.relevanceScore.toFixed(3)})
                  </span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block font-medium">Chunk Path</span>
                <span className="font-mono text-[10px] text-muted-foreground mt-0.5 block truncate">
                  {selectedSource.documentChunkId}
                </span>
              </div>
            </div>

            {/* Extracted Paragraph Paragraph */}
            <div className="py-4 space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Extracted Paragraph Context
              </span>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-850/50 text-sm leading-relaxed text-foreground/90">
                <p 
                  className="font-normal" 
                  dangerouslySetInnerHTML={{ __html: highlightContent(selectedSource.content || "") }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSource(null)}
                className="rounded-xl"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
                className="rounded-xl flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Document on Page</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Document Viewer Preview */}
      {isPreviewOpen && selectedSource && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setIsPreviewOpen(false)}
          />
          <div className="relative z-10 w-full max-w-4xl h-[85vh] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Preview Toolbar */}
            <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-indigo-400" />
                <div>
                  <h4 className="text-sm font-semibold truncate max-w-xs">{selectedSource.documentName}</h4>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Viewing {getPageString(selectedSource)} • Ingested Knowledge Base
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded-md text-indigo-300 font-bold">
                  {getPageString(selectedSource)}
                </span>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Frame Mock */}
            <div className="flex-1 overflow-y-auto bg-slate-900 p-8 flex justify-center">
              <div className="w-full max-w-2xl bg-white text-slate-900 p-10 rounded-lg shadow-2xl relative border min-h-[600px]">
                {/* PDF layout markings */}
                <div className="absolute top-4 right-6 text-xs text-slate-400 font-bold select-none">
                  {selectedSource.documentName} • {getPageString(selectedSource)}
                </div>
                <div className="absolute top-4 left-6 text-xs text-slate-400 font-semibold select-none uppercase tracking-wider">
                  Ingested Vector Node Block
                </div>

                <div className="mt-12 space-y-6">
                  {/* Title mock */}
                  <h2 className="text-2xl font-bold tracking-tight text-slate-850 pb-2 border-b">
                    {selectedSource.sectionPath || "Extracted Page Fragment"}
                  </h2>

                  {/* Header mock paragraph */}
                  <p className="text-sm text-slate-500 leading-relaxed italic">
                    [Parsed Document Context Fragment Index: {selectedSource.documentChunkId}]
                  </p>

                  {/* Highlight paragraph */}
                  <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 text-sm leading-relaxed text-slate-800 shadow-sm relative">
                    {/* Highlighter indicator bar */}
                    <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-indigo-500 rounded-l-xl" />
                    
                    <p className="font-semibold text-xs text-indigo-600 uppercase tracking-wide mb-1 flex items-center gap-1 select-none">
                      <Sparkles className="h-3 w-3" />
                      <span>RAG Target Chunk Match</span>
                    </p>

                    <p className="leading-relaxed">
                      {selectedSource.content}
                    </p>
                  </div>

                  {/* Body paragraphs to fill out space */}
                  <p className="text-sm text-slate-650 leading-relaxed">
                    This document segment has been indexed into high-dimensional vector embeddings, mapping similarity associations. During inference, prompt injection utilizes this paragraph context to form the ground-truth base for the AI response metrics. Any queries concerning cloud metrics or integration procedures derive validation citations from these verified blocks.
                  </p>

                  <p className="text-sm text-slate-650 leading-relaxed">
                    Additional metrics and validation constraints are parsed page-by-page. For further verification check adjacent indexed segments or refer directly to the engineering team's guidelines regarding pipeline ingestion architectures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
