"use client";

import * as React from "react";
import { DocTable } from "@/components/documents/doc-table";

export default function WorkspaceLibraryPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border border-slate-900 p-6 rounded-xl bg-[#0C0C0C] shadow-2xl font-mono">
        <div className="mb-6 space-y-1">
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="text-[#FFA028]">//</span> Knowledge Ingestion
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Files are processed via an OCR/Markdown parser, chunked into overlap blocks, and converted to 1536-dimensional embeddings.
          </p>
        </div>
        <DocTable />
      </div>
    </div>
  );
}
