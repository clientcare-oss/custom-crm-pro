import React, { useState, useEffect } from "react";
import { JourneyStage, PortalExperiencePage } from "./types";
import { INITIAL_JOURNEY_STAGES } from "./journeyData";
import { INITIAL_PORTAL_PAGES } from "./pagesLibraryData";
import { JourneyStageCard } from "./JourneyStageCard";
import { PortalPagesLibrary } from "./PortalPagesLibrary";
import { StateEngineMatrix } from "./StateEngineMatrix";
import { ExperiencePreviewModal } from "./ExperiencePreviewModal";
import { StageDesignDrawer } from "./StageDesignDrawer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Eye, 
  Sliders, 
  Workflow, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  ArrowRight, 
  Compass, 
  FolderPlus,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  Award,
  Lock
} from "lucide-react";
import { toast } from "sonner";

export function ClientExperienceDesigner() {
  const [stages, setStages] = useState<JourneyStage[]>(() => {
    const saved = localStorage.getItem("waypoint_journey_stages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_JOURNEY_STAGES;
      }
    }
    return INITIAL_JOURNEY_STAGES;
  });

  const [pages, setPages] = useState<PortalExperiencePage[]>(() => {
    const saved = localStorage.getItem("waypoint_portal_pages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_PORTAL_PAGES;
      }
    }
    return INITIAL_PORTAL_PAGES;
  });

  const [activeTab, setActiveTab] = useState<"journey" | "pages" | "engine" | "onboarding">("journey");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<JourneyStage | null>(null);

  useEffect(() => {
    localStorage.setItem("waypoint_journey_stages", JSON.stringify(stages));
  }, [stages]);

  useEffect(() => {
    localStorage.setItem("waypoint_portal_pages", JSON.stringify(pages));
  }, [pages]);

  const handleOpenDesign = (stage: JourneyStage) => {
    setSelectedStage(stage);
    setDesignOpen(true);
  };

  const handleOpenPreview = (stage: JourneyStage) => {
    setSelectedStage(stage);
    setPreviewOpen(true);
  };

  const handleSaveStage = (updatedStage: JourneyStage) => {
    setStages((prev) => prev.map((s) => (s.id === updatedStage.id ? updatedStage : s)));
  };

  const handleToggleStageStatus = (stageId: string) => {
    setStages((prev) =>
      prev.map((s) => {
        if (s.id === stageId) {
          const newStatus = s.status === "published" ? "draft" : "published";
          toast.success(`Stage ${s.stepNumber} status changed to ${newStatus}`);
          return { ...s, status: newStatus };
        }
        return s;
      })
    );
  };

  const handleTogglePageStatus = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === pageId) {
          const newStatus = p.status === "published" ? "draft" : "published";
          toast.success(`${p.name} status changed to ${newStatus}`);
          return { ...p, status: newStatus };
        }
        return p;
      })
    );
  };

  const handleDesignFromPage = (page: PortalExperiencePage) => {
    const matchedStage = stages.find((s) => s.id === page.associatedStageId) || stages[0];
    handleOpenDesign(matchedStage);
  };

  const handlePreviewFromPage = (page: PortalExperiencePage) => {
    const matchedStage = stages.find((s) => s.id === page.associatedStageId) || stages[0];
    handleOpenPreview(matchedStage);
  };

  const publishedStagesCount = stages.filter((s) => s.status === "published").length;
  const publishedPagesCount = pages.filter((p) => p.status === "published").length;

  return (
    <div className="mt-12 pt-8 border-t-2 border-primary/20 space-y-8 animate-in fade-in duration-300">
      
      {/* Section Header Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-background to-primary/5 p-6 rounded-2xl border border-primary/20 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-bold tracking-wider text-[10px] uppercase px-2.5 py-0.5">
                Central Administrative Control
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                PG-027 Extension
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <Workflow className="h-7 w-7 text-primary" />
              Client Portal Experience Designer
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Design, calibrate, and manage reusable client-facing portal experiences. 
              The application dynamically resolves the appropriate experience based on the authenticated client's household record and journey stage.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => {
                setSelectedStage(stages[1]); // Default to Experience 01 - Discovery
                setPreviewOpen(true);
              }}
              className="gap-2 bg-gradient-to-r from-primary to-primary/85 shadow-md text-xs font-semibold px-4 h-10"
            >
              <Eye className="h-4 w-4" />
              Interactive Simulator
            </Button>
          </div>
        </div>

        {/* Quick Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/40 text-xs">
          <div className="bg-card/70 backdrop-blur-sm p-3 rounded-lg border border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium block">Journey Stages</span>
            <span className="text-lg font-bold text-foreground">{stages.length} Stages</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium mt-0.5">
              {publishedStagesCount} Published Live
            </span>
          </div>

          <div className="bg-card/70 backdrop-blur-sm p-3 rounded-lg border border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium block">Experience Pages</span>
            <span className="text-lg font-bold text-foreground">{pages.length} Pages</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium mt-0.5">
              {publishedPagesCount} Ready in Library
            </span>
          </div>

          <div className="bg-card/70 backdrop-blur-sm p-3 rounded-lg border border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium block">State Engine</span>
            <span className="text-lg font-bold text-foreground">10 State Modes</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-medium mt-0.5">
              Deterministic Routing
            </span>
          </div>

          <div className="bg-card/70 backdrop-blur-sm p-3 rounded-lg border border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium block">Data Architecture</span>
            <span className="text-lg font-bold text-foreground">Household Scope</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium mt-0.5">
              100% FERPA Protected
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <Button
          variant={activeTab === "journey" ? "default" : "ghost"}
          onClick={() => setActiveTab("journey")}
          className={`text-xs font-semibold gap-2 h-9 px-4 rounded-lg transition-all ${
            activeTab === "journey"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Workflow className="h-4 w-4" />
          Client Journey Designer ({stages.length} Stages)
        </Button>

        <Button
          variant={activeTab === "pages" ? "default" : "ghost"}
          onClick={() => setActiveTab("pages")}
          className={`text-xs font-semibold gap-2 h-9 px-4 rounded-lg transition-all ${
            activeTab === "pages"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Portal Experience Pages ({pages.length})
        </Button>

        <Button
          variant={activeTab === "engine" ? "default" : "ghost"}
          onClick={() => setActiveTab("engine")}
          className={`text-xs font-semibold gap-2 h-9 px-4 rounded-lg transition-all ${
            activeTab === "engine"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cpu className="h-4 w-4" />
          State Engine Matrix
        </Button>

        <Button
          variant={activeTab === "onboarding" ? "default" : "ghost"}
          onClick={() => setActiveTab("onboarding")}
          className={`text-xs font-semibold gap-2 h-9 px-4 rounded-lg transition-all ${
            activeTab === "onboarding"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Progressive Onboarding Flow
        </Button>
      </div>

      {/* Tab 1: Client Journey Designer */}
      {activeTab === "journey" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl border border-border/40">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Waypoint 14-Stage Client Journey Progression
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                From initial discovery inquiry through progressive onboarding, active advocacy, and case resolution.
              </p>
            </div>
            <Badge variant="outline" className="text-xs bg-background/80 self-start sm:self-auto">
              Dynamic State Mapping Active
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stages.map((stage) => (
              <JourneyStageCard
                key={stage.id}
                stage={stage}
                onDesign={handleOpenDesign}
                onPreview={handleOpenPreview}
                onToggleStatus={handleToggleStageStatus}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Portal Experience Pages Library */}
      {activeTab === "pages" && (
        <div className="space-y-4">
          <PortalPagesLibrary
            pages={pages}
            onDesignPage={handleDesignFromPage}
            onPreviewPage={handlePreviewFromPage}
            onToggleStatus={handleTogglePageStatus}
          />
        </div>
      )}

      {/* Tab 3: State Engine Matrix */}
      {activeTab === "engine" && (
        <div className="space-y-6">
          <StateEngineMatrix />
        </div>
      )}

      {/* Tab 4: Progressive Onboarding Step Flow */}
      {activeTab === "onboarding" && (
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                Independently Saved Onboarding Milestones
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Progressive Onboarding Architecture
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Rather than forcing clients through a single monolithic form, onboarding is partitioned into individually autosaving steps. 
                Clients can leave at any point and resume without losing completed work.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    step: "1",
                    title: "Account Created & Verified",
                    state: "Automated via Clerk Auth",
                    desc: "Contact linked to authenticated Clerk user record immediately upon discovery scheduling or signup.",
                    status: "Auto-Saved"
                  },
                  {
                    step: "2",
                    title: "Payment Complete",
                    state: "Stripe Webhook Verified",
                    desc: "Payment recorded on household ledger. Client granted instant access to progressive onboarding suite.",
                    status: "Auto-Saved"
                  },
                  {
                    step: "3",
                    title: "Sign Advocacy Agreement",
                    state: "E-Signature Pad",
                    desc: "Master representation terms and FERPA disclosure signed electronically and stored in R2 vault.",
                    status: "Independent Step"
                  },
                  {
                    step: "4",
                    title: "Parent / Guardian Information",
                    state: "Household Profile",
                    desc: "Primary phone, email, notification preferences, and secondary authorized parent profiles.",
                    status: "Independent Step"
                  },
                  {
                    step: "5",
                    title: "Student Setup Profile",
                    state: "Student Workspace",
                    desc: "School district, grade, current placement, and special education eligibility category saved per student.",
                    status: "Independent Step"
                  },
                  {
                    step: "6",
                    title: "Upload Current IEP & Evals",
                    state: "R2 Document Dropzone",
                    desc: "Dedicated slots for current IEP, multidisciplinary evaluations, and 504 accommodation plans.",
                    status: "Independent Step"
                  },
                  {
                    step: "7",
                    title: "Advocacy Priorities Intake",
                    state: "Interactive Questionnaire",
                    desc: "Autosaving parent priorities, key meeting goals, and spoken voice note inputs.",
                    status: "Independent Step"
                  },
                  {
                    step: "8",
                    title: "Schedule Strategy Call",
                    state: "Inline Calendar Booking",
                    desc: "Final onboarding milestone booking 45-min IEP Strategy & Case Launch Session with Byron Honea.",
                    status: "Final Gate"
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-muted/20 border border-border/40 flex items-start gap-3">
                    <span className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                      {item.step}
                    </span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-foreground">{item.title}</p>
                        <Badge variant="outline" className="text-[10px] text-cyan-600 border-cyan-500/30">
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Experience Preview Modal (Interactive Simulator) */}
      <ExperiencePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        selectedStage={selectedStage}
      />

      {/* Stage Design Drawer */}
      <StageDesignDrawer
        open={designOpen}
        onOpenChange={setDesignOpen}
        stage={selectedStage}
        onSaveStage={handleSaveStage}
      />
    </div>
  );
}
