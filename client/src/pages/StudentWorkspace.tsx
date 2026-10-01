import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ExternalLink, Archive, School, Layers, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StudentWorkspace() {
  const params = useParams<{ id: string }>();
  const studentId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const [isFullBleed, setIsFullBleed] = useState(false);

  // Fetch student/contact details
  const { data, isLoading } = trpc.contacts.detail.useQuery(
    { id: studentId },
    { enabled: !!studentId }
  );

  const student = data?.contact;

  return (
    <div
      className={cn(
        "relative w-full min-h-screen overflow-x-hidden overflow-y-auto select-none bg-[#071326] transition-all",
        isFullBleed && "fixed inset-0 z-50 h-screen w-screen"
      )}
      style={{
        backgroundImage: "url('/decor/student-workspace-bg.jpg')",
        backgroundSize: "cover",
        // Position top center ensures the plants (top left) and lamp (top right) are anchored right to the ceiling!
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Top area is completely transparent & unobstructed: plants (top-left) & lamp (top-right) are 100% visible */}

      {/* Discreet utility pill in top-right corner to allow toggling full-bleed view without blocking the lamp */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsFullBleed(!isFullBleed)}
          className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all"
          title={isFullBleed ? "Exit full-bleed view" : "Full-bleed desk view"}
        >
          {isFullBleed ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Main Workspace: Central area with header faded in right in the middle */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* Faded-in Header in the middle of the page */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="w-full max-w-4xl rounded-2xl bg-[#09182d]/85 backdrop-blur-xl border border-white/15 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        >
          {/* Top row inside the middle header card */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            {/* Left: Back button & Navigation breadcrumb */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/students")}
                className="text-white/80 hover:text-white hover:bg-white/10 gap-2 border border-white/10 rounded-xl px-3 py-1.5 h-8 text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Students Roster</span>
              </Button>

              <Badge variant="outline" className="border-amber-400/40 text-amber-300 bg-amber-400/10 font-mono text-[11px] px-2 py-0.5">
                PG-030
              </Badge>
            </div>

            {/* Right: Switcher to Legacy 11-Tab Workspace */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/archived/students/${studentId}`)}
              className="bg-white/5 hover:bg-white/10 border-amber-400/30 hover:border-amber-400/60 text-amber-300 text-xs font-medium rounded-xl gap-2 h-8 px-3 shadow-sm transition-all"
              title="Open the archived 11-tab workspace for this student"
            >
              <Archive className="h-3.5 w-3.5 text-amber-400" />
              <span>Legacy Workspace (PG-030-ARC)</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Button>
          </div>

          {/* Student Identity and Case Status */}
          <div className="pt-5 flex flex-wrap items-center justify-between gap-4">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-white/20 animate-pulse rounded" />
                  <div className="h-4 w-32 bg-white/10 animate-pulse rounded" />
                </div>
              </div>
            ) : student ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-400/40 text-amber-300 font-bold text-lg shadow-inner">
                  {student.firstName?.[0] || "S"}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
                      {student.firstName} {student.lastName}
                    </h1>
                    {student.studentStatus && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-semibold uppercase px-2.5 py-0.5">
                        {student.studentStatus}
                      </Badge>
                    )}
                    {student.caseId && (
                      <span className="text-xs font-mono text-amber-300/90 bg-amber-400/10 border border-amber-400/25 px-2.5 py-0.5 rounded-md">
                        Case #{student.caseId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/70 mt-1">
                    {student.gradeLevel && <span>Grade: {student.gradeLevel}</span>}
                    {student.gradeLevel && student.schoolName && <span>·</span>}
                    {student.schoolName && (
                      <span className="flex items-center gap-1.5">
                        <School className="h-3.5 w-3.5 text-white/50" />
                        {student.schoolName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/70">Student Workspace</div>
            )}
          </div>
        </motion.div>

        {/* Ready canvas cue */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          className="mt-6 flex items-center gap-2 text-xs text-amber-200/70 bg-black/30 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md"
        >
          <Layers className="h-3.5 w-3.5 text-amber-400" />
          <span>Desk Canvas Active · Top unobstructed for plants & lamp</span>
        </motion.div>
      </div>
    </div>
  );
}
