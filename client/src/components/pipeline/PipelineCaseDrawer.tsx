import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  UserCheck,
  ArrowRight,
  ShieldAlert,
  Activity,
  Users,
  School,
  Mail,
  Phone,
  FileText,
  Sparkles,
} from "lucide-react";
import {
  ADVOCATE_ROSTER,
  LOGICAL_STAGE_GROUPS,
  resolveLogicalStageGroup,
  resolveCaseActionStatus,
} from "./pipelineDefaults";
import type { PipelineCardItem, PipelineStageItem } from "./types";

interface PipelineCaseDrawerProps {
  card: PipelineCardItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStageItem[];
  onMoveCard: (cardId: number, targetStageName: string) => void;
  onAssignAdvocate: (cardId: number, advocateName: string) => void;
}

export function PipelineCaseDrawer({
  card,
  open,
  onOpenChange,
  stages,
  onMoveCard,
  onAssignAdvocate,
}: PipelineCaseDrawerProps) {
  const [, setLocation] = useLocation();
  const [pendingStage, setPendingStage] = useState<string>("");
  const [confirmingMove, setConfirmingMove] = useState(false);

  const activeStages = stages.filter((s) => !s.isArchived);

  useEffect(() => {
    if (card) {
      setPendingStage(card.pipelineStage);
      setConfirmingMove(false);
    }
  }, [card]);

  const { data: activityHistory } = trpc.caseActivity.list.useQuery(
    { studentContactId: card?.id || 0 },
    { enabled: Boolean(open && card?.id) }
  );

  if (!card) return null;

  const actionMeta = resolveCaseActionStatus(card);
  const logicalGroupKey = resolveLogicalStageGroup(
    card.pipelineStage,
    undefined,
    card.logicalGroup
  );
  const logicalGroupMeta = LOGICAL_STAGE_GROUPS.find(
    (g) => g.key === logicalGroupKey
  );

  const handleStageSelectChange = (newStage: string) => {
    setPendingStage(newStage);
    if (newStage.toLowerCase() !== card.pipelineStage.toLowerCase()) {
      setConfirmingMove(true);
    } else {
      setConfirmingMove(false);
    }
  };

  const handleConfirmStageMove = () => {
    if (
      pendingStage &&
      pendingStage.toLowerCase() !== card.pipelineStage.toLowerCase()
    ) {
      onMoveCard(card.id, pendingStage);
      setConfirmingMove(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-[#05142B] border-l border-[#3A2C18] text-[#FFF4D4] p-0 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.95)]"
      >
        {/* Top Command Header */}
        <div className="p-5 bg-gradient-to-b from-[#0A2246] to-[#05142B] border-b border-[#3A2C18] space-y-3">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                {logicalGroupMeta && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                      logicalGroupMeta.badgeClass
                    )}
                  >
                    {logicalGroupMeta.label}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                    actionMeta.badgeClass
                  )}
                >
                  <span
                    className={cn("w-1.5 h-1.5 rounded-full", actionMeta.dotClass)}
                  />
                  <span>{actionMeta.label}</span>
                </span>
              </div>
              {card.caseId && (
                <span className="text-[10px] font-mono text-[#A69371] bg-[#020A17] px-2 py-0.5 rounded border border-[#3A2C18]">
                  {card.caseId}
                </span>
              )}
            </div>

            <SheetTitle className="text-xl font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <span>{card.fullName}</span>
              {card.siblingCount && card.siblingCount > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#072448] border border-[#1B5799] text-[#93C5FD]">
                  <Users className="h-3 w-3" />
                  <span>{card.siblingCount} Siblings</span>
                </span>
              )}
            </SheetTitle>

            <SheetDescription className="text-xs text-[#C6B697] flex items-center gap-2 flex-wrap">
              <span>
                Client / Family:{" "}
                <strong className="text-[#FFE394]">
                  {card.parentName || `${card.lastName} Family`}
                </strong>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <School className="h-3 w-3 text-[#C5A059]" />
                {card.schoolName}
                {card.countyDistrict ? ` (${card.countyDistrict})` : ""}
              </span>
            </SheetDescription>
          </SheetHeader>

          {/* Primary Workspace Action */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                setLocation(`/students/${card.id}`);
              }}
              className="flex-1 h-9 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer rounded-xl inline-flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Full Student Workspace</span>
            </Button>
          </div>
        </div>

        {/* Scrollable Case Command Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* 1. Stage Progression & Move Control with Confirmation */}
          <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6B697]">
                Current Pipeline Stage
              </span>
              <span className="text-[11px] font-serif font-bold text-[#FFE394]">
                {card.pipelineStage}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[#A69371] font-medium">
                Move Case to Stage:
              </label>
              <select
                value={pendingStage}
                onChange={(e) => handleStageSelectChange(e.target.value)}
                className="w-full h-9 rounded-lg bg-[#05142B] border border-[#3A2C18] focus:border-[#C5A059] text-[#FFF4D4] text-xs px-3 focus:outline-hidden cursor-pointer"
              >
                {activeStages.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {confirmingMove && (
              <div className="rounded-lg bg-[#102B4E]/60 border border-[#C5A059] p-3 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-[#FFE394] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#FFF4D4] text-xs">
                      Confirm Stage Transition
                    </p>
                    <p className="text-[11px] text-[#C6B697]">
                      Move <strong>{card.fullName}</strong> from{" "}
                      <span className="text-[#FFE394]">{card.pipelineStage}</span>{" "}
                      <ArrowRight className="inline h-3 w-3 mx-0.5" />{" "}
                      <span className="text-[#34D399] font-semibold">
                        {pendingStage}
                      </span>
                      ? This logs to the Activity Timeline and preserves existing billing & Case Compass records.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPendingStage(card.pipelineStage);
                      setConfirmingMove(false);
                    }}
                    className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmStageMove}
                    className="h-7 px-3 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 cursor-pointer"
                  >
                    Confirm Stage Move
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Next Required Action & Due Date */}
          <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6B697]">
                Next Required Action & Due Date
              </span>
              {card.openTaskCount !== undefined && card.openTaskCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#05142B] border border-[#3A2C18] text-[#FFE394]">
                  {card.openTaskCount} Open Task{card.openTaskCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-[#05142B] border border-[#3A2C18]/80 space-y-1.5">
              <div className="flex items-start gap-2">
                {actionMeta.isOverdue ? (
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-[#C5A059] shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[#FFF4D4]">
                    {card.primaryTask || "Review current stage deliverables"}
                  </p>
                  {card.secondaryTask && (
                    <p className="text-[11px] text-[#A69371]">
                      {card.secondaryTask}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#3A2C18]/50 text-[11px]">
                <span className="inline-flex items-center gap-1 text-[#C6B697]">
                  <Calendar className="h-3.5 w-3.5 text-[#C5A059]" />
                  <span>
                    Due / Scheduled:{" "}
                    <strong className="text-[#FFE394]">
                      {card.meetingDate || card.nextDate || "Active in Stage"}
                    </strong>
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* 3. Responsible Employee & Service Plan Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6B697] block">
                Responsible Employee
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] border border-[#FFE394]/60 flex items-center justify-center text-[10px] font-bold text-[#07162B] shrink-0">
                  {card.assignedAdvocateInitials || "BH"}
                </div>
                <select
                  value={card.assignedAdvocateName}
                  onChange={(e) => onAssignAdvocate(card.id, e.target.value)}
                  className="flex-1 h-8 rounded-lg bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] text-xs px-2 focus:outline-hidden focus:border-[#C5A059] cursor-pointer"
                >
                  {ADVOCATE_ROSTER.map((adv) => (
                    <option key={adv.name} value={adv.name}>
                      {adv.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6B697] block">
                Plan & Case Profile
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#072448] border border-[#1B5799] text-[#93C5FD]">
                  {card.servicePlanLabel || card.planTier}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#05142B] border border-[#3A2C18] text-[#FFE394]">
                  {card.planType}
                </span>
                {card.compassRiskLevel && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 border border-rose-500/40 text-rose-200">
                    <ShieldAlert className="h-2.5 w-2.5" />
                    <span>Risk: {card.compassRiskLevel}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#A69371]">
                Status: {card.accountStatus} · Billing: {card.billingStatus}
              </p>
            </div>
          </div>

          {/* 4. Family Contact Details */}
          {(card.parentEmail || card.parentPhone || (card.siblingNames && card.siblingNames.length > 0)) && (
            <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6B697] block">
                Family Contact & Linked Siblings
              </span>
              <div className="space-y-1 text-[11px] text-[#D8C7A5]">
                {card.parentEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-[#C5A059]" />
                    <span>{card.parentEmail}</span>
                  </div>
                )}
                {card.parentPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-[#C5A059]" />
                    <span>{card.parentPhone}</span>
                  </div>
                )}
                {card.siblingNames && card.siblingNames.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 text-[#93C5FD]">
                    <Users className="h-3.5 w-3.5" />
                    <span>Linked Siblings: {card.siblingNames.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Recent Activity History */}
          <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6B697] flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-[#C5A059]" />
                <span>Recent Case Activity History</span>
              </span>
            </div>

            <div className="space-y-2">
              {activityHistory && activityHistory.length > 0 ? (
                activityHistory.slice(0, 5).map((item: any) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-[#05142B] border border-[#3A2C18]/70 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#FFF4D4] text-[11px]">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#A69371] shrink-0">
                        {item.eventDate
                          ? new Date(item.eventDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "Recent"}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[10px] text-[#C6B697] leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-2.5 rounded-lg bg-[#05142B] border border-[#3A2C18]/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#FFF4D4] text-[11px]">
                      {card.lastActivityText || `Active in ${card.pipelineStage}`}
                    </span>
                    <span className="text-[10px] text-[#A69371]">Recent</span>
                  </div>
                  <p className="text-[10px] text-[#C6B697]">
                    Assigned to {card.assignedAdvocateName} · Stage:{" "}
                    {card.pipelineStage}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
