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
  RefreshCw,
  Folder,
  FolderDown,
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
  const [isUpdatingIep, setIsUpdatingIep] = useState<boolean>(true);
  const [targetFolder, setTargetFolder] = useState<string>("auto");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.clientFiles.upload.useMutation();

  const handleTargetFolderChange = (folderId: string) => {
    setTargetFolder(folderId);
    if (folderId !== "auto") {
      const cat = VAULT_CATEGORIES.find((c) => c.id === folderId);
      const catName = cat?.name || folderId;
      setFileQueue((prev) =>
        prev.map((item) => ({
          ...item,
          category: folderId,
          categoryName: catName,
        }))
      );
    } else {
      setFileQueue((prev) =>
        prev.map((item) => {
          const classification = classifyDocument(item.name);
          return {
            ...item,
            category: classification.category === "ieps-504s" ? "evaluations" : classification.category,
            categoryName: classification.category === "ieps-504s" ? "Evaluations & Assessments" : classification.categoryName,
            documentType: classification.category === "ieps-504s" ? "General Evaluation" : classification.documentType,
          };
        })
      );
    }
  };

  const handleSelectIepMode = (isIep: boolean) => {
    setIsUpdatingIep(isIep);
    if (isIep) {
      setTargetFolder("ieps-504s");
      setFileQueue((prev) =>
        prev.map((item) => ({
          ...item,
          category: "ieps-504s",
          categoryName: "IEPs & 504s",
          documentType: "Current IEP",
        }))
      );
    } else {
      setTargetFolder("auto");
      setFileQueue((prev) =>
        prev.map((item) => {
          const classification = classifyDocument(item.name);
          return {
            ...item,
            category: classification.category === "ieps-504s" ? "evaluations" : classification.category,
            categoryName: classification.category === "ieps-504s" ? "Evaluations & Assessments" : classification.categoryName,
            documentType: classification.category === "ieps-504s" ? "General Evaluation" : classification.documentType,
          };
        })
      );
    }
  };

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

        let category = classification.category;
        let categoryName = classification.categoryName;
        let documentType = classification.documentType;

        if (isUpdatingIep) {
          category = "ieps-504s";
          categoryName = "IEPs & 504s";
          documentType = "Current IEP";
        } else if (targetFolder !== "auto") {
          const cat = VAULT_CATEGORIES.find((c) => c.id === targetFolder);
          category = targetFolder;
          categoryName = cat?.name || targetFolder;
        }

        newItems.push({
          id: `queue-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          name: file.name,
          size: file.size,
          base64Data,
          category,
          categoryName,
          documentType,
          documentDate: classification.extractedDate || "",
          status: "ready",
        });
      } catch (err) {
        toast.error(`Error reading ${file.name}`);
      }
    }

    setFileQueue((prev) => [...prev, ...newItems]);
  }, [isUpdatingIep, targetFolder]);

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
    setTargetFolder("auto");
    setIsUpdatingIep(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleResetAndClose}>
      <DialogContent className="max-w-2xl bg-[#06172F] border-blue-900/50 text-white rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,8,33,0.95)] max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <UploadCloud className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  Document Vault for {studentName} Only
                </span>
                <span className="text-[10px] text-blue-200/60 font-semibold tracking-wide">
                  Waypoint Advocates · Confidential Student Vault
                </span>
              </div>
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

          {/* Dynamic Header with Question and Yes/No Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black text-white tracking-tight">
                Are you uploading an updated IEP or 504?
              </DialogTitle>
              <DialogDescription className="sr-only">
                Document upload modal for {studentName}
              </DialogDescription>
            </div>

            {/* Yes / No Toggle */}
            <div className="inline-flex rounded-xl bg-[#020A17] border border-blue-900/80 p-1 gap-1 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => handleSelectIepMode(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isUpdatingIep === true
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-md shadow-amber-400/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Yes</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectIepMode(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  isUpdatingIep === false
                    ? "bg-sky-600 text-white shadow-md shadow-sky-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>No</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* ── SUCCESS STATE ─────────────────────────────────────────────── */}
        {uploadSuccessState ? (
          <div className="py-8 space-y-6 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isUpdatingIep
                  ? "✓ Active IEP / 504 Replaced & Updated!"
                  : "✓ Documents Added to Vault"}
              </h3>
              <p className="text-blue-100/80 text-xs sm:text-sm leading-relaxed">
                {isUpdatingIep
                  ? `${studentName}'s active authoritative IEP / 504 on file has been updated. Byron and the advocate team will review the new provisions.`
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
          <div className="space-y-3 my-2">
            {/* 1-Line Status Indicator */}
            {isUpdatingIep ? (
              <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span><strong>Action:</strong> Replaces current IEP / 504 on file for {studentName}.</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                  Authoritative
                </span>
              </div>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span><strong>Action:</strong> General upload for evaluations, records, and reports.</span>
              </div>
            )}

            {/* Drag & Drop Upload Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-amber-400 bg-amber-400/10"
                  : isUpdatingIep
                  ? "border-amber-400/60 bg-[#041021]/80 hover:border-amber-400 hover:bg-[#071933]"
                  : "border-blue-800/60 bg-blue-950/30 hover:border-amber-400/50 hover:bg-blue-950/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple={!isUpdatingIep}
                accept="application/pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${
                isUpdatingIep 
                  ? "bg-amber-400/20 border border-amber-400/40 text-amber-300"
                  : "bg-blue-500/20 border border-blue-400/40 text-blue-300"
              }`}>
                {isUpdatingIep ? <RefreshCw className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
              </div>
              <p className="text-xs sm:text-sm font-bold text-white">
                {isUpdatingIep ? (
                  <>Drag &amp; drop updated IEP / 504 PDF here, or <span className="text-amber-400 underline">browse</span></>
                ) : (
                  <>Drag &amp; drop PDF files here, or <span className="text-sky-400 underline">browse</span></>
                )}
              </p>
              <p className="text-[11px] text-blue-200/60 mt-0.5">
                PDF documents up to 50MB
              </p>
            </div>

            {/* Save to folder (Single clean horizontal row) */}
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#030E1F] border border-blue-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 shrink-0">
                <Folder className="w-4 h-4 text-amber-400" />
                <span>Save to folder:</span>
              </div>

              <div className="w-56 sm:w-64 max-w-[65%]">
                {isUpdatingIep ? (
                  <div className="h-8 px-3 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center justify-between">
                    <span className="truncate">IEPs &amp; 504s</span>
                    <span className="text-[10px] uppercase font-bold text-amber-400/80 bg-amber-400/20 px-1.5 py-0.5 rounded ml-1.5 shrink-0">
                      Active Plan
                    </span>
                  </div>
                ) : (
                  <Select value={targetFolder} onValueChange={handleTargetFolderChange}>
                    <SelectTrigger className="h-8 text-xs bg-[#020A17] border-blue-900/80 text-white rounded-lg focus:ring-1 focus:ring-sky-400 cursor-pointer">
                      <SelectValue placeholder="Select folder..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-blue-900 text-white text-xs z-50">
                      <SelectItem value="auto" className="cursor-pointer font-bold text-sky-300">
                        ✨ Auto-Sort by Document Type
                      </SelectItem>
                      {VAULT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="cursor-pointer">
                          📁 {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
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
                          <div className="flex items-center gap-2 text-[10px] text-blue-200/60 mt-0.5 flex-wrap">
                            <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>•</span>
                            {isUpdatingIep ? (
                              <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px] font-bold px-1.5 py-0">
                                ⭐ Replaces Current IEP / 504 on File
                              </Badge>
                            ) : (
                              <span className="text-amber-300/90 font-medium">{item.documentType}</span>
                            )}
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
              className={`font-bold text-xs sm:text-sm rounded-xl px-6 h-11 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer gap-2 transition-all ${
                isUpdatingIep
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 shadow-amber-400/20"
                  : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-blue-500/20"
              }`}
            >
              {isProcessingUploads ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-current" />
                  <span>Uploading {fileQueue.length} Document(s)...</span>
                </>
              ) : isUpdatingIep ? (
                <>
                  <RefreshCw className="w-4 h-4 text-[#07162B]" />
                  <span>Upload &amp; Replace Current Plan ({fileQueue.length})</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-white" />
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
