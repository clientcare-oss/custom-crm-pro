import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ScrollText, Copy, Download, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
export default function StateComplaintBuilder() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const contactId = parseInt(params.get("contactId") ?? "0", 10);

  const [violationSummary, setViolationSummary] = useState("");
  const [desiredResolution, setDesiredResolution] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState<{ complaint: string; studentName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = trpc.stateComplaint.generate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("State complaint draft generated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerate = () => {
    if (!contactId) {
      toast.error("No student selected. Please open this tool from a student's Tools tab.");
      return;
    }
    generate.mutate({ contactId, violationSummary, desiredResolution, additionalContext: additionalContext || undefined });
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.complaint);
    setCopied(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.complaint], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `state-complaint-${result.studentName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/40">
            <ScrollText className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">State Complaint Builder</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              AI-assisted drafting of formal state complaints under IDEA. Review and edit all output before submission.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 px-5 py-4 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            This tool generates a draft complaint for review purposes only. Always review the output carefully, verify all citations and facts, and consult with a qualified special education attorney before filing. The generated document is not legal advice.
          </p>
        </div>

        {!result ? (
          /* Input form */
          <Card className="p-6 rounded-xl border border-border space-y-5">
            <div className="space-y-2">
              <Label htmlFor="violations" className="text-sm font-semibold">
                Alleged Violations / Summary of Concerns <span className="text-rose-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Describe the specific violations — e.g., failure to provide FAPE, missed timelines, lack of prior written notice, denial of related services, procedural violations.
              </p>
              <Textarea
                id="violations"
                value={violationSummary}
                onChange={(e) => setViolationSummary(e.target.value)}
                placeholder="e.g., The district failed to provide a free appropriate public education by removing speech-language services from the IEP without prior written notice or parental consent, in violation of 34 CFR §300.503..."
                className="min-h-[120px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution" className="text-sm font-semibold">
                Desired Resolution / Corrective Actions <span className="text-rose-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                What do you want the state to order? Include compensatory services, corrective action plans, training, reimbursement, or policy changes.
              </p>
              <Textarea
                id="resolution"
                value={desiredResolution}
                onChange={(e) => setDesiredResolution(e.target.value)}
                placeholder="e.g., Reinstate speech-language services immediately; provide 40 hours of compensatory speech therapy; require district staff to complete training on prior written notice requirements..."
                className="min-h-[100px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context" className="text-sm font-semibold">
                Additional Context <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Include relevant dates, meeting notes, district responses, prior complaints, or any other context that strengthens the complaint.
              </p>
              <Textarea
                id="context"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g., Parent requested an IEP meeting on March 1, 2025. District did not respond within 10 days. Parent sent follow-up on March 15. IEP meeting was held April 10 without adequate notice..."
                className="min-h-[100px] text-sm"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={generate.isPending || violationSummary.length < 10 || desiredResolution.length < 10}
                className="inline-flex items-center gap-2"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating draft…
                  </>
                ) : (
                  <>
                    <ScrollText className="h-4 w-4" />
                    Generate State Complaint Draft
                  </>
                )}
              </Button>
              {!contactId && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  No student linked — open from a student's Tools tab.
                </p>
              )}
            </div>
          </Card>
        ) : (
          /* Result view */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold text-foreground">
                  Draft generated for <span className="text-accent">{result.studentName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy} className="inline-flex items-center gap-1.5 text-xs">
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownload} className="inline-flex items-center gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download .txt
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setResult(null)} className="text-xs text-muted-foreground">
                  Start over
                </Button>
              </div>
            </div>

            <Card className="p-6 rounded-xl border border-border">
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                {result.complaint}
              </pre>
            </Card>

            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 px-5 py-3 flex gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Review all content carefully before use. Verify regulation citations, dates, and facts. This draft is a starting point — not a final document.
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
