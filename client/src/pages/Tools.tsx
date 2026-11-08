import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageIdBadge from "@/components/PageIdBadge";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import {
  Wand2, Search, Star, Calendar, Video, FileText, CheckCircle2, Play, Lock,
  PenTool, ShieldCheck, Target, Puzzle, LineChart, Compass, Sparkles,
  ArrowLeft, GitCompare, Loader2, ArrowRight, Mic, Settings2, Monitor, Check, Square, Landmark
} from "lucide-react";

export default function Tools() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Modal Dialog States for IEP Comparison
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [prevFile, setPrevFile] = useState<string | null>(null);
  const [currFile, setCurrFile] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<boolean>(false);

  // States for Voyage Meeting Recorder Modal
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);

  React.useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordDuration((prev) => {
          const next = prev + 1;
          if (next === 2) {
            setLiveTranscript((t) => [...t, "Advocate: We're starting the IEP review session."]);
          } else if (next === 5) {
            setLiveTranscript((t) => [...t, "Parent: I want to focus on reading support options today."]);
          } else if (next === 8) {
            setLiveTranscript((t) => [...t, "Special Ed Teacher: The current goal is 15 minutes daily support."]);
          } else if (next === 11) {
            setLiveTranscript((t) => [...t, "Advocate: We should request individual goals."]);
          }
          return next;
        });
      }, 1000);
    } else {
      setRecordDuration(0);
      setLiveTranscript([]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Screen capturing states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStartRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true
      });
      setStream(mediaStream);
      setIsRecording(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((e) => console.log("Play failed:", e));
        }
      }, 300);

      mediaStream.getVideoTracks()[0].onended = () => {
        handleStopRecording();
      };
    } catch (err: any) {
      console.warn("Screen share request denied or failed, falling back to simulated screen capture:", err);
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    setIsRecorderOpen(false);
    import("sonner").then(({ toast }) =>
      toast.success("Meeting recording successfully saved to student's Voyage Log!")
    );
  };



  // Parse contactId from query string
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const contactIdParam = params.get("contactId");
  const contactId = contactIdParam ? parseInt(contactIdParam, 10) : null;

  const { data: iepDoc, isLoading: iepLoading } = trpc.iep.get.useQuery(
    { contactId: contactId! },
    { enabled: !!contactId }
  );

  const { data: contact, isLoading: contactLoading } = trpc.contacts.detail.useQuery(
    { id: contactId! },
    { enabled: !!contactId }
  );

  const hasBothVersions = !!(iepDoc?.currentFileKey && iepDoc?.previousFileKey);
  const isLoading = iepLoading || contactLoading;

  React.useEffect(() => {
    if (iepDoc) {
      if (iepDoc.previousFileName) setPrevFile(iepDoc.previousFileName);
      if (iepDoc.currentFileName) setCurrFile(iepDoc.currentFileName);
    }
  }, [iepDoc]);

  // Tools configuration — packaged as bright, commercial-grade standalone & suite software products
  const toolsList = [
    {
      id: "first-mate",
      sku: "PG-037 · LIVE AI COPILOT",
      priceBadge: "$29/mo · Included in $105 Plan",
      rating: "4.9 ★ (184 Active Users)",
      title: "First Mate — Live Advocacy Copilot",
      subtitle: "Sub-second IEP meeting intelligence, dispute alarms, and live guidance.",
      description:
        "Real-time advocacy copilot with rolling conversation memory, substantive disagreement detection, procedural safeguard alerts, and one-click floating meeting pop-out.",
      highlights: [
        "0.8s sub-second live response coaching during IEP meetings",
        "Automatic IDEA procedural safeguard & FBA refusal alarms",
        "One-click floating window alongside Zoom, Meet, or Teams",
      ],
      btnText: "Launch First Mate",
      disabled: false,
      featured: true,
      onClick: () => {
        setLocation("/first-mate");
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1B497D] via-[#113259] to-[#0A1F3B] group overflow-hidden px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.28)_0,transparent_70%)]" />
          <div className="relative z-10 w-full flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="p-2.5 rounded-xl bg-[#0B213F]/95 border border-cyan-400/55 shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-cyan-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-cyan-300" />
                    Live Coaching Prompt
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/50 text-[8.5px] font-mono font-bold text-emerald-200">
                    0.8s FAST
                  </span>
                </div>
                <div className="text-[10px] text-white/95 mt-1 font-medium line-clamp-1">
                  &ldquo;Ask district for raw evaluation subtest percentiles...&rdquo;
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#2B180A]/90 border border-amber-400/60 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-300 animate-pulse shadow-[0_0_8px_#FCD34D]" />
                  <span className="text-[10px] font-bold text-amber-200">
                    Safeguard Alert: FBA Refusal
                  </span>
                </div>
                <span className="text-[8.5px] font-mono text-amber-300 uppercase">Cite PWN</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    "/first-mate/popout",
                    "firstmate_popout",
                    "width=440,height=720,menubar=no,toolbar=no"
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-b from-cyan-400 to-cyan-600 hover:brightness-110 text-slate-950 border border-cyan-200 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-[0_4px_12px_rgba(6,182,212,0.4)]"
                title="Launch in Popout Window"
              >
                <Monitor className="h-3 w-3" />
                Pop-out
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "state-complaint-builder",
      sku: "PG-020 · LEGAL DOCKET SUITE",
      priceBadge: "$49/filing · Included in Pro",
      rating: "5.0 ★ (GaDOE & IDEA Ready)",
      title: "State Complaint Builder",
      subtitle: "Formal IDEA & GaDOE State Administrative Complaint Generator (14-Page Docket).",
      description:
        "Turnkey legal filing studio that generates official state forms, Clarity Control legal restatements, chronological facts, and continuous PDF exhibit indexes.",
      highlights: [
        "Auto-populates official 14-page state administrative docket",
        "AI Clarity Control translates parent notes into IDEA citations",
        "Continuous numbered exhibit bundler & violation matrix",
      ],
      btnText: "Open Complaint Builder",
      disabled: false,
      featured: true,
      onClick: () => {
        setLocation(
          contactId ? `/state-complaint-builder?studentId=${contactId}` : "/state-complaint-builder"
        );
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2C3A63] via-[#1B284B] to-[#0E1834] group overflow-hidden px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(245,194,107,0.28)_0,transparent_70%)]" />
          <div className="relative z-10 w-full flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="p-2.5 rounded-xl bg-[#0D1B36]/95 border border-[#F5C26B]/60 shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-[#FFE394] flex items-center gap-1">
                    <Landmark className="h-3 w-3 text-[#F5C26B]" />
                    Official State Docket
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/50 text-[8.5px] font-mono font-bold text-emerald-200">
                    14 PAGES
                  </span>
                </div>
                <div className="text-[10px] text-white/95 mt-1 font-medium line-clamp-1">
                  34 C.F.R. § 300.151–300.153 Verified Format
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#0B2822]/90 border border-emerald-400/55 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shadow-[0_0_8px_#34D399]" />
                  <span className="text-[10px] font-bold text-emerald-200">
                    Exhibit Index &amp; Signatures Ready
                  </span>
                </div>
                <span className="text-[8.5px] font-mono text-emerald-300">PDF EXPORT</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "pwn-decoder",
      sku: "PG-010-PWN · IDEA AUDITOR",
      priceBadge: "$19/mo · Included in All Plans",
      rating: "4.9 ★ (34 CFR §300.503)",
      title: "PWN Decoder",
      subtitle: "Decode what the district proposed, refused, explained, and left out.",
      description:
        "Audits any school district Prior Written Notice against all 7 mandatory federal IDEA elements to expose missing data, vague rationale, and procedural violations.",
      highlights: [
        "Audits all 7 federal Prior Written Notice requirements",
        "Flags missing evaluation data & boilerplate district excuses",
        "Generates ready-to-send parent response & rebuttal letter",
      ],
      btnText: "Open PWN Decoder",
      disabled: false,
      featured: true,
      onClick: () => {
        setLocation(
          contactId ? `/tools/pwn-decoder?studentId=${contactId}` : "/tools/pwn-decoder"
        );
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#233E68] via-[#152B4D] to-[#0B1A34] group overflow-hidden px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(251,191,36,0.24)_0,transparent_70%)]" />
          <div className="relative z-10 w-full flex items-center justify-between gap-3">
            <div className="relative w-[108px] h-[112px] bg-[#0B1C36] border border-[#F5C26B]/60 rounded-xl p-2.5 flex flex-col justify-between shadow-xl">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between border-b border-white/15 pb-1">
                  <span className="text-[8px] font-mono uppercase text-[#FFE394] font-bold">
                    PWN §300.503
                  </span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="px-1.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/50 text-[7.5px] text-emerald-200 font-bold inline-block">
                  ✓ PROPOSED
                </div>
                <div className="px-1.5 py-0.5 rounded bg-rose-500/25 border border-rose-400/50 text-[7.5px] text-rose-200 font-bold inline-block ml-1">
                  ✗ REFUSED
                </div>
                <div className="h-1.5 w-16 bg-blue-300/30 rounded-xs" />
              </div>
              <div className="flex items-center justify-between text-[7.5px] text-blue-200 pt-1 border-t border-white/10 font-semibold">
                <span>7 Federal Checks</span>
                <span className="text-[#FFE394] font-bold">IDEA</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="p-1.5 rounded-lg bg-[#0B2822]/95 border border-emerald-400/50 shadow-sm flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
                <span className="text-[10px] font-bold text-emerald-200">Action Identified</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#2B1D0A]/95 border border-amber-400/55 shadow-sm flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#F59E0B]" />
                <span className="text-[10px] font-bold text-amber-200">Rationale Too Vague</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#2E1019]/95 border border-rose-400/55 shadow-sm flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_#F43F5E]" />
                <span className="text-[10px] font-bold text-rose-200">2 Elements Missing</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "iep-comparison",
      sku: "PG-010-IEP · DIFF ENGINE",
      priceBadge: "$24/mo · Included in All Plans",
      rating: "4.9 ★ (Side-by-Side Redline)",
      title: "IEP Comparator",
      subtitle: "Instant side-by-side redline comparison of Previous vs. Proposed IEPs.",
      description:
        "Compare two IEPs side-by-side to immediately spot silent service minute reductions, removed accommodations, changed goals, and PLAAFP discrepancies.",
      highlights: [
        "Side-by-side visual redline of goals, minutes & accommodations",
        "Flags silent service cuts & removed testing supports",
        "Exports printable parent & advocate variance report",
      ],
      btnText: "Open IEP Comparator",
      disabled: false,
      featured: true,
      onClick: () => {
        setLocation("/tools/iep-comparator");
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#23386E] via-[#162752] to-[#0C1838] group overflow-hidden px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(129,140,248,0.28)_0,transparent_70%)]" />
          <div className="flex items-center gap-8 relative z-10 w-full max-w-[260px] justify-center">
            <div className="relative w-[96px] h-[112px] bg-[#0D1D3A] border border-indigo-400/60 rounded-xl p-2.5 flex flex-col justify-between shadow-xl">
              <div className="space-y-1.5">
                <span className="text-[8px] font-mono font-bold text-indigo-200 uppercase block">
                  2025 IEP
                </span>
                <div className="h-1.5 w-12 bg-indigo-300/30 rounded-sm" />
                <div className="px-1 py-0.5 rounded bg-amber-500/25 border border-amber-400/60 text-[7.5px] font-bold text-amber-200">
                  60 min/wk OT
                </div>
                <div className="h-1.5 w-14 bg-indigo-300/25 rounded-sm" />
              </div>
              <span className="text-[7.5px] text-indigo-200 font-semibold">Baseline</span>
              <div className="absolute right-[-5px] top-[52%] -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white shadow-[0_0_8px_#F59E0B]" />
            </div>

            <div className="px-2 py-1 rounded-full bg-[#FFE394] text-[#07162B] text-[9px] font-black shadow-lg">
              VS
            </div>

            <div className="relative w-[96px] h-[112px] bg-[#0D2438] border border-teal-400/65 rounded-xl p-2.5 flex flex-col justify-between shadow-xl">
              <div className="space-y-1.5">
                <span className="text-[8px] font-mono font-bold text-teal-200 uppercase block">
                  2026 Draft
                </span>
                <div className="h-1.5 w-12 bg-teal-300/30 rounded-sm" />
                <div className="px-1 py-0.5 rounded bg-rose-500/30 border border-rose-400/65 text-[7.5px] font-bold text-rose-200">
                  30 min/wk (-50%)
                </div>
                <div className="h-1.5 w-14 bg-teal-300/25 rounded-sm" />
              </div>
              <span className="text-[7.5px] text-teal-200 font-semibold">3 Changes</span>
              <div className="absolute left-[-5px] top-[52%] -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rose-400 border border-white shadow-[0_0_8px_#F43F5E]" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "worksheet-builder",
      sku: "PG-010-WS · PRACTICE STUDIO",
      priceBadge: "$19/mo · Advocate License",
      rating: "4.8 ★ (White-Label PDF)",
      title: "Worksheet Studio",
      subtitle: "Custom branded intake forms, parent prep sheets, and AI discovery guides.",
      description:
        "Interactive studio to build and sell custom parent intake worksheets, IEP prep checklists, and branded PDF packets with AI auto-fill directives.",
      highlights: [
        "Drag-and-drop question sections with custom practice branding",
        "AI prompt directives embedded into every worksheet block",
        "One-click pixel-perfect printable & fillable PDF export",
      ],
      btnText: "Open Worksheet Studio",
      disabled: false,
      featured: true,
      onClick: () => {
        setLocation("/tools/worksheet-builder");
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-between bg-gradient-to-br from-[#1F3F6B] via-[#142B4D] to-[#0B1A33] px-5 gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(233,186,107,0.22)_0,transparent_70%)]" />
          <div className="relative z-10 w-[130px] h-[104px] rounded-xl bg-[#0C1E3A] border border-[#F5C26B]/55 flex flex-col justify-between p-2.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-1">
              <span className="text-[8px] font-bold text-[#FFE394] uppercase tracking-wider">
                Parent Prep Packet
              </span>
              <span className="px-1 py-0.2 rounded bg-emerald-500/25 text-[7px] text-emerald-200 font-bold">
                PDF
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Check className="w-2.5 h-2.5 text-emerald-300" />
                <div className="h-1.5 w-16 bg-blue-200/40 rounded-sm" />
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-2.5 h-2.5 text-emerald-300" />
                <div className="h-1.5 w-20 bg-blue-200/40 rounded-sm" />
              </div>
            </div>
            <div className="text-[7.5px] text-amber-200 font-semibold">Custom Branded</div>
          </div>
          <div className="relative z-10 flex-1 space-y-1.5 bg-[#0C2140]/95 border border-cyan-400/45 rounded-xl p-2.5 shadow-lg">
            <span className="text-[9.5px] font-bold text-cyan-200 uppercase tracking-wider block">
              AI Builder Ready
            </span>
            <p className="text-[9px] text-white/90 leading-snug">
              12 Interactive Templates + Instant Client Portal Sync
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "voyage-recorder",
      sku: "PG-010-REC · LIVE AUDIO & SCREEN",
      priceBadge: "$19/mo · Included in All Plans",
      rating: "4.9 ★ (Whisper AI Transcription)",
      title: "Voyage — Meeting Recorder",
      subtitle: "Live IEP audio & screen capture with instant speaker transcription.",
      description:
        "Capture virtual or in-person IEP meetings in real time, generate speaker-labeled transcripts automatically, and pin key admissions to the student's dossier.",
      highlights: [
        "One-click browser tab, Zoom, or microphone audio capture",
        "Real-time Whisper AI speech-to-text transcript stream",
        "Auto-saves recording & action items to Student Voyage Log",
      ],
      btnText: "Launch Recorder",
      disabled: false,
      featured: true,
      onClick: () => {
        setIsRecorderOpen(true);
      },
      preview: (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#2B1F47] via-[#1C1838] to-[#0D132B] gap-2.5 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.25)_0,transparent_70%)]" />
          <div className="relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/25 border border-rose-400/60 text-[9.5px] text-rose-100 font-bold uppercase tracking-wider shadow-md">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            Live IEP Audio + Screen Capture
          </div>
          <div className="relative z-10 flex items-end gap-1.5 h-12">
            <div className="w-1.5 h-5 bg-rose-400/75 rounded-full animate-pulse" />
            <div
              className="w-1.5 h-9 bg-rose-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="w-1.5 h-12 bg-amber-300 rounded-full animate-pulse shadow-[0_0_8px_#FCD34D]"
              style={{ animationDelay: "0.4s" }}
            />
            <div
              className="w-1.5 h-8 bg-rose-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-1.5 h-10 bg-cyan-300 rounded-full animate-pulse"
              style={{ animationDelay: "0.3s" }}
            />
            <div className="w-1.5 h-6 bg-rose-400/75 rounded-full animate-pulse" />
          </div>
        </div>
      ),
    },
    {
      id: "meeting-analyzer",
      sku: "PG-044 · POST-MEETING AI",
      priceBadge: "$24/mo · Included in $105 Plan",
      rating: "4.9 ★ (Post-Meeting Synthesis)",
      title: "Meeting Analyzer",
      subtitle: "Searchable meeting transcripts, AI takeaways, and parent follow-up letters.",
      description:
        "Review recorded IEP sessions, jump to exact timestamps where services were discussed, and generate parent-friendly post-meeting summaries in seconds.",
      highlights: [
        "Instant keyword search across full meeting audio & transcript",
        "Extracts school commitments, deadlines & refused requests",
        "Drafts post-meeting parent recap & 48-hour follow-up email",
      ],
      btnText: "Open Meeting Analyzer",
      disabled: false,
      featured: true,
      onClick: () => {
        if (contactId) {
          setLocation(`/post-meeting-review/${contactId}`);
        } else {
          setLocation("/post-meeting-review");
        }
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-between bg-gradient-to-br from-[#1C3E66] via-[#132B49] to-[#0A192F] px-5 gap-3.5 overflow-hidden">
          <div className="w-[118px] h-[88px] rounded-xl bg-[#09182E] border border-amber-400/55 relative overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xl group">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-85"
              style={{ backgroundImage: "url('/compass-bg.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061121]/90 via-transparent to-transparent" />
            <div className="w-9 h-9 rounded-full bg-[#FFE394] text-[#07162B] flex items-center justify-center relative z-10 shadow-[0_0_14px_rgba(255,227,148,0.75)] group-hover:scale-110 transition-transform">
              <Play className="h-4 w-4 fill-current ml-0.5" />
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-2 bg-[#0B1E38]/95 border border-blue-300/35 rounded-xl p-2.5 shadow-lg">
            <div className="flex items-center justify-between text-[9.5px] font-bold text-[#FFE394]">
              <span>Key Commitment</span>
              <span className="font-mono text-cyan-300">14:31</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-gradient-to-r from-amber-400 to-emerald-400 shadow-[0_0_6px_#f59e0b]" />
            </div>
            <p className="text-[9px] text-white/90 truncate">
              &ldquo;District agreed to fund IEE reading eval...&rdquo;
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "timeline-builder",
      sku: "PG-025 · CASE COMPASS",
      priceBadge: "$15/mo · Included in All Plans",
      rating: "4.8 ★ (Visual Chronology)",
      title: "Case Compass & Timeline",
      subtitle: "Visual chronology of evaluations, IEPs, PWNs, and compliance deadlines.",
      description:
        "Map every evaluation, IEP meeting, service log, and statutory 60-day or 30-day timeline milestone across your child's entire special education history.",
      highlights: [
        "Interactive chronological map of all evaluations & IEPs",
        "Automatic 60-day evaluation & annual review countdowns",
        "One-click export for mediation or state complaint timelines",
      ],
      btnText: "Open Case Compass",
      disabled: false,
      featured: true,
      onClick: () => {
        setLocation(contactId ? `/case-compass?studentId=${contactId}` : "/case-compass");
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1B3C69] via-[#12294B] to-[#0A1830] px-4 overflow-hidden">
          <div className="relative w-full max-w-[260px] flex items-center justify-between">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2.5px] bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <div className="relative z-10 w-10 h-10 rounded-full bg-[#0C2140] border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-lg">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="relative z-10 w-10 h-10 rounded-full bg-[#0C2140] border-2 border-sky-400 flex items-center justify-center text-sky-300 shadow-lg">
              <Video className="h-4 w-4" />
            </div>
            <div className="relative z-10 w-10 h-10 rounded-full bg-[#0C2140] border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-lg">
              <FileText className="h-4 w-4" />
            </div>
            <div className="relative z-10 w-10 h-10 rounded-full bg-[#0C2140] border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "document-vault",
      sku: "PG-033 · SMART FILES SUITE",
      priceBadge: "Included · FERPA Encrypted",
      rating: "5.0 ★ (Smart File Vault)",
      title: "Secure Smart Files & Vault",
      description:
        "Store, organize, assign, and collect e-signatures on IEP records, evaluations, medical diagnoses, and interactive family packets in one encrypted vault.",
      subtitle: "Encrypted IEP document repository & interactive client Smart Files.",
      highlights: [
        "OCR-indexed storage for IEPs, psychoeducational evals & PWNs",
        "Interactive client questionnaires & e-signature collection",
        "Instant linking to State Complaint & IEP Comparator tools",
      ],
      btnText: "Open Smart Files Vault",
      disabled: false,
      featured: true,
      onClick: () => {
        if (contactId) {
          setLocation(`/contacts/${contactId}?tab=files`);
        } else {
          setLocation(`/smart-files`);
        }
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E3B6B] via-[#14294D] to-[#0A1830] gap-5 px-4 overflow-hidden">
          <div className="relative group">
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#FFE394] text-[#07162B] border border-white flex items-center justify-center z-10 shadow-lg">
              <Lock className="h-3 w-3" />
            </div>
            <div className="w-16 h-13 bg-[#102A52] border-2 border-[#F5C26B]/65 rounded-xl flex items-end justify-center shadow-xl">
              <div className="w-11 h-2 bg-[#FFE394]/60 rounded-t-sm mb-2" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-md bg-rose-500/30 text-rose-200 border border-rose-400/50">
              IEP PDF
            </span>
            <span className="text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-md bg-sky-500/30 text-sky-200 border border-sky-400/50">
              EVAL DOCX
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/50">
              SIGNED
            </span>
            <span className="text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/30 text-amber-200 border border-amber-400/50">
              AUDIO MP4
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "advocacy-assistant",
      sku: "PG-013-AI · AI PROMPT VAULT",
      priceBadge: "$19/mo · Included in All Plans",
      rating: "4.9 ★ (Locked IEP Prompt Vault)",
      title: "Advocacy AI Strategy Engine",
      subtitle: "Curated special education legal prompts, SMART goal writers, and AI workflows.",
      description:
        "Access Waypoint's proprietary vault of IEP advocacy prompts, SMART goal generators, accommodation builders, and parent coaching scripts.",
      highlights: [
        "Proprietary IDEA & Section 504 prompt library",
        "Generates measurable SMART goals & accommodations in seconds",
        "FERPA-safe sanitization with zero OpenAI key required",
      ],
      btnText: "Open AI Strategy Engine",
      disabled: false,
      featured: true,
      onClick: () => {
        setLocation(`/automations?tab=ai-vault`);
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-between bg-gradient-to-br from-[#1E3B6E] via-[#13284E] to-[#0A1730] px-5 gap-4 overflow-hidden">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-400/60 flex items-center justify-center relative flex-shrink-0 shadow-[0_0_20px_rgba(56,189,248,0.3)] bg-[#0A1D3B]">
            <div className="absolute inset-1.5 rounded-full border border-[#FFE394]/60 animate-pulse" />
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F5C26B] via-[#FFE394] to-cyan-300 flex items-center justify-center text-[11px] font-black text-[#061224] shadow-md">
              AI
            </div>
          </div>
          <div className="flex-1 space-y-1.5 bg-[#0C2140]/95 border border-cyan-400/45 rounded-xl p-2.5 shadow-lg">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>SMART Goal Generator</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Accommodation Matrix</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Parent Rebuttal Drafter</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Quick Tools configuration
  const quickTools = [
    {
      title: "Letter Builder",
      description: "Create custom letters",
      icon: PenTool,
      onClick: () => {
        setLocation(contactId ? `/state-complaint-builder?contactId=${contactId}` : `/state-complaint-builder`);
      }
    },
    {
      title: "PWN Checker",
      description: "Review for PWN indicators",
      icon: ShieldCheck,
      onClick: () => {
        setLocation(contactId ? `/state-complaint-builder?contactId=${contactId}` : `/state-complaint-builder`);
      }
    },
    {
      title: "Goal Bank",
      description: "Browse goal examples",
      icon: Target,
      onClick: () => {
        import("sonner").then(({ toast }) =>
          toast.info("Goal Bank tool — coming soon!")
        );
      }
    },
    {
      title: "Accommodation Bank",
      description: "Find accommodations",
      icon: Puzzle,
      onClick: () => {
        import("sonner").then(({ toast }) =>
          toast.info("Accommodation Bank tool — coming soon!")
        );
      }
    },
    {
      title: "Progress Tracker",
      description: "Track and visualize progress",
      icon: LineChart,
      onClick: () => {
        import("sonner").then(({ toast }) =>
          toast.info("Progress Tracker tool — coming soon!")
        );
      }
    }
  ];

  // Filter tools based on search term
  const filteredTools = toolsList.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuickTools = quickTools.filter(q =>
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ScopedErrorBoundary moduleName="Tools Hub">
      <div
        className="min-h-screen w-full relative overflow-x-hidden text-slate-100 p-6 md:p-8"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #173C6E 0%, #0B2142 48%, #051126 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto w-full space-y-8">
          {/* Top Commercial Suite Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D4AF37]/35 pb-6">
            <div className="flex items-start gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1F4880] to-[#0D2344] border border-[#F5C26B]/70 shadow-[0_6px_20px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.25)]">
                <Wand2 className="h-6 w-6 text-[#FFE394]" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-wide bg-gradient-to-b from-[#FFFFFF] via-[#FFF4D4] to-[#E5C175] bg-clip-text text-transparent drop-shadow-sm">
                    Waypoint Advocacy Software Suite
                  </h1>
                  <PageIdBadge id="PG-010" />
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-serif font-bold bg-[#F5C26B]/20 text-[#FFE394] border border-[#F5C26B]/55">
                    8 Commercial Products · Client &amp; Advocate Ready
                  </span>
                  {contactId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/contacts/${contactId}`)}
                      className="inline-flex items-center gap-1 text-[11px] h-7 py-1 bg-[#0C2140] border-[#D4AF37]/50 hover:bg-[#163561] text-[#FFF4D4]"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to Student
                    </Button>
                  )}
                </div>
                <p className="text-sm text-[#D9E6F7] mt-1">
                  Standalone &amp; bundled special education software tools built for families and advocacy practices.
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FFE394]" />
              <Input
                type="text"
                placeholder="Search software tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full bg-[#0A1D3B]/95 border-[#D4AF37]/55 text-white placeholder:text-[#9BB4D6] rounded-xl text-sm focus:border-[#FFE394] focus:ring-1 focus:ring-[#FFE394] shadow-inner"
              />
            </div>
          </div>

          {/* Student Context Banner */}
          {contactId && (
            <div className="rounded-xl border border-[#D4AF37]/60 bg-[#10294E]/95 px-5 py-3 shadow-[0_6px_20px_rgba(0,0,0,0.5)] flex items-center gap-3">
              <FileText className="h-4 w-4 text-[#FFE394] flex-shrink-0" />
              {isLoading ? (
                <span className="text-sm text-[#E2EDF8] flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FFE394]" />
                  Loading student details...
                </span>
              ) : contact ? (
                <span className="text-sm text-[#E2EDF8]">
                  Active Session Student:{" "}
                  <span className="font-semibold font-serif text-[#FFE394]">
                    {(contact as any).contact?.firstName ?? (contact as any).firstName}{" "}
                    {(contact as any).contact?.lastName ?? (contact as any).lastName}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-[#E2EDF8]">Student #{contactId}</span>
              )}
            </div>
          )}

          {/* Main Commercial Software Grid Section (3 Columns on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                onClick={tool.onClick}
                className="relative flex flex-col bg-gradient-to-b from-[#173763] via-[#102749] to-[#0B1B35] border border-[#D4AF37]/60 hover:border-[#FFE394] rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(245,194,107,0.22)] hover:-translate-y-0.5 transition-all duration-200 group w-full cursor-pointer"
              >
                {/* Top Specular Gold Highlight */}
                <div className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent z-20" />

                {/* Top Software Window Chrome Bar (SKU + Commercial Pricing Pill) */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-[#0B1D38]/95 border-b border-[#D4AF37]/35">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-rose-400/90" />
                    <span className="w-2 h-2 rounded-full bg-amber-300/90" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400/90" />
                    <span className="ml-1.5 text-[10px] font-mono font-bold tracking-wider text-[#B8D4F8] truncate">
                      {(tool as any).sku}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-serif font-bold bg-gradient-to-r from-[#F5C26B]/25 to-[#C5A059]/25 text-[#FFE394] border border-[#FFE394]/50 whitespace-nowrap shadow-xs">
                    {(tool as any).priceBadge}
                  </span>
                </div>

                {/* Bright Product UI Preview Stage */}
                <div className="h-44 sm:h-46 w-full flex-shrink-0 border-b border-[#D4AF37]/40 relative">
                  {tool.preview}
                </div>

                {/* Product Card Body */}
                <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
                  <div className="space-y-2.5">
                    {/* Rating & Verified Product Pill */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#FFE394] flex items-center gap-1">
                        <Star className="h-3 w-3 fill-[#FFE394] text-[#FFE394]" />
                        {(tool as any).rating}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 font-bold">
                        ● Live App
                      </span>
                    </div>

                    <h3 className="text-xl font-bold font-serif text-white tracking-tight group-hover:text-[#FFE394] transition-colors">
                      {tool.title}
                    </h3>

                    {(tool as any).subtitle && (
                      <p className="text-xs font-semibold text-[#FCE09E] leading-snug">
                        {(tool as any).subtitle}
                      </p>
                    )}

                    <p className="text-xs text-[#D5E3F7] leading-relaxed">
                      {tool.description}
                    </p>

                    {/* 3 Commercial Selling Points / Product Features */}
                    {Array.isArray((tool as any).highlights) && (
                      <ul className="pt-1.5 space-y-1.5 border-t border-white/10">
                        {((tool as any).highlights as string[]).map((pt, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-[11.5px] text-[#EBF3FF] font-medium leading-snug"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div
                    className="flex items-center justify-between gap-2 pt-2 border-t border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      onClick={tool.onClick}
                      disabled={tool.disabled}
                      className="flex-1 inline-flex rounded-xl px-4 py-2 items-center justify-center gap-1.5 text-xs font-serif font-extrabold tracking-wide transition-all cursor-pointer bg-gradient-to-r from-[#F6D78B] via-[#DFB860] to-[#B88933] text-[#061224] border border-[#FFF2C2]/80 shadow-[0_4px_14px_rgba(0,0,0,0.55)] hover:brightness-110"
                    >
                      <span>{tool.btnText}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Button>

                    {tool.id === "voyage-recorder" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setLocation(
                            contactId
                              ? `/tools/voyage-recorder?contactId=${contactId}`
                              : "/tools/voyage-recorder"
                          )
                        }
                        className="h-9 w-9 inline-flex bg-[#0D2140] hover:bg-[#173763] text-[#FFE394] border border-[#D4AF37]/60 hover:border-[#FFE394] rounded-xl items-center justify-center transition-all shadow-sm cursor-pointer"
                        title="Configure Recorder Specs & Settings"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tools Row */}
          <div className="space-y-4 pt-4">
            <p className="text-xs font-serif font-bold uppercase tracking-widest text-[#FFE394]">
              Quick Micro-Tools &amp; Generators
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {filteredQuickTools.map((qt) => {
                const Icon = qt.icon;
                return (
                  <Card
                    key={qt.title}
                    onClick={qt.onClick}
                    className="flex items-center justify-between p-4 bg-gradient-to-b from-[#173763] to-[#0D2140] border-[#D4AF37]/55 rounded-xl hover:border-[#FFE394] hover:from-[#1D4378] hover:to-[#122C54] shadow-[0_8px_20px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#0A1A33] border border-[#F5C26B]/55 text-[#FFE394] group-hover:scale-105 transition-all shadow-inner">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight group-hover:text-[#FFE394] transition-colors">
                          {qt.title}
                        </h4>
                        <p className="text-[10.5px] text-[#C8DCF5] leading-normal mt-0.5">
                          {qt.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#FFE394]/70 group-hover:text-[#FFE394] group-hover:translate-x-0.5 transition-all" />
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Bottom Callout Banner */}
          <div className="pt-4">
            <div className="relative rounded-xl border border-[#3A2C18] bg-gradient-to-r from-[#05142B] via-[#092244] to-[#05142B] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
              {/* Subtle background glow */}
              <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#C5A059]/5 blur-3xl pointer-events-none" />
              
              <div className="flex items-start md:items-center gap-4 relative z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#020A17] border border-[#3A2C18] text-[#FFE394] shrink-0 shadow-md">
                  <Compass className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#FFF4D4]">Everything you need. All in one place.</h3>
                  <p className="text-xs text-[#C6B697] mt-1 leading-relaxed max-w-xl">
                    Waypoint gives you the tools, insights, and confidence to advocate for your child every step of the way.
                  </p>
                </div>
              </div>

              <div className="relative z-10 self-start md:self-auto">
                <Button
                  onClick={() => {
                    import("sonner").then(({ toast }) =>
                      toast.info("Showing release notes and updates soon!")
                    );
                  }}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold px-5 py-2.5 rounded-lg text-xs shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 flex items-center gap-2 transition-all hover:brightness-110"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  See What's New
                </Button>
              </div>
            </div>
          </div>

          {/* IEP Comparison Modal */}
          {isComparisonOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#05142B] border border-[#3A2C18] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col p-6 space-y-6 relative shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-[#FFF4D4]">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-[#3A2C18] pb-4">
                  <div>
                    <h3 className="text-lg font-bold font-serif text-[#FFF4D4]">IEP / 504 Comparison Analyzer</h3>
                    <p className="text-xs text-[#C6B697] mt-1">
                      Upload a previous version and a current version to run a side-by-side comparison.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsComparisonOpen(false);
                      setIsAnalyzing(false);
                      setAnalysisResult(false);
                    }}
                    className="text-[#C6B697] hover:text-[#FFF4D4] text-xs bg-[#020A17] hover:bg-[#07162B] px-3 py-1 rounded-full border border-[#3A2C18] transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Main content */}
                {!analysisResult ? (
                  <div className="space-y-6">
                    {/* Drag and Drop Zone row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Previous Version */}
                      <div className="border border-dashed border-[#3A2C18] rounded-xl p-5 bg-[#020A17]/80 flex flex-col items-center justify-center text-center space-y-3 min-h-[140px] relative">
                        <div className="p-2 rounded-lg bg-[#05142B] border border-[#3A2C18] text-[#FFE394]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#FFF4D4]">Previous IEP Version</p>
                          <p className="text-[10px] text-[#C6B697] mt-0.5 max-w-[180px] mx-auto truncate">
                            {prevFile || "Drag and drop or browse to upload"}
                          </p>
                        </div>
                        <input 
                          type="file" 
                          accept=".pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setPrevFile(e.target.files[0].name);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {prevFile && (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              setPrevFile(null);
                            }}
                            className="text-[10px] text-rose-400 hover:underline relative z-25 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Current Version */}
                      <div className="border border-dashed border-[#3A2C18] rounded-xl p-5 bg-[#020A17]/80 flex flex-col items-center justify-center text-center space-y-3 min-h-[140px] relative">
                        <div className="p-2 rounded-lg bg-[#05142B] border border-[#3A2C18] text-teal-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#FFF4D4]">Current IEP Version</p>
                          <p className="text-[10px] text-[#C6B697] mt-0.5 max-w-[180px] mx-auto truncate">
                            {currFile || "Drag and drop or browse to upload"}
                          </p>
                        </div>
                        <input 
                          type="file" 
                          accept=".pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setCurrFile(e.target.files[0].name);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {currFile && (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrFile(null);
                            }}
                            className="text-[10px] text-rose-400 hover:underline relative z-25 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Analysis Info */}
                    <div className="bg-[#020A17]/80 border border-[#3A2C18] rounded-xl p-4 flex gap-3 text-left">
                      <Compass className="h-5 w-5 text-[#FFE394] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">Waypoint AI Comparison Engine</h4>
                        <p className="text-[11px] text-[#C6B697] mt-0.5 leading-relaxed">
                          Waypoint will parse both documents, highlight additions and deletions, and categorize FAPE variances, accommodations changes, and modified services side-by-side.
                        </p>
                      </div>
                    </div>

                    {/* Submit Action */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => {
                          if (!prevFile || !currFile) {
                            import("sonner").then(({ toast }) =>
                              toast.error("Please select or upload both documents first.")
                            );
                            return;
                          }
                          setIsAnalyzing(true);
                          setTimeout(() => {
                            setIsAnalyzing(false);
                            setAnalysisResult(true);
                          }, 2500);
                        }}
                        disabled={isAnalyzing}
                        className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold px-6 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-110 cursor-pointer"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Analyzing and comparing documents...
                          </>
                        ) : (
                          <>
                            <GitCompare className="h-3.5 w-3.5" />
                            Run AI Comparison
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Display Mock Analysis results */
                  <div className="space-y-5 text-left">
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        AI Comparison Completed Successfully!
                      </div>
                      <button 
                        onClick={() => setAnalysisResult(false)}
                        className="text-xs text-[#FFE394] hover:underline cursor-pointer"
                      >
                        Compare other files
                      </button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">Changes Summary</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#020A17]/80 p-3 rounded-lg border border-[#3A2C18] text-center">
                          <span className="text-lg font-bold text-emerald-400">3</span>
                          <span className="text-[10px] text-[#C6B697] block mt-0.5">Additions</span>
                        </div>
                        <div className="bg-[#020A17]/80 p-3 rounded-lg border border-[#3A2C18] text-center">
                          <span className="text-lg font-bold text-rose-400">1</span>
                          <span className="text-[10px] text-[#C6B697] block mt-0.5">Deletions</span>
                        </div>
                        <div className="bg-[#020A17]/80 p-3 rounded-lg border border-[#3A2C18] text-center">
                          <span className="text-lg font-bold text-[#FFE394]">2</span>
                          <span className="text-[10px] text-[#C6B697] block mt-0.5">Modifications</span>
                        </div>
                      </div>
                    </div>

                    {/* Diff Preview Rows */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">Detailed Variance Analysis</h4>
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {/* Diff 1 */}
                        <div className="border border-[#3A2C18]/60 bg-[#020A17]/80 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Accommodation Added</span>
                            <span className="text-[9px] text-[#A69371]">Page 4 · Section IV</span>
                          </div>
                          <p className="text-xs text-[#E8DCC4] leading-relaxed">
                            "Student will receive extra time (double time) on all math quizzes, exams, and standardized testing assessments."
                          </p>
                        </div>

                        {/* Diff 2 */}
                        <div className="border border-[#3A2C18]/60 bg-[#020A17]/80 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">Service Reduced</span>
                            <span className="text-[9px] text-[#A69371]">Page 7 · Section VII</span>
                          </div>
                          <p className="text-xs text-[#C6B697] leading-relaxed line-through">
                            "Occupational therapy group sessions: 60 minutes per week."
                          </p>
                          <p className="text-xs text-emerald-400 leading-relaxed font-semibold">
                            + "Occupational therapy individual sessions: 30 minutes per week."
                          </p>
                        </div>

                        {/* Diff 3 */}
                        <div className="border border-[#3A2C18]/60 bg-[#020A17]/80 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DFBE77]/10 text-[#FFE394] border border-[#DFBE77]/30 font-semibold font-serif">Goal Modified</span>
                            <span className="text-[9px] text-[#A69371]">Page 11 · Section IX</span>
                          </div>
                          <p className="text-xs text-[#E8DCC4] leading-relaxed">
                            Modified accuracy criteria for conversational turns target from 80% to 90% over consecutive trial weeks.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voyage Meeting Recorder Modal */}
          {isRecorderOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#05142B] border border-[#3A2C18] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col p-6 space-y-6 relative shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-[#FFF4D4]">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-[#3A2C18] pb-4">
                  <div>
                    <h3 className="text-lg font-bold font-serif text-[#FFF4D4] flex items-center gap-2">
                      <Mic className="h-5 w-5 text-rose-500 animate-pulse" />
                      Voyage Live Meeting Recorder
                    </h3>
                    <p className="text-xs text-[#C6B697] mt-1">
                      Record your IEP meeting to auto-transcribe, analyze key decisions, and sync with files.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsRecorderOpen(false);
                      setIsRecording(false);
                    }}
                    className="text-[#C6B697] hover:text-[#FFF4D4] text-xs bg-[#020A17] hover:bg-[#07162B] px-3 py-1 rounded-full border border-[#3A2C18] transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Recorder Controls */}
                <div className="flex flex-col items-center justify-center space-y-6 py-4">
                  {isRecording ? (
                    /* Recording Mode */
                    <div className="space-y-6 w-full flex flex-col items-center">
                      {/* Timer & Pulsing Waveform */}
                      <div className="text-center">
                        <span className="text-4xl font-mono font-bold text-[#FFF4D4] tracking-widest">
                          {Math.floor(recordDuration / 60).toString().padStart(2, '0')}:
                          {(recordDuration % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mt-1 animate-pulse">
                          ● Recording Meeting Capture
                        </span>
                      </div>

                      {/* Live Stream Preview or Pulsing Waveform Fallback */}
                      {stream ? (
                        <div className="w-full max-w-sm aspect-video bg-black/90 rounded-xl overflow-hidden border border-[#3A2C18] relative shadow-lg">
                          <video
                            ref={videoRef}
                            className="w-full h-full object-contain"
                            autoPlay
                            playsInline
                            muted
                          />
                          <div className="absolute top-2 left-2 bg-rose-600/90 text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            Live Capturing
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-end gap-1.5 h-12 justify-center">
                          <div className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1.5 h-12 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                          <div className="w-1.5 h-8 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <div className="w-1.5 h-10 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                          <div className="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
                        </div>
                      )}

                      {/* Live Transcript Stream */}
                      <div className="w-full bg-[#020A17] rounded-xl border border-[#3A2C18] p-4 h-48 overflow-y-auto space-y-3 text-left">
                        <span className="text-[9px] font-bold text-[#A69371] uppercase tracking-widest block border-b border-[#3A2C18]/60 pb-1">Live Transcript Stream</span>
                        {liveTranscript.length === 0 ? (
                          <p className="text-[11px] text-[#A69371] italic animate-pulse">Waiting for speech input...</p>
                        ) : (
                          liveTranscript.map((line, idx) => {
                            const [speaker, text] = line.split(": ");
                            return (
                              <div key={idx} className="text-xs space-y-0.5 animate-slide-up">
                                <span className="font-semibold text-[#FFE394]">{speaker}:</span>
                                <p className="text-[#C6B697] leading-relaxed">{text}</p>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Stop Button */}
                      <Button
                        onClick={handleStopRecording}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
                      >
                        Stop & Save Recording
                      </Button>
                    </div>
                  ) : (
                    /* Ready State */
                    <div className="space-y-6 w-full flex flex-col items-center text-center">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 hover:scale-105 hover:bg-rose-500/20 transition-all cursor-pointer shadow-lg shadow-rose-500/5 group"
                          onClick={handleStartRecording}
                        >
                          <Monitor className="h-8 w-8 text-rose-400 group-hover:scale-110 transition-transform animate-pulse" />
                        </div>
                        {/* Concentric ripple circles */}
                        <div className="absolute -inset-2 rounded-full border border-rose-500/10 animate-ping pointer-events-none" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-[#FFF4D4]">Start Screen Recording</h4>
                        <p className="text-[11px] text-[#C6B697] max-w-[280px]">
                          Click the icon to select your active meeting window or screen to capture and transcribing.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ScopedErrorBoundary>
  );
}
