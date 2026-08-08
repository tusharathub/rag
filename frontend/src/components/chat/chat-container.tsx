"use client";

import * as React from "react";
import { Plus, MessageSquare, Trash2, Bot, FileText, CheckCircle2, Cpu } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { setActiveChatSessionId, addChatSession, deleteChatSession } from "@/store/slices/chatSlice";
import { fetchDocuments } from "@/store/slices/documentSlice";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { cn } from "@/utils/cn";

export function ChatContainer() {
  const dispatch = useAppDispatch();
  const chatSessions = useAppSelector((state) => state.chat.sessions);
  const activeChatSessionId = useAppSelector((state) => state.chat.activeSessionId);
  const documents = useAppSelector((state) => state.documents.items);

  const DEFAULT_COLLECTION_ID = "00000000-0000-0000-0000-000000000001";

  React.useEffect(() => {
    dispatch(fetchDocuments({ collectionId: DEFAULT_COLLECTION_ID }));
  }, [dispatch]);

  const activeSession = chatSessions.find((s) => s.id === activeChatSessionId);
  const completedDocs = documents.filter((d) => d.status === "COMPLETED" || !d.status);

  return (
    <div className="flex h-full rounded-xl overflow-hidden border border-slate-900 bg-[#0C0C0C] shadow-2xl font-mono">
      {/* Sessions sub-sidebar */}
      <div className="w-64 border-r border-slate-900 bg-[#080808] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-900 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#FFA028]">// SESSIONS</span>
          <button
            onClick={() => dispatch(addChatSession({ id: crypto.randomUUID() }))}
            className="p-1 rounded bg-[#FFA028] hover:bg-[#E58D1B] text-slate-950 font-bold transition-all shadow"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
          {chatSessions.length === 0 ? (
            <div className="p-4 text-center text-[11px] text-slate-500 font-mono">No active sessions.</div>
          ) : (
            chatSessions.map((session) => {
              const isActive = session.id === activeChatSessionId;
              return (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center justify-between p-2.5 rounded cursor-pointer transition-all duration-150 font-mono",
                    isActive
                      ? "bg-[#FFA028] text-slate-950 font-bold shadow-md"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  )}
                  onClick={() => dispatch(setActiveChatSessionId(session.id))}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate pr-1">{session.title}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(deleteChatSession(session.id));
                    }}
                    className={cn(
                      "opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity",
                      isActive ? "hover:text-rose-900" : "hover:text-rose-400"
                    )}
                    title="Delete Session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat layout */}
      <div className="flex-1 flex flex-col h-full bg-[#0A0A0A] relative">
        {activeSession ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-slate-900 px-6 flex items-center justify-between bg-[#080808]">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded bg-[#FFA028] text-slate-950 flex items-center justify-center font-bold">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
                    {activeSession.title}
                  </h4>
                  <span className="text-[10px] text-[#FFA028] block">● COHERE V3 + PGVECTOR</span>
                </div>
              </div>

              {/* Connected Active Documents Indicator */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-black border border-slate-800 text-[11px]">
                  <FileText className="h-3.5 w-3.5 text-[#FFA028]" />
                  <span className="font-bold text-white">CONTEXT:</span>
                  <span className="text-slate-400">
                    {completedDocs.length > 0
                      ? `${completedDocs.length} ${completedDocs.length === 1 ? 'file' : 'files'}`
                      : "0 files"}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#0A0A0A]">
              <ChatMessages sessionId={activeSession.id} />
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-slate-900 bg-[#080808]">
              <ChatInput />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono">
            <div className="h-14 w-14 rounded-lg bg-[#FFA028] flex items-center justify-center shadow-xl mb-4 text-slate-950 font-bold">
              <Cpu className="h-7 w-7" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-white mb-2">RAG Engine Copilot</h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6 font-sans">
              Select or create a conversation session to query documents with pgvector 1536d cosine similarity and Cohere v3 reranking.
            </p>

            {completedDocs.length > 0 && (
              <div className="mb-6 p-4 bg-[#080808] rounded border border-slate-900 max-w-md w-full text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFA028] block mb-2">
                  INDEXED CONTEXT ({completedDocs.length} FILES)
                </span>
                <div className="space-y-1.5">
                  {completedDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 text-xs text-slate-300 truncate">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => dispatch(addChatSession({ id: crypto.randomUUID() }))}
              className="px-6 py-3 bg-[#FFA028] hover:bg-[#E58D1B] text-slate-950 font-mono text-xs font-bold tracking-widest clip-chamfer transition-all shadow-[0_0_15px_#FFA028] flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>START SESSION</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
