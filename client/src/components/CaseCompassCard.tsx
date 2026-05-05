import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";

// Animated compass SVG icon
function CompassIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
      {/* Cardinal marks */}
      <line x1="32" y1="4" x2="32" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="54" x2="32" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="32" x2="10" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="54" y1="32" x2="60" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* N label */}
      <text x="32" y="20" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">N</text>
      {/* Needle — north red, south muted */}
      <polygon points="32,14 29,32 32,29 35,32" fill="hsl(var(--accent))" />
      <polygon points="32,50 29,32 32,35 35,32" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground leading-relaxed">{value}</p>
    </div>
  );
}

export default function CaseCompassCard() {
  const [showHistory, setShowHistory] = useState(false);

  const { data: compass, isLoading } = trpc.caseCompass.myCompass.useQuery();
  const { data: history } = trpc.caseCompass.myHistory.useQuery(undefined, {
    enabled: showHistory,
  });

  if (isLoading) {
    return (
      <Card className="rounded-xl border border-border bg-card p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 rounded bg-muted mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
        </div>
      </Card>
    );
  }

  if (!compass) {
    return (
      <Card className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center shadow-sm">
        <CompassIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="font-semibold text-foreground">Your Case Compass is being set up</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your advocate will update this once your case is active.
        </p>
      </Card>
    );
  }

  const isRecentlyUpdated =
    compass.updatedAt &&
    Date.now() - new Date(compass.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000; // within 7 days

  return (
    <div className="space-y-3">
      <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 border-b border-border bg-accent/5 px-6 py-4">
          <div className={`flex-shrink-0 ${isRecentlyUpdated ? "animate-[spin_8s_linear_infinite]" : ""}`}>
            <CompassIcon className="h-9 w-9 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground text-base tracking-tight">
              Waypoint Case Compass™
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 flex-shrink-0" />
              Updated {new Date(compass.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {isRecentlyUpdated && (
                <span className="ml-2 inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                  New update
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-4">
          <FieldRow label="Current Status" value={compass.currentStatus} />
          <FieldRow label="Summary of Last Meeting" value={compass.lastMeetingSummary} />
          <FieldRow label="Next Step" value={compass.nextStep} />

          {compass.whoHasBall && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Who Has the Ball
              </p>
              <div className="flex flex-wrap gap-2">
                {compass.whoHasBall.split(/[,\n]+/).map((party, i) => (
                  party.trim() && (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground"
                    >
                      {party.trim()}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}

          {compass.nextMeetingDate && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Next Meeting
              </p>
              <p className="text-sm font-semibold text-accent">
                {new Date(compass.nextMeetingDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>

        {/* History toggle */}
        <div className="border-t border-border px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Clock className="h-3.5 w-3.5" />
            {showHistory ? "Hide" : "View"} Case History
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </Card>

      {/* History panel */}
      {showHistory && (
        <div className="space-y-3 pl-2 border-l-2 border-accent/20">
          {history && history.length > 0 ? (
            history.map((entry) => (
              <Card
                key={entry.id}
                className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
              >
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(entry.savedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                {entry.currentStatus && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="text-sm text-foreground">{entry.currentStatus}</p>
                  </div>
                )}
                {entry.nextStep && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next Step</p>
                    <p className="text-sm text-foreground">{entry.nextStep}</p>
                  </div>
                )}
                {entry.whoHasBall && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who Had the Ball</p>
                    <p className="text-sm text-foreground">{entry.whoHasBall}</p>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No history yet — your advocate's updates will appear here over time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
