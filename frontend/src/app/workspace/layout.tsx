"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MainSidebar } from "@/components/sidebar/main-sidebar";
import { UploadModal } from "@/components/documents/upload-modal";
import { Bell, Sparkles, Menu, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { UserButton } from "@clerk/nextjs";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const getHeaderTitle = () => {
    if (pathname.includes("/workspace/chat")) return "AI Copilot Session";
    if (pathname.includes("/workspace/library")) return "Document Knowledge Base";
    if (pathname.includes("/workspace/collections")) return "Scoped Collections";
    return "Workspace Overview";
  };

  const getHeaderDesc = () => {
    if (pathname.includes("/workspace/chat"))
      return "Query text documents, summarize pages, and write context-aware content.";
    if (pathname.includes("/workspace/library"))
      return "Manage your uploaded files, monitor vector indexing, and verify ingestion.";
    if (pathname.includes("/workspace/collections"))
      return "Organize files by categories to guide conversational context search bounds.";
    return "Welcome back! Here's a brief look at your parsed knowledge engine.";
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
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {getHeaderTitle()}
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {getHeaderDesc()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Landing Page</span>
              </Button>
            </Link>

            {/* Quick Stats shortcut */}
            <div className="hidden sm:flex items-center gap-1 bg-[#FFA028]/10 text-[#FFA028] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#FFA028]/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Pro RAG Engine</span>
            </div>

            {/* Notifications mock button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg h-9 w-9"
            >
              <Bell className="h-4.5 w-4.5" />
            </Button>

            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        {/* Dynamic Workspace Route Page Content */}
        <main className="flex-1 overflow-y-auto p-6 min-h-0">
          {children}
        </main>
      </div>

      {/* Persistent Upload Dialog Overlay */}
      <UploadModal />
    </div>
  );
}
