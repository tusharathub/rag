"use client";

import * as React from "react";
import { FileUp, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppSelector } from "@/store";

export function RecentActivity() {
  const documents = useAppSelector((state) => state.documents.items);
  const chatSessions = useAppSelector((state) => state.chat.sessions);

  // Derive activities from documents and chat sessions
  const activities = React.useMemo(() => {
    const list: {
      id: string;
      type: "upload" | "chat" | "alert";
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
        description: `"${doc.name}" was uploaded (${(doc.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
        timestamp: doc.createdAt,
        status: doc.status === "COMPLETED" ? "success" : doc.status === "FAILED" ? "error" : "warning",
      });
    });

    // Add chat sessions
    chatSessions.forEach((chat) => {
      list.push({
        id: `chat-${chat.id}`,
        type: "chat",
        title: "New Chat Session Started",
        description: `Started conversation: "${chat.title}"`,
        timestamp: chat.createdAt,
      });
    });

    // Sort by timestamp descending
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [documents, chatSessions]);

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
    <Card className="border-slate-200/60 dark:border-slate-800 dark:bg-slate-900 duration-300 hover:shadow-lg">
      <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-850">
        <CardTitle className="text-lg font-bold text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p className="text-sm">No activity recorded yet.</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-250 dark:border-slate-800 ml-3 pl-6 space-y-6">
            {activities.map((act) => {
              const isUpload = act.type === "upload";
              const isChat = act.type === "chat";

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline point */}
                  <span className="absolute -left-[31px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-850 ring-4 ring-white dark:ring-slate-900">
                    {isUpload ? (
                      <FileUp className="h-2.5 w-2.5 text-blue-500" />
                    ) : isChat ? (
                      <MessageSquare className="h-2.5 w-2.5 text-purple-500" />
                    ) : (
                      <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
                    )}
                  </span>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-semibold text-foreground">{act.title}</h5>
                        {isUpload && act.status && (
                          <Badge
                            variant={
                              act.status === "success"
                                ? "success"
                                : act.status === "error"
                                ? "destructive"
                                : "warning"
                            }
                            className="text-[10px] px-1.5 py-0"
                          >
                            {act.status.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{act.description}</p>
                    </div>

                    <span className="text-[10px] font-medium text-muted-foreground/80 flex-shrink-0 mt-0.5">
                      {timeAgo(act.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
