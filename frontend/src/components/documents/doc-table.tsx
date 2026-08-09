"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Trash2, ArrowUpDown, CheckCircle, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { fetchDocuments, deleteDocumentThunk } from "@/store/slices/documentSlice";
import { removeDocumentFromCollections } from "@/store/slices/collectionSlice";
import { addChatSession } from "@/store/slices/chatSlice";
import { useAuth } from "@clerk/nextjs";

export function DocTable() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { getToken } = useAuth();
  const documents = useAppSelector((state) => state.documents.items);
  const DEFAULT_COLLECTION_ID = "00000000-0000-0000-0000-000000000001";

  React.useEffect(() => {
    (async () => {
      const token = await getToken();
      dispatch(fetchDocuments({ collectionId: DEFAULT_COLLECTION_ID, token }));
    })();
  }, [dispatch, getToken]);
  
  const handleDeleteDocument = async (id: string) => {
    const token = await getToken();
    dispatch(deleteDocumentThunk({ documentId: id, token }));
    dispatch(removeDocumentFromCollections(id));
  };

  const handleChatWithDocument = (docName: string) => {
    const sessionId = `chat-${Date.now()}`;
    dispatch(addChatSession({ id: sessionId, title: `Chat: ${docName}` }));
    router.push("/workspace/chat");
  };

  
  const [search, setSearch] = React.useState("");
  const [sortField, setSortField] = React.useState<"name" | "fileSize" | "createdAt">("createdAt");
  const [sortAsc, setSortAsc] = React.useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSort = (field: "name" | "fileSize" | "createdAt") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSortedDocs = React.useMemo(() => {
    let result = documents.filter((doc) =>
      doc.name.toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "fileSize") {
        comparison = a.fileSize - b.fileSize;
      } else if (sortField === "createdAt") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [documents, search, sortField, sortAsc]);

  const renderStatus = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 rounded inline-flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>INDEXED</span>
          </span>
        );
      case "PROCESSING":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FFA028]/10 text-[#FFA028] border border-[#FFA028]/40 rounded inline-flex items-center gap-1 animate-pulse">
            <Clock className="h-3 w-3" />
            <span>CHUNKING</span>
          </span>
        );
      case "FAILED":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-950/80 text-rose-400 border border-rose-500/40 rounded inline-flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700 rounded inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Filters block */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#FFA028]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2 border border-slate-800 rounded bg-[#080808] text-white focus:outline-none focus:border-[#FFA028] text-xs font-mono"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing {filteredAndSortedDocs.length} of {documents.length} vector files
        </div>
      </div>

      {/* Grid container */}
      <div className="border border-slate-900 rounded-lg overflow-hidden bg-[#0C0C0C] shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 bg-[#080808] text-xs font-bold uppercase tracking-wider text-slate-400 select-none">
                <th
                  onClick={() => handleSort("name")}
                  className="px-6 py-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Filename</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#FFA028]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("fileSize")}
                  className="px-6 py-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>File Size</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#FFA028]" />
                  </div>
                </th>
                <th className="px-6 py-4">Status</th>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="px-6 py-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Ingested At</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#FFA028]" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-xs">
              {filteredAndSortedDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-mono">
                    No documents match your query. Upload files to get started.
                  </td>
                </tr>
              ) : (
                filteredAndSortedDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-900/60 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-white">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-black border border-[#FFA028]/30 text-[#FFA028]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="truncate max-w-xs">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatSize(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4">{renderStatus(doc.status)}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(doc.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleChatWithDocument(doc.name)}
                        className="text-[#FFA028] hover:bg-[#FFA028]/10 p-1.5 rounded transition-colors mr-2 inline-flex items-center gap-1 font-bold text-[11px]"
                        title={`Chat with ${doc.name}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>CHAT</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 p-1.5 rounded transition-colors inline-flex items-center"
                        title="Delete file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
