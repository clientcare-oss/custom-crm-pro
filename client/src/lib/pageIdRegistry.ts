export interface PageIdInfo {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

// ─── Static Exact Route Mappings ─────────────────────────────────────────────
export const PAGE_IDS: Record<string, PageIdInfo> = {
  // Core Admin & Advocacy Suite
  "/":                                { id: "PG-038", name: "Crew Quarters", category: "Core", description: "Personal employee home base and operational station" },
  "/crew-quarters":                   { id: "PG-038", name: "Crew Quarters", category: "Core", description: "Personal employee home base and operational station" },
  "/crew-quarters/messages":          { id: "PG-038-MSG", name: "Crew Messages Workspace", category: "Communications", description: "Internal team communication, direct messaging, and case collaboration" },
  "/crew-quarters/tasks":             { id: "PG-038-TSK", name: "Crew Task Queue", category: "Productivity", description: "Personal advocate action items, IEP reviews, and milestones" },
  "/crew-quarters/schedule":          { id: "PG-038-SCH", name: "Team Schedule & Time Off", category: "Schedule", description: "Staff calendar, leave requests, and coverage scheduling" },
  "/crew-quarters/resources":         { id: "PG-038-RES", name: "Employee Resources", category: "Content", description: "Staff directory, handbook, policy templates, and guidance" },
  "/company/dashboard":               { id: "PG-001", name: "Company Dashboard", category: "Company", description: "Waypoint Advocates operational overview & practice metrics" },
  "/company-dashboard":               { id: "PG-001", name: "Company Dashboard", category: "Company", description: "Waypoint Advocates operational overview & practice metrics" },
  "/dashboard":                       { id: "PG-001", name: "Company Dashboard", category: "Company", description: "Waypoint Advocates operational overview & practice metrics" },
  "/metrics":                         { id: "PG-042", name: "Waypoint Metrics", category: "Company", description: "Company practice metrics, lead journey funnel, revenue, team time, outcomes, and client retention" },
  "/company/metrics":                 { id: "PG-042", name: "Waypoint Metrics", category: "Company", description: "Company practice metrics, lead journey funnel, revenue, team time, outcomes, and client retention" },
  "/contacts":                        { id: "PG-002", name: "Contacts", category: "CRM" },
  "/leads":                           { id: "PG-003", name: "Leads", category: "CRM" },
  "/students":                        { id: "PG-004", name: "Students", category: "CRM" },
  "/projects":                        { id: "PG-004", name: "Students", category: "CRM" },
  "/invoices":                        { id: "PG-005", name: "Invoices & Billing", category: "Billing" },
  "/contracts":                       { id: "PG-006", name: "Agreements & Contracts", category: "Billing" },
  "/appointments":                    { id: "PG-007", name: "Appointments & Calendar", category: "Schedule" },
  "/calendar":                        { id: "PG-007", name: "Appointments & Calendar", category: "Schedule" },
  "/national-coverage":               { id: "PG-041", name: "National Coverage", category: "Schedule", description: "Meetings and client time zones at a glance, nationwide map & calling guidance" },
  "/scheduler":                       { id: "PG-008", name: "Appointment Scheduler", category: "Schedule" },
  "/tasks":                           { id: "PG-009", name: "Tasks & Case To-Dos", category: "Productivity" },
  
  // Tools & Workspaces
  "/tools":                           { id: "PG-010", name: "Tools Hub", category: "Tools" },
  "/tools/voyage-recorder":           { id: "PG-010-REC", name: "Voyage Meeting Recorder", category: "Tools" },
  "/tools/worksheet-builder":         { id: "PG-010-WS", name: "Worksheet Studio", category: "Tools" },
  "/tools/iep-comparator":            { id: "PG-010-IEP", name: "IEP Comparator", category: "Tools" },
  "/tools/pwn-decoder":               { id: "PG-010-PWN", name: "🧭 PWN Decoder", category: "Tools", description: "Decode what the district proposed, refused, explained, and may have missed" },
  "/pwn-decoder":                     { id: "PG-010-PWN", name: "🧭 PWN Decoder", category: "Tools", description: "Decode what the district proposed, refused, explained, and may have missed" },
  "/meeting-workspace":               { id: "PG-043", name: "⚡ Meeting Workspace", category: "Advocacy", description: "Dedicated live meeting workspace for advocate IEP sessions" },
  
  // Templates & Marketing
  "/templates":                       { id: "PG-011", name: "Document & Email Templates", category: "Content" },
  "/lead-forms":                      { id: "PG-012", name: "Lead Forms Builder", category: "Marketing" },
  "/automations":                     { id: "PG-013", name: "Automations Engine", category: "Automation" },
  "/integrations":                    { id: "PG-014", name: "Integrations & API", category: "Settings" },
  "/integrations/quo":                { id: "PG-014-QUO", name: "Quo Integration Settings", category: "Integrations" },
  "/settings/integrations/quo":       { id: "PG-014-QUO", name: "Quo Integration Settings", category: "Integrations" },
  "/workflows":                       { id: "PG-015", name: "Workflow Pipelines", category: "Automation" },
  "/knowledge-base":                  { id: "PG-016", name: "Knowledge Base", category: "Advocacy" },
  "/walkthroughs":                    { id: "PG-017", name: "System Walkthroughs", category: "Help" },
  "/call-center":                     { id: "PG-018", name: "Call Center", category: "Communications" },
  "/call-logs":                       { id: "PG-018", name: "Unassigned Call Logs", category: "Communications" },
  "/team":                            { id: "PG-019", name: "Team & Staff Management", category: "Admin" },
  
  // Special Advocacy Engines
  "/state-complaint-builder":         { id: "PG-020", name: "State Complaint Builder", category: "Advocacy" },
  "/tools/state-complaint-builder":   { id: "PG-020", name: "State Complaint Builder", category: "Advocacy" },
  "/brain-dump":                      { id: "PG-021", name: "Advocate BrainDump", category: "Productivity" },
  "/bill-guardian":                   { id: "PG-022", name: "Bill Guardian", category: "Billing" },
  "/first-mate":                      { id: "PG-037", name: "First Mate Live Advocacy Copilot", category: "Advocacy", description: "Live Advocacy Copilot and real-time meeting assistant" },
  "/ai-connections":                  { id: "PG-032", name: "AI Connections", category: "AI" },
  "/services":                        { id: "PG-035", name: "Advocacy Services Catalog", category: "Catalog" },
  "/sponsors":                        { id: "PG-040-SUP", name: "Supporters & Sponsors", category: "Giving & Impact" },
  "/giving":                          { id: "PG-040", name: "Giving & Impact Overview", category: "Giving & Impact", description: "Charitable giving, donations, and 501(c)(3) operations" },
  "/giving/overview":                 { id: "PG-040", name: "Giving & Impact Overview", category: "Giving & Impact" },
  "/giving/supporters":               { id: "PG-040-SUP", name: "Supporters & Donors", category: "Giving & Impact", description: "Sponsors, donors, and philanthropic contributors" },
  "/giving/donations":                { id: "PG-040-DON", name: "Donations & Contributions", category: "Giving & Impact", description: "Charitable contribution ledger and fund allocations" },
  "/giving/scholarships":             { id: "PG-040-SCH", name: "Scholarships & Grants", category: "Giving & Impact", description: "IEP advocacy family scholarships and grant awards" },
  "/giving/funds":                    { id: "PG-040-FND", name: "Charitable Funds & Endowments", category: "Giving & Impact", description: "Restricted and unrestricted charitable funds" },
  "/giving/receipts":                 { id: "PG-040-REC", name: "Receipts & Statements", category: "Giving & Impact", description: "Official 501(c)(3) tax receipts and year-end statements" },
  "/giving/reports":                  { id: "PG-040-REP", name: "Giving Reports & Analytics", category: "Giving & Impact", description: "Form 990 readiness and charitable giving metrics" },
  "/giving/website-tools":            { id: "PG-040-WEB", name: "Website Tools", category: "Giving & Impact", description: "Donation forms, buttons, progress bars, and campaign builders for public website" },
  "/giving/501c3":                    { id: "PG-040-SET", name: "Manage 501(c)(3)", category: "Giving & Impact" },
  "/tech-tasks":                      { id: "PG-034", name: "Technical Tasks & Backlog", category: "Productivity" },
  
  // Case & Client Portals
  "/client-portal":                   { id: "PG-023", name: "Client Portal", category: "Portal" },
  "/portal":                          { id: "PG-023", name: "Client Portal", category: "Portal" },
  "/portal-management":               { id: "PG-027", name: "Portal Experience Management", category: "Portal Admin" },
  "/manage-experiences":              { id: "PG-027", name: "Manage Experiences Workspace", category: "Portal Admin" },
  "/workspace":                       { id: "PG-031", name: "Advocate Case Workspace", category: "Advocacy" },
  "/case-compass":                    { id: "PG-025", name: "Case Compass Console", category: "Advocacy" },
  "/tools/case-compass":              { id: "PG-025", name: "Case Compass Console", category: "Advocacy" },
  "/first-mate/popout":               { id: "PG-037-POP", name: "First Mate Floating Copilot", category: "Advocacy" },
  "/advocacy-pipeline":               { id: "PG-039", name: "Advocacy Pipeline", category: "CRM", description: "Interactive Kanban-style case management pipeline" },
  "/pipeline":                        { id: "PG-039", name: "Advocacy Pipeline", category: "CRM", description: "Interactive Kanban-style case management pipeline" },
  "/post-meeting-review":             { id: "PG-044", name: "Post-Meeting Review", category: "Advocacy", description: "Portmaster post-meeting review and IEP amendment verification" },
  
  // Smart Files Suite
  "/smart-files":                     { id: "PG-033", name: "Smart Files Library", category: "Smart Files" },
  "/guidance":                        { id: "PG-030-GCL", name: "Guide Client Live", category: "Advocacy", description: "Real-time Point Only co-browsing console" },
  "/portal/guidance":                 { id: "PG-030-GCL", name: "Client Portal Guidance Session", category: "Portal", description: "Active Waypoint guidance co-browsing session" },
  
  // Settings & System
  "/settings":                        { id: "PG-024", name: "Settings & Practice Profile", category: "Settings" },
  "/page-id-showcase":                { id: "PG-026", name: "Page ID Showcase", category: "System" },
  
  // Public & Client-Facing Touchpoints
  "/book":                            { id: "PG-029", name: "Discovery Booking Page", category: "Public" },
  "/portal/book":                     { id: "PG-029", name: "Portal Discovery Booking", category: "Portal" },
  "/intake":                          { id: "PG-028", name: "Student Intake Form", category: "Public" },
  
  // Portal Journey Stages (Standard 14-Step Blueprint)
  "/portal/discovery":                { id: "PG-027-S01", name: "Portal: Discovery Inquiry", category: "Portal Stage" },
  "/portal/discovery-call":           { id: "PG-027-S02", name: "Portal: Discovery Call Scheduled", category: "Portal Stage" },
  "/portal/discovery-summary":        { id: "PG-027-S03", name: "Portal: Discovery Call Summary", category: "Portal Stage" },
  "/portal/support-selection":        { id: "PG-027-S04", name: "Portal: Support Tier Selection", category: "Portal Stage" },
  "/portal/student-selection":        { id: "PG-027-S04", name: "Portal: Support Tier Selection", category: "Portal Stage" },
  "/portal/checkout":                 { id: "PG-027-S05", name: "Portal: Payment & Retainer", category: "Portal Stage" },
  "/portal/welcome":                  { id: "PG-027-S06", name: "Portal: Welcome to Waypoint", category: "Portal Stage" },
  "/portal/agreements":               { id: "PG-027-S07", name: "Portal: Advocacy Agreements", category: "Portal Stage" },
  "/portal/student-setup":            { id: "PG-027-S08", name: "Portal: Student Setup Profile", category: "Portal Stage" },
  "/portal/document-upload":          { id: "PG-027-S09", name: "Portal: Document Upload", category: "Portal Stage" },
  "/portal/advocacy-intake":          { id: "PG-027-S10", name: "Portal: Advocacy Detailed Intake", category: "Portal Stage" },
  "/portal/onboarding-complete":      { id: "PG-027-S11", name: "Portal: Onboarding Complete", category: "Portal Stage" },
  "/portal/dashboard":                { id: "PG-027-S12", name: "Portal: Active Client Dashboard", category: "Portal Stage" },
  "/portal/closing":                  { id: "PG-027-S13", name: "Portal: Case Closing & Archive", category: "Portal Stage" },
  "/portal/renewal":                  { id: "PG-027-S14", name: "Portal: Annual Advocacy Renewal", category: "Portal Stage" },
  "/portal/renewals":                 { id: "PG-027-S14", name: "Portal: Annual Advocacy Renewal", category: "Portal Stage" },
  "/portal/getting-started":          { id: "PG-027-S14-GS", name: "Portal: Getting Started Guide", category: "Portal Stage" },
  
  // 404
  "/404":                             { id: "PG-404", name: "Page Not Found", category: "System" },
};

// ─── Dynamic Route Patterns ──────────────────────────────────────────────────
export interface DynamicRoutePattern {
  matcher: (path: string) => boolean;
  id: string;
  name: string;
  category: string;
}

export const DYNAMIC_ROUTES: DynamicRoutePattern[] = [
  // Public Giving & Website Tools
  {
    matcher: (path) => /^\/give\/[^/]+/.test(path),
    id: "PG-040-PUB",
    name: "Public Giving Tool",
    category: "Public",
  },
  
  // Discovery Call Process / Lead Discovery
  {
    matcher: (path) => /^\/leads\/[^/]+\/discovery/.test(path),
    id: "PG-003-DC",
    name: "Discovery Call Process",
    category: "CRM",
  },
  
  // State Complaint Workspace
  {
    matcher: (path) => /^\/tools\/state-complaint-builder\/[^/]+/.test(path) || /^\/state-complaint-builder\/[^/]+/.test(path),
    id: "PG-020-WS",
    name: "State Complaint Workspace",
    category: "Advocacy",
  },

  // Smart Files Sub-pages
  {
    matcher: (path) => /^\/smart-files\/[^/]+\/assignments/.test(path),
    id: "PG-033-ASN",
    name: "Smart File Assignments",
    category: "Smart Files",
  },
  {
    matcher: (path) => /^\/smart-files\/response\/[^/]+/.test(path),
    id: "PG-033-VWR",
    name: "Smart File Portal Viewer",
    category: "Smart Files",
  },
  {
    matcher: (path) => /^\/smart-files\/[^/]+/.test(path),
    id: "PG-033-EDT",
    name: "Smart File Editor",
    category: "Smart Files",
  },

  // Meeting Workspace
  {
    matcher: (path) => /^\/meeting-workspace(\/.*)?$/.test(path),
    id: "PG-043",
    name: "⚡ Meeting Workspace",
    category: "Advocacy",
  },

  // Post-Meeting Review
  {
    matcher: (path) => /^\/post-meeting-review(\/.*)?$/.test(path),
    id: "PG-044",
    name: "Post-Meeting Review",
    category: "Advocacy",
  },

  // Contact / Student Detail Pages
  {
    matcher: (path) => /^\/contacts\/[^/]+/.test(path),
    id: "PG-030",
    name: "Student Workspace",
    category: "CRM",
  },
  {
    matcher: (path) => /^\/students\/[^/]+/.test(path),
    id: "PG-030",
    name: "Student Workspace",
    category: "CRM",
  },

  // Dynamic Forms
  {
    matcher: (path) => /^\/form\/[^/]+/.test(path),
    id: "PG-028",
    name: "Dynamic Intake Form",
    category: "Public",
  },

  // Client Portal Dynamic Routes
  {
    matcher: (path) => /^\/project-workspace\/[^/]+/.test(path),
    id: "PG-023",
    name: "Client Portal Workspace",
    category: "Portal",
  },
  {
    matcher: (path) => /^\/portal\//.test(path),
    id: "PG-027",
    name: "Portal Experience",
    category: "Portal",
  },
  {
    matcher: (path) => /^\/(?:tools\/)?pwn-decoder(?:\/|$)/.test(path),
    id: "PG-010-PWN",
    name: "🧭 PWN Decoder",
    category: "Tools",
  },
];

// ─── Portal Tab & Workflow Sub-ID Mappings ──────────────────────────────────
export const PORTAL_TAB_IDS: Record<string, PageIdInfo> = {
  // Main Navigation Tabs
  "dashboard":        { id: "PG-023-DSH", name: "Portal Dashboard", category: "Portal" },
  "appointments":     { id: "PG-023-APT", name: "Portal Appointments", category: "Portal" },
  "compass":          { id: "PG-023-CMP", name: "Portal Case Compass", category: "Portal" },
  "communication":    { id: "PG-023-COM", name: "Portal Communication", category: "Portal" },
  "tasks":            { id: "PG-023-TSK", name: "Portal Tasks", category: "Portal" },
  "smart-docs":       { id: "PG-023-VAULT", name: "Document Vault", category: "Portal" },
  "upload-docs":      { id: "PG-023-UPL", name: "Upload Documents", category: "Portal" },
  "scan-camera":      { id: "PG-023-CAM", name: "Scan with Camera", category: "Portal" },
  "waypoint-scan":    { id: "PG-023-SCAN", name: "Waypoint Scan", category: "Portal" },
  "files":            { id: "PG-023-ACT", name: "Action Center", category: "Portal" },
  "parking-lot":       { id: "PG-023-PRK", name: "Parking Lot", category: "Portal" },
  "financials":       { id: "PG-023-MBR", name: "Portal Membership", category: "Portal" },
  "voyage-log":       { id: "PG-023-VOY", name: "Voyage Meeting Logs", category: "Portal" },
  "notes":            { id: "PG-023-NTE", name: "Case Notes", category: "Portal" },
  "details":          { id: "PG-023-STU", name: "My Students", category: "Portal" },
  "tools":            { id: "PG-023-TLS", name: "Advocacy Tools", category: "Portal" },
  "cases":            { id: "PG-023-CAS", name: "Case Management", category: "Portal" },
  "attorney":         { id: "PG-023-ATTY", name: "Legal Counsel Info", category: "Portal" },
  "renewal":          { id: "PG-023-RNW", name: "Plan Renewal", category: "Portal" },
  "renewals":         { id: "PG-023-RNW", name: "Plan Renewal", category: "Portal" },
  "iep-comparator":   { id: "PG-023-IEP", name: "IEP Comparator", category: "Portal" },
  "meeting-prep":     { id: "PG-023-PREP", name: "Meeting Prep Center", category: "Portal" },
  "plan-transition":  { id: "PG-023-TRN", name: "Plan Transition", category: "Portal" },
  "transition":       { id: "PG-023-TRN", name: "Plan Transition", category: "Portal" },

  // Onboarding Stage Modules
  "discovery-call":   { id: "PG-027-S02", name: "Discovery Call Scheduled", category: "Portal Stage" },
  "choose-support":   { id: "PG-027-S04", name: "Support Tier Selection", category: "Portal Stage" },
  "agreements":       { id: "PG-027-S07", name: "Advocacy Agreements", category: "Portal Stage" },
  "student-setup":    { id: "PG-027-S08", name: "Student Setup Profile", category: "Portal Stage" },
  "upload-records":   { id: "PG-027-S09", name: "Document Upload", category: "Portal Stage" },
  "advocacy-intake":  { id: "PG-027-S10", name: "Advocacy Detailed Intake", category: "Portal Stage" },
  "explore-portal":   { id: "PG-027-S12", name: "Explore Portal Tour", category: "Portal Stage" },
  "guidance":         { id: "PG-030-GCL", name: "Guide Client Live", category: "Advocacy" },
};

// ─── Crew Quarters Sub-ID Mappings ───────────────────────────────────────────
export const CREW_QUARTERS_TAB_IDS: Record<string, PageIdInfo> = {
  "overview":   { id: "PG-038-OVR", name: "Crew Quarters Overview", category: "Core", description: "Personal employee home base and operational station overview" },
  "messages":   { id: "PG-038-MSG", name: "Crew Messages Workspace", category: "Communications", description: "Internal team communication, direct messaging, and case collaboration" },
  "tasks":      { id: "PG-038-TSK", name: "Crew Task Queue", category: "Productivity", description: "Personal advocate action items, IEP reviews, and milestones" },
  "schedule":   { id: "PG-038-SCH", name: "Team Schedule & Time Off", category: "Schedule", description: "Staff calendar, leave requests, and coverage scheduling" },
  "resources":  { id: "PG-038-RES", name: "Employee Resources", category: "Content", description: "Staff directory, handbook, policy templates, and guidance" },
};

/**
 * Resolves a Crew Quarters tab identifier (e.g. 'messages', 'tasks', 'schedule', 'resources') to its specific Sub-Page ID.
 */
export function resolveCrewQuartersTabId(tabId: string): PageIdInfo | null {
  return CREW_QUARTERS_TAB_IDS[tabId] || null;
}

/**
 * Resolves a portal tab identifier (e.g. 'files', 'smart-docs', 'compass') to its specific Sub-Page ID.
 */
export function resolvePortalTabId(tabId: string): PageIdInfo | null {
  return PORTAL_TAB_IDS[tabId] || null;
}

/**
 * Broadcasts a custom page ID update so that the global corner PageIdBadge reflects sub-views immediately.
 */
export function broadcastPageId(idInfo: PageIdInfo) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("waypoint:page-id-change", { detail: idInfo }));
  }
}

