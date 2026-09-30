import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  FileText,
  Calendar,
  Building,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Cpu,
  Layers,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AiDocumentAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number | null;
  fileName?: string;
}

export function AiDocumentAnalysisModal({
  isOpen,
  onClose,
  fileId,
  fileName,
}: AiDocumentAnalysisModalProps) {
  const utils = trpc.useUtils();

  const { data: analysisData, isLoading, refetch } = trpc.clientFiles.getAnalysis.useQuery(
    { fileId: fileId! },
    { enabled: isOpen && !!fileId }
  );

  const reprocessMutation = trpc.clientFiles.processDocument.useMutation({
    onSuccess: () => {
      toast.success("Document re-analyzed with latest AI intelligence!");
      refetch();
      utils.clientFiles.getCurrentIep.invalidate();
    },
    onError: (err) => {
      toast.error(`Re-analysis failed: ${err.message}`);
    },
  });

  if (!isOpen) return null;

  const data = analysisData?.structuredData || analysisData;
  const isNeedsReview = data?.documentTypeNeedsReview || data?.iepDateNeedsReview;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                Document Reading & AI Intelligence
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Structured legal & IEP facts extracted via Cloudflare Workers AI + Deterministic CRM Comparison
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-teal-400 animate-spin mx-auto opacity-75" />
            <p className="text-sm text-muted-foreground">Retrieving structured document analysis...</p>
          </div>
        ) : !data ? (
          <div className="py-8 text-center space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No Analysis Found Yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              This document has not yet been processed through the Document Intelligence pipeline.
            </p>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-500 text-white gap-2"
              disabled={reprocessMutation.isPending}
              onClick={() => fileId && reprocessMutation.mutate({ fileId, forceReprocess: true })}
            >
              <Sparkles className="h-4 w-4" />
              Run Document Analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Uncertainty Banner if flagged */}
            {isNeedsReview && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-amber-200">Human Verification Recommended</p>
                  <p className="text-amber-200/80">
                    {data.uncertaintyReason ||
                      "The AI flagged ambiguous dates or document classifications that require advocate review."}
                  </p>
                </div>
              </div>
            )}

            {/* Document Header Metadata */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Filename</span>
                <span className="font-semibold text-foreground truncate block">{fileName || "Document"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Pipeline Status</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Text Extracted {analysisData?.ocrRan ? "(OCR Fallback)" : "(Native PDF)"}
                </span>
              </div>
            </div>

            {/* Structured Facts */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Extracted IEP & Case Attributes
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border/50 bg-card/60">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="h-3 w-3 text-teal-400" />
                    Document Type
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1">{data.documentType || "Unknown"}</p>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-card/60">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-teal-400" />
                    Meeting / Effective Date
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {data.iepMeetingDate || data.amendmentDate || data.effectiveDate || "Not Specified"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-card/60">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <GraduationCap className="h-3 w-3 text-teal-400" />
                    School Year
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1">{data.schoolYear || "Current"}</p>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-card/60">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Building className="h-3 w-3 text-teal-400" />
                    School / District
                  </span>
                  <p className="text-xs font-semibold text-foreground mt-1 truncate">
                    {data.school || data.district || "Not explicit"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-card/60">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Layers className="h-3 w-3 text-teal-400" />
                    Base IEP Reference
                  </span>
                  <p className="text-xs font-semibold text-foreground mt-1">
                    {data.baseIepDate ? `Amends ${data.baseIepDate}` : "N/A (Primary IEP)"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-card/60">
                  <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Cpu className="h-3 w-3 text-teal-400" />
                    CRM Decision
                  </span>
                  <Badge variant="outline" className="text-[10px] mt-1 bg-teal-500/10 text-teal-300 border-teal-500/20">
                    {analysisData?.comparisonOutcome || "Processed"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Extracted Summary */}
            {data.summary && (
              <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Executive Summary
                </span>
                <p className="text-xs text-foreground/90 leading-relaxed">{data.summary}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-border gap-1.5"
            disabled={reprocessMutation.isPending || !fileId}
            onClick={() => fileId && reprocessMutation.mutate({ fileId, forceReprocess: true })}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reprocessMutation.isPending ? "animate-spin" : ""}`} />
            Re-Analyze with AI
          </Button>

          <Button size="sm" onClick={onClose} className="text-xs bg-muted hover:bg-muted/80 text-foreground">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
