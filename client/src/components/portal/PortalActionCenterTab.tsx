import React, { useState, useEffect } from "react";
import { 
  FileText, CheckCircle2, Clock, AlertCircle, ArrowRight, 
  Plus, Search, Shield, ChevronRight, Eye, Send, Download, 
  FileSignature, Check, Sparkles, User, Building, Calendar,
  PenTool, FileCheck, Layers, ExternalLink, X, RotateCcw,
  MessageSquare, HelpCircle, Lock
} from "lucide-react";
import { VaultSafeIcon } from "@/components/ui/VaultSafeIcon";
import { ActionCenterIcon } from "@/components/ui/ActionCenterIcon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";

export type ActionStatus = 
  | "DRAFT_IN_PROGRESS"
  | "NEEDS_YOUR_REVIEW"
  | "READY_FOR_SIGNATURE"
  | "WAITING_ON_WAYPOINT"
  | "READY_TO_SEND"
  | "SENT"
  | "COMPLETED";

export type ActionResponsibility = 
  | "CLIENT"      // "Your action is needed"
  | "WAYPOINT"    // "Waypoint is working on this"
  | "SCHOOL"      // "Waiting for school response"
  | "NONE";       // "No action needed"

export interface ActionItem {
  id: string;
  title: string;
  category: string;
  description: string;
  status: ActionStatus;
  responsibility: ActionResponsibility;
  lastUpdated: string;
  isCompleted: boolean;
  savedToVault: boolean;
  vaultDocumentTitle?: string;
  vaultCategory?: string;
  isWaypointInitiated?: boolean;
  contentDraft?: string;
  notesFromAdvocate?: string;
  clientNotes?: string;
  signedAt?: string;
  sentAt?: string;
}

interface PortalActionCenterTabProps {
  effectiveStudent: any;
  displayName: string;
  onNavigateTab: (tab: string) => void;
  isLight?: boolean;
}

