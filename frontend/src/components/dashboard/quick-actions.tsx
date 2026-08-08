"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, MessageSquare, Layers, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAppDispatch } from "@/store";
import { setUploadModalOpen } from "@/store/slices/uiSlice";
import { addChatSession } from "@/store/slices/chatSlice";

export function QuickActions() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const actions = [
    {
      title: "Upload Document",
      description: "Ingest multi-format files (PDF, DOCX, XLSX, PPTX, MD) with SHA-256 deduplication.",
      buttonText: "UPLOAD FILE",
      icon: Upload,
      onClick: () => dispatch(setUploadModalOpen(true)),
    },
    {
      title: "New RAG Copilot Chat",
      description: "Query text documents, summarize pages, and stream grounded context answers.",
      buttonText: "START CHAT",
      icon: MessageSquare,
      onClick: () => {
        const id = `chat-${Date.now()}`;
        dispatch(addChatSession({ id, title: "New Conversation" }));
        router.push("/workspace/chat");
      },
    },
    {
      title: "Scoped Collections",
      description: "Group documents into collection boundaries to enforce search bounds.",
      buttonText: "VIEW COLLECTIONS",
      icon: Layers,
      onClick: () => router.push("/workspace/collections"),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
      {actions.map((act, index) => {
        const Icon = act.icon;
        return (
          <Card
            key={index}
            className="flex flex-col justify-between border-slate-900 bg-[#0C0C0C] duration-300 hover:border-[#FFA028]/50 relative overflow-hidden group shadow-lg"
          >
            <CardHeader className="p-6 space-y-3">
              <div className="w-10 h-10 rounded bg-black border border-[#FFA028]/40 text-[#FFA028] flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-bold text-white tracking-tight">
                {act.title}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-relaxed font-sans">
                {act.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0">
              <button
                onClick={act.onClick}
                className="w-full py-2.5 bg-[#FFA028] hover:bg-[#E58D1B] text-slate-950 font-mono text-xs font-bold tracking-wider clip-chamfer transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_#FFA028]"
              >
                <span>{act.buttonText}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
