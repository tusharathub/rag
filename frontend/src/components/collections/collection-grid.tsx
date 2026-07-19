"use client";

import * as React from "react";
import { FolderPlus, Trash2, Layers, MessageSquare, Plus, Check } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CollectionGrid() {
  const collections = useAppStore((state) => state.collections);
  const documents = useAppStore((state) => state.documents);
  const addCollection = useAppStore((state) => state.addCollection);
  const deleteCollection = useAppStore((state) => state.deleteCollection);
  const addChatSession = useAppStore((state) => state.addChatSession);
  const setActivePanel = useAppStore((state) => state.setActivePanel);

  const [name, setName] = React.useState("");
  const [selectedDocs, setSelectedDocs] = React.useState<string[]>([]);
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCollection(name, selectedDocs);
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
    const sessionId = addChatSession(`Chat: ${colName}`);
    setActivePanel("chat");
  };

  return (
    <div className="space-y-6">
      {/* Header and Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-foreground">Document Collections</h3>
        <Button
          onClick={() => setIsCreating(!isCreating)}
          className="rounded-xl flex items-center gap-2"
        >
          {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{isCreating ? "Cancel" : "New Collection"}</span>
        </Button>
      </div>

      {/* Creation Block */}
      {isCreating && (
        <Card className="border-indigo-500/30 dark:border-indigo-500/20 dark:bg-slate-900 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleCreate}>
            <CardHeader className="p-6">
              <CardTitle className="text-md font-bold">Create Collection</CardTitle>
              <CardDescription>
                Group related documents to scope your AI assistant answers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Collection Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal Agreements, Tax Declarations"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                  required
                />
              </div>

              {/* Doc Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Select Documents</label>
                {documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No documents in library. Upload files first.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {documents.map((doc) => {
                      const isSelected = selectedDocs.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => toggleSelectDoc(doc.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50"
                          }`}
                        >
                          <span className="truncate pr-2">{doc.name}</span>
                          <div className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                            isSelected ? "border-primary bg-primary text-white" : "border-slate-350 dark:border-slate-700"
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
              <Button type="submit" disabled={!name.trim()} className="rounded-xl">
                Create Collection
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((col) => (
          <Card
            key={col.id}
            className="flex flex-col justify-between border-slate-200/60 dark:border-slate-800 dark:bg-slate-900 duration-300 hover:shadow-lg relative overflow-hidden"
          >
            <CardHeader className="p-6">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4 border border-violet-500/20">
                <Layers className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                {col.name}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Created: {new Date(col.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <span>{col.documentIds.length} connected files</span>
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 border-t border-slate-100 dark:border-slate-850/80 flex items-center justify-between gap-2 mt-4 pt-4">
              <Button
                onClick={() => handleChatWithCollection(col.name)}
                variant="outline"
                size="sm"
                className="rounded-xl flex items-center gap-1.5 flex-1 h-9"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </Button>
              <Button
                onClick={() => deleteCollection(col.id)}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl h-9 w-9"
                title="Delete Collection"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Small helper export to avoid import errors
function X(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
