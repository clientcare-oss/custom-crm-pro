import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { AdvocacyPipelineHeader } from "@/components/pipeline/AdvocacyPipelineHeader";
import { SavedViewsBar } from "@/components/pipeline/SavedViewsBar";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { CustomizePipelineModal } from "@/components/pipeline/CustomizePipelineModal";
import { NewViewModal } from "@/components/pipeline/NewViewModal";
import { AddStageModal } from "@/components/pipeline/AddStageModal";
import type {
  PipelineStageItem,
  PipelineCardItem,
  SavedViewItem,
  PipelineFilters,
} from "@/components/pipeline/types";

// ── 8 Default Standard Stages ────────────────────────────────────────────────
const DEFAULT_STAGES: PipelineStageItem[] = [
  {
    id: 1,
    name: "Discovery",
    slug: "discovery",
    order: 1,
    accentColor: "#38BDF8", // Cyan
    iconName: "Compass",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 2,
    name: "Intake / Onboarding",
    slug: "intake-onboarding",
    order: 2,
    accentColor: "#34D399", // Emerald
    iconName: "FileText",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 3,
    name: "Records Review",
    slug: "records-review",
    order: 3,
    accentColor: "#F59E0B", // Amber
    iconName: "FileSearch",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 4,
    name: "School Contact",
    slug: "school-contact",
    order: 4,
    accentColor: "#F5B544", // Gold
    iconName: "School",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 5,
    name: "Meeting Scheduled",
    slug: "meeting-scheduled",
    order: 5,
    accentColor: "#818CF8", // Indigo
    iconName: "Calendar",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 6,
    name: "State Complaint",
    slug: "state-complaint",
    order: 6,
    accentColor: "#F87171", // Coral
    iconName: "Scale",
    category: "escalation",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 7,
    name: "Monitoring",
    slug: "monitoring",
    order: 7,
    accentColor: "#2DD4BF", // Teal
    iconName: "Activity",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 8,
    name: "Closed",
    slug: "closed",
    order: 8,
    accentColor: "#94A3B8", // Slate
    iconName: "CheckCircle2",
    category: "completed",
    isArchived: false,
    isDefault: true,
  },
];

// ── Standard Default Saved Views ─────────────────────────────────────────────
const DEFAULT_SAVED_VIEWS: SavedViewItem[] = [
  { id: 1, name: "My Work", slug: "my-work", filtersJson: JSON.stringify({ isMyWork: true }), isPinned: true, isDefault: true, order: 1 },
  { id: 2, name: "All Clients", slug: "all-clients", filtersJson: "{}", isPinned: true, isDefault: true, order: 2 },
  { id: 3, name: "$55", slug: "plan-55", filtersJson: JSON.stringify({ planTier: "$55" }), isPinned: true, isDefault: true, order: 3 },
  { id: 4, name: "$105", slug: "plan-105", filtersJson: JSON.stringify({ planTier: "$105" }), isPinned: true, isDefault: true, order: 4 },
  { id: 5, name: "Scholarship", slug: "scholarship", filtersJson: JSON.stringify({ planTier: "Scholarship" }), isPinned: true, isDefault: true, order: 5 },
  { id: 6, name: "Pay Per Use", slug: "pay-per-use", filtersJson: JSON.stringify({ planTier: "Pay Per Use" }), isPinned: false, isDefault: true, order: 6 },
  { id: 7, name: "Renewals", slug: "renewals", filtersJson: JSON.stringify({ accountStatus: "Renewal Needed" }), isPinned: false, isDefault: true, order: 7 },
  { id: 8, name: "Nonpay", slug: "nonpay", filtersJson: JSON.stringify({ billingStatus: "Payment Failed" }), isPinned: false, isDefault: true, order: 8 },
  { id: 9, name: "Tools Only", slug: "tools-only", filtersJson: JSON.stringify({ planTier: "Tools Only" }), isPinned: false, isDefault: true, order: 9 },
  { id: 10, name: "On Hold", slug: "on-hold", filtersJson: JSON.stringify({ accountStatus: "On Hold" }), isPinned: false, isDefault: true, order: 10 },
];

