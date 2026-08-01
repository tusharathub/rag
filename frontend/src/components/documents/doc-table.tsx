"use client";

import * as React from "react";
import { Search, FileText, Trash2, ArrowUpDown, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { fetchDocuments, deleteDocumentThunk } from "@/store/slices/documentSlice";
import { removeDocumentFromCollections } from "@/store/slices/collectionSlice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DocTable() {
  const dispatch = useAppDispatch();
  const documents = useAppSelector((state) => state.documents.items);
  const DEFAULT_COLLECTION_ID = "00000000-0000-0000-0000-000000000001";

  React.useEffect(() => {
    dispatch(fetchDocuments(DEFAULT_COLLECTION_ID));
  }, [dispatch]);
  
  const handleDeleteDocument = (id: string) => {
    dispatch(deleteDocumentThunk(id));
    dispatch(removeDocumentFromCollections(id));
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
          <Badge variant="success" className="gap-1 flex items-center w-fit">
            <CheckCircle className="h-3 w-3" />
            <span>Ready</span>
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="warning" className="gap-1 flex items-center w-fit animate-pulse">
            <Clock className="h-3 w-3" />
            <span>Parsing</span>
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="gap-1 flex items-center w-fit">
            <AlertCircle className="h-3 w-3" />
            <span>Error</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1 flex items-center w-fit">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters block */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
          />
        </div>
        <div className="text-xs text-muted-foreground font-semibold">
          Showing {filteredAndSortedDocs.length} of {documents.length} files
        </div>
      </div>

      {/* Grid container */}
      <div className="border border-slate-250 dark:border-slate-800 rounded-2xl overflow-hidden dark:bg-slate-900 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-xs font-bold uppercase tracking-wider text-muted-foreground select-none">
                <th
                  onClick={() => handleSort("name")}
                  className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Filename</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("fileSize")}
                  className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>File Size</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th className="px-6 py-4">Status</th>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Uploaded At</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredAndSortedDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No documents match your query.
                  </td>
                </tr>
              ) : (
                filteredAndSortedDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="truncate max-w-xs">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">
                      {formatSize(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4">{renderStatus(doc.status)}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg h-9 w-9"
                        title="Delete file"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
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
