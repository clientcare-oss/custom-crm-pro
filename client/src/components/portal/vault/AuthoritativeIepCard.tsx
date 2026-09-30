import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  ExternalLink,
  Clock,
  Sparkles,
  Link as LinkIcon,
  ChevronRight,
  Eye,
  Check,
  X,
  History,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AuthoritativeIepCardProps {
  studentId?: number;
  clientId?: number;
  isLight?: boolean;
  onViewDocument?: (fileUrl: string) => void;
  onOpenAnalysis?: (fileId: number) => void;
  canConfirm?: boolean; // True for admin/advocate, or authenticated parent
}

export function AuthoritativeIepCard({
  studentId,
  clientId,
  isLight = false,
  onViewDocument,
  onOpenAnalysis,
  canConfirm = true,
}: AuthoritativeIepCardProps) {
  const utils = trpc.useUtils();

  const { data: iepData, isLoading } = trpc.clientFiles.getCurrentIep.useQuery(
    { studentId, clientId },
    { enabled: !!studentId || !!clientId }
  );

  const confirmMutation = trpc.clientFiles.confirmCurrentIep.useMutation({
    onSuccess: (data) => {
      toast.success(`Current IEP marked as ${data.confirmationStatus}!`);
      utils.clientFiles.getCurrentIep.invalidate();
      utils.clientFiles.listForAdmin.invalidate();
    },
    onError: (err) => {
      toast.error(`Confirmation failed: ${err.message}`);
    },
  });

  const dismissMutation = trpc.clientFiles.dismissPossibleNewIep.useMutation({
    onSuccess: () => {
      toast.info("Candidate dismissed. Existing Current IEP retained.");
      utils.clientFiles.getCurrentIep.invalidate();
      utils.clientFiles.listForAdmin.invalidate();
    },
    onError: (err) => {
      toast.error(`Dismiss failed: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-border/50 bg-card/40 animate-pulse flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-teal-500 animate-spin" />
        <span className="text-sm text-muted-foreground">Checking authoritative Current IEP status...</span>
      </div>
    );
  }

  const family = iepData?.currentFamily;
  const baseDoc = iepData?.baseIepDocument;
  const latestDoc = iepData?.latestVersionDocument;
  const pendingDoc = iepData?.pendingReviewDocument;
  const history = iepData?.versionHistory || [];

  if (!family && !pendingDoc) {
    return (
      <Card className="p-4 border-dashed border-border/60 bg-muted/20 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">No Current IEP Assigned Yet</p>
            <p className="text-xs text-muted-foreground">
              Upload the student's IEP to establish the authoritative Current IEP and automatically link future amendments.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const isConfirmed =
    family?.confirmationStatus === "Waypoint Confirmed" || family?.confirmationStatus === "Parent Confirmed";

  return (
    <div className="space-y-3">
      {/* 1. POSSIBLE NEWER IEP DETECTED ALERT BANNER */}
      {pendingDoc && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-amber-200">Possible Newer IEP Detected</h4>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30">
                    Needs Human Review
                  </Badge>
                </div>
                <p className="text-xs text-amber-200/80 mt-1">
                  A newer document was uploaded: <span className="font-semibold">{pendingDoc.fileName}</span> (Dated{" "}
                  {pendingDoc.documentDate || family?.pendingReviewDate || "Unknown"}). Per Waypoint Safety Rules,
                  existing confirmed IEPs are never silently overwritten.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1"
                    disabled={confirmMutation.isPending}
                    onClick={() =>
                      confirmMutation.mutate({
                        familyId: family?.id,
                        fileId: pendingDoc.id,
                        studentId,
                        confirmationStatus: "Waypoint Confirmed",
                      })
                    }
                  >
                    <Check className="h-3.5 w-3.5" />
                    Confirm as New Current IEP
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20 gap-1"
                    disabled={dismissMutation.isPending}
                    onClick={() =>
                      dismissMutation.mutate({
                        familyId: family.id,
                        fileId: pendingDoc.id,
                        studentId,
                      })
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                    Keep Existing & Dismiss
                  </Button>
                  {pendingDoc.fileUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => onViewDocument?.(pendingDoc.fileUrl)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Upload
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. AUTHORITATIVE CURRENT IEP CARD */}
      {family && (
        <Card className="relative overflow-hidden border border-teal-500/30 bg-gradient-to-br from-card via-card to-teal-950/20 shadow-sm rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 mt-0.5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-teal-400">
                    Authoritative Current IEP
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-medium px-2 py-0.5 ${
                      family.confirmationStatus === "Waypoint Confirmed"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : family.confirmationStatus === "Parent Confirmed"
                        ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {family.confirmationStatus === "Waypoint Confirmed" && "🛡️ Waypoint Confirmed"}
                    {family.confirmationStatus === "Parent Confirmed" && "👪 Parent Confirmed"}
                    {family.confirmationStatus === "System Identified" && "⚙️ System Identified"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                    {family.schoolYear || "Current Year"}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-foreground mt-1">
                  {latestDoc?.fileName || baseDoc?.fileName || "Active IEP Record"}
                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-teal-400" />
                    <span>Effective: {family.latestVersionDate || family.baseIepDate || "Recorded"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <LinkIcon className="h-3.5 w-3.5 text-teal-400" />
                    <span>Governing Type: {family.latestVersionType || "Annual IEP"}</span>
                  </div>
                  {history.length > 1 && (
                    <div className="flex items-center gap-1 text-teal-300">
                      <History className="h-3.5 w-3.5" />
                      <span>{history.length} Connected Versions (Base + Amendments)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-end md:self-center">
              {!isConfirmed && canConfirm && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-teal-500/40 text-teal-300 hover:bg-teal-500/10 gap-1.5"
                  disabled={confirmMutation.isPending}
                  onClick={() =>
                    confirmMutation.mutate({
                      familyId: family.id,
                      fileId: latestDoc?.id || baseDoc?.id || 0,
                      studentId,
                      confirmationStatus: "Waypoint Confirmed",
                    })
                  }
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirm Status
                </Button>
              )}

              {(latestDoc?.fileUrl || baseDoc?.fileUrl) && (
                <Button
                  size="sm"
                  className="h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white gap-1.5"
                  onClick={() => onViewDocument?.(latestDoc?.fileUrl || baseDoc?.fileUrl)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  View IEP
                </Button>
              )}

              {onOpenAnalysis && (latestDoc?.id || baseDoc?.id) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => onOpenAnalysis(latestDoc?.id || baseDoc?.id)}
                >
                  <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                  AI Analysis
                </Button>
              )}
            </div>
          </div>

          {/* 3. CONNECTED VERSION HISTORY EXPANDER (Base IEP + Amendments) */}
          {history.length > 1 && (
            <div className="mt-4 pt-3 border-t border-border/40">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Connected Version History
              </p>
              <div className="space-y-1.5">
                {history.map((doc: any, idx: number) => {
                  const isLatest = doc.id === family.latestVersionDocumentId;
                  const isBase = doc.id === family.baseIepDocumentId;
                  return (
                    <div
                      key={doc.id || idx}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                        isLatest
                          ? "bg-teal-500/10 border border-teal-500/20 text-foreground"
                          : "bg-muted/30 border border-border/40 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">#{idx + 1}</span>
                        <span className="font-medium text-foreground">{doc.fileName}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${
                            isLatest
                              ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isBase && "Base IEP"}
                          {!isBase && doc.isAmendment && "Amendment"}
                          {isLatest && " • Active Governing"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground">{doc.documentDate || "Undated"}</span>
                        {doc.fileUrl && (
                          <button
                            onClick={() => onViewDocument?.(doc.fileUrl)}
                            className="text-teal-400 hover:text-teal-300 text-xs font-semibold"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
