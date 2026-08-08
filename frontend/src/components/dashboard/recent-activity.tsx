"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAppSelector } from "@/store";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function RecentActivity() {
  const documents = useAppSelector((state) => state.documents.items);
  const chatSessions = useAppSelector((state) => state.chat.sessions);

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 4;

  // Derive activities from documents and chat sessions
  const allActivities = React.useMemo(() => {
    const list: {
      id: string;
      type: "upload" | "chat";
      title: string;
      description: string;
      timestamp: string;
      status?: "success" | "warning" | "error";
    }[] = [];

    // Add documents
    documents.forEach((doc) => {
      list.push({
        id: `upload-${doc.id}`,
        type: "upload",
        title: "Document Uploaded",
        description: `"${doc.name}" (${(doc.fileSize / 1024).toFixed(1)} KB)`,
        timestamp: doc.createdAt,
        status: doc.status === "COMPLETED" ? "success" : doc.status === "FAILED" ? "error" : "warning",
      });
    });

    // Add chat sessions
    chatSessions.forEach((chat) => {
      list.push({
        id: `chat-${chat.id}`,
        type: "chat",
        title: "New Chat Session",
        description: `Started conversation: "${chat.title}"`,
        timestamp: chat.createdAt,
      });
    });

    // Sort by timestamp descending
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [documents, chatSessions]);

  const totalPages = Math.max(1, Math.ceil(allActivities.length / itemsPerPage));
  
  const currentActivities = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allActivities.slice(start, start + itemsPerPage);
  }, [allActivities, currentPage, itemsPerPage]);

  const timeAgo = (dateStr: string) => {
    const elapsed = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(elapsed / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card className="border border-slate-900 bg-[#0C0C0C] font-mono shadow-xl flex flex-col justify-between h-full">
      <div>
        <CardHeader className="p-6 border-b border-slate-900 flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="text-[#FFA028]">//</span> RECENT ACTIVITY
          </CardTitle>
          <span className="text-[10px] text-slate-500 font-mono">
            TOTAL: {allActivities.length}
          </span>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {currentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 text-xs font-mono">
              <p>No recorded activities.</p>
            </div>
          ) : (
            <div className="relative border-l border-slate-900 ml-2 pl-5 space-y-5">
              {currentActivities.map((act) => {
                const isUpload = act.type === "upload";

                return (
                  <div key={act.id} className="relative group">
                    {/* Timeline Dot */}
                    <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-[#FFA028] ring-4 ring-[#0C0C0C]" />

                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-white tracking-tight">{act.title}</h5>
                          {isUpload && act.status && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 border rounded ${
                                act.status === "success"
                                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
                                  : act.status === "error"
                                  ? "bg-rose-950/80 text-rose-400 border-rose-500/40"
                                  : "bg-[#FFA028]/10 text-[#FFA028] border-[#FFA028]/40"
                              }`}
                            >
                              {act.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{act.description}</p>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 mt-0.5">
                        {timeAgo(act.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </div>

      {/* Pagination Footer */}
      {allActivities.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-900 flex items-center justify-between font-mono text-xs text-slate-400 bg-[#080808]">
          <span className="text-[10px] text-slate-500">
            PAGE {currentPage} OF {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-800 bg-black hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-black text-[#FFA028] transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-800 bg-black hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-black text-[#FFA028] transition-colors"
              title="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
