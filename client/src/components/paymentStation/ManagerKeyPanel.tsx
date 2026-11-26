import React, { useState } from "react";
import {
  Lock,
  Printer,
  Settings,
  Eye,
  Clock,
  CornerDownLeft,
  CreditCard,
  RefreshCw,
  Volume2,
  Heart,
  UserSearch,
  WifiOff,
  Link2,
  ShieldAlert,
} from "lucide-react";
import {
  getSavedManagerKeyChimeStyle,
  playManagerKeyPong,
  setSavedManagerKeyChimeStyle,
  type ManagerKeyChimeStyle,
} from "./posSounds";

export type ManagerKeyMode = "locked" | "pin" | "unlocked";

export type ManagerPreviewScenario =
  | "select_client"
  | "ready"
  | "processing"
  | "paid"
  | "failed"
  | "unconfirmed"
  | "offline"
  | "pending"
  | "requires_action"
  | "saved_cards"
  | "update_card"
  | "donation";

export interface ManagerPreviewScenarioMeta {
  id: ManagerPreviewScenario;
  label: string;
  shortLabel: string;
  dotClass?: string;
  icon?: "select_client" | "offline" | "pending" | "3ds" | "saved_cards" | "update_card" | "donation";
  activeBorder: string;
}

export const MANAGER_PREVIEW_SCENARIOS: ManagerPreviewScenarioMeta[] = [
  {
    id: "select_client",
    label: "Select Client",
    shortLabel: "Select Client",
    icon: "select_client",
    activeBorder: "border-[#DFBE77] bg-[#192D5C]/95 text-[#FFF4D6]",
  },
  {
    id: "ready",
    label: "Ready",
    shortLabel: "Ready",
    dotClass: "bg-[#42e4ff] shadow-[0_0_6px_rgba(66,228,255,0.85)]",
    activeBorder: "border-cyan-300/85 bg-[#122b52]/95 text-white",
  },
  {
    id: "processing",
    label: "Processing",
    shortLabel: "Processing",
    dotClass: "bg-[#67e8f9] animate-pulse shadow-[0_0_6px_rgba(103,232,249,0.9)]",
    activeBorder: "border-cyan-300/85 bg-[#122b52]/95 text-white",
  },
  {
    id: "paid",
    label: "Paid (Wave)",
    shortLabel: "Paid",
    dotClass: "bg-[#2ce88f] shadow-[0_0_6px_rgba(44,232,143,0.9)]",
    activeBorder: "border-emerald-400/90 bg-[#0d3527]/95 text-emerald-100",
  },
  {
    id: "failed",
    label: "Declined",
    shortLabel: "Declined",
    dotClass: "bg-[#ff3b47] shadow-[0_0_6px_rgba(255,59,71,0.9)]",
    activeBorder: "border-rose-400/90 bg-[#48121b]/95 text-rose-100",
  },
  {
    id: "unconfirmed",
    label: "Unconfirmed",
    shortLabel: "Unconfirmed",
    dotClass: "bg-[#f5b942] shadow-[0_0_6px_rgba(245,185,66,0.85)]",
    activeBorder: "border-amber-300/85 bg-[#2a2515]/95 text-amber-100",
  },
  {
    id: "offline",
    label: "No Internet",
    shortLabel: "No Internet",
    icon: "offline",
    activeBorder: "border-amber-400/90 bg-[#36220a]/95 text-amber-100",
  },
  {
    id: "pending",
    label: "Pending Link",
    shortLabel: "Pending Link",
    icon: "pending",
    activeBorder: "border-sky-300/85 bg-[#10294b]/95 text-sky-100",
  },
  {
    id: "requires_action",
    label: "3DS Auth",
    shortLabel: "3DS Auth",
    icon: "3ds",
    activeBorder: "border-amber-300/85 bg-[#2c2112]/95 text-amber-100",
  },
  {
    id: "saved_cards",
    label: "Saved Cards",
    shortLabel: "Saved Cards",
    icon: "saved_cards",
    activeBorder: "border-[#DFBE77] bg-[#192D5C] text-[#FFF4D6]",
  },
  {
    id: "update_card",
    label: "Update Card",
    shortLabel: "Update Card",
    icon: "update_card",
    activeBorder: "border-[#DFBE77] bg-[#1b2e5a] text-[#FFF4D6]",
  },
  {
    id: "donation",
    label: "Donation",
    shortLabel: "Donation",
    icon: "donation",
    activeBorder: "border-[#E5C175] bg-[#2a200d]/95 text-[#FFF0C2]",
  },
];

