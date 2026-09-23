import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  ArrowRight,
  Loader2,
  Trash2,
  Layers,
  HelpCircle,
  Check,
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
  const [orderChoice, setOrderChoice] = useState<"current_iep" | "imported">(
    currentDetectedOrder.length > 0 ? "current_iep" : "imported"
  );

  // Edit single target inside preview
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdvocateReadyImportItem>>({});

  const parseMutation = trpc.meetingWorkspace.parseAdvocateReadyImport.useMutation({
    onSuccess: (data) => {
      setParsedTargets(data.targets as AdvocateReadyImportItem[]);
      if (data.detectedOrder && data.detectedOrder.length > 0) {
        setImportedOrder(data.detectedOrder);
      }
      setParseStage("preview");
      const reviewCount = data.targets.filter((t: any) => t.needsReview).length;
      if (reviewCount > 0) {
        toast.info(`Parsed ${data.targets.length} targets · ${reviewCount} need review`);
      } else {
        toast.success(`Parsed ${data.targets.length} targets successfully`);
      }
    },
    onError: (err) => {
      toast.error(`Parse failed: ${err.message}`);
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

    onImportTargets(includedTargets, mode, finalOrder);
    onClose();
    resetModal();
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
                Optional Fast Track
              </Badge>
              <span className="text-xs text-blue-300/70">Manual Advocate Ready Import</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white tracking-wide">
              📥 Import Advocate Ready
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/80 leading-relaxed">
              Paste or drop an existing Advocate Ready document and Waypoint will convert it into editable meeting targets for <strong className="text-white">{studentName}</strong>.
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
                  Drop File
                </button>
              </div>

              {/* Option 1: Paste Text Area */}
              {activeInputTab === "paste" && (
                <div className="space-y-2">
                  <Textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste Advocate Ready content here (from ChatGPT, Word, Google Docs, or meeting strategy notes)...

Example:
TARGET: Noise Support
IEP Section: Accommodations
Say This: We're requesting access to noise-canceling headphones during assemblies and loud transitions.
Put It Here: Classroom Accommodations
Why: Sensory regulation in Least Restrictive Environment."
                    rows={12}
                    className="w-full bg-[#051429] border border-[#144E8A] text-blue-100 placeholder:text-blue-300/40 text-xs font-mono rounded-xl p-4 focus:ring-1 focus:ring-[#F5B544] focus:border-[#F5B544] leading-relaxed resize-y"
                  />
                  <div className="flex items-center justify-between text-[11px] text-blue-300/60">
                    <span>Waypoint AI will convert each request into a structured target.</span>
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
                      accept=".txt,.md,.doc,.docx,.pdf"
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
                        {uploadedFileName ? uploadedFileName : "Drop Advocate Ready document here"}
                      </p>
                      <p className="text-xs text-blue-300/70 mt-1">
                        Supports text, markdown, or export files · Click to browse files
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
                        Ready to parse: {uploadedFileName}
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
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#061B35] border border-[#103E70]">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#0E427B] text-[#F5B544] border border-[#2368B2] text-xs font-bold">
                    {includedCount} targets selected
                  </Badge>
                  {reviewCount > 0 ? (
                    <Badge variant="outline" className="border-amber-500/50 bg-amber-950/40 text-amber-300 text-xs gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      {reviewCount} need review
                    </Badge>
                  ) : (
                    <span className="text-xs text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      All targets structured
                    </span>
                  )}
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

              {/* Order Selection Choice */}
              {currentDetectedOrder.length > 0 && importedOrder.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#06172E] border border-[#103E70] text-xs space-y-2">
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
                      <span>Imported Document Order</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Parsed Targets List */}
              <div className="space-y-3">
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
                              Edit Target #{idx + 1}
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
                  className="bg-[#0E427B] hover:bg-[#13599E] text-white text-xs font-bold border border-[#2368B2] h-10 cursor-pointer"
                >
                  Append New Targets
                </Button>
                <Button
                  onClick={() => handleConfirmImport("replace")}
                  variant="outline"
                  className="border-rose-500/50 text-rose-300 hover:bg-rose-950/50 text-xs font-semibold h-10 cursor-pointer"
                >
                  Replace Existing Blueprint
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
              <Button
                type="button"
                onClick={handleProceedClick}
                disabled={includedCount === 0}
                className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold text-xs gap-1.5 cursor-pointer shadow-lg"
              >
                <Check className="h-3.5 w-3.5 font-bold" />
                ✓ Add {includedCount} Targets to Blueprint
              </Button>
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
