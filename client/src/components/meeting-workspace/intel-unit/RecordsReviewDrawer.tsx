import React, { useRef, useState } from "react";
import {
  FileText,
  Upload,
  Check,
  X,
  Star,
  FolderOpen,
  Calendar,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type VaultDocumentOption,
  type RecordReviewGroup,
  resolveClientRecordGroup,
  formatShortFileName,
} from "./intelUnitTypes";

interface RecordsReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  vaultDocuments: VaultDocumentOption[];
  vaultLoading: boolean;
  selectedDocId: number | null;
  designatedCurrentIepId: number | null;
  recordGroupOverrides?: Record<number, RecordReviewGroup>;
  onSelectDocument: (docId: number) => void;
  onAssignRecordGroup: (docId: number, group: RecordReviewGroup) => void;
  onUploadVaultFile: (params: {
    file: File;
    targetGroup: RecordReviewGroup;
    documentDate?: string;
  }) => Promise<void>;
  isUploadingVault: boolean;
  localPdfName: string | null;
  localPdfPageCount: number;
  hasLocalPdfBuffer: boolean;
  onOpenLocalPdfPicker: () => void;
  onSaveLocalPdfToVault: (targetGroup: RecordReviewGroup) => Promise<void>;
  onClearLocalPdf: () => void;
}

const GROUP_LABELS: Record<RecordReviewGroup, string> = {
  current_iep: "Current IEP",
  school_evaluation: "School evaluation",
  outside_evaluation: "Outside evaluation",
  historical_iep: "Prior / Historical IEP",
};

