"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");

  React.useEffect(() => {
    setMounted(true);
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    
    // Listen for class changes on documentElement
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10 rounded-lg bg-secondary/50 animate-pulse" />;
  }

  const toggle = () => {
    if ((window as any).__toggleTheme) {
      (window as any).__toggleTheme();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 transition-all rotate-0 scale-100" />
      ) : (
        <Sun className="h-5 w-5 transition-all rotate-0 scale-100" />
      )}
    </Button>
  );
}
