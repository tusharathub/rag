import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Collection } from "../use-app-store";

export interface CollectionState {
  items: Collection[];
}

const initialState: CollectionState = {
  items: [],
};

export const collectionSlice = createSlice({
  name: "collections",
  initialState,
  reducers: {
    addCollection: {
      reducer: (state, action: PayloadAction<Collection>) => {
        state.items.unshift(action.payload);
      },
      prepare: (name: string, documentIds: string[]) => ({
        payload: {
          id: `col-${Date.now()}`,
          name,
          documentIds,
          createdAt: new Date().toISOString(),
        },
      }),
    },
    deleteCollection: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((col) => col.id !== action.payload);
    },
    removeDocumentFromCollections: (state, action: PayloadAction<string>) => {
      state.items = state.items.map((col) => ({
        ...col,
        documentIds: col.documentIds.filter((id) => id !== action.payload),
      }));
    },
  },
});

export const { addCollection, deleteCollection, removeDocumentFromCollections } = collectionSlice.actions;

export default collectionSlice.reducer;
