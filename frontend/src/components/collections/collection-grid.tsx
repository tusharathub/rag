"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Layers, MessageSquare, Plus, Check, X } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { addCollection, deleteCollection } from "@/store/slices/collectionSlice";
import { addChatSession } from "@/store/slices/chatSlice";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export function CollectionGrid() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const collections = useAppSelector((state) => state.collections.items);
  const documents = useAppSelector((state) => state.documents.items);

  const [name, setName] = React.useState("");
  const [selectedDocs, setSelectedDocs] = React.useState<string[]>([]);
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch(addCollection(name, selectedDocs));
    setName("");
    setSelectedDocs([]);
    setIsCreating(false);
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleChatWithCollection = (colName: string) => {
    const sessionId = `chat-${Date.now()}`;
    dispatch(addChatSession({ id: sessionId, title: `Chat: ${colName}` }));
    router.push("/workspace/chat");
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header and Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-extrabold text-white tracking-tight uppercase">
          Document Collections
        </h3>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-[#FFA028] hover:bg-[#E58D1B] text-slate-950 font-bold text-xs tracking-wider clip-chamfer transition-all shadow flex items-center gap-1.5"
        >
          {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{isCreating ? "CANCEL" : "NEW COLLECTION"}</span>
        </button>
      </div>

      {/* Creation Block */}
      {isCreating && (
        <Card className="border-[#FFA028]/40 bg-[#0C0C0C] overflow-hidden animate-in fade-in duration-200">
          <form onSubmit={handleCreate}>
            <CardHeader className="p-6">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
                Create Scoped Collection
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 font-sans">
                Group related documents to set vector search context boundaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#FFA028] uppercase tracking-widest">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal Agreements, Architecture Specs"
                  className="w-full px-4 py-2 border border-slate-800 rounded bg-[#080808] text-white focus:outline-none focus:border-[#FFA028] text-xs font-mono"
                  required
                />
              </div>

              {/* Doc Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#FFA028] uppercase tracking-widest">
                  Select Documents
                </label>
                {documents.length === 0 ? (
                  <p className="text-xs text-slate-500 font-sans">No documents in library. Ingest files first.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {documents.map((doc) => {
                      const isSelected = selectedDocs.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => toggleSelectDoc(doc.id)}
                          className={`flex items-center justify-between p-2.5 rounded border cursor-pointer text-xs transition-all ${
                            isSelected
                              ? "border-[#FFA028] bg-[#FFA028]/10 text-white font-bold"
                              : "border-slate-800 hover:bg-slate-900 text-slate-400"
                          }`}
                        >
                          <span className="truncate pr-2">{doc.name}</span>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                            isSelected ? "border-[#FFA028] bg-[#FFA028] text-slate-950" : "border-slate-700"
                          }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 flex justify-end gap-2">
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-5 py-2.5 bg-[#FFA028] hover:bg-[#E58D1B] disabled:opacity-50 text-slate-950 font-bold text-xs clip-chamfer transition-all"
              >
                CREATE COLLECTION
              </button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((col) => (
          <Card
            key={col.id}
            className="flex flex-col justify-between border-slate-900 bg-[#0C0C0C] duration-300 hover:border-[#FFA028]/50 relative overflow-hidden group shadow-lg"
          >
            <CardHeader className="p-6">
              <div className="w-10 h-10 rounded bg-black border border-[#FFA028]/40 text-[#FFA028] flex items-center justify-center mb-3">
                <Layers className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-white tracking-tight">
                {col.name}
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500 mt-1">
                Created: {new Date(col.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-xs font-bold text-[#FFA028] flex items-center gap-1">
                <span>{col.documentIds.length} connected files</span>
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 border-t border-slate-900 flex items-center justify-between gap-2 mt-4 pt-4">
              <button
                onClick={() => handleChatWithCollection(col.name)}
                className="px-4 py-2 bg-black hover:bg-slate-900 text-[#FFA028] border border-[#FFA028]/40 text-xs font-bold flex items-center justify-center gap-1.5 flex-1 rounded clip-chamfer-sm transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>CHAT</span>
              </button>
              <button
                onClick={() => dispatch(deleteCollection(col.id))}
                className="text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 p-2 rounded transition-colors"
                title="Delete Collection"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
