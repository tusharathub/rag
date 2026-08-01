"use client";

import * as React from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { setUploadModalOpen } from "@/store/slices/uiSlice";
import { addDocument } from "@/store/slices/documentSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Document } from "@/types";

interface UploadingFile {
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "success" | "error";
  id: string;
}

export function UploadModal() {
  const dispatch = useAppDispatch();
  const uploadModalOpen = useAppSelector((state) => state.ui.uploadModalOpen);
  const handleSetUploadModalOpen = (open: boolean) => dispatch(setUploadModalOpen(open));
  const handleAddDocument = (doc: Document) => dispatch(addDocument(doc));

  const [dragActive, setDragActive] = React.useState(false);
  const [uploadQueue, setUploadQueue] = React.useState<UploadingFile[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const DEFAULT_COLLECTION_ID = "00000000-0000-0000-0000-000000000001";

  const processFiles = (files: FileList) => {
    const newItems: UploadingFile[] = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
      id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    setUploadQueue((prev) => [...newItems, ...prev]);

    Array.from(files).forEach((file, index) => {
      const queueItem = newItems[index];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("collection_id", DEFAULT_COLLECTION_ID);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/documents/upload`, true);

      // Track progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadQueue((prev) =>
            prev.map((f) =>
              f.id === queueItem.id ? { ...f, progress: percentComplete } : f
            )
          );
        }
      };

      // Handle response
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const data = JSON.parse(xhr.responseText);
            const newDoc: Document = {
              id: data.id,
              name: data.name,
              storagePath: data.storage_path,
              fileType: data.file_type,
              fileSize: data.file_size,
              status: data.status || "COMPLETED",
              organizationId: data.collection_id || DEFAULT_COLLECTION_ID,
              createdAt: data.created_at || new Date().toISOString(),
              updatedAt: data.updated_at || new Date().toISOString(),
            };

            handleAddDocument(newDoc);

            setUploadQueue((prev) =>
              prev.map((f) =>
                f.id === queueItem.id ? { ...f, progress: 100, status: "success" } : f
              )
            );
          } catch (err) {
            console.error("Failed to parse upload response", err);
            setUploadQueue((prev) =>
              prev.map((f) =>
                f.id === queueItem.id ? { ...f, status: "error" } : f
              )
            );
          }
        } else {
          console.error("Upload failed with status", xhr.status);
          setUploadQueue((prev) =>
            prev.map((f) =>
              f.id === queueItem.id ? { ...f, status: "error" } : f
            )
          );
        }
      };

      xhr.onerror = () => {
        console.error("Upload network error");
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === queueItem.id ? { ...f, status: "error" } : f
          )
        );
      };

      xhr.send(formData);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <Dialog open={uploadModalOpen} onOpenChange={handleSetUploadModalOpen}>
      <DialogContent onClose={() => handleSetUploadModalOpen(false)}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload Knowledge Files</DialogTitle>
          <DialogDescription>
            Add PDF, DOCX, or TXT documentation to your workspace vector search engine.
          </DialogDescription>
        </DialogHeader>

        {/* Drag Area */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative ${
            dragActive
              ? "border-primary bg-primary/5 scale-[0.98]"
              : "border-slate-350 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900/40"
          }`}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
            <Upload className="h-6 w-6" />
          </div>

          <p className="text-sm font-semibold text-foreground mb-1">
            Drag and drop your files here
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Supports PDF, DOCX, TXT up to 25MB
          </p>

          <Button variant="outline" size="sm" className="rounded-xl relative z-10 pointer-events-none">
            Browse files
          </Button>
        </div>

        {/* Queue Display */}
        {uploadQueue.length > 0 && (
          <div className="space-y-3 mt-4 max-h-48 overflow-y-auto pr-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uploading Queue</h4>
            <div className="space-y-2">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold text-foreground truncate">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        ({formatSize(item.size)})
                      </span>
                    </div>

                    {item.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                    )}
                  </div>

                  {item.status === "uploading" && (
                    <div className="space-y-1">
                      <Progress value={item.progress} />
                      <span className="text-[10px] text-muted-foreground self-end">
                        {item.progress}% uploaded
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
