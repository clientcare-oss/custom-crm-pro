import React, { useState, useMemo } from "react";
import {
  FileText,
  MoreHorizontal,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar,
  Phone,
  ArrowUpRight,
  ArrowRight,
  Clock,
  Activity,
  Sparkles,
  Columns3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageIdBadge from "@/components/PageIdBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DiscoveryCallItem, LeadStatus } from "./types";

export type TunerStageId = "new" | "discovery" | "decision" | "onboarding";

export interface TunerFamilyItem {
  id: number;
  stageId: TunerStageId;
  initials: string;
  parentName: string;
  studentName: string;
  gradeLabel: string;
  stateLabel: string;
  statusPill: string;
  collapsedSubtitle: string;
  collapsedActionLabel: string;
  whatFamilyWants: string;
  callDateTimeText?: string;
  hasScheduledCall?: boolean;
  rawLead?: any;
  contactId?: number;
}

export interface TunerStageMeta {
  id: TunerStageId;
  label: string;
  knobAngle: number; // degrees for the rotary indicator
  needlePercent: number; // % across the glass scale
  defaultStatus: LeadStatus;
}

export const TUNER_STAGES: TunerStageMeta[] = [
  {
    id: "new",
    label: "New inquiries",
    knobAngle: -54,
    needlePercent: 13.5,
    defaultStatus: "New",
  },
  {
    id: "discovery",
    label: "Discovery",
    knobAngle: -18,
    needlePercent: 38.5,
    defaultStatus: "Discovery Completed",
  },
  {
    id: "decision",
    label: "Decision",
    knobAngle: 18,
    needlePercent: 63.5,
    defaultStatus: "14 Day Follow-up",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    knobAngle: 54,
    needlePercent: 87.5,
    defaultStatus: "Approved for Enrollment",
  },
];

// Curated showcase families so every stage in the tuner feels alive & matches the design
const SHOWCASE_FAMILIES: TunerFamilyItem[] = [
  // Discovery (3 families — matches mockup exactly)
  {
    id: 90101,
    stageId: "discovery",
    initials: "EV",
    parentName: "Eleanor Vance",
    studentName: "Leo",
    gradeLabel: "Grade 4",
    stateLabel: "Georgia",
    statusPill: "Call scheduled",
    collapsedSubtitle: "Thursday, Nov 12 • 11:30 AM Eastern",
    collapsedActionLabel: "Prepare for call",
    whatFamilyWants: "Clear answers about reading support and a stronger IEP.",
    callDateTimeText: "Thursday, Nov 12 • 11:30 AM Eastern",
    hasScheduledCall: true,
  },
  {
    id: 90102,
    stageId: "discovery",
    initials: "MB",
    parentName: "Megan Brooks",
    studentName: "Noah",
    gradeLabel: "Grade 2",
    stateLabel: "Georgia",
    statusPill: "Ready to schedule",
    collapsedSubtitle: "Ready to schedule",
    collapsedActionLabel: "Schedule call",
    whatFamilyWants:
      "Guidance preparing for an upcoming eligibility meeting and speech evaluation review.",
    callDateTimeText: "Awaiting slot confirmation • Eastern",
    hasScheduledCall: false,
  },
  {
    id: 90103,
    stageId: "discovery",
    initials: "DC",
    parentName: "David Carter",
    studentName: "Miles",
    gradeLabel: "Grade 6",
    stateLabel: "Florida",
    statusPill: "Awaiting availability",
    collapsedSubtitle: "Awaiting availability",
    collapsedActionLabel: "Follow up",
    whatFamilyWants:
      "Support transitioning from a 504 plan to a full IEP with executive functioning accommodations.",
    callDateTimeText: "Requested afternoon availability • Eastern",
    hasScheduledCall: false,
  },

  // New inquiries (4 families)
  {
    id: 90201,
    stageId: "new",
    initials: "SH",
    parentName: "Sarah Henderson",
    studentName: "Caleb",
    gradeLabel: "Grade 3",
    stateLabel: "Georgia",
    statusPill: "New intake",
    collapsedSubtitle: "Submitted intake form • 35m ago",
    collapsedActionLabel: "Review intake",
    whatFamilyWants:
      "School denied initial evaluation request; family wants an independent advocacy review.",
    callDateTimeText: "Intake received today • Needs discovery slot",
    hasScheduledCall: false,
  },
  {
    id: 90202,
    stageId: "new",
    initials: "JR",
    parentName: "Jordan Ramirez",
    studentName: "Sofia",
    gradeLabel: "Grade 5",
    stateLabel: "North Carolina",
    statusPill: "New inquiry",
    collapsedSubtitle: "Website referral • Today",
    collapsedActionLabel: "Schedule call",
    whatFamilyWants:
      "Looking for an advocate to attend next month's annual IEP review and audit service hours.",
    callDateTimeText: "Preferred mornings • Eastern",
    hasScheduledCall: false,
  },
  {
    id: 90203,
    stageId: "new",
    initials: "KL",
    parentName: "Kendra Lawson",
    studentName: "Ethan",
    gradeLabel: "Grade 8",
    stateLabel: "Georgia",
    statusPill: "New inquiry",
    collapsedSubtitle: "Phone inquiry • Yesterday",
    collapsedActionLabel: "Send intake",
    whatFamilyWants:
      "Concerns about behavioral removals and requesting a Functional Behavior Assessment (FBA).",
    callDateTimeText: "Awaiting intake packet completion",
    hasScheduledCall: false,
  },
  {
    id: 90204,
    stageId: "new",
    initials: "TW",
    parentName: "Thomas Whitaker",
    studentName: "Hannah",
    gradeLabel: "Kindergarten",
    stateLabel: "Tennessee",
    statusPill: "New inquiry",
    collapsedSubtitle: "Pediatrician referral",
    collapsedActionLabel: "Schedule call",
    whatFamilyWants:
      "First-time IEP guidance for early intervention transition into public elementary school.",
    callDateTimeText: "Flexible availability this week",
    hasScheduledCall: false,
  },

  // Decision (2 families)
  {
    id: 90301,
    stageId: "decision",
    initials: "AP",
    parentName: "Amanda Price",
    studentName: "Lucas",
    gradeLabel: "Grade 7",
    stateLabel: "Georgia",
    statusPill: "Proposal sent",
    collapsedSubtitle: "14-Day Proposal active • Sent 2d ago",
    collapsedActionLabel: "Follow up",
    whatFamilyWants:
      "Comprehensive IEP audit and representation for upcoming manifestation determination review.",
    callDateTimeText: "Proposal follow-up due Friday • Eastern",
    hasScheduledCall: false,
  },
  {
    id: 90302,
    stageId: "decision",
    initials: "BM",
    parentName: "Brandon Mitchell",
    studentName: "Zoe",
    gradeLabel: "Grade 4",
    stateLabel: "Virginia",
    statusPill: "Reviewing plan",
    collapsedSubtitle: "Comparing Anchor vs. Navigator plan",
    collapsedActionLabel: "Follow up",
    whatFamilyWants:
      "Dyslexia reading intervention goals and Orton-Gillingham methodology placement.",
    callDateTimeText: "Second parent reviewing agreement",
    hasScheduledCall: false,
  },

  // Onboarding (1 family)
  {
    id: 90401,
    stageId: "onboarding",
    initials: "RN",
    parentName: "Rachel Nolan",
    studentName: "Owen",
    gradeLabel: "Grade 5",
    stateLabel: "Georgia",
    statusPill: "Uploading records",
    collapsedSubtitle: "Agreement signed • Uploading IEP",
    collapsedActionLabel: "Open file",
    whatFamilyWants:
      "Full IEP overhaul prior to district transition meeting and assistive technology evaluation.",
    callDateTimeText: "Onboarding kickoff • Records review next",
    hasScheduledCall: false,
  },
];

function getInitials(name: string): string {
  const parts = (name || "Family").trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || "FA").toUpperCase();
}

