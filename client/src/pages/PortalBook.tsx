import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  ArrowLeft, Calendar, Clock, Phone, Video, CheckCircle2, Loader2, User
} from "lucide-react";
import InlineScheduler from "@/components/InlineScheduler";

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`;
}

export default function PortalBook() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState<number | null>(null);
  const [bookedInfo, setBookedInfo] = useState<{ date: string; time: string; sessionName: string } | null>(null);

  const { data: sessionTypes = [], isLoading } = trpc.sessionTypes.listAll.useQuery(undefined, { retry: false });
  const selectedType = sessionTypes.find((st: any) => st.id === selectedSessionTypeId);

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
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setLocation("/portal")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portal
          </button>
        </div>

        {/* Confirmed card */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">You're Booked!</h1>
              <p className="text-muted-foreground mt-1">Your session has been scheduled. We'll be in touch with details.</p>
            </div>
            {/* Appointment card */}
            <div className="rounded-xl border border-border bg-card p-6 text-left space-y-3 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appointment Details</p>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-accent/10 p-2">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{bookedInfo.sessionName}</p>
                  <p className="text-sm text-muted-foreground">{bookedInfo.date} at {bookedInfo.time}</p>
                </div>
              </div>
              {selectedType && (
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-accent/10 p-2">
                    <Clock className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDuration(selectedType.duration)}</p>
                </div>
              )}
              {selectedType?.sessionFormat && (
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-accent/10 p-2">
                    {selectedType.sessionFormat === "phone" ? (
                      <Phone className="h-5 w-5 text-accent" />
                    ) : (
                      <Video className="h-5 w-5 text-accent" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedType.sessionFormat === "phone" ? "Phone Call" : "Video Call"}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setLocation("/portal")}
              className="w-full rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-sm hover:opacity-90 transition-opacity"
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
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setSelectedSessionTypeId(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-foreground">Schedule a Session</span>
        </div>

        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
          {/* Selected session type summary */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-start gap-4">
            <div className="rounded-full bg-accent/10 p-3 flex-shrink-0">
              {selectedType.sessionFormat === "phone" ? (
                <Phone className="h-5 w-5 text-accent" />
              ) : (
                <Video className="h-5 w-5 text-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{selectedType.name}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(selectedType.duration)}
                </span>
                <span className="flex items-center gap-1 capitalize">
                    {selectedType.sessionFormat === "phone" ? (
                      <><Phone className="h-5 w-5 text-accent" /> Phone Call</>
                    ) : (
                      <><Video className="h-5 w-5 text-accent" /> Video Call</>
                    )}
                </span>
              </div>
              {selectedType.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedType.description}</p>
              )}
            </div>
          </div>

          {/* Calendar scheduler */}
          <InlineScheduler
            sessionTypeId={selectedSessionTypeId}
            sessionTypeName={selectedType.name}
            sessionDuration={selectedType.duration}
            parentName={user?.name ?? ""}
            parentEmail={user?.email ?? ""}
            onBooked={handleBooked}
          />
        </div>
      </div>
    );
  }

  // ── Session type selector ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => setLocation("/portal")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm font-medium text-foreground">Schedule a Session</span>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Calendar className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Schedule a Session</h1>
          <p className="text-muted-foreground">Choose the type of session you'd like to book.</p>
        </div>

        {/* Session type blocks */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sessionTypes.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No sessions available</p>
            <p className="text-sm text-muted-foreground">Please contact us directly to schedule a meeting.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sessionTypes.map((st: any) => (
              <button
                key={st.id}
                onClick={() => setSelectedSessionTypeId(st.id)}
                className="group w-full rounded-xl border border-border bg-card hover:border-accent hover:bg-accent/5 transition-all p-5 text-left shadow-sm hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors p-3">
                  {st.sessionFormat === "phone" ? (
                    <Phone className="h-5 w-5 text-accent" />
                  ) : (
                    <Video className="h-5 w-5 text-accent" />
                  )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-base">{st.name}</p>
                    {st.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{st.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(st.duration)}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        {st.sessionFormat === "phone" ? (
                        <><Phone className="h-3.5 w-3.5" /> Phone Call</>
                      ) : (
                        <><Video className="h-3.5 w-3.5" /> Video Call</>
                      )}
                      </span>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center">
                    <div className="rounded-full bg-muted group-hover:bg-accent/20 p-1.5 transition-colors">
                      <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
