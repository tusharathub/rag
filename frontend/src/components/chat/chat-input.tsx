"use client";

import * as React from "react";
import { Send, Paperclip, Command } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useAppDispatch } from "@/store";
import { setUploadModalOpen } from "@/store/slices/uiSlice";

export function ChatInput() {
  const [text, setText] = React.useState("");
  const { sendMessage, isStreaming } = useChat();
  const dispatch = useAppDispatch();

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
    <form onSubmit={handleSubmit} className="flex gap-2 items-end font-mono">
      <div className="relative flex-1 flex items-center border border-slate-800 rounded bg-[#080808] focus-within:border-[#FFA028] transition-all overflow-hidden pl-3 pr-2 py-1.5 min-h-[48px]">
        {/* Attach File trigger */}
        <button
          type="button"
          onClick={() => dispatch(setUploadModalOpen(true))}
          className="text-slate-400 hover:text-[#FFA028] p-2 rounded transition-colors"
          title="Upload Document"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Text Input area */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask RAG Copilot anything..."
          className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder:text-slate-500 border-none outline-none ring-0 resize-none h-6 max-h-32 py-1 px-2 font-mono"
          disabled={isStreaming}
        />

        <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-500 mr-2 bg-black px-2 py-1 border border-slate-800 rounded">
          <Command className="h-3 w-3" />
          <span>Enter</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!text.trim() || isStreaming}
        className="h-[48px] w-[48px] rounded bg-[#FFA028] hover:bg-[#E58D1B] disabled:opacity-30 text-slate-950 font-bold flex-shrink-0 flex items-center justify-center transition-all shadow-[0_0_15px_#FFA028] active:scale-95 clip-chamfer-sm"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
