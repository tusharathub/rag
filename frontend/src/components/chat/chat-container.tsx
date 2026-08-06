import * as React from "react";
import { Plus, MessageSquare, Trash2, Bot, HelpCircle, Sparkles, FileText, CheckCircle2 } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { setActiveChatSessionId, addChatSession, deleteChatSession } from "@/store/slices/chatSlice";
import { fetchDocuments } from "@/store/slices/documentSlice";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

export function ChatContainer() {
  const dispatch = useAppDispatch();
  const chatSessions = useAppSelector((state) => state.chat.sessions);
  const activeChatSessionId = useAppSelector((state) => state.chat.activeSessionId);
  const documents = useAppSelector((state) => state.documents.items);

  const DEFAULT_COLLECTION_ID = "00000000-0000-0000-0000-000000000001";

  React.useEffect(() => {
    dispatch(fetchDocuments(DEFAULT_COLLECTION_ID));
  }, [dispatch]);

  const activeSession = chatSessions.find((s) => s.id === activeChatSessionId);
  const completedDocs = documents.filter((d) => d.status === "COMPLETED" || !d.status);

  return (
    <div className="flex h-full rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 dark:bg-slate-900 shadow-xl bg-white">
      {/* Sessions sub-sidebar */}
      <div className="w-64 border-r border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conversations</span>
          <Button
            onClick={() => dispatch(addChatSession({ id: crypto.randomUUID() }))}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No conversations.</div>
          ) : (
            chatSessions.map((session) => {
              const isActive = session.id === activeChatSessionId;
              return (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-sm transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-foreground"
                  )}
                  onClick={() => dispatch(setActiveChatSessionId(session.id))}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare className="h-4.5 w-4.5 flex-shrink-0 opacity-70" />
                    <span className="truncate pr-2">{session.title}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(deleteChatSession(session.id));
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 p-1 rounded transition-opacity"
                    title="Delete Conversation"
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
      <div className="flex-1 flex flex-col h-full bg-slate-50/20 dark:bg-slate-900/10 relative">
        {activeSession ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-slate-200/60 dark:border-slate-800/80 px-6 flex items-center justify-between dark:bg-slate-950/20 bg-white/40">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground leading-none">{activeSession.title}</h4>
                  <span className="text-[10px] text-muted-foreground mt-1 block">Contextual AI Assistant</span>
                </div>
              </div>

              {/* Connected Active Documents Indicator */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="font-semibold text-foreground">Active Context:</span>
                  <span className="text-muted-foreground">
                    {completedDocs.length > 0
                      ? `${completedDocs.length} ${completedDocs.length === 1 ? 'file' : 'files'} connected`
                      : "No files uploaded"}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <ChatMessages sessionId={activeSession.id} />
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950/20">
              <ChatInput />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-6 text-white">
              <Bot className="h-8 w-8 animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">Welcome to RAG.ai Chat</h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
              Select or create a conversation session to ask questions about your connected knowledge base.
            </p>

            {completedDocs.length > 0 && (
              <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Connected Knowledge Base ({completedDocs.length} files)
                </span>
                <div className="space-y-1.5">
                  {completedDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 text-xs text-foreground font-medium truncate">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => dispatch(addChatSession({ id: crypto.randomUUID() }))} className="rounded-xl flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Start Conversation</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
