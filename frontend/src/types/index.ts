export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Organization {
  id: string;
  name: string;
  clerkOrgId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  name: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  metadata: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageSource {
  id: string;
  chatMessageId: string;
  documentChunkId: string;
  relevanceScore: number;
  documentName?: string;
  content?: string;
  pageStart?: number;
  pageEnd?: number;
  sectionPath?: string;
}

export interface ChatMessage {
  id: string;
  chatSessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  sources?: ChatMessageSource[];
}
