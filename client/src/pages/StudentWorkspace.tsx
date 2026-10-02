import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { 
  Eye, MoreHorizontal, User, Clock, MessageSquare, 
  CheckSquare, FileText, Folder, Calendar, Phone, 
  ChevronRight, CheckCircle2, GraduationCap, School, 
  ArrowRight, ShieldCheck, Award, Activity, Globe, 
  Pencil, Move, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function StudentWorkspace() {
  const params = useParams<{ id: string }>();
  const studentId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();

  // Active top index tab
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "communication" | "tasks" | "notes" | "documents" | "more">("overview");

  // Local checklist state for default actions
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({
    "review-iep": false,
    "confirm-priorities": false,
    "missing-records": false,
  });

  // Modal dialog states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // Queries
  const { data, isLoading } = trpc.contacts.detail.useQuery(
    { id: studentId },
    { enabled: !!studentId }
  );

  const student = data?.contact;
  const parent = data?.parentContact;
  const compass = data?.compass;
  const appointments = data?.appointments || [];
  const effectiveProjectId = (data as any)?.projects?.[0]?.id || studentId;

  // Toggle action checkbox
  const toggleAction = (key: string) => {
    setCheckedActions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Find next upcoming appointment
  const nextAppointment = useMemo(() => {
    if (!appointments.length) return null;
    const now = new Date().getTime();
    const upcoming = appointments
      .filter(a => a.date && new Date(a.date).getTime() >= now)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    return upcoming[0] || null;
  }, [appointments]);

  // Client local time calculation (Eastern default or student's time zone)
  const clientTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
  }, []);

  const studentInitials = useMemo(() => {
    if (!student) return "AS";
    const first = student.firstName?.[0] || "";
    const last = student.lastName?.[0] || "";
    return (first + last).toUpperCase() || "S";
  }, [student]);

  const fullName = student ? `${student.firstName} ${student.lastName}` : "Alex Smith";
  const parentName = parent ? `${parent.firstName} ${parent.lastName}` : (student?.parentName || "Sarah Smith");
  const parentPhone = parent?.phone || student?.phone || "(404) 555-0199";

  const calculatedAge = useMemo(() => {
    if (!student?.dateOfBirth) return "14";
    const dob = new Date(student.dateOfBirth);
    if (isNaN(dob.getTime())) return student.dateOfBirth || "14";
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970).toString();
  }, [student?.dateOfBirth]);

  const cleanGrade = useMemo(() => {
    if (!student?.gradeLevel) return "5th Grade";
    const g = student.gradeLevel.trim();
    if (/^\d+$/.test(g)) return `${g}th Grade`;
    return g;
  }, [student?.gradeLevel]);

  const displayEligibility = useMemo(() => {
    return (student as any)?.iepEligibility || (student as any)?.eligibilityCategory || (student as any)?.primaryEligibility || "Autism";
  }, [student]);

  const displayMedicalDiagnoses = useMemo(() => {
    return (student as any)?.medicalDiagnoses || (student as any)?.diagnosis || "ADHD & Specific Learning Disability (Dyslexia)";
  }, [student]);

  const transferSchool = useMemo(() => {
    return student?.previousSchool || "The Lovett School";
  }, [student?.previousSchool]);

  const gtidValue = useMemo(() => {
    return (student as any)?.gtid || (student as any)?.studentIdNumber || "1";
  }, [student]);

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden overflow-y-auto select-none bg-[#0b0d16] text-slate-100 transition-all font-sans">
      
      {/* ─── Desk Surface Background Canvas (Scrolls 1:1 with page) ─────────── */}
      <div
        className="absolute top-0 left-0 right-0 z-0 pointer-events-none select-none"
        style={{
          backgroundImage: "url('/decor/student-workspace-bg.jpg')",
          backgroundSize: "100% auto",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
          height: "100%",
        }}
      />

      {/* ─── Interactive Desk Workspace Canvas ────────────────────────────── */}
      <div className="relative z-10 w-full min-h-screen flex flex-col justify-start pb-16">
        
        {/* Top Section: Invisible Header Bar sitting above the glowing blue line, bounded between vines and lamp */}
        <div 
          className="w-full pt-3 sm:pt-4 md:pt-5 pb-2 relative z-20"
          style={{
            paddingLeft: "max(110px, 13%)",
            paddingRight: "max(110px, 14%)",
          }}
        >
          <header className="flex items-center justify-between w-full bg-transparent border-0 shadow-none px-0 py-1">
            
            {/* Left: Title & Breadcrumbs */}
            <div className="flex items-center gap-3.5">
              <h1 
                className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Student Workspace
              </h1>
              <span className="text-sky-300/40 text-lg font-light">|</span>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-sky-100/90 font-medium drop-shadow-sm">
                <button 
                  onClick={() => setLocation("/students")}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Students
                </button>
                <span className="text-white/40">/</span>
                <span className="text-white font-semibold">{fullName}</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const targetUrl = student?.caseId ? `/portal?caseId=${student.caseId}` : `/portal`;
                  window.open(targetUrl, "_blank");
                }}
                className="bg-[#071d3a]/75 hover:bg-[#0c2950] border border-sky-400/35 hover:border-sky-300 text-sky-100 text-xs font-semibold rounded-lg h-8 px-3.5 gap-2 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.5)] cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 text-sky-300" />
                <span>Preview Parent Portal</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setLocation(`/archived/students/${studentId}`)}
                className="h-8 w-8 rounded-lg bg-[#071d3a]/75 hover:bg-[#0c2950] border border-sky-400/35 hover:border-sky-300 text-sky-200 hover:text-white transition-all shadow-[0_2px_8px_rgba(0,0,0,0.5)] cursor-pointer"
                title="More options & Legacy Workspace (PG-030-ARC)"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </header>
        </div>

        {/* ─── Folio Area (Tabs + Leather Desk Pad) ─────────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[96vw] xl:max-w-[94vw] 2xl:max-w-[1720px] mx-auto mt-6 sm:mt-8 px-2 sm:px-4 md:px-6 flex flex-col relative z-20"
        >
          {/* Folio Index Tabs (Permanently locked in: Overview left anchor at X=36px, seated at Y=21px) */}
          <div 
            className="flex items-end justify-start gap-1.5 relative z-30 overflow-x-auto no-scrollbar"
            style={{
              paddingLeft: "36px",
              marginBottom: "-21px",
            }}
          >
            {[
              { id: "overview", label: "Overview", icon: User },
              { id: "communication", label: "Communication", icon: MessageSquare },
              { id: "tasks", label: "Tasks", icon: CheckSquare },
              { id: "notes", label: "Notes", icon: FileText },
              { id: "documents", label: "Documents", icon: Folder },
              { id: "more", label: "More", icon: MoreHorizontal },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-t-lg text-xs font-semibold tracking-wide transition-all border-t border-x cursor-pointer",
                    isActive
                      ? "bg-[#032146] text-white border-sky-400/50 z-30 border-b-0 pb-3 shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
                      : "bg-[#02132b]/95 text-white/60 hover:text-white/95 hover:bg-[#051e40] border-white/15 border-b border-b-[#032146] z-20 pb-2"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-amber-400" : "text-white/50")} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 rounded-t-full shadow-[0_0_8px_rgba(217,163,53,0.85)]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ─── The Real Textured Leather Folio Desk Pad (Transparent Outer Container) ── */}
          <div
            className="relative w-full bg-transparent overflow-visible shadow-none border-0"
            style={{
              backgroundImage: activeTab === "notes"
                ? "url('/decor/ornate-navy-leather-ui-frame.png?v=20261001-notes')"
                : "url('/decor/student-workspace-folio-v2.png?v=20261001-rev3')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Tab Content Display */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10 pt-6 sm:pt-8">
                
                {/* ─── LEFT PANEL: Student Profile & Family (~38% width) ────── */}
                <div className="lg:col-span-5 relative py-1 sm:py-2">
                  {/* Permanently locked in Left Info Block (X: -34px, Y: -10px) */}
                  <div 
                    className="w-full max-w-[275px] mx-auto flex flex-col justify-between relative transition-all text-left"
                    style={{
                      transform: "translate(-34px, -10px)",
                    }}
                  >
                    {/* Golden Glowing Avatar Badge Centered on Top */}
                    <div className="flex flex-col items-center text-center mb-2.5">
                      <div className="relative mb-1.5 mt-0.5">
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-[#D4AF37] bg-gradient-to-br from-[#122847] to-[#081628] flex items-center justify-center text-[#F4D068] font-bold text-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] ring-4 ring-[#081b35]/50">
                          {studentInitials}
                        </div>
                      </div>

                      {/* Student Name */}
                      <h2 
                        className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {fullName}
                      </h2>

                      {/* Pill Badges */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge className="bg-[#123159]/85 text-sky-200 border border-sky-400/40 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full">
                          IEP
                        </Badge>
                        <Badge className="bg-[#093527]/85 text-emerald-300 border border-emerald-500/40 text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{student?.studentStatus || "Active"}</span>
                        </Badge>
                      </div>
                    </div>

                    {/* ── STUDENT PROFILE Info (Tight, Transparent on Leather) ── */}
                    <div className="w-full space-y-1.5 px-0.5 bg-transparent border-0 shadow-none text-[11px]">
                      {/* Section Header */}
                      <div className="flex items-center justify-between pb-1 border-b border-white/15">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1">
                          <User className="h-3 w-3 text-[#38BDF8]" />
                          <span>STUDENT PROFILE</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailsModalOpen(true)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#38BDF8] hover:text-sky-300 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                          <span>Edit Details</span>
                        </button>
                      </div>

                      {/* Age */}
                      <div className="flex items-center justify-between gap-1.5 py-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                          <User className="h-3 w-3 text-[#38BDF8] shrink-0" />
                          <span>Age:</span>
                        </div>
                        <span className="font-bold text-white text-right">
                          {calculatedAge}
                        </span>
                      </div>

                      {/* Grade */}
                      <div className="flex items-center justify-between gap-1.5 py-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                          <GraduationCap className="h-3 w-3 text-[#38BDF8] shrink-0" />
                          <span>Grade:</span>
                        </div>
                        <span className="font-bold text-white text-right">
                          {cleanGrade}
                        </span>
                      </div>

                      {/* School */}
                      <div className="flex items-center justify-between gap-1.5 py-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                          <School className="h-3 w-3 text-[#38BDF8] shrink-0" />
                          <span>School:</span>
                        </div>
                        <span className="font-bold text-white truncate max-w-[145px] text-right" title={student?.schoolName || "Lincoln Elementary"}>
                          {student?.schoolName || "Lincoln Elementary"}
                        </span>
                      </div>

                      {/* Transfer School */}
                      <div className="flex items-center justify-between gap-1.5 py-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                          <ArrowRight className="h-3 w-3 text-[#38BDF8] shrink-0" />
                          <span>Transfer School:</span>
                        </div>
                        <span className="font-bold text-white truncate max-w-[130px] text-right" title={transferSchool}>
                          {transferSchool}
                        </span>
                      </div>

                      {/* GTID */}
                      <div className="flex items-center justify-between gap-1.5 py-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                          <ShieldCheck className="h-3 w-3 text-[#38BDF8] shrink-0" />
                          <span>GTID:</span>
                        </div>
                        <span className="font-bold text-white font-mono text-right">
                          {gtidValue}
                        </span>
                      </div>

                      {/* Eligibility */}
                      <div className="flex items-center justify-between gap-1.5 py-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                          <Award className="h-3 w-3 text-[#38BDF8] shrink-0" />
                          <span>Eligibility:</span>
                        </div>
                        <span className="font-bold text-white text-right truncate max-w-[140px]" title={displayEligibility}>
                          {displayEligibility}
                        </span>
                      </div>

                      {/* Medical Diagnoses */}
                      <div className="pt-1.5 border-t border-white/10">
                        <div className="flex items-center gap-1.5 text-slate-300 mb-0.5">
                          <Activity className="h-3 w-3 text-[#38BDF8] shrink-0" />
                          <span>Medical Diagnoses:</span>
                        </div>
                        <div className="pl-4">
                          <span className="font-bold text-white text-left block leading-snug break-words text-[10.5px]" title={displayMedicalDiagnoses}>
                            {displayMedicalDiagnoses}
                          </span>
                        </div>
                      </div>

                      {/* Client Time (from Screenshot) */}
                      <div className="pt-1.5 border-t border-white/10">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Globe className="h-3 w-3 text-[#38BDF8] shrink-0" />
                            <span>Client Time:</span>
                            <strong className="text-white font-semibold">{clientTime}</strong>
                            <span className="text-white/60 text-[10px]">(Eastern)</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pl-4 pt-0.5 text-[10px]">
                          <span className="text-slate-400">Same time as you</span>
                          <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Good to call
                          </span>
                        </div>
                      </div>

                      {/* Parent / Guardian Row */}
                      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-slate-400">
                          <User className="h-3 w-3 text-white/50" />
                          <span>Parent: <strong className="text-white">{parentName}</strong></span>
                        </div>
                        <a href={`tel:${parentPhone}`} className="text-sky-300 hover:text-amber-300 transition-colors font-medium">
                          {parentPhone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── RIGHT PANEL: Current Focus & Action Center (~62% width) ── */}
                <div className="lg:col-span-7 sm:px-6 py-2 flex flex-col justify-between">
                  <div>
                    {/* Current Focus Banner */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-sky-300/90 drop-shadow">
                        CURRENT FOCUS
                      </p>
                      <h3 
                        className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {compass?.currentStatus || "Prepare for the next IEP meeting"}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/80 drop-shadow">
                        {compass?.nextStep || "Review records and organize parent concerns."}
                      </p>
                    </div>

                    {/* Primary Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <Button
                        onClick={() => setLocation(`/meeting-workspace/${studentId}`)}
                        className="bg-gradient-to-r from-[#0d2242] to-[#14325c] hover:from-[#13305c] hover:to-[#1a4078] text-white border border-[#D4AF37]/80 font-semibold text-xs rounded-xl h-10 px-5 gap-2 shadow-md cursor-pointer"
                      >
                        <Calendar className="h-4 w-4 text-amber-300" />
                        <span>Prepare for Meeting</span>
                      </Button>

                      <Button
                        onClick={() => setLocation(`/post-meeting-review/${studentId}`)}
                        variant="outline"
                        className="bg-[#081a33]/60 hover:bg-[#0c2447] text-white/95 hover:text-white border-white/20 font-semibold text-xs rounded-xl h-10 px-5 gap-2 shadow-sm cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-white/75" />
                        <span>Post-Meeting Review</span>
                      </Button>
                    </div>

                    {/* Middle Cards: Next Meeting & Next Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      
                      {/* Card 1: Next Meeting */}
                      <div className="rounded-xl bg-[#020b18]/25 border border-white/15 p-4 flex flex-col justify-between min-h-[160px]">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-white/50">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>NEXT MEETING</span>
                        </div>

                        {nextAppointment ? (
                          <div className="my-2 space-y-1">
                            <p className="text-sm font-bold text-white">{nextAppointment.title || "IEP Review Session"}</p>
                            <p className="text-xs sm:text-sm text-amber-300 font-medium">
                              {new Date(nextAppointment.date!).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center my-2 space-y-1">
                            <Calendar className="h-6 w-6 text-white/35" />
                            <p className="text-xs sm:text-sm font-semibold text-white/95">No meeting scheduled</p>
                            <p className="text-[11px] text-white/55 max-w-[220px]">
                              Schedule a meeting to keep this case on track.
                            </p>
                          </div>
                        )}

                        <Button
                          onClick={() => setScheduleModalOpen(true)}
                          size="sm"
                          variant="outline"
                          className="w-full mt-2 bg-[#091b35]/60 hover:bg-[#0f2a52] border-[#D4AF37]/50 text-white text-xs font-semibold rounded-lg h-8 gap-2 cursor-pointer"
                        >
                          <Calendar className="h-3.5 w-3.5 text-amber-300" />
                          <span>Schedule meeting</span>
                        </Button>
                      </div>

                      {/* Card 2: Next Actions */}
                      <div className="rounded-xl bg-[#020b18]/25 border border-white/15 p-4 flex flex-col justify-between min-h-[160px]">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-white/50 mb-2.5">
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span>NEXT ACTIONS</span>
                        </div>

                        <div className="space-y-2">
                          {[
                            { id: "review-iep", label: "Review latest IEP" },
                            { id: "confirm-priorities", label: "Confirm parent priorities" },
                            { id: "missing-records", label: "Request missing records" },
                          ].map((action) => {
                            const isDone = !!checkedActions[action.id];
                            return (
                              <button
                                key={action.id}
                                onClick={() => toggleAction(action.id)}
                                className="w-full flex items-center gap-2.5 text-left text-xs sm:text-sm text-white/90 hover:text-white transition-colors cursor-pointer group"
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                  isDone 
                                    ? "bg-amber-400 border-amber-300 text-slate-950 font-bold" 
                                    : "border-white/30 group-hover:border-amber-300 bg-black/20"
                                )}>
                                  {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                                </div>
                                <span className={cn(isDone && "line-through text-white/40")}>
                                  {action.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-1.5 text-[11px] text-white/40">
                          {Object.values(checkedActions).filter(Boolean).length} of 3 completed
                        </div>
                      </div>
                    </div>

                    {/* Bottom Card: Recent Activity */}
                    <div className="rounded-xl bg-[#020b18]/25 border border-white/15 p-3.5 mt-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-white/50">
                          <FileText className="h-3.5 w-3.5" />
                          <span>RECENT ACTIVITY</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-white/75">
                          <Clock className="h-3.5 w-3.5 text-white/40" />
                          <span>Case updates appear here.</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => setActiveTab("more")}
                        variant="outline"
                        size="sm"
                        className="bg-transparent hover:bg-white/5 border-white/20 text-white text-xs sm:text-sm font-semibold rounded-lg h-8 px-3 gap-2 cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5 text-white/70" />
                        <span>View timeline</span>
                      </Button>
                    </div>
                  </div>


                </div>
              </div>
            )}

            {/* ─── MORE TAB WORKSPACE: Clean Portfolio Desk for Timeline & Future Items ── */}
            {activeTab === "more" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10 pt-6 sm:pt-8 gap-6">
                
                {/* ── LEFT PANEL: Case Timeline & Milestone Activity (~58% width) ── */}
                <div className="lg:col-span-7 sm:px-4 py-2 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/15">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 
                            className="text-lg sm:text-xl font-bold text-white tracking-wide drop-shadow-sm"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          >
                            Case Timeline & Milestones
                          </h3>
                          <p className="text-xs text-white/60">
                            Advocacy timeline and chronological activity log for {fullName}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-[#123159]/85 text-sky-200 border border-sky-400/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        Live Timeline
                      </Badge>
                    </div>

                    {/* Timeline Activity Trail */}
                    <div className="space-y-3 relative pl-5 border-l-2 border-amber-400/30 my-3">
                      <div className="relative">
                        <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-amber-400 ring-4 ring-[#032146] shadow-[0_0_8px_rgba(217,163,53,0.8)]" />
                        <div className="p-3.5 rounded-xl bg-[#020b18]/45 border border-white/15 hover:border-amber-400/30 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-semibold text-white">Initial Intake & Assessment Completed</span>
                            <span className="text-[10px] text-amber-300/80 font-mono">{clientTime} · Today</span>
                          </div>
                          <p className="text-xs text-white/70 mt-1">
                            Discovery intake records recorded. Case assigned to advocacy team for review.
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-sky-400 ring-4 ring-[#032146]" />
                        <div className="p-3.5 rounded-xl bg-[#020b18]/45 border border-white/15 hover:border-sky-400/30 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-semibold text-white">IEP Document Ingestion</span>
                            <span className="text-[10px] text-sky-300/80 font-mono">Recent Milestone</span>
                          </div>
                          <p className="text-xs text-white/70 mt-1">
                            Current IEP & accommodations cataloged. Goal tracking initialized.
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-[#032146]" />
                        <div className="p-3.5 rounded-xl bg-[#020b18]/30 border border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-semibold text-white/90">Case Compass Baseline Configured</span>
                            <span className="text-[10px] text-emerald-300/80 font-mono">Baseline</span>
                          </div>
                          <p className="text-xs text-white/60 mt-1">
                            Dispute probability set. First Mate live meeting assistance ready.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer on Left Panel */}
                  <div className="pt-4 flex items-center justify-between border-t border-white/15 mt-3">
                    <span className="text-xs text-white/50">
                      Timeline synced with Case ID #{student?.caseId || studentId}
                    </span>
                    <Button
                      onClick={() => setActiveTab("overview")}
                      variant="outline"
                      size="sm"
                      className="bg-transparent hover:bg-white/10 border-white/20 text-white text-xs h-8 px-3 rounded-lg cursor-pointer"
                    >
                      Return to Overview Desk
                    </Button>
                  </div>
                </div>

                {/* ── RIGHT PANEL: Clean Canvas / Slots for More Items (~42% width) ── */}
                <div className="lg:col-span-5 sm:px-4 py-2 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/15">
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-wider uppercase">
                          Portfolio Space & Modules
                        </h4>
                        <p className="text-[11px] text-white/50">Clean portfolio slots for additional items</p>
                      </div>
                      <Badge className="bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[10px] font-medium">
                        More Canvas
                      </Badge>
                    </div>

                    {/* Quick Student File Reference Card */}
                    <div className="p-4 rounded-xl bg-[#020b18]/45 border border-white/15 hover:border-white/25 transition-all">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <User className="h-4 w-4 text-amber-400" />
                          <span>Student File Reference</span>
                        </span>
                        <Button 
                          onClick={() => setDetailsModalOpen(true)}
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-[11px] text-amber-300 hover:text-amber-200 hover:bg-white/10 rounded-md cursor-pointer"
                        >
                          View Details
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-black/25 p-2.5 rounded-lg border border-white/5">
                          <span className="text-white/40 block text-[9px] uppercase font-bold">Grade & School</span>
                          <span className="text-white font-medium">{student?.gradeLevel || "5th Grade"} · {student?.schoolName || "Lincoln Elementary"}</span>
                        </div>
                        <div className="bg-black/25 p-2.5 rounded-lg border border-white/5">
                          <span className="text-white/40 block text-[9px] uppercase font-bold">Parent Contact</span>
                          <span className="text-white font-medium">{parentName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Open Portfolio Slot Card (Clean space ready for things Byron wants to put on it) */}
                    <div className="p-5 rounded-xl border border-dashed border-white/25 bg-white/[0.02] flex flex-col items-center justify-center text-center py-8">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/40 mb-2.5">
                        <MoreHorizontal className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-white/90">Clean Folio Space</p>
                      <p className="text-[11px] text-white/50 mt-1 max-w-[260px]">
                        This tab of the portfolio is ready for any additional tools, notes, or widgets you want to place here.
                      </p>
                    </div>
                  </div>

                  {/* Legacy Workspace Button */}
                  <div className="pt-2">
                    <Button
                      onClick={() => setLocation(`/archived/students/${studentId}`)}
                      variant="outline"
                      className="w-full border-white/15 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 text-xs rounded-xl h-9 cursor-pointer"
                    >
                      Open Legacy Workspace (PG-030-ARC)
                    </Button>
                  </div>
                </div>

              </div>
            )}

            {/* ─── NOTES TAB: Clean 12-Column Canvas on Ornate Navy Leather Frame ─── */}
            {activeTab === "notes" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10 pt-6 sm:pt-8">
                {/* ─── LEFT PANEL: Exact Overview Grid Boundaries (~38% width) ────── */}
                <div className="lg:col-span-5 relative py-1 sm:py-2">
                  <div 
                    className="w-full max-w-[275px] mx-auto flex flex-col justify-between relative transition-all text-left min-h-[480px]"
                    style={{
                      transform: "translate(-34px, -10px)",
                    }}
                  >
                    {/* Left Panel Content Boundary */}
                  </div>
                </div>

                {/* ─── RIGHT PANEL: Exact Overview Grid Boundaries (~62% width) ────── */}
                <div className="lg:col-span-7 sm:px-6 py-2 flex flex-col justify-between min-h-[480px]">
                  {/* Right Panel Content Boundary */}
                </div>
              </div>
            )}

            {/* Fallback View for Other Tabs */}
            {(activeTab === "communication" || activeTab === "tasks" || activeTab === "documents" || activeTab === "timeline") && (
              <div className="p-12 min-h-[480px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-lg">
                  {activeTab === "communication" && <MessageSquare className="h-7 w-7" />}
                  {activeTab === "tasks" && <CheckSquare className="h-7 w-7" />}
                  {activeTab === "documents" && <Folder className="h-7 w-7" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white capitalize">
                    {activeTab} Workspace
                  </h3>
                  <p className="text-xs text-white/60 mt-1 max-w-md">
                    Active section for {fullName}. You can also reference the original 11-tab legacy console anytime.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={() => setActiveTab("overview")}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-9 px-4 cursor-pointer"
                  >
                    Return to Overview Desk
                  </Button>
                  <Button
                    onClick={() => setLocation(`/archived/students/${studentId}`)}
                    variant="outline"
                    className="border-white/20 text-white bg-white/5 hover:bg-white/10 text-xs rounded-xl h-9 px-4 cursor-pointer"
                  >
                    Open Legacy Workspace (PG-030-ARC)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ─── Student Details Modal ─────────────────────────────────────────── */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-xl bg-[#09182d] border border-white/20 text-white p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <span>🪪</span>
              <span>Student & Case Profile</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Complete advocacy file details for {fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-black/30 border border-white/10">
              <div>
                <span className="text-white/40 block text-[10px] uppercase font-bold">Grade</span>
                <span className="text-white font-medium">{student?.gradeLevel || "5th Grade"}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[10px] uppercase font-bold">School</span>
                <span className="text-white font-medium">{student?.schoolName || "Lincoln Elementary"}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[10px] uppercase font-bold">Case ID</span>
                <span className="text-amber-300 font-mono font-medium">#{student?.caseId || studentId}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[10px] uppercase font-bold">Status</span>
                <span className="text-emerald-300 font-medium">{student?.studentStatus || "Active"}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-2">
              <span className="text-white/40 block text-[10px] uppercase font-bold">Parent Contact</span>
              <p className="text-white font-medium">{parentName}</p>
              <p className="text-white/70">{parentPhone}</p>
              {parent?.email && <p className="text-white/70">{parent.email}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailsModalOpen(false)}
                className="border-white/20 text-white bg-white/5"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Schedule Meeting Modal ────────────────────────────────────────── */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-md bg-[#09182d] border border-white/20 text-white p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-400" />
              <span>Schedule IEP Meeting</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Set an advocacy session or review for {fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4 text-xs">
            <p className="text-white/80">
              Open the system calendar to select available slots or launch a new appointment with the parent and school team.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScheduleModalOpen(false)}
                className="border-white/20 text-white bg-white/5"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setScheduleModalOpen(false);
                  setLocation(`/calendar?studentId=${studentId}`);
                }}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold"
              >
                Go to Calendar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
