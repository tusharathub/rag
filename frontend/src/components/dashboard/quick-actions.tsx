"use client";

import * as React from "react";
import { Upload, MessageSquare, Layers, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/store";
import { setUploadModalOpen, setActivePanel } from "@/store/slices/uiSlice";
import { addChatSession } from "@/store/slices/chatSlice";

export function QuickActions() {
  const dispatch = useAppDispatch();

  const actions = [
    {
      title: "Upload Document",
      description: "Drag and drop or browse PDF, DOCX, or TXT files up to 25MB.",
      buttonText: "Upload Document",
      icon: Upload,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      btnVariant: "default" as const,
      onClick: () => dispatch(setUploadModalOpen(true)),
    },
    {
      title: "New AI Chat",
      description: "Ask questions, summarize contents, and parse knowledge instantly.",
      buttonText: "Start Chat",
      icon: MessageSquare,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      btnVariant: "default" as const,
      onClick: () => {
        const id = `chat-${Date.now()}`;
        dispatch(addChatSession({ id, title: "New Conversation" }));
        dispatch(setActivePanel("chat"));
      },
    },
    {
      title: "Manage Collections",
      description: "Group documents and query against specified knowledge clusters.",
      buttonText: "View Collections",
      icon: Layers,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      btnVariant: "outline" as const,
      onClick: () => dispatch(setActivePanel("collections")),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {actions.map((act, index) => {
        const Icon = act.icon;
        return (
          <Card
            key={index}
            className="flex flex-col justify-between border-slate-200/60 dark:border-slate-800 dark:bg-slate-900 duration-300 hover:shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-6 -mt-6" />

            <CardHeader className="p-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${act.color} mb-4`}>
                <Icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground mb-2">
                {act.title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                {act.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0">
              <Button
                variant={act.btnVariant}
                onClick={act.onClick}
                className="w-full flex items-center justify-center gap-2 group rounded-xl"
              >
                <span>{act.buttonText}</span>
                <Sparkles className="h-4 w-4 opacity-70 group-hover:scale-110 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
