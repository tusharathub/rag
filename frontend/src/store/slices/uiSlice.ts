import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Toast } from "../use-app-store"; // Reuse the interface or define it

export interface UIState {
  activePanel: "dashboard" | "chat" | "library" | "collections";
  sidebarCollapsed: boolean;
  uploadModalOpen: boolean;
  toasts: { id: string; message: string; type: "success" | "error" | "info" }[];
}

const initialState: UIState = {
  activePanel: "dashboard",
  sidebarCollapsed: false,
  uploadModalOpen: false,
  toasts: [],
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActivePanel: (state, action: PayloadAction<UIState["activePanel"]>) => {
      state.activePanel = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setUploadModalOpen: (state, action: PayloadAction<boolean>) => {
      state.uploadModalOpen = action.payload;
    },
    addToast: {
      reducer: (state, action: PayloadAction<{ id: string; message: string; type: "success" | "error" | "info" }>) => {
        state.toasts.push(action.payload);
      },
      prepare: (message: string, type: "success" | "error" | "info" = "info") => ({
        payload: {
          id: `toast-${Date.now()}`,
          message,
          type,
        },
      }),
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  setActivePanel,
  toggleSidebar,
  setSidebarCollapsed,
  setUploadModalOpen,
  addToast,
  removeToast,
} = uiSlice.actions;

export default uiSlice.reducer;
