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
                <strong key={pi} className="font-semibold text-amber-200 dark:text-amber-200">{part.slice(2, -2)}</strong>
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
  const cx = 200;
  const cy = 200;
  const rInner = 40;
  const rOuter = 110;
  const rMid = 148;

  return (
    <div className="space-y-3">
      <Card 
        className="relative rounded-xl border border-white/10 shadow-xl overflow-hidden bg-cover bg-center text-slate-100"
        style={{ backgroundImage: "linear-gradient(rgba(10, 16, 26, 0.84), rgba(10, 16, 26, 0.88)), url('/compass-bg.jpg')" }}
      >
        {/* Card Header */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm">
          <div className={`flex-shrink-0 ${isRecentlyUpdated ? "animate-[spin_8s_linear_infinite]" : ""}`}>
            <CompassIcon className="h-9 w-9 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-base tracking-tight">
              Waypoint Case Compass™
            </h2>
            <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 flex-shrink-0 text-slate-400" />
              Updated {new Date(compass.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {isRecentlyUpdated && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                  New update
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Interactive Interactive Layout */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Side: SVG Compass Rose */}
            <div className="col-span-1 lg:col-span-6 flex justify-center w-full">
              <div className="relative w-full max-w-[420px] aspect-square select-none">
                <svg viewBox="0 0 400 400" className="w-full h-full text-muted-foreground/30">
                  <defs>
                    {/* Metallic Gold Gradient for realistic metal reflection */}
                    <linearGradient id="gold-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#CF9F3D" />
                      <stop offset="20%" stopColor="#FFF2B2" />
                      <stop offset="40%" stopColor="#AF8326" />
                      <stop offset="60%" stopColor="#FFF2B2" />
                      <stop offset="85%" stopColor="#AA7C11" />
                      <stop offset="100%" stopColor="#F7DF97" />
                    </linearGradient>
                    {/* Glossy shine overlay gradient */}
                    <linearGradient id="gold-shine" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
                      <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0" />
                      <stop offset="65%" stopColor="#000000" stopOpacity="0" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
                    </linearGradient>
                    {/* Radial brushed gold gradient for the background dial face */}
                    <radialGradient id="gold-brushed" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                      <stop offset="0%" stopColor="#FFFDF7" />
                      <stop offset="30%" stopColor="#F9ECA7" />
                      <stop offset="65%" stopColor="#D4AF37" />
                      <stop offset="85%" stopColor="#AA7C11" />
                      <stop offset="100%" stopColor="#4A3403" />
                    </radialGradient>
                    {/* Dark textured metal gradient for watch ring band */}
                    <linearGradient id="dark-metal" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#101419" />
                      <stop offset="50%" stopColor="#222831" />
                      <stop offset="100%" stopColor="#0B0E11" />
                    </linearGradient>
                    {/* Drop shadow for 3D depth */}
                    <filter id="ring-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000000" floodOpacity="0.4" />
                    </filter>
                  </defs>

                  {/* Brushed Gold Dial Face Background (under sectors) */}
                  <circle cx={cx} cy={cy} r="110" fill="url(#gold-brushed)" className="opacity-[0.22]" />

                  {/* Dark metal track band for dial degree markings and N/E/S/W */}
                  <circle cx={cx} cy={cy} r="126.5" stroke="url(#dark-metal)" strokeWidth="33" fill="none" />

                  {/* Concentric gold boundaries (inside and outside of the dark band) */}
                  <circle cx={cx} cy={cy} r="110" stroke="url(#gold-metallic)" strokeWidth="1.5" fill="none" />
                  <circle cx={cx} cy={cy} r="143" stroke="url(#gold-metallic)" strokeWidth="1.5" fill="none" />

                  {/* Dashed outer guideline inside dark band */}
                  <circle cx={cx} cy={cy} r="135" stroke="url(#gold-metallic)" strokeWidth="0.75" strokeDasharray="3 4" fill="none" className="opacity-45" />

                  {/* Radial Tick Lines inside dark band */}
                  {Array.from({ length: 24 }).map((_, i) => {
                    const angle = i * 15;
                    if (angle % 90 === 0) return null; // skip cardinal positions
                    const rad = (angle * Math.PI) / 180;
                    const x1 = cx + 131 * Math.cos(rad);
                    const y1 = cy + 131 * Math.sin(rad);
                    const x2 = cx + 137 * Math.cos(rad);
                    const y2 = cy + 137 * Math.sin(rad);
                    return (
                      <line 
                        key={i} 
                        x1={x1} 
                        y1={y1} 
                        x2={x2} 
                        y2={y2} 
                        stroke="url(#gold-metallic)" 
                        strokeWidth="1" 
                        className="opacity-60" 
                      />
                    );
                  })}
                  
                  {/* Heavy Beveled Metallic Gold Outer Ring */}
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r="149" 
                    stroke="url(#gold-metallic)" 
                    strokeWidth="12" 
                    fill="none" 
                    filter="url(#ring-shadow)"
                  />
                  {/* Bezel glossy shine overlay */}
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r="149" 
                    stroke="url(#gold-shine)" 
                    strokeWidth="12" 
                    fill="none" 
                  />
                  {/* High contrast bevel highlights */}
                  <circle cx={cx} cy={cy} r="155" stroke="#FFF2B2" strokeWidth="0.75" fill="none" className="opacity-80" />
                  <circle cx={cx} cy={cy} r="143" stroke="#AA7C11" strokeWidth="0.75" fill="none" className="opacity-80" />

                  {/* Cardinal direction markers - stylized serif text centered in the dark track */}
                  <text x={cx} y="81.5" textAnchor="middle" className="text-[15px] font-bold select-none fill-[#FFF2B2] opacity-95 tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>N</text>
                  <text x="326.5" y="204.5" textAnchor="middle" className="text-[15px] font-bold select-none fill-[#FFF2B2] opacity-80 tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>E</text>
                  <text x={cx} y="327.5" textAnchor="middle" className="text-[15px] font-bold select-none fill-[#FFF2B2] opacity-80 tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>S</text>
                  <text x="73.5" y="204.5" textAnchor="middle" className="text-[15px] font-bold select-none fill-[#FFF2B2] opacity-80 tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>W</text>

                  {/* Wedge/Sector group */}
                  <g className="cursor-pointer">
                    {SECTIONS.map((sec, idx) => {
                      const isActive = activeSection === sec.key;
                      const isHovered = hoveredSection === sec.key;
                      // 72 degrees per wedge. Gap of 0 degrees -> wedge span of 72 degrees
                      const startAngle = sec.angle - 36;
                      const endAngle = sec.angle + 36;
                      const pathStr = getSectorPath(cx, cy, rInner, rOuter, startAngle, endAngle);

                      return (
                        <path
                          key={sec.key}
                          d={pathStr}
                          fill={isActive ? sec.fill : isHovered ? sec.hoverFill : "rgba(212, 175, 55, 0.03)"}
                          stroke={isActive ? sec.activeStroke : isHovered ? sec.stroke : "url(#gold-metallic)"}
                          strokeWidth={isActive ? "2.5" : "1.25"}
                          className={`transition-all duration-200 ease-out ${isActive ? "opacity-100" : isHovered ? "opacity-85" : "opacity-35"}`}
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
                    {/* Top needle tip - 3D faceted gold shading */}
                    {/* Left half (Light Highlight) */}
                    <polygon points={`${cx},${cy} ${cx - 7},${cy} ${cx},95`} fill="#FFF8D2" filter="url(#ring-shadow)" />
                    {/* Right half (Shadow) */}
                    <polygon points={`${cx},${cy} ${cx + 7},${cy} ${cx},95`} fill="#C59632" filter="url(#ring-shadow)" />

                    {/* Bottom needle tip - 3D faceted brass shading */}
                    {/* Left half (Light Highlight) */}
                    <polygon points={`${cx},${cy} ${cx - 7},${cy} ${cx},305`} fill="#A4802F" />
                    {/* Right half (Shadow) */}
                    <polygon points={`${cx},${cy} ${cx + 7},${cy} ${cx},305`} fill="#6B5115" />
                    
                    {/* Needle pivot cap with brass/gold styling */}
                    <circle cx={cx} cy={cy} r="12" fill="url(#gold-metallic)" filter="url(#ring-shadow)" />
                    <circle cx={cx} cy={cy} r="12" fill="url(#gold-shine)" />
                    <circle cx={cx} cy={cy} r="6" fill="#4A3B18" className="opacity-40" />
                    <circle cx={cx} cy={cy} r="3.5" fill="#FFF2B2" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Right Side: Animated Segment Details Box */}
            <div className="col-span-1 lg:col-span-6 flex flex-col justify-center">
              <div className="p-6 rounded-2xl border border-white/10 transition-all duration-300 bg-slate-950/45 backdrop-blur-md shadow-lg">
                {/* Segment Heading */}
                <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                    <activeSectionObj.icon className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Case Dimension</span>
                    <h3 className="font-extrabold text-white text-lg leading-none mt-0.5">{activeSectionObj.label}</h3>
                  </div>
                </div>

                {/* Segment Details Text */}
                <div className="min-h-[110px] flex flex-col justify-center">
                  {displayValue ? (
                    <div className="text-sm text-slate-100 leading-relaxed whitespace-pre-line">
                      <RichText value={displayValue} />
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-300 italic font-medium">No details registered for this phase yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Your Master IEP Coach® will update this section as the case progresses.</p>
                    </div>
                  )}
                </div>

                {/* Sub-nav quick switcher dots */}
                <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-white/10">
                  <span className="text-xs font-semibold text-slate-400 mr-1.5">Switch view:</span>
                  {SECTIONS.map((sec) => (
                    <button
                      key={sec.key}
                      onClick={() => setActiveSection(sec.key)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        activeSection === sec.key ? "w-6 bg-amber-400" : "w-2.5 bg-white/20 hover:bg-white/40"
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
        <div className="border-t border-white/10 px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5"
          >
            <Clock className="h-3.5 w-3.5 text-slate-450 text-slate-450" />
            {showHistory ? "Hide" : "View"} Case History
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </Card>

      {/* History Panel */}
      {showHistory && (
        <div className="space-y-3 pl-2 border-l-2 border-amber-500/30">
          {history && history.length > 0 ? (
            history.map((entry) => (
              <Card key={entry.id} className="rounded-lg border border-white/10 bg-slate-950/30 p-4 space-y-3 text-slate-200">
                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(entry.savedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                {entry.currentStatus && (
                  <div>
                     <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">Status</p>
                     <p className="text-sm text-slate-100">{entry.currentStatus}</p>
                  </div>
                )}
                {entry.nextStep && (
                  <div>
                     <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Next Step</p>
                     <p className="text-sm text-slate-100">{entry.nextStep}</p>
                  </div>
                )}
                {entry.whoHasBall && (
                  <div>
                     <p className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-1">Who Had the Ball</p>
                     <p className="text-sm text-slate-100">{entry.whoHasBall}</p>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <p className="text-sm text-slate-400 py-2">
              No history yet — your advocate's updates will appear here over time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

