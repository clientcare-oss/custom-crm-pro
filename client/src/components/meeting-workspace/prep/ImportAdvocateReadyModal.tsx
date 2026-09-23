import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  FileText,
  UploadCloud,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  Plus,
  Loader2,
  Trash2,
  Check,
  Save,
  Info,
  Calendar,
  User,
  Layers,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { MeetingTarget, AdvocateReadyImportItem } from "../types";

interface ImportAdvocateReadyModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentContactId: number;
  studentName: string;
  currentDetectedOrder?: string[];
  existingTargetsCount: number;
  onImportTargets: (
    targets: MeetingTarget[],
    mode: "append" | "replace",
    detectedOrder?: string[]
  ) => void;
}

export function ImportAdvocateReadyModal({
  isOpen,
  onClose,
  studentContactId,
  studentName,
  currentDetectedOrder = [],
  existingTargetsCount,
  onImportTargets,
}: ImportAdvocateReadyModalProps) {
  const [activeInputTab, setActiveInputTab] = useState<"paste" | "upload">("paste");
  const [pastedText, setPastedText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse state & Review state
  const [parseStage, setParseStage] = useState<"input" | "preview" | "conflict">("input");
  const [parsedTargets, setParsedTargets] = useState<AdvocateReadyImportItem[]>([]);
  const [importedOrder, setImportedOrder] = useState<string[]>([]);
  const [parsedAdditionalNotes, setParsedAdditionalNotes] = useState<string[]>([]);
  const [parseMeta, setParseMeta] = useState<{
    studentName: string;
    meetingTitle: string;
    isUnassignedDraft: boolean;
    isDuplicate: boolean;
    existingDraftCount: number;
    validationErrors: string[];
  }>({
    studentName: studentName || "Jeremiah Mitchell",
    meetingTitle: "Unassigned Draft",
    isUnassignedDraft: true,
    isDuplicate: false,
    existingDraftCount: existingTargetsCount,
    validationErrors: [],
  });

  const [orderChoice, setOrderChoice] = useState<"current_iep" | "imported">(
    currentDetectedOrder.length > 0 ? "current_iep" : "imported"
  );

  // Edit single target inside preview
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdvocateReadyImportItem>>({});

  const utils = trpc.useUtils();

  const parseMutation = trpc.meetingWorkspace.parseAdvocateReadyImport.useMutation({
    onSuccess: (data) => {
      setParsedTargets(data.targets as AdvocateReadyImportItem[]);
      if (data.detectedOrder && data.detectedOrder.length > 0) {
        setImportedOrder(data.detectedOrder);
      }
      if (data.additionalItems) {
        setParsedAdditionalNotes(data.additionalItems);
      }
      setParseMeta({
        studentName: data.studentName,
        meetingTitle: data.meetingTitle,
        isUnassignedDraft: data.isUnassignedDraft,
        isDuplicate: data.isDuplicate,
        existingDraftCount: data.existingDraftCount,
        validationErrors: data.validationErrors || [],
      });
      setParseStage("preview");

      if (data.validationErrors && data.validationErrors.length > 0) {
        toast.warning(`Parsed ${data.targets.length} targets with ${data.validationErrors.length} validation notes`);
      } else if (data.isDuplicate) {
        toast.info(`Parsed ${data.targets.length} targets · Matching existing draft detected`);
      } else {
        toast.success(`Parsed ${data.targets.length} targets successfully for ${data.studentName}`);
      }
    },
    onError: (err) => {
      toast.error(`Parse failed: ${err.message}`);
    },
  });

  const saveDraftMutation = trpc.meetingWorkspace.saveAdvocateReadyDraft.useMutation({
    onSuccess: (res) => {
      toast.success(
        res.isUnassignedDraft
          ? `Saved ${res.savedTargetsCount} Targets as Unassigned Draft for ${res.studentName}`
          : `Saved ${res.savedTargetsCount} Targets for ${res.studentName}`
      );
      utils.meetingWorkspace.getOrCreate.invalidate();
      onImportTargets(
        parsedTargets.filter((t) => t.included),
        "replace",
        orderChoice === "imported" && importedOrder.length > 0 ? importedOrder : currentDetectedOrder
      );
      onClose();
      resetModal();
    },
    onError: (err) => {
      toast.error(`Save draft failed: ${err.message}`);
    },
  });

  const handleFileUpload = (file: File) => {
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setPastedText(content);
        toast.success(`Loaded file: ${file.name}`);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read selected file");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleParse = () => {
    if (!pastedText.trim() || pastedText.trim().length < 5) {
      toast.error("Please paste or upload Advocate Ready text first");
      return;
    }
    parseMutation.mutate({
      studentContactId,
      rawContent: pastedText,
      fileName: uploadedFileName || undefined,
    });
  };

  const handleToggleInclude = (id: string) => {
    setParsedTargets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, included: !t.included } : t))
    );
  };

  const handleStartEdit = (target: AdvocateReadyImportItem) => {
    setEditingTargetId(target.id);
    setEditForm({
      targetName: target.targetName,
      iepSection: target.iepSection,
      quickAdvocateSayThis: target.quickAdvocateSayThis,
      putItHereLocation: target.putItHereLocation,
      whyWeWantIt: target.whyWeWantIt,
      supportingEvidence: target.supportingEvidence,
      ifTeamDisagrees: target.ifTeamDisagrees,
    });
  };

  const handleSaveEdit = (id: string) => {
    setParsedTargets((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...editForm, needsReview: false, reviewReason: undefined } : t
      )
    );
    setEditingTargetId(null);
    toast.success("Target updated");
  };

  const handleAddNewTarget = () => {
    const newId = `imp-${Date.now()}-${parsedTargets.length + 1}`;
    const newTarget: AdvocateReadyImportItem = {
      id: newId,
      externalTargetId: `TARGET-${String(parsedTargets.length + 1).padStart(3, "0")}`,
      targetName: "New Meeting Target",
      iepSection: currentDetectedOrder[0] || "Accommodations / Supports",
      sectionOrder: parsedTargets.length + 1,
      targetOrder: parsedTargets.length + 1,
      quickAdvocateSayThis: "We are requesting this support to ensure appropriate classroom access.",
      fullAdvocateScript: "We are requesting this support to ensure appropriate classroom access.",
      putItHereLocation: "IEP Accommodations",
      possibleIepWording: "Student will be provided with specified accommodations as outlined.",
      whyWeWantIt: "To address documented needs in the classroom.",
      supportingEvidence: "Documented observations and case evaluations.",
      sources: ["Manual Advocate Input"],
      ifTeamDisagrees: "If refused, please document refusal rationale in Prior Written Notice.",
      parentWhatWeWant: "Support for classroom needs.",
      parentWhyWeWantIt: "To help the student learn comfortably.",
      parentSupportingEvidence: "Evaluations and school reports.",
      meetingStatus: "NOT_DISCUSSED",
      requestRaised: false,
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      included: true,
      needsReview: false,
    };
    setParsedTargets([...parsedTargets, newTarget]);
    handleStartEdit(newTarget);
  };

  const handleSaveDraft = (mode: "draft" | "replace" | "append" = "replace") => {
    const includedTargets = parsedTargets.filter((t) => t.included);
    if (includedTargets.length === 0) {
      toast.error("No targets selected to import");
      return;
    }

    const finalOrder =
      orderChoice === "imported" && importedOrder.length > 0
        ? importedOrder
        : currentDetectedOrder.length > 0
        ? currentDetectedOrder
        : importedOrder;

    saveDraftMutation.mutate({
      studentContactId,
      meetingId: null,
      targets: includedTargets,
      detectedOrder: finalOrder,
      additionalItems: parsedAdditionalNotes,
      mode,
    });
  };

  const handleConfirmImport = (mode: "append" | "replace" = "append") => {
    const includedTargets = parsedTargets.filter((t) => t.included);
    if (includedTargets.length === 0) {
      toast.error("No targets selected to import");
      return;
    }

    const finalOrder =
      orderChoice === "imported" && importedOrder.length > 0
        ? importedOrder
        : currentDetectedOrder.length > 0
        ? currentDetectedOrder
        : importedOrder;

    // Save to DB and update client state
    saveDraftMutation.mutate({
      studentContactId,
      meetingId: null,
      targets: includedTargets,
      detectedOrder: finalOrder,
      additionalItems: parsedAdditionalNotes,
      mode,
    });
  };

  const handleProceedClick = () => {
    if (existingTargetsCount > 0) {
      setParseStage("conflict");
    } else {
      handleConfirmImport("replace");
    }
  };

  const resetModal = () => {
    setPastedText("");
    setUploadedFileName(null);
    setParseStage("input");
    setParsedTargets([]);
    setParsedAdditionalNotes([]);
    setEditingTargetId(null);
  };

  const includedCount = parsedTargets.filter((t) => t.included).length;
  const reviewCount = parsedTargets.filter((t) => t.needsReview && t.included).length;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          resetModal();
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-[#000820] border border-[#144E8A] text-slate-100 shadow-[0_0_50px_rgba(0,10,35,0.9)] p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[#0F3D70] bg-gradient-to-r from-[#000820] via-[#071E3D] to-[#000820]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-[#F5B544]">
                <Download className="h-4 w-4" />
              </span>
              <Badge variant="outline" className="border-[#F5B544]/40 text-[#F5B544] bg-[#071C3C] text-[11px]">
                Advocate Ready Import
              </Badge>
              <span className="text-xs text-blue-300/70">PG-043 Workspace Fast Track</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white tracking-wide">
              📥 Import Advocate Ready Document
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/80 leading-relaxed">
              Paste or drop an Advocate Ready document and Waypoint will parse each item into discrete meeting targets for <strong className="text-white">{parseMeta.studentName || studentName}</strong>.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STAGE 1: INPUT (Paste or Upload) */}
          {parseStage === "input" && (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 p-1 rounded-xl bg-[#06172E] border border-[#0D3866] w-fit">
                <button
                  type="button"
                  onClick={() => setActiveInputTab("paste")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                    activeInputTab === "paste"
                      ? "bg-[#0E427B] text-[#F5B544] border border-[#2368B2] shadow-sm font-bold"
                      : "text-blue-300/70 hover:text-white"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab("upload")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                    activeInputTab === "upload"
                      ? "bg-[#0E427B] text-[#F5B544] border border-[#2368B2] shadow-sm font-bold"
                      : "text-blue-300/70 hover:text-white"
                  )}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Drop File (.txt)
                </button>
              </div>

              {/* Option 1: Paste Text Area */}
              {activeInputTab === "paste" && (
                <div className="space-y-2">
                  <Textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste Advocate Ready content here (e.g. starting with ⚡ MEETING QUICK LIST)..."
                    rows={12}
                    className="w-full bg-[#051429] border border-[#144E8A] text-blue-100 placeholder:text-blue-300/40 text-xs font-mono rounded-xl p-4 focus:ring-1 focus:ring-[#F5B544] focus:border-[#F5B544] leading-relaxed resize-y"
                  />
                  <div className="flex items-center justify-between text-[11px] text-blue-300/60">
                    <span>Both paste and drop inputs route through the same unified parser.</span>
                    <span>{pastedText.length} characters</span>
                  </div>
                </div>
              )}

              {/* Option 2: Drag and Drop Upload */}
              {activeInputTab === "upload" && (
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3",
                      dragOver
                        ? "border-[#F5B544] bg-[#F5B544]/10"
                        : "border-[#144E8A] bg-[#051429]/80 hover:border-blue-400/60 hover:bg-[#071C3C]"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.text"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-[#092244] border border-[#175294] text-[#F5B544] flex items-center justify-center">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {uploadedFileName ? uploadedFileName : "Drop Advocate Ready .txt file here"}
                      </p>
                      <p className="text-xs text-blue-300/70 mt-1">
                        Drag and drop your file or click to browse
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs border-[#144E8A] bg-[#092244] text-blue-200 hover:text-white"
                    >
                      Choose File
                    </Button>
                  </div>

                  {uploadedFileName && pastedText && (
                    <div className="p-3 rounded-xl bg-[#06172E] border border-[#144E8A] text-xs text-blue-200/80 max-h-32 overflow-y-auto font-mono">
                      <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Loaded file: {uploadedFileName} ({pastedText.length} chars)
                      </div>
                      <p className="line-clamp-3">{pastedText.slice(0, 300)}...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STAGE 2: PREVIEW & REVIEW */}
          {parseStage === "preview" && (
            <div className="space-y-5">
              {/* Destination & Meta Context Bar */}
              <div className="p-3.5 rounded-xl bg-[#061B35] border border-[#103E70] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-blue-200">
                    <User className="h-4 w-4 text-[#F5B544]" />
                    <span>Student: <strong className="text-white">{parseMeta.studentName}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <Badge variant="outline" className={cn(
                      "text-[11px]",
                      parseMeta.isUnassignedDraft
                        ? "border-amber-500/50 bg-amber-950/40 text-amber-300 font-semibold"
                        : "border-blue-500/50 bg-blue-950/40 text-blue-300"
                    )}>
                      {parseMeta.meetingTitle}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-emerald-400" />
                    <Badge className="bg-[#0E427B] text-[#F5B544] border border-[#2368B2] text-[11px] font-bold">
                      {includedCount} targets parsed
                    </Badge>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddNewTarget}
                  className="text-xs h-7 border-[#144E8A] bg-[#092244] text-blue-200 hover:text-white gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3 text-[#F5B544]" />
                  Add Target
                </Button>
              </div>

              {/* Duplicate Warning Alert */}
              {parseMeta.isDuplicate && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 block font-bold">Matching Targets Already Exist</strong>
                    <span>
                      {parseMeta.studentName}'s workspace already has {parseMeta.existingDraftCount} targets with matching IDs. Saving as draft will update the existing draft without creating duplicate student records or fake meetings.
                    </span>
                  </div>
                </div>
              )}

              {/* Validation Errors / Alerts */}
              {parseMeta.validationErrors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>Validation Warnings ({parseMeta.validationErrors.length})</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-100 text-[11px]">
                    {parseMeta.validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Order Selection Choice */}
              {currentDetectedOrder.length > 0 && importedOrder.length > 0 && (
                <div className="p-3 rounded-xl bg-[#06172E] border border-[#103E70] text-xs space-y-2">
                  <span className="font-semibold text-blue-200 uppercase tracking-wider text-[11px] block">
                    Order Using:
                  </span>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input
                        type="radio"
                        name="orderChoice"
                        value="current_iep"
                        checked={orderChoice === "current_iep"}
                        onChange={() => setOrderChoice("current_iep")}
                        className="text-amber-400 focus:ring-amber-400"
                      />
                      <span>Current Detected IEP Order ({currentDetectedOrder.length} sections)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input
                        type="radio"
                        name="orderChoice"
                        value="imported"
                        checked={orderChoice === "imported"}
                        onChange={() => setOrderChoice("imported")}
                        className="text-amber-400 focus:ring-amber-400"
                      />
                      <span>Imported Document Order ({importedOrder.length} sections)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Parsed Targets List */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {parsedTargets.map((target, idx) => {
                  const isEditing = editingTargetId === target.id;

                  return (
                    <div
                      key={target.id}
                      className={cn(
                        "rounded-xl p-4 transition-all border",
                        target.included
                          ? target.needsReview
                            ? "bg-[#091F38] border-amber-500/50 shadow-md"
                            : "bg-[#071C38] border-[#103E70]"
                          : "bg-[#040E1C] border-[#0A264D]/50 opacity-60"
                      )}
                    >
                      {isEditing ? (
                        /* Inline Edit Form */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 border-b border-[#144E8A] pb-2">
                            <span className="text-xs font-bold text-[#F5B544]">
                              Edit Target #{idx + 1} ({target.externalTargetId || target.id})
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTargetId(null)}
                                className="text-xs h-7 text-blue-300 hover:text-white"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(target.id)}
                                className="text-xs h-7 bg-[#F5B544] text-slate-950 font-bold hover:bg-[#F5B544]/90"
                              >
                                Save Changes
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-blue-200">Target Name</label>
                              <Input
                                value={editForm.targetName || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, targetName: e.target.value })
                                }
                                className="bg-[#051429] border-[#144E8A] text-xs h-8 text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-blue-200">IEP Section</label>
                              <Input
                                value={editForm.iepSection || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, iepSection: e.target.value })
                                }
                                className="bg-[#051429] border-[#144E8A] text-xs h-8 text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-[#F5B544]">
                              Advocate Say This (One Clear Sentence)
                            </label>
                            <Input
                              value={editForm.quickAdvocateSayThis || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, quickAdvocateSayThis: e.target.value })
                              }
                              className="bg-[#051429] border-[#144E8A] text-xs h-8 text-amber-100 font-medium"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-blue-200">
                              Put It Here (IEP Location)
                            </label>
                            <Input
                              value={editForm.putItHereLocation || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, putItHereLocation: e.target.value })
                              }
                              className="bg-[#051429] border-[#144E8A] text-xs h-8 text-blue-100"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-blue-200">Why We Want It</label>
                              <Textarea
                                value={editForm.whyWeWantIt || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, whyWeWantIt: e.target.value })
                                }
                                rows={2}
                                className="bg-[#051429] border-[#144E8A] text-xs text-blue-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-blue-200">If Team Disagrees</label>
                              <Textarea
                                value={editForm.ifTeamDisagrees || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, ifTeamDisagrees: e.target.value })
                                }
                                rows={2}
                                className="bg-[#051429] border-[#144E8A] text-xs text-rose-100"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Target Preview Card */
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Checkbox
                                checked={target.included}
                                onCheckedChange={() => handleToggleInclude(target.id)}
                                className="mt-1 border-[#144E8A] data-[state=checked]:bg-[#F5B544] data-[state=checked]:text-slate-950"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {target.externalTargetId && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#092244] border border-[#175294] text-[#F5B544] font-bold">
                                      {target.externalTargetId}
                                    </span>
                                  )}
                                  <span className="text-xs font-bold text-white tracking-wide">
                                    {target.targetName}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="border-[#144E8A] bg-[#051429] text-blue-300 text-[10px] py-0"
                                  >
                                    {target.iepSection}
                                  </Badge>
                                  {target.needsReview && (
                                    <Badge className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-[10px] py-0 gap-1">
                                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                                      {target.reviewReason || "Review Needed"}
                                    </Badge>
                                  )}
                                </div>

                                <p className="text-xs text-amber-100/90 italic mt-1 leading-relaxed">
                                  🗣 "{target.quickAdvocateSayThis}"
                                </p>

                                {target.putItHereLocation && (
                                  <p className="text-[11px] text-blue-300/70 mt-1">
                                    <strong className="text-blue-200 font-semibold">Location:</strong>{" "}
                                    {target.putItHereLocation}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartEdit(target)}
                                className="text-xs h-7 text-blue-300 hover:text-white hover:bg-white/[0.06] p-1.5 cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleInclude(target.id)}
                                className="text-xs h-7 text-blue-300 hover:text-white hover:bg-white/[0.06] p-1.5 cursor-pointer"
                              >
                                {target.included ? (
                                  <XCircle className="h-3.5 w-3.5 text-slate-400 hover:text-rose-400" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Extracted Additional Notes (Before We Close) */}
              {parsedAdditionalNotes.length > 0 && (
                <div className="p-3 rounded-xl bg-[#06172E] border border-[#103E70] text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#F5B544] font-bold">
                    <span>🚦 Before We Close Notes</span>
                    <Badge variant="outline" className="text-[10px] text-blue-300 border-[#144E8A]">
                      Meeting Note Area ({parsedAdditionalNotes.length} notes)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-blue-200/70">
                    Extracted as meeting notes (not parsed as target records):
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-blue-100 space-y-0.5">
                    {parsedAdditionalNotes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STAGE 3: CONFLICT / SAFETY RESOLUTION */}
          {parseStage === "conflict" && (
            <div className="space-y-5 p-4 rounded-2xl bg-[#06172E] border border-amber-500/40 text-center max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-[#F5B544] flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  Blueprint Already Contains Targets
                </h3>
                <p className="text-xs text-blue-200/80 max-w-md mx-auto leading-relaxed">
                  Your meeting workspace currently has <strong className="text-white">{existingTargetsCount} existing targets</strong>. How would you like to apply the <strong className="text-white">{includedCount} imported targets</strong>?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => handleConfirmImport("append")}
                  disabled={saveDraftMutation.isPending}
                  className="bg-[#0E427B] hover:bg-[#13599E] text-white text-xs font-bold border border-[#2368B2] h-10 cursor-pointer"
                >
                  Append New Targets
                </Button>
                <Button
                  onClick={() => handleConfirmImport("replace")}
                  disabled={saveDraftMutation.isPending}
                  variant="outline"
                  className="border-rose-500/50 text-rose-300 hover:bg-rose-950/50 text-xs font-semibold h-10 cursor-pointer"
                >
                  Replace Existing Draft
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParseStage("preview")}
                className="text-xs text-blue-300 hover:text-white"
              >
                ← Back to Target Review
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#0F3D70] bg-[#000820] flex items-center justify-between gap-3">
          {parseStage === "input" && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-blue-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleParse}
                disabled={parseMutation.isPending || !pastedText.trim()}
                className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold text-xs gap-2 cursor-pointer shadow-lg"
              >
                {parseMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Parsing Targets...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    ✨ Parse Into Meeting Targets
                  </>
                )}
              </Button>
            </>
          )}

          {parseStage === "preview" && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setParseStage("input")}
                className="text-xs text-blue-300 hover:text-white"
              >
                ← Re-enter Text
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSaveDraft("replace")}
                  disabled={saveDraftMutation.isPending || includedCount === 0}
                  className="border-[#144E8A] bg-[#0A2B52] hover:bg-[#0E3D75] text-blue-200 hover:text-white text-xs font-bold gap-1.5 cursor-pointer"
                >
                  {saveDraftMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 text-[#F5B544]" />
                  )}
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={handleProceedClick}
                  disabled={saveDraftMutation.isPending || includedCount === 0}
                  className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold text-xs gap-1.5 cursor-pointer shadow-lg"
                >
                  <Check className="h-3.5 w-3.5 font-bold" />
                  ✓ Add {includedCount} Targets to Blueprint
                </Button>
              </div>
            </>
          )}

          {parseStage === "conflict" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-blue-300 hover:text-white mx-auto"
            >
              Cancel Import
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
