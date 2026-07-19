import { create } from "zustand";
import { Document, ChatSession, ChatMessage } from "@/types";

export interface Collection {
  id: string;
  name: string;
  documentIds: string[];
  createdAt: string;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface AppState {
  activePanel: "dashboard" | "chat" | "library" | "collections";
  sidebarCollapsed: boolean;
  uploadModalOpen: boolean;
  documents: Document[];
  collections: Collection[];
  chatSessions: ChatSession[];
  activeChatSessionId: string | null;
  chatMessages: Record<string, ChatMessage[]>;
  toasts: Toast[];
  
  // Actions
  setActivePanel: (panel: "dashboard" | "chat" | "library" | "collections") => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setUploadModalOpen: (open: boolean) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  addCollection: (name: string, documentIds: string[]) => void;
  deleteCollection: (id: string) => void;
  addChatSession: (title?: string) => string;
  deleteChatSession: (id: string) => void;
  setActiveChatSessionId: (id: string | null) => void;
  addChatMessage: (sessionId: string, message: ChatMessage) => void;
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

// Initial mock documents
const initialDocuments: Document[] = [
  {
    id: "doc-1",
    name: "Q2_Financial_Report.pdf",
    storagePath: "/docs/q2_financial.pdf",
    fileType: "pdf",
    fileSize: 4520000,
    status: "COMPLETED",
    organizationId: "org-1",
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: "doc-2",
    name: "AI_RAG_Architecture_DeepDive.pdf",
    storagePath: "/docs/rag_arch.pdf",
    fileType: "pdf",
    fileSize: 12500000,
    status: "COMPLETED",
    organizationId: "org-1",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "doc-3",
    name: "API_Contract_v3.docx",
    storagePath: "/docs/api_v3.docx",
    fileType: "docx",
    fileSize: 840000,
    status: "FAILED",
    organizationId: "org-1",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "doc-4",
    name: "Client_Feedback_Synthesis.txt",
    storagePath: "/docs/client_feedback.txt",
    fileType: "txt",
    fileSize: 45000,
    status: "PROCESSING",
    organizationId: "org-1",
    createdAt: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
];

// Initial mock collections
const initialCollections: Collection[] = [
  {
    id: "col-1",
    name: "Financial Data",
    documentIds: ["doc-1"],
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: "col-2",
    name: "Engineering Guidelines",
    documentIds: ["doc-2"],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

// Initial mock chat messages
const initialChatMessages: Record<string, ChatMessage[]> = {
  "chat-1": [
    {
      id: "msg-1",
      chatSessionId: "chat-1",
      role: "user",
      content: "What were our main revenue drivers in Q2?",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "msg-2",
      chatSessionId: "chat-1",
      role: "assistant",
      content: "Based on the **Q2_Financial_Report.pdf**, the main revenue drivers were:\n\n1. **Cloud Enterprise Subscriptions**: Up 24% YoY, representing $12.4M in recurring revenue.\n2. **Professional Services**: Contributed $3.2M, primarily driven by RAG integrations.\n3. **Hardware & Edge Deployments**: Retained flat growth at $1.1M.\n\nWould you like me to compile a chart of these metrics or look up specific geographic breakdowns?",
      createdAt: new Date(Date.now() - 3550000).toISOString(),
      sources: [
        {
          id: "src-1",
          chatMessageId: "msg-2",
          documentChunkId: "chunk-1",
          relevanceScore: 0.94,
          documentName: "Q2_Financial_Report.pdf",
          content: "Cloud Enterprise Subscriptions grew by 24% year-over-year (YoY) in the second quarter, representing $12.4M of the total recurring revenue. This is primarily attributed to strong integration of advanced AI and semantic search capabilities inside of client clusters.",
          pageStart: 4,
          pageEnd: 4,
          sectionPath: "Financial Overview > Revenue Breakdown",
        },
      ],
    },
  ],
};

const initialChatSessions: ChatSession[] = [
  {
    id: "chat-1",
    title: "Q2 Revenue Drivers Analysis",
    userId: "user-1",
    organizationId: "org-1",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3550000).toISOString(),
  },
];

export const useAppStore = create<AppState>((set, get) => ({
  activePanel: "dashboard",
  sidebarCollapsed: false,
  uploadModalOpen: false,
  documents: initialDocuments,
  collections: initialCollections,
  chatSessions: initialChatSessions,
  activeChatSessionId: "chat-1",
  chatMessages: initialChatMessages,
  toasts: [],

  setActivePanel: (panel) => set({ activePanel: panel }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setUploadModalOpen: (open) => set({ uploadModalOpen: open }),

  addDocument: (doc) => {
    set((state) => ({
      documents: [doc, ...state.documents],
    }));
    get().addToast(`Document "${doc.name}" added successfully.`, "success");
  },

  deleteDocument: (id) => {
    const doc = get().documents.find((d) => d.id === id);
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      collections: state.collections.map((col) => ({
        ...col,
        documentIds: col.documentIds.filter((docId) => docId !== id),
      })),
    }));
    if (doc) {
      get().addToast(`Deleted document "${doc.name}"`, "info");
    }
  },

  addCollection: (name, documentIds) => {
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name,
      documentIds,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      collections: [newCol, ...state.collections],
    }));
    get().addToast(`Collection "${name}" created successfully.`, "success");
  },

  deleteCollection: (id) => {
    const col = get().collections.find((c) => c.id === id);
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
    }));
    if (col) {
      get().addToast(`Deleted collection "${col.name}"`, "info");
    }
  },

  addChatSession: (title = "New Conversation") => {
    const id = `chat-${Date.now()}`;
    const newSession: ChatSession = {
      id,
      title,
      userId: "user-1",
      organizationId: "org-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      chatSessions: [newSession, ...state.chatSessions],
      chatMessages: {
        ...state.chatMessages,
        [id]: [],
      },
      activeChatSessionId: id,
      activePanel: "chat",
    }));
    return id;
  },

  deleteChatSession: (id) => {
    set((state) => {
      const nextSessions = state.chatSessions.filter((s) => s.id !== id);
      let nextActiveId = state.activeChatSessionId;
      if (state.activeChatSessionId === id) {
        nextActiveId = nextSessions.length > 0 ? nextSessions[0].id : null;
      }
      const nextMessages = { ...state.chatMessages };
      delete nextMessages[id];

      return {
        chatSessions: nextSessions,
        activeChatSessionId: nextActiveId,
        chatMessages: nextMessages,
      };
    });
    get().addToast("Conversation deleted", "info");
  },

  setActiveChatSessionId: (id) => set({ activeChatSessionId: id }),

  addChatMessage: (sessionId, message) => {
    set((state) => {
      const currentMsgs = state.chatMessages[sessionId] || [];
      const updatedMsgs = [...currentMsgs, message];
      
      // Update session updatedAt timestamp
      const updatedSessions = state.chatSessions.map((session) => {
        if (session.id === sessionId) {
          // If title was default, name it based on user message
          const title = session.title === "New Conversation" && message.role === "user"
            ? message.content.slice(0, 30) + (message.content.length > 30 ? "..." : "")
            : session.title;
          return {
            ...session,
            title,
            updatedAt: new Date().toISOString(),
          };
        }
        return session;
      });

      return {
        chatMessages: {
          ...state.chatMessages,
          [sessionId]: updatedMsgs,
        },
        chatSessions: updatedSessions,
      };
    });
  },

  addToast: (message, type = "info") => {
    const id = `toast-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));
