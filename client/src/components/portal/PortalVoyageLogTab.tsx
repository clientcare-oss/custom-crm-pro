import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Video, Play, Volume2, Maximize, Search, MoreVertical, Download, Sparkles,
  Clapperboard, Clock, Shield, FileText, CheckCircle2, AlertCircle, Pause,
  ClipboardList, UserCheck, Star, Loader2, Check, RotateCcw, RotateCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import PageIdBadge from "@/components/PageIdBadge";
import { cn } from "@/lib/utils";

interface Recording {
  id: string;
  title: string;
  date: string;
  duration: string;
  secondsLimit: number;
  starred?: boolean;
  highlights: string[];
  actionItems: string[];
  notes: string;
  transcript: { time: string; seconds: number; text: string }[];
  status?: string;
}

const RECORDINGS_DATA: Recording[] = [
  {
    id: "rec_1",
    title: "Annual IEP Meeting",
    date: "May 14, 2026",
    duration: "1:42:18",
    secondsLimit: 6138,
    starred: true,
    highlights: [
      "Reading minutes increased by 15 mins/week",
      "OT request denied due to lack of school assessment",
      "New accommodation added for sensory breaks",
      "Follow-up transition meeting scheduled for June"
    ],
    actionItems: [
      "Send private OT evaluation to district team",
      "Review draft IEP goals with school counselor",
      "Sign parent consent form for additional speech testing"
    ],
    notes: "Advocate noted that the IEP team agreed to our request to increase direct reading instruction. However, the occupational therapy request was deferred pending a new school-based sensory assessment. We plan to submit Jane's private clinical report next week to speed up the process.",
    transcript: [
      { time: "14:31", seconds: 871, text: "We've seen some improvement with reading fluency over the past semester, but the student requires extra assistance." },
      { time: "27:55", seconds: 1675, text: "The district is unable to approve the request for occupational therapy at this time without a fresh school assessment." },
      { time: "48:12", seconds: 2892, text: "We can consider compensatory OT to address the missed services from last semester if we confirm the eligibility." },
      { time: "1:12:20", seconds: 4340, text: "Is there anything else you'd like to add or any questions you have regarding this plan?" }
    ]
  },
  {
    id: "rec_2",
    title: "Eligibility Meeting",
    date: "March 3, 2026",
    duration: "1:15:42",
    secondsLimit: 4542,
    highlights: [
      "Eligibility confirmed under OHI (ADHD)",
      "Initial educational evaluation accepted",
      "Draft IEP meeting scheduled"
    ],
    actionItems: [
      "Sign special education services consent form",
      "Provide copies of child's physical records"
    ],
    notes: "The Waypoint advocate led the presentation of clinical diagnosis notes. The district psychologist accepted our clinical documentation and agreed that OHI eligibility is appropriate. Staff will draft the official goals.",
    transcript: [
      { time: "05:10", seconds: 310, text: "The school psychologist presents the psychological evaluation results to the committee." },
      { time: "22:45", seconds: 1365, text: "Based on the educational testing, the student meets eligibility criteria for OHI." },
      { time: "55:12", seconds: 3312, text: "We will begin drafting the IEP goals and transition accommodations next week." }
    ]
  },
  {
    id: "rec_3",
    title: "OT Evaluation Review",
    date: "Feb 10, 2026",
    duration: "0:58:33",
    secondsLimit: 3513,
    highlights: [
      "Fine motor deficits documented in writing speed",
      "Twice-weekly OT recommended by clinician",
      "Specialized writing aids approved"
    ],
    actionItems: [
      "Confirm scheduling slots with school therapist",
      "Upload therapist notes to portal files tab"
    ],
    notes: "Reviewed fine motor metrics and sensory processing needs. Parent shared details about home writing difficulties. Recommended to implement keyboarding aids.",
    transcript: [
      { time: "12:15", seconds: 735, text: "Evaluating hand-eye coordination, pencil grasp, and writing speed variations." },
      { time: "34:20", seconds: 2060, text: "He requires direct occupational therapy support to properly access the grade level writing assignments." }
    ]
  },
  {
    id: "rec_4",
    title: "Middle School Transition Meeting",
    date: "Jan 22, 2026",
    duration: "1:20:11",
    secondsLimit: 4811,
    highlights: [
      "Class change helper accommodations approved",
      "Transition counselor assigned",
      "Self-advocacy goals added to transition plan"
    ],
    actionItems: [
      "Schedule transition tour of the middle school building",
      "Establish contact with the 6th-grade special ed lead"
    ],
    notes: "Meeting focused on class sizes, lock configurations, and emotional transition supports. The middle school team was present and receptive.",
    transcript: [
      { time: "18:40", seconds: 1120, text: "Discussing accommodations for class-change timing and self-advocacy support." },
      { time: "45:10", seconds: 2710, text: "The self-advocacy plan will help the student request breaks from teachers directly." }
    ]
  },
  {
    id: "rec_5",
    title: "504 Plan Meeting",
    date: "Dec 4, 2025",
    duration: "0:45:28",
    secondsLimit: 2728,
    highlights: [
      "Revised accommodations for diabetic monitoring",
      "Testing extended time approved",
      "Emergency plan updated"
    ],
    actionItems: [
      "Coordinate medical plan details with school nurse",
      "Distribute copies of the emergency protocol to active staff"
    ],
    notes: "Updated testing timelines and physical breaks. Nurse agreed to check blood sugar monitors during testing windows.",
    transcript: [
      { time: "08:15", seconds: 495, text: "Reviewing physician recommendations for classroom seating and sensor monitoring." },
      { time: "31:40", seconds: 1900, text: "Approved 50% extended time for all standardized testing assessments this term." }
    ]
  }
];

