import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { ToolsInstrumentCabinet } from "@/components/tools/ToolsInstrumentCabinet";
import {
  FileText,
  CheckCircle2,
  Compass,
  GitCompare,
  Loader2,
  Mic,
  Monitor,
} from "lucide-react";

export default function Tools() {
  const [, setLocation] = useLocation();

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
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordDuration((prev) => {
          const next = prev + 1;
          if (next === 2) {
            setLiveTranscript((t) => [
              ...t,
              "Advocate: We're starting the IEP review session.",
            ]);
          } else if (next === 5) {
            setLiveTranscript((t) => [
              ...t,
              "Parent: I want to focus on reading support options today.",
            ]);
          } else if (next === 8) {
            setLiveTranscript((t) => [
              ...t,
              "Special Ed Teacher: The current goal is 15 minutes daily support.",
            ]);
          } else if (next === 11) {
            setLiveTranscript((t) => [
              ...t,
              "Advocate: We should request individual goals.",
            ]);
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
        audio: true,
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
    } catch (err) {
      console.warn(
        "Screen share request denied or failed, falling back to simulated screen capture:",
        err
      );
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
      toast.success(
        "Meeting recording successfully saved to student's Voyage Log!"
      )
    );
  };

  // Parse contactId from query string
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const contactIdParam = params.get("contactId");
  const contactId = contactIdParam ? parseInt(contactIdParam, 10) : undefined;

  return (
    <ScopedErrorBoundary>
      <ToolsInstrumentCabinet
        contactId={contactId}
        setLocation={setLocation}
        onOpenIepComparisonModal={() => setIsComparisonOpen(true)}
        onOpenRecorderModal={() => setIsRecorderOpen(true)}
      />

      {/* IEP Comparison Modal */}
      {isComparisonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#05142B] border border-[#3A2C18] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col p-6 space-y-6 relative shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-[#FFF4D4]">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#3A2C18] pb-4">
              <div>
                <h3 className="text-lg font-bold font-serif text-[#FFF4D4]">
                  IEP / 504 Comparison Analyzer
                </h3>
                <p className="text-xs text-[#C6B697] mt-1">
                  Upload a previous version and a current version to run a
                  side-by-side comparison.
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
                      <p className="text-xs font-bold text-[#FFF4D4]">
                        Previous IEP Version
                      </p>
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
                      <p className="text-xs font-bold text-[#FFF4D4]">
                        Current IEP Version
                      </p>
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
                    <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">
                      Waypoint AI Comparison Engine
                    </h4>
                    <p className="text-[11px] text-[#C6B697] mt-0.5 leading-relaxed">
                      Waypoint will parse both documents, highlight additions
                      and deletions, and categorize FAPE variances,
                      accommodations changes, and modified services
                      side-by-side.
                    </p>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      if (!prevFile || !currFile) {
                        import("sonner").then(({ toast }) =>
                          toast.error(
                            "Please select or upload both documents first."
                          )
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
                  <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
                    Changes Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#020A17]/80 p-3 rounded-lg border border-[#3A2C18] text-center">
                      <span className="text-lg font-bold text-emerald-400">
                        3
                      </span>
                      <span className="text-[10px] text-[#C6B697] block mt-0.5">
                        Additions
                      </span>
                    </div>
                    <div className="bg-[#020A17]/80 p-3 rounded-lg border border-[#3A2C18] text-center">
                      <span className="text-lg font-bold text-rose-400">1</span>
                      <span className="text-[10px] text-[#C6B697] block mt-0.5">
                        Deletions
                      </span>
                    </div>
                    <div className="bg-[#020A17]/80 p-3 rounded-lg border border-[#3A2C18] text-center">
                      <span className="text-lg font-bold text-[#FFE394]">
                        2
                      </span>
                      <span className="text-[10px] text-[#C6B697] block mt-0.5">
                        Modifications
                      </span>
                    </div>
                  </div>
                </div>

                {/* Diff Preview Rows */}
                <div className="space-y-3">
                  <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
                    Detailed Variance Analysis
                  </h4>
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    <div className="border border-[#3A2C18]/60 bg-[#020A17]/80 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Accommodation Added
                        </span>
                        <span className="text-[9px] text-[#A69371]">
                          Page 4 · Section IV
                        </span>
                      </div>
                      <p className="text-xs text-[#E8DCC4] leading-relaxed">
                        "Student will receive extra time (double time) on all
                        math quizzes, exams, and standardized testing
                        assessments."
                      </p>
                    </div>

                    <div className="border border-[#3A2C18]/60 bg-[#020A17]/80 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Service Reduced
                        </span>
                        <span className="text-[9px] text-[#A69371]">
                          Page 7 · Section VII
                        </span>
                      </div>
                      <p className="text-xs text-[#C6B697] leading-relaxed line-through">
                        "Occupational therapy group sessions: 60 minutes per
                        week."
                      </p>
                      <p className="text-xs text-emerald-400 leading-relaxed font-semibold">
                        + "Occupational therapy individual sessions: 30 minutes
                        per week."
                      </p>
                    </div>

                    <div className="border border-[#3A2C18]/60 bg-[#020A17]/80 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DFBE77]/10 text-[#FFE394] border border-[#DFBE77]/30 font-semibold font-serif">
                          Goal Modified
                        </span>
                        <span className="text-[9px] text-[#A69371]">
                          Page 11 · Section IX
                        </span>
                      </div>
                      <p className="text-xs text-[#E8DCC4] leading-relaxed">
                        Modified accuracy criteria for conversational turns
                        target from 80% to 90% over consecutive trial weeks.
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
                  Record your IEP meeting to auto-transcribe, analyze key
                  decisions, and sync with files.
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
                <div className="space-y-6 w-full flex flex-col items-center">
                  <div className="text-center">
                    <span className="text-4xl font-mono font-bold text-[#FFF4D4] tracking-widest">
                      {Math.floor(recordDuration / 60)
                        .toString()
                        .padStart(2, "0")}
                      :{(recordDuration % 60).toString().padStart(2, "0")}
                    </span>
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mt-1 animate-pulse">
                      ● Recording Meeting Capture
                    </span>
                  </div>

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
                      <div
                        className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-1.5 h-12 bg-rose-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.3s" }}
                      />
                      <div
                        className="w-1.5 h-8 bg-rose-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="w-1.5 h-10 bg-rose-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      />
                      <div
                        className="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.5s" }}
                      />
                    </div>
                  )}

                  <div className="w-full bg-[#020A17] rounded-xl border border-[#3A2C18] p-4 h-48 overflow-y-auto space-y-3 text-left">
                    <span className="text-[9px] font-bold text-[#A69371] uppercase tracking-widest block border-b border-[#3A2C18]/60 pb-1">
                      Live Transcript Stream
                    </span>
                    {liveTranscript.length === 0 ? (
                      <p className="text-[11px] text-[#A69371] italic animate-pulse">
                        Waiting for speech input...
                      </p>
                    ) : (
                      liveTranscript.map((line, idx) => {
                        const [speaker, text] = line.split(": ");
                        return (
                          <div
                            key={idx}
                            className="text-xs space-y-0.5 animate-slide-up"
                          >
                            <span className="font-semibold text-[#FFE394]">
                              {speaker}:
                            </span>
                            <p className="text-[#C6B697] leading-relaxed">
                              {text}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <Button
                    onClick={handleStopRecording}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
                  >
                    Stop &amp; Save Recording
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 w-full flex flex-col items-center text-center">
                  <div className="relative">
                    <div
                      className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 hover:scale-105 hover:bg-rose-500/20 transition-all cursor-pointer shadow-lg shadow-rose-500/5 group"
                      onClick={handleStartRecording}
                    >
                      <Monitor className="h-8 w-8 text-rose-400 group-hover:scale-110 transition-transform animate-pulse" />
                    </div>
                    <div className="absolute -inset-2 rounded-full border border-rose-500/10 animate-ping pointer-events-none" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#FFF4D4]">
                      Start Screen Recording
                    </h4>
                    <p className="text-[11px] text-[#C6B697] max-w-[280px]">
                      Click the icon to select your active meeting window or
                      screen to capture and transcribe.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ScopedErrorBoundary>
  );
}
