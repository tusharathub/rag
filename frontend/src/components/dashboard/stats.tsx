"use client";

import * as React from "react";
import { FileText, Database, HelpCircle, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/use-app-store";

export function Stats() {
  const documents = useAppStore((state) => state.documents);
  const chatSessions = useAppStore((state) => state.chatSessions);
  const chatMessages = useAppStore((state) => state.chatMessages);

  // Compute stats
  const totalDocs = documents.length;
  const processedDocs = documents.filter((d) => d.status === "COMPLETED").length;
  
  // Total queries is count of user messages
  let totalQueries = 0;
  Object.values(chatMessages).forEach((msgs) => {
    totalQueries += msgs.filter((m) => m.role === "user").length;
  });

  const totalSize = documents.reduce((acc, curr) => acc + curr.fileSize, 0);
  const sizeFormatted = (totalSize / (1024 * 1024)).toFixed(2) + " MB";

  const statItems = [
    {
      title: "Total Documents",
      value: totalDocs,
      description: `${processedDocs} indexed successfully`,
      icon: FileText,
      color: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/10",
    },
    {
      title: "Vector Chunks",
      value: processedDocs * 18 + 12, // mock value
      description: "Stored in pgvector db",
      icon: Database,
      color: "from-indigo-500 to-violet-500",
      shadow: "shadow-indigo-500/10",
    },
    {
      title: "AI Questions",
      value: totalQueries || 1, // at least 1 for mock look
      description: `${chatSessions.length} active sessions`,
      icon: HelpCircle,
      color: "from-purple-500 to-pink-500",
      shadow: "shadow-purple-500/10",
    },
    {
      title: "Workspace Storage",
      value: sizeFormatted,
      description: "Limit: 500 MB (Free tier)",
      icon: HardDrive,
      color: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card
            key={index}
            className={`overflow-hidden relative group hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl ${item.shadow} duration-300 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800`}
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Icon className="h-24 w-24 -mr-4 -mt-4 text-foreground" />
            </div>

            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{item.title}</span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${item.color} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-3xl font-bold tracking-tight text-foreground">{item.value}</h4>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