interface PortalVoyageLogTabProps {
  isAdminView?: boolean;
  isLight?: boolean;
  studentId?: number | null;
}

export default function PortalVoyageLogTab({
  isAdminView = false,
  isLight = false,
  studentId = null
}: PortalVoyageLogTabProps) {
  // Query backend voyage logs from database
  const { data: dbLogs, refetch } = trpc.voyageLog.list.useQuery(
    { contactId: studentId ?? undefined },
    {
      refetchInterval: (queryResult) => {
        const hasProcessing = queryResult?.state?.data?.some(
          (d: any) => d.status === "uploading" || d.status === "processing"
        );
        return hasProcessing ? 5000 : false;
      },
      refetchIntervalInBackground: false,
    }
  );

  const [activeRecId, setActiveRecId] = useState<string>("rec_1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [rightTab, setRightTab] = useState<"transcript" | "notes">("transcript");

  // Simulated Video Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(80);
  const [speed, setSpeed] = useState<string>("1x");
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processedRecordings = useMemo(() => {
    const list: Recording[] = [];

    // Add real database records if they exist
    if (dbLogs && dbLogs.length > 0) {
      dbLogs.forEach((log: any) => {
        let highlights: string[] = [];
        let actionItems: string[] = [];
        try {
          highlights = log.approvedItems ? JSON.parse(log.approvedItems) : [];
        } catch (e) {}
        try {
          actionItems = log.crmTaskSuggestions
            ? JSON.parse(log.crmTaskSuggestions).map((t: any) => t.title)
            : [];
        } catch (e) {}

        let transcriptList: { time: string; seconds: number; text: string }[] = [];
        if (log.formattedTranscript) {
          const lines = log.formattedTranscript.split("\n");
          lines.forEach((line: string, index: number) => {
            if (line.trim().includes(": ")) {
              transcriptList.push({
                time: `0:${(index * 15).toString().padStart(2, "0")}`,
                seconds: index * 15,
                text: line,
              });
            }
          });
        }

        list.push({
          id: String(log.id),
          title: log.title || "Voyage Session Recording",
          date: new Date(log.recordingDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          }),
          duration: log.duration || "1:42:18",
          secondsLimit: 6138,
          highlights: highlights.length > 0 ? highlights : ["Ready for advocate review"],
          actionItems: actionItems.length > 0 ? actionItems : ["Awaiting action items"],
          notes: log.executiveSummary || "Processing meeting transcript with AI...",
          transcript: transcriptList.length > 0 ? transcriptList : [
            { time: "0:00", seconds: 0, text: "Awaiting audio transcript processing..." }
          ],
          status: log.status,
        } as any);
      });
    }

    // Append static default recordings
    RECORDINGS_DATA.forEach((rec) => {
      if (!list.some((l) => l.title === rec.title)) {
        list.push(rec);
      }
    });

    return list;
  }, [dbLogs]);

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRec =
    processedRecordings.find((r) => r.id === activeRecId) ||
    processedRecordings[0] ||
    RECORDINGS_DATA[0];

  // Playback timer effect
  useEffect(() => {
    if (isPlaying) {
      const speedMultiplier = parseFloat(speed.replace("x", "")) || 1;
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= activeRec.secondsLimit) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / speedMultiplier);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeRec, speed]);

  // Reset player when switching recording
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [activeRecId]);

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeJump = (seconds: number) => {
    setCurrentTime(seconds);
    setIsPlaying(true);
  };

  const handleSkip = (deltaSeconds: number) => {
    setCurrentTime((prev) => Math.max(0, Math.min(activeRec.secondsLimit, prev + deltaSeconds)));
  };

  const formatSeconds = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const paddedMins = mins.toString().padStart(2, "0");
    const paddedSecs = secs.toString().padStart(2, "0");

    if (hrs > 0) {
      return `${hrs}:${paddedMins}:${paddedSecs}`;
    }
    return `${mins}:${paddedSecs}`;
  };

  // Highlights search helper
  const highlightMatches = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <span key={i} className="bg-amber-400 text-slate-950 px-1 font-semibold rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handleDownloadTranscript = () => {
    const content = [
      `VOYAGE MEETING LOG — WAYPOINT ADVOCATES`,
      `Meeting: ${activeRec.title}`,
      `Date: ${activeRec.date} | Duration: ${activeRec.duration}`,
      `\nHIGHLIGHTS:`,
      ...activeRec.highlights.map((h) => `- ${h}`),
      `\nACTION ITEMS:`,
      ...activeRec.actionItems.map((a) => `- ${a}`),
      `\nADVOCATE NOTES:`,
      activeRec.notes,
      `\nTRANSCRIPT:`,
      ...activeRec.transcript.map((t) => `[${t.time}] ${t.text}`)
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeRec.title.replace(/\s+/g, "_")}_Transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Transcript downloaded for ${activeRec.title}`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.loading("Generating Cloudflare Stream upload link...", { id: "voyage-upload" });

    try {
      const response = await fetch("/api/voyage-log/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId || 3,
          portalId: 1,
          title: file.name.replace(/\.[^/.]+$/, ""),
        }),
      });

      if (!response.ok) throw new Error("Failed to get upload link");
      const { uploadURL } = await response.json();

      toast.loading("Uploading session recording to Cloudflare Stream...", { id: "voyage-upload" });

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadRes = await fetch(uploadURL, {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      toast.success("Recording uploaded! AI pipeline running in the background.", { id: "voyage-upload" });
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(`Upload error: ${err.message}`, { id: "voyage-upload" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-white">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/*,audio/*"
        className="hidden"
      />

      {/* ── 3D Admiralty Hero Header: VOYAGE MEETING LOGS ── */}
      <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-[#FFE394]/70 via-[#C5A059]/40 to-[#9E7D3B]/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)]">
        <div className="bg-gradient-to-b from-[#0B1E38] via-[#07162B] to-[#040D1A] p-6 sm:p-7 rounded-[23px] relative overflow-hidden">
          {/* 3D Specular Top Bevel Hairline */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent shadow-[0_0_15px_rgba(255,227,148,0.8)]" />

          {/* Ambient Maritime Background Glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#1E3A8A]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
            <div className="space-y-3 max-w-2xl">
              {/* 3D Eyebrow Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-extrabold uppercase tracking-widest bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07152B] shadow-md border border-[#FFE394]/60">
                  <Video className="h-3.5 w-3.5 text-[#07152B]" />
                  VOYAGE MEETING LOGS
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#020A17]/85 border border-[#DFBE77]/40 text-[#C6B697] shadow-inner">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  Encrypted &bull; FERPA Compliant
                </span>
              </div>

              {/* Main Headline */}
              <div className="flex items-center gap-3.5 flex-wrap">
                <div className="w-12 h-12 rounded-2xl p-[1.5px] bg-gradient-to-b from-[#FFE394] via-[#C5A059] to-[#9E7D3B] shadow-[0_8px_20px_rgba(0,0,0,0.85)] shrink-0">
                  <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#142642] to-[#051124] flex items-center justify-center border border-[#FFE394]/20 shadow-inner">
                    <Video className="h-6 w-6 text-[#FAD77B] drop-shadow-[0_0_8px_rgba(250,215,123,0.6)]" />
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#FFF4D4] tracking-tight drop-shadow-md">
                  Voyage Meeting Logs
                </h1>
                <PageIdBadge id="PG-023-VOY" name="Voyage Log" />
              </div>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-[#D8C7A5] font-normal leading-relaxed pl-0.5">
                Every IEP conference, school evaluation, and advocacy session securely recorded, transcribed, and indexed.
              </p>
            </div>

            {isAdminView && (
              <div className="shrink-0 self-start md:self-auto">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs h-11 px-5 rounded-xl border border-[#FFE394]/70 shadow-[0_6px_20px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#07162B]" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0 shadow-sm" />
                      <span>Upload Meeting Recording</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Metrics Panels in a Row: 3D Elevated Gold-Edge Depth ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-[#FFE394]/50 via-[#C5A059]/30 to-[#9E7D3B]/20 shadow-[0_12px_28px_rgba(0,0,0,0.85)] hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(197,160,89,0.22)] transition-all">
          <div className="bg-gradient-to-br from-[#0B1E38]/95 via-[#07162B]/95 to-[#040D1A]/95 rounded-[15px] p-4.5 relative overflow-hidden flex items-center gap-4">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/50 to-transparent" />
            <div className="w-12 h-12 rounded-xl p-[1px] bg-gradient-to-b from-[#FFE394]/70 via-[#C5A059]/40 to-[#9E7D3B]/20 shadow-md shrink-0">
              <div className="w-full h-full rounded-[10px] bg-gradient-to-b from-[#14233D] to-[#040A15] flex items-center justify-center border border-[#FFE394]/25 shadow-inner">
                <Clapperboard className="h-5 w-5 text-indigo-300 drop-shadow" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-serif font-black text-[#FFF4D4] tracking-tight leading-none drop-shadow-sm">14</p>
              <p className="text-xs text-[#A69371] font-medium mt-1">Recorded Meetings</p>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-[#FFE394]/50 via-[#C5A059]/30 to-[#9E7D3B]/20 shadow-[0_12px_28px_rgba(0,0,0,0.85)] hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(197,160,89,0.22)] transition-all">
          <div className="bg-gradient-to-br from-[#0B1E38]/95 via-[#07162B]/95 to-[#040D1A]/95 rounded-[15px] p-4.5 relative overflow-hidden flex items-center gap-4">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/50 to-transparent" />
            <div className="w-12 h-12 rounded-xl p-[1px] bg-gradient-to-b from-[#FFE394]/70 via-[#C5A059]/40 to-[#9E7D3B]/20 shadow-md shrink-0">
              <div className="w-full h-full rounded-[10px] bg-gradient-to-b from-[#14233D] to-[#040A15] flex items-center justify-center border border-[#FFE394]/25 shadow-inner">
                <Clock className="h-5 w-5 text-[#FAD77B] drop-shadow" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-serif font-black text-[#FFF4D4] tracking-tight leading-none drop-shadow-sm">32.4</p>
              <p className="text-xs text-[#A69371] font-medium mt-1">Total Hours Recorded</p>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-[#FFE394]/50 via-[#C5A059]/30 to-[#9E7D3B]/20 shadow-[0_12px_28px_rgba(0,0,0,0.85)] hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(197,160,89,0.22)] transition-all">
          <div className="bg-gradient-to-br from-[#0B1E38]/95 via-[#07162B]/95 to-[#040D1A]/95 rounded-[15px] p-4.5 relative overflow-hidden flex items-center gap-4">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/50 to-transparent" />
            <div className="w-12 h-12 rounded-xl p-[1px] bg-gradient-to-b from-[#FFE394]/70 via-[#C5A059]/40 to-[#9E7D3B]/20 shadow-md shrink-0">
              <div className="w-full h-full rounded-[10px] bg-gradient-to-b from-[#14233D] to-[#040A15] flex items-center justify-center border border-[#FFE394]/25 shadow-inner">
                <FileText className="h-5 w-5 text-sky-300 drop-shadow" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-serif font-black text-[#FFF4D4] tracking-tight leading-none drop-shadow-sm">100%</p>
              <p className="text-xs text-[#A69371] font-medium mt-1">Meetings Transcribed</p>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-[#FFE394]/50 via-[#C5A059]/30 to-[#9E7D3B]/20 shadow-[0_12px_28px_rgba(0,0,0,0.85)] hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(197,160,89,0.22)] transition-all">
          <div className="bg-gradient-to-br from-[#0B1E38]/95 via-[#07162B]/95 to-[#040D1A]/95 rounded-[15px] p-4.5 relative overflow-hidden flex items-center gap-4">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/50 to-transparent" />
            <div className="w-12 h-12 rounded-xl p-[1px] bg-gradient-to-b from-[#FFE394]/70 via-[#C5A059]/40 to-[#9E7D3B]/20 shadow-md shrink-0">
              <div className="w-full h-full rounded-[10px] bg-gradient-to-b from-[#14233D] to-[#040A15] flex items-center justify-center border border-[#FFE394]/25 shadow-inner">
                <Shield className="h-5 w-5 text-emerald-400 drop-shadow" />
              </div>
            </div>
            <div>
              <p className="text-sm font-serif font-bold text-[#FFF4D4] leading-tight">Secure & Private</p>
              <p className="text-[11px] text-[#A69371] font-medium mt-0.5 leading-snug">Only you & your advocate</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main 2 Column Section: Simple, Intuitive Setup ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ── Left Column: Recordings List (1 Col) ── */}
        <div className="lg:col-span-1 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-[#C5A059] uppercase tracking-wider">
              All Recordings ({processedRecordings.length})
            </span>
            <span className="text-[10px] text-[#A69371] font-mono">
              Click to view
            </span>
          </div>

          <div className="space-y-3">
            {processedRecordings.map((rec) => {
              const isActive = rec.id === activeRecId;
              return (
                <div
                  key={rec.id}
                  onClick={() => setActiveRecId(rec.id)}
                  className={cn(
                    "rounded-2xl transition-all duration-300 cursor-pointer relative overflow-hidden group select-none",
                    isActive
                      ? "p-[1.5px] bg-gradient-to-b from-[#FFE394] via-[#DFBE77] to-[#9E7D3B] shadow-[0_12px_28px_rgba(197,160,89,0.25)] -translate-y-0.5"
                      : "p-[1px] bg-gradient-to-b from-[#FFE394]/30 via-[#C5A059]/20 to-[#9E7D3B]/10 hover:from-[#FFE394]/60 hover:via-[#DFBE77]/40 shadow-md hover:-translate-y-0.5"
                  )}
                >
                  <div className={cn(
                    "rounded-[14.5px] p-3.5 flex gap-3 relative overflow-hidden",
                    isActive
                      ? "bg-gradient-to-br from-[#0F2744] via-[#0B1E38] to-[#040D1A]"
                      : "bg-gradient-to-br from-[#07162B]/95 via-[#051429]/95 to-[#020A17]/95 group-hover:from-[#0B1E38]/95"
                  )}>
                    {/* Top specular hairline */}
                    <div className={cn(
                      "absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent transition-all",
                      isActive ? "via-[#FFE394]" : "via-[#FFE394]/30 group-hover:via-[#FFE394]/60"
                    )} />

                    {/* 3D Thumbnail */}
                    <div className="relative w-24 h-16 rounded-xl bg-gradient-to-tr from-[#020A17] via-[#0A2647] to-[#103E73] border border-[#DFBE77]/30 overflow-hidden shrink-0 flex items-center justify-center shadow-inner group-hover:border-[#FFE394]/60 transition-colors">
                      <div className="absolute w-2 h-2 bg-[#DFBE77] rounded-full blur-[2px] top-4 left-10" />
                      <div className="w-7 h-7 rounded-full bg-[#020A17]/80 border border-[#DFBE77]/40 flex items-center justify-center shadow-md relative z-10 group-hover:scale-110 transition-transform">
                        <Play className="h-3.5 w-3.5 text-[#FFE394] ml-0.5" />
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/85 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8.5px] font-bold text-[#FFF4D4] font-mono leading-none border border-[#DFBE77]/30">
                        {rec.duration}
                      </span>
                    </div>

                    {/* Recording Details */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className={cn(
                          "font-serif font-bold text-xs truncate transition-colors flex items-center gap-1.5",
                          isActive ? "text-[#FFF4D4]" : "text-white group-hover:text-[#FFE394]"
                        )}>
                          {rec.title}
                          {rec.starred && <Star className="h-3 w-3 fill-[#DFBE77] text-[#DFBE77] shrink-0" />}
                        </h4>
                        <p className="text-[10px] text-[#A69371] mt-0.5 font-mono">
                          {rec.date}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        {rec.status === "uploading" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[8.5px] font-semibold text-amber-300 border border-amber-500/40">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Uploading...
                          </span>
                        ) : rec.status === "processing" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[8.5px] font-semibold text-indigo-300 border border-indigo-500/40">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Transcribing...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[8.5px] font-semibold text-emerald-300 border border-emerald-500/40">
                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                            Transcript Ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="w-full text-xs font-semibold bg-[#07162B] border border-[#DFBE77]/40 text-[#DFBE77] hover:bg-[#FFE394]/10 hover:text-[#FFF4D4] rounded-xl shadow-md cursor-pointer"
            onClick={() => toast.info("All recorded sessions are currently shown.")}
          >
            Load More Recordings
          </Button>
        </div>

        {/* ── Right Column: Video Player, Highlights, Actions, & Transcript (2 Cols) ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Main Player & Highlights Card with 3D Depth */}
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-[#FFE394]/60 via-[#C5A059]/35 to-[#9E7D3B]/20 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
            <div className="bg-gradient-to-b from-[#0B1E38] via-[#07162B] to-[#040D1A] rounded-[23px] p-5 sm:p-6 space-y-4 text-white relative overflow-hidden">
              
              {/* Top Specular Hairline */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE394]/60 to-transparent pointer-events-none" />

              {/* Title & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DFBE77]/25">
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4] tracking-tight drop-shadow-sm">
                    {activeRec.title}
                  </h3>
                  <p className="text-xs text-[#A69371] mt-0.5 font-mono">
                    {activeRec.date} &bull; {activeRec.duration}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleDownloadTranscript}
                    size="sm"
                    className="h-8.5 text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] border border-[#FFE394]/70 rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    <Download className="h-3.5 w-3.5 text-[#07162B]" />
                    <span>Download Transcript</span>
                  </Button>
                  <Button
                    size="sm"
                    className="h-8.5 w-8.5 p-0 bg-[#020A17] hover:bg-[#07162B] border border-[#DFBE77]/40 text-[#DFBE77] hover:text-[#FFF4D4] rounded-xl shadow-md cursor-pointer"
                    onClick={() => toast.info("Export options ready.")}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Custom 3D Video Player simulator */}
              <div className="relative aspect-video rounded-2xl bg-gradient-to-b from-[#020A17] via-[#07162B] to-[#020A17] border border-[#DFBE77]/35 overflow-hidden flex flex-col justify-between group shadow-[0_12px_30px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(0,0,0,0.9)] select-none">
                
                {/* Cinematic Backdrop Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020A17] via-[#07162B]/50 to-transparent" />

                {/* Watermark bar */}
                <div className="p-3 text-[10px] tracking-wider text-[#C6B697] uppercase font-semibold relative z-10 flex items-center justify-between bg-[#020A17]/80 backdrop-blur-xs border-b border-[#DFBE77]/20">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-[#DFBE77]" />
                    <span>Secure Encrypted Stream &bull; Waypoint Advocates</span>
                  </div>
                  <span className="font-mono text-emerald-400 text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ● Verified Playback
                  </span>
                </div>

                {/* 3D Big Center Play Button with Skip Controls */}
                <div className="flex items-center justify-center gap-6 relative z-10">
                  <button
                    onClick={() => handleSkip(-10)}
                    className="p-2.5 rounded-xl bg-[#020A17]/85 hover:bg-[#0B1E38] border border-[#DFBE77]/40 text-[#DFBE77] hover:text-[#FFF4D4] transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                    title="Rewind 10 seconds"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={handlePlayToggle}
                    className="w-14 h-14 rounded-full bg-gradient-to-b from-[#FFE394] via-[#DFBE77] to-[#C5A059] hover:brightness-110 text-[#07162B] flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-[#FFF4D4] shadow-[0_8px_25px_rgba(245,181,68,0.5),inset_0_1px_1px_rgba(255,255,255,0.5)] cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 text-[#07162B] fill-current" />
                    ) : (
                      <Play className="h-6 w-6 ml-0.5 text-[#07162B] fill-current" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSkip(10)}
                    className="p-2.5 rounded-xl bg-[#020A17]/85 hover:bg-[#0B1E38] border border-[#DFBE77]/40 text-[#DFBE77] hover:text-[#FFF4D4] transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                    title="Forward 10 seconds"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                </div>

                {/* Video control bar at bottom with 3D Bevel */}
                <div className="p-3 bg-gradient-to-t from-[#020A17] via-[#020A17]/95 to-transparent space-y-2 relative z-10 border-t border-[#DFBE77]/20">
                  {/* Scrub Timeline Slider */}
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={activeRec.secondsLimit}
                      value={currentTime}
                      onChange={(e) => setCurrentTime(parseInt(e.target.value))}
                      className="flex-1 h-1.5 rounded-lg bg-[#07162B] accent-[#DFBE77] cursor-pointer appearance-none shadow-inner"
                    />
                  </div>

                  {/* Left/Right controls */}
                  <div className="flex justify-between items-center text-xs text-[#FFF4D4]">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePlayToggle}
                        className="hover:text-[#FFE394] cursor-pointer transition-colors"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <span className="font-mono text-xs text-[#C6B697]">
                        {formatSeconds(currentTime)} / {activeRec.duration}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 relative">
                      {/* Volume Slider */}
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="h-4 w-4 text-[#DFBE77]" />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={volume}
                          onChange={(e) => setVolume(parseInt(e.target.value))}
                          className="w-16 h-1 rounded bg-[#07162B] accent-[#DFBE77] cursor-pointer appearance-none"
                        />
                      </div>

                      {/* Speed Selector */}
                      <div className="relative">
                        <button
                          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                          className="font-semibold text-xs px-2 py-0.5 rounded-md bg-[#020A17] border border-[#DFBE77]/40 text-[#DFBE77] hover:border-[#FFE394] cursor-pointer transition-colors"
                        >
                          {speed}
                        </button>
                        {showSpeedMenu && (
                          <div className="absolute bottom-7 right-0 bg-[#0B1E38] border border-[#DFBE77]/50 rounded-xl py-1 w-18 text-center text-xs shadow-2xl flex flex-col z-50">
                            {["0.5x", "1x", "1.25x", "1.5x", "2x"].map((s) => (
                              <button
                                key={s}
                                onClick={() => {
                                  setSpeed(s);
                                  setShowSpeedMenu(false);
                                }}
                                className={cn(
                                  "py-1 px-2 hover:bg-white/10 w-full block text-white cursor-pointer transition-colors text-xs font-mono",
                                  speed === s && "text-[#DFBE77] font-bold bg-[#FFE394]/10"
                                )}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Fullscreen icon */}
                      <button
                        className="hover:text-[#FFE394] cursor-pointer transition-colors text-[#DFBE77]"
                        onClick={() => toast.info("Fullscreen simulator.")}
                      >
                        <Maximize className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Highlights & Action Items: 3D Recessed Containers ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Highlights Box */}
                <div className="space-y-2 p-4 rounded-2xl bg-[#020A17]/85 border border-[#DFBE77]/30 shadow-inner">
                  <h4 className="text-xs font-serif font-bold text-[#FFF4D4] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#FAD77B]" />
                    Meeting Highlights
                  </h4>
                  <ul className="space-y-2 pt-1">
                    {activeRec.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-[#D8C7A5] flex items-start gap-2 leading-relaxed">
                        {h.includes("denied") ? (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Items Box */}
                <div className="space-y-2 p-4 rounded-2xl bg-[#020A17]/85 border border-[#DFBE77]/30 shadow-inner">
                  <h4 className="text-xs font-serif font-bold text-[#FFF4D4] flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-[#DFBE77]" />
                    Action Items
                  </h4>
                  <ul className="space-y-2 pt-1">
                    {activeRec.actionItems.map((a, i) => (
                      <li key={i} className="text-xs text-[#D8C7A5] flex items-start gap-2 leading-relaxed">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#DFBE77] shrink-0 mt-1.5 shadow-[0_0_6px_rgba(223,190,119,0.8)]" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ── Interactive Transcript / Notes Tabbed Card with 3D Depth ── */}
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-[#FFE394]/50 via-[#C5A059]/30 to-[#9E7D3B]/20 shadow-[0_16px_36px_rgba(0,0,0,0.85)]">
            <div className="rounded-[23px] bg-gradient-to-b from-[#0B1E38] via-[#07162B] to-[#040D1A] overflow-hidden text-white">
              {/* Tabs Header with Gold Edges */}
              <div className="flex border-b border-[#DFBE77]/30 bg-[#020A17]/80">
                <button
                  onClick={() => setRightTab("transcript")}
                  className={cn(
                    "flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider text-center transition-all cursor-pointer relative",
                    rightTab === "transcript"
                      ? "text-[#07162B] bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] shadow-md font-extrabold"
                      : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]/60"
                  )}
                >
                  Transcript
                </button>
                <button
                  onClick={() => setRightTab("notes")}
                  className={cn(
                    "flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider text-center transition-all cursor-pointer relative",
                    rightTab === "notes"
                      ? "text-[#07162B] bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] shadow-md font-extrabold"
                      : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]/60"
                  )}
                >
                  Notes
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {rightTab === "transcript" ? (
                  <>
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#A69371]" />
                      <Input
                        placeholder="Search this transcript..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-[#020A17]/90 border border-[#DFBE77]/40 text-xs text-[#FFF4D4] placeholder:text-[#A69371] rounded-xl focus:border-[#FFE394] focus-visible:ring-1 focus-visible:ring-[#FFE394]/50 h-9.5 shadow-inner"
                      />
                    </div>

                    {/* Transcript Rows with 3D Hover & Jump Button */}
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {activeRec.transcript
                        .filter((row) =>
                          row.text.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((row, i) => (
                          <div
                            key={i}
                            className="flex items-start justify-between gap-4 p-3 rounded-xl bg-[#020A17]/70 hover:bg-[#0E2548]/70 border border-[#DFBE77]/20 hover:border-[#DFBE77]/50 transition-all duration-200 group shadow-xs"
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleTimeJump(row.seconds)}
                                className="text-[11px] font-bold text-[#DFBE77] hover:underline shrink-0 pt-0.5 font-mono cursor-pointer"
                              >
                                {row.time}
                              </button>
                              <p className="text-xs text-[#FFF4D4] leading-relaxed font-medium">
                                {highlightMatches(row.text, searchQuery)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleTimeJump(row.seconds)}
                              className="p-1.5 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md hover:scale-105 active:scale-95"
                              title="Jump to this moment"
                            >
                              <Play className="h-3 w-3 fill-current" />
                            </button>
                          </div>
                        ))}

                      {activeRec.transcript.filter((row) =>
                        row.text.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 && (
                        <p className="text-xs text-[#A69371] text-center py-6 font-mono">
                          No matches found for &quot;{searchQuery}&quot;.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#FFF4D4] border-b border-[#DFBE77]/30 pb-2">
                      <UserCheck className="h-4 w-4 text-[#DFBE77]" />
                      Advocate Review Notes
                    </div>
                    <div className="text-xs text-[#D8C7A5] leading-relaxed whitespace-pre-wrap bg-[#020A17]/90 p-4 rounded-2xl border border-[#DFBE77]/30 shadow-inner">
                      {activeRec.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
