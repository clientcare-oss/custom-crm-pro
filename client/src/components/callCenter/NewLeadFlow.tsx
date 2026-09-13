import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  UserPlus,
  Calendar,
  DollarSign,
  FileSignature,
  CheckCircle2,
  Phone,
  Mail,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Send,
} from "lucide-react";

const ISSUE_OPTIONS = [
  "IEP",
  "504 Plan",
  "Evaluation Denied",
  "Behavior / FBA / BIP",
  "Placement Dispute",
  "Discipline / MDR",
  "State Complaint",
  "School Communication",
  "District Transfer",
  "Speech / OT Services",
  "Other",
];

export function NewLeadFlow() {
  const { call, updateCall } = useActiveCall();
  const utils = trpc.useUtils();

  // Form states initialized from active call
  const [parentName, setParentName] = useState(call.callerInfo.name || "");
  const [phone, setPhone] = useState(call.callerInfo.phone || "");
  const [email, setEmail] = useState(call.callerInfo.email || "");
  const [preferredContact, setPreferredContact] = useState<"phone" | "email" | "sms">(
    call.callerInfo.preferredContact || "phone"
  );

  const [studentName, setStudentName] = useState(call.studentName || "");
  const [studentAge, setStudentAge] = useState<string>("");
  const [studentGrade, setStudentGrade] = useState<string>("");
  const [schoolDistrict, setSchoolDistrict] = useState<string>("Cobb County");
  const [state, setState] = useState<string>("Georgia");

  const [selectedIssues, setSelectedIssues] = useState<string[]>(call.selectedIssues || ["IEP"]);
  const [discoveryNotes, setDiscoveryNotes] = useState<string>("");
  const [createdLeadId, setCreatedLeadId] = useState<number | null>(null);

  // tRPC mutation to create lead
  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: (newLead: any) => {
      const id = newLead?.id || 1;
      setCreatedLeadId(id);
      updateCall({
        callerInfo: { name: parentName, phone, email, preferredContact },
        studentName,
        selectedIssues,
        wrapUp: {
          ...call.wrapUp,
          outcome: "Lead created",
          finalNotes: discoveryNotes || call.generalNotes,
          followUpNeeded: true,
          attachToType: "lead",
          attachToId: id,
        },
      });
      utils.leads.list.invalidate();
      toast.success("Lead record successfully created in Waypoint CRM!");
    },
    onError: (err) => {
      toast.error(`Failed to create lead: ${err.message}`);
    },
  });

  const handleToggleIssue = (issue: string) => {
    const next = selectedIssues.includes(issue)
      ? selectedIssues.filter((i) => i !== issue)
      : [...selectedIssues, issue];
    setSelectedIssues(next);
    updateCall({ selectedIssues: next });
  };

  const handleCreateLead = () => {
    if (!parentName.trim()) {
      toast.error("Please provide the parent or guardian's name");
      return;
    }

    createLeadMutation.mutate({
      parentName: parentName.trim(),
      parentPhone: phone.trim(),
      studentName: studentName.trim() || undefined,
      studentAge: studentAge ? parseInt(studentAge, 10) : undefined,
      studentGrade: studentGrade.trim() || undefined,
      source: "Inbound Call Intake",
      status: "New",
      notes: `[Call Intake Discovery]\nIssues: ${selectedIssues.join(", ")}\nDistrict: ${schoolDistrict}, ${state}\nPreferred Contact: ${preferredContact}\n\nNotes:\n${discoveryNotes}\n\n${call.generalNotes}`,
    });
  };

  return (
    <div className="p-5 rounded-2xl bg-[#092244] border border-emerald-500/30 space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              New Client Intake & Sales Discovery
            </h4>
            <p className="text-xs text-slate-300">
              Information captured here becomes the permanent lead record without manual re-entry.
            </p>
          </div>
        </div>

        {createdLeadId ? (
          <Badge className="bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1 gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Lead #{createdLeadId} Created
          </Badge>
        ) : (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-semibold">
            In Progress
          </Badge>
        )}
      </div>

      {/* Grid 1: Parent / Contact Info */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          Parent / Guardian Information
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="space-y-1">
            <Label className="text-slate-300">Parent Name *</Label>
            <Input
              value={parentName}
              onChange={(e) => {
                setParentName(e.target.value);
                updateCall({ callerInfo: { ...call.callerInfo, name: e.target.value } });
              }}
              placeholder="Full Name"
              className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">Phone Number *</Label>
            <Input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                updateCall({ callerInfo: { ...call.callerInfo, phone: e.target.value } });
              }}
              placeholder="(770) 555-0123"
              className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl font-mono focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">Email Address</Label>
            <Input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                updateCall({ callerInfo: { ...call.callerInfo, email: e.target.value } });
              }}
              placeholder="parent@example.com"
              className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">Preferred Contact</Label>
            <select
              value={preferredContact}
              onChange={(e) => setPreferredContact(e.target.value as any)}
              className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs h-9 focus:border-emerald-400 outline-none"
            >
              <option value="phone">Phone Call</option>
              <option value="sms">Text Message (SMS)</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid 2: Student Information */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5" />
          Student & School District
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="space-y-1">
            <Label className="text-slate-300">Student Name</Label>
            <Input
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value);
                updateCall({ studentName: e.target.value });
              }}
              placeholder="Child's First & Last"
              className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">Age</Label>
            <Input
              value={studentAge}
              onChange={(e) => setStudentAge(e.target.value)}
              placeholder="e.g. 10"
              className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">Grade</Label>
            <Input
              value={studentGrade}
              onChange={(e) => setStudentGrade(e.target.value)}
              placeholder="e.g. 4th Grade"
              className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">School District</Label>
            <Input
              value={schoolDistrict}
              onChange={(e) => setSchoolDistrict(e.target.value)}
              placeholder="e.g. Cobb County"
              className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">State</Label>
            <Input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Georgia"
              className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Grid 3: Issue Selector Chips */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-sky-300">
          Reason for Contacting Waypoint (Select all that apply)
        </div>
        <div className="flex flex-wrap gap-2">
          {ISSUE_OPTIONS.map((opt) => {
            const isSelected = selectedIssues.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleToggleIssue(opt)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-[#040D1A] border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid 4: Discovery Notes & Pricing Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-1.5">
          <Label className="text-xs text-slate-300 font-bold">
            Intake Discovery Notes & Observations
          </Label>
          <Textarea
            value={discoveryNotes}
            onChange={(e) => setDiscoveryNotes(e.target.value)}
            placeholder="Record parent's primary concern, school history, upcoming IEP meeting dates, or evaluation deadlines..."
            rows={4}
            className="bg-[#040D1A] border-slate-700 text-white text-xs rounded-xl focus:border-emerald-400"
          />
        </div>

        {/* Pricing & Service Guidance Box */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#061830] to-[#040D1A] border border-amber-400/30 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            Pricing Guidance
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            • <strong>Discovery Call (30 Min)</strong>: $250 consultation with Byron Honea.
            <br />• <strong>IEP Audit Package</strong>: $750 comprehensive document review.
            <br />• <strong>Full Representation</strong>: Scope-based monthly retainer.
          </p>
          <div className="pt-1 text-[11px] text-amber-200/90 italic">
            Scholarship/sponsor assistance available through Waypoint Giving Fund.
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCreateLead}
            disabled={createLeadMutation.isPending || !!createdLeadId}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <UserPlus className="h-4 w-4" />
            {createdLeadId ? "Lead Saved" : "Create Lead in CRM"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = "/scheduler";
            }}
            className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <Calendar className="h-4 w-4" />
            Schedule Discovery Call
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = "/smart-files";
            }}
            className="border-amber-400/30 text-amber-300 hover:bg-amber-400/10 text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <FileSignature className="h-4 w-4" />
            Send Agreement
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = "/invoices";
            }}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <DollarSign className="h-4 w-4" />
            Payment Link
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NewLeadFlow;
