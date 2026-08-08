import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wand2, Search, Star, Calendar, Video, FileText, CheckCircle2, Play, Lock,
  PenTool, ShieldCheck, Target, Puzzle, LineChart, Compass, Sparkles,
  ArrowLeft, GitCompare, Loader2, ArrowRight
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

  // Tools configuration
  const toolsList = [
    {
      id: "iep-comparison",
      title: "IEP Comparison",
      description: "Compare IEPs side-by-side and instantly see what changed. Highlighted differences, connected insights, and advocacy notes keep you prepared.",
      btnText: "Open Comparison",
      disabled: false,
      featured: true,
      onClick: () => {
        setIsComparisonOpen(true);
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950/40 border-b border-white/5 group">
          {/* Featured Badge */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#5F35E1]/30 text-indigo-200 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider shadow-sm">
            <Star className="h-3 w-3 fill-indigo-400 text-indigo-400" />
            Featured
          </div>
          
          <div className="flex items-center gap-12 relative z-10 w-full max-w-[260px] justify-center">
            {/* Left Doc */}
            <div className="relative w-[92px] h-[120px] bg-[#0A101E]/95 border border-[#3A4574] rounded-xl p-3 flex flex-col justify-between shadow-lg shadow-black/45">
              <div className="space-y-2">
                {/* Header Line */}
                <div className="h-1.5 w-14 bg-[#3E4A7D] rounded-sm" />
                
                {/* Body lines */}
                <div className="h-1 w-10 bg-[#252E56] rounded-sm" />
                
                {/* Highlighted Line */}
                <div className="h-2 w-16 bg-[#E07D1E]/20 border border-[#E07D1E]/55 rounded-sm shadow-[0_0_8px_rgba(224,125,30,0.3)]" />
                
                <div className="h-1 w-14 bg-[#252E56] rounded-sm" />
                <div className="h-1 w-12 bg-[#252E56] rounded-sm" />
              </div>
              <div className="h-1.5 w-6 bg-[#252E56] rounded-sm" />
              
              {/* Connector Node */}
              <div className="absolute right-[-4px] top-[50%] -translate-y-1/2 w-2 h-2 rounded-full bg-[#818CF8] border border-white/40 shadow-[0_0_6px_#818CF8]" />
            </div>

            {/* SVG Bezier Connector Line */}
            <svg className="absolute w-[52px] h-[30px] z-0 overflow-visible pointer-events-none" style={{ left: '102px', top: '78px' }}>
              <defs>
                <linearGradient id="svg-connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818CF8" />
                  <stop offset="100%" stopColor="#2DD4BF" />
                </linearGradient>
              </defs>
              <path d="M 0,0 C 20,0 28,15 48,15" fill="none" stroke="url(#svg-connector-gradient)" strokeWidth="1.5" />
            </svg>

            {/* Right Doc */}
            <div className="relative w-[92px] h-[120px] bg-[#0A101E]/95 border border-[#23585F] rounded-xl p-3 flex flex-col justify-between shadow-lg shadow-black/45">
              <div className="space-y-2">
                {/* Header Line */}
                <div className="h-1.5 w-14 bg-[#264D4B] rounded-sm" />
                
                {/* Body lines with fake bullets */}
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-[#18393A]" />
                  <div className="h-1 w-10 bg-[#1A313C] rounded-sm" />
                </div>
                
                {/* Highlighted Line */}
                <div className="h-2 w-16 bg-[#2DD4BF]/15 border border-[#2DD4BF]/50 rounded-sm shadow-[0_0_8px_rgba(45,212,191,0.25)]" />
                
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-[#18393A]" />
                  <div className="h-1 w-12 bg-[#1A313C] rounded-sm" />
                </div>
              </div>
              <div className="h-1.5 w-6 bg-[#1A313C] rounded-sm" />
              
              {/* Connector Node */}
              <div className="absolute left-[-4px] top-[62%] -translate-y-1/2 w-2 h-2 rounded-full bg-[#2DD4BF] border border-white/40 shadow-[0_0_6px_#2DD4BF]" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: "timeline-builder",
      title: "Timeline Builder",
      description: "Visualize your child's journey. See meetings, evaluations, services, and milestones in chronological order.",
      btnText: "View Timeline",
      disabled: false,
      onClick: () => {
        import("sonner").then(({ toast }) =>
          toast.info("Timeline Builder tool is coming soon!")
        );
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950/40 border-b border-white/5">
          <div className="relative w-full max-w-[260px] flex items-center justify-between">
            {/* Horizontal timeline track line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-[#6366F1]/50 via-[#06B6D4]/50 to-[#10B981]/50" />
            
            {/* Timeline node circle gradient indicators */}
            <div className="relative z-10 w-10 h-10 rounded-full bg-[#0A101E]/90 border border-[#6366F1]/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10 hover:scale-110 transition-transform">
              <Calendar className="h-4 w-4" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#6366F1]" />
            </div>

            <div className="relative z-10 w-10 h-10 rounded-full bg-[#0A101E]/90 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-lg shadow-indigo-500/10 hover:scale-110 transition-transform">
              <Video className="h-4 w-4" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-400" />
            </div>

            <div className="relative z-10 w-10 h-10 rounded-full bg-[#0A101E]/90 border border-[#06B6D4]/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 hover:scale-110 transition-transform">
              <FileText className="h-4 w-4" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#06B6D4]" />
            </div>

            <div className="relative z-10 w-10 h-10 rounded-full bg-[#0A101E]/90 border border-[#10B981]/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#10B981]" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: "meeting-analyzer",
      title: "Meeting Analyzer",
      description: "Search transcripts, find key moments, and get AI highlights and takeaways from your recorded meetings.",
      btnText: "Explore Meetings",
      disabled: false,
      onClick: () => {
        if (contactId) {
          setLocation(`/contacts/${contactId}?tab=voyage-log`);
        } else {
          import("sonner").then(({ toast }) =>
            toast.info("Select a student from the Projects/Students list to open their Meeting Analyzer.")
          );
        }
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-between bg-slate-950/40 border-b border-white/5 px-6 gap-4">
          {/* Miniature Video Player frame */}
          <div className="w-[125px] h-[80px] rounded-lg bg-slate-900 border border-white/10 relative overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg shadow-black/40 group">
            <div className="absolute inset-0 bg-cover bg-center opacity-75" style={{ backgroundImage: "url('/compass-bg.jpg')" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/15 to-transparent" />
            <Play className="h-8 w-8 text-white relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform" />
          </div>
          {/* Transcript tracking card snippet */}
          <div className="flex-1 min-w-0 space-y-2 bg-[#0A101E]/80 border border-white/5 rounded-lg p-2.5 shadow-md">
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 rounded px-2 py-1">
              <Search className="h-3 w-3 text-slate-400" />
              <div className="h-1.5 w-16 bg-slate-700 rounded-sm" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] text-slate-400">
                <span>14:31</span>
                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-400">
                <span>27:55</span>
                <div className="w-16 h-1.5 bg-slate-800 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "iep-tracker",
      title: "IEP Review Tracker",
      description: "Track every section of the IEP. Add notes, set status, and ensure nothing gets missed.",
      btnText: "Review Sections",
      disabled: false,
      onClick: () => {
        import("sonner").then(({ toast }) =>
          toast.info("IEP Review Tracker is coming soon!")
        );
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-between bg-slate-950/40 border-b border-white/5 px-6 gap-4">
          {/* Status indicators */}
          <div className="w-[110px] space-y-1.5 flex-shrink-0">
            <div className="flex items-center gap-2 text-[10px] text-slate-350 bg-[#0A101E]/90 border border-white/5 px-2 py-1 rounded-md shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_#3b82f6]" />
              <span>Discussed</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-350 bg-[#0A101E]/90 border border-white/5 px-2 py-1 rounded-md shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-350 bg-[#0A101E]/90 border border-white/5 px-2 py-1 rounded-md shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_#f43f5e]" />
              <span>Declined</span>
            </div>
          </div>
          {/* Document Section mock info card */}
          <div className="flex-1 bg-[#0A101E]/95 border border-white/10 rounded-lg p-2.5 shadow-lg h-[86px] flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-indigo-300 block">Notes</span>
              <div className="h-1 w-20 bg-slate-700 rounded-sm" />
              <div className="h-1 w-16 bg-slate-800 rounded-sm" />
            </div>
            <div className="h-1 w-12 bg-slate-800 rounded-sm self-end" />
          </div>
        </div>
      )
    },
    {
      id: "document-vault",
      title: "Secure Document Vault",
      description: "Store, organize, and access all your important documents in one secure place.",
      btnText: "View Documents",
      disabled: false,
      onClick: () => {
        if (contactId) {
          setLocation(`/contacts/${contactId}?tab=files`);
        } else {
          setLocation(`/smart-files`);
        }
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950/40 border-b border-white/5 gap-6">
          <div className="relative group">
            {/* Glowing lock badge overlay */}
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 flex items-center justify-center z-10 shadow-lg backdrop-blur-xs">
              <Lock className="h-2.5 w-2.5" />
            </div>
            {/* Folder frame */}
            <div className="w-16 h-12 bg-indigo-950/50 border border-indigo-500/30 rounded-lg flex items-end justify-center shadow-lg group-hover:scale-105 transition-all">
              <div className="w-12 h-1.5 bg-indigo-500/30 rounded-t-sm mb-2" />
            </div>
          </div>
          {/* File grid rows */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">PDF</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">DOCX</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">PNG</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">MP4</span>
          </div>
        </div>
      )
    },
    {
      id: "advocacy-assistant",
      title: "Advocacy Assistant",
      description: "Get AI-powered insights, questions to ask, and personalized recommendations for your child.",
      btnText: "Ask Assistant",
      disabled: false,
      onClick: () => {
        setLocation(`/ai-connections`);
      },
      preview: (
        <div className="relative w-full h-full flex items-center justify-between bg-slate-950/40 border-b border-white/5 px-6 gap-6">
          {/* AI Sphere indicator */}
          <div className="w-18 h-18 rounded-full border border-indigo-500/25 flex items-center justify-center relative flex-shrink-0 shadow-lg shadow-indigo-500/5">
            <div className="absolute inset-2 rounded-full border border-indigo-500/40 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-[11px] font-black text-slate-950 shadow-md">AI</div>
          </div>
          {/* AI action list tracker */}
          <div className="flex-1 space-y-2 bg-[#0A101E]/80 border border-white/5 rounded-lg p-2.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <div className="h-1.5 w-20 bg-slate-700 rounded-sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <div className="h-1.5 w-24 bg-slate-800 rounded-sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-450 shrink-0" />
              <div className="h-1.5 w-16 bg-slate-800 rounded-sm" />
            </div>
          </div>
        </div>
      )
    }
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
    <div className="min-h-screen bg-background text-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-10">
        {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/25 shadow-md shadow-indigo-500/5">
            <Wand2 className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">Tools</h1>
              {contactId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/contacts/${contactId}`)}
                  className="inline-flex items-center gap-1 text-[11px] h-7 py-1 border-white/10 hover:bg-white/5 text-slate-300"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to Student
                </Button>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Powerful tools to help you prepare, compare, and advocate with confidence.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Student Context Banner */}
      {contactId && (
        <div className="rounded-xl border border-white/5 bg-slate-900/30 px-5 py-3 flex items-center gap-3">
          <FileText className="h-4 w-4 text-indigo-400 flex-shrink-0" />
          {isLoading ? (
            <span className="text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading student details...
            </span>
          ) : contact ? (
            <span className="text-sm text-slate-200">
              Active Session Student:{" "}
              <span className="font-semibold text-white">
                {(contact as any).contact?.firstName ?? (contact as any).firstName}{" "}
                {(contact as any).contact?.lastName ?? (contact as any).lastName}
              </span>
            </span>
          ) : (
            <span className="text-sm text-slate-400">Student #{contactId}</span>
          )}
        </div>
      )}

      {/* Main Grid Section (3 Columns on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
        {filteredTools.map((tool) => (
          <div 
            key={tool.id} 
            className={`flex flex-col bg-[#07162B]/40 border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/2 transition-all group max-w-sm mx-auto w-full ${
              tool.featured ? "ring-1 ring-indigo-500/20" : ""
            }`}
          >
            {/* Visual Preview Illustration block */}
            <div className="h-44 sm:h-48 w-full flex-shrink-0">
              {tool.preview}
            </div>

            {/* Card Body */}
            <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-serif text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="text-left pt-1">
                <Button
                  size="sm"
                  onClick={tool.onClick}
                  disabled={tool.disabled}
                  className={`w-auto inline-flex bg-slate-900/60 hover:bg-indigo-650/10 text-slate-350 hover:text-white border border-white/10 rounded-lg px-4 py-1.5 items-center gap-1.5 text-xs font-bold tracking-wide transition-all ${
                    tool.disabled ? "opacity-35 cursor-not-allowed border-white/5" : "hover:border-indigo-500/35 hover:shadow-sm"
                  }`}
                >
                  {tool.btnText}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tools Row */}
      <div className="space-y-4 pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Quick Tools
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {filteredQuickTools.map((qt) => {
            const Icon = qt.icon;
            return (
              <Card
                key={qt.title}
                onClick={qt.onClick}
                className="flex items-center justify-between p-4 bg-[#07162B]/30 border-white/5 rounded-xl hover:border-indigo-500/20 hover:bg-[#07162B]/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {qt.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      {qt.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bottom Callout Banner */}
      <div className="pt-4">
        <div className="relative rounded-2xl border border-indigo-500/10 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
          
          <div className="flex items-start md:items-center gap-4 relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Compass className="h-6 w-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Everything you need. All in one place.</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg text-xs shadow-md shadow-indigo-600/10 flex items-center gap-2 transition-all hover:scale-102"
            >
              <Sparkles className="h-3.5 w-3.5" />
              See What's New
            </Button>
          </div>
        </div>
      </div>

      {/* IEP Comparison Modal */}
      {isComparisonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#07162B] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col p-6 space-y-6 relative shadow-2xl text-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold font-serif text-white">IEP / 504 Comparison Analyzer</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload a previous version and a current version to run a side-by-side comparison.
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsComparisonOpen(false);
                  setIsAnalyzing(false);
                  setAnalysisResult(false);
                }}
                className="text-slate-400 hover:text-white text-xs bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/5 transition-all"
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
                  <div className="border border-dashed border-white/10 rounded-xl p-5 bg-slate-900/40 flex flex-col items-center justify-center text-center space-y-3 min-h-[140px] relative">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Previous IEP Version</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] mx-auto truncate">
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
                        className="text-[10px] text-rose-450 hover:underline relative z-25 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Current Version */}
                  <div className="border border-dashed border-white/10 rounded-xl p-5 bg-slate-900/40 flex flex-col items-center justify-center text-center space-y-3 min-h-[140px] relative">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Current IEP Version</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] mx-auto truncate">
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
                        className="text-[10px] text-rose-455 hover:underline relative z-25 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Analysis Info */}
                <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-4 flex gap-3 text-left">
                  <Compass className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-indigo-300">Waypoint AI Comparison Engine</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
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
                    className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-md"
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
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-450">
                    <CheckCircle2 className="h-4 w-4" />
                    AI Comparison Completed Successfully!
                  </div>
                  <button 
                    onClick={() => setAnalysisResult(false)}
                    className="text-xs text-indigo-300 hover:underline"
                  >
                    Compare other files
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Changes Summary</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 text-center">
                      <span className="text-lg font-bold text-emerald-400">3</span>
                      <span className="text-[10px] text-slate-450 block mt-0.5">Additions</span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 text-center">
                      <span className="text-lg font-bold text-rose-450">1</span>
                      <span className="text-[10px] text-slate-450 block mt-0.5">Deletions</span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 text-center">
                      <span className="text-lg font-bold text-amber-400">2</span>
                      <span className="text-[10px] text-slate-450 block mt-0.5">Modifications</span>
                    </div>
                  </div>
                </div>

                {/* Diff Preview Rows */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Variance Analysis</h4>
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {/* Diff 1 */}
                    <div className="border border-white/5 bg-slate-900/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Accommodation Added</span>
                        <span className="text-[9px] text-slate-500">Page 4 · Section IV</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        "Student will receive extra time (double time) on all math quizzes, exams, and standardized testing assessments."
                      </p>
                    </div>

                    {/* Diff 2 */}
                    <div className="border border-white/5 bg-slate-900/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-450 border border-rose-500/20">Service Reduced</span>
                        <span className="text-[9px] text-slate-500">Page 7 · Section VII</span>
                      </div>
                      <p className="text-xs text-slate-350 leading-relaxed line-through">
                        "Occupational therapy group sessions: 60 minutes per week."
                      </p>
                      <p className="text-xs text-emerald-400 leading-relaxed font-semibold">
                        + "Occupational therapy individual sessions: 30 minutes per week."
                      </p>
                    </div>

                    {/* Diff 3 */}
                    <div className="border border-white/5 bg-slate-900/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold font-serif">Goal Modified</span>
                        <span className="text-[9px] text-slate-500">Page 11 · Section IX</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
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
    </div>
  </div>
);
}
