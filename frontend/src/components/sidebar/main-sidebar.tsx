"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  FolderLock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Upload,
  Bot,
  Sparkles,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { toggleSidebar, setUploadModalOpen } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";

export function MainSidebar() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  const handleToggleSidebar = () => dispatch(toggleSidebar());
  const handleSetUploadModalOpen = (open: boolean) => dispatch(setUploadModalOpen(open));

  const navItems = [
    { id: "dashboard", label: "Dashboard", href: "/workspace/dashboard", icon: LayoutDashboard },
    { id: "chat", label: "AI Chat", href: "/workspace/chat", icon: MessageSquare },
    { id: "library", label: "Doc Library", href: "/workspace/library", icon: FolderLock },
    { id: "collections", label: "Collections", href: "/workspace/collections", icon: Layers },
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
          <Link href="/" className="flex items-center gap-3 overflow-hidden group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25">
              <Bot className="h-5 w-5 text-slate-950 font-bold" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-amber-200 bg-clip-text text-transparent truncate">
                RAG.ai
              </span>
            )}
          </Link>

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
              "w-full flex items-center justify-center gap-2 bg-[#FFA028]/10 hover:bg-[#FFA028]/20 text-[#FFA028] border border-[#FFA028]/20",
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
            const isActive = pathname === item.href || (item.id === "dashboard" && pathname === "/workspace");
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group duration-150",
                  isActive
                    ? "bg-[#FFA028] text-slate-950 font-bold shadow-md shadow-[#FFA028]/20"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                    isActive ? "text-slate-950" : "group-hover:scale-110 text-slate-400 group-hover:text-slate-200"
                  )}
                />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
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
