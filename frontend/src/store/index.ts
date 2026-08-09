import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import uiReducer from "./slices/uiSlice";
import documentReducer from "./slices/documentSlice";
import collectionReducer from "./slices/collectionSlice";
import chatReducer from "./slices/chatSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    documents: documentReducer,
    collections: collectionReducer,
    chat: chatReducer,
  },
});

store.subscribe(() => {
  if (typeof window !== "undefined") {
    try {
      const chatState = store.getState().chat;
      localStorage.setItem("rag_chat_state", JSON.stringify(chatState));
    } catch (e) {
      // Ignore quota/security errors
    }
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Custom Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
