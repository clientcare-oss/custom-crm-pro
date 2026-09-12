import React, { useState } from "react";
import {
  FileEdit,
  Save,
  UserPlus,
  Calendar,
  PhoneCall,
  Mail,
  UserCheck,
  CheckCircle2,
  Tag,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export interface IntakeFormData {
  parentName: string;
  phone: string;
  email: string;
  studentName: string;
  ageGrade: string;
  state: string;
  schoolDistrict: string;
  notes: string;
  selectedIssues: string[];
}

interface CallIntakeSectionProps {
  formData: IntakeFormData;
  setFormData: React.Dispatch<React.SetStateAction<IntakeFormData>>;
  onScheduleDiscovery?: () => void;
  onClearForm?: () => void;
}

const ISSUE_TAGS = [
  "IEP",
  "504",
  "Evaluation",
  "Behavior",
  "Placement",
  "Discipline",
  "Bullying",
  "Services",
  "Other",
];

export function CallIntakeSection({
  formData,
  setFormData,
  onScheduleDiscovery,
  onClearForm,
}: CallIntakeSectionProps) {
  const utils = trpc.useUtils();
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead created and added to pipeline");
      utils.leads.list.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to create lead: ${err.message}`);
    },
  });

  const toggleIssueTag = (tag: string) => {
    setFormData((prev) => {
      const exists = prev.selectedIssues.includes(tag);
      return {
        ...prev,
        selectedIssues: exists
          ? prev.selectedIssues.filter((t) => t !== tag)
          : [...prev.selectedIssues, tag],
      };
    });
  };

  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    try {
      localStorage.setItem("waypoint_call_intake_draft", JSON.stringify(formData));
      toast.success("Intake draft saved locally");
    } catch {
      toast.error("Failed to save draft locally");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCreateLead = () => {
    if (!formData.parentName.trim() && !formData.studentName.trim()) {
      toast.error("Please enter a Parent or Student name before creating a lead");
      return;
    }
    const combinedNotes = [
      formData.selectedIssues.length > 0 ? `Issues: ${formData.selectedIssues.join(", ")}` : "",
      formData.schoolDistrict ? `School/District: ${formData.schoolDistrict}` : "",
      formData.notes,
    ]
      .filter(Boolean)
      .join("\n\n");

    createLeadMutation.mutate({
      parentName: formData.parentName || undefined,
      parentPhone: formData.phone || undefined,
      studentName: formData.studentName || undefined,
      studentGrade: formData.ageGrade || undefined,
      source: "Call Center Inbound",
      notes: combinedNotes,
      status: "New",
    });
  };

  const handleRequestCallback = () => {
    toast.success("Callback task created for practice team");
  };

  const handleSendInfo = () => {
    if (!formData.email && !formData.phone) {
      toast.error("Enter phone or email to send intake materials");
      return;
    }
    toast.success(`Advocacy welcome guide queued for ${formData.email || formData.phone}`);
  };

  return (
    <div className="rounded-2xl bg-[#061830] border border-sky-500/20 p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-white font-bold text-base tracking-tight">
          <FileEdit className="h-4.5 w-4.5 text-sky-400" />
          <span>Call Intake</span>
        </div>
        <div className="flex items-center gap-2">
          {onClearForm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearForm}
              className="text-slate-400 hover:text-white text-xs h-8 px-2 rounded-lg gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs font-semibold gap-1.5 h-8 rounded-xl"
          >
            <Save className="h-3.5 w-3.5" />
            Save as Draft
          </Button>
        </div>
      </div>

      {/* Row 1: Parent / Guardian, Phone, Email */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-300 font-medium">Parent / Guardian Name</Label>
          <Input
            value={formData.parentName}
            onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
            placeholder="Enter name"
            className="bg-[#040D1A] border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:border-amber-400 text-sm h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-300 font-medium">Phone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(   )   -    "
            className="bg-[#040D1A] border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:border-amber-400 text-sm h-9 font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-300 font-medium">Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email"
            className="bg-[#040D1A] border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:border-amber-400 text-sm h-9"
          />
        </div>
      </div>

      {/* Row 2: Student Name, Age / Grade, State, School / District */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-300 font-medium">Student Name</Label>
          <Input
            value={formData.studentName}
            onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
            placeholder="Enter student name"
            className="bg-[#040D1A] border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:border-amber-400 text-sm h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-300 font-medium">Age / Grade</Label>
          <Input
            value={formData.ageGrade}
            onChange={(e) => setFormData({ ...formData, ageGrade: e.target.value })}
            placeholder="e.g. 3rd Grade"
            className="bg-[#040D1A] border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:border-amber-400 text-sm h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-300 font-medium">State</Label>
          <Select
            value={formData.state}
            onValueChange={(val) => setFormData({ ...formData, state: val })}
          >
            <SelectTrigger className="bg-[#040D1A] border-slate-800 text-white rounded-xl focus:border-amber-400 text-sm h-9">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent className="bg-[#061830] border-slate-700 text-slate-100">
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Florida">Florida</SelectItem>
              <SelectItem value="Alabama">Alabama</SelectItem>
              <SelectItem value="Tennessee">Tennessee</SelectItem>
              <SelectItem value="North Carolina">North Carolina</SelectItem>
              <SelectItem value="South Carolina">South Carolina</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-300 font-medium">School / District</Label>
          <Input
            value={formData.schoolDistrict}
            onChange={(e) => setFormData({ ...formData, schoolDistrict: e.target.value })}
            placeholder="School or district"
            className="bg-[#040D1A] border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:border-amber-400 text-sm h-9"
          />
        </div>
      </div>

      {/* Large Notes Area: What's going on? */}
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-300 font-medium">What's going on?</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Take notes about the call, inquiry, or next steps..."
          rows={3}
          className="bg-[#040D1A] border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:border-amber-400 text-sm resize-y leading-relaxed"
        />
      </div>

      {/* Issue Tags */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Tag className="h-3 w-3 text-sky-400" />
          <span>Issue Tags:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ISSUE_TAGS.map((tag) => {
            const isSelected = formData.selectedIssues.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleIssueTag(tag)}
                className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                    : "bg-[#040D1A] text-slate-300 border-slate-700/80 hover:border-sky-400 hover:text-white"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Context-Aware Next Actions Buttons matching reference design */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
        <Button
          onClick={handleCreateLead}
          disabled={createLeadMutation.isPending}
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs h-8 px-3 rounded-lg gap-1.5"
        >
          {createLeadMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          Create Lead
        </Button>

        {onScheduleDiscovery && (
          <Button
            variant="outline"
            onClick={onScheduleDiscovery}
            className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs h-8 px-3 rounded-lg gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedule Discovery
          </Button>
        )}

        <Button
          variant="outline"
          onClick={handleRequestCallback}
          className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs h-8 px-3 rounded-lg gap-1.5"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          Request Callback
        </Button>

        <Button
          variant="outline"
          onClick={handleSendInfo}
          className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs h-8 px-3 rounded-lg gap-1.5"
        >
          <Mail className="h-3.5 w-3.5" />
          Send Information
        </Button>

        <Button
          variant="ghost"
          onClick={() => toast.info("Attaching notes to existing student...")}
          className="text-slate-400 hover:text-white text-xs h-8 px-2.5 rounded-lg"
        >
          Add to Existing Client
        </Button>

        <Button
          variant="ghost"
          onClick={() => toast.success("Marked as Client")}
          className="text-emerald-400 hover:text-emerald-300 text-xs h-8 px-2.5 rounded-lg ml-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Mark as Client
        </Button>
      </div>
    </div>
  );
}

export default CallIntakeSection;
