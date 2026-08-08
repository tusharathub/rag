"use client";

import * as React from "react";
import { User, Bot } from "lucide-react";
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
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono space-y-3">
        <div className="p-3 rounded bg-black border border-slate-800 text-[#FFA028]">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">Beginning of chat session</p>
          <p className="text-[11px] text-slate-400 font-sans">Ask a question regarding your uploaded knowledge files.</p>
        </div>
      </div>
    );
  }

  // Format simple markdown bold and lists
  const formatContent = (text: string) => {
    if (!text) return "";
    
    // Bold
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    
    // Bullet points
    formatted = formatted.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-4 list-disc text-xs py-0.5">$1</li>');
    
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
    <div className="p-6 space-y-6 font-mono text-xs">
      {messages.map((msg, index) => {
        const isUser = msg.role === "user";

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
                "h-7 w-7 rounded flex items-center justify-center flex-shrink-0 text-slate-950 font-bold shadow-sm",
                isUser
                  ? "bg-[#FFA028]"
                  : "bg-black border border-[#FFA028]/40 text-[#FFA028]"
              )}
            >
              {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div className="space-y-2 max-w-2xl">
              <div
                className={cn(
                  "p-4 rounded text-xs border shadow-md transition-all duration-150 leading-relaxed font-sans",
                  isUser
                    ? "bg-[#FFA028] text-slate-950 font-medium border-transparent font-mono"
                    : "bg-[#080808] border-slate-900 text-slate-200"
                )}
              >
                {!isUser && msg.content === "" ? (
                  /* Streaming indicator */
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-[#FFA028] typing-dot" />
                    <span className="h-2 w-2 rounded-full bg-[#FFA028] typing-dot" />
                    <span className="h-2 w-2 rounded-full bg-[#FFA028] typing-dot" />
                  </div>
                ) : (
                  <div
                    className="max-w-none text-inherit"
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