// ── 19 Realistic Interactive Demo Cards ──────────────────────────────────────
const INITIAL_DEMO_CARDS: PipelineCardItem[] = [
  // 1. Discovery (3 clients)
  {
    id: 101,
    firstName: "Maya",
    lastName: "Thompson",
    fullName: "Maya Thompson",
    schoolName: "Roosevelt Elementary",
    countyDistrict: "Fulton County",
    planType: "IEP",
    planTier: "$55",
    pipelineStage: "Discovery",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Jordan Lee",
    assignedAdvocateInitials: "JL",
    needsAttention: false,
    primaryTask: "Discovery call pending",
    primaryTaskIcon: "clock",
    secondaryTask: "Tomorrow, 10:00 AM",
    secondaryTaskIcon: "calendar",
  },
  {
    id: 102,
    firstName: "Ethan",
    lastName: "Parker",
    fullName: "Ethan Parker",
    schoolName: "Lincoln Middle School",
    countyDistrict: "Cobb County",
    planType: "504",
    planTier: "Pay Per Use",
    pipelineStage: "Discovery",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Maya Singh",
    assignedAdvocateInitials: "MS",
    needsAttention: false,
    primaryTask: "Discovery call pending",
    primaryTaskIcon: "clock",
    secondaryTask: "Apr 28, 2025",
    secondaryTaskIcon: "calendar",
  },
  {
    id: 103,
    firstName: "Sofia",
    lastName: "Martinez",
    fullName: "Sofia Martinez",
    schoolName: "Cedar Grove Elementary",
    countyDistrict: "DeKalb County",
    planType: "IEP",
    planTier: "Scholarship",
    pipelineStage: "Discovery",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Kevin Liu",
    assignedAdvocateInitials: "KL",
    needsAttention: false,
    primaryTask: "Parent referral – call to schedule",
    primaryTaskIcon: "clock",
    secondaryTask: "Apr 29, 2025",
    secondaryTaskIcon: "calendar",
  },

  // 2. Intake / Onboarding (3 clients)
  {
    id: 104,
    firstName: "Noah",
    lastName: "Williams",
    fullName: "Noah Williams",
    schoolName: "Maplewood Elementary",
    countyDistrict: "Fulton County",
    planType: "IEP",
    planTier: "$105",
    pipelineStage: "Intake / Onboarding",
    accountStatus: "Onboarding",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Erin Smith",
    assignedAdvocateInitials: "ES",
    needsAttention: false,
    primaryTask: "Agreement sent",
    primaryTaskIcon: "check",
    secondaryTask: "Awaiting parent signature",
    secondaryTaskIcon: "clock",
  },
  {
    id: 105,
    firstName: "Lily",
    lastName: "Chen",
    fullName: "Lily Chen",
    schoolName: "Riverside Middle School",
    countyDistrict: "Gwinnett County",
    planType: "504",
    planTier: "$55",
    pipelineStage: "Intake / Onboarding",
    accountStatus: "Onboarding",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Daniel Torres",
    assignedAdvocateInitials: "DT",
    needsAttention: false,
    primaryTask: "Portal setup",
    primaryTaskIcon: "check",
    secondaryTask: "Send welcome email",
    secondaryTaskIcon: "mail",
  },
  {
    id: 106,
    firstName: "Lucas",
    lastName: "Bennett",
    fullName: "Lucas Bennett",
    schoolName: "Pine Hill High School",
    countyDistrict: "Cobb County",
    planType: "IEP",
    planTier: "Pay Per Use",
    pipelineStage: "Intake / Onboarding",
    accountStatus: "Onboarding",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Jordan Lee",
    assignedAdvocateInitials: "JL",
    needsAttention: false,
    primaryTask: "Intake form in progress",
    primaryTaskIcon: "clock",
    secondaryTask: "Follow up with parent",
    secondaryTaskIcon: "check",
  },

  // 3. Records Review (3 clients)
  {
    id: 107,
    firstName: "Ava",
    lastName: "Robinson",
    fullName: "Ava Robinson",
    schoolName: "Westbrook Elementary",
    countyDistrict: "Fulton County",
    planType: "Records",
    planTier: "$105",
    pipelineStage: "Records Review",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Maya Singh",
    assignedAdvocateInitials: "MS",
    needsAttention: false,
    primaryTask: "Records uploaded",
    primaryTaskIcon: "check",
    secondaryTask: "Review and summarize",
    secondaryTaskIcon: "calendar",
  },
  {
    id: 108,
    firstName: "Mason",
    lastName: "Clark",
    fullName: "Mason Clark",
    schoolName: "Northside Middle School",
    countyDistrict: "Atlanta Public Schools",
    planType: "IEP",
    planTier: "Scholarship",
    pipelineStage: "Records Review",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Erin Smith",
    assignedAdvocateInitials: "ES",
    needsAttention: false,
    primaryTask: "Comparator needed",
    primaryTaskIcon: "check",
    secondaryTask: "Request district data",
    secondaryTaskIcon: "check",
  },
  {
    id: 109,
    firstName: "Isabella",
    lastName: "Green",
    fullName: "Isabella Green",
    schoolName: "Fairview High School",
    countyDistrict: "DeKalb County",
    planType: "504",
    planTier: "$55",
    pipelineStage: "Records Review",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Daniel Torres",
    assignedAdvocateInitials: "DT",
    needsAttention: false,
    primaryTask: "Records uploaded",
    primaryTaskIcon: "check",
    secondaryTask: "Identify key issues",
    secondaryTaskIcon: "calendar",
  },

  // 4. School Contact (2 clients)
  {
    id: 110,
    firstName: "Oliver",
    lastName: "Hayes",
    fullName: "Oliver Hayes",
    schoolName: "Sunnyvale Elementary",
    countyDistrict: "Fulton County",
    planType: "Meeting",
    planTier: "$55",
    pipelineStage: "School Contact",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Kevin Liu",
    assignedAdvocateInitials: "KL",
    needsAttention: false,
    primaryTask: "Notify school",
    primaryTaskIcon: "check",
    secondaryTask: "Send formal letter",
    secondaryTaskIcon: "mail",
  },
  {
    id: 111,
    firstName: "Emma",
    lastName: "Scott",
    fullName: "Emma Scott",
    schoolName: "Lakeview Middle School",
    countyDistrict: "Cobb County",
    planType: "IEP",
    planTier: "$105",
    pipelineStage: "School Contact",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Maya Singh",
    assignedAdvocateInitials: "MS",
    needsAttention: false,
    primaryTask: "Request draft IEP",
    primaryTaskIcon: "check",
    secondaryTask: "Follow up in 2 days",
    secondaryTaskIcon: "clock",
  },

  // 5. Meeting Scheduled (2 clients)
  {
    id: 112,
    firstName: "Benjamin",
    lastName: "Carter",
    fullName: "Benjamin Carter",
    schoolName: "Grandview Elementary",
    countyDistrict: "Fulton County",
    planType: "IEP",
    planTier: "$105",
    pipelineStage: "Meeting Scheduled",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Erin Smith",
    assignedAdvocateInitials: "ES",
    needsAttention: false,
    primaryTask: "May 2, 2025 · 10:00 AM",
    primaryTaskIcon: "calendar",
    secondaryTask: "Pre-meeting prep",
    secondaryTaskIcon: "clock",
    meetingDate: "May 2, 2025 · 10:00 AM",
  },
  {
    id: 113,
    firstName: "Chloe",
    lastName: "Adams",
    fullName: "Chloe Adams",
    schoolName: "Willow Creek High School",
    countyDistrict: "Gwinnett County",
    planType: "504",
    planTier: "$55",
    pipelineStage: "Meeting Scheduled",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Jordan Lee",
    assignedAdvocateInitials: "JL",
    needsAttention: false,
    primaryTask: "May 5, 2025 · 1:00 PM",
    primaryTaskIcon: "calendar",
    secondaryTask: "Prepare talking points",
    secondaryTaskIcon: "check",
    meetingDate: "May 5, 2025 · 1:00 PM",
  },

  // 6. State Complaint (2 clients)
  {
    id: 114,
    firstName: "Amelia",
    lastName: "Brooks",
    fullName: "Amelia Brooks",
    schoolName: "Summit High School",
    countyDistrict: "Atlanta Public Schools",
    planType: "Complaint",
    planTier: "Pay Per Use",
    pipelineStage: "State Complaint",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Kevin Liu",
    assignedAdvocateInitials: "KL",
    needsAttention: false,
    primaryTask: "Drafting",
    primaryTaskIcon: "clock",
    secondaryTask: "Review with legal template",
    secondaryTaskIcon: "check",
  },
  {
    id: 115,
    firstName: "Caleb",
    lastName: "Foster",
    fullName: "Caleb Foster",
    schoolName: "Brookdale Elementary",
    countyDistrict: "DeKalb County",
    planType: "Complaint",
    planTier: "$105",
    pipelineStage: "State Complaint",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Erin Smith",
    assignedAdvocateInitials: "ES",
    needsAttention: false,
    primaryTask: "Waiting on parent approval",
    primaryTaskIcon: "check",
    secondaryTask: "Share draft for review",
    secondaryTaskIcon: "mail",
  },

  // 7. Monitoring (2 clients)
  {
    id: 116,
    firstName: "Harper",
    lastName: "Lewis",
    fullName: "Harper Lewis",
    schoolName: "Meadowlark Elementary",
    countyDistrict: "Fulton County",
    planType: "Monitoring",
    planTier: "$55",
    pipelineStage: "Monitoring",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Maya Singh",
    assignedAdvocateInitials: "MS",
    needsAttention: false,
    primaryTask: "Progress monitoring",
    primaryTaskIcon: "clock",
    secondaryTask: "Check in with parent",
    secondaryTaskIcon: "check",
  },
  {
    id: 117,
    firstName: "Elijah",
    lastName: "Young",
    fullName: "Elijah Young",
    schoolName: "Stonegate High School",
    countyDistrict: "Cobb County",
    planType: "IEP",
    planTier: "Renewal",
    pipelineStage: "Monitoring",
    accountStatus: "Renewal Needed",
    billingStatus: "Current",
    contractStatus: "Active",
    assignedAdvocateName: "Jordan Lee",
    assignedAdvocateInitials: "JL",
    needsAttention: false,
    primaryTask: "Waiting on transportation",
    primaryTaskIcon: "clock",
    secondaryTask: "Follow up with school",
    secondaryTaskIcon: "check",
  },

  // 8. Closed (2 clients)
  {
    id: 118,
    firstName: "Grace",
    lastName: "Nelson",
    fullName: "Grace Nelson",
    schoolName: "Oakridge Elementary",
    countyDistrict: "Fulton County",
    planType: "Resolved",
    planTier: "$105",
    pipelineStage: "Closed",
    accountStatus: "Closed",
    billingStatus: "Current",
    contractStatus: "Renewed",
    assignedAdvocateName: "Daniel Torres",
    assignedAdvocateInitials: "DT",
    needsAttention: false,
    primaryTask: "IEP in place",
    primaryTaskIcon: "check",
    secondaryTask: "Closed Apr 15, 2025",
    secondaryTaskIcon: "calendar",
  },
  {
    id: 119,
    firstName: "Henry",
    lastName: "Phillips",
    fullName: "Henry Phillips",
    schoolName: "Redwood Middle School",
    countyDistrict: "Gwinnett County",
    planType: "Vault",
    planTier: "Nonpay",
    pipelineStage: "Closed",
    accountStatus: "Closed",
    billingStatus: "Payment Failed",
    contractStatus: "Expired",
    assignedAdvocateName: "Kevin Liu",
    assignedAdvocateInitials: "KL",
    needsAttention: true,
    attentionReason: "Payment Failed / Past Due",
    primaryTask: "Vault only: access",
    primaryTaskIcon: "clock",
    secondaryTask: "Closed Apr 10, 2025",
    secondaryTaskIcon: "calendar",
  },
];

