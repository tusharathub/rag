"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "@/components/ui/toast";

import { Provider } from "react-redux";
import { store } from "@/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());
  const [theme, setTheme] = React.useState<"light" | "dark">("dark"); // Default dark mode

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);
  }, []);

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "theme" in localStorage ? "light" : "dark"));
  };

  // Expose theme toggler to the window for simple globally accessible toggles
  React.useEffect(() => {
    (window as any).__toggleTheme = toggleTheme;
    (window as any).__theme = theme;
  }, [theme]);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToastContainer />
      </QueryClientProvider>
    </Provider>
  );
}

