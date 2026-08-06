"use client";

import * as React from "react";
import {
  LayoutDashboard,
  MessageSquare,
  FolderLock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Upload,
  Bot,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { setActivePanel, toggleSidebar, setUploadModalOpen } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";

export function MainSidebar() {
  const dispatch = useAppDispatch();
  const activePanel = useAppSelector((state) => state.ui.activePanel);
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  const handleSetActivePanel = (panel: typeof activePanel) => dispatch(setActivePanel(panel));
  const handleToggleSidebar = () => dispatch(toggleSidebar());
  const handleSetUploadModalOpen = (open: boolean) => dispatch(setUploadModalOpen(open));


  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "chat", label: "AI Chat", icon: MessageSquare },
    { id: "library", label: "Doc Library", icon: FolderLock },
    { id: "collections", label: "Collections", icon: Layers },
  ] as const;

  return (
    <aside
      className={cn(
        "h-screen bg-slate-900 border-r border-slate-800 text-slate-200 transition-all duration-300 flex flex-col justify-between z-30",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div>
        {/* Top Header Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-850">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/35">
              <Bot className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent truncate">
                RAG.ai
              </span>
            )}
          </div>

          {!sidebarCollapsed && (
            <button
              onClick={handleToggleSidebar}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors hidden md:block"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Action Button: Upload */}
        <div className="p-3">
          <Button
            onClick={() => handleSetUploadModalOpen(true)}
            variant="glass"
            className={cn(
              "w-full flex items-center justify-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20",
              sidebarCollapsed ? "p-2" : "px-4 py-2.5"
            )}
          >
            <Upload className="h-4 w-4" />
            {!sidebarCollapsed && <span className="font-semibold text-sm">Upload File</span>}
          </Button>
        </div>

        {/* Navigation list */}
        <nav className="px-2 py-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = activePanel === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSetActivePanel(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group duration-150",
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                    !isActive && "group-hover:scale-110 text-slate-400 group-hover:text-slate-200"
                  )}
                />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 flex flex-col gap-3">
        {/* Toggle Collapse on small width */}
        {sidebarCollapsed && (
          <button
            onClick={handleToggleSidebar}
            className="mx-auto text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 hidden md:block"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Profile Card / Controls */}
        <div className={cn("flex items-center justify-between gap-2", sidebarCollapsed && "justify-center")}>
          <SignedIn>
            <div className="flex items-center gap-2 overflow-hidden">
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </div>
          </SignedIn>
          <SignedOut>
            {!sidebarCollapsed && (
              <SignInButton mode="modal">
                <Button size="sm" variant="outline" className="text-xs">
                  Sign In
                </Button>
              </SignInButton>
            )}
          </SignedOut>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