function mapLeadToTunerStage(lead: any): TunerStageId {
  const status = (lead.status || "New").toLowerCase();
  if (
    status.includes("approved") ||
    status.includes("won") ||
    status.includes("enroll")
  ) {
    return "onboarding";
  }
  if (
    status.includes("follow-up") ||
    status.includes("14 day") ||
    status.includes("30 day") ||
    status.includes("60 day") ||
    status.includes("90 day")
  ) {
    return "decision";
  }
  if (
    status.includes("discovery") ||
    Boolean(lead.discoveryCallDate)
  ) {
    return "discovery";
  }
  return "new";
}

interface LeadTunerConsoleProps {
  leads: any[];
  allDiscoveryCalls: DiscoveryCallItem[];
  onManageForms: () => void;
  onViewDiscoveryProcess: () => void;
  onQuickSetup: () => void;
  onAddLead: (defaultStatus?: LeadStatus) => void;
  onEditLead: (lead: any) => void;
  onStartDiscoveryCall: (leadId: number) => void;
  onToggleClassicView: () => void;
}

export function LeadTunerConsole({
  leads,
  allDiscoveryCalls,
  onManageForms,
  onViewDiscoveryProcess,
  onQuickSetup,
  onAddLead,
  onEditLead,
  onStartDiscoveryCall,
  onToggleClassicView,
}: LeadTunerConsoleProps) {
  // Default to "discovery" to match the user's reference design
  const [selectedStageId, setSelectedStageId] = useState<TunerStageId>("discovery");
  const [expandedCardId, setExpandedCardId] = useState<number>(90101);

  // Merge real database leads with showcase families so the tuner is always rich & interactive
  const familiesByStage = useMemo(() => {
    const grouped: Record<TunerStageId, TunerFamilyItem[]> = {
      new: [],
      discovery: [],
      decision: [],
      onboarding: [],
    };

    const seenNames = new Set<string>();

    // First, convert real database leads
    (leads || []).forEach((l: any) => {
      const stageId = mapLeadToTunerStage(l);
      const pName = (l.parentName || "Prospective Family").trim();
      seenNames.add(pName.toLowerCase());

      const hasCall = Boolean(l.discoveryCallDate);
      let callDateText = "";
      if (l.discoveryCallDate) {
        const d = new Date(l.discoveryCallDate);
        if (!isNaN(d.getTime())) {
          const datePart = d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
          const timePart = d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          callDateText = `${datePart} • ${timePart} Eastern`;
        }
      }

      const rawNotes = (l.notes || "").trim();
      const cleanedNotes = rawNotes
        .replace(/^Student:\s*[^.\n]+\.?\s*/i, "")
        .trim();

      grouped[stageId].push({
        id: l.id,
        stageId,
        initials: getInitials(pName),
        parentName: pName,
        studentName: l.studentName || "Student",
        gradeLabel: l.studentGrade
          ? String(l.studentGrade).toLowerCase().includes("grade")
            ? l.studentGrade
            : `Grade ${l.studentGrade}`
          : "Grade 4",
        stateLabel: "Georgia",
        statusPill: hasCall
          ? "Call scheduled"
          : stageId === "new"
          ? "New inquiry"
          : stageId === "decision"
          ? l.status || "Follow-up"
          : "Onboarding",
        collapsedSubtitle: hasCall
          ? callDateText
          : l.source
          ? `Source: ${l.source}`
          : "Ready to schedule",
        collapsedActionLabel: hasCall
          ? "Prepare for call"
          : stageId === "discovery"
          ? "Schedule call"
          : "Follow up",
        whatFamilyWants:
          cleanedNotes ||
          "Clear answers about reading support, appropriate accommodations, and a stronger IEP.",
        callDateTimeText: callDateText || "Ready to schedule • Eastern",
        hasScheduledCall: hasCall,
        rawLead: l,
        contactId: l.contactId,
      });
    });

    // Ensure showcase families are present so the tuner matches the exact reference layout
    SHOWCASE_FAMILIES.forEach((demo) => {
      if (!seenNames.has(demo.parentName.toLowerCase())) {
        grouped[demo.stageId].push(demo);
      }
    });

    return grouped;
  }, [leads]);

  const activeStageIndex = TUNER_STAGES.findIndex((s) => s.id === selectedStageId);
  const activeStageMeta = TUNER_STAGES[activeStageIndex] || TUNER_STAGES[1];
  const currentStageFamilies = familiesByStage[selectedStageId] || [];

  // Ensure one card in the active stage is expanded by default
  const effectiveExpandedId = useMemo(() => {
    if (currentStageFamilies.some((f) => f.id === expandedCardId)) {
      return expandedCardId;
    }
    return currentStageFamilies[0]?.id ?? -1;
  }, [currentStageFamilies, expandedCardId]);

  const handleSelectStage = (stageId: TunerStageId) => {
    setSelectedStageId(stageId);
    const firstInStage = familiesByStage[stageId]?.[0];
    if (firstInStage) {
      setExpandedCardId(firstInStage.id);
    }
  };

  const handleStepStage = (delta: number) => {
    const nextIdx =
      (activeStageIndex + delta + TUNER_STAGES.length) % TUNER_STAGES.length;
    handleSelectStage(TUNER_STAGES[nextIdx].id);
  };

  // Resolve Next Discovery Call for the right-hand card
  const nextCallDisplay = useMemo(() => {
    const now = new Date();
    const upcoming = [...allDiscoveryCalls]
      .filter((c) => c.date >= new Date(now.getTime() - 3600 * 1000))
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    if (upcoming) {
      const weekday = upcoming.date
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();
      const dayNum = String(upcoming.date.getDate());
      const month = upcoming.date
        .toLocaleDateString("en-US", { month: "short" })
        .toUpperCase();
      return {
        weekday,
        dayNum,
        month,
        time: upcoming.timeDisplay || "11:30 AM",
        parentName: upcoming.parentName || "Eleanor Vance",
        durationAndZone: `30 minutes • ${upcoming.friendlyTz || "Eastern"} time`,
        leadId: upcoming.leadId || 0,
      };
    }

    // Fallback to Eleanor Vance from reference design
    return {
      weekday: "THU",
      dayNum: "12",
      month: "NOV",
      time: "11:30 AM",
      parentName: "Eleanor Vance",
      durationAndZone: "30 minutes • Eastern time",
      leadId: 0,
    };
  }, [allDiscoveryCalls]);

  const scheduledCallsInStageCount = useMemo(() => {
    return currentStageFamilies.filter((f) => f.hasScheduledCall).length;
  }, [currentStageFamilies]);

  const handleInspectOrEditFamily = (family: TunerFamilyItem) => {
    if (family.rawLead) {
      onEditLead(family.rawLead);
    } else {
      // Open pre-populated Lead Modal for showcase family
      onEditLead({
        id: undefined,
        parentName: family.parentName,
        studentName: family.studentName,
        studentGrade: family.gradeLabel.replace(/^Grade\s+/i, ""),
        status: activeStageMeta.defaultStatus,
        notes: family.whatFamilyWants,
        source: "Website Intake",
      });
    }
  };

  return (
    <div
      className="min-h-screen w-full text-[#FFF4D4] select-none"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #10294E 0%, #06142A 50%, #030A16 100%)",
      }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-7 lg:px-10 pt-5 pb-14 space-y-6">
        {/* ─── 1. TOP HEADER BAR ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1
                className="text-3xl sm:text-[38px] font-bold tracking-tight text-[#FFF4D4] leading-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Lead Center
              </h1>
              <PageIdBadge id="PG-003" />
            </div>
            <p
              className="text-sm sm:text-[17px] text-[#C8B99B] mt-1.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Tune in to the next family.
            </p>
          </div>

          {/* Right Header Controls: Manage forms | ••• | + Add lead */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              type="button"
              onClick={onManageForms}
              className="h-10 px-4 rounded-lg bg-[#0B1C36]/90 hover:bg-[#12294D] border border-[#2B4368] hover:border-[#C5A059]/60 text-[#E2EDF8] hover:text-[#FFF4D4] text-xs sm:text-sm font-medium inline-flex items-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#B8CCE4]" />
              <span>Manage forms</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More Lead Center options"
                  className="h-10 w-10 rounded-lg bg-[#0B1C36]/90 hover:bg-[#12294D] border border-[#2B4368] hover:border-[#C5A059]/60 text-[#E2EDF8] hover:text-[#FFE394] inline-flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 bg-[#07162B] border border-[#3A2C18] text-[#FFF4D4] shadow-2xl"
              >
                <DropdownMenuItem
                  onClick={onViewDiscoveryProcess}
                  className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
                >
                  <Phone className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Discovery Call Console (PG-003-DC)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onQuickSetup}
                  className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Quick Setup & Intake Routing</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#3A2C18]/60" />
                <DropdownMenuItem
                  onClick={onToggleClassicView}
                  className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
                >
                  <Columns3 className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Switch to Classic Columns View</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => onAddLead(activeStageMeta.defaultStatus)}
              className="h-10 px-4 sm:px-5 rounded-lg bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] hover:from-[#F2DC9C] hover:via-[#D8B05E] hover:to-[#AD8333] text-[#07162B] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 border border-[#FFE5A3]/80 shadow-[0_4px_14px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.45)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add lead</span>
            </button>
          </div>
        </div>

        {/* ─── 2. BESPOKE BRASS & NAVY RADIO TUNER STAGE CONSOLE ─── */}
        <div
          className="relative rounded-[22px] p-[3px] shadow-[0_18px_45px_rgba(0,0,0,0.9),0_0_0_1px_rgba(0,0,0,0.8)]"
          style={{
            background:
              "linear-gradient(180deg, #E5C67E 0%, #9F7833 25%, #5A4016 55%, #B88E42 85%, #6A4C1B 100%)",
          }}
        >
          {/* Inner Navy Leather Instrument Chassis */}
          <div
            className="relative rounded-[19px] px-4 sm:px-6 py-4 sm:py-5 border border-[#FFE394]/30 overflow-hidden"
            style={{
              backgroundColor: "#071428",
              backgroundImage: `
                radial-gradient(ellipse at 30% 50%, rgba(197, 160, 89, 0.08) 0%, transparent 65%),
                repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px),
                repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px)
              `,
              boxShadow:
                "inset 0 3px 12px rgba(0,0,0,0.85), inset 0 -2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {/* 4 Corner Brass Rivets */}
            <span className="absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#FFE5A3] via-[#B88B3A] to-[#4A3310] border border-[#241705] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#FFE5A3] via-[#B88B3A] to-[#4A3310] border border-[#241705] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
            <span className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#FFE5A3] via-[#B88B3A] to-[#4A3310] border border-[#241705] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
            <span className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#FFE5A3] via-[#B88B3A] to-[#4A3310] border border-[#241705] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* LEFT 8 COLS: Recessed Brass-Rimmed Frequency Glass Window */}
              <div className="lg:col-span-8">
                <div
                  className="rounded-[26px] p-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,240,190,0.4)]"
                  style={{
                    background:
                      "linear-gradient(180deg, #6E501E 0%, #D5B168 50%, #593E14 100%)",
                  }}
                >
                  <div
                    className="relative rounded-[23px] px-3 sm:px-6 pt-4 pb-3 overflow-hidden border border-[#FFE5A3]/35"
                    style={{
                      background:
                        "linear-gradient(180deg, #0D1A2D 0%, #15253B 48%, #222B35 82%, #2B2A29 100%)",
                      boxShadow:
                        "inset 0 6px 18px rgba(0,0,0,0.9), inset 0 -4px 12px rgba(0,0,0,0.65)",
                    }}
                  >
                    {/* Dynamic Warm Golden Spotlight Glow Behind Active Stage */}
                    <div
                      className="pointer-events-none absolute inset-y-0 w-48 -translate-x-1/2 transition-all duration-300 ease-out"
                      style={{
                        left: `${activeStageMeta.needlePercent}%`,
                        background:
                          "radial-gradient(ellipse at 50% 62%, rgba(255, 205, 105, 0.42) 0%, rgba(212, 155, 62, 0.16) 45%, transparent 75%)",
                      }}
                    />

                    {/* Top Glass Highlight Reflection */}
                    <div
                      className="pointer-events-none absolute inset-x-6 top-1 h-[1px] opacity-40"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                      }}
                    />

                    {/* 4 Stage Columns Inside the Tuner Window */}
                    <div className="relative z-10 grid grid-cols-4 divide-x divide-[#C5A059]/25">
                      {TUNER_STAGES.map((stage) => {
                        const count = familiesByStage[stage.id]?.length || 0;
                        const isSelected = stage.id === selectedStageId;
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={() => handleSelectStage(stage.id)}
                            className="group flex flex-col items-center justify-center px-1.5 py-1 transition-all cursor-pointer focus:outline-hidden"
                          >
                            <span
                              className={cn(
                                "font-serif text-xs sm:text-[17px] tracking-tight transition-colors line-clamp-1",
                                isSelected
                                  ? "font-bold text-[#FFFFFF] drop-shadow-[0_0_10px_rgba(255,227,148,0.6)]"
                                  : "font-medium text-[#D0C5B0] group-hover:text-[#FFF4D4]"
                              )}
                              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            >
                              {stage.label}
                            </span>

                            <span
                              className={cn(
                                "mt-1.5 min-w-[30px] sm:min-w-[34px] h-5 sm:h-6 px-2 rounded-full text-xs sm:text-sm font-bold inline-flex items-center justify-center transition-all",
                                isSelected
                                  ? "bg-gradient-to-b from-[#FFE08C] to-[#C8963E] text-[#1A1205] border border-[#FFF3C4] shadow-[0_0_14px_rgba(255,215,115,0.75)]"
                                  : "bg-[#2C2823]/90 text-[#DFC89C] border border-[#7D6335]/60 group-hover:border-[#C5A059]"
                              )}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Horizontal Brass Frequency Scale + Ticks + Sliding Conical Brass Needle */}
                    <div className="relative z-10 mt-4 pt-2 pb-4 px-2">
                      {/* Horizontal Scale Line */}
                      <div className="relative h-[2px] w-full bg-gradient-to-r from-[#6E5528] via-[#E5C175] to-[#6E5528] shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {/* Scale Tick Marks */}
                        {[6, 13.5, 21, 29, 38.5, 47, 55, 63.5, 72, 80, 87.5, 94].map(
                          (pct, idx) => {
                            const isMajor =
                              pct === 13.5 ||
                              pct === 38.5 ||
                              pct === 63.5 ||
                              pct === 87.5;
                            return (
                              <span
                                key={idx}
                                style={{ left: `${pct}%` }}
                                className={cn(
                                  "absolute -translate-x-1/2 -top-1.5 w-[1.5px]",
                                  isMajor
                                    ? "h-3.5 -top-1.5 bg-[#FFE394]"
                                    : "h-2 -top-1 bg-[#C5A059]/65"
                                )}
                              />
                            );
                          }
                        )}

                        {/* Glowing Conical Brass Pointer Needle */}
                        <div
                          className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center transition-all duration-300 ease-out"
                          style={{ left: `${activeStageMeta.needlePercent}%` }}
                        >
                          {/* Glowing Tip Halo */}
                          <div className="w-3 h-3 rounded-full bg-[#FFE394] blur-[4px] opacity-90 -mb-2" />
                          {/* Conical Brass Needle SVG */}
                          <svg
                            width="16"
                            height="28"
                            viewBox="0 0 16 28"
                            fill="none"
                            className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]"
                          >
                            <path
                              d="M8 0L13.5 26H2.5L8 0Z"
                              fill="url(#needle-brass-grad)"
                              stroke="#FFE8A3"
                              strokeWidth="0.7"
                            />
                            <defs>
                              <linearGradient
                                id="needle-brass-grad"
                                x1="2.5"
                                y1="0"
                                x2="13.5"
                                y2="26"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#FFF6D6" />
                                <stop offset="0.45" stopColor="#DDA84B" />
                                <stop offset="1" stopColor="#6E4812" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                      </div>

                      {/* Active Stage Family Count Label Under Needle */}
                      <div className="mt-3 text-center">
                        <span
                          className="font-serif italic text-xs sm:text-sm text-[#FFF4D4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {currentStageFamilies.length}{" "}
                          {currentStageFamilies.length === 1 ? "family" : "families"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT 4 COLS: Tactile Rotary Brass Knob ("SELECT STAGE") */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center py-1">
                {/* SELECT STAGE Header with Flanking Brass Lines */}
                <div className="flex items-center gap-2.5 w-full max-w-[240px] justify-center mb-2.5">
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#C5A059]/70" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#DFC89C]">
                    SELECT STAGE
                  </span>
                  <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#C5A059]/70" />
                </div>

                {/* Left Step < | Machined Brass Rotary Dial | Right Step > */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleStepStage(-1)}
                    aria-label="Previous stage"
                    className="w-8 h-8 rounded-full bg-[#09182E] hover:bg-[#122B4E] border border-[#C5A059]/70 text-[#FFE394] flex items-center justify-center shadow-[0_3px_8px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] transition-transform active:scale-95 cursor-pointer"
                    title="Tune Left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* 3D Machined Conical Brass Knob (Click to cycle stage) */}
                  <button
                    type="button"
                    onClick={() => handleStepStage(1)}
                    title={`Current stage: ${activeStageMeta.label} (Click to turn dial)`}
                    className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[5px] flex items-center justify-center shadow-[0_12px_28px_rgba(0,0,0,0.95),0_0_0_2px_#2A1C08] cursor-pointer transition-transform active:scale-98 focus:outline-hidden"
                    style={{
                      background:
                        "linear-gradient(145deg, #F0D28C 0%, #9E762C 45%, #4A320E 100%)",
                    }}
                  >
                    {/* Outer Knurled Dark Bezel Ring */}
                    <div className="w-full h-full rounded-full p-[5px] bg-[#181209] border border-[#FFE394]/40 flex items-center justify-center shadow-inner">
                      {/* Conical Brushed Brass Face */}
                      <div
                        className="relative w-full h-full rounded-full border border-[#FFE5A3]/60 shadow-[inset_0_2px_6px_rgba(255,255,255,0.35),inset_0_-4px_8px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-out"
                        style={{
                          transform: `rotate(${activeStageMeta.knobAngle}deg)`,
                          background: `conic-gradient(
                            from 0deg at 50% 50%,
                            #6E4F1D 0deg,
                            #D5B067 40deg,
                            #FFF0C2 65deg,
                            #B88D3D 105deg,
                            #4E3610 155deg,
                            #A67C33 200deg,
                            #F2D388 245deg,
                            #8C6523 305deg,
                            #6E4F1D 360deg
                          )`,
                        }}
                      >
                        {/* Illuminated Ivory/Gold Indicator Notch at Top of Knob */}
                        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[3px] h-4 rounded-full bg-[#FFFDF5] shadow-[0_0_8px_#FFE394,0_1px_2px_rgba(0,0,0,0.9)]" />
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStepStage(1)}
                    aria-label="Next stage"
                    className="w-8 h-8 rounded-full bg-[#09182E] hover:bg-[#122B4E] border border-[#C5A059]/70 text-[#FFE394] flex items-center justify-center shadow-[0_3px_8px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] transition-transform active:scale-95 cursor-pointer"
                    title="Tune Right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <p
                  className="font-serif italic text-xs text-[#C6B697] mt-2.5 text-center"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Turn the dial or choose a stage
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. TWO-COLUMN WORKSPACE: STAGE FAMILIES (LEFT) + NEXT CALL & ACTIVITY (RIGHT) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 pt-1 items-start">
          {/* LEFT 8 COLUMNS: Selected Stage Header + Family Accordion Cards */}
          <div className="lg:col-span-8 space-y-4">
            {/* Stage Section Header */}
            <div>
              <h2
                className="text-2xl sm:text-[31px] font-bold text-[#FFF4D4] tracking-tight leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {activeStageMeta.label}
              </h2>
              <p className="text-xs sm:text-sm text-[#B8C7DC] mt-0.5">
                {currentStageFamilies.length}{" "}
                {currentStageFamilies.length === 1 ? "family" : "families"}
                {scheduledCallsInStageCount > 0
                  ? ` • ${scheduledCallsInStageCount} ${
                      scheduledCallsInStageCount === 1 ? "call" : "calls"
                    } coming up`
                  : " • Ready for advocate action"}
              </p>
            </div>

            {/* Family Cards Stack */}
            <div className="space-y-3">
              {currentStageFamilies.map((family) => {
                const isExpanded = family.id === effectiveExpandedId;

                if (isExpanded) {
                  return (
                    <div
                      key={family.id}
                      className="rounded-xl p-[1.5px] shadow-[0_14px_34px_rgba(0,0,0,0.85)] transition-all"
                      style={{
                        background:
                          "linear-gradient(180deg, #E2C178 0%, #8F6B29 50%, #5B4115 100%)",
                      }}
                    >
                      <div className="rounded-[11px] bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] px-4 sm:px-6 py-4 sm:py-5 border border-[#FFE5A3]/20">
                        {/* Top Row: Monogram Badge + Name & Student Info + Status Pill + Collapse Chevron */}
                        <div
                          onClick={() => setExpandedCardId(-1)}
                          className="flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-[#1A2421] border border-[#C5A059]/65 text-[#FFE394] font-serif font-bold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_2px_6px_rgba(0,0,0,0.6)]">
                              {family.initials}
                            </div>
                            <div className="min-w-0">
                              <h3
                                className="text-lg sm:text-[22px] font-bold text-[#FFF4D4] truncate leading-tight"
                                style={{
                                  fontFamily: "'Playfair Display', Georgia, serif",
                                }}
                              >
                                {family.parentName}
                              </h3>
                              <p className="text-xs sm:text-sm text-[#B8C7DC] truncate mt-0.5">
                                {family.studentName} • {family.gradeLabel} •{" "}
                                {family.stateLabel}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="rounded-full px-3 py-1 text-xs font-medium bg-[#152C4E] border border-[#2F4F7F] text-[#DCEAFE] shadow-xs">
                              {family.statusPill}
                            </span>
                            <button
                              type="button"
                              aria-label="Collapse family card"
                              className="w-7 h-7 rounded-md flex items-center justify-center text-[#C5A059] hover:text-[#FFE394] transition-colors cursor-pointer"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Middle Section: WHAT THE FAMILY WANTS */}
                        <div className="mt-4 pt-3.5 border-t border-[#1E3558]/90">
                          <div className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-[#D8B979]">
                            WHAT THE FAMILY WANTS
                          </div>
                          <p className="text-sm sm:text-[15.5px] text-[#F0F6FC] mt-1 leading-relaxed">
                            {family.whatFamilyWants}
                          </p>
                        </div>

                        {/* Bottom Action Row: Date/Time + Prepare for call + View intake ↗ */}
                        <div className="mt-4 pt-3.5 border-t border-[#1E3558]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#E2EDF8]">
                            <Calendar className="w-4 h-4 text-[#E5C175] shrink-0" />
                            <span>
                              {family.callDateTimeText ||
                                "Thursday, Nov 12 • 11:30 AM Eastern"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() =>
                                onStartDiscoveryCall(
                                  family.rawLead?.id || family.id
                                )
                              }
                              className="h-9 px-4 rounded-lg bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] hover:from-[#F2DC9C] hover:via-[#D8B05E] hover:to-[#AD8333] text-[#07162B] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 border border-[#FFE5A3] shadow-[0_3px_10px_rgba(0,0,0,0.6)] transition-all cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Prepare for call</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleInspectOrEditFamily(family)}
                              className="text-xs sm:text-sm font-medium text-[#C8D7EC] hover:text-[#FFE394] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>View intake</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Collapsed Family Row Card (Megan Brooks, David Carter, etc.)
                return (
                  <div
                    key={family.id}
                    onClick={() => setExpandedCardId(family.id)}
                    className="group rounded-xl border border-[#243B61] hover:border-[#C5A059]/65 bg-gradient-to-b from-[#0A1B34]/95 to-[#061224]/95 px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 shadow-[0_6px_18px_rgba(0,0,0,0.6)] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#1A2421]/90 border border-[#C5A059]/55 text-[#FFE394] font-serif font-bold text-sm sm:text-base flex items-center justify-center shrink-0">
                        {family.initials}
                      </div>
                      <div className="min-w-0">
                        <h3
                          className="text-base sm:text-lg font-bold text-[#FFF4D4] group-hover:text-[#FFE394] truncate transition-colors"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                          }}
                        >
                          {family.parentName}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#9FB2CD] truncate">
                          {family.collapsedSubtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectOrEditFamily(family);
                        }}
                        className="text-xs sm:text-sm font-medium text-[#C8D7EC] hover:text-[#FFE394] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{family.collapsedActionLabel}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                      <ChevronDown className="w-4 h-4 text-[#C5A059] group-hover:translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: Next discovery call + Recent activity */}
          <div className="lg:col-span-4 lg:border-l lg:border-[#3A2C18]/80 lg:pl-7 space-y-6">
            {/* Widget 1: Next discovery call */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#E5C175]" />
                <h3
                  className="text-lg sm:text-xl font-bold text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Next discovery call
                </h3>
              </div>

              <div className="rounded-xl border border-[#2B4368] bg-gradient-to-b from-[#0B1D38] via-[#08162C] to-[#050F1F] p-4 sm:p-5 shadow-[0_10px_28px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-4">
                  {/* Left Date Column: THU / 12 / NOV */}
                  <div className="pr-4 border-r border-[#233B5E] flex flex-col items-center justify-center min-w-[64px] text-center">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#B0C2D8]">
                      {nextCallDisplay.weekday}
                    </span>
                    <span
                      className="text-3xl sm:text-4xl font-bold text-[#FFF4D4] leading-none my-1"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {nextCallDisplay.dayNum}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#B0C2D8]">
                      {nextCallDisplay.month}
                    </span>
                  </div>

                  {/* Right Call Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#FFE394]">
                      <Clock className="w-3.5 h-3.5 text-[#E5C175] shrink-0" />
                      <span>{nextCallDisplay.time}</span>
                    </div>
                    <div
                      className="text-base sm:text-lg font-bold text-[#FFF4D4] truncate mt-0.5"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {nextCallDisplay.parentName}
                    </div>
                    <div className="text-xs text-[#9FB2CD] mt-0.5">
                      {nextCallDisplay.durationAndZone}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onStartDiscoveryCall(nextCallDisplay.leadId)}
                  className="mt-4 w-full h-9 rounded-full bg-[#091931] hover:bg-[#122B4E] border border-[#C5A059]/70 text-[#FFF4D4] hover:text-[#FFE394] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-all cursor-pointer"
                >
                  <span>Open call console</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E5C175]" />
                </button>
              </div>
            </div>

            {/* Subtle Horizontal Divider */}
            <div className="border-t border-[#1E3354]" />

            {/* Widget 2: Recent activity */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#E5C175]" />
                <h3
                  className="text-lg sm:text-xl font-bold text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Recent activity
                </h3>
              </div>

              <div className="relative pl-5 space-y-5 before:content-[''] before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gradient-to-b before:from-[#E5C175] before:via-[#C5A059]/60 before:to-transparent">
                {/* Timeline Event 1 */}
                <div className="relative">
                  <span className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-[#FFE394] border border-[#07162B] shadow-[0_0_8px_#FFE394]" />
                  <div className="text-sm font-semibold text-[#FFF4D4]">
                    New intake received
                  </div>
                  <div className="text-xs text-[#9FB2CD] mt-0.5">
                    Eleanor Vance • 2 hours ago
                  </div>
                </div>

                {/* Timeline Event 2 */}
                <div className="relative">
                  <span className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-[#D5B067] border border-[#07162B] shadow-[0_0_6px_rgba(213,176,103,0.7)]" />
                  <div className="text-sm font-semibold text-[#FFF4D4]">
                    Discovery call scheduled
                  </div>
                  <div className="text-xs text-[#9FB2CD] mt-0.5">
                    Eleanor Vance • Thu, Nov 12 at 11:30 AM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
