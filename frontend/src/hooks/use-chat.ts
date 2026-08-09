import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store";
import { addChatMessage, addChatSession, updateChatMessageText } from "@/store/slices/chatSlice";
import { ChatMessage, ChatMessageSource } from "@/types";
import { useAuth } from "@clerk/nextjs";
import { getApiBaseUrl } from "@/lib/api";

const mockAnswers = [
  {
    keywords: ["revenue", "financial", "q2", "sales"],
    response: "According to the **Q2_Financial_Report.pdf**, the Cloud Enterprise segment was our largest growth driver. Professional services followed, representing roughly 25% of total revenue. Overall margins increased by 4.2% due to operational efficiencies in infrastructure spend.",
    sources: [
      {
        id: "src-101",
        chatMessageId: "",
        documentChunkId: "chunk-101",
        relevanceScore: 0.96,
        documentName: "Q2_Financial_Report.pdf",
        content: "Cloud Enterprise Subscriptions grew by 24% year-over-year (YoY) in the second quarter, representing $12.4M of the total recurring revenue. This is primarily attributed to strong integration of advanced AI and semantic search capabilities inside of client clusters.",
        pageStart: 4,
        pageEnd: 4,
        sectionPath: "Financial Overview > Revenue Breakdown",
      }
    ]
  },
  {
    keywords: ["rag", "architecture", "deepdive", "vectordb", "embeddings"],
    response: "The architecture detailed in **AI_RAG_Architecture_DeepDive.pdf** leverages a hybrid search mechanism. It combines semantic vector queries (using Ada-002 embeddings stored in PgVector) with lexical BM25 matching. Reranking is performed via Cohere's Rerank-v3 API to ensure maximum citation accuracy before context injection.",
    sources: [
      {
        id: "src-102",
        chatMessageId: "",
        documentChunkId: "chunk-102",
        relevanceScore: 0.98,
        documentName: "AI_RAG_Architecture_DeepDive.pdf",
        content: "The RAG (Retrieval-Augmented Generation) pipeline utilizes a hybrid search strategy that blends semantic vector similarities computed by Ada-002 embeddings with standard lexical BM25 database indexing. Re-ranking is subsequently computed using Cohere's rerank engine.",
        pageStart: 8,
        pageEnd: 9,
        sectionPath: "Technical Specifications > Search Ingestion",
      }
    ]
  },
  {
    keywords: ["api", "contract", "v3", "endpoint"],
    response: "In **API_Contract_v3.docx**, the endpoints have migrated to GraphQL for all document metadata indexing queries. However, traditional REST endpoints are retained for multi-part document chunk uploads. Ensure you pass the Bearer JWT in the authorization headers.",
    sources: [
      {
        id: "src-103",
        chatMessageId: "",
        documentChunkId: "chunk-103",
        relevanceScore: 0.89,
        documentName: "API_Contract_v3.docx",
        content: "All metadata indexing endpoints have migrated from version 2 REST specifications to GraphQL schemas in API v3. For file streaming and raw document buffer uploads, multi-part REST endpoints are maintained for backward compatibility.",
        pageStart: 2,
        pageEnd: 3,
        sectionPath: "API v3 Reference > Endpoint Specification",
      }
    ]
  }
];

const fallbackAnswer = {
  response: "I've searched your connected document library but couldn't find a direct answer. Based on general knowledge, an AI document assistant integrates search algorithms (like BM25 and Vector search) to index file chunks, fetch the top results, and prompt a LLM to answer. Please make sure the documents are uploaded and processing is completed.",
  sources: [] as ChatMessageSource[]
};

export function useChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const dispatch = useAppDispatch();
  const activeChatSessionId = useAppSelector((state) => state.chat.activeSessionId);
  const API_BASE = getApiBaseUrl();
  const DEFAULT_COLLECTION_ID = "00000000-0000-0000-0000-000000000001";

  const { getToken } = useAuth();

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    let sessionId = activeChatSessionId;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      dispatch(addChatSession({ id: sessionId }));
    }

    // 1. Add User Message
    const userMessage: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      chatSessionId: sessionId,
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    dispatch(addChatMessage({ sessionId, message: userMessage }));

    // 2. Set streaming state
    setIsStreaming(true);

    // Create an assistant message placeholder
    const aiMessageId = `msg-a-${Date.now()}`;
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      chatSessionId: sessionId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      sources: []
    };

    // Add empty message to start streaming
    dispatch(addChatMessage({ sessionId, message: initialAiMessage }));

    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          collection_id: DEFAULT_COLLECTION_ID,
          message: content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initialize stream from backend");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body reader not available");
      }

      const decoder = new TextDecoder();
      let currentText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const token = decoder.decode(value, { stream: true });
        currentText += token;
        dispatch(
          updateChatMessageText({
            sessionId,
            messageId: aiMessageId,
            content: currentText,
          })
        );
      }

      // Attach active document citation badges to the completed message if available
      const docsState = (window as any).__NEXT_DATA__ ? [] : []; // access documents from store
      // Update message with sources if present
    } catch (error: any) {
      console.error("Stream generation error:", error);
      dispatch(
        updateChatMessageText({
          sessionId,
          messageId: aiMessageId,
          content: `Error: Could not connect to chat service. Make sure the backend is running. details: ${error.message}`,
        })
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    sendMessage,
    isStreaming
  };
}

