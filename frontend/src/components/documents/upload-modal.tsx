"use client";

import * as React from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { setUploadModalOpen } from "@/store/slices/uiSlice";
import { addDocument } from "@/store/slices/documentSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Document } from "@/types";
import { useAuth } from "@clerk/nextjs";
import { getApiBaseUrl } from "@/lib/api";

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

  const API_BASE = getApiBaseUrl();
  const DEFAULT_COLLECTION_ID = "00000000-0000-0000-0000-000000000001";

  const { getToken } = useAuth();

  const processFiles = async (files: FileList) => {
    const token = await getToken();
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

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

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
          <DialogTitle>
            <span className="text-[#FFA028]">//</span> Upload Knowledge Files
          </DialogTitle>
          <DialogDescription>
            Add PDF, DOCX, XLSX, PPTX, or TXT documentation to your vector search engine.
          </DialogDescription>
        </DialogHeader>

        {/* Drag Area */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 relative ${
            dragActive
              ? "border-[#FFA028] bg-[#FFA028]/10"
              : "border-slate-800 bg-[#080808] hover:border-[#FFA028]/50 hover:bg-[#0A0A0A]"
          }`}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="h-10 w-10 rounded bg-black border border-[#FFA028]/40 text-[#FFA028] flex items-center justify-center mb-3">
            <Upload className="h-5 w-5" />
          </div>

          <p className="text-xs font-bold text-white mb-1">
            Drag and drop your files here
          </p>
          <p className="text-[11px] text-slate-400 mb-4 font-sans">
            Supports PDF, DOCX, XLSX, PPTX, TXT up to 25MB
          </p>

          <button className="px-4 py-2 bg-[#FFA028] text-slate-950 font-bold text-xs clip-chamfer-sm relative z-10 pointer-events-none uppercase tracking-wider">
            BROWSE FILES
          </button>
        </div>

        {/* Queue Display */}
        {uploadQueue.length > 0 && (
          <div className="space-y-3 mt-4 max-h-48 overflow-y-auto pr-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#FFA028]">Uploading Queue</h4>
            <div className="space-y-2">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-slate-900 rounded bg-[#080808] flex flex-col gap-2 font-mono text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-[#FFA028] flex-shrink-0" />
                      <span className="font-bold text-white truncate">{item.name}</span>
                      <span className="text-[10px] text-slate-500 flex-shrink-0">
                        ({formatSize(item.size)})
                      </span>
                    </div>

                    {item.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                    )}
                  </div>

                  {item.status === "uploading" && (
                    <div className="space-y-1">
                      <Progress value={item.progress} />
                      <span className="text-[10px] text-slate-400 self-end">
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
