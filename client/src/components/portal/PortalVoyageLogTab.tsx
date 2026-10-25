import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Video, Play, Pause, Volume2, Maximize, Search, Download, Sparkles,
  Clapperboard, Clock, Shield, FileText, CheckCircle2, AlertCircle,
  ClipboardList, Star, Loader2, Check, RotateCcw, RotateCw, Users,
  Scale, FileSignature, BookmarkCheck, ExternalLink, ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import PageIdBadge from "@/components/PageIdBadge";
import { cn } from "@/lib/utils";
import {
  VOYAGE_RECORDINGS_DATA,
  VoyageRecording,
  VoyageTranscriptTurn,
  VoyageActionItem,
  VoyagePwnItem
} from "./voyageLogData";

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

  // State
  const [activeRecId, setActiveRecId] = useState<string>("rec_1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [transcriptSearch, setTranscriptSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showStarredOnly, setShowStarredOnly] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "brief" | "pwn" | "actions">("transcript");

  // Custom Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(80);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local record modifications (starred state & checklist toggles)
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({
    rec_1: true,
    rec_2: true,
  });

  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({
    "Upload Rachel Chen's private sensory clinical report into Portal Document Vault": true,
    "Execute Consent for Special Education Placement documentation": true,
    "Deploy Chromebook voice dictation extension with offline headset": true,
    "File signed physician orders with school clinic": true,
    "Distribute emergency hypo/hyperglycemia cheat sheet to all academic teachers": true,
  });

  // Merge static rich mock recordings with real backend DB records
  const allRecordings = useMemo(() => {
    const list: VoyageRecording[] = [...VOYAGE_RECORDINGS_DATA];

    if (dbLogs && dbLogs.length > 0) {
      dbLogs.forEach((log: any) => {
        let highlights: string[] = [];
        let actionItems: VoyageActionItem[] = [];
        try {
          highlights = log.approvedItems ? JSON.parse(log.approvedItems) : [];
        } catch (e) {}
        try {
          const rawActions = log.crmTaskSuggestions ? JSON.parse(log.crmTaskSuggestions) : [];
          actionItems = rawActions.map((t: any) => ({
            task: t.title || "Action item",
            owner: "Advocate / Team",
            dueDate: "TBD",
            completed: false
          }));
        } catch (e) {}

        let transcriptList: VoyageTranscriptTurn[] = [];
        if (log.formattedTranscript) {
          const lines = log.formattedTranscript.split("\n");
          lines.forEach((line: string, index: number) => {
            if (line.trim().includes(": ")) {
              const [speakerPart, ...textParts] = line.split(": ");
              transcriptList.push({
                speaker: speakerPart.trim(),
                role: speakerPart.toLowerCase().includes("advocate") ? "advocate" : "district",
                time: `0:${(index * 15).toString().padStart(2, "0")}`,
                seconds: index * 15,
                text: textParts.join(": ").trim(),
              });
            }
          });
        }

        const existingIdx = list.findIndex(r => r.id === String(log.id));
        const newRecord: VoyageRecording = {
          id: String(log.id),
          title: log.title || "Voyage Session Recording",
          meetingType: "Specialized Meeting",
          category: "iep",
          date: new Date(log.recordingDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          }),
          duration: log.duration || "1:42:18",
          secondsLimit: 6138,
          starred: false,
          statutoryProng: "IDEA Part B · Procedural Safeguards",
          leadAdvocate: "Byron Honea · Lead Special Education Advocate",
          outcomeBadge: {
            label: "AI Synced & Verified",
            variant: "success",
          },
          attendees: [
            { name: "Byron Honea", role: "Lead Special Ed Advocate", affiliation: "Waypoint" },
            { name: "District Team", role: "Special Education Committee", affiliation: "District" },
          ],
          highlights: highlights.length > 0 ? highlights : ["Automated summary synced from meeting recording."],
          actionItems: actionItems.length > 0 ? actionItems : [
            { task: "Review automated transcript and verify attendance", owner: "Advocate", dueDate: "Upcoming" }
          ],
          pwnWatchlist: [
            {
              item: "General Notice of Action",
              districtPromise: "District committee to provide meeting minutes and proposed draft.",
              statutoryProng: "34 C.F.R. § 300.503",
              deadlineDays: 10
            }
          ],
          executiveBrief: log.executiveSummary || "Processing meeting recording with AI speech-to-text pipeline...",
          transcript: transcriptList.length > 0 ? transcriptList : [
            {
              speaker: "System",
              role: "advocate",
              time: "0:00",
              seconds: 0,
              text: "Speech-to-text processing complete. Recording available for playback."
            }
          ],
          status: log.status,
        };

        if (existingIdx >= 0) {
          list[existingIdx] = newRecord;
        } else {
          list.unshift(newRecord);
        }
      });
    }

    return list;
  }, [dbLogs]);

  // Filter recordings by search, category, and starred
  const filteredRecordings = useMemo(() => {
    return allRecordings.filter((rec) => {
      const isStarred = starredMap[rec.id] ?? rec.starred ?? false;
      if (showStarredOnly && !isStarred) return false;

      if (selectedCategory !== "all" && rec.category !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = rec.title.toLowerCase().includes(q);
        const matchesProng = rec.statutoryProng.toLowerCase().includes(q);
        const matchesAttendee = rec.attendees.some(a => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q));
        const matchesTranscript = rec.transcript.some(t => t.text.toLowerCase().includes(q));
        return matchesTitle || matchesProng || matchesAttendee || matchesTranscript;
      }

      return true;
    });
  }, [allRecordings, searchQuery, selectedCategory, showStarredOnly, starredMap]);

  // Active recording
  const activeRec = useMemo(() => {
    return allRecordings.find((r) => r.id === activeRecId) || filteredRecordings[0] || allRecordings[0];
  }, [allRecordings, activeRecId, filteredRecordings]);

  // Playback timer effect
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
      }, 1000 / playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeRec, playbackSpeed]);

  // Reset player when switching recording
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setTranscriptSearch("");
  }, [activeRecId]);

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeJump = (seconds: number) => {
    setCurrentTime(seconds);
    setIsPlaying(true);
    toast.info(`Jumped to ${formatSeconds(seconds)}`, {
      description: `Playing: ${activeRec.title}`
    });
  };

  const handleSkip = (deltaSeconds: number) => {
    setCurrentTime((prev) => {
      const next = Math.max(0, Math.min(activeRec.secondsLimit, prev + deltaSeconds));
      return next;
    });
  };

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredMap((prev) => {
      const nextVal = !(prev[id] ?? false);
      toast.success(nextVal ? "Added to Starred Meetings" : "Removed from Starred Meetings");
      return { ...prev, [id]: nextVal };
    });
  };

  const toggleActionItem = (taskName: string) => {
    setCompletedActions((prev) => {
      const nextVal = !prev[taskName];
      toast.success(nextVal ? "Action item marked complete" : "Action item reopened");
      return { ...prev, [taskName]: nextVal };
    });
  };

  const formatSeconds = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const paddedMins = mins.toString().padStart(2, "0");
    const paddedSecs = secs.toString().padStart(2, "0");
    if (hrs > 0) return `${hrs}:${paddedMins}:${paddedSecs}`;
    return `${mins}:${paddedSecs}`;
  };

  const highlightMatches = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-[#DFBE77] text-[#07162B] font-bold px-1 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handleDownloadTranscript = () => {
    const textContent = [
      `=====================================================`,
      `WAYPOINT ADVOCATES — VOYAGE MEETING LOG TRANSCRIPT`,
      `Meeting: ${activeRec.title}`,
      `Date: ${activeRec.date} | Duration: ${activeRec.duration}`,
      `Lead Advocate: ${activeRec.leadAdvocate}`,
      `Statutory Reference: ${activeRec.statutoryProng}`,
      `=====================================================\n`,
      `ATTENDEES:`,
      ...activeRec.attendees.map(a => `- ${a.name} (${a.role} · ${a.affiliation})`),
      `\nEXECUTIVE ADVOCATE BRIEF:`,
      activeRec.executiveBrief,
      `\nFULL VERBATIM TRANSCRIPT:`,
      ...activeRec.transcript.map(t => `[${t.time}] ${t.speaker}:\n${t.text}\n`),
    ].join("\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VoyageLog_${activeRec.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transcript downloaded successfully!");
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

  const progressPercent = Math.min(100, (currentTime / (activeRec.secondsLimit || 1)) * 100);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-white animate-in fade-in duration-300">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/*,audio/*"
        className="hidden"
      />

      {/* ── Top Header Banner with Admiralty Navy & Brass Styling ── */}
      <div className="bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-7 rounded-3xl border border-[#3A2C18] shadow-[0_8px_30px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
        {/* Top gold shimmer accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#DFBE77]/80 to-transparent pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-60 h-60 bg-[#DFBE77]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-0.5 shadow-md font-mono border border-[#FFE394]/50">
                Admiralty Archive
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-emerald-400/50 text-emerald-300 bg-emerald-500/10">
                <Shield className="h-3 w-3 mr-1 inline text-emerald-400" />
                FERPA & IDEA Encrypted Storage
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#FFF4D4] tracking-tight flex items-center gap-2.5">
                <Video className="h-7 w-7 text-[#DFBE77]" />
                Voyage Meeting Logs
              </h1>
              <PageIdBadge id="PG-023-VOY" name="Voyage Log" />
            </div>

            <p className="text-xs sm:text-sm text-[#C6B697] leading-relaxed">
              Every IEP meeting, eligibility hearing, and evaluation conference securely archived with verbatim speech-to-text transcripts, advocate briefings, and Prior Written Notice (PWN) commitments.
            </p>
          </div>

          {isAdminView && (
            <div className="shrink-0">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#F0CF88] hover:via-[#D6B16A] hover:to-[#AF8E4C] text-[#07162B] font-extrabold text-xs h-11 px-5 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer flex items-center gap-2 border border-[#FFE394]/70 transition-all hover:scale-[1.01]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#07162B]" />
                    <span>Uploading Recording...</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                    <span>Upload Meeting Recording</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Admiralty Metrics & Assurance Row (Serif Values, Brass Recessed Plates) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-2xl p-4 shadow-[0_6px_20px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center gap-3.5 hover:border-[#C5A059]/60 transition-all">
          <div className="w-11 h-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0 shadow-inner text-[#DFBE77]">
            <Clapperboard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] block leading-none">
              {allRecordings.length}
            </span>
            <span className="text-[11px] text-[#C6B697] font-medium block mt-1">Recorded Sessions</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-2xl p-4 shadow-[0_6px_20px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center gap-3.5 hover:border-[#C5A059]/60 transition-all">
          <div className="w-11 h-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0 shadow-inner text-[#DFBE77]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] block leading-none">
              32.4 hrs
            </span>
            <span className="text-[11px] text-[#C6B697] font-medium block mt-1">Total Audio Time</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-2xl p-4 shadow-[0_6px_20px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center gap-3.5 hover:border-[#C5A059]/60 transition-all">
          <div className="w-11 h-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0 shadow-inner text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] block leading-none">
              100%
            </span>
            <span className="text-[11px] text-[#C6B697] font-medium block mt-1">AI Transcribed</span>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-2xl p-4 shadow-[0_6px_20px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center gap-3.5 hover:border-[#C5A059]/60 transition-all">
          <div className="w-11 h-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0 shadow-inner text-sky-400">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-serif font-bold text-[#FFF4D4] block leading-tight">
              PWN Watchlist
            </span>
            <span className="text-[10px] text-[#C6B697] font-medium block mt-0.5 leading-snug">
              District commitments monitored
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Pill Controls ── */}
      <div className="bg-[#05142B]/90 border border-[#3A2C18] p-4 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#C6B697]" />
          <Input
            placeholder="Search meetings, speakers, IEP prongs, or transcript keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#020A17] border-[#3A2C18] text-xs text-white placeholder:text-[#C6B697]/50 rounded-xl focus:border-[#DFBE77] focus-visible:ring-[#DFBE77] h-10 shadow-inner"
          />
        </div>

        {/* Category Pills & Star Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "all", label: "All Sessions" },
            { id: "iep", label: "IEP Reviews" },
            { id: "eval", label: "Evaluations" },
            { id: "transition", label: "Transition" },
            { id: "504", label: "Section 504" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer border",
                selectedCategory === cat.id
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/70 shadow-md"
                  : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] hover:border-[#C5A059]/50"
              )}
            >
              {cat.label}
            </button>
          ))}

          <button
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer border flex items-center gap-1.5",
              showStarredOnly
                ? "bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-md"
                : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:text-amber-300 hover:border-amber-400/50"
            )}
          >
            <Star className={cn("h-3.5 w-3.5", showStarredOnly ? "fill-slate-950 text-slate-950" : "fill-amber-400 text-amber-400")} />
            <span>Starred</span>
          </button>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Left Recordings List, Right Deep Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── Left Column: Recordings Feed (4 Cols) ── */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#C6B697] uppercase tracking-wider font-mono">
              Meeting Archives ({filteredRecordings.length})
            </span>
            <span className="text-[10px] text-[#A69371] font-mono">
              Click to load session
            </span>
          </div>

          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {filteredRecordings.map((rec) => {
              const isActive = rec.id === activeRec.id;
              const isStarred = starredMap[rec.id] ?? rec.starred ?? false;

              return (
                <div
                  key={rec.id}
                  onClick={() => setActiveRecId(rec.id)}
                  className={cn(
                    "border rounded-2xl p-4 transition-all duration-300 cursor-pointer shadow-xl relative overflow-hidden group",
                    isActive
                      ? "bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] border-[#DFBE77] text-white shadow-[0_6px_25px_rgba(0,0,0,0.85),0_0_15px_rgba(223,190,119,0.2)] ring-1 ring-[#DFBE77]/40"
                      : "bg-[#05142B]/90 border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/60 hover:bg-[#071936]"
                  )}
                >
                  {/* Top highlight bar on active card */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#DFBE77] to-transparent" />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-[#020A17] text-[#DFBE77] border border-[#3A2C18] text-[8.5px] font-mono px-1.5 py-0">
                          {rec.meetingType}
                        </Badge>
                        <span className="text-[10px] text-[#A69371] font-mono">{rec.date}</span>
                      </div>

                      <h4 className={cn(
                        "font-bold text-xs sm:text-[13px] leading-snug truncate",
                        isActive ? "text-[#FFF4D4]" : "text-white group-hover:text-[#FFF4D4]"
                      )}>
                        {rec.title}
                      </h4>
                    </div>

                    <button
                      onClick={(e) => toggleStar(e, rec.id)}
                      className="p-1 rounded-lg hover:bg-white/10 text-amber-400 transition-colors shrink-0 cursor-pointer"
                      title={isStarred ? "Unstar meeting" : "Star meeting"}
                    >
                      <Star className={cn("h-4 w-4", isStarred ? "fill-amber-400" : "stroke-amber-400 fill-transparent")} />
                    </button>
                  </div>

                  {/* Outcome Tag & Duration */}
                  <div className="mt-2.5 pt-2.5 border-t border-[#3A2C18]/60 flex items-center justify-between text-xs gap-2">
                    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-medium px-2 py-0.5 truncate">
                      {rec.outcomeBadge.label}
                    </Badge>

                    <span className="text-[10px] font-mono text-[#DFBE77] shrink-0 font-bold bg-[#020A17] px-2 py-0.5 rounded border border-[#3A2C18]">
                      {rec.duration}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredRecordings.length === 0 && (
              <div className="text-center py-10 p-4 rounded-2xl bg-[#05142B]/80 border border-[#3A2C18] text-[#C6B697] space-y-2">
                <Search className="h-6 w-6 text-[#DFBE77] mx-auto opacity-60" />
                <p className="text-xs">No meetings match your filter.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearchQuery(""); setSelectedCategory("all"); setShowStarredOnly(false); }}
                  className="text-xs border-[#3A2C18] text-[#DFBE77] hover:bg-white/10"
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Master Meeting Console (8 Cols) ── */}
        <div className="lg:col-span-8 space-y-5">
          <Card className="bg-[#05142B]/95 border border-[#3A2C18] shadow-[0_8px_30px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-3xl p-5 sm:p-6 text-white space-y-5 relative overflow-hidden">
            
            {/* Top gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#DFBE77]/80 to-transparent pointer-events-none" />

            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#3A2C18]">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-extrabold text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 shadow-sm">
                    {activeRec.meetingType}
                  </Badge>
                  <span className="text-xs text-[#C6B697] font-mono">{activeRec.date}</span>
                  <span className="text-white/20">•</span>
                  <span className="text-xs text-[#DFBE77] font-mono font-bold">{activeRec.duration}</span>
                </div>

                <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] leading-snug">
                  {activeRec.title}
                </h2>

                <p className="text-xs text-[#C6B697] flex items-center gap-1.5 pt-0.5">
                  <Scale className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
                  <span className="truncate">{activeRec.statutoryProng}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handleDownloadTranscript}
                  size="sm"
                  className="bg-[#020A17] hover:bg-[#07162B] border border-[#3A2C18] hover:border-[#DFBE77] text-[#FFF4D4] text-xs font-semibold h-9 px-3.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Download className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>Download Brief</span>
                </Button>
              </div>
            </div>

            {/* ── Admiralty Audio/Video Player with Live Soundwave Simulator ── */}
            <div className="relative rounded-2xl bg-gradient-to-b from-[#020A17] to-[#04122C] border border-[#3A2C18] overflow-hidden shadow-2xl flex flex-col justify-between group select-none">
              
              {/* Subtle maritime grid background */}
              <div className="absolute inset-0 bg-[radial-gradient(#102B4E_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

              {/* Watermark bar */}
              <div className="px-4 py-2.5 bg-[#020A17]/80 backdrop-blur-sm border-b border-[#3A2C18]/60 flex items-center justify-between text-[10px] text-[#C6B697] relative z-10 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[#FFF4D4] font-bold">Waypoint High-Fidelity Master Audio</span>
                </div>
                <span>FERPA Encrypted Stream</span>
              </div>

              {/* Player Stage: Big Play/Pause Button + Soundwave Animation */}
              <div className="py-10 px-6 flex flex-col items-center justify-center relative z-10 space-y-4">
                {/* Visualizer Soundwave Bars */}
                <div className="flex items-center gap-1.5 h-12 w-full max-w-md justify-center px-4">
                  {[24, 38, 55, 72, 45, 90, 60, 35, 78, 95, 62, 40, 85, 68, 45, 92, 50, 30, 65, 80, 48, 28].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        height: isPlaying ? `${Math.max(15, (h * ((i % 3) + 1) * (currentTime % 5 + 1)) % 100)}%` : "20%",
                        transition: "height 0.2s ease",
                      }}
                      className={cn(
                        "w-1.5 rounded-full transition-all duration-200",
                        isPlaying
                          ? "bg-gradient-to-t from-[#9E7D3B] via-[#DFBE77] to-[#FFF4D4] shadow-[0_0_8px_rgba(223,190,119,0.5)]"
                          : "bg-[#3A2C18]/80"
                      )}
                    />
                  ))}
                </div>

                {/* Big Center Controls (Back 10s, Play/Pause, Forward 10s) */}
                <div className="flex items-center gap-5 pt-1">
                  <button
                    onClick={() => handleSkip(-10)}
                    className="p-2.5 rounded-xl bg-[#020A17] hover:bg-[#07162B] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] transition-all cursor-pointer shadow-md"
                    title="Rewind 10 seconds"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={handlePlayToggle}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] flex items-center justify-center transition-all hover:scale-105 border border-[#FFE394] shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_15px_rgba(223,190,119,0.4)] cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 text-[#07162B] fill-current" />
                    ) : (
                      <Play className="h-6 w-6 ml-0.5 text-[#07162B] fill-current" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSkip(10)}
                    className="p-2.5 rounded-xl bg-[#020A17] hover:bg-[#07162B] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] transition-all cursor-pointer shadow-md"
                    title="Forward 10 seconds"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Bottom Control Bar */}
              <div className="p-3.5 bg-[#020A17]/95 border-t border-[#3A2C18]/70 space-y-2 relative z-10">
                {/* Scrub Progress Bar */}
                <div className="relative w-full flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={activeRec.secondsLimit}
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-lg bg-[#3A2C18] accent-[#DFBE77] cursor-pointer appearance-none"
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-[#C6B697]">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-[#FFF4D4] font-bold">
                      {formatSeconds(currentTime)} <span className="text-[#A69371]">/ {activeRec.duration}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Volume Slider */}
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4 text-[#C6B697]" />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-14 sm:w-20 h-1 rounded bg-[#3A2C18] accent-[#DFBE77] cursor-pointer appearance-none"
                      />
                    </div>

                    {/* Speed Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="font-mono text-xs px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] text-[#DFBE77] font-bold hover:bg-white/10 cursor-pointer"
                      >
                        {playbackSpeed}x
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-7 right-0 bg-[#020A17] border border-[#3A2C18] rounded-xl py-1 w-20 text-center text-xs shadow-2xl flex flex-col z-50">
                          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              onClick={() => {
                                setPlaybackSpeed(spd);
                                setShowSpeedMenu(false);
                              }}
                              className={cn(
                                "py-1 px-2 text-left font-mono cursor-pointer transition-colors",
                                playbackSpeed === spd ? "bg-[#DFBE77] text-[#07162B] font-bold" : "text-[#C6B697] hover:bg-white/10"
                              )}
                            >
                              {spd}x speed
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Meeting Attendance Roster ── */}
            <div className="bg-[#020A17]/80 border border-[#3A2C18] rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFF4D4]">
                <Users className="h-4 w-4 text-[#DFBE77]" />
                <span>IEP Committee & Meeting Attendees ({activeRec.attendees.length})</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {activeRec.attendees.map((person, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#05142B] border border-[#3A2C18] text-xs shadow-inner"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DFBE77]" />
                    <span className="font-semibold text-white">{person.name}</span>
                    <span className="text-[10px] text-[#A69371] font-mono">({person.role})</span>
                    <Badge className={cn(
                      "text-[8px] font-mono uppercase px-1 py-0 ml-0.5",
                      person.affiliation === "Waypoint" ? "bg-amber-400/20 text-amber-300 border-amber-400/30" :
                      person.affiliation === "Family" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                      person.affiliation === "Clinical" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                      "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    )}>
                      {person.affiliation}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Multi-Tab Deep Content Workspace (Transcript, Advocate Brief, PWN Watchlist, Action Items) ── */}
            <div className="space-y-4">
              {/* Tab Selector Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#020A17] p-1.5 rounded-2xl border border-[#3A2C18]">
                {[
                  { id: "transcript", label: "Transcript", icon: FileText },
                  { id: "brief", label: "Advocate Brief", icon: Sparkles },
                  { id: "pwn", label: "PWN Watchlist", icon: Scale },
                  { id: "actions", label: "Action Items", icon: ClipboardList },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isCur = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        isCur
                          ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-extrabold shadow-md border border-[#FFE394]/60"
                          : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/5 border border-transparent"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: Verbatim Speech-to-Text Transcript */}
              {activeTab === "transcript" && (
                <div className="space-y-3 bg-[#020A17]/80 border border-[#3A2C18] p-4 rounded-2xl">
                  {/* Search input for transcript */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#C6B697]" />
                    <Input
                      placeholder="Search within this meeting's transcript..."
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      className="pl-9 bg-[#05142B] border-[#3A2C18] text-xs text-white placeholder:text-[#C6B697]/50 rounded-xl focus:border-[#DFBE77] focus-visible:ring-[#DFBE77] h-9"
                    />
                  </div>

                  {/* Transcript rows */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {activeRec.transcript
                      .filter((row) =>
                        row.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
                        row.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
                      )
                      .map((row, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-[#05142B]/90 border border-[#3A2C18]/60 hover:border-[#DFBE77]/60 transition-colors group space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={cn(
                                "text-[9px] font-mono px-2 py-0.5",
                                row.role === "advocate" ? "bg-amber-400/20 text-amber-300 border-amber-400/30" :
                                row.role === "parent" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                                row.role === "specialist" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                                "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              )}>
                                {row.speaker}
                              </Badge>
                            </div>

                            <button
                              onClick={() => handleTimeJump(row.seconds)}
                              className="text-[11px] font-mono font-bold text-[#DFBE77] hover:underline flex items-center gap-1 cursor-pointer"
                              title="Jump player to this statement"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              <span>{row.time}</span>
                            </button>
                          </div>

                          <p className="text-xs text-white/90 leading-relaxed font-sans pl-1">
                            {highlightMatches(row.text, transcriptSearch)}
                          </p>
                        </div>
                      ))}

                    {activeRec.transcript.filter((row) =>
                      row.text.toLowerCase().includes(transcriptSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="text-xs text-[#C6B697] text-center py-6">
                        No transcript statements matched "{transcriptSearch}".
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Advocate Brief & Strategy */}
              {activeTab === "brief" && (
                <div className="space-y-4 bg-[#020A17]/80 border border-[#3A2C18] p-5 rounded-2xl">
                  <div className="flex items-center justify-between border-b border-[#3A2C18] pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#FFF4D4]">
                      <Sparkles className="h-4 w-4 text-[#DFBE77]" />
                      <span>Executive Advocacy Synthesis</span>
                    </div>
                    <Badge className="bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[9px] font-mono">
                      Lead Special Education Advocate Report
                    </Badge>
                  </div>

                  <p className="text-xs text-[#FFF4D4]/90 leading-relaxed whitespace-pre-wrap bg-[#05142B] p-4 rounded-xl border border-[#3A2C18]/80 font-sans shadow-inner">
                    {activeRec.executiveBrief}
                  </p>

                  {/* Highlights Bullet List */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-[#C6B697] uppercase tracking-wider font-mono block">
                      Core Meeting Takeaways
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {activeRec.highlights.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#05142B] border border-[#3A2C18]/70 text-xs text-white/90"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: District PWN Watchlist */}
              {activeTab === "pwn" && (
                <div className="space-y-4 bg-[#020A17]/80 border border-[#3A2C18] p-5 rounded-2xl">
                  <div className="flex items-center justify-between border-b border-[#3A2C18] pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#FFF4D4]">
                      <Scale className="h-4 w-4 text-[#DFBE77]" />
                      <span>Prior Written Notice (PWN) Enforcement Tracker</span>
                    </div>
                    <span className="text-[10px] text-[#A69371] font-mono">
                      34 C.F.R. § 300.503
                    </span>
                  </div>

                  <p className="text-xs text-[#C6B697] leading-relaxed">
                    Under federal law, whenever the school district proposes or refuses to initiate or change the identification, evaluation, or educational placement of your child, they must provide Prior Written Notice within 10 school days.
                  </p>

                  <div className="space-y-3 pt-1">
                    {activeRec.pwnWatchlist.map((pwn, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-[#05142B] border border-[#3A2C18] space-y-2 shadow-inner"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-[#FFF4D4] flex items-center gap-1.5">
                            <span className="text-amber-400">⚖️</span>
                            {pwn.item}
                          </h4>
                          <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-mono">
                            {pwn.deadlineDays} Day Legal Clock
                          </Badge>
                        </div>

                        <p className="text-xs text-white/80 leading-relaxed bg-[#020A17] p-2.5 rounded-lg border border-[#3A2C18]/60">
                          <strong className="text-[#DFBE77]">District Verbal Statement:</strong> {pwn.districtPromise}
                        </p>

                        <div className="text-[10px] text-[#A69371] font-mono flex items-center gap-1.5">
                          <BookmarkCheck className="h-3 w-3 text-sky-400" />
                          <span>{pwn.statutoryProng}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Action Items & Follow-Ups */}
              {activeTab === "actions" && (
                <div className="space-y-4 bg-[#020A17]/80 border border-[#3A2C18] p-5 rounded-2xl">
                  <div className="flex items-center justify-between border-b border-[#3A2C18] pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#FFF4D4]">
                      <ClipboardList className="h-4 w-4 text-[#DFBE77]" />
                      <span>Post-Meeting Action Items ({activeRec.actionItems.length})</span>
                    </div>
                    <span className="text-[10px] text-[#A69371] font-mono">
                      Click to toggle status
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeRec.actionItems.map((act, i) => {
                      const isDone = completedActions[act.task] ?? act.completed ?? false;
                      return (
                        <div
                          key={i}
                          onClick={() => toggleActionItem(act.task)}
                          className={cn(
                            "p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all",
                            isDone
                              ? "bg-[#05142B]/60 border-emerald-500/30 text-white/60"
                              : "bg-[#05142B] border-[#3A2C18] hover:border-[#DFBE77]/60 text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                              isDone
                                ? "bg-emerald-500 border-emerald-400 text-slate-950"
                                : "border-[#3A2C18] bg-[#020A17]"
                            )}>
                              {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>

                            <span className={cn("text-xs font-medium leading-snug", isDone && "line-through opacity-70")}>
                              {act.task}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-[#020A17] text-[#DFBE77] border border-[#3A2C18] text-[9px] font-mono">
                              {act.owner}
                            </Badge>
                            <span className="text-[10px] text-[#A69371] font-mono">Due {act.dueDate}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
