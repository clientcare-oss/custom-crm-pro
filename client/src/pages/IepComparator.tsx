import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText, ArrowLeft, GitCompare, Loader2, Sparkles, Star, CheckCircle2,
  AlertTriangle, Filter, Search, BookOpen, Printer, Download, Share2,
  Trash2, Plus, Info, RefreshCw, Layers, Check, X, ShieldAlert, AlertCircle,
  HelpCircle, ChevronRight, MessageSquare
} from "lucide-react";

// ============ STRUCTURAL DATA STRUCTURE FOR IEP COMPARISON ============
interface ComparisonItem {
  id: string;
  category: "admin" | "eligibility" | "plaafp" | "concerns" | "goals" | "accommodations" | "services" | "related" | "behavior" | "placement";
  categoryLabel: string;
  title: string;
  previousValue: string;
  newValue: string;
  status: "added" | "removed" | "modified" | "unchanged" | "reworded" | "needs_review";
  severity: "informational" | "review" | "high_attention";
  explanation: string;
  suggestedQuestion: string;
  previousLocation?: string;
  newLocation?: string;
  userNote?: string;
  isReviewed?: boolean;
  isStarred?: boolean;
  numericDiff?: string;
}

// Pre-loaded case study matching screenshot and specifications
const MICHAEL_SHEEP_COMPARISON: ComparisonItem[] = [
  {
    id: "comp-1",
    category: "goals",
    categoryLabel: "Annual Goals",
    title: "Reading Comprehension Goal",
    previousValue: "By May 3, 2027, Michael will improve reading comprehension by answering literal and inferential questions with 70% accuracy across three consecutive data probes. (Measurement: Curriculum-based assessments and teacher data, Frequency: Weekly, Setting: Small group, Criteria: 70% accuracy)",
    newValue: "By May 14, 2027, Michael will improve reading comprehension by answering literal and inferential questions with 80% accuracy across three consecutive data probes. (Measurement: Curriculum-based assessments and teacher data, Frequency: Weekly, Setting: Small group, Criteria: 80% accuracy)",
    status: "modified",
    severity: "review",
    explanation: "The target accuracy criterion increased from 70% to 80% with the timeline extended by 11 days. The skill focus and evaluation methods remain unchanged.",
    suggestedQuestion: "What baseline progress data supported raising the target accuracy threshold to 80%?",
    previousLocation: "Page 9 · Section V",
    newLocation: "Page 8 · Section V"
  },
  {
    id: "comp-2",
    category: "services",
    categoryLabel: "Special Education Services",
    title: "Occupational Therapy Services",
    previousValue: "Direct OT services to address fine motor and visual motor skills. Frequency: 1x per week, Duration: 30 minutes, Location: School",
    newValue: "Direct OT services to address fine motor and visual motor skills. Frequency: 2x per week, Duration: 30 minutes, Location: School",
    status: "modified",
    severity: "high_attention",
    explanation: "Weekly occupational therapy services increased from 1 session to 2 sessions per week, resulting in a weekly increase of +30 minutes.",
    suggestedQuestion: "What evaluations or baseline tasks indicated a need for additional visual-motor training sessions?",
    previousLocation: "Page 14 · Section VII",
    newLocation: "Page 15 · Section VII",
    numericDiff: "+30 minutes/week"
  },
  {
    id: "comp-3",
    category: "accommodations",
    categoryLabel: "Accommodations",
    title: "Breaks as needed",
    previousValue: "",
    newValue: "Student will receive scheduled and unscheduled breaks as needed during instruction and state testing. (NEW ADDITION)",
    status: "added",
    severity: "review",
    explanation: "Unscheduled breaks accommodation has been added to support self-regulation and anxiety control during academic assessments.",
    suggestedQuestion: "How will breaks be monitored or requested to minimize missed instructional time?",
    previousLocation: "Section Not Included",
    newLocation: "Page 11 · Section VI"
  },
  {
    id: "comp-4",
    category: "related",
    categoryLabel: "Related Services",
    title: "Counseling Services",
    previousValue: "Direct counseling to address social skills and self-regulation. Frequency: 1x per week, Duration: 30 minutes, Location: School",
    newValue: "",
    status: "removed",
    severity: "high_attention",
    explanation: "Counseling related services have been entirely removed from the proposed IEP. No corresponding target support was identified.",
    suggestedQuestion: "What behavior logs or student counseling records justified the complete removal of counseling minutes?",
    previousLocation: "Page 16 · Section VIII",
    newLocation: "Section Not Included",
    numericDiff: "-30 minutes/week"
  },
  {
    id: "comp-5",
    category: "admin",
    categoryLabel: "Administrative",
    title: "IEP Annual Review Date",
    previousValue: "March 3, 2026",
    newValue: "May 14, 2026",
    status: "modified",
    severity: "informational",
    explanation: "The IEP review date was changed to reflect the actual meeting timestamp. This does not impact special education services.",
    suggestedQuestion: "Does the new timeline align with transition reviews?",
    previousLocation: "Page 1 · Cover Page",
    newLocation: "Page 1 · Cover Page"
  },
  {
    id: "comp-6",
    category: "accommodations",
    categoryLabel: "Accommodations",
    title: "Preferential seating",
    previousValue: "Student will be placed in a setting with preferential seating (near the point of instruction).",
    newValue: "Student will be placed near the teacher or center of instruction to reduce auditory distractions.",
    status: "reworded",
    severity: "informational",
    explanation: "The language was updated to clarify proximity, but the classroom accommodation remains substantively identical.",
    suggestedQuestion: "Can the class teacher confirm this layout is set up?",
    previousLocation: "Page 6 · Section VI",
    newLocation: "Page 6 · Section VI"
  },
  {
    id: "comp-7",
    category: "placement",
    categoryLabel: "Placement & LRE",
    title: "General Education Environment Percentage",
    previousValue: "80% of the school week in general education environments",
    newValue: "72% of the school week in general education environments",
    status: "modified",
    severity: "high_attention",
    explanation: "General education inclusion time has decreased by 8 percentage points (transitioning 8% more time to resource setting).",
    suggestedQuestion: "What academic or behavior evidence supported removing general education minutes in favor of resource classroom settings?",
    previousLocation: "Page 18 · Section X",
    newLocation: "Page 19 · Section X",
    numericDiff: "-8% General Ed Time"
  },
  {
    id: "comp-8",
    category: "concerns",
    categoryLabel: "Parent Concerns",
    title: "Sensory Overload & Reading Fluency Focus",
    previousValue: "Parent expressed concerns regarding sensory sensitivity and reading test anxiety.",
    newValue: "Parent expressed concerns regarding sensory sensitivity and reading test anxiety.",
    status: "unchanged",
    severity: "informational",
    explanation: "Parent concerns were fully imported and retained letter-for-letter in the new proposed IEP.",
    suggestedQuestion: "No changes needed here.",
    previousLocation: "Page 3 · Section II",
    newLocation: "Page 3 · Section II"
  }
];

