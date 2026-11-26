import React from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Compass,
  CreditCard,
  FileEdit,
  FileText,
  Handshake,
  Layers,
  Lock,
  MessageCircle,
  RefreshCw,
  Scale,
  School,
  Search,
  ShieldCheck,
  Upload,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isApplicableToScope,
  type StageIconKey,
  type StationPosition,
  type WorkflowExperienceMode,
  type WorkflowGuideStep,
  type WorkflowStageAutomationLink,
  type WorkflowStageDefinition,
} from "@shared/workflowModel";
import { MetallicMonorailTrack } from "./MonorailTrackElements";

export function StageSvgIcon({ icon, size = 19 }: { icon: StageIconKey; size?: number }) {
  const props = {
    width: size,
    height: size,
    x: -size / 2,
    y: -size / 2,
    strokeWidth: 1.75,
    color: "#F8FAFF",
  };
  switch (icon) {
    case "user-plus":
      return <UserPlus {...props} />;
    case "search":
      return <Search {...props} />;
    case "layers":
      return <Layers {...props} />;
    case "file-text":
      return <FileText {...props} />;
    case "compass":
      return <Compass {...props} />;
    case "calendar":
      return <Calendar {...props} />;
    case "message-circle":
      return <MessageCircle {...props} />;
    case "refresh-cw":
      return <RefreshCw {...props} />;
    case "handshake":
      return <Handshake {...props} />;
    case "shield-check":
      return <ShieldCheck {...props} />;
    case "scale":
      return <Scale {...props} />;
    case "upload":
      return <Upload {...props} />;
    case "credit-card":
      return <CreditCard {...props} />;
    case "school":
      return <School {...props} />;
    case "activity":
      return <Activity {...props} />;
    case "check-circle":
      return <CheckCircle2 {...props} />;
    default:
      return <Layers {...props} />;
  }
}

function AutomationSvgIcon({ actionType }: { actionType: WorkflowStageAutomationLink["actionType"] }) {
  const props = { width: 13.5, height: 13.5, x: -6.75, y: -6.75, strokeWidth: 1.85, color: "#F5F0FF" };
  if (actionType === "task") return <CheckSquare {...props} />;
  if (actionType === "email") return <Bell {...props} />;
  if (actionType === "prepare_draft") return <FileEdit {...props} />;
  if (actionType === "notify_advocate") return <Bell {...props} />;
  return <FileText {...props} />;
}

function GuideStepSvgIcon({ index, completed }: { index: number; completed: boolean }) {
  const props = { width: 13.5, height: 13.5, x: -6.75, y: -6.75, strokeWidth: 1.9, color: "#EFF6FF" };
  if (completed) return <Check {...props} color="#86EFAC" strokeWidth={2.5} />;
  if (index === 0) return <FileText {...props} />;
  if (index === 1) return <Search {...props} />;
  if (index === 2) return <FileEdit {...props} />;
  return <CheckSquare {...props} />;
}

/**
 * Reusable Component #2 & #6: Raised Circular Dimensional Metallic Station Platform
 * Fine champagne-gold metallic rim, cylindrical 3D brass extrusion, dark navy concave dish,
 * crisp icon, readable UI serif label, soft shadow beneath, and controlled golden halo when selected.
 */
