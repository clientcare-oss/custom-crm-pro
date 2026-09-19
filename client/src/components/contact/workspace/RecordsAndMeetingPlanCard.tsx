import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileSearch,
  CalendarDays,
  FilePlus,
  Pencil,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Download,
  Eye,
  Plus,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Target,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VoiceTextarea from "@/components/VoiceTextarea";
import { toast } from "sonner";

interface RecordsAndMeetingPlanCardProps {
  contact: any;
  contactId: number;
  studentName: string;
  compass?: any;
  files: any[];
  appointments: any[];
  onCreateDocument?: (docType: string) => void;
  onOpenDoc?: (doc: any) => void;
  onSwitchTab: (tabKey: string) => void;
}

export function RecordsAndMeetingPlanCard({
  contact,
  contactId,
  studentName,
  compass,
  files,
  appointments,
  onCreateDocument,
  onOpenDoc,
  onSwitchTab,
}: RecordsAndMeetingPlanCardProps) {
  // Modal states
  const [showCreateDocModal, setShowCreateDocModal] = useState(false);
  const [selectedDocTemplate, setSelectedDocTemplate] = useState("records-review");
  const [docTitle, setDocTitle] = useState("");
  const [docNotes, setDocNotes] = useState("");

  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [meetingGoals, setMeetingGoals] = useState(
    "1. Increase speech therapy services to 60 min/wk.\n2. Embed sensory breaks & transition warnings into BIP.\n3. Request independent educational evaluation (IEE) in reading fluency."
  );
  const [recordsSummary, setRecordsSummary] = useState(
    "Comprehensive review of 3 years of school records, psychoeducational evaluation, and speech logs. Discrepancy noted in reading comprehension progress vs standardized testing. Prior written notice required for proposed service hour reductions."
  );

  // Next upcoming meeting
  const upcomingMeeting = appointments && appointments.length > 0 ? appointments[0] : null;
  const meetingDateStr = upcomingMeeting?.date || upcomingMeeting?.startTime
    ? new Date(upcomingMeeting.date || upcomingMeeting.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Sep 18, 2026";
  const meetingTitle = upcomingMeeting?.title || upcomingMeeting?.notes || "Annual IEP Review & Goal Planning";

  const handleGenerateDoc = () => {
    toast.success(`Generated document: ${docTitle || "Case Document"}`);
    setShowCreateDocModal(false);
    setDocTitle("");
    setDocNotes("");
  };

  const docTemplates = [
    {
      id: "records-review",
      title: "Records Review Summary",
      desc: "Formal synthesis of academic history, evaluation metrics, and identified IEP gaps.",
      icon: FileSearch,
    },
    {
      id: "meeting-plan",
      title: "Meeting Strategy & Agenda Brief",
      desc: "Advocate road-map: parent concerns, negotiation objectives, and anticipated pushback.",
      icon: CalendarDays,
    },
    {
      id: "parent-concerns",
      title: "Formal Parent Concerns Letter",
      desc: "Official written input statement for mandatory inclusion in meeting minutes.",
      icon: FileText,
    },
    {
      id: "pwn-request",
      title: "Prior Written Notice (PWN) Request",
      desc: "Statutory demand for school district written justification and data evidence.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-[#061833] border border-[#0D366B] p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#0D366B]/80 pb-3.5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F5B544]/15 border border-[#F5B544]/30 flex items-center justify-center shrink-0">
            <FileSearch className="h-5 w-5 text-[#F5B544]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-white tracking-tight">
              Records Review & Meeting Strategy
            </h2>
            <p className="text-xs text-slate-300">
              Active case analysis, upcoming meeting objectives, and document generator.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <Button
            size="sm"
            onClick={() => setShowEditPlanModal(true)}
            variant="outline"
            className="h-8 px-3 text-xs border-[#0E3A73] bg-[#071F42] hover:bg-[#0A2954] text-slate-200 hover:text-white cursor-pointer rounded-lg"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5 text-[#F5B544]" />
            Edit Review & Plan
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setDocTitle(`Records Review Report — ${studentName}`);
              setShowCreateDocModal(true);
            }}
            className="h-8 px-3.5 text-xs font-bold bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B] shadow-md cursor-pointer rounded-lg inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Document
          </Button>
        </div>
      </div>

      {/* 2-Column Main Deck: Records Review (Left) vs Meeting Plan (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        {/* LEFT COLUMN: Records Review Hub (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-gradient-to-b from-[#0B254E] to-[#061836] border-2 border-sky-500/40 p-4 sm:p-5 flex flex-col justify-between shadow-xl shadow-black/30 space-y-4 relative overflow-hidden group">
          {/* Top cyan accent stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-transparent" />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0">
                  <FileSearch className="h-4 w-4 text-sky-300" />
                </div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Case Records Review
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Analysis Complete
              </span>
            </div>

            {/* Inner Content Panel (High-Contrast Solid Surface) */}
            <div className="rounded-xl bg-[#030D1D] border border-sky-500/30 p-3.5 text-xs text-slate-200 leading-relaxed space-y-2.5 shadow-inner">
              <p className="line-clamp-4 text-slate-100 font-normal">
                {recordsSummary}
              </p>
              <div className="pt-2.5 border-t border-sky-900/50 flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium text-slate-300">Evaluations, IEPs & Speech logs</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold font-mono text-[11px]">
                  {files.length > 0 ? `${files.length} documents on file` : "5 source files reviewed"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1 flex-wrap">
            <Button
              size="sm"
              onClick={() => onSwitchTab("files")}
              className="h-9 px-4 text-xs font-bold bg-sky-500 hover:bg-sky-400 text-[#041122] shadow-md hover:shadow-sky-500/25 rounded-xl cursor-pointer transition-all flex items-center gap-2"
            >
              <Eye className="h-3.5 w-3.5 text-[#041122]" />
              View Analyzed Records
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDocTitle(`Records Review Summary — ${studentName}`);
                setSelectedDocTemplate("records-review");
                setShowCreateDocModal(true);
              }}
              className="h-9 px-3.5 text-xs font-semibold bg-[#0A264F] hover:bg-[#0E336A] border border-sky-400/40 text-sky-100 hover:text-white rounded-xl cursor-pointer transition-all flex items-center gap-2"
            >
              <Download className="h-3.5 w-3.5 text-[#F5B544]" />
              Export Review Report
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming Meeting Strategy Plan (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-gradient-to-b from-[#0E264C] to-[#061836] border-2 border-amber-500/40 p-4 sm:p-5 flex flex-col justify-between shadow-xl shadow-black/30 space-y-4 relative overflow-hidden group">
          {/* Top amber accent stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-transparent" />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <Target className="h-4 w-4 text-[#F5B544]" />
                </div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Upcoming Meeting Strategy
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/60 text-amber-200 text-xs font-bold shadow-[0_0_10px_rgba(245,181,68,0.2)]">
                <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                {meetingDateStr}
              </span>
            </div>

            {/* Inner Content Panel (High-Contrast Solid Surface) */}
            <div className="rounded-xl bg-[#030D1D] border border-amber-500/30 p-3.5 text-xs text-slate-200 leading-relaxed space-y-2.5 shadow-inner">
              <div className="font-bold text-white text-xs flex items-center justify-between gap-2">
                <span className="truncate">{meetingTitle}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#F5B544]/20 border border-[#F5B544]/50 text-[#F5B544] shrink-0">
                  Advocate Strategy
                </span>
              </div>
              <div className="text-slate-100 whitespace-pre-line text-xs font-mono bg-[#051429] p-3 rounded-lg border border-amber-900/40 max-h-24 overflow-y-auto leading-relaxed">
                {meetingGoals}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1 flex-wrap">
            <Button
              size="sm"
              onClick={() => onSwitchTab("appointments")}
              className="h-9 px-4 text-xs font-bold bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B] shadow-md hover:shadow-amber-500/25 rounded-xl cursor-pointer transition-all flex items-center gap-2"
            >
              <CalendarDays className="h-3.5 w-3.5 text-[#07162B]" />
              Prep Meeting Briefing
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDocTitle(`Meeting Strategy Brief — ${studentName}`);
                setSelectedDocTemplate("meeting-plan");
                setShowCreateDocModal(true);
              }}
              className="h-9 px-3.5 text-xs font-semibold bg-[#0A264F] hover:bg-[#0E336A] border border-amber-400/40 text-amber-100 hover:text-white rounded-xl cursor-pointer transition-all flex items-center gap-2"
            >
              <FileText className="h-3.5 w-3.5 text-[#F5B544]" />
              Generate Meeting Brief
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Quick-Create Deliverable Strip */}
      <div className="pt-2 border-t border-[#0D366B]/80 relative z-10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FilePlus className="h-4 w-4 text-[#F5B544]" />
            Quick Document Generator
          </span>
          <span className="text-[11px] text-slate-400">
            Generate customized, print-ready advocate deliverables for {studentName}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {docTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setSelectedDocTemplate(template.id);
                  setDocTitle(`${template.title} — ${studentName}`);
                  setShowCreateDocModal(true);
                }}
                className="rounded-xl p-3 bg-[#071F42] hover:bg-[#0A2954] border border-[#13427E] hover:border-[#F5B544] text-left transition-all cursor-pointer group shadow-xs flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0F284F] flex items-center justify-center shrink-0 group-hover:bg-[#F5B544]/20 transition-colors">
                    <Icon className="h-3.5 w-3.5 text-sky-400 group-hover:text-[#F5B544] transition-colors" />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-[#F5B544] transition-colors truncate">
                    {template.title}
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-300 line-clamp-2 leading-snug">
                  {template.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal: Create Document */}
      <Dialog open={showCreateDocModal} onOpenChange={setShowCreateDocModal}>
        <DialogContent className="max-w-md bg-[#07162B] border-[#0E274D] text-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-[#F5B544]" />
              Create Case Document for {studentName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Document Type</Label>
              <select
                value={selectedDocTemplate}
                onChange={(e) => {
                  setSelectedDocTemplate(e.target.value);
                  const selected = docTemplates.find((t) => t.id === e.target.value);
                  if (selected) setDocTitle(`${selected.title} — ${studentName}`);
                }}
                className="w-full h-9 rounded-md bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-3 focus:ring-1 focus:ring-[#F5B544]"
              >
                {docTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-title" className="text-xs text-slate-300">Document Title *</Label>
              <Input
                id="doc-title"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Records Review Summary..."
                className="bg-[#0A1A33] border-[#0E274D] text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Special Notes or Advocate Instructions</Label>
              <VoiceTextarea
                rows={3}
                value={docNotes}
                onChange={(e: any) => setDocNotes(e.target.value)}
                placeholder="Include custom case highlights, specific IDEA statute citations, or parent priorities..."
                className="bg-[#0A1A33] border-[#0E274D] text-white text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDocModal(false)}
              className="border-[#0E274D] text-slate-300 hover:bg-white/[0.06] text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateDoc}
              disabled={!docTitle.trim()}
              className="bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs"
            >
              Generate & Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Review & Plan */}
      <Dialog open={showEditPlanModal} onOpenChange={setShowEditPlanModal}>
        <DialogContent className="max-w-lg bg-[#07162B] border-[#0E274D] text-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-[#F5B544]" />
              Edit Records Review & Meeting Strategy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Records Review Key Findings</Label>
              <VoiceTextarea
                rows={4}
                value={recordsSummary}
                onChange={(e: any) => setRecordsSummary(e.target.value)}
                placeholder="Synthesize psychoeducational evaluations, grades, behavior plans, and services history..."
                className="bg-[#0A1A33] border-[#0E274D] text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Upcoming Meeting Objectives & Strategy</Label>
              <VoiceTextarea
                rows={4}
                value={meetingGoals}
                onChange={(e: any) => setMeetingGoals(e.target.value)}
                placeholder="List numbered meeting objectives, counter-proposals, and parent non-negotiables..."
                className="bg-[#0A1A33] border-[#0E274D] text-white text-xs font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditPlanModal(false)}
              className="border-[#0E274D] text-slate-300 hover:bg-white/[0.06] text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Records review and meeting plan updated");
                setShowEditPlanModal(false);
              }}
              className="bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
