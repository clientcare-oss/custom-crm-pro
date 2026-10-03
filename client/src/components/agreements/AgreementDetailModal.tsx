import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText,
  Send,
  Ban,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  GraduationCap,
  Copy,
  ExternalLink,
  Lock,
} from "lucide-react";

interface AgreementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreementId: number | null;
  onRefresh: () => void;
}

export function AgreementDetailModal({
  isOpen,
  onClose,
  agreementId,
  onRefresh,
}: AgreementDetailModalProps) {
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const { data, isLoading, refetch } = trpc.agreements.get.useQuery(
    { id: agreementId! },
    { enabled: !!agreementId && isOpen }
  );

  const sendMutation = trpc.agreements.send.useMutation({
    onSuccess: () => {
      toast.success("Agreement sent to client portal!");
      refetch();
      onRefresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send agreement");
    },
  });

  const voidMutation = trpc.agreements.void.useMutation({
    onSuccess: () => {
      toast.success("Agreement marked as voided");
      setVoidConfirmOpen(false);
      refetch();
      onRefresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to void agreement");
    },
  });

  if (!isOpen || !agreementId) return null;

  const agreement = data?.agreement;
  const client = data?.client;
  const student = data?.student;
  const signers = data?.signers || [];
  const template = data?.template;

  const isExecuted = agreement?.status === "Signed" || agreement?.status === "Completed" || Boolean(agreement?.contentLocked);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
      case "Signed":
        return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3" /> Executed</Badge>;
      case "Sent":
      case "Awaiting_Signature":
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"><Clock className="w-3 h-3" /> Awaiting Signature</Badge>;
      case "Viewed":
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 gap-1"><Eye className="w-3 h-3" /> Viewed by Client</Badge>;
      case "Voided":
        return <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 gap-1"><Ban className="w-3 h-3" /> Voided</Badge>;
      default:
        return <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 gap-1">Draft</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] flex flex-col bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] rounded-2xl p-0 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-[1100]">
        <DialogHeader className="p-6 pb-4 border-b border-[#3A2C18] bg-[#020A17]/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] shadow-md shadow-black/40">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4] tracking-wide">
                  {agreement?.title || "Agreement Details"}
                </DialogTitle>
                {agreement && getStatusBadge(agreement.status)}
                {isExecuted && (
                  <Badge variant="outline" className="text-[10px] bg-[#020A17] text-[#FFE394] border border-[#3A2C18] gap-1">
                    <Lock className="w-2.5 h-2.5" /> Content Locked
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#C6B697] mt-0.5">
                Reference ID: <span className="font-mono text-[#FFE394]">AG-{agreement?.id.toString().padStart(5, "0")}</span>
                {template && <span> · Template: {template.name}</span>}
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-[#C6B697]">
            Loading agreement snapshot...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] text-xs">
              <div>
                <span className="text-[#A69371] uppercase tracking-wider text-[10px] block">Client / Parent</span>
                <span className="font-serif font-semibold text-[#FFF4D4] mt-0.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-[#FFE394]" />
                  {client ? `${client.firstName} ${client.lastName}` : "Client Contact"}
                </span>
                <span className="text-[11px] text-[#C6B697] truncate block">{client?.email}</span>
              </div>

              <div>
                <span className="text-[#A69371] uppercase tracking-wider text-[10px] block">Student Record</span>
                <span className="font-serif font-semibold text-[#FFF4D4] mt-0.5 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-[#FFE394]" />
                  {student ? `${student.firstName} ${student.lastName}` : "N/A (General)"}
                </span>
                <span className="text-[11px] text-[#C6B697] truncate block">
                  {student?.caseId || student?.gradeLevel || ""}
                </span>
              </div>

              <div>
                <span className="text-[#A69371] uppercase tracking-wider text-[10px] block">Created / Sent</span>
                <span className="text-[#FFF4D4] mt-0.5 block">
                  {agreement?.createdAt ? new Date(agreement.createdAt).toLocaleDateString() : "—"}
                </span>
                <span className="text-[11px] text-[#C6B697] block">
                  {agreement?.sentAt ? `Sent: ${new Date(agreement.sentAt).toLocaleDateString()}` : "Not sent yet"}
                </span>
              </div>

              <div>
                <span className="text-[#A69371] uppercase tracking-wider text-[10px] block">Execution Status</span>
                <span className="font-serif font-semibold text-emerald-400 mt-0.5 block">
                  {agreement?.completedAt ? new Date(agreement.completedAt).toLocaleString() : agreement?.status}
                </span>
                <span className="text-[11px] text-[#C6B697] block">
                  {agreement?.viewedAt ? `Viewed: ${new Date(agreement.viewedAt).toLocaleDateString()}` : "Not viewed"}
                </span>
              </div>
            </div>

            {/* Document Content Frozen Snapshot Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-serif font-bold text-[#FFF4D4] uppercase tracking-wider">
                  Rendered Agreement Terms (Snapshot)
                </h4>
                {isExecuted && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Immutable Legal Snapshot
                  </span>
                )}
              </div>

              <div
                className="p-5 rounded-xl bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-sm leading-relaxed prose prose-invert max-w-none max-h-72 overflow-y-auto shadow-inner"
                dangerouslySetInnerHTML={{ __html: agreement?.content || "" }}
              />
            </div>

            {/* Signers Table */}
            <div className="p-4 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] space-y-3">
              <h4 className="text-xs font-serif font-bold text-[#FFF4D4] uppercase tracking-wider">
                Assigned Signers & Signatures
              </h4>

              <div className="space-y-2">
                {signers.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[#05142B]/90 border border-[#3A2C18] text-xs gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-semibold text-[#FFF4D4]">{s.name}</span>
                        <Badge variant="outline" className="text-[10px] bg-[#020A17] text-[#C6B697] border-[#3A2C18] capitalize">
                          {s.role.replace("_", " ")}
                        </Badge>
                        <Badge
                          className={`text-[10px] ${
                            s.status === "signed"
                              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                              : "bg-[#020A17] text-[#FFE394] border border-[#C5A059]/40"
                          }`}
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#C6B697] mt-0.5">
                        {s.email || "No email on file"}
                        {s.ipAddress && ` · IP: ${s.ipAddress}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {s.signedAt && (
                        <span className="text-[11px] text-[#A69371]">
                          Signed {new Date(s.signedAt).toLocaleString()}
                        </span>
                      )}
                      {s.signatureUrl && (
                        <a
                          href={s.signatureUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFE394] hover:text-[#FFF4D4] text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          View Ink
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Integrity & Final PDF */}
            {isExecuted && (
              <div className="p-4 rounded-xl bg-[#020A17]/80 border border-emerald-500/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-serif font-bold text-emerald-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Document Integrity & Archive Verified
                    </h4>
                    <p className="text-xs text-emerald-200/70 mt-0.5">
                      Canonical PDF compiled via pdf-lib and stored in Cloudflare R2 and Document Vault.
                    </p>
                  </div>

                  {agreement?.signedPdfUrl && (
                    <Button
                      onClick={() => window.open(agreement.signedPdfUrl!, "_blank")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5 shadow-[0_0_16px_rgba(16,185,129,0.3)] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Signed PDF
                    </Button>
                  )}
                </div>

                {agreement?.documentHash && (
                  <div className="p-2.5 rounded-lg bg-[#05142B] border border-[#3A2C18] flex items-center justify-between text-xs">
                    <span className="text-[#C6B697] text-[11px] font-mono truncate mr-2">
                      SHA-256 Hash: <span className="text-emerald-300">{agreement.documentHash}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(agreement.documentHash!);
                        toast.success("Document hash copied to clipboard");
                      }}
                      className="h-6 w-6 p-0 text-[#C6B697] hover:text-[#FFF4D4] cursor-pointer"
                      title="Copy Hash"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="p-4 border-t border-[#3A2C18] bg-[#020A17]/80 flex flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] cursor-pointer text-xs"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {agreement?.status === "Draft" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVoidConfirmOpen(true)}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-rose-400 text-xs h-9 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 mr-1" />
                  Void
                </Button>

                <Button
                  type="button"
                  onClick={() => sendMutation.mutate({ id: agreement.id })}
                  disabled={sendMutation.isPending}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 gap-1.5 border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendMutation.isPending ? "Sending..." : "Send to Client"}
                </Button>
              </>
            )}

            {(agreement?.status === "Sent" || agreement?.status === "Awaiting_Signature" || agreement?.status === "Viewed") && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVoidConfirmOpen(true)}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-rose-400 text-xs h-9 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 mr-1" />
                  Void
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => sendMutation.mutate({ id: agreement.id })}
                  disabled={sendMutation.isPending}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-9 cursor-pointer"
                >
                  Resend Notification
                </Button>
              </>
            )}

            {isExecuted && agreement?.signedPdfUrl && (
              <Button
                type="button"
                onClick={() => window.open(agreement.signedPdfUrl!, "_blank")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(16,185,129,0.3)]"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </Button>
            )}
          </div>
        </DialogFooter>

        {/* Void Confirmation Sub-Dialog */}
        <Dialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
          <DialogContent className="max-w-md bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] rounded-xl p-5 z-[1200]">
            <DialogHeader>
              <DialogTitle className="text-base font-serif font-bold text-rose-400 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Void Agreement
              </DialogTitle>
              <p className="text-xs text-[#C6B697] mt-1">
                Voiding this agreement prevents the client from signing it and cancels pending execution.
              </p>
            </DialogHeader>

            <div className="my-3 space-y-2">
              <label className="text-xs text-[#C6B697] font-semibold">Reason for Voiding (Optional)</label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Terms revised following meeting; new agreement issued."
                className="w-full h-20 rounded-md bg-[#020A17]/90 border border-[#3A2C18] p-2 text-xs text-[#FFF4D4] placeholder:text-[#A69371] focus:outline-none focus:border-rose-400"
              />
            </div>

            <DialogFooter className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setVoidConfirmOpen(false)}
                className="text-[#C6B697] hover:text-[#FFF4D4]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => voidMutation.mutate({ id: agreement!.id, reason: voidReason })}
                disabled={voidMutation.isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                {voidMutation.isPending ? "Voiding..." : "Confirm Void"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
