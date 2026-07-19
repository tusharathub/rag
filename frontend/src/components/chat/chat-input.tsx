"use client";

import * as React from "react";
import { Send, Paperclip, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/use-chat";
import { useAppStore } from "@/store/use-app-store";

export function ChatInput() {
  const [text, setText] = React.useState("");
  const { sendMessage, isStreaming } = useChat();
  const setUploadModalOpen = useAppStore((state) => state.setUploadModalOpen);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isStreaming) return;
    sendMessage(text);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="relative flex-1 flex items-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/60 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all overflow-hidden pl-3 pr-2 py-1.5 min-h-[50px]">
        {/* Attach File trigger */}
        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-xl transition-colors"
          title="Upload Document"
        >
          <Paperclip className="h-4.5 w-4.5" />
        </button>

        {/* Text Input area */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask RAG.ai anything..."
          className="flex-1 bg-transparent text-sm text-foreground focus:outline-none placeholder-muted-foreground border-none outline-none ring-0 resize-none h-8 max-h-32 py-1.5 px-2"
          disabled={isStreaming}
        />

        <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-muted-foreground/60 mr-2 bg-slate-200/50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
          <Command className="h-3 w-3" />
          <span>Enter</span>
        </div>
      </div>

      <Button
        type="submit"
        size="icon"
        disabled={!text.trim() || isStreaming}
        className="h-[50px] w-[50px] rounded-2xl bg-indigo-600 hover:bg-indigo-750 text-white flex-shrink-0 flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