const DEFAULT_ACTION_ITEMS: ActionItem[] = [
  {
    id: "act-1",
    title: "Notify School of Advocate",
    category: "Advocate Notice",
    description: "Formal written notice to principal and IEP team confirming Byron Honea as designated advocate.",
    status: "NEEDS_YOUR_REVIEW",
    responsibility: "CLIENT",
    lastUpdated: "Sep 2, 2026",
    isCompleted: false,
    savedToVault: false,
    notesFromAdvocate: "Please review the school contact list and confirm you're comfortable with Byron speaking directly with the case manager.",
    contentDraft: `To: Principal & Special Education Department
School District: Fulton County Schools
Student: Liam Jenkins (DOB: 05/14/2016)

Dear IEP Team Members,

This letter serves as formal notification that we have retained Byron Honea (Master IEP Coach®, Waypoint Advocates) to assist our family with all educational planning, ARD/IEP committee meetings, and 504 accommodation reviews.

Please include Byron Honea (byron@waypointadvocates.com) on all written notices, meeting invitations, evaluations, and progress reports regarding Liam.

Sincerely,
The Jenkins Family`
  },
  {
    id: "act-2",
    title: "Request an Evaluation",
    category: "Evaluation Request",
    description: "Comprehensive multi-disciplinary evaluation request in all areas of suspected disability (Psychoeducational & OT).",
    status: "DRAFT_IN_PROGRESS",
    responsibility: "WAYPOINT",
    lastUpdated: "Sep 1, 2026",
    isCompleted: false,
    savedToVault: false,
    notesFromAdvocate: "Byron is compiling the specific IDEA 34 CFR § 300.304 statutory citations and sensory processing concerns.",
    contentDraft: `Comprehensive evaluation request is currently being formulated by Waypoint Advocates to ensure all 6 key areas of suspected sensory and executive functioning deficits are formally evaluated under state timeline guidelines.`
  },
  {
    id: "act-3",
    title: "Parent Concerns Statement",
    category: "Parent Statement",
    description: "Parent observations, sensory triggers, and academic goals to be incorporated verbatim into Section 3 of the IEP.",
    status: "NEEDS_YOUR_REVIEW",
    responsibility: "CLIENT",
    lastUpdated: "Aug 31, 2026",
    isCompleted: false,
    savedToVault: false,
    notesFromAdvocate: "We've structured your initial notes into formal IEP goals. Take a look and add any home behaviors you noticed this week.",
    contentDraft: `Parent Observations & Priorities:
1. Math Anxiety: Struggles with timed multi-step math problems; needs sensory break accommodation.
2. Sensory Needs: Noise-canceling headphones needed during hallway transitions and cafeteria.
3. Reading Fluency: Requesting specialized Orton-Gillingham methodology fidelity.`
  },
  {
    id: "act-4",
    title: "Advocacy Membership Agreement",
    category: "Terms & Retainer",
    description: "Annual advocacy representation agreement and client rights disclosure.",
    status: "COMPLETED",
    responsibility: "NONE",
    lastUpdated: "Aug 28, 2026",
    isCompleted: true,
    savedToVault: true,
    vaultDocumentTitle: "Signed Advocacy Retainer Agreement - 2026-2027",
    vaultCategory: "Agreements & Retainers",
    signedAt: "Aug 28, 2026"
  },
  {
    id: "act-5",
    title: "Request IEP / 504 Review Meeting",
    category: "Meeting Request",
    description: "Formal letter requesting an urgent 30-day IEP review meeting to address sensory accommodations.",
    status: "SENT",
    responsibility: "SCHOOL",
    lastUpdated: "Aug 25, 2026",
    isCompleted: false,
    savedToVault: false,
    sentAt: "Aug 25, 2026",
    notesFromAdvocate: "Letter delivered via certified email to Principal Davis and Case Manager Miller. Statutory 30-day response clock active."
  },
  {
    id: "act-6",
    title: "Cumulative Records Request (FERPA)",
    category: "Records Request",
    description: "Comprehensive request for full educational records, progress monitoring graphs, and teacher logs.",
    status: "COMPLETED",
    responsibility: "NONE",
    lastUpdated: "Aug 15, 2026",
    isCompleted: true,
    savedToVault: true,
    vaultDocumentTitle: "Complete Cumulative School Records (2024-2026)",
    vaultCategory: "School Records & Evaluations",
    sentAt: "Aug 15, 2026"
  },
  {
    id: "act-7",
    title: "State Complaint (Part B Resolution)",
    category: "Formal Resolution",
    description: "Formal state educational agency complaint prepared by Waypoint regarding service delivery minutes.",
    status: "NEEDS_YOUR_REVIEW",
    responsibility: "CLIENT",
    lastUpdated: "Aug 30, 2026",
    isCompleted: false,
    savedToVault: false,
    isWaypointInitiated: true,
    notesFromAdvocate: "Waypoint has reviewed the missed speech minutes log and prepared this formal resolution packet for your family's final approval.",
    contentDraft: `State Department of Education - Division of Special Education Services
Formal Complaint Notice

Complainant: Jenkins Family (Represented by Waypoint Advocates)
Respondent District: Fulton County School District

Allegations: Failure to implement speech-language pathology services in accordance with IEP page 8 (120 missed minutes between March and May 2026).`
  }
];

const PERMITTED_CLIENT_ACTIONS = [
  {
    id: "parent-concerns",
    title: "Parent Concerns Statement",
    category: "Parent Statement",
    description: "Document your observations, homework struggles, and key priorities to be added into the student's IEP.",
    icon: MessageSquare
  },
  {
    id: "request-evaluation",
    title: "Request an Evaluation",
    category: "Evaluation Request",
    description: "Formal written request for an initial or comprehensive multi-disciplinary re-evaluation.",
    icon: FileText
  },
  {
    id: "request-meeting",
    title: "Request IEP / 504 Meeting",
    category: "Meeting Request",
    description: "Formal letter requesting an official IEP committee meeting to discuss accommodations or goals.",
    icon: Calendar
  },
  {
    id: "notify-advocate",
    title: "Notify School of Advocate",
    category: "Advocate Notice",
    description: "Inform the school principal and case manager that Byron Honea is your designated advocate.",
    icon: User
  },
  {
    id: "records-request",
    title: "Records Request (FERPA)",
    category: "Records Request",
    description: "Request student's complete cumulative file, standardized assessments, and BIP incident logs.",
    icon: FileCheck
  }
];

