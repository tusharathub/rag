"use client";

import * as React from "react";
import { DocTable } from "@/components/documents/doc-table";

export default function WorkspaceLibraryPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-1">Knowledge Ingestion</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Files are processed via an OCR/Markdown parser, chunked into overlap blocks, and converted to embeddings to match prompt contexts.
        </p>
        <DocTable />
      </div>
    </div>
  );
}
