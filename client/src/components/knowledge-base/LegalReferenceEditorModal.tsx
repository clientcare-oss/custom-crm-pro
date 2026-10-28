import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Scale, ShieldCheck } from "lucide-react";
import {
  REQUIRED_LEGAL_CATEGORIES,
  ALL_STATE_JURISDICTIONS,
  type LegalReference,
  type VerificationStatus,
  type LegalSourceType,
} from "../../../../shared/stateEducationLawData";

interface LegalReferenceEditorModalProps {
  reference?: LegalReference | null;
  defaultStateCode?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function LegalReferenceEditorModal({
  reference,
  defaultStateCode,
  isOpen,
  onClose,
  onSaved,
}: LegalReferenceEditorModalProps) {
  const [form, setForm] = useState({
    state: "GA",
    category: "Special education regulations and IDEA implementation",
    title: "",
    citation: "",
    sourceType: "Administrative Code" as LegalSourceType,
    officialUrl: "",
    plainLanguageExplanation: "",
    statutoryTimeline: "",
    exceptions: "",
    advocateNotes: "",
    effectiveDate: "",
    verificationStatus: "Verified" as VerificationStatus,
    isParentVisible: false,
  });

  const utils = trpc.useUtils();

  useEffect(() => {
    if (reference) {
      setForm({
        state: reference.state,
        category: reference.category,
        title: reference.title,
        citation: reference.citation,
        sourceType: reference.sourceType,
        officialUrl: reference.officialUrl,
        plainLanguageExplanation: reference.plainLanguageExplanation,
        statutoryTimeline: reference.statutoryTimeline || "",
        exceptions: reference.exceptions || "",
        advocateNotes: reference.advocateNotes || "",
        effectiveDate: reference.effectiveDate || "",
        verificationStatus: reference.verificationStatus,
        isParentVisible: !!reference.isParentVisible,
      });
    } else {
      setForm({
        state: defaultStateCode || "GA",
        category: "Special education regulations and IDEA implementation",
        title: "",
        citation: "",
        sourceType: "Administrative Code",
        officialUrl: "",
        plainLanguageExplanation: "",
        statutoryTimeline: "",
        exceptions: "",
        advocateNotes: "Verified against state agency repository.",
        effectiveDate: "",
        verificationStatus: "Verified",
        isParentVisible: false,
      });
    }
  }, [reference, defaultStateCode, isOpen]);

  const upsertMutation = trpc.stateLaw.upsert.useMutation({
    onSuccess: () => {
      toast.success(reference ? "Legal reference updated" : "New legal reference cataloged");
      utils.stateLaw.invalidate();
      onSaved?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save legal reference");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.citation.trim() || !form.plainLanguageExplanation.trim()) {
      toast.error("Title, citation, and plain-language explanation are required");
      return;
    }

    if (!form.officialUrl.trim()) {
      toast.error("Official government source URL is required");
      return;
    }

    upsertMutation.mutate({
      id: reference?.id,
      state: form.state,
      category: form.category,
      title: form.title.trim(),
      citation: form.citation.trim(),
      sourceType: form.sourceType,
      officialUrl: form.officialUrl.trim(),
      plainLanguageExplanation: form.plainLanguageExplanation.trim(),
      statutoryTimeline: form.statutoryTimeline.trim() || undefined,
      exceptions: form.exceptions.trim() || undefined,
      advocateNotes: form.advocateNotes.trim() || undefined,
      effectiveDate: form.effectiveDate.trim() || undefined,
      verificationStatus: form.verificationStatus,
      isParentVisible: form.isParentVisible,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] p-6 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.9)]">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-[#3A2C18]/80">
          <div className="flex items-center gap-2 text-[#C5A059]">
            <Scale className="w-5 h-5" />
            <span className="text-[11px] font-mono uppercase tracking-widest font-semibold">
              Legal Reference Administration & Review Queue
            </span>
          </div>
          <DialogTitle className="text-xl font-serif text-[#FFF4D4] font-normal">
            {reference ? "Edit Authoritative Legal Reference" : "Add New Legal Reference"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#C6B697]">
            Maintain verified education law citations, statutory timelines, exceptions, and official government links.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* State Jurisdiction */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#FFE394]">
                State Jurisdiction / Federal
              </label>
              <Select
                value={form.state}
                onValueChange={(val) => setForm((f) => ({ ...f, state: val }))}
              >
                <SelectTrigger className="h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                  <SelectValue placeholder="Select Jurisdiction" />
                </SelectTrigger>
                <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                  {ALL_STATE_JURISDICTIONS.map((st) => (
                    <SelectItem key={st.code} value={st.code} className="text-xs">
                      {st.code} — {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Legal Category (Required 15 Topics) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#FFE394]">
                Legal Topic Category (Required 15)
              </label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm((f) => ({ ...f, category: val }))}
              >
                <SelectTrigger className="h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                  {REQUIRED_LEGAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#FFE394]">
              Official Law / Regulation Title
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Initial Evaluation Timeline & Written Parental Consent"
              className="h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Exact Legal Citation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#FFE394]">
                Exact Citation (Statute / Admin Code / CFR)
              </label>
              <Input
                value={form.citation}
                onChange={(e) => setForm((f) => ({ ...f, citation: e.target.value }))}
                placeholder="e.g. Ga. Comp. R. & Regs. 160-4-7-.04(1)(a)"
                className="h-9 text-xs font-mono bg-[#020A17] border-[#3A2C18] text-[#FFE394] placeholder-[#A69371]"
                required
              />
            </div>

            {/* Source Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#FFE394]">
                Source Authority Type
              </label>
              <Select
                value={form.sourceType}
                onValueChange={(val: LegalSourceType) => setForm((f) => ({ ...f, sourceType: val }))}
              >
                <SelectTrigger className="h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                  <SelectValue placeholder="Source Type" />
                </SelectTrigger>
                <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                  <SelectItem value="Administrative Code">Administrative Code</SelectItem>
                  <SelectItem value="Statute">State Statute</SelectItem>
                  <SelectItem value="Agency Guidance">State Education Agency Guidance</SelectItem>
                  <SelectItem value="Federal Regulation">Federal Regulation (CFR / USC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Official Source Link & Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#FFE394]">
                Official Government Source URL (.gov / .legis)
              </label>
              <Input
                type="url"
                value={form.officialUrl}
                onChange={(e) => setForm((f) => ({ ...f, officialUrl: e.target.value }))}
                placeholder="https://rules.sos.ga.gov/..."
                className="h-9 text-xs font-mono bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#FFE394]">
                Statutory Timeline (If applicable)
              </label>
              <Input
                value={form.statutoryTimeline}
                onChange={(e) => setForm((f) => ({ ...f, statutoryTimeline: e.target.value }))}
                placeholder="e.g. 60 Calendar Days from signed consent"
                className="h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371]"
              />
            </div>
          </div>

          {/* Plain-Language Explanation */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#FFE394]">
              Plain-Language Legal Explanation (For Advocates & Parents)
            </label>
            <Textarea
              rows={4}
              value={form.plainLanguageExplanation}
              onChange={(e) => setForm((f) => ({ ...f, plainLanguageExplanation: e.target.value }))}
              placeholder="Explain the practical rule clearly and objectively..."
              className="text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371] leading-relaxed"
              required
            />
          </div>

          {/* Exceptions & Advocate Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#FFE394]">
                Important Exceptions or Limitations
              </label>
              <Textarea
                rows={3}
                value={form.exceptions}
                onChange={(e) => setForm((f) => ({ ...f, exceptions: e.target.value }))}
                placeholder="e.g. Timeline pauses during scheduled summer breaks of 10+ days."
                className="text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#FFE394]">
                Advocate Practice Tips & Context
              </label>
              <Textarea
                rows={3}
                value={form.advocateNotes}
                onChange={(e) => setForm((f) => ({ ...f, advocateNotes: e.target.value }))}
                placeholder="e.g. Always request written consent date-stamped via email."
                className="text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371]"
              />
            </div>
          </div>

          {/* Verification Status & Administrative Review */}
          <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/80 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#C5A059] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Administrative Verification & Source Governance</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#FFE394]">Verification Status</label>
              <Select
                value={form.verificationStatus}
                onValueChange={(val: VerificationStatus) =>
                  setForm((f) => ({ ...f, verificationStatus: val }))
                }
              >
                <SelectTrigger className="h-8 text-xs bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                  <SelectItem value="Verified">Verified (Official Source Checked)</SelectItem>
                  <SelectItem value="Review Needed">Review Needed (Possible Law Change)</SelectItem>
                  <SelectItem value="Source Unavailable">Source Unavailable (Offline / Broken)</SelectItem>
                  <SelectItem value="Unverified">Unverified (Pending Legal Review)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="parentVisibleCheck"
                checked={form.isParentVisible}
                onChange={(e) => setForm((f) => ({ ...f, isParentVisible: e.target.checked }))}
                className="w-4 h-4 rounded border-[#3A2C18] bg-[#05142B] text-[#C5A059] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="parentVisibleCheck" className="text-xs text-[#FFF4D4] cursor-pointer">
                Approve for Parent Portal Visibility (Clients can read this verified guide in their portal)
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#3A2C18]/80">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs border-[#3A2C18] bg-transparent text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={upsertMutation.isPending}
              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(197,160,89,0.3)] hover:brightness-110 disabled:opacity-50"
            >
              {upsertMutation.isPending ? "Saving..." : reference ? "Update Reference" : "Catalog Reference"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
