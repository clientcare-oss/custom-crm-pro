import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { 
  Eye, MoreHorizontal, User, Clock, MessageSquare, 
  CheckSquare, FileText, Folder, Calendar, Phone, 
  ChevronRight, CheckCircle2, GraduationCap, School, 
  ArrowRight, ShieldCheck, Award, Activity, Globe, 
  Pencil, Move, Check, Undo2, Mic, Compass, 
  FileSearch, GitCompare, Gavel, BookOpen, FileSignature, 
  DollarSign, PhoneCall, Layers, ArrowUpRight,
  Copy, SlidersHorizontal, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StudentProfileDossier } from "@/components/students/StudentProfileDossier";
import { TactileStickyNotesBoard } from "@/components/students/TactileStickyNotesBoard";
import { FolioCornerBrackets } from "@/components/students/FolioCornerBrackets";
import { IepDocumentBlocks } from "@/components/IepDocumentBlocks";
import { StudentTasksWorkspace } from "@/components/students/StudentTasksWorkspace";
import { StudentCommunicationWorkspace } from "@/components/students/StudentCommunicationWorkspace";
import { StudentWorkspaceMoreTab } from "@/components/students/StudentWorkspaceMoreTab";

export default function StudentWorkspace() {
  const params = useParams<{ id: string }>();
  const studentId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();

  // Store active student profile route for safe return from nested tools
  if (studentId > 0 && typeof window !== "undefined") {
    try {
      sessionStorage.setItem("lastStudentProfileUrl", `/students/${studentId}`);
      sessionStorage.setItem("lastStudentProfileId", String(studentId));
    } catch {}
  }

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

  // ─── Interactive Tab Positioning Calibration (Live Nudge Tool) ───
  const [tabOffset, setTabOffset] = useState<{ x: number; y: number; gap: number }>(() => {
    try {
      const saved = localStorage.getItem("waypoint_student_workspace_tab_coords");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 46, y: -18, gap: 2 };
  });
  const [showTabCalibrator, setShowTabCalibrator] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  const updateTabOffset = (next: { x: number; y: number; gap: number }) => {
    setTabOffset(next);
    try {
      localStorage.setItem("waypoint_student_workspace_tab_coords", JSON.stringify(next));
    } catch {}
  };

  const handleCopyCoords = () => {
    const text = `X: ${tabOffset.x}px, Y: ${tabOffset.y}px, Gap: ${tabOffset.gap}px`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    toast.success(`Coordinates copied to clipboard: ${text}`);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  const utils = trpc.useUtils();

  // Queries
  const { data, isLoading } = trpc.contacts.detail.useQuery(
    { id: studentId },
    { enabled: !!studentId }
  );

  const student = data?.contact;
  const parent = data?.parentContact;
  const compass = data?.compass;
  const appointments = data?.appointments || [];
  const projects = (data as any)?.projects || [];
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
            
            {/* Left: Back to List + Student Workspace Title */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <button
                type="button"
                onClick={() => setLocation("/students")}
                className="flex flex-col items-center justify-center group cursor-pointer select-none bg-transparent p-0 border-0 transition-all text-center"
                title="Back to Student Workspaces list"
              >
                <span 
                  className="text-base sm:text-lg md:text-xl font-medium tracking-tight text-white/90 group-hover:text-[#F2CD80] transition-colors leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Back to list
                </span>
                <Undo2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-300/90 group-hover:text-[#F2CD80] group-hover:-translate-x-0.5 transition-all mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
              </button>

              <span className="text-sky-300/40 text-lg sm:text-xl font-light select-none pb-0.5">|</span>

              <h1 
                className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Student Workspace
              </h1>
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
          {/* ─── Live Tab Position Calibration Controller ─────────────────────── */}
          <div className="flex items-center justify-between mb-2 px-1">
            {showTabCalibrator ? (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-[#031530]/95 backdrop-blur-md border border-[#D4AF37]/50 shadow-2xl rounded-xl px-3 sm:px-4 py-2 text-xs text-white z-40 select-none">
                <div className="flex items-center gap-2 pr-2 border-r border-white/15">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-[#f4d068] tracking-wide text-[11px] uppercase">
                    Tab Calibrator
                  </span>
                </div>

                {/* X Position (Left / Right) */}
                <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                  <span className="text-white/60 font-mono text-[11px]">X:</span>
                  <span className="font-bold text-amber-300 font-mono min-w-[36px] text-center">{tabOffset.x}px</span>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, x: tabOffset.x - 5 })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[10px] cursor-pointer"
                    title="Nudge Left 5px"
                  >-5</button>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, x: tabOffset.x - 1 })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[11px] cursor-pointer"
                    title="Nudge Left 1px"
                  >-</button>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, x: tabOffset.x + 1 })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[11px] cursor-pointer"
                    title="Nudge Right 1px"
                  >+</button>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, x: tabOffset.x + 5 })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[10px] cursor-pointer"
                    title="Nudge Right 5px"
                  >+5</button>
                </div>

                {/* Y Position (Up / Down) */}
                <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                  <span className="text-white/60 font-mono text-[11px]">Y:</span>
                  <span className="font-bold text-amber-300 font-mono min-w-[36px] text-center">{tabOffset.y}px</span>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, y: tabOffset.y - 5 })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[10px] cursor-pointer"
                    title="Nudge Up 5px"
                  >-5</button>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, y: tabOffset.y - 1 })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[11px] cursor-pointer"
                    title="Nudge Up 1px"
                  >-</button>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, y: tabOffset.y + 1 })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[11px] cursor-pointer"
                    title="Nudge Down 1px"
                  >+</button>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, y: tabOffset.y + 5 })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[10px] cursor-pointer"
                    title="Nudge Down 5px"
                  >+5</button>
                </div>

                {/* Gap Spacing */}
                <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                  <span className="text-white/60 font-mono text-[11px]">Gap:</span>
                  <span className="font-bold text-amber-300 font-mono min-w-[28px] text-center">{tabOffset.gap}px</span>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, gap: Math.max(0, tabOffset.gap - 1) })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[11px] cursor-pointer"
                    title="Decrease Gap 1px"
                  >-</button>
                  <button 
                    onClick={() => updateTabOffset({ ...tabOffset, gap: tabOffset.gap + 1 })} 
                    className="w-5 h-5 bg-white/10 hover:bg-white/20 active:scale-95 rounded flex items-center justify-center font-bold text-[11px] cursor-pointer"
                    title="Increase Gap 1px"
                  >+</button>
                </div>

                {/* Reset */}
                <button
                  onClick={() => updateTabOffset({ x: 46, y: -18, gap: 2 })}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/15 rounded-lg text-white/70 hover:text-white cursor-pointer text-[11px] transition-all"
                  title="Reset to locked coordinates (46px, -18px, 2px)"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset (Locked)</span>
                </button>

                {/* Copy Coordinates */}
                <button
                  onClick={handleCopyCoords}
                  className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500/25 to-amber-600/35 hover:from-amber-500/40 hover:to-amber-600/50 active:scale-95 border border-amber-400/60 rounded-lg text-amber-300 font-semibold cursor-pointer text-[11px] shadow-sm transition-all"
                  title="Copy current coordinates to clipboard"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCoords ? "Copied!" : "Lock in (Copy)"}</span>
                </button>

                {/* Minimize Toggle */}
                <button
                  onClick={() => setShowTabCalibrator(false)}
                  className="ml-auto w-6 h-6 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Minimize tuner"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTabCalibrator(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#031530]/90 backdrop-blur-md border border-[#D4AF37]/50 rounded-lg text-amber-300 text-xs font-semibold hover:bg-[#031530] shadow-lg cursor-pointer transition-all z-40"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Adjust Tab Coordinates (X: {tabOffset.x}px, Y: {tabOffset.y}px)</span>
              </button>
            )}
          </div>

          {/* Folio Index Tabs: Live Calibrated Positioning */}
          <div 
            className="flex items-end justify-start relative z-30 overflow-x-auto no-scrollbar"
            style={{
              paddingLeft: `${tabOffset.x}px`,
              marginBottom: `${tabOffset.y}px`,
              gap: `${tabOffset.gap}px`,
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
                    "relative flex items-center gap-2.5 px-4.5 sm:px-5.5 py-2.5 rounded-t-[3.5px] text-xs sm:text-[13.5px] transition-colors cursor-pointer select-none",
                    "border border-b-0",
                    isActive
                      ? "bg-gradient-to-b from-[#032556] via-[#021d45] to-[#011432] text-white border-[#2b64a8]/80 z-30 shadow-[0_-3px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(147,197,253,0.45)]"
                      : "bg-gradient-to-b from-[#021a3b] via-[#021532] to-[#010e24] text-[#e2e8f0]/85 hover:text-white hover:from-[#03224c] hover:to-[#01132e] border-[#1a4478]/70 z-20 shadow-[0_-2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(96,165,250,0.3)]"
                  )}
                  style={{
                    fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
                  }}
                >
                  <Icon 
                    className="h-4 w-4 text-white/95 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                    strokeWidth={1.75} 
                  />
                  <span className="font-normal tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ─── Rebuilt Executive Navy Leather Folio Desk Pad (3-Band Saddle Architecture) ── */}
          <div 
            className={cn(
              "relative w-full rounded-2xl overflow-visible min-h-[580px] bg-[#02132d]",
              "border-2 border-[#c59e45]/75",
              "shadow-[0_16px_40px_rgba(0,0,0,0.85),0_4px_12px_rgba(0,0,0,0.65),inset_0_1.5px_0.5px_rgba(255,235,175,0.45),inset_1px_0_0_rgba(255,235,175,0.2),inset_0_-2.5px_2px_rgba(0,0,0,0.95)]"
            )}
          >
            {/* ─── Saddle Band 1: Fixed Top Cap (120px locked at top: 0, zero gap) ─── */}
            <div 
              className="absolute top-0 left-0 right-0 h-[120px] pointer-events-none select-none z-0 rounded-t-2xl overflow-hidden"
              style={{
                backgroundImage: "url('/decor/folio-band-top.png?v=20261002-pure')",
                backgroundSize: "100% 120px",
                backgroundPosition: "top center",
                backgroundRepeat: "no-repeat",
              }}
            />

            {/* ─── Saddle Band 2: Flexible Middle Body (Pure continuous grain, stretches vertically without warping frame) ─── */}
            <div 
              className="absolute left-0 right-0 top-[119px] bottom-[99px] pointer-events-none select-none z-0"
              style={{
                backgroundImage: "url('/decor/folio-band-middle.png?v=20261002-pure')",
                backgroundSize: "100% 100%",
                backgroundPosition: "center center",
                backgroundRepeat: "no-repeat",
              }}
            />

            {/* ─── Saddle Band 3: Fixed Bottom Cap (100px locked at bottom: 0) ─── */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-[100px] pointer-events-none select-none z-0 rounded-b-2xl overflow-hidden"
              style={{
                backgroundImage: "url('/decor/folio-band-bottom.png?v=20261002-pure')",
                backgroundSize: "100% 100px",
                backgroundPosition: "bottom center",
                backgroundRepeat: "no-repeat",
              }}
            />

            {/* Ambient Lighting & Saddle Dye Vignette Overlay */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none select-none z-0" 
              style={{
                background: "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.05) 0%, transparent 65%), linear-gradient(180deg, rgba(3,19,45,0.15) 0%, rgba(2,11,24,0.55) 100%)",
              }}
            />

            {/* Outer Precision Gold Foil Perimeter Inlay (16px from edge, passes under corner brackets) */}
            <div className="absolute inset-3 sm:inset-4 md:inset-[16px] rounded-xl border border-[#D4AF37]/50 pointer-events-none select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_1px_3px_rgba(0,0,0,0.6)] z-10" />

            {/* Inner Fine Hairline Gold Piping (22px from edge) */}
            <div className="absolute inset-4 sm:inset-5 md:inset-[22px] rounded-lg border border-[#D4AF37]/20 pointer-events-none select-none z-10" />

            {/* Rigid Photorealistic Brass Corner Brackets — Floating at z-30 Above All Layers */}
            <FolioCornerBrackets />

            {/* Tab Content Display with Stable Zero-Shake Dissolve */}
            <div className="relative z-10 w-full min-h-[540px] xl:min-h-[580px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: "linear" }}
                  className="w-full h-full"
                >
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10 pt-6 sm:pt-8">
                
                {/* ─── LEFT PANEL: Student Profile & Family (~38% width) ────── */}
                <div className="lg:col-span-5 relative py-1 sm:py-2">
                  <StudentProfileDossier
                    student={student}
                    studentInitials={studentInitials}
                    fullName={fullName}
                    parentName={parentName}
                    parentPhone={parentPhone}
                    calculatedAge={calculatedAge}
                    cleanGrade={cleanGrade}
                    transferSchool={transferSchool}
                    gtidValue={gtidValue}
                    displayEligibility={displayEligibility}
                    displayMedicalDiagnoses={displayMedicalDiagnoses}
                    clientTime={clientTime}
                    onEditDetails={() => setDetailsModalOpen(true)}
                  />

                  {/* ─── Authentic Leather Folio Spine / Vertical Seam Divider ─── */}
                  <div className="hidden lg:flex absolute right-8 lg:right-10 -top-3 -bottom-3 w-[6px] flex-col items-center justify-between pointer-events-none select-none z-20">
                    {/* Top Brass Anchor Accent */}
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#ffe082] via-[#d4af37] to-[#6b4700] ring-1 ring-black/70 shadow-[0_1px_2px_rgba(0,0,0,0.9)] opacity-85" />

                    {/* Vertical Debossed Seam Groove with Double Specular Line */}
                    <div className="w-[2px] h-full flex justify-between my-1">
                      {/* Dark Debossed Groove Shadow */}
                      <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#010814] to-transparent shadow-[-1px_0_0_rgba(255,255,255,0.06)]" />
                      {/* Warm Gold / Burnished Brass Milled Seam */}
                      <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#D4AF37]/50 to-transparent shadow-[1px_0_1px_rgba(0,0,0,0.8)]" />
                    </div>

                    {/* Bottom Brass Anchor Accent */}
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#ffe082] via-[#d4af37] to-[#6b4700] ring-1 ring-black/70 shadow-[0_1px_2px_rgba(0,0,0,0.9)] opacity-85" />
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

            {/* ─── MORE TAB WORKSPACE: Categorized Student Workspace Hub (PG-030-MORE) ── */}
            {activeTab === "more" && (
              <StudentWorkspaceMoreTab
                studentId={studentId}
                caseId={student?.caseId}
                studentName={fullName}
              />
            )}

            {/* ─── NOTES TAB: Tactile Yellow Sticky Notes Board on Ornate Navy Leather Frame ─── */}
            {activeTab === "notes" && (
              <div className="w-full min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10 pt-6 sm:pt-8">
                <TactileStickyNotesBoard
                  studentId={studentId}
                  studentName={fullName}
                  projectId={projects[0]?.id || effectiveProjectId}
                  appointments={appointments as any}
                  onProjectCreated={() => {
                    utils.contacts.detail.invalidate({ id: studentId });
                  }}
                />
              </div>
            )}

            {/* ─── DOCUMENTS TAB: IEP Records & Document Vault (Extends Folio Dynamically) ─── */}
            {activeTab === "documents" && (
              <div className="w-full min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10 pt-6 sm:pt-8 flex flex-col justify-between">
                <div>
                  {/* Top Hub Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-white/15 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
                        <Folder className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 
                          className="text-xl sm:text-2xl font-bold text-white tracking-wide drop-shadow-sm flex items-center gap-2"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          <span>Student IEP Records & Document Vault</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-white/65 mt-0.5">
                          Official IEP/504 plans, historical draft revisions, evaluations, and case documentation.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <Badge className="bg-[#0e274a]/90 text-amber-300 border border-amber-400/35 text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm">
                        Case #{student?.caseId || studentId} · {fullName}
                      </Badge>
                    </div>
                  </div>

                  {/* IEP Document Management Workspace */}
                  <div className="bg-[#020b18]/70 rounded-xl border border-white/15 p-4 sm:p-6 shadow-xl backdrop-blur-xs">
                    <IepDocumentBlocks contactId={studentId} />
                  </div>

                  {/* Quick Action Tiles for IEP Tools */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div 
                      onClick={() => setLocation(`/tools/iep-comparator`)}
                      className="group p-4 rounded-xl bg-[#020b18]/60 hover:bg-[#031d42]/80 border border-white/15 hover:border-amber-400/60 cursor-pointer transition-all flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
                          <GitCompare className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                            IEP Draft Comparator
                          </h4>
                          <p className="text-xs text-white/60">
                            Side-by-side diff comparison between past and present drafts
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
                    </div>

                    <div 
                      onClick={() => setLocation(`/tools/pwn-decoder`)}
                      className="group p-4 rounded-xl bg-[#020b18]/60 hover:bg-[#031d42]/80 border border-white/15 hover:border-amber-400/60 cursor-pointer transition-all flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                          <FileSearch className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                            PWN Decoder (Prior Written Notice)
                          </h4>
                          <p className="text-xs text-white/60">
                            Analyze district rejection notices and formal procedural compliance
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Footer Return Button */}
                <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-6 text-xs text-white/50">
                  <span>Waypoint Advocates · Case #{student?.caseId || studentId}</span>
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
            )}

            {/* ─── TASKS TAB: Case Milestones & Action Queue ─── */}
            {activeTab === "tasks" && (
              <StudentTasksWorkspace
                studentId={studentId}
                fullName={fullName}
                caseId={student?.caseId || String(studentId)}
                parentContactId={parent?.id || (student as any)?.parentId}
                projectId={projects[0]?.id || effectiveProjectId}
                onReturnToOverview={() => setActiveTab("overview")}
              />
            )}

            {/* ─── COMMUNICATION TAB: Quo Telephony & Client Message Thread ─── */}
            {activeTab === "communication" && (
              <StudentCommunicationWorkspace
                studentId={studentId}
                fullName={fullName}
                parentName={parentName}
                parentPhone={parentPhone}
                caseId={student?.caseId || String(studentId)}
                parentContactId={parent?.id || (student as any)?.parentId}
                onReturnToOverview={() => setActiveTab("overview")}
              />
            )}

            {/* Fallback View for Other Tabs */}
            {activeTab === "timeline" && (
              <div className="p-12 min-h-[480px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-lg">
                  <Clock className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white capitalize">
                    Timeline Workspace
                  </h3>
                  <p className="text-xs text-white/60 mt-1 max-w-md">
                    Case activity timeline for {fullName}. You can also reference the original 11-tab legacy console anytime.
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
                </motion.div>
              </AnimatePresence>
            </div>
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
