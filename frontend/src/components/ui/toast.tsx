import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";

export function ToastContainer() {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className="flex items-center gap-3 p-4 rounded-xl shadow-xl border border-white/10 glass-panel bg-white/95 dark:bg-slate-900/95 pointer-events-auto animate-in slide-in-from-bottom-5 duration-300"
          >
            {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
            {isError && <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
            {!isSuccess && !isError && <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />}

            <p className="text-sm font-medium text-foreground flex-grow pr-2">{toast.message}</p>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