export function RecordsReviewDrawer({
  isOpen,
  onClose,
  studentName,
  vaultDocuments,
  vaultLoading,
  selectedDocId,
  designatedCurrentIepId,
  recordGroupOverrides,
  onSelectDocument,
  onAssignRecordGroup,
  onUploadVaultFile,
  isUploadingVault,
  localPdfName,
  localPdfPageCount,
  hasLocalPdfBuffer,
  onOpenLocalPdfPicker,
  onSaveLocalPdfToVault,
  onClearLocalPdf,
}: RecordsReviewDrawerProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTargetGroup, setUploadTargetGroup] =
    useState<RecordReviewGroup>("school_evaluation");
  const [showHistoricalIeps, setShowHistoricalIeps] = useState<boolean>(false);
  const [editingGroupDocId, setEditingGroupDocId] = useState<number | null>(
    null
  );

  if (!isOpen) return null;

  // Partition vault documents into the 3 primary groups + historical IEPs
  const currentIepDocs: VaultDocumentOption[] = [];
  const schoolEvalDocs: VaultDocumentOption[] = [];
  const outsideEvalDocs: VaultDocumentOption[] = [];
  const historicalIepDocs: VaultDocumentOption[] = [];

  for (const doc of vaultDocuments) {
    const grp =
      doc.id === designatedCurrentIepId
        ? "current_iep"
        : resolveClientRecordGroup(doc, recordGroupOverrides);

    if (grp === "current_iep") {
      if (currentIepDocs.length === 0 || doc.id === designatedCurrentIepId) {
        currentIepDocs.unshift(doc);
      } else {
        historicalIepDocs.push(doc);
      }
    } else if (grp === "school_evaluation") {
      schoolEvalDocs.push(doc);
    } else if (grp === "outside_evaluation") {
      outsideEvalDocs.push(doc);
    } else {
      historicalIepDocs.push(doc);
    }
  }

  // Ensure only 1 primary designated Current IEP is in currentIepDocs; any others move to historicalIepDocs
  if (currentIepDocs.length > 1) {
    const extras = currentIepDocs.splice(1);
    historicalIepDocs.unshift(...extras);
  }

  const handleUploadFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUploadVaultFile({
      file,
      targetGroup: uploadTargetGroup,
    });
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  };

  const renderRecordRow = (
    doc: VaultDocumentOption,
    effectiveGroup: RecordReviewGroup
  ) => {
    const isSelected = !localPdfName && selectedDocId === doc.id;
    const isDesignatedCurrent = doc.id === designatedCurrentIepId;
    const isEditingCat = editingGroupDocId === doc.id;

    return (
      <div
        key={doc.id}
        data-testid={`records-drawer-item-${doc.id}`}
        className={cn(
          "rounded-lg border px-3 py-2.5 transition-all",
          isSelected
            ? "bg-[#09193A] border-[#C5A059]/70 shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
            : "bg-[#020A1E]/90 border-[#1A2B4C]/70 hover:bg-[#06132E] hover:border-[#2E4878]"
        )}
      >
        <div className="flex items-start justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              onSelectDocument(doc.id);
              onClose();
            }}
            className="flex-1 min-w-0 text-left flex items-start gap-2.5 cursor-pointer group"
          >
            <div
              className={cn(
                "mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0 border",
                isSelected
                  ? "bg-[#C5A059]/20 border-[#C5A059]/60 text-[#FFE394]"
                  : "bg-[#041028] border-[#1E335C] text-[#93AECD] group-hover:text-[#FFF4D4]"
              )}
            >
              {isSelected ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={cn(
                    "text-xs font-medium truncate",
                    isSelected
                      ? "text-[#FFF4D4] font-semibold"
                      : "text-[#E2ECF8] group-hover:text-white"
                  )}
                  title={doc.fileName}
                >
                  {formatShortFileName(doc.fileName, 36)}
                </span>

                {isDesignatedCurrent && (
                  <Badge className="bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 text-[9.5px] px-1.5 py-0 font-semibold">
                    <Star className="h-2.5 w-2.5 mr-0.5 fill-[#FFE394]" />
                    Current IEP
                  </Badge>
                )}

                {isSelected && (
                  <Badge className="bg-[#132C58] text-[#B8D4FF] border border-[#3B66A8]/60 text-[9.5px] px-1.5 py-0">
                    Open
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2.5 mt-1 text-[10.5px] text-[#8EA6C9]">
                {doc.documentDate ? (
                  <span className="inline-flex items-center gap-1 text-[#C6B697]">
                    <Calendar className="h-2.5 w-2.5 text-[#C5A059]" />
                    <span>{doc.documentDate}</span>
                  </span>
                ) : (
                  <span className="text-[#6E86AB]">Date not specified</span>
                )}
                <span>·</span>
                <span>{GROUP_LABELS[effectiveGroup]}</span>
              </div>
            </div>
          </button>

          {/* Category / Current IEP Reassignment Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingGroupDocId(isEditingCat ? null : doc.id);
            }}
            data-testid={`records-drawer-cat-btn-${doc.id}`}
            className="text-[10.5px] text-[#8EA6C9] hover:text-[#FFE394] px-2 py-1 rounded bg-[#030D24] border border-[#1B2E52] hover:border-[#C5A059]/50 cursor-pointer shrink-0 inline-flex items-center gap-1"
            title="Assign or correct document category or designate as Current IEP"
          >
            <span>Category</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Inline Category Reassignment Selector */}
        {isEditingCat && (
          <div className="mt-2.5 pt-2 border-t border-[#1A2B4C] flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[10.5px] text-[#93AECD]">
              Move or designate as:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  "current_iep",
                  "school_evaluation",
                  "outside_evaluation",
                  "historical_iep",
                ] as RecordReviewGroup[]
              ).map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => {
                    onAssignRecordGroup(doc.id, grp);
                    setEditingGroupDocId(null);
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition-colors",
                    effectiveGroup === grp
                      ? "bg-[#C5A059]/25 border-[#C5A059] text-[#FFE394]"
                      : "bg-[#010716] border-[#1F345C] text-[#B0C7E8] hover:border-[#C5A059]/50 hover:text-white"
                  )}
                >
                  {GROUP_LABELS[grp]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="records-review-drawer"
      className="fixed inset-0 z-50 flex items-start justify-start sm:justify-center pt-16 sm:pt-20 px-3 sm:px-6 bg-black/65 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#000820] border border-[#243B67] shadow-[0_24px_64px_rgba(0,0,0,0.92)] overflow-hidden text-[#F7F2E8]"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={uploadInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleUploadFileSelected}
          className="hidden"
          aria-label="Upload PDF record to Student Vault"
        />

        {/* Drawer Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#020B26] via-[#061538] to-[#020B26] border-b border-[#1D3158] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-[#071838] border border-[#C5A059]/45 flex items-center justify-center shrink-0">
              <FolderOpen className="h-4 w-4 text-[#DFBE77]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-serif font-bold text-[#FFF4D4] truncate">
                Student Records · {studentName}
              </h3>
              <p className="text-[11px] text-[#93AECD]">
                Select a record to read, assign categories, or upload to the Document Vault.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#93AECD] hover:text-white hover:bg-white/5 cursor-pointer"
            aria-label="Close Records drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5">
          {/* Temporary Local PDF Notice (if active) */}
          {localPdfName && (
            <div className="rounded-xl bg-[#0B1936] border border-[#C5A059]/60 p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#FFE394] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-[#FFF4D4]">
                      Temporary Local File Open: {formatShortFileName(localPdfName, 36)}
                    </div>
                    <p className="text-[11px] text-[#B0C7E8] mt-0.5">
                      {localPdfPageCount} pages loaded in browser memory only. Save to {studentName}&apos;s Vault to keep it with case records.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClearLocalPdf}
                  className="text-[11px] text-[#93AECD] hover:text-white underline cursor-pointer shrink-0"
                >
                  Close Temp File
                </button>
              </div>

              {hasLocalPdfBuffer && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#C6B697]">
                    Save to Student Vault as:
                  </span>
                  {(
                    [
                      "current_iep",
                      "school_evaluation",
                      "outside_evaluation",
                    ] as RecordReviewGroup[]
                  ).map((grp) => (
                    <Button
                      key={grp}
                      type="button"
                      size="sm"
                      disabled={isUploadingVault}
                      onClick={() => onSaveLocalPdfToVault(grp)}
                      className="h-7 px-2.5 text-[11px] bg-[#04112B] hover:bg-[#0A214A] text-[#FFE394] border border-[#C5A059]/50 cursor-pointer gap-1"
                    >
                      <Save className="h-3 w-3" />
                      <span>{GROUP_LABELS[grp]}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {vaultLoading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-[#93AECD]">
              <Loader2 className="h-4 w-4 animate-spin text-[#DFBE77]" />
              <span>Loading records from Student Vault...</span>
            </div>
          ) : (
            <>
              {/* GROUP 1: CURRENT IEP */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
                    1. Current IEP
                  </h4>
                  <span className="text-[10.5px] text-[#8EA6C9]">
                    Designated active plan for comparison
                  </span>
                </div>

                {currentIepDocs.length > 0 ? (
                  <div className="space-y-2">
                    {currentIepDocs.map((doc) =>
                      renderRecordRow(doc, "current_iep")
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#02091C] border border-[#182949] px-3.5 py-3 text-xs text-[#8EA6C9]">
                    No Current IEP designated yet. Upload an IEP below or assign an existing record as Current IEP.
                  </div>
                )}

                {historicalIepDocs.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowHistoricalIeps((v) => !v)}
                      className="text-[11px] text-[#93AECD] hover:text-[#FFF4D4] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform",
                          showHistoricalIeps && "rotate-180"
                        )}
                      />
                      <span>
                        Prior / Historical IEPs ({historicalIepDocs.length} preserved)
                      </span>
                    </button>
                    {showHistoricalIeps && (
                      <div className="mt-2 space-y-2 pl-2 border-l border-[#1E335C]">
                        {historicalIepDocs.map((doc) =>
                          renderRecordRow(doc, "historical_iep")
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* GROUP 2: SCHOOL EVALUATIONS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#E2ECF8]">
                    2. School Evaluations ({schoolEvalDocs.length})
                  </h4>
                  <span className="text-[10.5px] text-[#8EA6C9]">
                    Psychoeducational, FBA, Speech, OT, Reevaluations
                  </span>
                </div>

                {schoolEvalDocs.length > 0 ? (
                  <div className="space-y-2">
                    {schoolEvalDocs.map((doc) =>
                      renderRecordRow(doc, "school_evaluation")
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#02091C] border border-[#182949] px-3.5 py-2.5 text-xs text-[#8EA6C9]">
                    No school evaluations in Vault yet.
                  </div>
                )}
              </div>

              {/* GROUP 3: OUTSIDE EVALUATIONS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#E2ECF8]">
                    3. Outside Evaluations ({outsideEvalDocs.length})
                  </h4>
                  <span className="text-[10.5px] text-[#8EA6C9]">
                    Independent (IEE), Neuropsych, Clinical & Private Assessments
                  </span>
                </div>

                {outsideEvalDocs.length > 0 ? (
                  <div className="space-y-2">
                    {outsideEvalDocs.map((doc) =>
                      renderRecordRow(doc, "outside_evaluation")
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#02091C] border border-[#182949] px-3.5 py-2.5 text-xs text-[#8EA6C9]">
                    No outside evaluations in Vault yet.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer: Upload Additional Records to Vault or Open Temp Local File */}
        <div className="px-5 py-3.5 bg-[#02091E] border-t border-[#1D3158] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={uploadTargetGroup}
              onChange={(e) =>
                setUploadTargetGroup(e.target.value as RecordReviewGroup)
              }
              aria-label="Upload record category"
              className="h-8 rounded-lg bg-[#000820] border border-[#243B67] px-2.5 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
            >
              <option value="current_iep">Upload as: Current IEP</option>
              <option value="school_evaluation">
                Upload as: School evaluation
              </option>
              <option value="outside_evaluation">
                Upload as: Outside evaluation
              </option>
            </select>

            <Button
              type="button"
              size="sm"
              disabled={isUploadingVault}
              onClick={() => uploadInputRef.current?.click()}
              data-testid="records-drawer-upload-vault-btn"
              className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/40 cursor-pointer gap-1.5"
            >
              {isUploadingVault ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading to Vault...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload to Vault</span>
                </>
              )}
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onOpenLocalPdfPicker();
            }}
            className="h-8 px-3 text-xs bg-[#000820] border-[#243B67] text-[#B0C7E8] hover:text-[#FFF4D4] hover:border-[#C5A059]/50 cursor-pointer"
            title="Inspect a temporary local PDF without saving to Vault yet"
          >
            Open Temp Local PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

