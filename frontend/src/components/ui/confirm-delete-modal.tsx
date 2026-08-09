"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemName?: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  onConfirm,
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="text-rose-500 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {itemName && (
          <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded text-xs font-mono text-rose-300 truncate font-bold">
            Target: {itemName}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-900">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded clip-chamfer transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded clip-chamfer transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950/50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? "DELETING..." : "CONFIRM DELETE"}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