export function CircularDimensionalStation({
  stage,
  index,
  totalStages,
  pos,
  isSelected,
  isCurrentCase,
  isTrainDocked,
  isStageComplete,
  inScope,
  canDrag,
  hasGuideSteps,
  guideExpanded,
  hasAutomations,
  automationsExpanded,
  onToggleGuideBranch,
  onToggleAutomationBranch,
  onPointerDownDrag,
  onSelect,
  onNavigateArrow,
}: {
  stage: WorkflowStageDefinition;
  index: number;
  totalStages: number;
  pos: StationPosition;
  isSelected: boolean;
  isCurrentCase: boolean;
  isTrainDocked: boolean;
  isStageComplete: boolean;
  inScope: boolean;
  canDrag: boolean;
  hasGuideSteps: boolean;
  guideExpanded: boolean;
  hasAutomations: boolean;
  automationsExpanded: boolean;
  onToggleGuideBranch: () => void;
  onToggleAutomationBranch: () => void;
  onPointerDownDrag: (e: React.PointerEvent) => void;
  onSelect: () => void;
  onNavigateArrow: (delta: -1 | 1) => void;
}) {
  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      role="button"
      tabIndex={0}
      data-interactive-node="true"
      data-testid={`monorail-station-${stage.id}`}
      aria-label={`Stage ${index + 1} of ${totalStages}: ${stage.name}${isSelected ? " (Selected)" : ""}${isCurrentCase ? " (Current case stage)" : ""}${isStageComplete ? " (Guide steps complete)" : ""}`}
      onPointerDown={(e) => {
        if (canDrag) {
          e.stopPropagation();
          onPointerDownDrag(e);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onNavigateArrow(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          onNavigateArrow(-1);
        }
      }}
      className={cn("outline-none group", canDrag ? "cursor-move" : "cursor-pointer")}
      opacity={inScope ? 1 : 0.34}
    >
      {/* Generous accessible hit target */}
      <circle r={44} fill="transparent" />

      {/* Controlled illumination ONLY when selected, current case, or train docked (never every station pulsing!) */}
      {isSelected && (
        <ellipse
          cx={0}
          cy={4}
          rx={68}
          ry={48}
          fill="url(#station-selected-glow)"
          pointerEvents="none"
        />
      )}
      {!isSelected && (isCurrentCase || isTrainDocked) && (
        <ellipse
          cx={0}
          cy={4}
          rx={52}
          ry={36}
          fill={isCurrentCase ? "url(#station-selected-glow)" : "url(#station-case-glow)"}
          opacity={0.72}
          pointerEvents="none"
        />
      )}

      {/* Soft ground cast shadow ellipse directly underneath platform */}
      <ellipse cx={0} cy={17} rx={36} ry={18.5} fill="#00020A" fillOpacity={0.84} />

      {/* 3D Cylindrical Metallic Brushed Brass Plinth Wall */}
      <path
        d="M -32.5 0 L -32.5 10.5 A 32.5 18 0 0 0 32.5 10.5 L 32.5 0 Z"
        fill="url(#station-base-side)"
        stroke="#271B0A"
        strokeWidth={0.85}
      />

      {/* Sleek Recessed Left & Right Monorail Tunnel Portals (where the train glides in & out) */}
      <g pointerEvents="none">
        {/* Left tunnel aperture */}
        <path
          d="M -32.8 -6.5 C -29.2 -6.5, -28.4 -3.2, -28.4 1.5 L -28.4 7.8 C -30.5 7.4, -32.1 6.7, -32.8 5.9 Z"
          fill="#020510"
          stroke="#C9A55A"
          strokeOpacity={0.78}
          strokeWidth={0.9}
        />
        {/* Right tunnel aperture */}
        <path
          d="M 32.8 -6.5 C 29.2 -6.5, 28.4 -3.2, 28.4 1.5 L 28.4 7.8 C 30.5 7.4, 32.1 6.7, 32.8 5.9 Z"
          fill="#020510"
          stroke="#C9A55A"
          strokeOpacity={0.78}
          strokeWidth={0.9}
        />
      </g>

      {/* Lower plinth specular rim line */}
      <path
        d="M -28 11.2 A 32.5 18 0 0 0 28 11.2"
        fill="none"
        stroke={isSelected ? "#FFF2C9" : "#DFBA6B"}
        strokeOpacity={isSelected ? 0.85 : 0.42}
        strokeWidth={1.1}
      />

      {/* Top Raised Circular/Oval Brushed-Gold Metallic Rim */}
      <ellipse
        cx={0}
        cy={0}
        rx={32.5}
        ry={22.5}
        fill="url(#station-brass-rim)"
        stroke={isSelected ? "#FFF8DF" : "#3E2D12"}
        strokeWidth={isSelected ? 2 : 0.95}
      />

      {/* Recessed Deep Obsidian Navy Inner Medallion */}
      <ellipse
        cx={0}
        cy={-0.6}
        rx={25.5}
        ry={17.6}
        fill="url(#station-navy-core)"
        stroke={isSelected ? "#FFEBB8" : "#DFBA6B"}
        strokeOpacity={isSelected ? 0.95 : 0.45}
        strokeWidth={isSelected ? 1.35 : 0.95}
      />

      {/* Subtle glass sheen arc inside top of medallion */}
      <path
        d="M -17 -9 A 22 14 0 0 1 17 -9"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.14}
        strokeWidth={1.2}
      />

      {/* Crisp White Minimalist Stage Icon */}
      <g transform="translate(0, -1)">
        <StageSvgIcon icon={stage.icon} size={19} />
      </g>

      {/* Non-color-only Completion Check Badge */}
      {isStageComplete && (
        <g transform="translate(24, -17)">
          <circle r={8.5} fill="#064E3B" stroke="#6EE7B7" strokeWidth={1.3} />
          <Check width={10} height={10} x={-5} y={-5} color="#A7F3D0" strokeWidth={2.8} />
        </g>
      )}

      {/* Subtle expandable branch indicator pills on station rim (click directly to toggle blue guide / violet automation branches!) */}
      {hasGuideSteps && (
        <g
          transform="translate(-14, 24)"
          data-interactive-node="true"
          data-testid={`station-guide-toggle-${stage.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleGuideBranch();
          }}
          className="cursor-pointer"
        >
          <title>{guideExpanded ? "Collapse blue guide steps" : `Expand ${stage.guideSteps.length} guide step(s)`}</title>
          <circle r={11} fill="transparent" />
          <circle
            r={5.2}
            fill={guideExpanded ? "#3B82F6" : "#0B1E45"}
            stroke="#7CC4FF"
            strokeWidth={1.35}
          />
          <circle r={1.8} fill="#EFF6FF" />
        </g>
      )}

      {hasAutomations && (
        <g
          transform="translate(14, 24)"
          data-interactive-node="true"
          data-testid={`station-auto-toggle-${stage.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleAutomationBranch();
          }}
          className="cursor-pointer"
        >
          <title>{automationsExpanded ? "Collapse violet automations" : `Expand ${stage.automations.length} automation(s)`}</title>
          <circle r={11} fill="transparent" />
          <circle
            r={5.2}
            fill={automationsExpanded ? "#8B5CF6" : "#180B3B"}
            stroke="#C4B5FD"
            strokeWidth={1.35}
          />
          <circle r={1.8} fill="#F5F3FF" />
        </g>
      )}

      {/* Crisp UI Serif Label cleanly above station (never baked into raster image; sensible 2-line wrap) */}
      <foreignObject x={-86} y={-68} width={172} height={42} className="pointer-events-none overflow-visible">
        <div className="flex flex-col items-center justify-end h-full text-center px-1">
          <span
            title={stage.name}
            className={cn(
              "text-[14px] tracking-tight leading-[1.18] line-clamp-2 drop-shadow-[0_2px_7px_rgba(0,0,0,0.98)]",
              isSelected
                ? "text-[#FFF6DC] font-semibold"
                : isCurrentCase
                ? "text-[#FDEBB9] font-semibold"
                : "text-[#EEF4FF] font-medium"
            )}
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {stage.name}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

/**
 * Reusable Component #7: Expandable Cool-Blue Guide-Step Branch Route
 * Smooth curved dimensional sapphire track looping beneath the station, supporting both
 * sequential steps and true parallel step forks without implying false dependencies.
 */
export function GuideStepBranch({
  stage,
  stPos,
  nextPos,
  experienceMode,
  planFilter,
  projectTypeFilter,
  completedStepIds,
  onSelectGuideStep,
}: {
  stage: WorkflowStageDefinition;
  stPos: StationPosition;
  nextPos: StationPosition | null;
  experienceMode: WorkflowExperienceMode;
  planFilter: string;
  projectTypeFilter: string;
  completedStepIds: Set<string>;
  onSelectGuideStep: (stageId: string, step: WorkflowGuideStep) => void;
}) {
  const scopedSteps = stage.guideSteps
    .filter((gs) =>
      experienceMode === "employee_preview"
        ? isApplicableToScope(gs, planFilter, projectTypeFilter)
        : true
    )
    .sort((a, b) => a.order - b.order);

  if (scopedSteps.length === 0) return null;

  // Group steps into columns: shared parallelGroup steps stack vertically
  const columns: WorkflowGuideStep[][] = [];
  for (const step of scopedSteps) {
    const prevCol = columns[columns.length - 1];
    if (step.parallelGroup && prevCol && prevCol[0]?.parallelGroup === step.parallelGroup) {
      prevCol.push(step);
    } else {
      columns.push([step]);
    }
  }

  const colCount = columns.length;
  const branchDir: 1 | -1 = stPos.direction === -1 ? -1 : 1;
  const startX = stPos.x;
  const startY = stPos.y + 22;
  const branchDropY = 86;
  const branchBaseY = stPos.y + branchDropY;

  const canReconnectToNext =
    Boolean(nextPos) &&
    Math.abs((nextPos?.y ?? 0) - stPos.y) < 35 &&
    Math.sign((nextPos?.x ?? 0) - stPos.x) === branchDir;

  // Distribute nodes cleanly across available span between this station and next station (or neatly spaced)
  const targetSpan = canReconnectToNext && nextPos
    ? Math.abs(nextPos.x - stPos.x)
    : Math.max(220, colCount * 106);

    const positionedCols = columns.map((col, ci) => {
    const t = (ci + 0.65) / (colCount + 0.35);
    const cx = canReconnectToNext
      ? startX + branchDir * Math.max(48, Math.min(targetSpan - 40, t * targetSpan))
      : startX + branchDir * (58 + ci * Math.min(118, Math.max(92, 310 / Math.max(colCount, 1))));
    return col.map((step, ri) => {
      const offsetY = col.length > 1 ? (ri - (col.length - 1) / 2) * 52 : 0;
      const labelAbove = col.length > 1 && ri === 0;
      return { step, x: cx, y: branchBaseY + offsetY, labelAbove };
    });
  });

  const firstColX = positionedCols[0][0].x;
  const lastColX = positionedCols[positionedCols.length - 1][0].x;

  const mainBlueCurveD =
    canReconnectToNext && nextPos
      ? `M ${startX} ${startY} C ${startX} ${branchBaseY}, ${startX + branchDir * 24} ${branchBaseY}, ${firstColX} ${branchBaseY} L ${lastColX} ${branchBaseY} C ${nextPos.x - branchDir * 24} ${branchBaseY}, ${nextPos.x} ${branchBaseY}, ${nextPos.x} ${nextPos.y + 22}`
      : `M ${startX} ${startY} C ${startX} ${branchBaseY}, ${startX + branchDir * 24} ${branchBaseY}, ${firstColX} ${branchBaseY} L ${lastColX} ${branchBaseY}`;

  return (
    <g data-testid={`guide-branch-${stage.id}`}>
      <MetallicMonorailTrack d={mainBlueCurveD} variant="guide" />

      {/* Parallel split & merge arcs when steps share parallelGroup */}
      {positionedCols.map((col, ci) => {
        if (col.length <= 1) return null;
        const anchorLeftX = ci === 0 ? startX + branchDir * 22 : positionedCols[ci - 1][0].x;
        const anchorRightX =
          ci === positionedCols.length - 1
            ? col[0].x + branchDir * 38
            : positionedCols[ci + 1][0].x;
        return col.map((item) => (
          <path
            key={`par-${item.step.id}`}
            d={`M ${anchorLeftX} ${branchBaseY} C ${anchorLeftX + branchDir * 18} ${item.y}, ${item.x - branchDir * 16} ${item.y}, ${item.x} ${item.y} C ${item.x + branchDir * 16} ${item.y}, ${anchorRightX - branchDir * 18} ${item.y}, ${anchorRightX} ${branchBaseY}`}
            fill="none"
            stroke="#60A5FA"
            strokeWidth={2.6}
            strokeOpacity={0.9}
          />
        ));
      })}

      {/* Circular Glowing Sapphire Guide Step Platforms */}
      {positionedCols.flat().map((item, flatIdx) => {
        const isDone = completedStepIds.has(item.step.id);
        return (
          <g
            key={item.step.id}
            transform={`translate(${item.x}, ${item.y})`}
            role="button"
            tabIndex={0}
            data-interactive-node="true"
            data-testid={`guide-step-node-${item.step.id}`}
            aria-label={`Guide step: ${item.step.title}${isDone ? " (Completed)" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectGuideStep(stage.id, item.step);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectGuideStep(stage.id, item.step);
              }
            }}
            className="cursor-pointer outline-none"
          >
            <circle r={24} fill="transparent" />
            {/* Cast shadow */}
            <ellipse cx={0} cy={12} rx={18} ry={8.5} fill="#00020B" fillOpacity={0.78} />
            {/* Controlled sapphire aura */}
            <circle r={22} fill={isDone ? "#10B981" : "#3B82F6"} fillOpacity={0.26} />
            {/* Raised blue plinth rim */}
            <ellipse
              cx={0}
              cy={3}
              rx={16}
              ry={12}
              fill={isDone ? "#065F46" : "#1D4ED8"}
              stroke="#081533"
              strokeWidth={0.8}
            />
            <ellipse
              cx={0}
              cy={0}
              rx={16}
              ry={12}
              fill="url(#guide-node-core)"
              stroke={isDone ? "#6EE7B7" : "#93C5FD"}
              strokeWidth={1.75}
            />
            <GuideStepSvgIcon index={flatIdx} completed={isDone} />

            {/* Crisp UI label above upper parallel node or cleanly below standard nodes */}
            <foreignObject
              x={-48}
              y={item.labelAbove ? -42 : 16}
              width={96}
              height={34}
              className="pointer-events-none overflow-visible"
            >
              <div
                className={cn(
                  "text-center leading-tight h-full flex flex-col",
                  item.labelAbove ? "justify-end" : "justify-start"
                )}
              >
                <p className="text-[9.5px] font-medium text-[#DCEBFF] line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                  {item.step.title}
                </p>
                {item.step.parallelGroup && !item.labelAbove && (
                  <span className="text-[7.5px] uppercase tracking-wider text-[#93C5FD]/85">
                    Parallel
                  </span>
                )}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Reusable Component #8: Expandable Luminous Violet Automation Branch Route
 * Smooth curved dimensional amethyst track branching cleanly off a station with
 * glowing circular violet automation medallions and status badges.
 */
export function AutomationBranch({
  stage,
  stPos,
  canvasWidth,
  experienceMode,
  caseAutomationFailures,
  onSelectAutomation,
}: {
  stage: WorkflowStageDefinition;
  stPos: StationPosition;
  canvasWidth: number;
  experienceMode: WorkflowExperienceMode;
  caseAutomationFailures: Record<number, number>;
  onSelectAutomation: (stageId: string, auto: WorkflowStageAutomationLink) => void;
}) {
  if (!stage.automations || stage.automations.length === 0) return null;

  const isTopRow = stPos.row === 0;
  const autoY = isTopRow ? stPos.y + 96 : stPos.y - 90;
  const goLeft = stPos.x > canvasWidth * 0.52;
  const dir: 1 | -1 = goLeft ? -1 : 1;
  const spacingX = 152;

  const nodes = stage.automations.map((auto, i) => ({
    auto,
    x: stPos.x + dir * (145 + i * spacingX),
    y: autoY,
  }));

  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const startY = isTopRow ? stPos.y + 22 : stPos.y - 22;
  const violetD = `M ${stPos.x} ${startY} C ${stPos.x} ${autoY}, ${stPos.x + dir * 36} ${autoY}, ${first.x} ${autoY} L ${last.x} ${autoY}`;
  const allDisabled = stage.automations.every((a) => !a.enabled);

  return (
    <g data-testid={`automation-branch-${stage.id}`}>
      <MetallicMonorailTrack
        d={violetD}
        variant="automation"
        disabled={allDisabled}
        dashed={allDisabled}
      />

      {nodes.map(({ auto, x, y }) => {
        const failureCount =
          experienceMode === "employee_preview" && auto.automationId
            ? caseAutomationFailures[auto.automationId] || 0
            : 0;
        const isFailed = failureCount > 0;
        const isDisabled = !auto.enabled;
        const isApproval = auto.requiresApproval;

        return (
          <g
            key={auto.id}
            transform={`translate(${x}, ${y})`}
            role="button"
            tabIndex={0}
            data-interactive-node="true"
            data-testid={`automation-node-${auto.id}`}
            aria-label={`Automation: ${auto.title}${isDisabled ? " (Disabled)" : isApproval ? " (Requires approval)" : " (Automatic)"}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAutomation(stage.id, auto);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectAutomation(stage.id, auto);
              }
            }}
            className="cursor-pointer outline-none"
            opacity={isDisabled ? 0.54 : 1}
          >
            <circle r={24} fill="transparent" />
            <ellipse cx={0} cy={12} rx={17.5} ry={8} fill="#00020B" fillOpacity={0.78} />
            {!isDisabled && (
              <circle
                r={21.5}
                fill={isFailed ? "#F43F5E" : "#8B5CF6"}
                fillOpacity={0.25}
              />
            )}
            <ellipse
              cx={0}
              cy={3}
              rx={15.5}
              ry={11.5}
              fill={isDisabled ? "#3B3154" : "#5B21B6"}
              stroke="#120829"
              strokeWidth={0.8}
            />
            <ellipse
              cx={0}
              cy={0}
              rx={15.5}
              ry={11.5}
              fill="url(#auto-node-core)"
              stroke={
                isFailed
                  ? "#FB7185"
                  : isDisabled
                  ? "#70628F"
                  : isApproval
                  ? "#E6C57B"
                  : "#C4B5FD"
              }
              strokeWidth={1.7}
              strokeDasharray={isDisabled ? "3 2" : undefined}
            />
            <AutomationSvgIcon actionType={auto.actionType} />

            {/* Status micro-badge */}
            {isFailed && (
              <g transform="translate(13, -11)">
                <circle r={6.5} fill="#881337" stroke="#FDA4AF" strokeWidth={1.1} />
                <AlertTriangle width={8} height={8} x={-4} y={-4} color="#FFE4E6" />
              </g>
            )}
            {!isFailed && isApproval && !isDisabled && (
              <g transform="translate(13, -11)">
                <circle r={6.5} fill="#2A1F0A" stroke="#E5C784" strokeWidth={1.1} />
                <Lock width={7.5} height={7.5} x={-3.75} y={-3.75} color="#F7E6BE" />
              </g>
            )}

            {/* Crisp UI label + linked PG-013 Automation ID */}
            <foreignObject x={-68} y={17} width={136} height={42} className="pointer-events-none overflow-visible">
              <div className="text-center leading-tight">
                <p className="text-[10.5px] font-medium text-[#EDE4FF] line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                  {auto.title}
                </p>
                <p className="text-[8.5px] text-[#B4A6D6] flex items-center justify-center gap-1">
                  {auto.automationId ? (
                    <span className="font-mono text-[#E5C784] font-semibold">
                      #{auto.automationId}
                    </span>
                  ) : null}
                  <span>
                    {auto.automationId ? "· " : ""}
                    {isFailed
                      ? "Failed · Retry"
                      : isDisabled
                      ? "Disabled"
                      : auto.communicationMode === "prepare_draft"
                      ? "Draft only"
                      : isApproval
                      ? "Approval req."
                      : "Automatic"}
                  </span>
                </p>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}
