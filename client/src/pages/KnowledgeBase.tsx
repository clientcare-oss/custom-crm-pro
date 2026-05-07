import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen, Upload, Search, FileText, Trash2, ExternalLink,
  BookMarked, FlaskConical, Mail, Briefcase, FolderOpen, Plus,
} from "lucide-react";

const CATEGORIES = ["All", "Law Books", "Test Books", "OSEP Letters", "Work Documents", "Other"] as const;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "All": <BookOpen className="h-4 w-4" />,
  "Law Books": <BookMarked className="h-4 w-4" />,
  "Test Books": <FlaskConical className="h-4 w-4" />,
  "OSEP Letters": <Mail className="h-4 w-4" />,
  "Work Documents": <Briefcase className="h-4 w-4" />,
  "Other": <FolderOpen className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Law Books": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Test Books": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "OSEP Letters": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Work Documents": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Other": "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
};

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeBase() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "Other",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], refetch, isLoading } = trpc.knowledgeBase.list.useQuery({
    category: selectedCategory === "All" ? undefined : selectedCategory,
    search: search || undefined,
  });

  const deleteMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      refetch();
    },
    onError: (e) => toast.error(e.message || "Delete failed"),
  });

  const uploadMutation = trpc.knowledgeBase.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      refetch();
      setUploadOpen(false);
      setUploadForm({ title: "", description: "", category: "Other" });
      setSelectedFile(null);
      setUploading(false);
    },
    onError: (e) => {
      toast.error(e.message || "Upload failed");
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be under 50 MB");
      return;
    }
    setSelectedFile(file);
    if (!uploadForm.title) {
      setUploadForm((f) => ({ ...f, title: file.name.replace(/\.pdf$/i, "") }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast.error("Please select a PDF file"); return; }
    if (!uploadForm.title.trim()) { toast.error("Title is required"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim() || undefined,
        category: uploadForm.category,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileData: base64,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate({ id });
    }
  };

  // Count per category
  const allDocs = trpc.knowledgeBase.list.useQuery({}).data ?? [];
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    if (cat === "All") acc[cat] = allDocs.length;
    else acc[cat] = allDocs.filter((d) => d.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex h-full min-h-0">
      {/* Category Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-muted/30 p-4 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">Categories</p>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left ${
              selectedCategory === cat
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {CATEGORY_ICONS[cat]}
            <span className="flex-1">{cat}</span>
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-mono ${
              selectedCategory === cat ? "bg-accent-foreground/10" : "bg-muted"
            }`}>
              {categoryCounts[cat] ?? 0}
            </span>
          </button>
        ))}

        <div className="mt-auto pt-4 border-t">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                {/* File drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                      : "border-muted-foreground/30 hover:border-accent hover:bg-accent/5"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="h-8 w-8 text-green-500" />
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to select a PDF</p>
                      <p className="text-xs text-muted-foreground">PDF only · Max 50 MB</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. IDEA 2004 Full Text"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={uploadForm.category}
                    onValueChange={(v) => setUploadForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Input
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Brief notes about this document"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setUploadOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={uploading}>
                    {uploading ? (
                      <><span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> Uploading…</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Upload</>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {/* Header */}
        <div className="p-6 pb-4 border-b bg-background">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-accent" />
                Knowledge Base
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your reference library — law books, test materials, OSEP letters, and more
              </p>
            </div>
          </div>
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="pl-9"
            />
          </div>
        </div>

        {/* Document grid */}
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <BookOpen className="h-14 w-14 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No documents yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {search ? "No results for your search." : `Upload your first document to the ${selectedCategory === "All" ? "Knowledge Base" : selectedCategory} category.`}
              </p>
              {!search && (
                <Button onClick={() => setUploadOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4" /> Upload Document
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative flex flex-col rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow p-4 gap-3"
                >
                  {/* Category badge */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS["Other"]}`}>
                      {CATEGORY_ICONS[doc.category]}
                      {doc.category}
                    </span>
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Icon + title */}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight line-clamp-2">{doc.title}</p>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(doc.fileSize)}
                      {doc.fileSize ? " · " : ""}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
