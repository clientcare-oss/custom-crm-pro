import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, Activity, BookOpen, ArrowRightCircle, Zap, CalendarCheck } from "lucide-react";

// ─── Compass Config and Calculations ──────────────────────────────────────────

const SECTIONS = [
  {
    key: "currentStatus" as const,
    label: "Current Status",
    icon: Activity,
    angle: 0,
    accent: "text-blue-500 dark:text-blue-400",
    bg: "from-blue-500/10 to-blue-500/5",
    border: "border-blue-500/30",
    fill: "rgba(59, 130, 246, 0.08)",
    hoverFill: "rgba(59, 130, 246, 0.2)",
    stroke: "rgba(59, 130, 246, 0.2)",
    activeStroke: "rgba(59, 130, 246, 0.7)",
  },
  {
    key: "nextMeetingDate" as const,
    label: "Next Meeting",
    icon: CalendarCheck,
    angle: 72,
    accent: "text-rose-500 dark:text-rose-400",
    bg: "from-rose-500/10 to-rose-500/5",
    border: "border-rose-500/30",
    fill: "rgba(244, 63, 94, 0.08)",
    hoverFill: "rgba(244, 63, 94, 0.2)",
    stroke: "rgba(244, 63, 94, 0.2)",
    activeStroke: "rgba(244, 63, 94, 0.7)",
  },
  {
    key: "nextStep" as const,
    label: "Next Step",
    icon: ArrowRightCircle,
    angle: 144,
    accent: "text-emerald-500 dark:text-emerald-400",
    bg: "from-emerald-500/10 to-emerald-500/5",
    border: "border-emerald-500/30",
    fill: "rgba(16, 185, 129, 0.08)",
    hoverFill: "rgba(16, 185, 129, 0.2)",
    stroke: "rgba(16, 185, 129, 0.2)",
    activeStroke: "rgba(16, 185, 129, 0.7)",
  },
  {
    key: "lastMeetingSummary" as const,
    label: "Last Meeting",
    icon: BookOpen,
    angle: 216,
    accent: "text-violet-500 dark:text-violet-400",
    bg: "from-violet-500/10 to-violet-500/5",
    border: "border-violet-500/30",
    fill: "rgba(139, 92, 246, 0.08)",
    hoverFill: "rgba(139, 92, 246, 0.2)",
    stroke: "rgba(139, 92, 246, 0.2)",
    activeStroke: "rgba(139, 92, 246, 0.7)",
  },
  {
    key: "whoHasBall" as const,
    label: "Who Has the Ball",
    icon: Zap,
    angle: 288,
    accent: "text-amber-500 dark:text-amber-400",
    bg: "from-amber-500/10 to-amber-500/5",
    border: "border-amber-500/30",
    fill: "rgba(245, 158, 11, 0.08)",
    hoverFill: "rgba(245, 158, 11, 0.2)",
    stroke: "rgba(245, 158, 11, 0.2)",
    activeStroke: "rgba(245, 158, 11, 0.7)",
  },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function getSectorPath(cx: number, cy: number, rInner: number, rOuter: number, startAngle: number, endAngle: number) {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;

  const x1_out = cx + rOuter * Math.cos(startRad);
  const y1_out = cy + rOuter * Math.sin(startRad);
  const x2_out = cx + rOuter * Math.cos(endRad);
  const y2_out = cy + rOuter * Math.sin(endRad);

  const x1_in = cx + rInner * Math.cos(endRad);
  const y1_in = cy + rInner * Math.sin(endRad);
  const x2_in = cx + rInner * Math.cos(startRad);
  const y2_in = cy + rInner * Math.sin(startRad);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1_out} ${y1_out} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2_out} ${y2_out} L ${x1_in} ${y1_in} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2_in} ${y2_in} Z`;
}

function RichText({ value }: { value: string }) {
  const lines = value.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        if (line.trim() === "---") return <hr key={li} className="my-3 border-border" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={li}>
            {parts.map((part, pi) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={pi} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
              ) : (
                <span key={pi}>{part}</span>
              )
            )}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

// Animated compass icon for header
function CompassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
      <line x1="32" y1="4" x2="32" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="54" x2="32" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="32" x2="10" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="54" y1="32" x2="60" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <text x="32" y="20" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">N</text>
      <polygon points="32,14 29,32 32,29 35,32" fill="hsl(var(--accent))" />
      <polygon points="32,50 29,32 32,35 35,32" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

interface CaseCompassCardProps {
  caseId?: string;
}

export default function CaseCompassCard({ caseId }: CaseCompassCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("currentStatus");
  const [hoveredSection, setHoveredSection] = useState<SectionKey | null>(null);

  const { data: studentCompass, isLoading: loadingStudent } = trpc.portal.getStudentCompass.useQuery(
    { caseId: caseId! },
    { enabled: !!caseId }
  );
  const { data: studentHistory } = trpc.portal.getStudentHistory.useQuery(
    { caseId: caseId! },
    { enabled: !!caseId && showHistory }
  );

  const { data: myCompass, isLoading: loadingMy } = trpc.caseCompass.myCompass.useQuery(
    undefined,
    { enabled: !caseId }
  );
  const { data: myHistory } = trpc.caseCompass.myHistory.useQuery(undefined, {
    enabled: !caseId && showHistory,
  });

  const compass = caseId ? studentCompass : myCompass;
  const history = caseId ? studentHistory : myHistory;
  const isLoading = caseId ? loadingStudent : loadingMy;

  const activeSectionObj = useMemo(() => {
    return SECTIONS.find((s) => s.key === activeSection) || SECTIONS[0];
  }, [activeSection]);

  if (isLoading) {
    return (
      <Card className="rounded-xl border border-border bg-card p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 rounded bg-muted mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
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

  const rawValue = compass[activeSectionObj.key];
  const displayValue =
    activeSectionObj.key === "nextMeetingDate" && rawValue
      ? new Date(rawValue).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : String(rawValue ?? "");

  const isRecentlyUpdated =
    compass.updatedAt &&
    Date.now() - new Date(compass.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  // Center coordinate math for SVG
  const cx = 130;
  const cy = 130;
  const rInner = 40;
  const rOuter = 95;
  const rMid = 67.5;

  return (
    <div className="space-y-3">
      <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Card Header */}
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

        {/* Interactive Interactive Layout */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Side: SVG Compass Rose */}
            <div className="col-span-1 md:col-span-5 flex justify-center">
              <div className="relative w-[260px] h-[260px] select-none">
                <svg viewBox="0 0 260 260" className="w-full h-full text-muted-foreground/30">
                  {/* Decorative outer ticks and outer circles */}
                  <circle cx={cx} cy={cy} r="124" stroke="currentColor" strokeWidth="0.75" className="opacity-15 text-muted-foreground" />
                  <circle cx={cx} cy={cy} r="115" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" className="opacity-25 text-muted-foreground" />
                  
                  {/* Cardinal direction markers - premium geometric typography */}
                  <text x={cx} y="22" textAnchor="middle" className="text-[14px] font-extrabold fill-foreground/75 tracking-wider select-none font-sans">N</text>
                  <text x="248" y="135" textAnchor="middle" className="text-[14px] font-extrabold fill-foreground/50 tracking-wider select-none font-sans">E</text>
                  <text x={cx} y="248" textAnchor="middle" className="text-[14px] font-extrabold fill-foreground/50 tracking-wider select-none font-sans">S</text>
                  <text x="12" y="135" textAnchor="middle" className="text-[14px] font-extrabold fill-foreground/50 tracking-wider select-none font-sans">W</text>

                  {/* Wedge/Sector group */}
                  <g className="cursor-pointer">
                    {SECTIONS.map((sec, idx) => {
                      const isActive = activeSection === sec.key;
                      const isHovered = hoveredSection === sec.key;
                      // 72 degrees per wedge. Gap of 2 degrees -> wedge span of 70 degrees
                      const startAngle = sec.angle - 35;
                      const endAngle = sec.angle + 35;
                      const pathStr = getSectorPath(cx, cy, rInner, rOuter, startAngle, endAngle);

                      return (
                        <path
                          key={sec.key}
                          d={pathStr}
                          fill={isActive ? sec.fill : isHovered ? sec.hoverFill : "transparent"}
                          stroke={isActive ? sec.activeStroke : isHovered ? sec.stroke : "currentColor"}
                          strokeWidth={isActive ? "2" : "1.25"}
                          className="transition-all duration-200 ease-out"
                          onClick={() => setActiveSection(sec.key)}
                          onMouseEnter={() => setHoveredSection(sec.key)}
                          onMouseLeave={() => setHoveredSection(null)}
                        />
                      );
                    })}
                  </g>

                  {/* Rotating dual-pointed needle pointer */}
                  <g style={{
                    transform: `rotate(${activeSectionObj.angle}deg)`,
                    transformOrigin: `${cx}px ${cy}px`,
                    transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}>
                    {/* Top needle cap pointer */}
                    <polygon points={`${cx},${cy} ${cx - 7},${cy} ${cx},45 ${cx + 7},${cy}`} className="fill-accent filter drop-shadow-md" />
                    {/* Bottom needle cap pointer */}
                    <polygon points={`${cx},${cy} ${cx - 7},${cy} ${cx},215 ${cx + 7},${cy}`} className="fill-muted-foreground/35" />
                    
                    {/* Needle pivot cap with brass/gold styling */}
                    <circle cx={cx} cy={cy} r="10" className="fill-card stroke-accent" strokeWidth="2" />
                    <circle cx={cx} cy={cy} r="4" className="fill-accent" />
                  </g>
                </svg>

                {/* Absolutely positioned Lucide icons layered over wedge centerpoints */}
                {SECTIONS.map((sec) => {
                  const IconComp = sec.icon;
                  const isActive = activeSection === sec.key;
                  const isHovered = hoveredSection === sec.key;
                  const angleRad = ((sec.angle - 90) * Math.PI) / 180;
                  const iconX = cx + rMid * Math.cos(angleRad);
                  const iconY = cy + rMid * Math.sin(angleRad);

                  return (
                    <button
                      key={sec.key}
                      style={{ left: `${iconX}px`, top: `${iconY}px` }}
                      onClick={() => setActiveSection(sec.key)}
                      onMouseEnter={() => setHoveredSection(sec.key)}
                      onMouseLeave={() => setHoveredSection(null)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow-sm border transition-all duration-200 ${
                        isActive
                          ? "border-accent text-accent scale-110"
                          : isHovered
                          ? "border-muted-foreground/40 text-foreground scale-105"
                          : "border-border text-muted-foreground/80 hover:text-foreground"
                      }`}
                      title={sec.label}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Animated Segment Details Box */}
            <div className="col-span-1 md:col-span-7 flex flex-col justify-center">
              <div className={`p-6 rounded-2xl border-2 transition-all duration-300 bg-gradient-to-br bg-card shadow-sm border-border`}>
                {/* Segment Heading */}
                <div className="flex items-center gap-3 border-b border-border pb-3 mb-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-accent/10`}>
                    <activeSectionObj.icon className={`h-5 w-5 ${activeSectionObj.accent}`} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Case Dimension</span>
                    <h3 className="font-extrabold text-foreground text-lg leading-none mt-0.5">{activeSectionObj.label}</h3>
                  </div>
                </div>

                {/* Segment Details Text */}
                <div className="min-h-[110px] flex flex-col justify-center">
                  {displayValue ? (
                    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                      <RichText value={displayValue} />
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground/60 italic font-medium">No details registered for this phase yet.</p>
                      <p className="text-xs text-muted-foreground/45 mt-1">Your Master IEP Coach® will update this section as the case progresses.</p>
                    </div>
                  )}
                </div>

                {/* Sub-nav quick switcher dots */}
                <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground mr-1.5">Switch view:</span>
                  {SECTIONS.map((sec) => (
                    <button
                      key={sec.key}
                      onClick={() => setActiveSection(sec.key)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        activeSection === sec.key ? "w-6 bg-accent" : "w-2.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                      }`}
                      title={sec.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Toggle */}
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

      {/* History Panel */}
      {showHistory && (
        <div className="space-y-3 pl-2 border-l-2 border-accent/20">
          {history && history.length > 0 ? (
            history.map((entry) => (
              <Card key={entry.id} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
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
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 navy:text-blue-300 mb-1">Status</p>
                    <p className="text-sm text-foreground">{entry.currentStatus}</p>
                  </div>
                )}
                {entry.nextStep && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 navy:text-emerald-300 mb-1">Next Step</p>
                    <p className="text-sm text-foreground">{entry.nextStep}</p>
                  </div>
                )}
                {entry.whoHasBall && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 navy:text-amber-300 mb-1">Who Had the Ball</p>
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