export interface ManagerKeyPanelProps {
  mode: "pin" | "unlocked";
  pinDigits: string;
  pinError: string | null;
  activePreviewScenario: ManagerPreviewScenario | null;
  onSubmitPin: () => void;
  onCancelPin: () => void;
  onSelectPreviewScenario: (scenario: ManagerPreviewScenario) => void;
  onTriggerPaperFeed: () => void;
  onOpenSetupInfo: () => void;
  onOpenRecentDrawer: () => void;
  onHidePanelToForm: () => void;
  onLockManager: () => void;
}

function renderScenarioGlyph(item: ManagerPreviewScenarioMeta) {
  switch (item.icon) {
    case "select_client":
      return <UserSearch className="h-2.5 w-2.5 text-[#DFBE77] shrink-0" />;
    case "offline":
      return <WifiOff className="h-2.5 w-2.5 text-[#ff9c2a] shrink-0" />;
    case "pending":
      return <Link2 className="h-2.5 w-2.5 text-sky-300 shrink-0" />;
    case "3ds":
      return <ShieldAlert className="h-2.5 w-2.5 text-amber-300 shrink-0" />;
    case "saved_cards":
      return <CreditCard className="h-2.5 w-2.5 text-[#DFBE77] shrink-0" />;
    case "update_card":
      return <RefreshCw className="h-2.5 w-2.5 text-[#DFBE77] shrink-0" />;
    case "donation":
      return <Heart className="h-2.5 w-2.5 text-[#E5C175] shrink-0" />;
    default:
      return (
        <span
          aria-hidden="true"
          className={`w-2 h-2 rounded-full shrink-0 ${item.dotClass ?? "bg-cyan-300"}`}
        />
      );
  }
}

