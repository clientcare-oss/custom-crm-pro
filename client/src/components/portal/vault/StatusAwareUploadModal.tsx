import React, { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  Sparkles,
  Info,
  Loader2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { classifyDocument } from "@/../../server/services/documentClassifier";

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  base64Data: string;
  category: string;
  categoryName: string;
  documentType: string;
  documentDate: string;
  status: "ready" | "uploading" | "success" | "error";
  error?: string;
}

interface StatusAwareUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: number;
  studentName?: string;
  isRelationshipActive: boolean;
  hasCurrentPlan: boolean;
  currentPlanLabel?: string | null;
  onViewAcknowledgment?: () => void;
  onUploadComplete?: () => void;
  isLight?: boolean;
}

const VAULT_CATEGORIES = [
  { id: "ieps-504s", name: "IEPs & 504s" },
  { id: "evaluations", name: "Evaluations & Assessments" },
  { id: "school-records", name: "School Records & Report Cards" },
  { id: "communication", name: "Communication & PWN Notices" },
  { id: "medical-therapy", name: "Medical & Therapy Records" },
  { id: "behavior-fba", name: "Behavior / FBA / BIP" },
  { id: "progress-reports", name: "Progress Reports" },
];

export function StatusAwareUploadModal({
  open,
  onOpenChange,
  studentId,
  studentName = "Student",
  isRelationshipActive,
  hasCurrentPlan,
  currentPlanLabel,
  onViewAcknowledgment,
  onUploadComplete,
  isLight = false,
}: StatusAwareUploadModalProps) {
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingUploads, setIsProcessingUploads] = useState(false);
  const [uploadSuccessState, setUploadSuccessState] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.clientFiles.upload.useMutation();

  // Helper to read file to base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:application/pdf;base64, prefix
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Add files to queue with auto-classification
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const newItems: QueuedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Check PDF extension
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`"${file.name}" must be a PDF file.`);
        continue;
      }

      try {
        const base64Data = await readFileAsBase64(file);
        const classification = classifyDocument(file.name);

        newItems.push({
          id: `queue-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          name: file.name,
          size: file.size,
          base64Data,
          category: classification.category,
          categoryName: classification.categoryName,
          documentType: classification.documentType,
          documentDate: classification.extractedDate || "",
          status: "ready",
        });
      } catch (err) {
        toast.error(`Error reading ${file.name}`);
      }
    }

    setFileQueue((prev) => [...prev, ...newItems]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFileFromQueue = (id: string) => {
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateFileMeta = (id: string, updates: Partial<QueuedFile>) => {
    setFileQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Perform upload for all ready files in queue
  const handleUploadAll = async () => {
    if (fileQueue.length === 0) {
      toast.error("Please select at least one document to upload.");
      return;
    }

    setIsProcessingUploads(true);

    let successCount = 0;
    const updatedQueue = [...fileQueue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.status === "success") continue;

      item.status = "uploading";
      setFileQueue([...updatedQueue]);

      try {
        await uploadMutation.mutateAsync({
          fileName: item.name,
          fileData: item.base64Data,
          fileSize: item.size,
          category: item.category,
          documentType: item.documentType,
          documentDate: item.documentDate || undefined,
          studentId,
        });

        item.status = "success";
        successCount++;
      } catch (err: any) {
        item.status = "error";
        item.error = err?.message || "Upload failed";
      }
      setFileQueue([...updatedQueue]);
    }

    setIsProcessingUploads(false);

    if (successCount > 0) {
      setUploadSuccessState(true);
      window.dispatchEvent(new CustomEvent("waypoint:vault-updated"));
      if (onUploadComplete) onUploadComplete();
    }
  };

  const handleResetAndClose = () => {
    setFileQueue([]);
    setUploadSuccessState(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleResetAndClose}>
      <DialogContent className="max-w-2xl bg-[#06172F] border-blue-900/50 text-white rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,8,33,0.95)] max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <UploadCloud className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Waypoint Document Vault
              </span>
            </div>

            {/* Pre-enrollment status pill with view acknowledgment link */}
            {!isRelationshipActive ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/30">
                  Pre-enrollment upload
                </span>
                {onViewAcknowledgment && (
                  <button
                    type="button"
                    onClick={onViewAcknowledgment}
                    className="text-[10px] text-amber-300/80 hover:text-amber-300 underline cursor-pointer"
                  >
                    View acknowledgment
                  </button>
                )}
              </div>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Active Client Vault
              </span>
            )}
          </div>

          {/* Dynamic Header based on Relationship Status */}
          {isRelationshipActive ? (
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                📚 What should I upload?
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-blue-100/80 mt-1 leading-relaxed">
                Keeping {studentName}&apos;s Document Vault current helps your Waypoint team prepare and keeps the information we are working from up to date.
              </DialogDescription>
            </div>
          ) : (
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                📄 Have documents ready? Let&apos;s get them uploaded.
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-blue-100/80 mt-1 leading-relaxed">
                If you have any of these available, they can help us better understand {studentName}&apos;s needs.
              </DialogDescription>
            </div>
          )}
        </DialogHeader>

        {/* ── SUCCESS STATE ─────────────────────────────────────────────── */}
        {uploadSuccessState ? (
          <div className="py-8 space-y-6 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {!isRelationshipActive
                  ? "✓ Your documents are safely uploaded."
                  : "✓ Documents added to your child's Vault."}
              </h3>
              <p className="text-blue-100/80 text-xs sm:text-sm leading-relaxed">
                {!isRelationshipActive
                  ? "You do not need to upload these documents again if you decide to enroll. Documents submitted before enrollment are not automatically reviewed."
                  : `Your files are permanently archived in ${studentName}'s encrypted vault and ready for your advocate team.`}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-900/40 text-left text-xs space-y-1.5 max-w-md mx-auto">
              <p className="font-bold text-white mb-1">Uploaded in this session:</p>
              {fileQueue.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-blue-200/90 py-0.5">
                  <span className="truncate pr-2">{f.name}</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 shrink-0">
                    Vault Stored
                  </Badge>
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={handleResetAndClose}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl px-6 h-11 shadow-lg shadow-amber-400/25 cursor-pointer"
            >
              Return to Document Vault
            </Button>
          </div>
        ) : (
          <div className="space-y-4 my-2">
            {/* Smart Start Here Advice */}
            {!hasCurrentPlan ? (
              <div className="p-3.5 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-3">
                <span className="text-lg">⭐</span>
                <div>
                  <strong className="text-amber-300 font-bold">Start here: Current IEP or 504 Plan</strong>
                  <p className="text-amber-100/80 text-[11px] mt-0.5">
                    If we don&apos;t already have your child&apos;s most recent plan, please upload it first.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">
                  {currentPlanLabel || "Current plan is already on file in the vault."}
                </span>
              </div>
            )}

            {/* Drag & Drop Upload Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-amber-400 bg-amber-400/10 scale-[1.01]"
                  : "border-blue-800/60 bg-blue-950/30 hover:border-amber-400/50 hover:bg-blue-950/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400 mb-3 shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">
                Drag &amp; drop PDF files here, or <span className="text-amber-400 underline">browse</span>
              </p>
              <p className="text-[11px] text-blue-200/60 mt-1">
                Supports multiple documents per upload • PDF documents up to 50MB
              </p>
            </div>

            {/* Queued Documents List with Smart Classification */}
            {fileQueue.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-300/80 flex items-center justify-between">
                  <span>Selected Documents ({fileQueue.length})</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                  >
                    + Add More Files
                  </button>
                </p>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {fileQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-blue-950/40 border border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-blue-200/60 mt-0.5">
                            <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>•</span>
                            <span className="text-amber-300/90 font-medium">{item.documentType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Folder / Classification Selector */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Select
                          value={item.category}
                          onValueChange={(val) => {
                            const cat = VAULT_CATEGORIES.find((c) => c.id === val);
                            updateFileMeta(item.id, {
                              category: val,
                              categoryName: cat?.name || val,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-[11px] bg-[#030C22] border-blue-900/60 text-white rounded-xl w-36 sm:w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#06172F] border-blue-900/50 text-white text-xs">
                            {VAULT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Status Icon or Remove */}
                        {item.status === "uploading" ? (
                          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                        ) : item.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : item.status === "error" ? (
                          <span title={item.error}>
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeFileFromQueue(item.id)}
                            className="p-1 rounded-lg hover:bg-white/10 text-blue-300 hover:text-white cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!uploadSuccessState && (
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetAndClose}
              disabled={isProcessingUploads}
              className="text-blue-200/70 hover:text-white hover:bg-white/10 text-xs rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={fileQueue.length === 0 || isProcessingUploads}
              onClick={handleUploadAll}
              className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl px-5 h-11 shadow-lg shadow-amber-400/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer gap-2"
            >
              {isProcessingUploads ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Uploading {fileQueue.length} Document(s)...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-slate-950" />
                  <span>Upload {fileQueue.length > 0 ? `(${fileQueue.length}) ` : ""}to Secure Vault</span>
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
