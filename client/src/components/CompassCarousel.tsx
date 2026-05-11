import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Activity, BookOpen, ArrowRightCircle, Zap, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Section config (mirrors ContactDetail + CaseCompassCard) ───────────────
const SECTIONS = [
  {
    key: "currentStatus",
    icon: Activity,
    label: "Current Status",
    accent: "text-blue-600 dark:text-blue-400 navy:text-blue-300",
    bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/60 dark:to-blue-900/40 navy:from-blue-900/40 navy:to-blue-800/30",
    border: "border-blue-200 dark:border-blue-700 navy:border-blue-500/40",
    dot: "bg-blue-500",
    activeDot: "bg-blue-500",
  },
  {
    key: "lastMeetingSummary",
    icon: BookOpen,
    label: "Last Meeting",
    accent: "text-violet-600 dark:text-violet-400 navy:text-violet-300",
    bg: "bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/60 dark:to-violet-900/40 navy:from-violet-900/40 navy:to-violet-800/30",
    border: "border-violet-200 dark:border-violet-700 navy:border-violet-500/40",
    dot: "bg-violet-500",
    activeDot: "bg-violet-500",
  },
  {
    key: "nextStep",
    icon: ArrowRightCircle,
    label: "Next Step",
    accent: "text-emerald-600 dark:text-emerald-400 navy:text-emerald-300",
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/60 dark:to-emerald-900/40 navy:from-emerald-900/40 navy:to-emerald-800/30",
    border: "border-emerald-200 dark:border-emerald-700 navy:border-emerald-500/40",
    dot: "bg-emerald-500",
    activeDot: "bg-emerald-500",
  },
  {
    key: "whoHasBall",
    icon: Zap,
    label: "Who Has the Ball",
    accent: "text-amber-600 dark:text-amber-400 navy:text-amber-300",
    bg: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/60 dark:to-amber-900/40 navy:from-amber-900/40 navy:to-amber-800/30",
    border: "border-amber-200 dark:border-amber-700 navy:border-amber-500/40",
    dot: "bg-amber-500",
    activeDot: "bg-amber-500",
  },
  {
    key: "nextMeetingDate",
    icon: CalendarCheck,
    label: "Next Meeting",
    accent: "text-rose-600 dark:text-rose-400 navy:text-rose-300",
    bg: "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/60 dark:to-rose-900/40 navy:from-rose-900/40 navy:to-rose-800/30",
    border: "border-rose-200 dark:border-rose-700 navy:border-rose-500/40",
    dot: "bg-rose-500",
    activeDot: "bg-rose-500",
  },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

interface CompassData {
  currentStatus?: string | null;
  lastMeetingSummary?: string | null;
  nextStep?: string | null;
  whoHasBall?: string | null;
  nextMeetingDate?: Date | string | null;
}

function RichText({ value }: { value: string }) {
  const lines = value.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        if (line.trim() === "---") return <hr key={li} className="my-2 border-current opacity-20" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={li}>
            {parts.map((part, pi) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={pi}>{part.slice(2, -2)}</strong>
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

interface CompassCarouselProps {
  compass: CompassData;
}

export default function CompassCarousel({ compass }: CompassCarouselProps) {
  // Build only the slides that have content
  const slides = SECTIONS.filter((s) => {
    const val = compass[s.key as SectionKey];
    return val !== null && val !== undefined && String(val).trim() !== "";
  });

  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goTo = useCallback(
    (index: number, dir: "left" | "right") => {
      if (isAnimating || index === current) return;
      setAnimDir(dir);
      setIsAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimDir(null);
        setIsAnimating(false);
      }, 260);
    },
    [isAnimating, current]
  );

  const prev = () => {
    if (current > 0) goTo(current - 1, "right");
  };

  const next = () => {
    if (current < slides.length - 1) goTo(current + 1, "left");
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (slides.length === 0) return null;

  const slide = slides[current];
  const Icon = slide.icon;
  const rawValue = compass[slide.key as SectionKey];
  const displayValue =
    slide.key === "nextMeetingDate" && rawValue
      ? new Date(rawValue as string).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : String(rawValue ?? "");

  // Animation classes
  const slideClass = isAnimating
    ? animDir === "left"
      ? "translate-x-[-6%] opacity-0"
      : "translate-x-[6%] opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className="select-none">
      {/* Carousel card */}
      <div
        className={`relative rounded-2xl border-2 ${slide.border} ${slide.bg} overflow-hidden shadow-sm`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Section header */}
        <div className={`flex items-center gap-2.5 px-5 pt-5 pb-3`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/60 dark:bg-black/20 navy:bg-white/10 shadow-sm`}>
            <Icon className={`h-4 w-4 ${slide.accent}`} />
          </div>
          <span className={`text-sm font-bold uppercase tracking-widest ${slide.accent}`}>
            {slide.label}
          </span>
          <span className="ml-auto text-xs text-muted-foreground font-medium tabular-nums">
            {current + 1} / {slides.length}
          </span>
        </div>

        {/* Content */}
        <div
          className={`px-5 pb-5 min-h-[120px] transition-all duration-[260ms] ease-in-out ${slideClass}`}
        >
          {slide.key === "nextMeetingDate" ? (
            <p className={`text-xl font-bold ${slide.accent} leading-snug`}>{displayValue}</p>
          ) : (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              <RichText value={displayValue} />
            </p>
          )}
        </div>

        {/* Prev / Next arrow buttons — shown on non-touch (hover visible) */}
        {current > 0 && (
          <button
            onClick={prev}
            aria-label="Previous"
            className={`absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-black/40 navy:bg-white/10 shadow-md border border-border/40 text-foreground hover:bg-white dark:hover:bg-black/60 navy:hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-70 sm:hover:opacity-100`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {current < slides.length - 1 && (
          <button
            onClick={next}
            aria-label="Next"
            className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-black/40 navy:bg-white/10 shadow-md border border-border/40 text-foreground hover:bg-white dark:hover:bg-black/60 navy:hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-70 sm:hover:opacity-100`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation row: prev arrow · dots · next arrow */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={prev}
          disabled={current === 0}
          className="h-8 w-8 rounded-full disabled:opacity-20"
          aria-label="Previous section"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              onClick={() => goTo(i, i > current ? "left" : "right")}
              aria-label={`Go to ${s.label}`}
              className={`rounded-full transition-all duration-200 ${
                i === current
                  ? `${s.dot} w-5 h-2.5`
                  : "bg-muted-foreground/25 hover:bg-muted-foreground/50 w-2.5 h-2.5"
              }`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          disabled={current === slides.length - 1}
          className="h-8 w-8 rounded-full disabled:opacity-20"
          aria-label="Next section"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
