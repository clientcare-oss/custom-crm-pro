import { Hash } from "lucide-react";
import { useLocation } from "wouter";

// ─── Page ID Registry ────────────────────────────────────────────────────────
// Every route gets a stable PG-XXX id. When you reference an issue, just say
// "problem on PG-014" and the file can be found instantly.
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

// Dynamic routes (prefix match)
const DYNAMIC_ROUTES: Array<{ prefix: string; id: string; name: string }> = [
  { prefix: "/contacts/", id: "PG-030", name: "Contact Detail" },
];

function resolvePageId(path: string): { id: string; name: string } | null {
  // Exact match first
  if (PAGE_IDS[path]) return PAGE_IDS[path];
  // Prefix match for dynamic routes
  for (const route of DYNAMIC_ROUTES) {
    if (path.startsWith(route.prefix)) {
      return { id: route.id, name: route.name };
    }
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PageIdBadge() {
  const [location] = useLocation();
  const page = resolvePageId(location);

  if (!page) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-sm px-2.5 py-1 shadow-sm select-none pointer-events-none"
      title={`Page: ${page.name}`}
    >
      <Hash className="h-3 w-3 text-muted-foreground/60 shrink-0" />
      <span className="text-[10px] font-mono font-semibold text-muted-foreground/80 tracking-wide">
        {page.id}
      </span>
    </div>
  );
}

// Export the registry so other parts of the app can reference it if needed
export { PAGE_IDS, DYNAMIC_ROUTES, resolvePageId };