/**
 * Resolves any browser pathname to its corresponding Page ID and title.
 */
export function resolvePageId(pathname: string, search = ""): PageIdInfo {
  const cleanPath = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

  // Check URL query search for sub-tabs if on portal
  if (cleanPath === "/portal" || cleanPath === "/client-portal") {
    const urlParams = new URLSearchParams(search || (typeof window !== "undefined" ? window.location.search : ""));
    const tabParam = urlParams.get("tab");
    if (tabParam && PORTAL_TAB_IDS[tabParam]) {
      return PORTAL_TAB_IDS[tabParam];
    }
  }

  // Check URL query search for sub-tabs if on crew quarters
  if (cleanPath === "/crew-quarters" || cleanPath === "/") {
    const urlParams = new URLSearchParams(search || (typeof window !== "undefined" ? window.location.search : ""));
    const tabParam = urlParams.get("tab");
    if (tabParam && CREW_QUARTERS_TAB_IDS[tabParam]) {
      return CREW_QUARTERS_TAB_IDS[tabParam];
    }
  }

  // 1. Direct exact match
  if (PAGE_IDS[cleanPath]) {
    return PAGE_IDS[cleanPath];
  }

  // 2. Dynamic pattern match
  for (const route of DYNAMIC_ROUTES) {
    if (route.matcher(cleanPath)) {
      return {
        id: route.id,
        name: route.name,
        category: route.category,
      };
    }
  }

  // 3. Fallback for unmapped route
  return {
    id: "PG-GEN",
    name: cleanPath === "/" ? "Dashboard" : "Waypoint Page",
    category: "General",
  };
}