export default function IepComparator() {
  const [, setLocation] = useLocation();

  // Mode & navigation state
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [advocateMode, setAdvocateMode] = useState<boolean>(false);
  const [hideUnchanged, setHideUnchanged] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Upload/Processing state
  const [isUploaded, setIsUploaded] = useState<boolean>(true); // Start preloaded for instant WOW factor!
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [prevFileName, setPrevFileName] = useState<string | null>("Michael_IEP_March_2026.pdf");
  const [currFileName, setCurrFileName] = useState<string | null>("Michael_IEP_May_2026_Proposed.pdf");
  const [processingStep, setProcessingStep] = useState<string>("");

  // Local state for interactive elements (Notes, Star, Reviewed)
  const [items, setItems] = useState<ComparisonItem[]>(MICHAEL_SHEEP_COMPARISON);

  // SVG lines state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Array<{ id: string; x1: number; y1: number; x2: number; y2: number; color: string }>>([]);

  // Calculate coordinates for visual connector lines
  const updateConnectorLines = () => {
    if (activeTab !== "sidebyside" || !canvasRef.current) {
      setLines([]);
      return;
    }

    setTimeout(() => {
      const container = canvasRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();

      const newLines: typeof lines = [];

      items.forEach((item) => {
        // Skip hidden unchanged items
        if (hideUnchanged && item.status === "unchanged") return;
        if (filterStatus !== "all" && item.status !== filterStatus) return;
        if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return;

        const leftEl = document.getElementById(`node-new-${item.id}`);
        const rightEl = document.getElementById(`node-old-${item.id}`);

        if (leftEl && rightEl) {
          const leftRect = leftEl.getBoundingClientRect();
          const rightRect = rightEl.getBoundingClientRect();

          const x1 = leftRect.right - containerRect.left;
          const y1 = (leftRect.top + leftRect.height / 2) - containerRect.top;
          const x2 = rightRect.left - containerRect.left;
          const y2 = (rightRect.top + rightRect.height / 2) - containerRect.top;

          // Status-specific curve colors matching status theme
          let color = "rgba(148, 163, 184, 0.4)"; // Slate/Muted
          if (item.status === "added") color = "rgba(16, 185, 129, 0.7)"; // Emerald
          if (item.status === "removed") color = "rgba(239, 68, 68, 0.7)"; // Rose
          if (item.status === "modified") color = "rgba(245, 158, 11, 0.7)"; // Amber
          if (item.status === "reworded") color = "rgba(99, 102, 241, 0.7)"; // Indigo
          if (item.status === "needs_review") color = "rgba(139, 92, 246, 0.7)"; // Violet

          newLines.push({
            id: item.id,
            x1,
            y1,
            x2,
            y2,
            color
          });
        }
      });

      setLines(newLines);
    }, 155);
  };

  // Re-draw connection lines on scroll, resize, or view switches
  useEffect(() => {
    updateConnectorLines();
    window.addEventListener("resize", updateConnectorLines);
    return () => window.removeEventListener("resize", updateConnectorLines);
  }, [activeTab, items, hideUnchanged, filterStatus, searchQuery]);

  // Handle mock PDF file uploads with animated status stages
  const handleUpload = (prev: boolean, file: File) => {
    if (prev) {
      setPrevFileName(file.name);
    } else {
      setCurrFileName(file.name);
    }
  };

  const startAnalysis = () => {
    if (!prevFileName || !currFileName) {
      toast.error("Please upload both previous and new IEP files first.");
      return;
    }

    setIsProcessing(true);
    const stages = [
      "Reading Previous IEP...",
      "Reading New IEP...",
      "Identifying IEP Sections...",
      "Matching Annual Goals...",
      "Comparing Special Education Services...",
      "Comparing Accommodations & Classroom Aids...",
      "Reviewing LRE & Placement Levels...",
      "Running Plain Language Explanations Engine...",
      "Building Your Waypoint Comparison Dashboard..."
    ];

    let currentStageIndex = 0;
    setProcessingStep(stages[0]);

    const interval = setInterval(() => {
      currentStageIndex++;
      if (currentStageIndex < stages.length) {
        setProcessingStep(stages[currentStageIndex]);
      } else {
        clearInterval(interval);
        setIsProcessing(false);
        setIsUploaded(true);
        setActiveTab("overview");
        toast.success("IEP Comparison Prepared Successfully!");
      }
    }, 550);
  };

  // Interactive callbacks
  const handleToggleStar = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, isStarred: !item.isStarred } : item));
    toast.success("Meeting Prep brief updated");
  };

  const handleToggleReviewed = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, isReviewed: !item.isReviewed } : item));
  };

  const handleUpdateNote = (id: string, note: string) => {
    setItems(items.map(item => item.id === id ? { ...item, userNote: note } : item));
  };

  const resetUploads = () => {
    setPrevFileName(null);
    setCurrFileName(null);
    setIsUploaded(false);
  };

  // Statistics calculation
  const totalChanges = items.filter(i => i.status !== "unchanged").length;
  const addedCount = items.filter(i => i.status === "added").length;
  const removedCount = items.filter(i => i.status === "removed").length;
  const modifiedCount = items.filter(i => i.status === "modified").length;
  const unchangedCount = items.filter(i => i.status === "unchanged").length;
  const highAttentionCount = items.filter(i => i.severity === "high_attention" && i.status !== "unchanged").length;

  // Filter items matching layout criteria
  const visibleItems = items.filter(item => {
    if (hideUnchanged && item.status === "unchanged") return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* TOP CONTROLS / TITLE BLOCK */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 gap-4 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocation("/tools")}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                title="Back to Tools"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                Waypoint IEP Comparator
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-serif mt-1">IEP Comparison Analyzer</h1>
            <p className="text-sm text-slate-400">
              Two IEPs. Every meaningful change. One clear view forward.
            </p>
          </div>

          {isUploaded && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer scale-90 select-none">
                <input
                  type="checkbox"
                  checked={advocateMode}
                  onChange={(e) => setAdvocateMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-950/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-amber-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500/20 peer-checked:border peer-checked:border-amber-500/35"></div>
                <span className="text-xs text-slate-400 ml-2 font-bold uppercase tracking-wider">
                  Advocate Mode
                </span>
              </label>
              <Button
                variant="outline"
                onClick={resetUploads}
                className="border-white/10 text-slate-300 hover:bg-white/5 text-xs h-9"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Upload Different Files
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs h-9 px-4 font-bold"
              >
                <Printer className="h-4 w-4 mr-2" /> Print Summary Brief
              </Button>
            </div>
          )}
        </div>

        {/* ── STAGE 1: UPLOAD & PROCESSING STAGE ── */}
        {!isUploaded ? (
          <div className="max-w-3xl mx-auto space-y-8 py-10">
            {isProcessing ? (
              <div className="bg-[#07162B]/50 border border-white/10 rounded-2xl p-12 text-center space-y-6 shadow-2xl">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                  <GitCompare className="h-6 w-6 text-indigo-400 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white font-serif">Analyzing IEP Documents</h3>
                  <p className="text-sm font-mono text-amber-400">{processingStep}</p>
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Our terminology normalization engine is matching present levels, calculating weekly service minute deltas, and mapping accommodations.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* PREVIOUS IEP UPLOAD ZONE */}
                  <div className="bg-[#07162B]/40 border border-dashed border-white/10 hover:border-indigo-500/40 rounded-2xl p-8 text-center relative transition-all min-h-[220px] flex flex-col justify-center items-center space-y-4">
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Previous IEP Version</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto truncate font-mono">
                        {prevFileName || "Drag & drop PDF / DOCX here"}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => e.target.files?.[0] && handleUpload(true, e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {prevFileName && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPrevFileName(null); }}
                        className="text-[10px] text-rose-450 hover:underline z-10"
                      >
                        Remove file
                      </button>
                    )}
                  </div>

                  {/* PROPOSED NEW IEP UPLOAD ZONE */}
                  <div className="bg-[#07162B]/40 border border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl p-8 text-center relative transition-all min-h-[220px] flex flex-col justify-center items-center space-y-4">
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-450">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">New / Proposed IEP</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto truncate font-mono">
                        {currFileName || "Drag & drop PDF / DOCX here"}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => e.target.files?.[0] && handleUpload(false, e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {currFileName && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrFileName(null); }}
                        className="text-[10px] text-rose-450 hover:underline z-10"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 flex items-start gap-4 text-left">
                  <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Waypoint Analysis Guardrails</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Waypoint utilizes local LLM models to perform semantic categorization. Omissions, removals, and service minute variations are highlighted to keep parents informed before meetings. No legal advice is provided.
                    </p>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={startAnalysis}
                    className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg flex items-center gap-2 hover:scale-102 transition-transform"
                  >
                    <GitCompare className="h-5 w-5" /> Start IEP Comparison
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── STAGE 2: FULL ANALYSIS DASHBOARD ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SECTION NAVIGATION SIDEBAR */}
            <div className="lg:col-span-3 space-y-2 text-left self-start lg:sticky lg:top-8">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">IEP Content Sections</div>
              {[
                { id: "overview", label: "Comparison Overview", count: totalChanges },
                { id: "high_attention", label: "High-Attention Changes", count: highAttentionCount },
                { id: "goals", label: "Annual Goals", count: items.filter(i => i.category === "goals" && i.status !== "unchanged").length },
                { id: "accommodations", label: "Accommodations", count: items.filter(i => i.category === "accommodations" && i.status !== "unchanged").length },
                { id: "services", label: "Special Ed Services", count: items.filter(i => i.category === "services" && i.status !== "unchanged").length },
                { id: "related", label: "Related Services", count: items.filter(i => i.category === "related" && i.status !== "unchanged").length },
                { id: "placement", label: "Placement & LRE", count: items.filter(i => i.category === "placement" && i.status !== "unchanged").length },
                { id: "meeting_prep", label: "★ IEP Meeting Prep Brief", count: items.filter(i => i.isStarred).length },
                { id: "sidebyside", label: "↔ Side-by-Side Canvas", count: totalChanges }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "high_attention") {
                      setFilterStatus("all");
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-indigo-650 text-white font-bold shadow-md shadow-indigo-650/15"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === tab.id 
                        ? "bg-white/20 text-white" 
                        : tab.id === "high_attention" 
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                          : "bg-slate-900 text-slate-500"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}

              <div className="border-t border-white/5 pt-4 mt-6">
                <div className="bg-[#0b1e36]/30 border border-white/5 rounded-xl p-3.5 space-y-2">
                  <div className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <UserCardAvatar />
                    Student Profile
                  </div>
                  <div className="text-xs text-white font-bold">Michael Sheep</div>
                  <div className="text-[10px] text-slate-400">8th Grade IEP Comparison</div>
                </div>
              </div>
            </div>

            {/* MAIN DASHBOARD CONTENT (Center 9 Cols) */}
            <div className="lg:col-span-9 space-y-6">

              {/* ── TAB: OVERVIEW / DEFAULT VIEW ── */}
              {activeTab === "overview" && (
                <div className="space-y-6 text-left animate-fade-in">
                  {/* Executive Overview Summary Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { label: "Added Elements", val: addedCount, color: "text-emerald-450", border: "border-emerald-500/20" },
                      { label: "Removed Supports", val: removedCount, color: "text-rose-450", border: "border-rose-500/20" },
                      { label: "Modified Services", val: modifiedCount, color: "text-amber-400", border: "border-amber-500/20" },
                      { label: "Unchanged Details", val: unchangedCount, color: "text-slate-400", border: "border-white/5" }
                    ].map((card, idx) => (
                      <div key={idx} className={`bg-[#07162B]/50 border ${card.border} rounded-2xl p-4 flex flex-col justify-between shadow-sm`}>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{card.label}</span>
                        <span className={`text-2xl font-bold mt-2 ${card.color}`}>{card.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* General Category filter bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {["all", "added", "removed", "modified", "reworded"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setFilterStatus(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                            filterStatus === s
                              ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-semibold"
                              : "bg-slate-900 border-white/5 text-slate-500 hover:text-white"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hideUnchanged}
                          onChange={(e) => setHideUnchanged(e.target.checked)}
                          className="rounded border-white/10 bg-slate-900 text-indigo-650 h-3.5 w-3.5 focus:ring-0"
                        />
                        <span>Hide Unchanged Items</span>
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-550" />
                        <input
                          type="text"
                          placeholder="Search changes..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 bg-slate-950/80 border border-white/10 rounded-lg text-xs h-8 focus:ring-indigo-500 w-44"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Changes Cards List */}
                  <div className="space-y-4">
                    {visibleItems.length === 0 ? (
                      <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl text-slate-500 text-xs">
                        No changes match the selected filter/search criteria.
                      </div>
                    ) : (
                      visibleItems.map((item) => (
                        <ComparisonItemCard
                          key={item.id}
                          item={item}
                          advocateMode={advocateMode}
                          onToggleStar={handleToggleStar}
                          onToggleReviewed={handleToggleReviewed}
                          onUpdateNote={handleUpdateNote}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB: HIGH ATTENTION CHANGES ── */}
              {activeTab === "high_attention" && (
                <div className="space-y-6 text-left animate-fade-in">
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-3.5">
                    <ShieldAlert className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">High-Attention Revisions Detected</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        These updates relate directly to service time reductions, accommodation exclusions, or placement updates. Review these carefully with the IEP team.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {items.filter(i => i.severity === "high_attention" && i.status !== "unchanged").map((item) => (
                      <ComparisonItemCard
                        key={item.id}
                        item={item}
                        advocateMode={advocateMode}
                        onToggleStar={handleToggleStar}
                        onToggleReviewed={handleToggleReviewed}
                        onUpdateNote={handleUpdateNote}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── TABS: SPECIFIC CATEGORY FILTERED VIEWS ── */}
              {["goals", "accommodations", "services", "related", "placement"].includes(activeTab) && (
                <div className="space-y-6 text-left animate-fade-in">
                  <div className="border-b border-white/5 pb-4">
                    <h2 className="text-lg font-bold text-white font-serif capitalize">{activeTab} Category Changes</h2>
                  </div>
                  <div className="space-y-4">
                    {items.filter(i => i.category === activeTab).map((item) => (
                      <ComparisonItemCard
                        key={item.id}
                        item={item}
                        advocateMode={advocateMode}
                        onToggleStar={handleToggleStar}
                        onToggleReviewed={handleToggleReviewed}
                        onUpdateNote={handleUpdateNote}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB: IEP MEETING PREP BRIEF ── */}
              {activeTab === "meeting_prep" && (
                <div className="space-y-6 text-left bg-[#07162B]/30 border border-white/5 rounded-2xl p-6 md:p-8 animate-fade-in print:bg-white print:text-black">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 print:border-black">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                      <h2 className="text-xl font-bold text-white font-serif print:text-black">Your IEP Meeting Prep Brief</h2>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      {items.filter(i => i.isStarred).length} Items Priority
                    </Badge>
                  </div>

                  <div className="space-y-6">
                    {items.filter(i => i.isStarred).length === 0 ? (
                      <div className="text-center py-16 text-slate-500 text-xs">
                        No priority items selected yet. Click the star icon (★) on any change card to add it to this brief.
                      </div>
                    ) : (
                      items.filter(i => i.isStarred).map((item, idx) => (
                        <div key={item.id} className="border-b border-white/5 pb-6 last:border-b-0 space-y-3 print:border-black">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest">{item.categoryLabel}</span>
                              <h3 className="font-bold text-sm text-white print:text-black">{idx + 1}. {item.title}</h3>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-450 px-2 py-0.5 rounded border border-rose-500/20">
                              {item.status}
                            </span>
                          </div>

                          <div className="bg-slate-950/60 p-3 rounded-lg border border-white/5 text-xs text-slate-400 space-y-1 print:bg-slate-100 print:text-black">
                            <div><strong>Summary Difference:</strong> {item.explanation}</div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Suggested Question to Ask at Meeting:</span>
                            <p className="text-xs text-white font-bold leading-normal print:text-black">
                              "{item.suggestedQuestion}"
                            </p>
                          </div>

                          {item.userNote && (
                            <div className="bg-[#0b1e36]/30 p-2.5 rounded-lg border border-indigo-500/10 text-xs text-indigo-300">
                              <strong>My Note:</strong> {item.userNote}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Print brief advice footer */}
                  <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
                    <p className="text-[10px] text-slate-500 max-w-md">
                      This brief gathers your selected high-priority revisions, custom notes, and suggested questions. Click "Print Summary Brief" to generate a physical handout.
                    </p>
                    <Button
                      onClick={() => window.print()}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      <Printer className="h-4 w-4 mr-2" /> Print Handout
                    </Button>
                  </div>
                </div>
              )}

              {/* ── TAB: VISUAL SIDE-BY-SIDE CANVAS ── */}
              {activeTab === "sidebyside" && (
                <div className="space-y-6 text-left relative animate-fade-in" ref={canvasRef}>
                  
                  {/* SVG overlay canvas for visual lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {lines.map((line) => (
                      <g key={line.id}>
                        <path
                          d={`M ${line.x1},${line.y1} C ${(line.x1 + line.x2) / 2},${line.y1} ${(line.x1 + line.x2) / 2},${line.y2} ${line.x2},${line.y2}`}
                          fill="none"
                          stroke={line.color}
                          strokeWidth="2"
                          strokeDasharray={line.color.includes("0.4") ? "4,4" : "0"}
                          className="transition-all duration-300"
                        />
                        {!line.color.includes("0.4") && (
                          <circle
                            cx={line.x1}
                            cy={line.y1}
                            r="3"
                            fill={line.color}
                          />
                        )}
                        {!line.color.includes("0.4") && (
                          <circle
                            cx={line.x2}
                            cy={line.y2}
                            r="3"
                            fill={line.color}
                          />
                        )}
                      </g>
                    ))}
                  </svg>

                  {/* Version indicator banner */}
                  <div className="grid grid-cols-2 gap-8 text-center border-b border-white/5 pb-4 relative z-10">
                    <div>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Proposed Document</span>
                      <h3 className="font-serif font-black text-sm text-white mt-0.5">NEW IEP (May 14, 2026)</h3>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block">Historical Reference</span>
                      <h3 className="font-serif font-black text-sm text-white mt-0.5">OLD IEP (March 3, 2026)</h3>
                    </div>
                  </div>

                  {/* Flex Cards container */}
                  <div className="space-y-8 relative z-10">
                    {visibleItems.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 text-xs">
                        No changes match filters.
                      </div>
                    ) : (
                      visibleItems.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-2 gap-12 items-center">
                          
                          {/* NEW Proposed Card (Left Column) */}
                          <div
                            id={`node-new-${item.id}`}
                            className={`bg-[#07162B]/85 border rounded-xl p-4 text-left transition-all ${
                              item.status === "added" ? "border-emerald-500/25 shadow-md shadow-emerald-500/5" :
                              item.status === "removed" ? "border-rose-500/25 shadow-md shadow-rose-500/5" :
                              item.status === "modified" ? "border-amber-500/25 shadow-md shadow-amber-500/5" :
                              "border-white/5"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[8px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                                {idx + 1} · {item.categoryLabel}
                              </span>
                              <Badge className={`text-[8px] uppercase tracking-wider ${
                                item.status === "added" ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/25" :
                                item.status === "removed" ? "bg-rose-500/10 text-rose-450 border border-rose-500/25" :
                                item.status === "modified" ? "bg-amber-500/10 text-amber-400 border border-amber-500/25" :
                                "bg-slate-900 text-slate-550"
                              }`}>
                                {item.status}
                              </Badge>
                            </div>
                            <h4 className="font-serif font-black text-xs text-white truncate">{item.title}</h4>
                            <p className="text-[11px] text-slate-350 leading-relaxed mt-2">
                              {item.newValue || <span className="text-slate-650 italic">Section or support omitted in proposed IEP version.</span>}
                            </p>
                            {item.newLocation && (
                              <div className="text-[9px] text-slate-500 mt-2 text-right">{item.newLocation}</div>
                            )}
                          </div>

                          {/* OLD Reference Card (Right Column) */}
                          <div
                            id={`node-old-${item.id}`}
                            className={`bg-[#07162B]/85 border rounded-xl p-4 text-left transition-all ${
                              item.status === "added" ? "border-emerald-500/25 shadow-md shadow-emerald-500/5" :
                              item.status === "removed" ? "border-rose-500/25 shadow-md shadow-rose-500/5" :
                              item.status === "modified" ? "border-amber-500/25 shadow-md shadow-amber-500/5" :
                              "border-white/5"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[8px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                                {idx + 1} · {item.categoryLabel}
                              </span>
                              <span className="text-[9px] font-semibold text-slate-500">Old Baseline</span>
                            </div>
                            <h4 className="font-serif font-black text-xs text-slate-300 truncate">{item.title}</h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
                              {item.previousValue || <span className="text-slate-650 italic">Not previously included.</span>}
                            </p>
                            {item.previousLocation && (
                              <div className="text-[9px] text-slate-500 mt-2 text-right">{item.previousLocation}</div>
                            )}
                          </div>

                        </div>
                      ))
                    )}
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

// ============ SUB-COMPONENTS ============

// User Card Avatar Helper
function UserCardAvatar() {
  return (
    <div className="w-5 h-5 rounded-full overflow-hidden border border-amber-500/40 shrink-0 bg-slate-950 flex items-center justify-center">
      <div className="w-4.5 h-4.5 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 opacity-80" />
    </div>
  );
}

// Individual Comparison Card Item Component
interface CardProps {
  item: ComparisonItem;
  advocateMode: boolean;
  onToggleStar: (id: string) => void;
  onToggleReviewed: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}

function ComparisonItemCard({ item, advocateMode, onToggleStar, onToggleReviewed, onUpdateNote }: CardProps) {
  const [localNote, setLocalNote] = useState(item.userNote || "");
  const [showNotesForm, setShowNotesForm] = useState(false);

  // Status mapping visual styling helper
  let statusBadgeColor = "bg-slate-900 text-slate-400 border border-white/5";
  if (item.status === "added") statusBadgeColor = "bg-emerald-500/10 text-emerald-450 border border-emerald-500/25";
  if (item.status === "removed") statusBadgeColor = "bg-rose-500/10 text-rose-450 border border-rose-500/25";
  if (item.status === "modified") statusBadgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/25";
  if (item.status === "reworded") statusBadgeColor = "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20";
  if (item.status === "needs_review") statusBadgeColor = "bg-violet-500/10 text-violet-300 border border-violet-500/20";

  let severityBadgeColor = "bg-slate-950 text-slate-500";
  if (item.severity === "review") severityBadgeColor = "bg-indigo-500/5 text-indigo-405 border border-indigo-500/15";
  if (item.severity === "high_attention") severityBadgeColor = "bg-rose-500/5 text-rose-400 border border-rose-500/15";

  return (
    <Card className={`bg-[#07162B]/40 hover:bg-[#07162B]/60 border border-white/5 transition-all text-left ${
      item.isReviewed ? "opacity-60 border-emerald-500/10" : ""
    }`}>
      <CardContent className="p-5 space-y-4">
        
        {/* Card Header metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.categoryLabel}</span>
            <h3 className="font-bold text-sm text-white font-serif">{item.title}</h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`text-[8px] uppercase tracking-wider font-bold ${statusBadgeColor}`}>
              {item.status}
            </Badge>
            {item.severity !== "informational" && (
              <Badge className={`text-[8px] uppercase tracking-wider font-bold ${severityBadgeColor}`}>
                {item.severity === "high_attention" ? "High Attention" : "Review"}
              </Badge>
            )}
            {item.numericDiff && (
              <Badge className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-bold">
                {item.numericDiff}
              </Badge>
            )}
          </div>
        </div>

        {/* Side-by-side comparison snippet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 text-xs">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Previous version</span>
            <p className="text-slate-400 leading-normal line-clamp-4">
              {item.previousValue || <span className="text-slate-650 italic">Section not included in previous IEP version.</span>}
            </p>
            {item.previousLocation && (
              <span className="text-[9px] text-slate-550 block mt-2 text-right">{item.previousLocation}</span>
            )}
          </div>
          <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 text-xs">
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">New version</span>
            <p className="text-slate-200 leading-normal line-clamp-4">
              {item.newValue || <span className="text-slate-650 italic">Section or support omitted in proposed IEP version.</span>}
            </p>
            {item.newLocation && (
              <span className="text-[9px] text-slate-550 block mt-2 text-right">{item.newLocation}</span>
            )}
          </div>
        </div>

        {/* Plain language parent interpretation */}
        <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
            <BookOpen className="h-4 w-4 text-indigo-400" />
            <span>Plain-Language Interpretation</span>
          </div>
          <p className="text-xs text-slate-350 leading-relaxed">
            {item.explanation}
          </p>
        </div>

        {/* Advocate Mode extra telemetry */}
        {advocateMode && (
          <div className="bg-slate-900 border border-dashed border-white/10 rounded-lg p-3 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-sans">
              <span>Advocate Mode Audit Metrics</span>
              <span>Matched Category: {item.category}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500">
              <div>• Similarity score: 87%</div>
              <div>• LRE impact weight: {item.severity === "high_attention" ? "High" : "Low"}</div>
              <div>• Numeric parsed delta: {item.numericDiff || "N/A"}</div>
              <div>• Structural Match Confidence: High</div>
            </div>
          </div>
        )}

        {/* Action Panel: Suggested Question + Notes + Stars */}
        <div className="border-t border-white/5 pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1 max-w-xl">
              <span className="text-[9px] font-bold text-amber-450 uppercase tracking-wider block">Suggested Question to ask:</span>
              <p className="text-xs text-white font-bold italic leading-normal">
                "{item.suggestedQuestion}"
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={item.isReviewed || false}
                  onChange={() => onToggleReviewed(item.id)}
                  className="rounded border-white/10 bg-slate-900 text-indigo-650 h-3.5 w-3.5 focus:ring-0"
                />
                <span>Reviewed</span>
              </label>

              <button
                onClick={() => onToggleStar(item.id)}
                className={`p-1.5 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all ${
                  item.isStarred
                    ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                    : "bg-slate-900 border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                }`}
                title="Add to Meeting Prep Handout"
              >
                <Star className={`h-3.5 w-3.5 ${item.isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
                <span>Prep</span>
              </button>

              <button
                onClick={() => setShowNotesForm(!showNotesForm)}
                className={`p-1.5 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all ${
                  item.userNote
                    ? "bg-indigo-500/10 border-indigo-500 text-indigo-455 font-bold"
                    : "bg-slate-900 border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Note</span>
              </button>
            </div>
          </div>

          {/* User Notes Input Text Area */}
          {(showNotesForm || item.userNote) && (
            <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-white/5 animate-slide-up">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">My Custom Notes for the IEP Meeting</span>
              <textarea
                value={localNote}
                onChange={(e) => {
                  setLocalNote(e.target.value);
                  onUpdateNote(item.id, e.target.value);
                }}
                placeholder="Write specific things to discuss, check progress data, or request copies..."
                className="w-full h-16 bg-slate-900 border border-white/10 rounded p-2 text-xs text-white placeholder-slate-650 focus:border-indigo-500"
              />
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
