import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ChatSession, ChatMessage } from "@/types";

export interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
}

const initialState: ChatState = {
  sessions: [],
  activeSessionId: null,
  messages: {},
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveChatSessionId: (state, action: PayloadAction<string | null>) => {
      state.activeSessionId = action.payload;
    },
    addChatSession: (state, action: PayloadAction<{ id: string; title?: string }>) => {
      const { id, title = "New Conversation" } = action.payload;
      const newSession: ChatSession = {
        id,
        title,
        userId: "user-1",
        organizationId: "org-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.sessions.unshift(newSession);
      state.messages[id] = [];
      state.activeSessionId = id;
    },
    deleteChatSession: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.sessions = state.sessions.filter((s) => s.id !== id);
      delete state.messages[id];
      if (state.activeSessionId === id) {
        state.activeSessionId = state.sessions.length > 0 ? state.sessions[0].id : null;
      }
    },
    addChatMessage: (state, action: PayloadAction<{ sessionId: string; message: ChatMessage }>) => {
      const { sessionId, message } = action.payload;
      if (!state.messages[sessionId]) {
        state.messages[sessionId] = [];
      }
      state.messages[sessionId].push(message);

      // Update session title & timestamp if default
      const session = state.sessions.find((s) => s.id === sessionId);
      if (session) {
        if (session.title === "New Conversation" && message.role === "user") {
          session.title = message.content.slice(0, 30) + (message.content.length > 30 ? "..." : "");
        }
        session.updatedAt = new Date().toISOString();
      }
    },
    updateChatMessageText: (state, action: PayloadAction<{ sessionId: string; messageId: string; content: string }>) => {
      const { sessionId, messageId, content } = action.payload;
      const msgs = state.messages[sessionId];
      if (msgs) {
        const msg = msgs.find((m) => m.id === messageId);
        if (msg) {
          msg.content = content;
        }
      }
    },
  },
});

export const {
  setActiveChatSessionId,
  addChatSession,
  deleteChatSession,
  addChatMessage,
  updateChatMessageText,
} = chatSlice.actions;

export default chatSlice.reducer;
