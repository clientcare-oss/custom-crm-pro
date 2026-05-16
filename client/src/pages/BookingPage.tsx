import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, ChevronLeft, Loader2 } from "lucide-react";
import InlineScheduler from "@/components/InlineScheduler";

export default function BookingPage() {
  const params = new URLSearchParams(window.location.search);
  const preselectedId = params.get("session") ? parseInt(params.get("session")!, 10) : null;
  const isPreview = params.get("preview") === "true";

  const { data: sessionTypes, isLoading } = trpc.sessionTypes.listAll.useQuery(undefined, { retry: false });

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(preselectedId);
  const [booked, setBooked] = useState(false);
  const [bookedDate, setBookedDate] = useState("");
  const [bookedTime, setBookedTime] = useState("");

  useEffect(() => {
    if (!preselectedId && sessionTypes?.length === 1) {
      setSelectedTypeId(sessionTypes[0].id);
    }
  }, [sessionTypes, preselectedId]);

  const selectedType = sessionTypes?.find((t) => t.id === selectedTypeId);

  const handleBooked = (date: string, time: string) => {
    setBookedDate(date);
    setBookedTime(time);
    setBooked(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Schedule a Session</h1>
          <p className="text-slate-400 mt-2">Pick a date and time that works for you.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : booked ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">You're Booked!</h2>
              <p className="text-slate-300 mt-2">
                {selectedType?.name} on{" "}
                {new Date(bookedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}{" "}
                at{" "}
                {(() => {
                  const [h, m] = bookedTime.split(":").map(Number);
                  const period = h >= 12 ? "PM" : "AM";
                  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
                })()}
              </p>
              <p className="text-slate-400 text-sm mt-3">We'll send you a confirmation shortly.</p>
            </div>
          </div>
        ) : !selectedTypeId ? (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm text-center mb-4">Select the type of session you'd like to book:</p>
            {(sessionTypes ?? []).length === 0 && (
              <p className="text-slate-500 text-sm text-center italic">No sessions available. Please contact us directly.</p>
            )}
            {(sessionTypes ?? []).map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedTypeId(st.id)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 hover:border-blue-500/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white group-hover:text-blue-300 transition-colors">{st.name}</p>
                  {st.description && <p className="text-slate-400 text-sm mt-0.5 truncate">{st.description}</p>}
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {st.duration} {st.durationUnit === 'hours' ? (st.duration === 1 ? 'hour' : 'hours') : 'min'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {!preselectedId && (
              <button
                onClick={() => setSelectedTypeId(null)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to session types
              </button>
            )}
            <InlineScheduler
              sessionTypeId={selectedTypeId}
              sessionTypeName={selectedType?.name}
              sessionDuration={selectedType?.duration ?? 60}
              parentName=""
              parentEmail=""
              onBooked={handleBooked}
              isPreview={isPreview}
            />
          </div>
        )}
      </div>
    </div>
  );
}
