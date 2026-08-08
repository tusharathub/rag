"use client";

import * as React from "react";
import { ChatContainer } from "@/components/chat/chat-container";

export default function WorkspaceChatPage() {
  return (
    <div className="h-full animate-in fade-in duration-200">
      <ChatContainer />
    </div>
  );
}
