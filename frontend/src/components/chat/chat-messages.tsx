"use client";

import * as React from "react";
import { User, Bot, FileText, ExternalLink } from "lucide-react";
import { useAppSelector } from "@/store";
import { cn } from "@/utils/cn";
import { SourceCitations } from "./source-citations";

export function ChatMessages({ sessionId }: { sessionId: string }) {
  const messages = useAppSelector((state) => state.chat.messages[sessionId] || []);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages come in or update
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
        <Bot className="h-10 w-10 text-indigo-500/40" />
        <div>
          <p className="text-sm font-semibold">Beginning of chat session</p>
          <p className="text-xs">Ask a question regarding your uploaded knowledge files.</p>
        </div>
      </div>
    );
  }

  // Format simple markdown bold and lists
  const formatContent = (text: string) => {
    if (!text) return "";
    
    // Bold
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>');
    
    // Bullet points
    formatted = formatted.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-4 list-disc text-sm py-0.5">$1</li>');
    
    // Convert newlines to paragraphs
    formatted = formatted.split("\n\n").map((para) => {
      if (para.startsWith("<li")) {
        return `<ul class="my-2">${para}</ul>`;
      }
      return `<p class="leading-relaxed mb-3">${para}</p>`;
    }).join("");

    return formatted;
  };

  return (
    <div className="p-6 space-y-6">
      {messages.map((msg, index) => {
        const isUser = msg.role === "user";
        const isLast = index === messages.length - 1;

        return (
          <div
            key={msg.id}
            className={cn(
              "flex gap-4 max-w-3xl",
              isUser ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm",
                isUser
                  ? "bg-primary shadow-primary/20"
                  : "bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-indigo-500/20"
              )}
            >
              {isUser ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
            </div>

            {/* Bubble */}
            <div className="space-y-2">
              <div
                className={cn(
                  "p-4 rounded-2xl text-sm border shadow-sm transition-all duration-300",
                  isUser
                    ? "bg-primary text-primary-foreground border-transparent rounded-tr-none"
                    : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 rounded-tl-none text-foreground"
                )}
              >
                {!isUser && msg.content === "" ? (
                  /* Streaming indicator */
                  <div className="flex items-center gap-1 py-1 px-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 typing-dot" />
                    <span className="h-2 w-2 rounded-full bg-indigo-500 typing-dot" />
                    <span className="h-2 w-2 rounded-full bg-indigo-500 typing-dot" />
                  </div>
                ) : (
                  <div
                    className="prose dark:prose-invert max-w-none text-inherit"
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  />
                )}
              </div>

              {/* Citations / sources */}
              {!isUser && msg.sources && msg.sources.length > 0 && (
                <SourceCitations sources={msg.sources} />
              )}
            </div>
          </div>
        );
      })}
      <div ref={scrollRef} />
    </div>
  );
}
