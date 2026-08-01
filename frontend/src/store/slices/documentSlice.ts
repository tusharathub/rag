import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Document } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface DocumentState {
  items: Document[];
  loading: boolean;
  error: string | null;
}

const initialState: DocumentState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchDocuments = createAsyncThunk(
  "documents/fetchDocuments",
  async (collectionId: string) => {
    const res = await fetch(`${API_BASE}/documents/?collection_id=${collectionId}`);
    if (!res.ok) {
      throw new Error("Failed to fetch documents");
    }
    const data = await res.json();
    return data.documents.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      storagePath: doc.storage_path,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      status: doc.status,
      organizationId: doc.collection_id || collectionId,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }));
  }
);

export const deleteDocumentThunk = createAsyncThunk(
  "documents/deleteDocument",
  async (documentId: string) => {
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error("Failed to delete document");
    }
    return documentId;
  }
);

export const documentSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    addDocument: (state, action: PayloadAction<Document>) => {
      state.items.unshift(action.payload);
    },
    deleteDocument: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((doc) => doc.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load documents";
      })
      .addCase(deleteDocumentThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((doc) => doc.id !== action.payload);
      });
  },
});

export const { addDocument, deleteDocument } = documentSlice.actions;

export default documentSlice.reducer;
