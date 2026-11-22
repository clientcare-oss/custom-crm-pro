import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Eye,
  Code2,
  Copy,
  Check,
  ExternalLink,
  User,
  GraduationCap,
  Heart,
  Calendar,
  Sparkles,
  Phone,
  ShieldCheck,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { ALL_FIELDS, DEFAULT_FIELDS, type FieldKey } from "@/lib/formFields";

/**
 * Compact visual miniature preview of a Lead Intake Form or Confirmation Screen
 * rendered directly on each form card at 100% zoom.
 */
export function MiniLeadFormPreview({
  form,
  formUrl,
  businessPhone,
  confHeadline,
  confBody,
  onClick,
}: {
  form: {
    name: string;
    slug?: string;
    description?: string | null;
    schedulingEnabled?: boolean;
    fields?: string | null;
    customLabels?: string | null;
  };
  formUrl: string;
  businessPhone?: string;
  confHeadline?: string;
  confBody?: string;
  onClick: () => void;
}) {
  const [previewTab, setPreviewTab] = useState<"step1" | "step2" | "step3" | "confirmed">("step1");

  let enabledFields: FieldKey[] = [...DEFAULT_FIELDS];
  if (form.fields) {
    try {
      const parsed =
        typeof form.fields === "string" ? JSON.parse(form.fields) : form.fields;
      if (Array.isArray(parsed)) enabledFields = parsed as FieldKey[];
    } catch {
      // use defaults
    }
  }

  let customLabels: Record<string, string> = {};
  if (form.customLabels) {
    try {
      const parsed =
        typeof form.customLabels === "string"
          ? JSON.parse(form.customLabels)
          : form.customLabels;
      if (parsed && typeof parsed === "object") customLabels = parsed;
    } catch {
      // ignore
    }
  }

  const getLabel = (key: FieldKey, fallback: string) =>
    customLabels[key] || fallback;

  const step1Count = ALL_FIELDS.filter(
    (f) => f.step === 1 && enabledFields.includes(f.key)
  ).length;
  const step2Count = ALL_FIELDS.filter(
    (f) => f.step === 2 && enabledFields.includes(f.key)
  ).length;

  return (
    <div
      className="group/preview relative rounded-xl border border-[#3A2C18] bg-[#020916] overflow-hidden hover:border-[#C5A059]/80 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.85)]"
      data-testid={`mini-lead-form-preview-${form.slug || "custom"}`}
    >
      {/* Miniature Browser Chrome Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#041022] border-b border-[#3A2C18]/80 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-2 w-2 rounded-full bg-rose-500/75 shrink-0" />
          <span className="h-2 w-2 rounded-full bg-amber-400/75 shrink-0" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/75 shrink-0" />
          <span className="ml-1.5 text-[10px] font-mono text-[#A69371] truncate">
            {formUrl.replace(/^https?:\/\//, "")}
          </span>
        </div>

        {/* Interactive Step Switcher inside the Mini Preview */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {(
            [
              { id: "step1", label: "1. Parent" },
              { id: "step2", label: "2. Student" },
              { id: "step3", label: "3. Concerns" },
              { id: "confirmed", label: "✓ Thank You" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPreviewTab(t.id)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer ${
                previewTab === t.id
                  ? "bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] font-bold"
                  : "bg-[#07162B] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Miniature Form Body */}
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        title="Click to launch interactive live form preview"
        className="p-3 bg-gradient-to-b from-[#071A36]/80 to-[#030C1A] min-h-[156px] flex flex-col justify-between cursor-pointer"
      >
        {/* Top Progress Pill inside Mini Form */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#3A2C18]/50">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FAD77B] shrink-0" />
            <span
              className="text-xs font-serif font-bold text-[#FFF4D4] truncate"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {form.name}
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#FFE394] px-1.5 py-0.5 rounded bg-[#C5A059]/15 border border-[#C5A059]/35 shrink-0">
            {enabledFields.length} Active Fields
          </span>
        </div>

        {/* Step 1: Parent / Guardian Preview */}
        {previewTab === "step1" && (
          <div className="py-2 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[#FAD77B]">
              <span className="font-semibold flex items-center gap-1">
                <User className="w-3 h-3" /> Step 1 · Parent / Guardian Information
              </span>
              <span className="text-[9px] font-mono text-[#A69371]">
                {step1Count} fields
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="h-6 rounded bg-[#020A17]/90 border border-[#3A2C18] px-2 flex items-center justify-between text-[9px] text-[#C6B697]">
                <span className="truncate">
                  {getLabel("parentFirstName", "Parent First Name")} *
                </span>
                <span className="text-[8px] text-[#A69371]">Text</span>
              </div>
              <div className="h-6 rounded bg-[#020A17]/90 border border-[#3A2C18] px-2 flex items-center justify-between text-[9px] text-[#C6B697]">
                <span className="truncate">
                  {getLabel("parentLastName", "Parent Last Name")} *
                </span>
                <span className="text-[8px] text-[#A69371]">Text</span>
              </div>
              <div className="h-6 rounded bg-[#020A17]/90 border border-[#3A2C18] px-2 flex items-center justify-between text-[9px] text-[#C6B697]">
                <span className="truncate">
                  {getLabel("parentEmail", "Parent Email")} *
                </span>
                <span className="text-[8px] text-[#A69371]">Email</span>
              </div>
              <div className="h-6 rounded bg-[#020A17]/90 border border-[#3A2C18] px-2 flex items-center justify-between text-[9px] text-[#C6B697]">
                <span className="truncate">
                  {getLabel("parentPhone", "Parent Phone")} *
                </span>
                <span className="text-[8px] text-[#A69371]">Phone</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Student Info Preview */}
        {previewTab === "step2" && (
          <div className="py-2 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[#FAD77B]">
              <span className="font-semibold flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> Step 2 · Student & School Profile
              </span>
              <span className="text-[9px] font-mono text-[#A69371]">
                {step2Count} fields
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="h-6 rounded bg-[#020A17]/90 border border-[#3A2C18] px-2 flex items-center text-[9px] text-[#C6B697] truncate">
                {getLabel("studentFirstName", "Student First Name")} *
              </div>
              <div className="h-6 rounded bg-[#020A17]/90 border border-[#3A2C18] px-2 flex items-center text-[9px] text-[#C6B697] truncate">
                {getLabel("gradeLevel", "Grade Level")}
              </div>
              <div className="h-6 rounded bg-[#020A17]/90 border border-[#3A2C18] px-2 flex items-center text-[9px] text-[#C6B697] truncate">
                {getLabel("schoolName", "School Name")}
              </div>
              <div className="h-6 rounded bg-[#020A17]/90 border border-[#3A2C18] px-2 flex items-center text-[9px] text-[#C6B697] truncate">
                {getLabel("countyDistrict", "County / School District")}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Challenges & Scheduling Preview */}
        {previewTab === "step3" && (
          <div className="py-2 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[#FAD77B]">
              <span className="font-semibold flex items-center gap-1">
                <Heart className="w-3 h-3" /> Step 3 · IEP Concerns & Discovery Booking
              </span>
              {form.schedulingEnabled && (
                <span className="text-[9px] font-mono text-emerald-300 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" /> Inline Scheduler
                </span>
              )}
            </div>
            <div className="h-11 rounded bg-[#020A17]/90 border border-[#3A2C18] p-2 text-[9px] text-[#A69371]">
              {getLabel(
                "challenges",
                "Tell us about your child's current IEP/504 challenges and advocacy goals…"
              )}
            </div>
          </div>
        )}

        {/* Confirmation Screen Preview */}
        {previewTab === "confirmed" && (
          <div className="py-1.5 space-y-1.5 text-center">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[9px] font-bold">
              <CheckCircle2 className="w-3 h-3" />
              <span>{confHeadline || "Thank You! Case ID Assigned"}</span>
            </div>
            <p className="text-[9px] text-[#C6B697] line-clamp-1">
              {confBody ||
                "Your family profile & student case workspace have been created."}
            </p>
            {businessPhone && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#FFE394] text-[9px] font-mono font-bold">
                <Phone className="w-2.5 h-2.5" />
                <span>Save Our Number: {businessPhone}</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA Bar inside Mini Form */}
        <div className="flex items-center justify-between pt-2 border-t border-[#3A2C18]/50">
          <span className="text-[9px] text-[#A69371] flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-[#FAD77B]" />
            <span>Auto-creates Parent, Student & Case ID</span>
          </span>
          <span className="px-2.5 py-0.5 rounded bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-[9px] shadow-sm">
            Continue →
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Share & Website Embed Modal for any Lead Form (`PG-012`)
 * Provides Direct URL, Referral Attribution Link (`?ref=WP-PARTNER`), Responsive Iframe Embed, and Floating CTA Button HTML.
 */
export function ShareLeadFormModal({
  open,
  onOpenChange,
  formName,
  formUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  formUrl: string;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [refCode, setRefCode] = useState("WP-WEBSITE");

  const referralUrl = `${formUrl}${formUrl.includes("?") ? "&" : "?"}ref=${encodeURIComponent(
    refCode || "WP-WEBSITE"
  )}`;

  const iframeSnippet = `<iframe
  src="${formUrl}"
  width="100%"
  height="760"
  style="border:1px solid #3A2C18;border-radius:16px;background:#07162B;"
  title="${formName} — Waypoint Advocates"
  loading="lazy"
></iframe>`;

  const buttonSnippet = `<a
  href="${formUrl}"
  target="_blank"
  rel="noopener noreferrer"
  style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:10px;background:linear-gradient(90deg,#DFBE77,#C5A059,#9E7D3B);color:#07162B;font-family:Georgia,serif;font-weight:700;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,0.45);"
>
  Request IEP Advocacy Consultation
</a>`;

  const copyText = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle
            className="text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <Code2 className="w-5 h-5 text-[#FAD77B]" />
            <span>Share & Embed · {formName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#C6B697]">
            Share a direct link, track referral partners with attribution tags, or embed this intake form on your Wix / WordPress website.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* 1. Direct Public Intake URL */}
          <div className="p-3 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#FFE394]">
                1. Direct Public Form Link
              </span>
              <button
                type="button"
                onClick={() => window.open(formUrl, "_blank")}
                className="text-[11px] text-[#FAD77B] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Live Form</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={formUrl}
                className="flex-1 h-8 px-2.5 rounded-lg bg-[#05142B] border border-[#3A2C18] font-mono text-[11px] text-[#D8C7A5]"
              />
              <button
                type="button"
                onClick={() => copyText(formUrl, "direct", "Direct link")}
                className="h-8 px-3 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedKey === "direct" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* 2. Referral Attribution Link */}
          <div className="p-3 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#FFE394]">
                2. Referral & Campaign Attribution Link
              </span>
              <span className="text-[10px] font-mono text-[#A69371]">
                Auto-tags lead source in Lead Center
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#C6B697] shrink-0">
                Referral Tag:
              </span>
              <input
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                placeholder="WP-PARTNER"
                className="w-36 h-7 px-2 rounded bg-[#05142B] border border-[#3A2C18] font-mono text-[11px] text-[#FFE394]"
              />
              <input
                readOnly
                value={referralUrl}
                className="flex-1 h-7 px-2 rounded bg-[#05142B] border border-[#3A2C18] font-mono text-[10px] text-[#A69371]"
              />
              <button
                type="button"
                onClick={() =>
                  copyText(referralUrl, "referral", "Referral link")
                }
                className="h-7 px-2.5 rounded-lg border border-[#3A2C18] bg-[#07162B] text-[#FFE394] hover:border-[#C5A059] inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedKey === "referral" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* 3. Responsive Iframe Embed Code */}
          <div className="p-3 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#FFE394]">
                3. Website Iframe Embed (Wix / WordPress / Squarespace)
              </span>
              <button
                type="button"
                onClick={() =>
                  copyText(iframeSnippet, "iframe", "Iframe embed code")
                }
                className="text-[11px] text-[#FAD77B] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === "iframe" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy Iframe HTML</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-[#040D1E] border border-[#3A2C18]/70 font-mono text-[10px] text-[#C6B697] overflow-x-auto">
              {iframeSnippet}
            </pre>
          </div>

          {/* 4. Gold Admiralty CTA Button HTML */}
          <div className="p-3 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#FFE394]">
                4. Waypoint Admiralty Gold CTA Button Snippet
              </span>
              <button
                type="button"
                onClick={() =>
                  copyText(buttonSnippet, "btn", "Button HTML snippet")
                }
                className="text-[11px] text-[#FAD77B] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === "btn" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy Button HTML</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-[#040D1E] border border-[#3A2C18]/70 font-mono text-[10px] text-[#C6B697] overflow-x-auto">
              {buttonSnippet}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 rounded-lg border border-[#3A2C18] bg-[#020A17] text-xs font-semibold text-[#D8C7A5] hover:text-[#FFF4D4] cursor-pointer"
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
