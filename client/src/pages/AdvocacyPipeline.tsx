import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AdvocacyPipelineHeader } from "@/components/pipeline/AdvocacyPipelineHeader";
import { SavedViewsBar } from "@/components/pipeline/SavedViewsBar";
import { PipelineFilterBar } from "@/components/pipeline/PipelineFilterBar";
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
import { Loader2 } from "lucide-react";

// ── Deterministic Sample Enrichment Dataset (Used if few CRM records present) ──
const SAMPLE_PIPELINE_CARDS: PipelineCardItem[] = [
  // Discovery
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
    nextDate: "Tomorrow, 10:00 AM",
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
    nextDate: "Apr 28, 2025",
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
    nextDate: "Apr 29, 2025",
  },

  // Intake / Onboarding
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
    primaryTask: "Agreement sent · Awaiting signature",
    nextDate: "In Progress",
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
    primaryTask: "Portal setup · Send welcome email",
    nextDate: "In Progress",
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
    primaryTask: "Intake form in progress · Follow up with parent",
    nextDate: "In Progress",
  },

  // Records Review
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
    primaryTask: "Records uploaded · Review and summarize",
    nextDate: "In Progress",
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
    primaryTask: "Comparator needed · Request district data",
    nextDate: "In Progress",
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
    primaryTask: "Records uploaded · Identify key issues",
    nextDate: "In Progress",
  },

  // School Contact
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
    primaryTask: "Notify school · Send formal letter",
    nextDate: "In Progress",
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
    primaryTask: "Request draft IEP · Follow up in 2 days",
    nextDate: "In Progress",
  },

  // Meeting Scheduled
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
    primaryTask: "Pre-meeting prep & talking points",
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
    primaryTask: "Prepare talking points & parent concerns",
    meetingDate: "May 5, 2025 · 1:00 PM",
  },

  // State Complaint
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
    primaryTask: "Drafting · Review with legal template",
    nextDate: "In Progress",
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
    primaryTask: "Waiting on parent approval · Share draft",
    nextDate: "In Progress",
  },

  // Monitoring
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
    primaryTask: "Progress monitoring · Check in with parent",
    nextDate: "In Progress",
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
    primaryTask: "Waiting on transportation · Follow up with school",
    nextDate: "In Progress",
  },

  // Closed
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
    primaryTask: "IEP in place · Case completed",
    nextDate: "Closed Apr 15, 2025",
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
    primaryTask: "Vault only access · Case resolved",
    nextDate: "Closed Apr 10, 2025",
  },
];

