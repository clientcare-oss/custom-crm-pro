import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileSignature,
  CheckCircle2,
  FileText,
  Download,
  ShieldCheck,
  ArrowRight,
  Clock,
  Eye,
  Pen,
  Lock,
  Copy,
} from "lucide-react";
import { WaypointSignaturePad } from "@/components/portal/WaypointSignaturePad";

interface AgreementsExperienceProps {
  onComplete?: () => void;
  onNavigateTab?: (tabId: string) => void;
}

export function AgreementsExperience({ onComplete, onNavigateTab }: AgreementsExperienceProps) {
  const [selectedAgreementId, setSelectedAgreementId] = useState<number | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [acknowledgedItems, setAcknowledgedItems] = useState<Record<string, boolean>>({});
  const [initials, setInitials] = useState<Record<string, string>>({});
  const [eSignConsent, setESignConsent] = useState(false);

  // Queries
  const { data: clientAgreements = [], isLoading: loadingList, refetch: refetchList } =
    trpc.agreements.clientList.useQuery();

  const { data: agreementDetail, isLoading: loadingDetail, refetch: refetchDetail } =
    trpc.agreements.clientGet.useQuery(
      { id: selectedAgreementId! },
      { enabled: !!selectedAgreementId }
    );

  // Auto-select first active agreement if none selected
  React.useEffect(() => {
    if (clientAgreements.length > 0 && !selectedAgreementId) {
      // Prioritize agreement needing signature
      const pending = clientAgreements.find((a: any) =>
        ["Sent", "Viewed", "Awaiting_Signature"].includes(a.status)
      );
      if (pending) {
        setSelectedAgreementId(pending.id);
      } else {
        setSelectedAgreementId(clientAgreements[0].id);
      }
    }
  }, [clientAgreements, selectedAgreementId]);

  // When agreement detail loads, populate acknowledged items from template
  React.useEffect(() => {
    if (agreementDetail?.template?.requiredAcknowledgments) {
      try {
        const parsed = JSON.parse(agreementDetail.template.requiredAcknowledgments);
        if (Array.isArray(parsed)) {
          const initAcks: Record<string, boolean> = {};
          parsed.forEach((a) => {
            initAcks[a.id] = false;
          });
          setAcknowledgedItems(initAcks);
        }
      } catch (e) {}
    }
  }, [agreementDetail]);

  const signMutation = trpc.agreements.clientSign.useMutation({
    onSuccess: (res) => {
      toast.success("Agreement electronically signed and permanently executed!");
      refetchList();
      refetchDetail();
      if (onComplete) {
        onComplete();
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to execute agreement");
    },
  });

  const activeAgreement = agreementDetail?.agreement;
  const template = agreementDetail?.template;
  const isExecuted =
    activeAgreement?.status === "Completed" ||
    activeAgreement?.status === "Signed" ||
    Boolean(activeAgreement?.contentLocked);

  // Template required acknowledgments list
  const requiredAcks: Array<{ id: string; text: string; required: boolean }> = React.useMemo(() => {
    if (!template?.requiredAcknowledgments) return [];
    try {
      const parsed = JSON.parse(template.requiredAcknowledgments);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }, [template]);

  const allAcksComplete =
    requiredAcks.length === 0 || requiredAcks.every((a) => acknowledgedItems[a.id] === true);

  const handleSubmitSignature = () => {
    if (!selectedAgreementId) return;

    if (!signerName.trim()) {
      toast.error("Please enter your full legal printed name");
      return;
    }
    if (!signatureDataUrl) {
      toast.error("Please draw your signature");
      return;
    }
    if (!allAcksComplete) {
      toast.error("Please acknowledge all required statements before signing");
      return;
    }
    if (!eSignConsent) {
      toast.error("You must agree to electronic signatures & records consent");
      return;
    }

    const payloadAcks = requiredAcks.map((a) => ({
      id: a.id,
      text: a.text,
      acknowledged: Boolean(acknowledgedItems[a.id]),
      timestamp: new Date().toISOString(),
    }));

    signMutation.mutate({
      id: selectedAgreementId,
      signerName: signerName.trim(),
      signaturePngBase64: signatureDataUrl,
      initialsData: initials,
      acknowledgments: payloadAcks,
      eSignConsent: true,
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-white/10 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 text-xs font-semibold mb-2 border border-amber-400/20">
            <FileSignature className="h-3.5 w-3.5" />
            Legal Representation & Advocacy Agreements
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
            {activeAgreement?.title || "Advocacy Agreements"}
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1">
            Review legal terms, complete acknowledgments, and electronically execute your agreements.
          </p>
        </div>

        {isExecuted && (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs py-1.5 px-3 self-start sm:self-auto gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Signed & Executed
          </Badge>
        )}
      </div>

      {/* Multiple Agreements Selector if more than 1 assigned */}
      {clientAgreements.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-white/60 shrink-0 font-medium">Your Agreements:</span>
          {clientAgreements.map((ag: any) => {
            const isSelected = ag.id === selectedAgreementId;
            const isAgDone = ag.status === "Completed" || ag.status === "Signed";
            return (
              <button
                key={ag.id}
                onClick={() => setSelectedAgreementId(ag.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-sm"
                    : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
                }`}
              >
                {isAgDone ? (
                  <CheckCircle2 className={`w-3 h-3 ${isSelected ? "text-slate-950" : "text-emerald-400"}`} />
                ) : (
                  <Clock className={`w-3 h-3 ${isSelected ? "text-slate-950" : "text-amber-400"}`} />
                )}
                <span>{ag.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {loadingList ? (
        <div className="p-12 text-center text-xs text-white/60">Loading your agreements...</div>
      ) : clientAgreements.length === 0 ? (
        <Card className="border-white/15 bg-white/[0.03] p-10 text-center rounded-2xl">
          <FileText className="w-10 h-10 text-white/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No pending agreements requiring action</h3>
          <p className="text-xs text-white/60 max-w-md mx-auto mt-1.5">
            When your advocate prepares a tailored advocacy service agreement or consent document, it will appear here for review and signature.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Document Content View */}
          <Card className="border-white/15 bg-slate-950/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 bg-slate-900 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 font-mono">
                  REF: AG-{activeAgreement?.id.toString().padStart(5, "0")}
                </span>
                <span className="text-xs text-white/40">|</span>
                <span className="text-xs text-white/70">
                  Effective: {activeAgreement?.createdAt ? new Date(activeAgreement.createdAt).toLocaleDateString() : ""}
                </span>
              </div>

              {isExecuted && activeAgreement?.signedPdfUrl && (
                <Button
                  onClick={() => window.open(activeAgreement.signedPdfUrl!, "_blank")}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-8 gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Executed PDF
                </Button>
              )}
            </div>

            <div
              className="p-6 sm:p-8 max-h-[460px] overflow-y-auto text-xs sm:text-sm text-white/90 leading-relaxed font-sans prose prose-invert max-w-none divide-y divide-white/10 space-y-4"
              dangerouslySetInnerHTML={{ __html: activeAgreement?.content || "" }}
            />
          </Card>

          {/* Acknowledgments Checklist */}
          {!isExecuted && requiredAcks.length > 0 && (
            <Card className="border-white/15 bg-white/[0.02] p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Required Legal Acknowledgments
              </h3>
              <p className="text-xs text-white/60">
                Please review and check each required item prior to executing this agreement.
              </p>

              <div className="space-y-3 pt-1">
                {requiredAcks.map((ack) => (
                  <div
                    key={ack.id}
                    onClick={() =>
                      setAcknowledgedItems({
                        ...acknowledgedItems,
                        [ack.id]: !acknowledgedItems[ack.id],
                      })
                    }
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer select-none ${
                      acknowledgedItems[ack.id]
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 text-white/80"
                    }`}
                  >
                    <Checkbox
                      checked={Boolean(acknowledgedItems[ack.id])}
                      onCheckedChange={(checked) =>
                        setAcknowledgedItems({
                          ...acknowledgedItems,
                          [ack.id]: Boolean(checked),
                        })
                      }
                      className="mt-0.5 border-white/40 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <span className="text-xs leading-relaxed flex-1">{ack.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Initials Section if required */}
          {!isExecuted && template?.initialsRequired && (
            <Card className="border-white/15 bg-white/[0.02] p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pen className="w-4 h-4 text-amber-400" />
                Clause Initials Required
              </h3>
              <p className="text-xs text-white/60">
                Please enter your initials to acknowledge acceptance of standard scope and billing terms.
              </p>

              <div className="flex items-center gap-3 pt-1 max-w-xs">
                <Input
                  value={initials["all_terms"] || ""}
                  onChange={(e) => setInitials({ ...initials, all_terms: e.target.value.toUpperCase() })}
                  maxLength={4}
                  placeholder="e.g. JD"
                  className="bg-slate-900 border-white/20 text-white text-center font-mono font-bold tracking-widest uppercase h-10 w-24 text-sm"
                />
                <span className="text-xs text-white/60">Your legal initials</span>
              </div>
            </Card>
          )}

          {/* Electronic Signature Submission Block */}
          {!isExecuted ? (
            <Card className="border-amber-400/30 bg-amber-950/10 p-5 sm:p-6 rounded-2xl space-y-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileSignature className="w-5 h-5 text-amber-400" />
                    Electronic Signature Execution
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5">
                    Draw your signature below and submit to execute this agreement.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-white/80">Full Legal Printed Name *</Label>
                  <Input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Enter your full legal name"
                    className="bg-slate-900 border-white/20 text-white focus:border-amber-400 h-10 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <Label className="text-xs font-semibold text-white/80">Authorized Signature *</Label>
                  {signatureDataUrl ? (
                    <div className="h-10 px-3 rounded-lg bg-white flex items-center justify-between border border-emerald-500/50">
                      <img src={signatureDataUrl} alt="Signature" className="h-7 object-contain" />
                      <button
                        type="button"
                        onClick={() => setShowSignDialog(true)}
                        className="text-xs text-slate-700 hover:text-slate-950 font-semibold underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSignDialog(true)}
                      className="h-10 bg-slate-900 border-dashed border-amber-400/60 text-amber-300 hover:bg-slate-800 gap-2 text-xs font-semibold cursor-pointer"
                    >
                      <Pen className="w-3.5 h-3.5" />
                      Click / Tap to Draw Signature
                    </Button>
                  )}
                </div>
              </div>

              {/* Electronic Signatures Consent Agreement */}
              <div
                onClick={() => setESignConsent(!eSignConsent)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer select-none ${
                  eSignConsent
                    ? "bg-amber-950/20 border-amber-400/40 text-amber-100"
                    : "bg-slate-900/60 border-white/10 text-white/70"
                }`}
              >
                <Checkbox
                  checked={eSignConsent}
                  onCheckedChange={(c) => setESignConsent(Boolean(c))}
                  className="mt-0.5 border-white/40 data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-400 text-slate-950"
                />
                <span className="text-[11px] sm:text-xs leading-relaxed">
                  I agree to conduct this transaction and sign electronically. I intend my electronic signature to represent my binding authorization in accordance with the federal E-SIGN Act and UETA.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-white/50">
                  {allAcksComplete && signatureDataUrl && signerName.trim() && eSignConsent
                    ? "All required fields complete. Ready to execute."
                    : "Please complete all acknowledgments, printed name, drawn signature, and consent."}
                </span>

                <Button
                  onClick={handleSubmitSignature}
                  disabled={
                    !allAcksComplete ||
                    !signatureDataUrl ||
                    !signerName.trim() ||
                    !eSignConsent ||
                    signMutation.isPending
                  }
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-11 px-8 gap-2 shadow-[0_0_20px_rgba(245,181,68,0.3)] disabled:opacity-40 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {signMutation.isPending ? "Executing Agreement..." : "Submit Executed Agreement"}
                </Button>
              </div>
            </Card>
          ) : (
            /* Executed Banner & Download */
            <Card className="border-emerald-500/30 bg-emerald-950/15 p-6 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Agreement Fully Executed</h3>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      Executed by {activeAgreement?.signerName} on{" "}
                      {activeAgreement?.completedAt ? new Date(activeAgreement.completedAt).toLocaleString() : ""}.
                    </p>
                  </div>
                </div>

                {activeAgreement?.signedPdfUrl && (
                  <Button
                    onClick={() => window.open(activeAgreement.signedPdfUrl!, "_blank")}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 px-5 gap-2 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    Download Executed PDF
                  </Button>
                )}
              </div>

              {activeAgreement?.documentHash && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-900/40 text-xs flex items-center justify-between">
                  <span className="text-white/60 font-mono text-[11px] truncate mr-2">
                    Integrity SHA-256: <span className="text-emerald-300">{activeAgreement.documentHash}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeAgreement.documentHash!);
                      toast.success("Document hash copied");
                    }}
                    className="text-white/60 hover:text-white shrink-0 cursor-pointer p-1"
                    title="Copy hash"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Signature Pad Dialog */}
      <WaypointSignaturePad
        isOpen={showSignDialog}
        onClose={() => setShowSignDialog(false)}
        onSave={(dataUrl) => {
          setSignatureDataUrl(dataUrl);
          setShowSignDialog(false);
          toast.success("Signature captured!");
        }}
        title="Draw Your Electronic Signature"
        description="Sign with your finger, stylus, or mouse on the line below."
      />
    </div>
  );
}
