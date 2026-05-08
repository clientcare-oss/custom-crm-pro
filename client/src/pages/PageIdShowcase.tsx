import {
  Hash, Tag, Fingerprint, Bookmark, Barcode, QrCode,
  BadgeInfo, BadgeCheck, Layers,
  Code2, Terminal, Binary, Braces, ScanLine,
  Scan, Focus, Crosshair, MapPin, Locate,
  Milestone, Flag, Signpost, Route,
  Info, Inspect, Eye,
  Bug, Wrench, Gauge,
  IdCard, FileCode2, FileBadge,
  Stamp, Sticker, Tags, Ticket, TicketCheck,
  Cpu, Navigation
} from "lucide-react";

const CANDIDATES = [
  // --- "Reference / ID" feel ---
  { icon: Hash,        name: "Hash",        note: "Clean, minimal — like #PAGE-ID" },
  { icon: Tag,         name: "Tag",         note: "Familiar label metaphor" },
  { icon: Tags,        name: "Tags",        note: "Multi-tag variant" },
  { icon: Fingerprint, name: "Fingerprint", note: "Unique identity — very distinctive" },
  { icon: IdCard,      name: "IdCard",      note: "ID card — obvious reference" },
  { icon: Ticket,      name: "Ticket",      note: "Ticket/issue number feel" },
  { icon: TicketCheck, name: "TicketCheck", note: "Resolved ticket variant" },
  { icon: Stamp,       name: "Stamp",       note: "Stamped reference" },
  { icon: Sticker,     name: "Sticker",     note: "Casual badge feel" },
  { icon: Bookmark,    name: "Bookmark",    note: "Page bookmark" },
  { icon: Milestone,   name: "Milestone",   note: "Milestone marker" },
  { icon: Flag,        name: "Flag",        note: "Flag for attention" },
  { icon: Signpost,    name: "Signpost",    note: "Navigation signpost" },
  { icon: Route,       name: "Route",       note: "Route/path reference" },
  // --- "Debug / Dev" feel ---
  { icon: Bug,         name: "Bug",         note: "Explicit debug reference" },
  { icon: Code2,       name: "Code2",       note: "Code/dev marker" },
  { icon: Terminal,    name: "Terminal",    note: "Dev terminal feel" },
  { icon: Binary,      name: "Binary",      note: "Technical/binary" },
  { icon: Braces,      name: "Braces",      note: "Code braces" },
  { icon: FileCode2,   name: "FileCode2",   note: "File with code" },
  { icon: FileBadge,   name: "FileBadge",   note: "Badged file" },
  { icon: Cpu,         name: "Cpu",         note: "System/hardware feel" },
  // --- "Inspect / Locate" feel ---
  { icon: Inspect,     name: "Inspect",     note: "Inspect element feel" },
  { icon: Scan,        name: "Scan",        note: "Scan/identify" },
  { icon: ScanLine,    name: "ScanLine",    note: "Scan line variant" },
  { icon: Focus,       name: "Focus",       note: "Focus/zoom in" },
  { icon: Crosshair,   name: "Crosshair",   note: "Pinpoint location" },
  { icon: Locate,      name: "Locate",      note: "GPS locate feel" },
  { icon: MapPin,      name: "MapPin",      note: "Pin a location" },
  { icon: Eye,         name: "Eye",         note: "View/observe" },
  { icon: Info,        name: "Info",        note: "Info badge" },
  { icon: BadgeInfo,   name: "BadgeInfo",   note: "Badge with info" },
  { icon: BadgeCheck,  name: "BadgeCheck",  note: "Verified badge" },
  { icon: Gauge,       name: "Gauge",       note: "Status gauge" },
  { icon: Layers,      name: "Layers",      note: "Layered pages" },
  { icon: Navigation,  name: "Navigation",  note: "Navigation marker" },
  { icon: Barcode,     name: "Barcode",     note: "Barcode ID" },
  { icon: QrCode,      name: "QrCode",      note: "QR code ID" },
  { icon: Wrench,      name: "Wrench",      note: "Tools/debug" },
];

const GROUPS = [
  { label: "Reference / ID feel", keys: ["Hash","Tag","Tags","Fingerprint","IdCard","Ticket","TicketCheck","Stamp","Sticker","Bookmark","Milestone","Flag","Signpost","Route"] },
  { label: "Debug / Dev feel", keys: ["Bug","Code2","Terminal","Binary","Braces","FileCode2","FileBadge","Cpu"] },
  { label: "Inspect / Locate feel", keys: ["Inspect","Scan","ScanLine","Focus","Crosshair","Locate","MapPin","Eye","Info","BadgeInfo","BadgeCheck","Gauge","Layers","Navigation","Barcode","QrCode","Wrench"] },
];

const byName = Object.fromEntries(CANDIDATES.map(c => [c.name, c]));

// Example page IDs
const EXAMPLE_PAGES = [
  { id: "PG-001", label: "Dashboard" },
  { id: "PG-002", label: "Client Portal" },
  { id: "PG-014", label: "ContactDetail / Student" },
  { id: "PG-022", label: "Bill Guardian" },
  { id: "PG-031", label: "BrainDump" },
];

function PageIdBadge({ icon: Icon, pageId, label }: { icon: any; pageId: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-mono text-muted-foreground select-none">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="font-semibold text-foreground">{pageId}</span>
      <span className="text-muted-foreground/60">·</span>
      <span>{label}</span>
    </div>
  );
}

export default function PageIdShowcase() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-10 max-w-5xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Page ID Badge — Icon Showcase</h1>
        <p className="text-sm text-muted-foreground">
          Each page gets a small persistent badge (e.g. <code className="bg-muted px-1 py-0.5 rounded text-xs">PG-014</code>) so you can reference any screen precisely when reporting issues.
          Pick the icon style that feels right — it will appear in the same spot on every page.
        </p>
      </div>

      {/* Live preview with each icon */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Live Badge Preview (5 example pages)</h2>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {[Hash, Tag, Fingerprint, IdCard, Bug, Inspect, Crosshair, Ticket, Barcode, Scan].map((Icon, i) => (
            <div key={i} className="space-y-1.5">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{CANDIDATES.find(c => c.icon === Icon)?.name}</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PAGES.map(p => (
                  <PageIdBadge key={p.id} icon={Icon} pageId={p.id} label={p.label} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full grid by group */}
      {GROUPS.map(group => (
        <div key={group.label} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {group.keys.map(name => {
              const c = byName[name];
              if (!c) return null;
              const Icon = c.icon;
              return (
                <div key={name} className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2 text-center hover:border-primary/40 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{name}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{c.note}</p>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    <Icon className="h-2.5 w-2.5" />
                    <span className="font-semibold text-foreground">PG-014</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
        <p className="text-sm font-semibold text-foreground">How it would work</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Every page gets a small badge in the bottom-right corner (or top of the page header) showing its unique ID.
          When you or a client spots an issue, they just say <strong>"problem on PG-022"</strong> and I can jump directly to <code className="bg-muted px-1 py-0.5 rounded">BillGuardian.tsx</code> without any guesswork.
          The badge is subtle enough not to distract but always visible. IDs can follow a simple scheme: <code className="bg-muted px-1 py-0.5 rounded">PG-001</code> Dashboard, <code className="bg-muted px-1 py-0.5 rounded">PG-002</code> Contacts, etc.
        </p>
      </div>
    </div>
  );
}
