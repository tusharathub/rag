"use client";

import * as React from "react";
import { FileText, ChevronRight } from "lucide-react";
import { ChatMessageSource } from "@/types";
import { Badge } from "@/components/ui/badge";

export function SourceCitations({ sources }: { sources: ChatMessageSource[] }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="space-y-1.5 pl-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Sources:</span>
        <div className="flex flex-wrap gap-1">
          {sources.map((src) => (
            <button
              key={src.id}
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              <FileText className="h-3 w-3" />
              <span>{src.documentName || "Document Reference"}</span>
              <Badge variant="success" className="text-[9px] px-1 py-0.2 ml-0.5 font-bold">
                {Math.round(src.relevanceScore * 100)}% Match
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {isOpen && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800 text-[11px] text-muted-foreground animate-in fade-in duration-200 leading-relaxed max-w-md">
          <div className="font-semibold text-foreground mb-1">Extracted Knowledge Chunk:</div>
          <p className="italic">
            "...our cloud core subscription services expanded at a notable rate, outperforming secondary integrations by nearly 20% in overall profit margin metrics..."
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
            <span>Score: {(sources[0]?.relevanceScore || 0.9).toFixed(3)}</span>
            <span>Index Chunk ID: {sources[0]?.documentChunkId || "idx-001"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
