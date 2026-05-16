import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Clock, Phone, Video, CheckCircle2, Loader2, ChevronRight, User
} from "lucide-react";
import InlineScheduler from "@/components/InlineScheduler";

function formatDuration(duration: number, durationUnit?: string) {
  if (durationUnit === 'hours') {
    return `${duration} ${duration === 1 ? 'hour' : 'hours'}`;
  }
  if (duration < 60) return `${duration} min`;
  const h = Math.floor(duration / 60);
  const m = duration % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
}

export default function PortalBook() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState<number | null>(null);
  const [bookedInfo, setBookedInfo] = useState<{ date: string; time: string; sessionName: string } | null>(null);

  const { data: myStudents = [], isLoading: studentsLoading } = trpc.portal.getMyStudents.useQuery(undefined, { retry: false });
  const { data: sessionTypes = [], isLoading } = trpc.sessionTypes.listAll.useQuery(undefined, { retry: false });
  const selectedType = sessionTypes.find((st: any) => st.id === selectedSessionTypeId);
  const selectedStudent = (myStudents as any[]).find((s: any) => s.id === selectedStudentId) ?? ((myStudents as any[]).length === 1 ? (myStudents as any[])[0] : null);
  // Auto-select if only one student
  const effectiveStudentId = selectedStudent?.id ?? null;

  function handleBooked(date: string, time: string) {
    setBookedInfo({
      date,
      time,
      sessionName: selectedType?.name ?? "Session",
    });
  }

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (bookedInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1b2e] via-[#0f2340] to-[#0d1b2e] flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setLocation("/portal")}
            className="flex items-center gap-1.5 text-sm text-blue-300/70 hover:text-blue-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portal
          </button>
        </div>

        {/* Confirmed card */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center animate-[bounce_0.6s_ease-out_1]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">You're Booked!</h1>
              <p className="text-blue-200/70 mt-1">Your session has been scheduled. We'll be in touch with details.</p>
            </div>
            {/* Appointment card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-left space-y-4">
              <p className="text-xs font-semibold text-blue-300/60 uppercase tracking-wider">Appointment Details</p>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/20 border border-blue-500/30 p-2.5">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{bookedInfo.sessionName}</p>
                  <p className="text-sm text-blue-200/70">{bookedInfo.date} at {bookedInfo.time}</p>
                </div>
              </div>
              {selectedType && (
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500/20 border border-blue-500/30 p-2.5">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-sm text-blue-200/70">{formatDuration(selectedType.duration, selectedType.durationUnit)}</p>
                </div>
              )}
              {selectedType?.sessionFormat && (
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500/20 border border-blue-500/30 p-2.5">
                    {selectedType.sessionFormat === "phone" ? (
                      <Phone className="h-5 w-5 text-blue-400" />
                    ) : (
                      <Video className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  <p className="text-sm text-blue-200/70 capitalize">
                    {selectedType.sessionFormat === "phone" ? "Phone Call" : "Video Call"}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setLocation("/portal")}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-900/40 transition-colors"
            >
              Back to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Calendar view (after selecting session type) ─────────────────────────
  if (selectedSessionTypeId && selectedType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1b2e] via-[#0f2340] to-[#0d1b2e] flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setSelectedSessionTypeId(null)}
            className="flex items-center gap-1.5 text-sm text-blue-300/70 hover:text-blue-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm font-medium text-blue-100/80">Schedule a Session</span>
        </div>

        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
          {/* Selected session type summary */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-4">
            <div className="rounded-xl bg-blue-500/20 border border-blue-500/30 p-3 flex-shrink-0">
              {selectedType.sessionFormat === "phone" ? (
                <Phone className="h-5 w-5 text-blue-400" />
              ) : (
                <Video className="h-5 w-5 text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{selectedType.name}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-blue-200/70 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(selectedType.duration, selectedType.durationUnit)}
                </span>
                <span className="flex items-center gap-1 capitalize">
                  {selectedType.sessionFormat === "phone" ? (
                    <><Phone className="h-3.5 w-3.5" /> Phone Call</>
                  ) : (
                    <><Video className="h-3.5 w-3.5" /> Video Call</>
                  )}
                </span>
              </div>
              {selectedType.description && (
                <p className="text-sm text-blue-200/60 mt-1">{selectedType.description}</p>
              )}
            </div>
          </div>

          {/* Calendar scheduler */}
          <InlineScheduler
            sessionTypeId={selectedSessionTypeId}
            sessionTypeName={selectedType.name}
            sessionDuration={String(selectedType.durationUnit).trim() === 'hours' ? Number(selectedType.duration) * 60 : Number(selectedType.duration)}
            parentName={user?.name ?? ""}
            parentEmail={user?.email ?? ""}
            clientId={effectiveStudentId}
            onBooked={handleBooked}
          />
        </div>
      </div>
    );
  }

  // ── Session type selector ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1b2e] via-[#0f2340] to-[#0d1b2e] flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => setLocation("/portal")}
          className="flex items-center gap-1.5 text-sm text-blue-300/70 hover:text-blue-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </button>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-sm font-medium text-blue-100/80">Schedule a Session</span>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 space-y-8">
        {/* Title */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Schedule a Session</h1>
          <p className="text-blue-200/70">Pick a date and time that works for you.</p>
        </div>

        {/* Student selector — shown when parent has multiple students and none selected yet */}
        {(myStudents as any[]).length > 1 && !selectedStudentId && (
          <div className="space-y-4">
            <p className="text-center text-sm text-blue-200/60">Who is this session for?</p>
            <div className="grid grid-cols-1 gap-3">
              {(myStudents as any[]).map((student: any) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="group w-full rounded-2xl border border-white/10 bg-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all p-5 text-left flex items-center gap-4"
                >
                  <div className="flex-shrink-0 rounded-xl bg-blue-500/20 border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors p-3">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-base">{student.firstName} {student.lastName}</p>
                    {student.caseId && <p className="text-sm text-blue-200/50 mt-0.5">Case {student.caseId}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-blue-400/40 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Session type blocks — only show after student is selected (or if only one student) */}
        {((myStudents as any[]).length <= 1 || !!selectedStudentId) && (
          isLoading || studentsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400/60" />
            </div>
          ) : sessionTypes.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Calendar className="h-7 w-7 text-blue-300/40" />
              </div>
              <p className="text-white font-medium">No sessions available</p>
              <p className="text-sm text-blue-200/50">Please contact us directly to schedule a meeting.</p>
            </div>
          ) : (
            <>
              <p className="text-center text-sm text-blue-200/60">Select the type of session you'd like to book:</p>
              <div className="grid grid-cols-1 gap-3">
                {sessionTypes.map((st: any) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedSessionTypeId(st.id)}
                    className="group w-full rounded-2xl border border-white/10 bg-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all p-5 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 rounded-xl bg-blue-500/20 border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors p-3">
                        {st.sessionFormat === "phone" ? (
                          <Phone className="h-5 w-5 text-blue-400" />
                        ) : (
                          <Video className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-base">{st.name}</p>
                        {st.description && (
                          <p className="text-sm text-blue-200/60 mt-0.5 line-clamp-2">{st.description}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className="text-sm text-blue-300/60">{formatDuration(st.duration, st.durationUnit)}</span>
                        <ChevronRight className="h-4 w-4 text-blue-400/40 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
