import { Check, Copy, Hash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

// ─── Page ID Registry ────────────────────────────────────────────────────────
const PAGE_IDS: Record<string, { id: string; name: string }> = {
  "/":                        { id: "PG-001", name: "Dashboard" },
  "/contacts":                { id: "PG-002", name: "Contacts" },
  "/leads":                   { id: "PG-003", name: "Leads" },
  "/projects":                { id: "PG-004", name: "Students" },
  "/invoices":                { id: "PG-005", name: "Invoices" },
  "/contracts":               { id: "PG-006", name: "Contracts" },
  "/appointments":            { id: "PG-007", name: "Appointments" },
  "/calendar":                { id: "PG-007", name: "Calendar" },
  "/scheduler":               { id: "PG-008", name: "Scheduler" },
  "/tasks":                   { id: "PG-009", name: "Tasks" },
  "/tools":                   { id: "PG-010", name: "Tools" },
  "/templates":               { id: "PG-011", name: "Templates" },
  "/lead-forms":              { id: "PG-012", name: "Lead Forms" },
  "/automations":             { id: "PG-013", name: "Automations" },
  "/integrations":            { id: "PG-014", name: "Integrations" },
  "/workflows":               { id: "PG-015", name: "Workflows" },
  "/knowledge-base":          { id: "PG-016", name: "Knowledge Base" },
  "/walkthroughs":            { id: "PG-017", name: "Walkthroughs" },
  "/call-logs":               { id: "PG-018", name: "Call Logs" },
  "/team":                    { id: "PG-019", name: "Team" },
  "/state-complaint-builder": { id: "PG-020", name: "State Complaint Builder" },
  "/brain-dump":              { id: "PG-021", name: "BrainDump" },
  "/bill-guardian":           { id: "PG-022", name: "Bill Guardian" },
  "/client-portal":           { id: "PG-023", name: "Client Portal" },
  "/portal":                  { id: "PG-023", name: "Client Portal" },
  "/settings":                { id: "PG-024", name: "Settings" },
  "/case-compass":            { id: "PG-025", name: "Case Compass" },
  "/page-id-showcase":        { id: "PG-026", name: "Page ID Showcase" },
};

const DYNAMIC_ROUTES: Array<{ prefix: string; id: string; name: string }> = [
  { prefix: "/contacts/", id: "PG-030", name: "Contact Detail" },
];

function resolvePageId(path: string): { id: string; name: string } | null {
  if (PAGE_IDS[path]) return PAGE_IDS[path];
  for (const route of DYNAMIC_ROUTES) {
    if (path.startsWith(route.prefix)) return { id: route.id, name: route.name };
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PageIdBadge() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const page = resolvePageId(location);

  // Auto-close after 6 seconds of being open
  useEffect(() => {
    if (open) {
      autoCloseTimer.current = setTimeout(() => setOpen(false), 6000);
    }
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [open]);

  // Collapse when route changes
  useEffect(() => {
    setOpen(false);
    setCopied(false);
  }, [location]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  if (!page) return null;

  const handleCopy = () => {
    const text = `${page.id} · ${page.name}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      // Reset the auto-close timer so it doesn't close right after copy
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = setTimeout(() => setOpen(false), 4000);
      // Reset copied state after 2 seconds
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center justify-end">
      {/* Expanded pill */}
      <div
        className={`
          flex items-center gap-2 rounded-full border border-border/70
          bg-background/95 backdrop-blur-sm shadow-md
          overflow-hidden transition-all duration-300 ease-in-out
          ${open ? "max-w-[280px] opacity-100 pl-3 pr-1.5 py-1.5 mr-2" : "max-w-0 opacity-0 p-0 border-0 mr-0"}
        `}
      >
        {/* ID + name */}
        <span className="text-[11px] font-mono font-bold text-foreground whitespace-nowrap tracking-wide">
          {page.id}
        </span>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          · {page.name}
        </span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy page ID"}
          className={`
            flex h-6 w-6 shrink-0 items-center justify-center rounded-full
            transition-all duration-200 ml-0.5
            ${copied
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          `}
        >
          {copied
            ? <Check className="h-3 w-3" />
            : <Copy className="h-3 w-3" />
          }
        </button>
      </div>

      {/* Trigger button — always visible, minimal */}
      <button
        onClick={() => setOpen(prev => !prev)}
        title={open ? "Hide page ID" : `Page ID: ${page.id}`}
        className={`
          flex h-7 w-7 items-center justify-center rounded-full
          border transition-all duration-200
          ${open
            ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
            : "border-border/50 bg-background/70 text-muted-foreground/50 hover:text-muted-foreground hover:border-border hover:bg-background/90 backdrop-blur-sm shadow-sm"
          }
        `}
        aria-label="Show page ID"
      >
        <Hash className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Registry exports are in pageIdRegistry.ts to keep Fast Refresh happy
