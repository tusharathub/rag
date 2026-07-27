import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Document } from "@/types";

export interface DocumentState {
  items: Document[];
}

const initialState: DocumentState = {
  items: [],
};

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
});

export const { addDocument, deleteDocument } = documentSlice.actions;

export default documentSlice.reducer;
