import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { 
  Eye, MoreHorizontal, User, Clock, MessageSquare, 
  CheckSquare, FileText, Folder, Calendar, Phone, 
  ChevronRight, CheckCircle2
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

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden overflow-y-auto select-none bg-[#051124] text-slate-100 transition-all font-sans">
      
      {/* ─── 100% Pinned Full-Bleed Desk Surface Background ───────────────── */}
      {/* Using 100% 100% ensures the plant (top-left) and lamp (top-right) are NEVER cropped out */}
      <div
        className="fixed inset-y-0 right-0 z-0 pointer-events-none select-none overflow-hidden"
        style={{
          left: "var(--sidebar-width, 0px)",
          backgroundImage: "url('/decor/student-workspace-bg.jpg')",
          backgroundSize: "100% 100%",
          backgroundPosition: "top left",
          backgroundRepeat: "no-repeat",
        }}
      />
      
      {/* Fallback surface on scrollable content */}
      <div
        className="absolute inset-0 z-0 pointer-events-none select-none opacity-40"
        style={{
          backgroundImage: "url('/decor/student-workspace-bg.jpg')",
          backgroundSize: "100% 100%",
          backgroundPosition: "top left",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ─── Interactive Desk Workspace Canvas ────────────────────────────── */}
      <div className="relative z-10 w-full min-h-screen flex flex-col justify-start pb-16">
        
        {/* Top Section: Header Bar centered between the Plant (left) and the Lamp (right) */}
        <div className="w-full max-w-[1100px] xl:max-w-[1240px] 2xl:max-w-[1360px] mx-auto pt-6 px-6">
          <header className="flex items-center justify-between px-6 py-2.5 rounded-xl bg-[#06162d]/80 border border-white/10 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            
            {/* Left: Title & Breadcrumbs */}
            <div className="flex items-center gap-3.5">
              <h1 
                className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Student Workspace
              </h1>
              <span className="text-white/30 text-lg font-light">|</span>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/75">
                <button 
                  onClick={() => setLocation("/students")}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Students
                </button>
                <span className="text-white/40">/</span>
                <span className="text-white/95 font-medium">{fullName}</span>
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
                className="bg-[#0a203f]/80 hover:bg-[#122e56] border-white/20 text-white text-xs font-medium rounded-lg h-8 px-3.5 gap-2 backdrop-blur-md transition-all shadow-sm cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 text-white/80" />
                <span>Preview Parent Portal</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setLocation(`/archived/students/${studentId}`)}
                className="h-8 w-8 rounded-lg bg-[#0a203f]/80 hover:bg-[#122e56] border-white/20 text-white/80 hover:text-white backdrop-blur-md transition-all shadow-sm cursor-pointer"
                title="More options & Legacy Workspace (PG-030-ARC)"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </header>
        </div>

        {/* ─── Folio Area (Tabs + Leather Desk Pad) ─────────────────────────── */}
        <div className="w-full max-w-[1240px] xl:max-w-[1380px] 2xl:max-w-[1500px] mx-auto mt-4 px-6 flex flex-col">
          
          {/* Folio Index Tabs (sitting right on top of the desk pad) */}
          <div className="flex items-end justify-start gap-1 px-6 -mb-[1px] relative z-20 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "Overview", icon: User },
              { id: "timeline", label: "Timeline", icon: Clock },
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
                    "relative flex items-center gap-2 px-4 sm:px-5 py-2 rounded-t-lg text-xs font-semibold tracking-wide transition-all border-t border-x cursor-pointer",
                    isActive
                      ? "bg-[#0b284e] text-white border-white/25 z-20 border-b-0 pb-2.5 shadow-[0_-3px_10px_rgba(0,0,0,0.4)]"
                      : "bg-[#061427]/85 text-white/60 hover:text-white/90 hover:bg-[#081a33] border-white/10 border-b border-b-white/20 z-10"
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

          {/* ─── The Real Textured Leather Folio Desk Pad ───────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-full rounded-2xl overflow-visible shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
            style={{
              backgroundImage: "url('/decor/student-workspace-folio.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Tab Content Display */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10">
                
                {/* ─── LEFT PANEL: Student Profile & Family (~38% width) ────── */}
                <div className="lg:col-span-5 sm:px-6 py-2 flex flex-col justify-between relative">
                  <div className="flex flex-col items-center text-center">
                    
                    {/* Golden Glowing Avatar Badge */}
                    <div className="relative mb-3 mt-1">
                      <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37] bg-gradient-to-br from-[#122847] to-[#081628] flex items-center justify-center text-[#F4D068] font-bold text-2xl shadow-[0_0_24px_rgba(212,175,55,0.4)] ring-4 ring-[#081b35]/50">
                        {studentInitials}
                      </div>
                    </div>

                    {/* Student Name & School */}
                    <h2 
                      className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {fullName}
                    </h2>
                    <p className="text-xs sm:text-sm text-white/75 mt-1 drop-shadow-sm">
                      {student?.gradeLevel ? `${student.gradeLevel} Grade` : "5th Grade"} · {student?.schoolName || "Lincoln Elementary"}
                    </p>

                    {/* Pill Badges */}
                    <div className="flex items-center gap-2 mt-3">
                      <Badge className="bg-[#123159]/85 text-sky-200 hover:bg-[#123159] border border-sky-400/40 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full">
                        IEP
                      </Badge>
                      <Badge className="bg-[#093527]/85 text-emerald-300 hover:bg-[#093527] border border-emerald-500/40 text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{student?.studentStatus || "Active"}</span>
                      </Badge>
                    </div>

                    {/* Subtle Ornamental Divider */}
                    <div className="w-full flex items-center justify-center my-5">
                      <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                      <div className="w-1.5 h-1.5 rotate-45 border border-amber-400/50 bg-amber-400/30 mx-2" />
                      <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                    </div>

                    {/* Parent / Guardian Info */}
                    <div className="w-full text-left space-y-2 px-2">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-white/50">
                        PARENT / GUARDIAN
                      </p>
                      <div className="flex items-center gap-2.5 text-xs sm:text-sm text-white/95">
                        <User className="h-3.5 w-3.5 text-white/60 shrink-0" />
                        <span className="font-semibold">{parentName}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs sm:text-sm text-white/95">
                        <Phone className="h-3.5 w-3.5 text-white/60 shrink-0" />
                        <a href={`tel:${parentPhone}`} className="hover:text-amber-300 transition-colors">
                          {parentPhone}
                        </a>
                      </div>
                    </div>

                    {/* Student Details Button */}
                    <button
                      onClick={() => setDetailsModalOpen(true)}
                      className="w-full mt-5 py-2.5 px-4 rounded-xl bg-[#0b2447]/65 hover:bg-[#102f5c]/80 border border-[#D4AF37]/50 text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-amber-400/20 text-amber-300 text-xs">🪪</span>
                        <span>Student details</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/60 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Left Panel Footer: Call status, Portal, Plan */}
                  <div className="mt-6 pt-5 border-t border-white/10 space-y-2 text-xs px-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-white/60">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Client time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{clientTime} Eastern</span>
                        <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Good to call
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Portal</span>
                      <span className="text-emerald-400 font-semibold">Active</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Plan</span>
                      <span className="text-white/85 font-medium">{student?.plan || "Not selected"}</span>
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
                        onClick={() => setActiveTab("timeline")}
                        variant="outline"
                        size="sm"
                        className="bg-transparent hover:bg-white/5 border-white/20 text-white text-xs sm:text-sm font-semibold rounded-lg h-8 px-3 gap-2 cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5 text-white/70" />
                        <span>View timeline</span>
                      </Button>
                    </div>
                  </div>

                  {/* Bottom Center Hanging Tab */}
                  <div className="flex justify-center -mb-10 mt-5 relative z-30">
                    <button
                      onClick={() => setDetailsModalOpen(true)}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#0c2242] to-[#122e54] border border-[#D4AF37]/80 text-white text-xs sm:text-sm font-bold shadow-md hover:from-[#102c54] hover:to-[#183c6e] transition-all cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-300" />
                      <span>Case details</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Fallback View for Other Tabs */}
            {activeTab !== "overview" && (
              <div className="p-12 min-h-[480px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-lg">
                  {activeTab === "timeline" && <Clock className="h-7 w-7" />}
                  {activeTab === "communication" && <MessageSquare className="h-7 w-7" />}
                  {activeTab === "tasks" && <CheckSquare className="h-7 w-7" />}
                  {activeTab === "notes" && <FileText className="h-7 w-7" />}
                  {activeTab === "documents" && <Folder className="h-7 w-7" />}
                  {activeTab === "more" && <MoreHorizontal className="h-7 w-7" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white capitalize">{activeTab} Workspace</h3>
                  <p className="text-xs text-white/60 mt-1 max-w-md">
                    Active section for {fullName}. You can also reference the original 11-tab legacy console anytime.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={() => setActiveTab("overview")}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-9 px-4"
                  >
                    Return to Overview Desk
                  </Button>
                  <Button
                    onClick={() => setLocation(`/archived/students/${studentId}`)}
                    variant="outline"
                    className="border-white/20 text-white bg-white/5 hover:bg-white/10 text-xs rounded-xl h-9 px-4"
                  >
                    Open Legacy Workspace (PG-030-ARC)
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
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
