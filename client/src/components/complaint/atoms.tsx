import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";

export const ENGINE = {
  navy: "#07162B",
  panel: "#0B1F3A",
  panelSoft: "#102A4A",
  border: "#22355499",
  gold: "#D9A441",
  goldSoft: "#D9A44122",
  blue: "#4C9AFF",
};

export function GoldButton({ children, onClick, disabled, className, type = "button" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-md bg-[#D9A441] px-4 py-2 text-sm font-semibold text-[#07162B] transition-transform active:scale-[0.97] hover:bg-[#E4B65B] disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
    >{children}</button>
  );
}

export function GhostButton({ children, onClick, disabled, className, danger }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; danger?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-[#22355499] px-4 py-2 text-sm text-slate-200 transition-colors hover:border-[#D9A441]/50 hover:text-[#D9A441] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
        danger && "hover:border-red-400/60 hover:text-red-400",
        className,
      )}
    >{children}</button>
  );
}

export function StatusPill({ kind, label }: { kind: "ok" | "warning" | "error" | "info" | "gold"; label: string }) {
  const styles = {
    ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    error: "bg-red-500/15 text-red-300 border-red-500/30",
    info: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    gold: "bg-[#D9A441]/15 text-[#E4B65B] border-[#D9A441]/40",
  }[kind];
  const Icon = kind === "ok" ? CheckCircle2 : kind === "warning" ? AlertTriangle : kind === "error" ? XCircle : CheckCircle2;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", styles)}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

export function SectionCard({ title, subtitle, children, actions, className }: {
  title?: ReactNode; subtitle?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-[#22355499] bg-[#0B1F3A] p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function BuiltFrom({ sources }: { sources: { type: string; refId: number | null; label: string }[] | null | undefined }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-2 rounded-md border border-sky-500/25 bg-sky-500/5 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">Built From</p>
      <ul className="mt-1 space-y-0.5">
        {sources.map((s, i) => (
          <li key={i} className="text-xs text-slate-300">
            <span className="text-sky-300">{s.type}</span>{s.refId ? ` #${s.refId}` : ""} — {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#D9A441]/40 bg-[#D9A441]/10 px-2 py-0.5 text-xs text-[#E4B65B]">
      <Sparkles className="h-3 w-3" /> AI Suggested
    </span>
  );
}

export function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">
        {label} {required && <span className="text-[#D9A441]">*</span>}
      </span>
      {children}
    </label>
  );
}

export const inputCls = "w-full rounded-md border border-[#22355499] bg-[#0B1F3A] px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D9A441]/60";
export const selectCls = inputCls + " appearance-none";

export function PageIdBadge({ id }: { id: string }) {
  return (
    <div className="fixed bottom-2 right-2 z-50 rounded border border-[#22355499] bg-[#0B1F3A]/90 px-1.5 py-0.5 text-[10px] text-slate-500" title={`Page ID: ${id}`}>
      {id}
    </div>
  );
}