export default function AdvocacyPipeline() {
  const utils = trpc.useUtils();

  // Queries
  const { data: stages = [], isLoading: stagesLoading } = trpc.pipeline.stages.list.useQuery();
  const { data: savedViews = [], isLoading: viewsLoading } = trpc.pipeline.views.list.useQuery();
  const { data: dbCards = [], isLoading: cardsLoading } = trpc.pipeline.cards.list.useQuery();

  // Mutations
  const updateStageMutation = trpc.pipeline.cards.updateStage.useMutation({
    onSuccess: () => {
      utils.pipeline.cards.list.invalidate();
    },
    onError: (err) => toast.error("Failed to move card: " + err.message),
  });

  const upsertStageMutation = trpc.pipeline.stages.upsert.useMutation({
    onSuccess: () => {
      utils.pipeline.stages.list.invalidate();
    },
  });

  const reorderStagesMutation = trpc.pipeline.stages.reorder.useMutation({
    onSuccess: () => {
      utils.pipeline.stages.list.invalidate();
    },
  });

  const upsertViewMutation = trpc.pipeline.views.upsert.useMutation({
    onSuccess: () => {
      utils.pipeline.views.list.invalidate();
    },
  });

  // Local active view & filter states
  const [activeViewSlug, setActiveViewSlug] = useState("all-clients");
  const [filters, setFilters] = useState<PipelineFilters>({});

  // Modals state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [showNewViewModal, setShowNewViewModal] = useState(false);

  // Optimistic Card State for instant Drag-and-Drop
  const [localMovedCards, setLocalMovedCards] = useState<Record<number, string>>({});

  // Combine DB cards with sample reference data if database has few students
  const allCards: PipelineCardItem[] = useMemo(() => {
    const rawList = dbCards.length > 0 ? dbCards : SAMPLE_PIPELINE_CARDS;
    return rawList.map((card: any) => {
      if (localMovedCards[card.id]) {
        return { ...card, pipelineStage: localMovedCards[card.id] };
      }
      return card;
    });
  }, [dbCards, localMovedCards]);

  // Handle active saved view filter
  const activeViewObj = useMemo(() => {
    return savedViews.find((v: any) => v.slug === activeViewSlug);
  }, [savedViews, activeViewSlug]);

  const viewRules = useMemo(() => {
    if (!activeViewObj?.filtersJson) return {};
    try {
      return JSON.parse(activeViewObj.filtersJson);
    } catch {
      return {};
    }
  }, [activeViewObj]);

  // Filtered Cards matching Saved View + Filter Bar
  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      // 1. Saved View filters
      if (viewRules.planTier && card.planTier.toLowerCase() !== viewRules.planTier.toLowerCase()) {
        return false;
      }
      if (viewRules.accountStatus && card.accountStatus.toLowerCase() !== viewRules.accountStatus.toLowerCase()) {
        return false;
      }
      if (viewRules.billingStatus && card.billingStatus.toLowerCase() !== viewRules.billingStatus.toLowerCase()) {
        return false;
      }

      // 2. Filter Bar filters
      if (filters.planTier && card.planTier.toLowerCase() !== filters.planTier.toLowerCase()) {
        return false;
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

      return true;
    });
  }, [allCards, viewRules, filters]);

  // Compute card counts per saved view
  const viewCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    savedViews.forEach((view: any) => {
      try {
        const rules = JSON.parse(view.filtersJson || "{}");
        const count = allCards.filter((card) => {
          if (rules.planTier && card.planTier.toLowerCase() !== rules.planTier.toLowerCase()) return false;
          if (rules.accountStatus && card.accountStatus.toLowerCase() !== rules.accountStatus.toLowerCase()) return false;
          if (rules.billingStatus && card.billingStatus.toLowerCase() !== rules.billingStatus.toLowerCase()) return false;
          return true;
        }).length;
        counts[view.slug] = count;
      } catch {
        counts[view.slug] = allCards.length;
      }
    });
    return counts;
  }, [allCards, savedViews]);

  // Drag-and-drop Card Move Handler
  const handleMoveCard = (cardId: number, targetStageName: string) => {
    // 1. Optimistically update local board immediately
    setLocalMovedCards((prev) => ({ ...prev, [cardId]: targetStageName }));
    toast.success(`Client moved to ${targetStageName}`);

    // 2. Persist to database
    updateStageMutation.mutate({
      contactId: cardId,
      stage: targetStageName,
    });
  };

  const handleSaveStages = (updatedStages: PipelineStageItem[]) => {
    const reorderPayload = updatedStages.map((s, idx) => ({
      id: s.id,
      order: idx + 1,
    }));
    reorderStagesMutation.mutate(reorderPayload);

    // Also persist new stages
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
  };

  const handleAddCustomStage = (stageData: Partial<PipelineStageItem>) => {
    if (!stageData.name) return;
    upsertStageMutation.mutate({
      name: stageData.name,
      accentColor: stageData.accentColor || "#38BDF8",
      category: stageData.category || "active",
      iconName: stageData.iconName || "Compass",
      order: stages.length + 1,
    });
  };

  const handleSaveNewView = (newViewData: {
    name: string;
    filters: PipelineFilters;
    isPinned: boolean;
  }) => {
    upsertViewMutation.mutate({
      name: newViewData.name,
      filtersJson: JSON.stringify(newViewData.filters),
      isPinned: newViewData.isPinned,
      order: savedViews.length + 1,
    });
  };

  if (stagesLoading && viewsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#F5B544]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8 bg-[#07162B] min-h-screen text-slate-100">
      {/* 1. Page Header */}
      <AdvocacyPipelineHeader
        onCustomizePipeline={() => setShowCustomizeModal(true)}
        onAddStage={() => setShowAddStageModal(true)}
        onNewView={() => setShowNewViewModal(true)}
      />

      {/* 2. Saved Views Bar */}
      <SavedViewsBar
        views={savedViews}
        activeViewSlug={activeViewSlug}
        onSelectView={(view) => setActiveViewSlug(view.slug)}
        viewCounts={viewCounts}
      />

      {/* 3. Granular Filter Bar */}
      <PipelineFilterBar
        filters={filters}
        onChangeFilters={setFilters}
        onClearFilters={() => setFilters({})}
        matchingCount={filteredCards.length}
      />

      {/* 4. Kanban Pipeline Board */}
      <KanbanBoard
        stages={stages}
        cards={filteredCards}
        onMoveCard={handleMoveCard}
        onAddCard={(stageName) => {
          toast.info(`Opening new client intake for stage: ${stageName}`);
        }}
        onAddCustomStage={() => setShowAddStageModal(true)}
        onEditStage={() => setShowCustomizeModal(true)}
      />

      {/* 5. Customization Modals */}
      <CustomizePipelineModal
        open={showCustomizeModal}
        onOpenChange={setShowCustomizeModal}
        stages={stages}
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
