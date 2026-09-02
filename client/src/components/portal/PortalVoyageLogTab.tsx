import React, { useState, useEffect, useRef } from "react";
import {
  Video, Play, Volume2, Maximize, Search, MoreVertical, Download, Sparkles,
  Clapperboard, Clock, Shield, FileText, CheckCircle2, AlertCircle, Calendar, Pause, ClipboardList, Flame, UserCheck, Star, Loader2, Check
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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
      "Send private private OT evaluation to district team",
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
    notes: "Advocate Byron led the presentation of clinical diagnosis notes. The district psychologist accepted our clinical documentation and agreed that OHI eligibility is appropriate. Staff will draft the official goals.",
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

export default function PortalVoyageLogTab({ isAdminView = false, isLight = false, studentId = null }: PortalVoyageLogTabProps) {
  // Query voyage logs from backend database
  const { data: dbLogs, refetch } = trpc.voyageLog.list.useQuery(
    { contactId: studentId ?? undefined },
    {
      refetchInterval: (queryResult) => {
        const hasProcessing = queryResult?.state?.data?.some(
          (d: any) => d.status === "uploading" || d.status === "processing"
        );
        return hasProcessing ? 3000 : false;
      }
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

  const processedRecordings = React.useMemo(() => {
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
          actionItems = log.crmTaskSuggestions ? JSON.parse(log.crmTaskSuggestions).map((t: any) => t.title) : [];
        } catch (e) {}

        // Format raw/formatted transcript into timestamps
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
          highlights: highlights.length > 0 ? highlights : ["Ready for coaching review"],
          actionItems: actionItems.length > 0 ? actionItems : ["Awaiting parsed actions"],
          notes: log.executiveSummary || "Processing meeting transcript with Deepgram...",
          transcript: transcriptList.length > 0 ? transcriptList : [
            { time: "0:00", seconds: 0, text: "Awaiting audio transcript processing..." }
          ],
          status: log.status,
        } as any);
      });
    }

    // Append default static mock data so the list is always rich
    RECORDINGS_DATA.forEach((rec) => {
      if (!list.some(l => l.title === rec.title)) {
        list.push(rec);
      }
    });

    return list;
  }, [dbLogs]);

  // Handle file uploads state variables
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRec = processedRecordings.find((r) => r.id === activeRecId) || processedRecordings[0] || RECORDINGS_DATA[0];

  // Simulated playback effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= activeRec.secondsLimit) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeRec]);

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
    toast.success(`Downloading transcript for ${activeRec.title}...`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.loading("Generating Cloudflare Stream upload link...", { id: "voyage-upload" });

    try {
      // 1. Get Cloudflare direct upload URL from our backend endpoint
      const response = await fetch("/api/voyage-log/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId || 3, // Default to Baaarbra
          portalId: 1, // Default to Shawn Sheep
          title: file.name.replace(/\.[^/.]+$/, ""), // Strip extension
        }),
      });

      if (!response.ok) throw new Error("Failed to get upload link");
      const { uploadURL } = await response.json();

      toast.loading("Uploading session recording to Cloudflare Stream...", { id: "voyage-upload" });

      // 2. Perform direct creator upload to Cloudflare Stream
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
    <div className="p-5 space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/*,audio/*"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Video className="h-6 w-6 text-amber-500" />
            Voyage Log
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your recorded meetings. Securely stored. Easily searchable.
          </p>
        </div>
        {isAdminView && (
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 transition-all"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                Upload Meeting Recording
              </>
            )}
          </Button>
        )}
      </div>

      {/* Metrics Panel */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border rounded-2xl p-5 gap-6 sm:gap-4 divide-y lg:divide-y-0 lg:divide-x ${
        isLight 
          ? "bg-white border-slate-200 divide-slate-200" 
          : "bg-[#161B22]/30 border-white/10 divide-white/10"
      }`}>
        {/* Item 1 */}
        <div className="flex items-center justify-center gap-4 py-2 sm:py-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <Clapperboard className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-lg font-bold ${isLight ? "text-slate-800" : "text-[#b0bfff]"}`}>14</p>
            <p className="text-xs text-muted-foreground mt-0.5">Recorded Meetings</p>
          </div>
        </div>

        {/* Item 2 */}
        <div className="flex items-center justify-center gap-4 py-4 sm:py-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-lg font-bold ${isLight ? "text-slate-800" : "text-[#b0bfff]"}`}>32.4</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Hours Recorded</p>
          </div>
        </div>

        {/* Item 3 */}
        <div className="flex items-center justify-center gap-4 py-4 sm:py-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-sky-500/10 text-sky-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-lg font-bold ${isLight ? "text-slate-800" : "text-[#aae4ff]"}`}>100%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Meetings Transcribed</p>
          </div>
        </div>

        {/* Item 4 */}
        <div className="flex items-center justify-center gap-4 py-4 sm:py-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-sm font-bold leading-tight ${isLight ? "text-slate-800" : "text-[#b0bfff]"}`}>Secure & Private</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">Only you and your advocate can access</p>
          </div>
        </div>
      </div>

      {/* Main 2 Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recordings List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              All Recordings
            </span>
          </div>

          <div className="space-y-3">
            {processedRecordings.map((rec) => {
              const isActive = rec.id === activeRecId;
              return (
                <div
                  key={rec.id}
                  onClick={() => setActiveRecId(rec.id)}
                  className={`border rounded-xl p-3 flex gap-3 transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden ${
                    isLight
                      ? isActive
                        ? "bg-white border-amber-500 shadow-md ring-1 ring-amber-500/10"
                        : "bg-white border-slate-200 hover:border-amber-400/40 hover:shadow"
                      : isActive
                        ? "bg-[#061A33] border-amber-400 text-slate-100 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/20"
                        : "bg-[#161B22]/80 border-white/10 text-slate-300 hover:border-amber-400/30"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-24 h-16 rounded-lg bg-slate-800 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                    {/* Simulated Lighthouse/Sailboat Thumbnail Graphics */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#021024] to-[#0A2647] opacity-90" />
                    <div className="absolute w-1.5 h-4 bg-white/40 bottom-1 left-8 rounded" />
                    <div className="absolute w-2 h-2 bg-amber-400 rounded-full blur-[2px] top-6 left-12" />
                    <Play className="h-4 w-4 text-white relative z-10 opacity-70" />
                    <span className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-[9px] font-semibold text-white leading-none">
                      {rec.duration}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs truncate text-foreground flex items-center gap-1.5 font-sans">
                        {rec.title}
                        {rec.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {rec.date}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      {rec.status === "uploading" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-500">
                          <Loader2 className="h-2 w-2 animate-spin" />
                          Uploading...
                        </span>
                      ) : rec.status === "processing" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[9px] font-semibold text-indigo-400">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          Transcribing...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-500 dark:text-emerald-450">
                          <Check className="h-2.5 w-2.5 text-emerald-500" />
                          Transcript Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="w-full text-xs font-semibold border-slate-700/50 hover:bg-slate-800/40 text-muted-foreground"
            onClick={() => toast.info("No additional recordings found.")}
          >
            Load More Recordings
          </Button>
        </div>

        {/* Right Column: Player & Interactive Transcript */}
        <div className="lg:col-span-2 space-y-6">
          <Card className={`p-5 rounded-xl border shadow-md space-y-4 ${
            isLight ? "bg-white border-slate-200" : "bg-[#161B22]/80 border-white/10"
          }`}>
            {/* Header info */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground">{activeRec.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeRec.date} &bull; {activeRec.duration}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadTranscript}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-bold flex items-center gap-1.5 border-slate-700/50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Transcript
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-slate-700/50"
                  onClick={() => toast.info("Export options coming soon.")}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Custom Video Player simulator */}
            <div className="relative aspect-video rounded-xl bg-slate-950 border border-white/10 overflow-hidden flex flex-col justify-between group">
              {/* Thumbnail background image */}
              <div className="absolute inset-0 bg-cover bg-center animate-pulse" style={{ backgroundImage: "url('/compass-bg.jpg')" }}>
                {/* Simulated dusk/dawn gradient mask */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
              </div>

              {/* Big Center Play button */}
              <button
                onClick={handlePlayToggle}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition-all hover:scale-105 border border-white/20 shadow-xl cursor-pointer"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </button>

              {/* Top watermark overlay */}
              <div className="p-3 text-[10px] tracking-widest text-white/40 uppercase font-semibold relative z-10 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-amber-500" />
                Secure Encrypted Stream
              </div>

              {/* Video control bar at the bottom */}
              <div className="p-3 bg-gradient-to-t from-slate-950 to-transparent space-y-2 relative z-10">
                {/* Scrub Timeline Slider */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={activeRec.secondsLimit}
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseInt(e.target.value))}
                    className="flex-1 h-1 rounded bg-white/20 accent-amber-505 cursor-pointer appearance-none"
                  />
                </div>

                {/* Left/Right controls */}
                <div className="flex justify-between items-center text-xs text-white">
                  <div className="flex items-center gap-4">
                    <button onClick={handlePlayToggle} className="hover:text-amber-400 cursor-pointer">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <span>
                      {formatSeconds(currentTime)} / {activeRec.duration}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 relative">
                    {/* Volume */}
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4" />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-16 h-1 rounded bg-white/25 accent-white cursor-pointer appearance-none"
                      />
                    </div>

                    {/* Speed Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="hover:text-amber-400 font-semibold px-1 rounded hover:bg-white/10 cursor-pointer"
                      >
                        {speed}
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-6 right-0 bg-slate-900 border border-slate-700 rounded-md py-1 w-16 text-center text-xs shadow-2xl flex flex-col z-50">
                          {["0.5x", "1x", "1.25x", "1.5x", "2x"].map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setSpeed(s);
                                setShowSpeedMenu(false);
                              }}
                              className="py-1 hover:bg-white/15 w-full block text-white cursor-pointer"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen icon */}
                    <button className="hover:text-amber-400 cursor-pointer" onClick={() => toast.info("Fullscreen mode is a simulator placeholder.")}>
                      <Maximize className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Highlights & Action Items grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 font-sans">
                  <Sparkles className="h-4 w-4 text-purple-400 fill-purple-400" />
                  Meeting Highlights
                </h4>
                <ul className="space-y-1.5">
                  {activeRec.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      {h.includes("denied") ? (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 font-sans">
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                  Action Items
                </h4>
                <ul className="space-y-1.5">
                  {activeRec.actionItems.map((a, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Interactive Transcript / Notes tab */}
          <Card className={`rounded-xl border shadow-sm overflow-hidden ${
            isLight ? "bg-white border-slate-200" : "bg-[#161B22]/80 border-white/10"
          }`}>
            <div className="flex border-b border-border">
              <button
                onClick={() => setRightTab("transcript")}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-colors cursor-pointer ${
                  rightTab === "transcript"
                    ? "border-amber-400 text-amber-400 bg-amber-500/5"
                    : "border-transparent text-muted-foreground hover:bg-slate-800/10"
                }`}
              >
                Transcript
              </button>
              <button
                onClick={() => setRightTab("notes")}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-colors cursor-pointer ${
                  rightTab === "notes"
                    ? "border-amber-400 text-amber-400 bg-amber-500/5"
                    : "border-transparent text-muted-foreground hover:bg-slate-800/10"
                }`}
              >
                Notes
              </button>
            </div>

            <div className="p-4 space-y-4">
              {rightTab === "transcript" ? (
                <>
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search this transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-900/60 border-slate-700/50 text-xs"
                    />
                  </div>

                  {/* Transcript rows */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {activeRec.transcript
                      .filter((row) =>
                        row.text.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((row, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between gap-4 p-2 rounded-lg hover:bg-slate-800/40 border border-transparent hover:border-slate-800 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleTimeJump(row.seconds)}
                              className="text-[11px] font-bold text-amber-400 hover:underline shrink-0 pt-0.5 cursor-pointer"
                            >
                              {row.time}
                            </button>
                            <p className="text-xs text-slate-350 dark:text-slate-300 leading-relaxed font-medium">
                              {highlightMatches(row.text, searchQuery)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleTimeJump(row.seconds)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-white shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer animate-fadeIn"
                            title="Jump to this segment"
                          >
                            <Play className="h-3 w-3 fill-white" />
                          </button>
                        </div>
                      ))}

                    {activeRec.transcript.filter((row) =>
                      row.text.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No matches found for "{searchQuery}".
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border pb-2">
                    <UserCheck className="h-4 w-4 text-amber-500" />
                    Advocate Review Notes
                  </div>
                  <p className="text-xs text-slate-350 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/30 p-3 rounded-lg border border-slate-850">
                    {activeRec.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
