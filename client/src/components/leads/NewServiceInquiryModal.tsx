import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  Users,
  Phone,
  Mail,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export interface InquiryStudentDraft {
  firstName: string;
  lastName: string;
  gradeLevel: string;
  schoolName: string;
  iepOr504: string;
}

interface NewServiceInquiryFormProps {
  initialPhone?: string;
  initialName?: string;
  originatingCallLogId?: number;
  initialCallNotes?: string;
  onSuccess?: (result: {
    leadId: number;
    parentContactId: number;
    stage: string;
  }) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function NewServiceInquiryForm({
  initialPhone = "",
  initialName = "",
  originatingCallLogId,
  initialCallNotes = "",
  onSuccess,
  onCancel,
  compact = false,
}: NewServiceInquiryFormProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const nameParts = initialName.trim().split(/\s+/);
  const [parentFirstName, setParentFirstName] = useState(nameParts[0] || "");
  const [parentLastName, setParentLastName] = useState(nameParts.slice(1).join(" ") || "");
  const [parentPhone, setParentPhone] = useState(initialPhone);
  const [parentEmail, setParentEmail] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("Phone");
  const [availability, setAvailability] = useState("");

  const [students, setStudents] = useState<InquiryStudentDraft[]>([
    {
      firstName: "",
      lastName: "",
      gradeLevel: "",
      schoolName: "",
      iepOr504: "IEP",
    },
  ]);

  const [concerns, setConcerns] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [callNotes, setCallNotes] = useState(initialCallNotes);

  // Duplicate match check state
  const [bypassMatchCheck, setBypassMatchCheck] = useState(false);
  const [savedResult, setSavedResult] = useState<{
    leadId: number;
    parentContactId: number;
    stage: string;
    confirmation: string;
  } | null>(null);

  const shouldCheckMatches = Boolean(
    (parentEmail.trim().length > 4 ||
      parentPhone.replace(/\D/g, "").length >= 10 ||
      (parentFirstName.trim().length > 1 && parentLastName.trim().length > 1)) &&
      !savedResult
  );

  const { data: matchData } = trpc.leads.checkMatches.useQuery(
    {
      parentFirstName: parentFirstName.trim(),
      parentLastName: parentLastName.trim(),
      parentEmail: parentEmail.trim(),
      parentPhone: parentPhone.trim(),
      studentName: students[0]?.firstName?.trim(),
    },
    {
      enabled: shouldCheckMatches,
    }
  );

  const potentialMatches = matchData?.matches || [];

  const createInquiryMutation = trpc.leads.createInquiry.useMutation({
    onSuccess: (res) => {
      utils.leads.list.invalidate();
      utils.leads.listHydrated.invalidate();
      utils.contacts.list.invalidate();
      utils.callLogs.listAll.invalidate();
      utils.callLogs.listUnassigned.invalidate();
      utils.callLogs.unassignedCount.invalidate();
      setSavedResult({
        leadId: res.leadId,
        parentContactId: res.parentContactId,
        stage: res.stage || "inquiry",
        confirmation: res.confirmation || "Inquiry saved · Ready for discovery",
      });
      toast.success("Inquiry saved · Ready for discovery");
      if (onSuccess) {
        onSuccess({
          leadId: res.leadId,
          parentContactId: res.parentContactId,
          stage: res.stage || "inquiry",
        });
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save service inquiry");
    },
  });

  const handleAddStudent = () => {
    setStudents((prev) => [
      ...prev,
      {
        firstName: "",
        lastName: parentLastName || "",
        gradeLevel: "",
        schoolName: "",
        iepOr504: "IEP",
      },
    ]);
  };

  const handleRemoveStudent = (idx: number) => {
    if (students.length <= 1) return;
    setStudents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStudentChange = (
    idx: number,
    field: keyof InquiryStudentDraft,
    value: string
  ) => {
    setStudents((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = (
    e: React.FormEvent,
    options?: { existingContactId?: number; forceCreateSeparate?: boolean }
  ) => {
    e.preventDefault();
    if (!parentFirstName.trim()) {
      toast.error("Please enter the parent or guardian's first name.");
      return;
    }
    if (!parentPhone.trim() && !parentEmail.trim()) {
      toast.error("Please provide at least a phone number or email address.");
      return;
    }
    const validStudents = students
      .filter((s) => s.firstName.trim())
      .map((s) => ({
        firstName: s.firstName.trim(),
        lastName: (s.lastName || parentLastName || "").trim(),
        gradeLevel: s.gradeLevel.trim() || undefined,
        schoolName: s.schoolName.trim() || undefined,
        iepOr504: s.iepOr504 || "IEP",
      }));

    if (validStudents.length === 0) {
      toast.error("Please enter at least one student's first name.");
      return;
    }

    createInquiryMutation.mutate({
      existingContactId: options?.existingContactId,
      forceCreateSeparate: options?.forceCreateSeparate || bypassMatchCheck,
      parent: {
        firstName: parentFirstName.trim(),
        lastName: parentLastName.trim() || "Family",
        phone: parentPhone.trim() || undefined,
        email: parentEmail.trim() || undefined,
        preferredContactMethod,
        availability: availability.trim() || undefined,
      },
      students: validStudents,
      concerns: concerns.trim(),
      desiredOutcome: desiredOutcome.trim(),
      source: originatingCallLogId ? "Call Center Inquiry" : "Lead Center Inquiry",
      originatingCallLogId,
      callNotes: callNotes.trim() || undefined,
    });
  };

  // Compact Confirmation State after saving
  if (savedResult) {
    return (
      <div
        data-testid="inquiry-saved-confirmation"
        className="rounded-xl border border-[#1E3A6D] bg-[#040D26] p-6 text-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.65)] space-y-5"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-white tracking-tight">
              Inquiry saved · Ready for discovery
            </p>
            <p className="text-xs text-slate-300">
              {parentFirstName} {parentLastName} and{" "}
              {students.filter((s) => s.firstName.trim()).length} student(s) are connected to a single Lead Center workspace.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            type="button"
            data-testid="open-in-lead-center-btn"
            onClick={() =>
              setLocation(`/leads/${savedResult.leadId}/${savedResult.stage || "inquiry"}`)
            }
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold hover:brightness-110 cursor-pointer"
          >
            Go to Lead Center →
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-[#1E3358] bg-[#071333] text-slate-200 hover:bg-[#0D1E47] cursor-pointer"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => handleSubmit(e)}
      data-testid="new-service-inquiry-form"
      className={`space-y-5 text-slate-100 ${compact ? "" : "p-1"}`}
    >
      {/* Existing Contact / Lead Match Warning Banner */}
      {potentialMatches.length > 0 && !bypassMatchCheck && (
        <div
          data-testid="inquiry-match-alert"
          className="rounded-xl border border-[#D4AF37]/45 bg-[#0A193B] p-4 space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#FFE394] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#FFE394]">
                Matching family or lead record found
              </p>
              <p className="text-[11px] text-slate-300">
                Review the matching record below. Choose to open or update the existing family record, or keep them separate if this is a different family.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {potentialMatches.map((m) => (
              <div
                key={m.contactId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#1E3358] bg-[#040D26] p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">
                      {m.parentName}
                    </span>
                    <Badge className="bg-[#102347] text-[#FFE394] border-[#D4AF37]/40 text-[10px]">
                      Stage: {m.stageLabel}
                    </Badge>
                    {m.isAmbiguous && (
                      <Badge className="bg-blue-950/70 text-blue-200 border-blue-400/30 text-[10px]">
                        Ambiguous match — verify before merging
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {m.reason}
                    {m.students.length > 0
                      ? ` · Students: ${m.students.map((s) => s.name).join(", ")}`
                      : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {m.leadId ? (
                    <Button
                      type="button"
                      size="sm"
                      data-testid={`match-open-lead-${m.leadId}`}
                      onClick={() =>
                        setLocation(`/leads/${m.leadId}/${m.currentStage || "inquiry"}`)
                      }
                      className="h-8 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold cursor-pointer"
                    >
                      Open in Lead Center →
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => handleSubmit(e, { existingContactId: m.contactId })}
                      className="h-8 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold cursor-pointer"
                    >
                      Use Existing Family
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              data-testid="create-separate-inquiry-btn"
              onClick={() => setBypassMatchCheck(true)}
              className="text-[11px] text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer"
            >
              Not the same family — create separate record
            </button>
          </div>
        </div>
      )}

      {/* 1. Parent or Guardian Contact Information */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Parent / Guardian Information
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-300 mb-1 block">
              First Name *
            </label>
            <Input
              value={parentFirstName}
              onChange={(e) => setParentFirstName(e.target.value)}
              placeholder="e.g. Sarah"
              className="h-9 bg-[#040D26] border-[#162952] text-white text-xs"
              required
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-300 mb-1 block">
              Last Name *
            </label>
            <Input
              value={parentLastName}
              onChange={(e) => setParentLastName(e.target.value)}
              placeholder="e.g. Sheep"
              className="h-9 bg-[#040D26] border-[#162952] text-white text-xs"
              required
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-300 mb-1 block">
              Phone Number
            </label>
            <Input
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="(404) 555-0192"
              className="h-9 bg-[#040D26] border-[#162952] text-white text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-300 mb-1 block">
              Email Address
            </label>
            <Input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
              className="h-9 bg-[#040D26] border-[#162952] text-white text-xs"
            />
          </div>
        </div>

        {/* Preferred Contact Method & Availability */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-300 mb-1 block">
              Preferred Contact Method
            </label>
            <div className="flex items-center gap-1.5">
              {["Phone", "Email", "Text / SMS"].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPreferredContactMethod(method)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    preferredContactMethod === method
                      ? "bg-[#102347] border-[#D4AF37]/60 text-[#FFE394]"
                      : "bg-[#040D26] border-[#162952] text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-300 mb-1 block">
              Availability / Best Time to Reach
            </label>
            <Input
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="e.g. Weekday mornings before 11am"
              className="h-9 bg-[#040D26] border-[#162952] text-white text-xs"
            />
          </div>
        </div>
      </div>

      {/* 2. Student Information (Supports Multiple Students) */}
      <div className="space-y-3 pt-2 border-t border-[#162952]">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Student Information ({students.length})
          </h4>
          <button
            type="button"
            data-testid="add-student-btn"
            onClick={handleAddStudent}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#FFE394] hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Another Student
          </button>
        </div>

        <div className="space-y-2.5">
          {students.map((stu, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#162952] bg-[#040D26]/90 p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300">
                  Student {idx + 1}
                </span>
                {students.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStudent(idx)}
                    className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove student"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <Input
                  value={stu.firstName}
                  onChange={(e) => handleStudentChange(idx, "firstName", e.target.value)}
                  placeholder="Student First Name *"
                  className="h-8.5 bg-[#02091A] border-[#162952] text-white text-xs"
                  required={idx === 0}
                />
                <Input
                  value={stu.lastName}
                  onChange={(e) => handleStudentChange(idx, "lastName", e.target.value)}
                  placeholder={parentLastName ? `Last (${parentLastName})` : "Last Name"}
                  className="h-8.5 bg-[#02091A] border-[#162952] text-white text-xs"
                />
                <Input
                  value={stu.gradeLevel}
                  onChange={(e) => handleStudentChange(idx, "gradeLevel", e.target.value)}
                  placeholder="Grade (e.g. Grade 5)"
                  className="h-8.5 bg-[#02091A] border-[#162952] text-white text-xs"
                />
                <select
                  value={stu.iepOr504}
                  onChange={(e) => handleStudentChange(idx, "iepOr504", e.target.value)}
                  className="h-8.5 rounded-md bg-[#02091A] border border-[#162952] px-2.5 text-xs text-white"
                >
                  <option value="IEP">IEP</option>
                  <option value="504 Plan">504 Plan</option>
                  <option value="Evaluation Needed">Seeking Evaluation</option>
                  <option value="General">Unsure / Other</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Concerns & Desired Outcome */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#162952]">
        <div>
          <label className="text-[11px] font-medium text-slate-300 mb-1 block">
            Main Concerns *
          </label>
          <Textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="What is happening at school right now? What prompted the family to reach out?"
            rows={3}
            className="bg-[#040D26] border-[#162952] text-white text-xs resize-none"
            required
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-300 mb-1 block">
            Desired Outcome
          </label>
          <Textarea
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            placeholder="What is the family hoping changes or gets resolved?"
            rows={3}
            className="bg-[#040D26] border-[#162952] text-white text-xs resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-[#1E3358] bg-[#040D26] text-slate-300 hover:text-white cursor-pointer"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          data-testid="save-inquiry-btn"
          disabled={createInquiryMutation.isPending}
          className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold hover:brightness-110 cursor-pointer"
        >
          {createInquiryMutation.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Saving Inquiry...
            </>
          ) : (
            "Save Service Inquiry"
          )}
        </Button>
      </div>
    </form>
  );
}

export function NewServiceInquiryModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result: { leadId: number; parentContactId: number; stage: string }) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#1E3358] bg-[#000820] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)] my-8">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#162952]">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#D8B979]">
              New Service Inquiry
            </span>
            <h2
              className="text-xl font-serif text-white mt-0.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Create Family Service Inquiry
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg border border-[#1E3358] bg-[#040D26]"
          >
            Close
          </button>
        </div>
        <NewServiceInquiryForm
          onCancel={() => onOpenChange(false)}
          onSuccess={(res) => {
            onSuccess?.(res);
          }}
        />
      </div>
    </div>
  );
}

