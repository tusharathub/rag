"use client";

import * as React from "react";
import { MainSidebar } from "@/components/sidebar/main-sidebar";
import { Stats } from "@/components/dashboard/stats";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ChatContainer } from "@/components/chat/chat-container";
import { DocTable } from "@/components/documents/doc-table";
import { CollectionGrid } from "@/components/collections/collection-grid";
import { UploadModal } from "@/components/documents/upload-modal";
import { useAppSelector } from "@/store";
import { Bell, Sparkles, FolderLock, MessageSquare, Layers, LayoutDashboard, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export default function WorkspacePage() {
  const activePanel = useAppSelector((state) => state.ui.activePanel);
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);


  const getHeaderTitle = () => {
    switch (activePanel) {
      case "dashboard":
        return "Workspace Overview";
      case "chat":
        return "AI Copilot Session";
      case "library":
        return "Document Knowledge Base";
      case "collections":
        return "Scoped Collections";
      default:
        return "Workspace";
    }
  };

  const getHeaderDesc = () => {
    switch (activePanel) {
      case "dashboard":
        return "Welcome back! Here's a brief look at your parsed knowledge engine.";
      case "chat":
        return "Query text documents, summarize pages, and write context-aware content.";
      case "library":
        return "Manage your uploaded files, monitor vector indexing, and verify ingestion.";
      case "collections":
        return "Organize files by categories to guide conversational context search bounds.";
      default:
        return "";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <MainSidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer container */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform w-64 md:hidden transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Render MainSidebar but bind closure event */}
        <div className="h-full relative" onClick={() => setMobileMenuOpen(false)}>
          <MainSidebar />
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Ribbon */}
        <header className="h-16 border-b border-slate-200/60 dark:border-slate-850 px-6 flex items-center justify-between flex-shrink-0 bg-white/40 dark:bg-slate-950/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Mobile toggle menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="hidden md:block">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {getHeaderTitle()}
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {getHeaderDesc()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Stats shortcut */}
            <div className="hidden sm:flex items-center gap-1 bg-indigo-500/10 text-indigo-500 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-500/10">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Free Account</span>
            </div>

            {/* Notifications mock button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg h-9 w-9"
            >
              <Bell className="h-4.5 w-4.5" />
            </Button>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto p-6 min-h-0">
          {activePanel === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Stats overview banner */}
              <Stats />

              {/* Quick Actions & Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                  <QuickActions />
                </div>
                <div>
                  <RecentActivity />
                </div>
              </div>
            </div>
          )}

          {activePanel === "chat" && (
            <div className="h-full animate-in fade-in duration-200">
              <ChatContainer />
            </div>
          )}

          {activePanel === "library" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-1">Knowledge Ingestion</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Files are processed via an OCR/Markdown parser, chunked into overlap blocks, and converted to embeddings to match prompt contexts.
                </p>
                <DocTable />
              </div>
            </div>
          )}

          {activePanel === "collections" && (
            <div className="animate-in fade-in duration-200">
              <CollectionGrid />
            </div>
          )}
        </main>
      </div>

      {/* Persistent Dialog overlays */}
      <UploadModal />
    </div>
  );
}
