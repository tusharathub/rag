import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ChatSession, ChatMessage } from "@/types";

export interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
}

const loadInitialState = (): ChatState => {
  if (typeof window === "undefined") {
    return { sessions: [], activeSessionId: null, messages: {} };
  }
  try {
    const serialized = localStorage.getItem("rag_chat_state");
    if (!serialized) return { sessions: [], activeSessionId: null, messages: {} };
    const parsed = JSON.parse(serialized);
    return {
      sessions: parsed.sessions || [],
      activeSessionId: parsed.activeSessionId || (parsed.sessions?.length > 0 ? parsed.sessions[0].id : null),
      messages: parsed.messages || {},
    };
  } catch (e) {
    return { sessions: [], activeSessionId: null, messages: {} };
  }
};

const initialState: ChatState = loadInitialState();

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    hydrateChatState: (state) => {
      const loaded = loadInitialState();
      state.sessions = loaded.sessions;
      state.activeSessionId = loaded.activeSessionId;
      state.messages = loaded.messages;
    },
    setActiveChatSessionId: (state, action: PayloadAction<string | null>) => {
      state.activeSessionId = action.payload;
    },
    addChatSession: (
      state,
      action: PayloadAction<{
        id: string;
        title?: string;
        selectedDocumentId?: string;
        selectedCollectionId?: string;
      }>
    ) => {
      const { id, title = "New Conversation", selectedDocumentId, selectedCollectionId } = action.payload;
      const newSession: ChatSession = {
        id,
        title,
        userId: "user-1",
        organizationId: "org-1",
        selectedDocumentId,
        selectedCollectionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.sessions.unshift(newSession);
      state.messages[id] = [];
      state.activeSessionId = id;
    },
    updateChatSessionScope: (
      state,
      action: PayloadAction<{
        sessionId: string;
        selectedDocumentId?: string;
        selectedCollectionId?: string;
        title?: string;
      }>
    ) => {
      const { sessionId, selectedDocumentId, selectedCollectionId, title } = action.payload;
      const session = state.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.selectedDocumentId = selectedDocumentId;
        session.selectedCollectionId = selectedCollectionId;
        if (title) session.title = title;
      }
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
  hydrateChatState,
  setActiveChatSessionId,
  addChatSession,
  updateChatSessionScope,
  deleteChatSession,
  addChatMessage,
  updateChatMessageText,
} = chatSlice.actions;

export default chatSlice.reducer;
