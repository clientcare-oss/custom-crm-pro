import type { DoNotServeMatchEvaluation } from "@shared/doNotServe";

/**
 * Canonical Waypoint Dark Navy (#000820) + Restrained Matte Gold (#DFC07C) tokens
 * Strictly avoids orange, loud red/amber alarms, flashing states, or heavy gradients.
 */
export const DNS_THEME = {
  pageBg: "bg-[#000820] text-[#EEF3FA]",
  ambientGlowStyle: {
    backgroundImage:
      "radial-gradient(ellipse 75% 42% at 50% 0%, rgba(46, 76, 168, 0.22) 0%, rgba(28, 43, 108, 0.10) 45%, rgba(0, 8, 32, 0) 100%)",
  },
  drawerContent:
    "bg-[#030B21] border-l border-[#1A2A4E] text-[#EEF3FA] shadow-[0_24px_64px_rgba(0,0,0,0.85)]",
  modalContent:
    "bg-[#040D24] border border-[#1E3158] text-[#EEF3FA] shadow-[0_24px_64px_rgba(0,0,0,0.88)]",
  surface: "bg-[#06122E]/85 border border-[#1B2B4E]",
  surfaceSubtle: "bg-[#040D22]/90 border border-[#162443]",
  rowHover: "hover:bg-[#0A193D]/85 transition-colors",
  divider: "border-[#192848]",
  input:
    "w-full rounded-md bg-[#040C22] border border-[#243760] text-[#F2F6FC] placeholder:text-[#6E82A6] focus:outline-none focus:border-[#DFC07C]/75 focus:ring-1 focus:ring-[#DFC07C]/30 transition-colors",
  goldPrimaryBtn:
    "rounded-md bg-[#DFC07C] hover:bg-[#E8CC8E] text-[#050D21] font-medium border border-[#ECD49B]/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
  secondaryBtn:
    "rounded-md bg-transparent hover:bg-[#0B1A3B] text-[#DCE5F5] border border-[#263A63] hover:border-[#375185] transition-colors disabled:opacity-50 cursor-pointer",
  quietGoldPill:
    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DFC07C]/12 text-[#DFC07C] border border-[#DFC07C]/35",
  quietNeutralPill:
    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0E1E40] text-[#9EB1D4] border border-[#22365E]",
} as const;

export const CONNECTED_CHANNELS_SHORT =
  "Call Center · Messages · Lead forms · Marketing emails suppressed · Booking & Agreements";

export const PROVIDER_SCOPE_NOTE =
  "Alerts, marketing email suppression, and automated send holds apply inside Waypoint CRM (Call Center logs, Quo SMS/dialer actions initiated in CRM, Gmail Hub, Lead & Intake forms, imports, automations, review requests, resource outreach, booking, and agreements). Direct dialing or texting inside external carrier/Quo native apps outside Waypoint CRM cannot display in-call CRM pop-ups until webhook events arrive.";

export function formatPhoneDisplay(raw?: string | null): string {
  if (!raw) return "—";
  const trimmed = String(raw).trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return trimmed;
}

export function isDoNotServeReviewError(err: unknown): boolean {
  const msg =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message?: unknown }).message || "")
      : String(err || "");
  return msg.includes("DO_NOT_SERVE_REVIEW_REQUIRED");
}

export function hasUnresolvedMatch(
  evaluation?: DoNotServeMatchEvaluation | null
): evaluation is DoNotServeMatchEvaluation {
  return Boolean(evaluation && evaluation.hasActiveMatch && evaluation.matches.length > 0);
}

