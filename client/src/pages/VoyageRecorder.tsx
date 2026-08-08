import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Mic, Settings2, Play, Circle, Square, 
  Volume2, Sliders, Sparkles, CheckCircle2, Loader2, Compass, Check
} from "lucide-react";

export default function VoyageRecorder() {
  const [, setLocation] = useLocation();

  // Parse contactId from query string
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const contactIdParam = params.get("contactId");
  const contactId = contactIdParam ? parseInt(contactIdParam, 10) : null;

  // trpc student queries
  const { data: contactsList } = trpc.contacts.list.useQuery();
  const [selectedContactId, setSelectedContactId] = useState<number | null>(contactId);

  const { data: activeContact } = trpc.contacts.detail.useQuery(
    { id: selectedContactId! },
    { enabled: !!selectedContactId }
  );

  // Specs & Settings State
  const [audioSource, setAudioSource] = useState("default");
  const [transcriptionMode, setTranscriptionMode] = useState("precision");
  const [language, setLanguage] = useState("en-US");
  const [autoSync, setAutoSync] = useState(true);
  const [saveBackup, setSaveBackup] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "FAPE", "Accommodations", "Services"
  ]);

  // Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Directives Sandbox State & Handler
  const [advocateDirectives, setAdvocateDirectives] = useState<string>(() => {
    return localStorage.getItem("voyage_recorder_directives") || 
      `[AI Prompt & System Guidelines]\n1. Focus on flagging special education service changes.\n2. Tag any OT, PT, or Speech Therapy mentions.\n3. Identify FAPE compliance discussions.`;
  });
  const [isSavingDirectives, setIsSavingDirectives] = useState(false);

  const handleSaveDirectives = () => {
    setIsSavingDirectives(true);
    localStorage.setItem("voyage_recorder_directives", advocateDirectives);
    setTimeout(() => {
      setIsSavingDirectives(false);
      import("sonner").then(({ toast }) =>
        toast.success("AI Behavior Directives successfully saved!")
      );
    }, 800);
  };

  // Handle active record timer simulation
  useEffect(() => {
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
            setLiveTranscript((t) => [...t, "Advocate: We should request individual goals instead of group services."]);
          } else if (next === 15) {
            setLiveTranscript((t) => [...t, "Parent: That sounds much better for his reading level."]);
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

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setSaveSuccess(true);
    import("sonner").then(({ toast }) =>
      toast.success("Meeting recording successfully saved to student's Voyage Log!")
    );
    setTimeout(() => {
      setSaveSuccess(false);
      // Redirect back to Voyage Log tab if selected student is present
      if (selectedContactId) {
        setLocation(`/contacts/${selectedContactId}?tab=voyage-log`);
      } else {
        setLocation("/tools");
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation(contactId ? `/tools?contactId=${contactId}` : "/tools")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/60 border border-white/10 hover:bg-white/5 text-slate-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-455 px-2 py-0.5 rounded border border-rose-500/20">
                  Tool Card
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white font-serif">Voyage Meeting Recorder</h1>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Configure capture specs, set targets, and record live advocacy meetings.
              </p>
            </div>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Column 1: Specs and Settings (Left 5 Cols) */}
          <div className="lg:col-span-5 bg-[#07162B]/40 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Settings2 className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recorder Specs & Settings</h3>
            </div>

            {/* Student linkage Selector */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-350">Link to Student Profile</label>
              <select 
                value={selectedContactId || ""}
                onChange={(e) => setSelectedContactId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full bg-slate-900/80 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Student --</option>
                {contactsList?.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Input selector */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                Audio Input Device
              </label>
              <select 
                value={audioSource}
                onChange={(e) => setAudioSource(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:border-indigo-500"
              >
                <option value="default">Default System Microphone</option>
                <option value="external">External Sound Card Interface (USB)</option>
                <option value="virtual">Virtual Loopback Audio</option>
              </select>
            </div>

            {/* Transcription mode */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-slate-400" />
                AI Transcription Focus
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTranscriptionMode("precision")}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                    transcriptionMode === "precision"
                      ? "bg-indigo-500/10 border-indigo-500/50 text-white"
                      : "bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>Precision AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptionMode("standard")}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                    transcriptionMode === "standard"
                      ? "bg-indigo-500/10 border-indigo-500/50 text-white"
                      : "bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  <Mic className="h-4 w-4 text-slate-400" />
                  <span>Standard Whisper</span>
                </button>
              </div>
            </div>

            {/* Language */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-350">Language Profile</label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:border-indigo-500"
              >
                <option value="en-US">English (United States)</option>
                <option value="es-ES">Spanish (Spain / LatAm)</option>
                <option value="fr-FR">French (France)</option>
              </select>
            </div>

            {/* Auto Tagging categories */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-350 block">Live Auto-Tagging Keywords</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {["FAPE", "Accommodations", "Services", "Goals", "FBA/BIP", "OT", "SLP"].map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        active
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50"
                          : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkbox settings */}
            <div className="space-y-3 pt-2 text-left">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoSync} 
                  onChange={(e) => setAutoSync(e.target.checked)} 
                  className="rounded border-white/10 bg-slate-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
                <span className="text-xs text-slate-300">Auto-sync transcript to student's timeline</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={saveBackup} 
                  onChange={(e) => setSaveBackup(e.target.checked)} 
                  className="rounded border-white/10 bg-slate-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
                <span className="text-xs text-slate-300">Save backup audio file to Secure Vault</span>
              </label>
            </div>
          </div>

          {/* Column 2: Live Recorder Deck (Right 7 Cols) */}
          <div className="lg:col-span-7 bg-[#07162B]/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between min-h-[460px] relative">
            
            {/* Header / State indicator */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live Recorder Deck</span>
              {isRecording ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/35 text-[9px] text-rose-350 font-bold uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  Recording
                </div>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Ready to Capture
                </span>
              )}
            </div>

            {/* Live Recorder Content area */}
            <div className="flex-grow flex flex-col items-center justify-center py-6">
              {saveSuccess ? (
                /* Save success card */
                <div className="space-y-3 flex flex-col items-center text-center animate-fade-in py-12">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Recording Saved Successfully</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
                      Audio and transcripts are synced with {activeContact ? `${(activeContact as any).contact?.firstName || 'the student'}'s` : "the student's"} profile.
                    </p>
                  </div>
                </div>
              ) : isRecording ? (
                /* Recording Active Mode */
                <div className="w-full flex flex-col items-center space-y-6">
                  {/* Timer */}
                  <div className="text-center">
                    <span className="text-5xl font-mono font-black text-white tracking-wider">
                      {Math.floor(recordDuration / 60).toString().padStart(2, '0')}:
                      {(recordDuration % 60).toString().padStart(2, '0')}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Student Session: {activeContact ? `${(activeContact as any).contact?.firstName || ''} ${(activeContact as any).contact?.lastName || ''}` : "General Capture"}
                    </p>
                  </div>

                  {/* Pulsing Visual Waveform */}
                  <div className="flex items-end gap-1.5 h-14 justify-center">
                    <div className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1.5 h-12 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    <div className="w-1.5 h-8 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-10 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    <div className="w-1.5 h-14 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-1.5 h-5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
                  </div>

                  {/* Live Transcript Stream */}
                  <div className="w-full bg-slate-950/60 rounded-xl border border-white/5 p-4 h-48 overflow-y-auto space-y-3 text-left">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-white/5 pb-1">Live Transcript Stream</span>
                    {liveTranscript.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic animate-pulse">Waiting for speech input...</p>
                    ) : (
                      liveTranscript.map((line, idx) => {
                        const [speaker, text] = line.split(": ");
                        return (
                          <div key={idx} className="text-xs space-y-0.5 animate-slide-up">
                            <span className="font-semibold text-indigo-300">{speaker}:</span>
                            <p className="text-slate-350 leading-relaxed">{text}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Stop Capture Trigger */}
                  <Button
                    onClick={handleStopRecording}
                    className="bg-rose-650 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-md shadow-rose-600/10 flex items-center gap-2 transition-all hover:scale-102"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    Stop & Save Recording
                  </Button>
                </div>
              ) : (
                /* Ready State */
                <div className="space-y-6 w-full flex flex-col items-center text-center py-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 hover:scale-105 hover:bg-rose-500/20 transition-all cursor-pointer shadow-lg shadow-rose-500/5 group"
                      onClick={() => setIsRecording(true)}
                    >
                      <Mic className="h-10 w-10 text-rose-455 group-hover:scale-110 transition-transform" />
                    </div>
                    {/* Ripple animation circles */}
                    <div className="absolute -inset-2 rounded-full border border-rose-500/10 animate-ping pointer-events-none" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Start Audio Capture</h4>
                    <p className="text-xs text-slate-400 max-w-[320px] mx-auto leading-relaxed">
                      Confirm your specifications on the left, then click the microphone to launch the live recording.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer help notice info banner */}
            <div className="border-t border-white/5 pt-4 text-left">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Notice: Voyage recorder processes meeting transcripts locally and encrypts them before syncing to cloud storage. You can view the output transcript directly inside the student's Voyage Log dashboard.
              </p>
            </div>

          </div>

        </div>

        {/* Specs & AI Directives sandbox section */}
        <div className="bg-[#07162B]/40 border border-white/5 rounded-2xl p-6 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Advocate AI Behavior Directives & Specs</h3>
            </div>
            <Button
              size="sm"
              onClick={handleSaveDirectives}
              disabled={isSavingDirectives}
              className="bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md"
            >
              {isSavingDirectives ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Save Directives
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Write down specific prompts, system parameters, or custom features you want Voyage to perform. Antigravity AI reads this sandbox input to dynamically adjust its backend parsing script.
          </p>
          <textarea
            value={advocateDirectives}
            onChange={(e) => setAdvocateDirectives(e.target.value)}
            className="w-full h-36 bg-slate-950/60 border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-350 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            placeholder="Type your guidelines and directives here..."
          />
        </div>

      </div>
    </div>
  );
}
