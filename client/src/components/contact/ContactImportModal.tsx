import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  parseContactImportFile,
  autoGuessFieldMapping,
  generateSampleContactsCsvTemplate,
  TARGET_FIELD_OPTIONS,
  type MappedTargetField,
  type RawImportFileResult,
} from "@/lib/contactFileParser";
import type { ContactItem } from "@/components/contact/ledger/ContactsLedgerView";

interface ContactImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingContacts: ContactItem[];
  onImportComplete: () => void;
}

type ImportStep = 1 | 2 | 3 | 4 | 5;
type DuplicateAction = "import" | "skip" | "merge" | "create_separate";

interface EvaluatedRow {
  rowIndex: number;
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
  company: string;
  jobTitle: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  missingName: boolean;
  missingChannels: boolean;
  invalidEmails: string[];
  invalidPhones: string[];
  duplicateInFile: boolean;
  matchedExistingContact: ContactItem | null;
  matchReason: string | null;
  nameOnlyMatchWarning: ContactItem | null;
}

function normalizePhoneDigits(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhoneFormat(phone: string): boolean {
  const d = normalizePhoneDigits(phone);
  return d.length >= 7 && d.length <= 15;
}

export default function ContactImportModal({
  open,
  onOpenChange,
  existingContacts,
  onImportComplete,
}: ContactImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<ImportStep>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedFile, setParsedFile] = useState<RawImportFileResult | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, MappedTargetField>>({});
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [rowActions, setRowActions] = useState<Record<number, DuplicateAction>>({});
  const [overwriteExistingFields, setOverwriteExistingFields] = useState(false);
  const [importResults, setImportResults] = useState<{
    importedCount: number;
    mergedCount: number;
    skippedCount: number;
    failedCount: number;
    results: {
      rowNumber: number;
      name: string;
      status: "imported" | "merged" | "skipped" | "failed";
      reason?: string;
    }[];
  } | null>(null);

  const importBatchMutation = trpc.contacts.importContactsBatch.useMutation({
    onSuccess: (res) => {
      setImportResults(res);
      setStep(5);
      onImportComplete();
      toast.success(
        `Import complete: ${res.importedCount} imported, ${res.mergedCount} merged, ${res.skippedCount} skipped`
      );
    },
    onError: (err) => {
      toast.error(err.message || "Contact import failed");
    },
  });

  const resetWizard = () => {
    setStep(1);
    setParsedFile(null);
    setFieldMapping({});
    setSelectedRows({});
    setRowActions({});
    setOverwriteExistingFields(false);
    setImportResults(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetWizard();
    }
    onOpenChange(nextOpen);
  };

  const handleDownloadTemplate = () => {
    const csv = generateSampleContactsCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "waypoint-contacts-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const processSelectedFile = async (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".vcf") && !ext.endsWith(".vcard") && !ext.endsWith(".xlsx")) {
      toast.error("Unsupported file format. Please upload a .csv, .vcf, or .xlsx file.");
      return;
    }
    try {
      const result = await parseContactImportFile(file);
      if (result.headers.length === 0 || result.rows.length === 0) {
        toast.error("No contact rows found in the selected file.");
        return;
      }
      setParsedFile(result);
      const guessed = autoGuessFieldMapping(result.headers);
      setFieldMapping(guessed);
      setStep(2);
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse contact file");
    }
  };

  // Transform raw rows using current fieldMapping and evaluate validation/duplicates
  const evaluatedRows: EvaluatedRow[] = useMemo(() => {
    if (!parsedFile) return [];

    const seenPhonesInFile = new Set<string>();
    const seenEmailsInFile = new Set<string>();

    return parsedFile.rows.map((raw, idx) => {
      let fullName = "";
      let firstName = "";
      let lastName = "";
      const emails: string[] = [];
      const phones: string[] = [];
      let company = "";
      let jobTitle = "";
      let address = "";
      let city = "";
      let state = "";
      let zipCode = "";
      const notesParts: string[] = [];

      for (const header of parsedFile.headers) {
        const target = fieldMapping[header] || "skip";
        const val = (raw[header] || "").trim();
        if (!val || target === "skip") continue;

        if (target === "fullName") fullName = val;
        else if (target === "firstName") firstName = val;
        else if (target === "lastName") lastName = val;
        else if (target === "email" || target === "additionalEmail") {
          // Support semicolon/comma separated emails in a single cell (Google Contacts export)
          val
            .split(/[;,]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((e) => {
              if (!emails.some((ex) => ex.toLowerCase() === e.toLowerCase())) {
                emails.push(e);
              }
            });
        } else if (target === "phone" || target === "additionalPhone") {
          val
            .split(/[;,]|\s+:::\s+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((p) => {
              if (!phones.includes(p)) phones.push(p);
            });
        } else if (target === "company") company = company ? `${company} / ${val}` : val;
        else if (target === "jobTitle") jobTitle = jobTitle ? `${jobTitle} (${val})` : val;
        else if (target === "address") address = val;
        else if (target === "city") city = val;
        else if (target === "state") state = val;
        else if (target === "zipCode") zipCode = val;
        else if (target === "notes") notesParts.push(val);
      }

      if (!firstName && !lastName && fullName) {
        const parts = fullName.trim().split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ");
      } else if (firstName && !lastName && firstName.includes(" ")) {
        const parts = firstName.trim().split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ");
      }

      const missingName = !firstName && !lastName;
      const missingChannels = emails.length === 0 && phones.length === 0;
      const invalidEmails = emails.filter((e) => !isValidEmailFormat(e));
      const invalidPhones = phones.filter((p) => !isValidPhoneFormat(p));

      // Check duplicate within the uploaded file
      let duplicateInFile = false;
      for (const p of phones) {
        const norm = normalizePhoneDigits(p);
        if (norm.length >= 10) {
          if (seenPhonesInFile.has(norm)) duplicateInFile = true;
          seenPhonesInFile.add(norm);
        }
      }
      for (const e of emails) {
        const low = e.toLowerCase();
        if (seenEmailsInFile.has(low)) duplicateInFile = true;
        seenEmailsInFile.add(low);
      }

      // Check duplicate against existing Waypoint contacts (by phone or email — NEVER merge by name alone)
      let matchedExistingContact: ContactItem | null = null;
      let matchReason: string | null = null;
      let nameOnlyMatchWarning: ContactItem | null = null;

      for (const ex of existingContacts) {
        const exPhone = normalizePhoneDigits(ex.phone);
        const exEmail = (ex.email || "").trim().toLowerCase();

        const phoneHit =
          exPhone.length >= 10 && phones.some((p) => normalizePhoneDigits(p) === exPhone);
        const emailHit = exEmail.length > 0 && emails.some((e) => e.toLowerCase() === exEmail);

        if (phoneHit || emailHit) {
          matchedExistingContact = ex;
          matchReason =
            phoneHit && emailHit
              ? "Matching Phone & Email"
              : phoneHit
              ? "Matching Phone"
              : "Matching Email";
          break;
        }
      }

      if (!matchedExistingContact && (firstName || lastName)) {
        const fullLow = `${firstName} ${lastName}`.trim().toLowerCase();
        const sameName = existingContacts.find(
          (ex) => `${ex.firstName || ""} ${ex.lastName || ""}`.trim().toLowerCase() === fullLow
        );
        if (sameName) {
          nameOnlyMatchWarning = sameName;
        }
      }

      return {
        rowIndex: idx + 1,
        firstName,
        lastName,
        emails,
        phones,
        company,
        jobTitle,
        address,
        city,
        state,
        zipCode,
        notes: notesParts.join("\n"),
        missingName,
        missingChannels,
        invalidEmails,
        invalidPhones,
        duplicateInFile,
        matchedExistingContact,
        matchReason,
        nameOnlyMatchWarning,
      };
    });
  }, [parsedFile, fieldMapping, existingContacts]);

  const initializeStep4Selections = () => {
    const nextSel: Record<number, boolean> = {};
    const nextAct: Record<number, DuplicateAction> = {};

    for (const r of evaluatedRows) {
      const hasFatalMissing = r.missingName && r.missingChannels;
      nextSel[r.rowIndex] = !hasFatalMissing;
      if (r.matchedExistingContact || r.duplicateInFile) {
        // Default duplicates to Skip and never overwrite without explicit selection
        nextAct[r.rowIndex] = "skip";
      } else {
        nextAct[r.rowIndex] = "import";
      }
    }
    setSelectedRows(nextSel);
    setRowActions(nextAct);
    setStep(4);
  };

  const handleExecuteImport = () => {
    const payloadRows = evaluatedRows.map((r) => {
      const isChecked = selectedRows[r.rowIndex] ?? true;
      const chosenAction: DuplicateAction = !isChecked
        ? "skip"
        : rowActions[r.rowIndex] || (r.matchedExistingContact ? "skip" : "import");

      return {
        rowNumber: r.rowIndex,
        firstName: r.firstName,
        lastName: r.lastName,
        emails: r.emails,
        phones: r.phones,
        company: r.company || undefined,
        jobTitle: r.jobTitle || undefined,
        address: r.address || undefined,
        city: r.city || undefined,
        state: r.state || undefined,
        zipCode: r.zipCode || undefined,
        notes: r.notes || undefined,
        action: chosenAction,
        duplicateTargetId: r.matchedExistingContact?.id ?? undefined,
        overwriteExistingFields,
      };
    });

    importBatchMutation.mutate({
      sourceFormat: parsedFile?.format || "csv",
      rows: payloadRows,
    });
  };

  const handleDownloadErrorReport = () => {
    if (!importResults) return;
    const lines = [
      "Row,Contact Name,Status,Reason",
      ...importResults.results.map(
        (r) =>
          `${r.rowNumber},"${(r.name || "").replace(/"/g, '""')}",${r.status},"${(
            r.reason || ""
          ).replace(/"/g, '""')}"`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waypoint-contact-import-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepLabels: { num: ImportStep; title: string }[] = [
    { num: 1, title: "1. Upload" },
    { num: 2, title: "2. Match Fields" },
    { num: 3, title: "3. Preview" },
    { num: 4, title: "4. Import" },
    { num: 5, title: "5. Results" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-[#000820] border border-[#C5A059]/45 text-[#F0DFC5] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.9)]">
        {/* Top Modal Header + 5-Step Progress Indicator */}
        <div className="p-4 sm:p-5 pb-3.5 border-b border-[#C5A059]/25 bg-[#041028] shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="font-serif text-lg sm:text-xl font-bold text-[#FFF4D4] flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#C5A059]" />
                <span>Import Contacts</span>
              </DialogTitle>
              <p className="text-xs text-[#C6B697] mt-0.5">
                Import contacts from CSV, Google Contacts, Outlook, vCard (.vcf), or Excel (.xlsx).
              </p>
            </div>
            {parsedFile && (
              <Badge
                variant="outline"
                className="text-[11px] bg-[#091D38] text-[#FFE394] border-[#C5A059]/40 font-mono"
              >
                {parsedFile.fileName} ({parsedFile.rows.length} rows)
              </Badge>
            )}
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-5 gap-1.5">
            {stepLabels.map((s) => {
              const active = step === s.num;
              const done = step > s.num;
              return (
                <div
                  key={s.num}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[11px] font-serif font-bold text-center border transition-all truncate",
                    active
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]"
                      : done
                      ? "bg-[#091D38] text-[#FFE394] border-[#C5A059]/50"
                      : "bg-[#020A17]/80 text-[#7E97B8] border-[#1E3250]/60"
                  )}
                >
                  {s.title}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Body (Zero Horizontal Scroll) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4 min-h-0">
          {/* ─── STEP 1: UPLOAD ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processSelectedFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3",
                  isDragging
                    ? "border-[#FFE394] bg-[#091D38]/80"
                    : "border-[#C5A059]/45 bg-[#05142B]/80 hover:border-[#C5A059] hover:bg-[#081C3A]/80"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.vcf,.vcard,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processSelectedFile(file);
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-[#091D38] border border-[#C5A059]/50 flex items-center justify-center text-[#FFE394]">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="font-serif text-base font-bold text-[#FFF4D4]">
                    Drag & drop your contacts file here, or click to browse
                  </div>
                  <div className="text-xs text-[#C6B697]">
                    Supported formats: <strong className="text-[#FFE394]">.csv</strong> (Google Contacts, Outlook, Apple),{" "}
                    <strong className="text-[#FFE394]">.vcf</strong> (vCard), and{" "}
                    <strong className="text-[#FFE394]">.xlsx</strong> (Excel)
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-serif font-bold text-[#FFF4D4] flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#C5A059]" />
                    <span>Need a clean starting spreadsheet?</span>
                  </div>
                  <div className="text-[11px] text-[#C6B697]">
                    Download our pre-formatted CSV template with columns for multiple phones, emails, organization, and notes.
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="border-[#C5A059]/50 bg-[#020A17] text-[#FFE394] hover:bg-[#091D38] text-xs gap-1.5 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download CSV Template</span>
                </Button>
              </div>

              <div className="p-3 rounded-xl bg-[#020A17]/90 border border-[#1E3250] flex items-start gap-2.5 text-[11px] text-[#C6B697]">
                <ShieldCheck className="h-4 w-4 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#FFF4D4]">Privacy & Safety Guarantee:</strong> Importing contacts will{" "}
                  <strong>never</strong> automatically create client portal accounts, assign advocacy roles, send invitations, or trigger automated messages. Multiple phone numbers and email addresses are preserved.
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: MATCH FIELDS ─── */}
          {step === 2 && parsedFile && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-[#C6B697]">
                  We automatically matched your file columns below. Adjust any column mapping or choose{" "}
                  <strong className="text-[#FFE394]">Skip Column</strong> for fields you don't need.
                </div>
              </div>

              <div className="border border-[#3A2C18] rounded-xl overflow-hidden divide-y divide-[#1E3250]/70 bg-[#05142B]/90">
                {parsedFile.headers.map((header) => {
                  const sampleVal =
                    parsedFile.rows.find((r) => (r[header] || "").trim().length > 0)?.[header] ||
                    "—";
                  const currentTarget = fieldMapping[header] || "skip";
                  return (
                    <div
                      key={header}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#FFF4D4] truncate">
                          {header}
                        </div>
                        <div className="text-[11px] text-[#A69371] truncate">
                          Sample: <span className="text-[#E8D1A7] font-mono">{sampleVal}</span>
                        </div>
                      </div>
                      <div className="w-full sm:w-64 shrink-0">
                        <Select
                          value={currentTarget}
                          onValueChange={(val: MappedTargetField) =>
                            setFieldMapping((prev) => ({ ...prev, [header]: val }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#C5A059]/40 text-[#FFF4D4]">
                            {TARGET_FIELD_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── STEP 3: PREVIEW ─── */}
          {step === 3 && (
            <div className="space-y-3">
              {/* Summary Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18]">
                  <div className="text-[10px] uppercase tracking-wider text-[#A69371]">
                    Total Contacts
                  </div>
                  <div className="font-serif text-lg font-bold text-[#FFF4D4]">
                    {evaluatedRows.length}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18]">
                  <div className="text-[10px] uppercase tracking-wider text-[#A69371]">
                    Ready & Clean
                  </div>
                  <div className="font-serif text-lg font-bold text-emerald-400">
                    {
                      evaluatedRows.filter(
                        (r) =>
                          !r.missingName &&
                          !r.missingChannels &&
                          r.invalidEmails.length === 0 &&
                          r.invalidPhones.length === 0 &&
                          !r.matchedExistingContact &&
                          !r.duplicateInFile
                      ).length
                    }
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18]">
                  <div className="text-[10px] uppercase tracking-wider text-[#A69371]">
                    Potential Duplicates
                  </div>
                  <div className="font-serif text-lg font-bold text-amber-300">
                    {
                      evaluatedRows.filter(
                        (r) => Boolean(r.matchedExistingContact) || r.duplicateInFile
                      ).length
                    }
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18]">
                  <div className="text-[10px] uppercase tracking-wider text-[#A69371]">
                    Missing / Invalid Info
                  </div>
                  <div className="font-serif text-lg font-bold text-rose-400">
                    {
                      evaluatedRows.filter(
                        (r) =>
                          r.missingName ||
                          r.missingChannels ||
                          r.invalidEmails.length > 0 ||
                          r.invalidPhones.length > 0
                      ).length
                    }
                  </div>
                </div>
              </div>

              {/* Preview List */}
              <div className="border border-[#3A2C18] rounded-xl overflow-hidden divide-y divide-[#1E3250]/70 bg-[#05142B]/90">
                {evaluatedRows.map((r) => (
                  <div key={r.rowIndex} className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-[#7E97B8]">#{r.rowIndex}</span>
                        <span className="text-xs font-serif font-bold text-[#FFF4D4]">
                          {r.firstName || r.lastName
                            ? `${r.firstName} ${r.lastName}`.trim()
                            : "(No Name Provided)"}
                        </span>
                        {r.company && (
                          <span className="text-[11px] text-[#C6B697]">• {r.company}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.matchedExistingContact && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-950/40 text-amber-300 border-amber-600/60"
                          >
                            Duplicate: {r.matchReason} ({r.matchedExistingContact.firstName}{" "}
                            {r.matchedExistingContact.lastName})
                          </Badge>
                        )}
                        {r.duplicateInFile && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-950/40 text-amber-300 border-amber-600/60"
                          >
                            Duplicate Inside File
                          </Badge>
                        )}
                        {r.nameOnlyMatchWarning && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-blue-950/40 text-blue-300 border-blue-600/60"
                          >
                            Same Name Only — Not Auto-Merged
                          </Badge>
                        )}
                        {r.missingName && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-rose-950/40 text-rose-300 border-rose-700/60"
                          >
                            Missing Name
                          </Badge>
                        )}
                        {r.missingChannels && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-950/30 text-amber-200 border-amber-700/50"
                          >
                            No Phone or Email
                          </Badge>
                        )}
                        {r.invalidEmails.length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-rose-950/40 text-rose-300 border-rose-700/60"
                          >
                            Invalid Email ({r.invalidEmails.join(", ")})
                          </Badge>
                        )}
                        {r.invalidPhones.length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-rose-950/40 text-rose-300 border-rose-700/60"
                          >
                            Invalid Phone ({r.invalidPhones.join(", ")})
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-[#C6B697] flex items-center gap-3 flex-wrap">
                      <span>
                        Phones:{" "}
                        <strong className="text-[#FFF4D4]">
                          {r.phones.length > 0 ? r.phones.join(", ") : "—"}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Emails:{" "}
                        <strong className="text-[#FFF4D4]">
                          {r.emails.length > 0 ? r.emails.join(", ") : "—"}
                        </strong>
                      </span>
                      {r.jobTitle && (
                        <>
                          <span>•</span>
                          <span>Role: {r.jobTitle}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── STEP 4: IMPORT & DUPLICATE RESOLUTION ─── */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-serif font-bold text-[#FFF4D4]">
                    Select Contacts & Duplicate Handling
                  </div>
                  <div className="text-[11px] text-[#C6B697]">
                    Duplicates default to <strong className="text-[#FFE394]">Skip</strong>. Existing fields are never overwritten unless you explicitly select Merge and enable overwrite below.
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#FFE394] cursor-pointer shrink-0">
                  <Checkbox
                    checked={overwriteExistingFields}
                    onCheckedChange={(v) => setOverwriteExistingFields(Boolean(v))}
                  />
                  <span>Allow Merge to overwrite non-empty fields</span>
                </label>
              </div>

              <div className="border border-[#3A2C18] rounded-xl overflow-hidden divide-y divide-[#1E3250]/70 bg-[#05142B]/90">
                {evaluatedRows.map((r) => {
                  const isChecked = selectedRows[r.rowIndex] ?? true;
                  const action =
                    rowActions[r.rowIndex] || (r.matchedExistingContact ? "skip" : "import");
                  const isDuplicate = Boolean(r.matchedExistingContact) || r.duplicateInFile;

                  return (
                    <div
                      key={r.rowIndex}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(v) =>
                            setSelectedRows((prev) => ({
                              ...prev,
                              [r.rowIndex]: Boolean(v),
                            }))
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-serif font-bold text-[#FFF4D4]">
                              {r.firstName || r.lastName
                                ? `${r.firstName} ${r.lastName}`.trim()
                                : `Row #${r.rowIndex}`}
                            </span>
                            {r.matchedExistingContact && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-950/40 text-amber-300 border-amber-600/60"
                              >
                                Matches {r.matchedExistingContact.firstName}{" "}
                                {r.matchedExistingContact.lastName} ({r.matchReason})
                              </Badge>
                            )}
                            {r.duplicateInFile && !r.matchedExistingContact && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-950/40 text-amber-300 border-amber-600/60"
                              >
                                Duplicate in File
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-[#C6B697] truncate">
                            {r.phones.join(", ") || "No phone"} •{" "}
                            {r.emails.join(", ") || "No email"}
                          </div>
                        </div>
                      </div>

                      <div className="w-full sm:w-48 shrink-0">
                        <Select
                          value={isChecked ? action : "skip"}
                          disabled={!isChecked}
                          onValueChange={(val: DuplicateAction) =>
                            setRowActions((prev) => ({ ...prev, [r.rowIndex]: val }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#C5A059]/40 text-[#FFF4D4]">
                            {!isDuplicate && <SelectItem value="import">Import Contact</SelectItem>}
                            <SelectItem value="skip">Skip (Default for Duplicates)</SelectItem>
                            {r.matchedExistingContact && (
                              <SelectItem value="merge">Merge with Existing</SelectItem>
                            )}
                            <SelectItem value="create_separate">Create Separate Contact</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── STEP 5: RESULTS ─── */}
          {step === 5 && importResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#05142B]/90 border border-emerald-700/50">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300">
                    Imported
                  </div>
                  <div className="font-serif text-2xl font-bold text-emerald-400">
                    {importResults.importedCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#05142B]/90 border border-cyan-700/50">
                  <div className="text-[10px] uppercase tracking-wider text-cyan-300">
                    Merged
                  </div>
                  <div className="font-serif text-2xl font-bold text-cyan-400">
                    {importResults.mergedCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#05142B]/90 border border-amber-700/50">
                  <div className="text-[10px] uppercase tracking-wider text-amber-300">
                    Skipped
                  </div>
                  <div className="font-serif text-2xl font-bold text-amber-300">
                    {importResults.skippedCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#05142B]/90 border border-rose-700/50">
                  <div className="text-[10px] uppercase tracking-wider text-rose-300">
                    Failed
                  </div>
                  <div className="font-serif text-2xl font-bold text-rose-400">
                    {importResults.failedCount}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#05142B]/90 border border-[#3A2C18]">
                <div className="text-xs text-[#C6B697]">
                  Detailed row-by-row import log and reasons are listed below.
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadErrorReport}
                  className="border-[#C5A059]/50 bg-[#020A17] text-[#FFE394] hover:bg-[#091D38] text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Import Report (.CSV)</span>
                </Button>
              </div>

              <div className="border border-[#3A2C18] rounded-xl overflow-hidden divide-y divide-[#1E3250]/70 bg-[#05142B]/90 max-h-64 overflow-y-auto">
                {importResults.results.map((res) => (
                  <div
                    key={res.rowNumber}
                    className="p-2.5 px-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-[#7E97B8] mr-2">#{res.rowNumber}</span>
                      <span className="font-semibold text-[#FFF4D4]">{res.name}</span>
                      {res.reason && (
                        <span className="text-[11px] text-[#C6B697] ml-2">• {res.reason}</span>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] shrink-0",
                        res.status === "imported" &&
                          "bg-emerald-950/40 text-emerald-300 border-emerald-700",
                        res.status === "merged" &&
                          "bg-cyan-950/40 text-cyan-300 border-cyan-700",
                        res.status === "skipped" &&
                          "bg-amber-950/40 text-amber-300 border-amber-700",
                        res.status === "failed" &&
                          "bg-rose-950/40 text-rose-300 border-rose-700"
                      )}
                    >
                      {res.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="p-4 border-t border-[#C5A059]/25 bg-[#041028] flex items-center justify-between gap-3 shrink-0">
          <div>
            {step > 1 && step < 5 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setStep((prev) => (prev - 1) as ImportStep)}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleClose(false)}
              className="text-xs text-[#C6B697] hover:text-white"
            >
              {step === 5 ? "Done" : "Cancel"}
            </Button>

            {step === 2 && (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep(3)}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs gap-1.5"
              >
                <span>Preview Contacts</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            {step === 3 && (
              <Button
                type="button"
                size="sm"
                onClick={initializeStep4Selections}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs gap-1.5"
              >
                <span>Configure Import</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            {step === 4 && (
              <Button
                type="button"
                size="sm"
                disabled={importBatchMutation.isPending}
                onClick={handleExecuteImport}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs gap-1.5"
              >
                {importBatchMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing Contacts...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Import Selected Contacts</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

