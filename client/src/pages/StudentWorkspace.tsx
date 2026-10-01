import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ExternalLink, Archive, GraduationCap, School, Shield, User, Sparkles, ChevronRight, Layers, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function StudentWorkspace() {
  const params = useParams<{ id: string }>();
  const studentId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const [isFullBleed, setIsFullBleed] = useState(false);

  // Fetch student/contact details
  const { data, isLoading, error } = trpc.contacts.detail.useQuery(
    { id: studentId },
    { enabled: !!studentId }
  );

  const student = data?.contact;

  return (
    <div
      className={cn(
        "relative w-full min-h-[calc(100vh-0px)] overflow-x-hidden overflow-y-auto select-none bg-[#071326] transition-all",
        isFullBleed && "fixed inset-0 z-50 h-screen w-screen"
      )}
      style={{
        backgroundImage: "url('/decor/student-workspace-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Subtle vignette overlay to ensure text and UI layers remain ultra-readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* Top Floating Command Bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 bg-[#0a192f]/70 backdrop-blur-md border-b border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/students")}
            className="text-white/80 hover:text-white hover:bg-white/10 gap-2 border border-white/10 rounded-xl px-3 py-1.5 h-9"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs font-semibold">Students Roster</span>
          </Button>

          <div className="h-5 w-px bg-white/20" />

          {/* Student Identity Header */}
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 bg-white/20 animate-pulse rounded" />
              <div className="h-4 w-16 bg-white/10 animate-pulse rounded" />
            </div>
          ) : student ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-sm shadow-inner">
                {student.firstName?.[0] || "S"}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-white drop-shadow-sm">
                    {student.firstName} {student.lastName}
                  </h1>
                  {student.studentStatus && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-semibold uppercase px-2 py-0.5">
                      {student.studentStatus}
                    </Badge>
                  )}
                  {student.caseId && (
                    <span className="text-[11px] font-mono text-amber-300/80 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                      Case #{student.caseId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/60">
                  {student.gradeLevel && <span>Grade {student.gradeLevel}</span>}
                  {student.gradeLevel && student.schoolName && <span>·</span>}
                  {student.schoolName && (
                    <span className="flex items-center gap-1">
                      <School className="h-3 w-3 text-white/40" />
                      {student.schoolName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/60">Student Workspace</div>
          )}
        </div>

        {/* Right Action Suite */}
        <div className="flex items-center gap-3">
          {/* Legacy Workspace Quick Switcher */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/archived/students/${studentId}`)}
            className="bg-white/5 hover:bg-white/10 border-amber-400/30 hover:border-amber-400/60 text-amber-300 text-xs font-medium rounded-xl gap-2 h-9 px-3.5 shadow-sm transition-all"
            title="Open the archived 11-tab workspace for this student"
          >
            <Archive className="h-3.5 w-3.5 text-amber-400" />
            <span>Legacy Workspace (PG-030-ARC)</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Button>

          {/* Full Bleed Viewport Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullBleed(!isFullBleed)}
            className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10"
            title={isFullBleed ? "Exit full-bleed view" : "Full-bleed desk view"}
          >
            {isFullBleed ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Main Executive Desk Surface */}
      <main className="relative z-10 w-full min-h-[calc(100vh-73px)] p-8 flex flex-col items-center justify-start">
        {/* Placeholder workspace canvas banner ready for building layers */}
        <div className="w-full max-w-5xl mt-6">
          <div className="p-8 rounded-2xl bg-[#09182d]/60 backdrop-blur-md border border-white/15 shadow-2xl text-center flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-950/30">
              <Layers className="w-7 h-7" />
            </div>

            <div className="space-y-1 max-w-xl">
              <h2 className="text-xl font-bold tracking-tight text-white drop-shadow">
                Executive Student Desk Canvas
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Background image is live wall-to-wall and ceiling-to-floor. Ready to build custom advocate widgets, case documents, sticky notes, IEP tools, and interactive modules on top of this desk.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className="border-amber-400/30 text-amber-300 bg-amber-400/10 font-mono text-xs">
                PG-030 · Active Redesign Canvas
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/70 bg-white/5 text-xs">
                Full-Bleed Responsive Grid
              </Badge>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