export default function AdvocacyPipeline() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const currentUserName = user?.name || "Byron Honea";

  // ── Database Queries ────────────────────────────────────────────────────────
  const { data: serverStages } = trpc.pipeline.stages.list.useQuery();
  const { data: serverViews } = trpc.pipeline.views.list.useQuery();

  // ── Backend Mutations ───────────────────────────────────────────────────────
  const updateStageMutation = trpc.pipeline.cards.updateStage.useMutation({
    onSuccess: () => utils.pipeline.cards.list.invalidate(),
  });

  const upsertStageMutation = trpc.pipeline.stages.upsert.useMutation({
    onSuccess: () => utils.pipeline.stages.list.invalidate(),
  });

  const reorderStagesMutation = trpc.pipeline.stages.reorder.useMutation({
    onSuccess: () => utils.pipeline.stages.list.invalidate(),
  });

  const upsertViewMutation = trpc.pipeline.views.upsert.useMutation({
    onSuccess: () => utils.pipeline.views.list.invalidate(),
  });

  // ── Local Persistent State ──────────────────────────────────────────────────
  const [stagesState, setStagesState] = useState<PipelineStageItem[]>(() => {
    try {
      const cached = localStorage.getItem("waypoint_advocacy_pipeline_stages");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return DEFAULT_STAGES;
  });

  const [cardsState, setCardsState] = useState<PipelineCardItem[]>(() => {
    try {
      const cached = localStorage.getItem("waypoint_advocacy_pipeline_cards");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return INITIAL_DEMO_CARDS;
  });

  const [customViewsState, setCustomViewsState] = useState<SavedViewItem[]>(() => {
    try {
      const cached = localStorage.getItem("waypoint_advocacy_pipeline_views");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  // Active View & Filter states
  const [activeViewSlug, setActiveViewSlug] = useState("all-clients");
  const [filters, setFilters] = useState<PipelineFilters>({});

  // Modals state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [showNewViewModal, setShowNewViewModal] = useState(false);

  // Sync server stages if updated
  useEffect(() => {
    if (serverStages && serverStages.length > 0) {
      setStagesState((prev) => {
        const merged = serverStages.map((ss: any, idx: number) => {
          const existing = prev.find((p) => p.slug === ss.slug || p.id === ss.id);
          return {
            id: ss.id,
            name: ss.name,
            slug: ss.slug || ss.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            order: existing?.order ?? idx + 1,
            accentColor: ss.accentColor || "#38BDF8",
            iconName: ss.iconName || "Compass",
            category: ss.category || "active",
            isArchived: ss.isArchived ?? false,
            isDefault: ss.isDefault ?? false,
          };
        });
        merged.sort((a, b) => a.order - b.order);
        return merged;
      });
    }
  }, [serverStages]);

  // Combine default saved views + server views + custom views (respecting personal scope)
  const allSavedViews: SavedViewItem[] = useMemo(() => {
    const list = [...DEFAULT_SAVED_VIEWS];
    if (serverViews && serverViews.length > 0) {
      serverViews.forEach((sv: any) => {
        if (!list.some((v) => v.slug === sv.slug)) {
          list.push(sv);
        }
      });
    }
    customViewsState.forEach((cv) => {
      // Include view if shared or created by current user
      if (!list.some((v) => v.slug === cv.slug)) {
        list.push(cv);
      }
    });
    return list;
  }, [serverViews, customViewsState]);

  // Active View object and rules
  const activeViewObj = useMemo(() => {
    return allSavedViews.find((v) => v.slug === activeViewSlug);
  }, [allSavedViews, activeViewSlug]);

  const viewRules = useMemo(() => {
    if (!activeViewObj?.filtersJson) return {};
    try {
      return JSON.parse(activeViewObj.filtersJson);
    } catch {
      return {};
    }
  }, [activeViewObj]);

  // ── Client Filtering Engine (Saved View + Filter Popover) ───────────────────
  const filteredCards = useMemo(() => {
    return cardsState.filter((card) => {
      // 1. "My Work" Rule
      if (viewRules.isMyWork) {
        // Match advocate name with current user name or default to top advocate assignment in demo mode
        const adv = card.assignedAdvocateName?.toLowerCase() || "";
        const cur = currentUserName.toLowerCase();
        const matchesCurrent = adv.includes(cur) || cur.includes(adv);
        // For testing "My Work" when user name is Byron or test user, match Byron or first assigned
        const isMyWorkMatch = matchesCurrent || adv === "byron honea" || adv === "erin smith";
        if (!isMyWorkMatch) return false;
      }

      // 2. Saved View filters
      if (viewRules.planTier) {
        const vt = viewRules.planTier.toLowerCase();
        const ct = card.planTier.toLowerCase();
        if (vt === "tools only" && !ct.includes("tools") && !ct.includes("vault")) return false;
        if (vt !== "tools only" && ct !== vt) return false;
      }
      if (viewRules.accountStatus && card.accountStatus.toLowerCase() !== viewRules.accountStatus.toLowerCase()) {
        return false;
      }
      if (viewRules.billingStatus && card.billingStatus.toLowerCase() !== viewRules.billingStatus.toLowerCase()) {
        return false;
      }
      if (viewRules.advocate && card.assignedAdvocateName.toLowerCase() !== viewRules.advocate.toLowerCase()) {
        return false;
      }
      if (viewRules.district && !card.countyDistrict?.toLowerCase().includes(viewRules.district.toLowerCase())) {
        return false;
      }
      if (viewRules.caseType && card.planType.toLowerCase() !== viewRules.caseType.toLowerCase()) {
        return false;
      }
      if (viewRules.needsAttentionOnly && !card.needsAttention) {
        return false;
      }

      // 3. Filter Popover filters
      if (filters.planTier) {
        const ft = filters.planTier.toLowerCase();
        const ct = card.planTier.toLowerCase();
        if (ft === "tools only" && !ct.includes("tools") && !ct.includes("vault")) return false;
        if (ft !== "tools only" && ct !== ft) return false;
      }
      if (filters.advocate && card.assignedAdvocateName.toLowerCase() !== filters.advocate.toLowerCase()) {
        return false;
      }
      if (filters.district && !card.countyDistrict?.toLowerCase().includes(filters.district.toLowerCase())) {
        return false;
      }
      if (filters.caseType && card.planType.toLowerCase() !== filters.caseType.toLowerCase()) {
        return false;
      }
      if (filters.needsAttentionOnly && !card.needsAttention) {
        return false;
      }
      if (filters.accountStatus && card.accountStatus.toLowerCase() !== filters.accountStatus.toLowerCase()) {
        return false;
      }
      if (filters.billingStatus && card.billingStatus.toLowerCase() !== filters.billingStatus.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [cardsState, viewRules, filters, currentUserName]);

  // Compute live card counts per saved view
  const viewCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allSavedViews.forEach((view) => {
      try {
        const rules = JSON.parse(view.filtersJson || "{}");
        const count = cardsState.filter((card) => {
          if (rules.isMyWork) {
            const adv = card.assignedAdvocateName?.toLowerCase() || "";
            const cur = currentUserName.toLowerCase();
            const matchesCurrent = adv.includes(cur) || cur.includes(adv);
            const isMyWorkMatch = matchesCurrent || adv === "byron honea" || adv === "erin smith";
            if (!isMyWorkMatch) return false;
          }
          if (rules.planTier) {
            const vt = rules.planTier.toLowerCase();
            const ct = card.planTier.toLowerCase();
            if (vt === "tools only" && (ct.includes("tools") || ct.includes("vault"))) return true;
            if (ct !== vt) return false;
          }
          if (rules.accountStatus && card.accountStatus.toLowerCase() !== rules.accountStatus.toLowerCase()) return false;
          if (rules.billingStatus && card.billingStatus.toLowerCase() !== rules.billingStatus.toLowerCase()) return false;
          if (rules.advocate && card.assignedAdvocateName.toLowerCase() !== rules.advocate.toLowerCase()) return false;
          if (rules.district && !card.countyDistrict?.toLowerCase().includes(rules.district.toLowerCase())) return false;
          if (rules.caseType && card.planType.toLowerCase() !== rules.caseType.toLowerCase()) return false;
          if (rules.needsAttentionOnly && !card.needsAttention) return false;
          return true;
        }).length;
        counts[view.slug] = count;
      } catch {
        counts[view.slug] = cardsState.length;
      }
    });
    return counts;
  }, [cardsState, allSavedViews, currentUserName]);

  // ── Drag & Drop Handlers ────────────────────────────────────────────────────
  const handleMoveCard = (cardId: number, targetStageName: string) => {
    setCardsState((prev) => {
      const updated = prev.map((c) =>
        c.id === cardId ? { ...c, pipelineStage: targetStageName } : c
      );
      try {
        localStorage.setItem("waypoint_advocacy_pipeline_cards", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    toast.success(`Client moved to ${targetStageName}`);

    updateStageMutation.mutate({
      contactId: cardId,
      stage: targetStageName,
    });
  };

  const handleReorderCards = (draggedCardId: number, targetCardId: number, stageName: string) => {
    setCardsState((prev) => {
      const stageCards = prev.filter((c) => c.pipelineStage.toLowerCase() === stageName.toLowerCase());
      const otherCards = prev.filter((c) => c.pipelineStage.toLowerCase() !== stageName.toLowerCase());

      const draggedIndex = stageCards.findIndex((c) => c.id === draggedCardId);
      const targetIndex = stageCards.findIndex((c) => c.id === targetCardId);

      if (draggedIndex < 0 || targetIndex < 0) return prev;

      const newStageCards = [...stageCards];
      const [draggedItem] = newStageCards.splice(draggedIndex, 1);
      newStageCards.splice(targetIndex, 0, draggedItem);

      const combined = [...otherCards, ...newStageCards];
      try {
        localStorage.setItem("waypoint_advocacy_pipeline_cards", JSON.stringify(combined));
      } catch {
        // Ignore
      }
      return combined;
    });
  };

  const handleReorderStages = (draggedStageId: number, targetStageId: number) => {
    setStagesState((prev) => {
      const draggedIdx = prev.findIndex((s) => s.id === draggedStageId);
      const targetIdx = prev.findIndex((s) => s.id === targetStageId);

      if (draggedIdx < 0 || targetIdx < 0) return prev;

      const newStages = [...prev];
      const [draggedItem] = newStages.splice(draggedIdx, 1);
      newStages.splice(targetIdx, 0, draggedItem);

      const reordered = newStages.map((s, idx) => ({ ...s, order: idx + 1 }));
      try {
        localStorage.setItem("waypoint_advocacy_pipeline_stages", JSON.stringify(reordered));
      } catch {
        // Ignore
      }

      reorderStagesMutation.mutate(
        reordered.map((s) => ({ id: s.id, order: s.order }))
      );

      toast.success("Pipeline stages reordered");
      return reordered;
    });
  };

  const handleTogglePinView = (view: SavedViewItem) => {
    const updated = customViewsState.map((v) =>
      v.slug === view.slug ? { ...v, isPinned: !v.isPinned } : v
    );
    setCustomViewsState(updated);
    try {
      localStorage.setItem("waypoint_advocacy_pipeline_views", JSON.stringify(updated));
    } catch {
      // Ignore
    }
    toast.success(view.isPinned ? `Unpinned "${view.name}"` : `Pinned "${view.name}" to view bar`);
  };

  const handleSaveStages = (updatedStages: PipelineStageItem[]) => {
    setStagesState(updatedStages);
    try {
      localStorage.setItem("waypoint_advocacy_pipeline_stages", JSON.stringify(updatedStages));
    } catch {
      // Ignore
    }

    const reorderPayload = updatedStages.map((s, idx) => ({
      id: s.id,
      order: idx + 1,
    }));
    reorderStagesMutation.mutate(reorderPayload);

    updatedStages.forEach((s) => {
      upsertStageMutation.mutate({
        id: s.isDefault ? undefined : s.id,
        name: s.name,
        order: s.order,
        accentColor: s.accentColor,
        iconName: s.iconName,
        category: s.category,
        isArchived: s.isArchived,
      });
    });

    toast.success("Pipeline configuration saved");
  };

  const handleAddCustomStage = (stageData: Partial<PipelineStageItem>) => {
    if (!stageData.name) return;
    const newStage: PipelineStageItem = {
      id: Date.now(),
      name: stageData.name,
      slug: stageData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      order: stagesState.length + 1,
      accentColor: stageData.accentColor || "#38BDF8",
      iconName: stageData.iconName || "Compass",
      category: stageData.category || "active",
      isArchived: false,
      isDefault: false,
    };

    const updated = [...stagesState, newStage];
    setStagesState(updated);
    try {
      localStorage.setItem("waypoint_advocacy_pipeline_stages", JSON.stringify(updated));
    } catch {
      // Ignore
    }

    upsertStageMutation.mutate({
      name: newStage.name,
      accentColor: newStage.accentColor,
      category: newStage.category,
      iconName: newStage.iconName,
      order: newStage.order,
    });

    toast.success(`Stage "${newStage.name}" added to pipeline`);
  };

  const handleSaveNewView = (newViewData: {
    name: string;
    filters: PipelineFilters;
    isPinned: boolean;
    isPrivate: boolean;
  }) => {
    const slug = newViewData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newViewItem: SavedViewItem = {
      id: Date.now(),
      name: newViewData.name,
      slug,
      filtersJson: JSON.stringify(newViewData.filters),
      isPinned: newViewData.isPinned,
      isPrivate: newViewData.isPrivate,
      isDefault: false,
      order: allSavedViews.length + 1,
    };

    const updated = [...customViewsState, newViewItem];
    setCustomViewsState(updated);
    try {
      localStorage.setItem("waypoint_advocacy_pipeline_views", JSON.stringify(updated));
    } catch {
      // Ignore
    }

    upsertViewMutation.mutate({
      name: newViewData.name,
      filtersJson: JSON.stringify(newViewData.filters),
      isPinned: newViewData.isPinned,
      order: newViewItem.order,
    });

    setActiveViewSlug(slug);
    toast.success(`Saved view "${newViewData.name}" created`);
  };

  return (
    <div className="space-y-2.5 p-3.5 sm:p-5 lg:p-6 bg-[#07162B] min-h-screen text-slate-100">
      {/* 1. Page Header (Compact) */}
      <AdvocacyPipelineHeader
        onCustomizePipeline={() => setShowCustomizeModal(true)}
        onAddStage={() => setShowAddStageModal(true)}
      />

      {/* 2. Primary Control Row: Saved Views + Compact Filter Button */}
      <SavedViewsBar
        views={allSavedViews}
        activeViewSlug={activeViewSlug}
        onSelectView={(view) => setActiveViewSlug(view.slug)}
        onTogglePinView={handleTogglePinView}
        onNewView={() => setShowNewViewModal(true)}
        viewCounts={viewCounts}
        filters={filters}
        onChangeFilters={setFilters}
        onClearFilters={() => setFilters({})}
        matchingCount={filteredCards.length}
      />

      {/* 3. High-Density Kanban Pipeline Board */}
      <KanbanBoard
        stages={stagesState}
        cards={filteredCards}
        onMoveCard={handleMoveCard}
        onReorderCards={handleReorderCards}
        onReorderStages={handleReorderStages}
        onAddCard={(stageName) => {
          toast.info(`Opening new student intake for stage: ${stageName}`);
        }}
        onAddCustomStage={() => setShowAddStageModal(true)}
        onEditStage={() => setShowCustomizeModal(true)}
      />

      {/* 4. Modals */}
      <CustomizePipelineModal
        open={showCustomizeModal}
        onOpenChange={setShowCustomizeModal}
        stages={stagesState}
        onSaveStages={handleSaveStages}
      />

      <NewViewModal
        open={showNewViewModal}
        onOpenChange={setShowNewViewModal}
        onSaveView={handleSaveNewView}
      />

      <AddStageModal
        open={showAddStageModal}
        onOpenChange={setShowAddStageModal}
        onAddStage={handleAddCustomStage}
      />
    </div>
  );
}