export default function PortalActionCenterTab({
  effectiveStudent,
  displayName,
  onNavigateTab,
  isLight = false
}: PortalActionCenterTabProps) {
  const studentKey = effectiveStudent?.id ? `waypoint_action_center_${effectiveStudent.id}` : "waypoint_action_center_default";
  
  const [items, setItems] = useState<ActionItem[]>(() => {
    try {
      const saved = localStorage.getItem(studentKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ACTION_ITEMS;
  });

  const [filter, setFilter] = useState<"ALL" | "NEEDS_YOU" | "IN_PROGRESS" | "COMPLETED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isStartActionOpen, setIsStartActionOpen] = useState(false);
  
  // Form state for action review
  const [clientComment, setClientComment] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signatureName, setSignatureName] = useState(displayName || "");

  // Persist items
  const saveItems = (updated: ActionItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(studentKey, JSON.stringify(updated));
    } catch {}
  };

  // Counts
  const needsYouCount = items.filter(i => !i.isCompleted && (i.responsibility === "CLIENT" || i.status === "NEEDS_YOUR_REVIEW" || i.status === "READY_FOR_SIGNATURE")).length;
  const inProgressCount = items.filter(i => !i.isCompleted && i.status !== "NEEDS_YOUR_REVIEW" && i.status !== "READY_FOR_SIGNATURE").length;
  const completedCount = items.filter(i => i.isCompleted).length;

  // Filtered items
  const filteredItems = items.filter(item => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Tab filter
    if (filter === "NEEDS_YOU") {
      return !item.isCompleted && (item.responsibility === "CLIENT" || item.status === "NEEDS_YOUR_REVIEW" || item.status === "READY_FOR_SIGNATURE");
    }
    if (filter === "IN_PROGRESS") {
      return !item.isCompleted;
    }
    if (filter === "COMPLETED") {
      return item.isCompleted;
    }
    return true;
  });

  // Action handlers
  const handleOpenAction = (action: ActionItem) => {
    setSelectedAction(action);
    setClientComment(action.clientNotes || "");
    setIsSigning(action.status === "READY_FOR_SIGNATURE");
    setIsActionModalOpen(true);
  };

  const handleApproveAction = () => {
    if (!selectedAction) return;
    const updated = items.map(item => {
      if (item.id === selectedAction.id) {
        return {
          ...item,
          status: "READY_TO_SEND" as ActionStatus,
          responsibility: "WAYPOINT" as ActionResponsibility,
          lastUpdated: "Just now",
          clientNotes: clientComment
        };
      }
      return item;
    });
    saveItems(updated);
    toast.success("Approved! Waypoint has been notified to proceed.");
    setIsActionModalOpen(false);
  };

  const handleSignAction = () => {
    if (!selectedAction) return;
    if (!signatureName.trim()) {
      toast.error("Please enter your signature name.");
      return;
    }
    const updated = items.map(item => {
      if (item.id === selectedAction.id) {
        return {
          ...item,
          status: "COMPLETED" as ActionStatus,
          responsibility: "NONE" as ActionResponsibility,
          isCompleted: true,
          savedToVault: true,
          vaultDocumentTitle: `${item.title} (Signed)`,
          lastUpdated: "Just now",
          signedAt: "Just now"
        };
      }
      return item;
    });
    saveItems(updated);
    toast.success("Document signed and automatically preserved in Document Vault!");
    setIsActionModalOpen(false);
  };

  const handleStartPermittedAction = (template: typeof PERMITTED_CLIENT_ACTIONS[0]) => {
    const newItem: ActionItem = {
      id: `act-${Date.now()}`,
      title: template.title,
      category: template.category,
      description: template.description,
      status: "DRAFT_IN_PROGRESS",
      responsibility: "CLIENT",
      lastUpdated: "Just now",
      isCompleted: false,
      savedToVault: false,
      contentDraft: `Draft started for ${effectiveStudent?.firstName || "Student"}. Add your notes and details here.`
    };
    saveItems([newItem, ...items]);
    setIsStartActionOpen(false);
    toast.success(`Started "${template.title}". You can now collaborate on it.`);
    handleOpenAction(newItem);
  };

  // Helper render status badge
  const renderStatusBadge = (status: ActionStatus, isCompleted: boolean) => {
    if (isCompleted || status === "COMPLETED") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium text-xs px-2.5 py-0.5 flex items-center gap-1.5">
          <Check className="h-3 w-3 text-emerald-400" />
          Completed
        </Badge>
      );
    }
    switch (status) {
      case "NEEDS_YOUR_REVIEW":
        return (
          <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/50 font-bold text-xs px-2.5 py-0.5 flex items-center gap-1.5 shadow-[0_0_8px_rgba(245,181,68,0.25)] animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Needs Your Review
          </Badge>
        );
      case "READY_FOR_SIGNATURE":
        return (
          <Badge className="bg-amber-500/20 text-amber-200 border border-amber-400/50 font-semibold text-xs px-2.5 py-0.5 flex items-center gap-1.5">
            <PenTool className="h-3 w-3 text-amber-300" />
            Ready for Signature
          </Badge>
        );
      case "DRAFT_IN_PROGRESS":
        return (
          <Badge className="bg-sky-500/15 text-sky-300 border border-sky-500/30 font-medium text-xs px-2.5 py-0.5 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-sky-400" />
            Draft in Progress
          </Badge>
        );
      case "WAITING_ON_WAYPOINT":
        return (
          <Badge className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium text-xs px-2.5 py-0.5 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            Waiting on Waypoint
          </Badge>
        );
      case "READY_TO_SEND":
        return (
          <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium text-xs px-2.5 py-0.5 flex items-center gap-1.5">
            <Send className="h-3 w-3 text-purple-400" />
            Ready to Send
          </Badge>
        );
      case "SENT":
        return (
          <Badge className="bg-teal-500/15 text-teal-300 border border-teal-500/30 font-medium text-xs px-2.5 py-0.5 flex items-center gap-1.5">
            <Send className="h-3 w-3 text-teal-400" />
            Sent to School
          </Badge>
        );
      default:
        return (
          <Badge className="bg-white/10 text-white/70 border border-white/10 text-xs px-2.5 py-0.5">
            {status}
          </Badge>
        );
    }
  };

  // Helper render responsibility label
  const renderResponsibilityText = (resp: ActionResponsibility, status: ActionStatus) => {
    if (status === "COMPLETED") {
      return (
        <span className="text-xs text-emerald-400/90 font-medium flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          No action needed
        </span>
      );
    }
    if (resp === "CLIENT" || status === "NEEDS_YOUR_REVIEW" || status === "READY_FOR_SIGNATURE") {
      return (
        <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
          Your action is needed
        </span>
      );
    }
    if (resp === "WAYPOINT" || status === "DRAFT_IN_PROGRESS" || status === "WAITING_ON_WAYPOINT") {
      return (
        <span className="text-xs text-sky-300/80 font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
          Waypoint is working on this
        </span>
      );
    }
    if (resp === "SCHOOL" || status === "SENT") {
      return (
        <span className="text-xs text-teal-300/80 font-medium flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-teal-400" />
          Waiting for school response
        </span>
      );
    }
    return (
      <span className="text-xs text-white/50 flex items-center gap-1.5">
        No action needed
      </span>
    );
  };

  // Helper CTA label
  const getActionCtaLabel = (item: ActionItem) => {
    if (item.isCompleted) return "View Final Document";
    if (item.status === "NEEDS_YOUR_REVIEW") return "Review Document";
    if (item.status === "READY_FOR_SIGNATURE") return "Sign Document";
    if (item.status === "READY_TO_SEND") return "Review & Send";
    if (item.responsibility === "CLIENT") return "Continue";
    return "View Details";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
              <ActionCenterIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Action Center
                </h1>
                <PageIdBadge id="PG-023-ACT" name="Action Center" />
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-0.5">
                Documents, requests, and forms we're working on together for {effectiveStudent?.firstName || "your student"}.
              </p>
            </div>
          </div>
        </div>

        {/* Start Action Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={() => setIsStartActionOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(245,181,68,0.25)] flex items-center gap-1.5 transition-all"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Start an Action
          </Button>
        </div>
      </div>

      {/* ── DISTINCTION / VAULT PRESERVATION BANNER ── */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl ${
        isLight 
          ? "bg-slate-100/90 border-slate-200 text-slate-800" 
          : "bg-gradient-to-r from-[#081B36] via-[#06172F] to-[#041022] border-blue-900/40 text-white/80 backdrop-blur-md"
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <VaultSafeIcon className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-white">Active Collaboration & Safe Storage:</span> All finalized requests and signed records are automatically archived into your child's{" "}
            <button
              onClick={() => onNavigateTab("smart-docs")}
              className="text-amber-400 font-bold hover:underline inline-flex items-center gap-0.5"
            >
              Document Vault <ExternalLink className="h-2.5 w-2.5" />
            </button>.
          </div>
        </div>
      </div>

      {/* ── OVERVIEW STATS & FILTER TABS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              filter === "ALL"
                ? "bg-[#06172F] text-white border border-blue-800/60 shadow-md"
                : "bg-[#030C22] text-white/60 hover:text-white hover:bg-[#06172F] border border-blue-900/30"
            }`}
          >
            All Workflows
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/80 font-mono">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setFilter("NEEDS_YOU")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              filter === "NEEDS_YOU"
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(245,181,68,0.25)]"
                : "bg-[#030C22] text-amber-300/70 hover:text-amber-300 hover:bg-[#06172F] border border-blue-900/30"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Needs You
            {needsYouCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold font-mono">
                {needsYouCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilter("IN_PROGRESS")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              filter === "IN_PROGRESS"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-md"
                : "bg-[#030C22] text-white/60 hover:text-white hover:bg-[#06172F] border border-blue-900/30"
            }`}
          >
            In Progress
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-mono">
              {inProgressCount}
            </span>
          </button>

          <button
            onClick={() => setFilter("COMPLETED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              filter === "COMPLETED"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md"
                : "bg-[#030C22] text-white/60 hover:text-white hover:bg-[#06172F] border border-blue-900/30"
            }`}
          >
            Completed
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              {completedCount}
            </span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active actions..."
            className="pl-8 text-xs bg-[#030C22] border-blue-900/40 text-white placeholder:text-white/30 rounded-xl h-9 focus:border-amber-400/60 focus-visible:ring-amber-400"
          />
        </div>
      </div>

      {/* ── ACTION CARDS GRID ── */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-blue-900/40 bg-[#06172F]/60 space-y-3 shadow-xl">
          <div className="p-3 rounded-full bg-white/5 w-12 h-12 mx-auto flex items-center justify-center text-white/40">
            <ActionCenterIcon className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No actions match this filter</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {filter === "NEEDS_YOU" 
              ? "Great news! You have no actions currently requiring your review."
              : "Try adjusting your search query or starting a new action above."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setFilter("ALL"); setSearchQuery(""); }}
            className="text-xs border-blue-900/40 text-white/80 hover:bg-white/10 mt-2"
          >
            Show All Actions
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const isAttention = !item.isCompleted && (item.responsibility === "CLIENT" || item.status === "NEEDS_YOUR_REVIEW");

            return (
              <Card
                key={item.id}
                className={`group relative rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between shadow-xl ${
                  isAttention
                    ? "bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] border-amber-400/60 shadow-[0_4px_30px_rgba(11,37,83,0.35)] hover:border-amber-400/90 hover:from-[#0E3068] hover:to-[#061A3B]"
                    : item.isCompleted
                    ? "bg-gradient-to-br from-[#06172F] to-[#041022] border-blue-900/30 hover:border-emerald-500/40"
                    : "bg-gradient-to-br from-[#081B36] to-[#051428] border-blue-900/40 hover:border-blue-500/50 hover:from-[#0B2447] hover:to-[#081B36]"
                }`}
              >
                <div>
                  {/* Top Bar: Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-white/40 group-hover:text-amber-400/80 transition-colors">
                      {item.category}
                    </span>
                    <div>
                      {renderStatusBadge(item.status, item.isCompleted)}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-amber-200 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/60 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Advocate Note Snippet if present */}
                  {item.notesFromAdvocate && !item.isCompleted && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-200/90 text-xs flex items-start gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed italic">
                        <span className="font-semibold text-amber-300 not-italic">Advocate Note:</span> {item.notesFromAdvocate}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Responsibility, Updated, & CTA */}
                <div className="mt-5 pt-3.5 border-t border-blue-900/30 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div>
                      {renderResponsibilityText(item.responsibility, item.status)}
                    </div>
                    <p className="text-[10px] text-white/40 font-mono">
                      {item.isCompleted && item.signedAt ? `Completed ${item.signedAt}` : `Updated ${item.lastUpdated}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Saved to Vault Link indicator */}
                    {item.savedToVault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateTab("smart-docs");
                        }}
                        title="View saved record in Document Vault"
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-center gap-1 border border-emerald-500/30 transition-colors"
                      >
                        <VaultSafeIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Vault</span>
                      </button>
                    )}

                    {/* Main CTA Button */}
                    <Button
                      size="sm"
                      onClick={() => handleOpenAction(item)}
                      className={`text-xs font-bold rounded-xl px-3.5 py-1.5 transition-all flex items-center gap-1.5 ${
                        isAttention
                          ? "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_12px_rgba(245,181,68,0.35)]"
                          : item.isCompleted
                          ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                          : "bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40"
                      }`}
                    >
                      {getActionCtaLabel(item)}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── ACTION WORKSPACE MODAL (DOCUMENT REVIEW & COLLABORATION) ── */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="max-w-2xl bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          {selectedAction && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase font-bold tracking-widest text-amber-400 font-mono">
                    {selectedAction.category}
                  </span>
                  <div>
                    {renderStatusBadge(selectedAction.status, selectedAction.isCompleted)}
                  </div>
                </div>
                <DialogTitle className="text-xl font-bold text-white mt-1">
                  {selectedAction.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/60">
                  {selectedAction.description}
                </DialogDescription>
              </DialogHeader>

              {/* Document Lifecycle Step Tracker */}
              <div className="p-3.5 rounded-xl bg-[#030C22] border border-blue-900/40">
                <div className="flex items-center justify-between text-[11px] text-white/60 mb-2">
                  <span className="font-semibold text-white">Workflow Lifecycle</span>
                  <span className="font-mono text-amber-300">
                    {selectedAction.isCompleted ? "✓ Archived to Vault" : selectedAction.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-medium">
                    1. Initiated
                  </div>
                  <div className={`p-1.5 rounded-lg font-medium ${
                    selectedAction.status === "DRAFT_IN_PROGRESS" 
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/40" 
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}>
                    2. Drafted
                  </div>
                  <div className={`p-1.5 rounded-lg font-medium ${
                    selectedAction.status === "NEEDS_YOUR_REVIEW" || selectedAction.status === "READY_FOR_SIGNATURE"
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 font-bold"
                      : selectedAction.isCompleted || selectedAction.status === "SENT"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/5 text-white/40"
                  }`}>
                    3. Parent Review
                  </div>
                  <div className={`p-1.5 rounded-lg font-medium ${
                    selectedAction.isCompleted
                      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 font-bold"
                      : "bg-white/5 text-white/40"
                  }`}>
                    4. Vault Stored
                  </div>
                </div>
              </div>

              {/* Advocate Note if present */}
              {selectedAction.notesFromAdvocate && (
                <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200">
                  <p className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Instructions from Byron Honea:
                  </p>
                  <p className="leading-relaxed">{selectedAction.notesFromAdvocate}</p>
                </div>
              )}

              {/* Working Document Content Preview */}
              {selectedAction.contentDraft && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70">
                    Document Text & Content:
                  </label>
                  <div className="p-4 rounded-xl bg-[#030C22] border border-blue-900/40 text-xs font-mono text-white/80 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {selectedAction.contentDraft}
                  </div>
                </div>
              )}

              {/* Review / Feedback input if not completed */}
              {!selectedAction.isCompleted && selectedAction.status !== "READY_FOR_SIGNATURE" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70">
                    Parent Comments / Additional Details for Waypoint:
                  </label>
                  <Textarea
                    value={clientComment}
                    onChange={(e) => setClientComment(e.target.value)}
                    placeholder="Enter any notes, corrections, or additional points for Byron to incorporate..."
                    className="bg-[#030C22] border-blue-900/40 text-xs text-white placeholder:text-white/30 rounded-xl focus-visible:ring-amber-400"
                    rows={3}
                  />
                </div>
              )}

              {/* Signature Section if ready for signature */}
              {selectedAction.status === "READY_FOR_SIGNATURE" && (
                <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/30 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <PenTool className="h-4 w-4" />
                    Electronic Signature Required
                  </div>
                  <p className="text-[11px] text-white/70">
                    By typing your legal name below, you confirm your approval of this document and authorize Waypoint Advocates to transmit it on your family's behalf.
                  </p>
                  <Input
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Type your full legal name to sign"
                    className="bg-[#030C22] border-amber-400/50 text-white text-xs rounded-xl focus-visible:ring-amber-400"
                  />
                </div>
              )}

              {/* Completed Document Vault Confirmation */}
              {selectedAction.isCompleted && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                      <VaultSafeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-300">Preserved in Document Vault</p>
                      <p className="text-[11px] text-white/60">
                        {selectedAction.vaultDocumentTitle || `${selectedAction.title} (Final)`}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsActionModalOpen(false);
                      onNavigateTab("smart-docs");
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
                  >
                    Open in Vault
                  </Button>
                </div>
              )}

              {/* Modal Footer Actions */}
              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-blue-900/30">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsActionModalOpen(false)}
                  className="border-blue-900/40 text-white/70 hover:bg-white/10 text-xs rounded-xl"
                >
                  Close
                </Button>

                {!selectedAction.isCompleted && selectedAction.status === "READY_FOR_SIGNATURE" && (
                  <Button
                    size="sm"
                    onClick={handleSignAction}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,181,68,0.3)]"
                  >
                    <FileSignature className="h-3.5 w-3.5" />
                    Sign & Finalize
                  </Button>
                )}

                {!selectedAction.isCompleted && selectedAction.status === "NEEDS_YOUR_REVIEW" && (
                  <Button
                    size="sm"
                    onClick={handleApproveAction}
                    className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,181,68,0.25)]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve & Proceed
                  </Button>
                )}

                {!selectedAction.isCompleted && selectedAction.status !== "NEEDS_YOUR_REVIEW" && selectedAction.status !== "READY_FOR_SIGNATURE" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.success("Draft saved.");
                      setIsActionModalOpen(false);
                    }}
                    className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl"
                  >
                    Save Changes
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── START A NEW ACTION MODAL (PERMITTED CLIENT WORKFLOWS ONLY) ── */}
      <Dialog open={isStartActionOpen} onOpenChange={setIsStartActionOpen}>
        <DialogContent className="max-w-xl bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-400" />
              Start an Action
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Select a guided request, statement, or workflow to collaborate on with Byron Honea.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-3">
            {PERMITTED_CLIENT_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleStartPermittedAction(action)}
                  className="w-full flex items-start gap-3.5 p-4 rounded-xl border border-blue-900/40 bg-blue-950/20 hover:bg-blue-900/30 hover:border-amber-400/50 text-left transition-all duration-200 group"
                >
                  <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors shrink-0 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {action.title}
                      </h4>
                      <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter className="pt-2 border-t border-blue-900/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStartActionOpen(false)}
              className="border-blue-900/40 text-white/70 hover:bg-white/10 text-xs rounded-xl w-full sm:w-auto"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
