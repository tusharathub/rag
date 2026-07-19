import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { ChatMessage, ChatMessageSource } from "@/types";

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
  const addChatMessage = useAppStore((state) => state.addChatMessage);
  const activeChatSessionId = useAppStore((state) => state.activeChatSessionId);
  const addChatSession = useAppStore((state) => state.addChatSession);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    let sessionId = activeChatSessionId;
    if (!sessionId) {
      sessionId = addChatSession();
    }

    // 1. Add User Message
    const userMessage: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      chatSessionId: sessionId,
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    addChatMessage(sessionId, userMessage);

    // 2. Set streaming state
    setIsStreaming(true);

    // 3. Find matching response
    const lowercasePrompt = content.toLowerCase();
    const match = mockAnswers.find((ans) =>
      ans.keywords.some((k) => lowercasePrompt.includes(k))
    );
    const finalAnswer = match || fallbackAnswer;

    // Create an assistant message placeholder
    const aiMessageId = `msg-a-${Date.now()}`;
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      chatSessionId: sessionId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      sources: finalAnswer.sources.map(src => ({ ...src, chatMessageId: aiMessageId }))
    };

    // Add empty message to start streaming
    addChatMessage(sessionId, initialAiMessage);

    // Simulate word-by-word streaming
    const words = finalAnswer.response.split(" ");
    let currentText = "";
    let wordIndex = 0;

    const streamInterval = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
        
        // Directly update the store's message content
        useAppStore.setState((state) => {
          const sessionMsgs = state.chatMessages[sessionId] || [];
          return {
            chatMessages: {
              ...state.chatMessages,
              [sessionId]: sessionMsgs.map((m) =>
                m.id === aiMessageId ? { ...m, content: currentText } : m
              )
            }
          };
        });
        
        wordIndex++;
      } else {
        clearInterval(streamInterval);
        setIsStreaming(false);
      }
    }, 45 + Math.random() * 20); // Natural streaming latency
  };

  return {
    sendMessage,
    isStreaming
  };
}