export function ManagerKeyPanel({
  mode,
  pinDigits,
  pinError,
  activePreviewScenario,
  onSubmitPin,
  onCancelPin,
  onSelectPreviewScenario,
  onTriggerPaperFeed,
  onOpenSetupInfo,
  onOpenRecentDrawer,
  onHidePanelToForm,
  onLockManager,
}: ManagerKeyPanelProps) {
  const [chimeStyle, setChimeStyle] = useState<ManagerKeyChimeStyle>(() =>
    getSavedManagerKeyChimeStyle()
  );

  const handleSelectChime = (next: ManagerKeyChimeStyle) => {
    setChimeStyle(next);
    setSavedManagerKeyChimeStyle(next);
    playManagerKeyPong(next);
  };

  if (mode === "pin") {
    return (
      <div
        data-testid="pos-manager-pin-panel"
        className="pos-field-well rounded-[10px] border border-[#CFA657]/60 px-3.5 py-3 flex flex-col justify-between min-h-[158px]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#FCE6A6]">
            <img
              src="/assets/pos/manager-brass-key.png"
              alt=""
              aria-hidden="true"
              className="h-4 w-4 object-contain shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            />
            <span>Manager Key Access</span>
          </div>
          <button
            type="button"
            onClick={onCancelPin}
            className="text-[11px] text-[#9EB2D8] hover:text-white cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div className="my-2">
          <p className="text-[11px] text-[#B8C7E2] mb-2">
            Enter 4-digit lock code using the keypad or keyboard, then press Enter.
          </p>

          <div className="flex items-center gap-2">
            <div
              className="grid grid-cols-4 gap-2 flex-1"
              aria-label={`Manager code entry, ${pinDigits.length} of 4 digits entered`}
            >
              {[0, 1, 2, 3].map((idx) => {
                const filled = idx < pinDigits.length;
                const isNext = idx === pinDigits.length;
                return (
                  <div
                    key={idx}
                    className={`h-[38px] rounded-[8px] flex items-center justify-center border transition-colors ${
                      pinError
                        ? "bg-[#380e16]/80 border-rose-400/70"
                        : isNext
                          ? "bg-[#0b1c3c] border-[#E6C06A] shadow-[0_0_8px_rgba(230,192,106,0.22)]"
                          : filled
                            ? "bg-[#0a1936] border-[#C8A157]/75"
                            : "bg-[#050f24] border-[#506794]/50"
                    }`}
                  >
                    {filled ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FCE39C] shadow-[0_0_6px_rgba(252,227,156,0.75)]" />
                    ) : (
                      <span className="w-2 h-[2px] rounded-full bg-[#4E6490]/60" />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="pos-manager-pin-submit"
              onClick={onSubmitPin}
              className="h-[38px] px-3 rounded-[8px] bg-gradient-to-b from-[#DFBE77] to-[#A67C32] hover:brightness-110 border border-[#FFF2C4]/70 text-[#0B1222] text-[12px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
              <span>Enter</span>
            </button>
          </div>
        </div>

        <div className="min-h-[16px] flex items-center justify-between text-[11px]">
          {pinError ? (
            <span role="alert" data-testid="pos-manager-pin-error" className="text-rose-300 font-medium">
              {pinError}
            </span>
          ) : (
            <span className="text-[#7E94BE]">Keypad enters PIN digits while key is turned</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="pos-manager-test-panel"
      className="pos-field-well rounded-[10px] border border-[#CFA657]/65 px-2.5 py-2 flex flex-col justify-between gap-1.5 min-h-[166px]"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-[#CFA657]/25 pb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src="/assets/pos/manager-brass-key.png"
            alt=""
            aria-hidden="true"
            className="h-3.5 w-3.5 object-contain shrink-0 rotate-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
          />
          <span className="text-[11px] font-semibold text-[#FFF0C2] whitespace-nowrap">
            State Tester
          </span>
          <span className="px-1.5 py-[0.5px] rounded bg-amber-400/15 border border-amber-300/35 text-[8.5px] font-semibold uppercase tracking-wider text-amber-200 shrink-0">
            12 States
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="pos-manager-view-form"
            onClick={onHidePanelToForm}
            title="Show live register view with current preview state active"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0c1d3d] hover:bg-[#142c57] border border-[#6E86B8]/45 text-[10px] text-[#DCE6F8] cursor-pointer"
          >
            <Eye className="h-2.5 w-2.5" />
            <span>View</span>
          </button>
          <button
            type="button"
            data-testid="pos-manager-lock-btn"
            onClick={onLockManager}
            title="Lock manager key and return to normal live mode"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3b151e] hover:bg-[#521e2b] border border-rose-400/45 text-[10px] text-rose-100 cursor-pointer"
          >
            <Lock className="h-2.5 w-2.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* All 12 Testable Register & Printer States (4x3 grid — zero scroll, 1-click full preview) */}
      <div className="grid grid-cols-3 gap-1">
        {MANAGER_PREVIEW_SCENARIOS.map((sc) => {
          const active = activePreviewScenario === sc.id;
          return (
            <button
              key={sc.id}
              type="button"
              data-testid={`pos-preview-scenario-${sc.id}`}
              onClick={() => onSelectPreviewScenario(sc.id)}
              title={`Preview ${sc.label} state (ephemeral, no live charge)`}
              className={`h-[22px] px-1.5 rounded-[6px] border text-[10px] font-medium inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                active
                  ? sc.activeBorder
                  : "bg-[#081631]/90 border-[#5B72A3]/40 text-[#CFD9EE] hover:border-[#CFA657]/75 hover:text-white"
              }`}
            >
              {renderScenarioGlyph(sc)}
              <span className="truncate">{sc.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Key Access Sound Audition & Station Utilities Row */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/10">
        <div
          role="group"
          aria-label="Key unlock elevator chime sound"
          className="inline-flex items-center gap-0.5 rounded-[6px] bg-[#061128] border border-[#CFA657]/35 p-[1.5px]"
        >
          <Volume2 className="h-2.5 w-2.5 text-[#DFBE77] mx-0.5 shrink-0" />
          {(
            [
              { id: "otis_pong", label: "Otis" },
              { id: "elevator_two_tone", label: "Ding-Pong" },
              { id: "deep_pong", label: "Deep" },
            ] as const
          ).map((opt) => {
            const active = chimeStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`pos-chime-${opt.id}`}
                onClick={() => handleSelectChime(opt.id)}
                title={`Preview & select ${opt.label} elevator chime`}
                className={`h-[18px] px-1.5 rounded-[4px] text-[9px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#DFBE77] text-[#081224]"
                    : "text-[#B8C9E8] hover:text-white hover:bg-[#13264D]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="pos-preview-feed-paper"
            onClick={onTriggerPaperFeed}
            title="Test thermal receipt printer sound & paper feed"
            className="h-[21px] px-1.5 rounded-[5.5px] bg-[#091834] hover:bg-[#12284f] border border-[#5B72A3]/35 text-[9px] text-[#C8D6F0] inline-flex items-center gap-1 cursor-pointer"
          >
            <Printer className="h-2.5 w-2.5 text-[#DFBE77]" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={onOpenSetupInfo}
            title="Stripe Setup"
            className="h-[21px] px-1.5 rounded-[5.5px] bg-[#091834] hover:bg-[#12284f] border border-[#5B72A3]/35 text-[9px] text-[#C8D6F0] inline-flex items-center gap-1 cursor-pointer"
          >
            <Settings className="h-2.5 w-2.5 text-[#DFBE77]" />
            <span>Setup</span>
          </button>
          <button
            type="button"
            onClick={onOpenRecentDrawer}
            title="Recent Payments Log"
            className="h-[21px] px-1.5 rounded-[5.5px] bg-[#091834] hover:bg-[#12284f] border border-[#5B72A3]/35 text-[9px] text-[#C8D6F0] inline-flex items-center gap-1 cursor-pointer"
          >
            <Clock className="h-2.5 w-2.5 text-[#DFBE77]" />
            <span>Log</span>
          </button>
        </div>
      </div>
    </div>
  );
}
