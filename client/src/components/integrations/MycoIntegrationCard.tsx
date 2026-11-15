import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BrainCircuit,
  CheckCircle2,
  Copy,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Webhook,
} from "lucide-react";

const SPORE_KINDS = [
  { value: "all", label: "All Spores" },
  { value: "architecture", label: "Architecture" },
  { value: "guardrail", label: "Guardrail" },
  { value: "decision", label: "Decision" },
  { value: "discovery", label: "Discovery" },
  { value: "workflow", label: "Workflow" },
  { value: "case_note", label: "Case Note" },
] as const;

export function MycoIntegrationCard() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.myco.getStatus.useQuery();

  const [expanded, setExpanded] = useState(true);
  const [endpointInput, setEndpointInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [ferpaSanitize, setFerpaSanitize] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");

  const [showNewSpore, setShowNewSpore] = useState(false);
  const [newSporeKind, setNewSporeKind] = useState<
    "architecture" | "guardrail" | "decision" | "discovery" | "workflow" | "case_note"
  >("discovery");
  const [newSporeTitle, setNewSporeTitle] = useState("");
  const [newSporeSummary, setNewSporeSummary] = useState("");
  const [newSporeTags, setNewSporeTags] = useState("");

  const config = data?.config;
  const spores = data?.spores ?? [];
  const logs = data?.logs ?? [];
  const stats = data?.stats;

  const effectiveEndpoint = endpointInput || config?.endpointUrl || "";
  const effectiveSecret = secretInput || config?.webhookSecret || "whsec_waypoint_myco_local";
  const effectiveFerpa = ferpaSanitize ?? config?.ferpaSanitizeExternal ?? true;

  const saveConfigMutation = trpc.myco.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Myco integration configuration saved");
      utils.myco.getStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const syncSnapshotMutation = trpc.myco.syncCrmSnapshot.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Synced CRM snapshot to Myco (${res.metrics.contactsCount} contacts, ${res.metrics.projectsCount} students, ${res.metrics.activeDoNotServeCount} active Do Not Serve)`
      );
      utils.myco.getStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const simulateWebhookMutation = trpc.myco.simulateWebhook.useMutation({
    onSuccess: (res) => {
      if (res.doNotServeMatched) {
        toast.warning(`Webhook screened by Do Not Serve: ${res.doNotServeSummary}`);
      } else {
        toast.success("Inbound Myco webhook verified and spore ingested");
      }
      utils.myco.getStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createSporeMutation = trpc.myco.createSpore.useMutation({
    onSuccess: (res) => {
      if (res.blockedByDoNotServe) {
        toast.error("Spore sync blocked: matched an active Do Not Serve restriction");
      } else {
        toast.success("Memorized new Myco spore in .myco/spores.json and CRM database");
        setNewSporeTitle("");
        setNewSporeSummary("");
        setNewSporeTags("");
        setShowNewSpore(false);
      }
      utils.myco.getStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSporeMutation = trpc.myco.deleteSpore.useMutation({
    onSuccess: () => {
      toast.success("Removed spore from Myco memory");
      utils.myco.getStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredSpores = spores.filter((spore) => {
    if (kindFilter !== "all" && spore.kind !== kindFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      spore.title.toLowerCase().includes(q) ||
      spore.summary.toLowerCase().includes(q) ||
      spore.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/myco/webhook`
      : "http://localhost:3000/api/myco/webhook";

  const mcpSnippet = JSON.stringify(
    {
      mcpServers: {
        "myco-waypoint": {
          command: "node",
          args: ["scripts/myco-mcp-server.mjs"],
          env: { MYCO_PROJECT: "custom-crm-pro" },
        },
      },
    },
    null,
    2
  );

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Card className="p-6 rounded-xl border border-border shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
            <BrainCircuit className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Myco Collective Memory & Agent Bridge
              </h3>
              <Badge
                variant="outline"
                className="text-[11px] font-mono border-blue-500/30 text-blue-300"
              >
                PG-014-MYC
              </Badge>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> Active · MCP + Webhook
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Persistent AI agent memory (<code>.myco/spores.json</code> + MCP) and live CRM spore
              sync with FERPA & Do Not Serve protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncSnapshotMutation.mutate()}
            disabled={syncSnapshotMutation.isPending}
            className="gap-1.5 text-xs"
          >
            {syncSnapshotMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sync CRM Snapshot
          </Button>
          <Button
            variant={expanded ? "outline" : "default"}
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Hide" : "Manage"}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          {/* Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Active Spores
              </p>
              <p className="text-lg font-semibold text-foreground mt-0.5">
                {isLoading ? "…" : stats?.totalSpores ?? spores.length}
              </p>
              <p className="text-[11px] text-muted-foreground">Shared across MCP & D1</p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                MCP Server
              </p>
              <p className="text-sm font-mono font-semibold text-emerald-400 mt-1">
                myco-waypoint
              </p>
              <p className="text-[11px] text-muted-foreground">3 tools ready via stdio</p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                FERPA Guardrail
              </p>
              <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                {effectiveFerpa ? "Sanitizing PII" : "Internal Raw"}
              </p>
              <p className="text-[11px] text-muted-foreground">Do Not Serve screened</p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Sync Events
              </p>
              <p className="text-lg font-semibold text-foreground mt-0.5">
                {(stats?.inboundCount ?? 0) + (stats?.outboundCount ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {stats?.dnsFlaggedCount ?? 0} Do Not Serve alerts
              </p>
            </div>
          </div>

          {/* Part 1 & Part 2 Connection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Part 1: MCP Server Config */}
            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-blue-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    1. AI Agent Memory (MCP Server)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => copyText(mcpSnippet, "MCP configuration")}
                >
                  <Copy className="h-3 w-3" /> Copy MCP JSON
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configured in <code>.agents/mcp_config.json</code> and <code>.mcp.json</code>. Exposes{" "}
                <code>myco_recall</code>, <code>myco_memorize</code>, and{" "}
                <code>myco_project_summary</code>.
              </p>
              <pre className="rounded bg-background/80 border border-border p-2.5 text-[11px] font-mono text-muted-foreground overflow-x-auto">
                {mcpSnippet}
              </pre>
            </div>

            {/* Part 2: Live CRM Webhook & Daemon Config */}
            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-blue-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    2. Live CRM Webhook & Daemon Sync
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => copyText(webhookUrl, "Myco Webhook URL")}
                >
                  <Copy className="h-3 w-3" /> Copy Webhook
                </Button>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Inbound Webhook Endpoint (POST)
                </Label>
                <p className="text-xs font-mono text-foreground bg-background/80 border border-border rounded px-2.5 py-1.5 mt-1 break-all">
                  {webhookUrl}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    External Myco Daemon URL (Optional)
                  </Label>
                  <Input
                    value={effectiveEndpoint}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    placeholder="http://localhost:7331/api/spores"
                    className="h-8 text-xs font-mono mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Webhook Signing Secret
                  </Label>
                  <Input
                    value={effectiveSecret}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder="whsec_waypoint_myco_local"
                    className="h-8 text-xs font-mono mt-1"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={effectiveFerpa}
                    onChange={(e) => setFerpaSanitize(e.target.checked)}
                    className="rounded border-border"
                  />
                  FERPA-sanitize PII on outbound spores
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={simulateWebhookMutation.isPending}
                    onClick={() =>
                      simulateWebhookMutation.mutate({
                        event: "spore.created",
                        kind: "discovery",
                        title: "Myco Daemon Handshake Spore",
                        summary:
                          "Verified bidirectional Myco webhook ingestion and Do Not Serve screening on PG-014.",
                        tags: ["webhook-verified", "PG-014"],
                      })
                    }
                  >
                    <Sparkles className="h-3 w-3" /> Test Webhook
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={saveConfigMutation.isPending}
                    onClick={() =>
                      saveConfigMutation.mutate({
                        endpointUrl: effectiveEndpoint,
                        webhookSecret: effectiveSecret,
                        ferpaSanitizeExternal: effectiveFerpa,
                      })
                    }
                  >
                    <Save className="h-3 w-3" /> Save
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Spores Explorer */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-foreground">
                  Myco Collective Spores ({filteredSpores.length})
                </h4>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowNewSpore((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5" />
                {showNewSpore ? "Cancel" : "Memorize New Spore"}
              </Button>
            </div>

            {showNewSpore && (
              <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Spore Title</Label>
                    <Input
                      value={newSporeTitle}
                      onChange={(e) => setNewSporeTitle(e.target.value)}
                      placeholder="e.g. IEP Amendment Escalation Rule for Fulton County"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kind</Label>
                    <select
                      value={newSporeKind}
                      onChange={(e) => setNewSporeKind(e.target.value as any)}
                      className="w-full h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground mt-1"
                    >
                      <option value="discovery">Discovery</option>
                      <option value="architecture">Architecture</option>
                      <option value="guardrail">Guardrail</option>
                      <option value="decision">Decision</option>
                      <option value="workflow">Workflow</option>
                      <option value="case_note">Case Note</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Summary & Context</Label>
                  <textarea
                    value={newSporeSummary}
                    onChange={(e) => setNewSporeSummary(e.target.value)}
                    rows={2}
                    placeholder="Record durable project knowledge, workflow insight, or architectural rule..."
                    className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Input
                    value={newSporeTags}
                    onChange={(e) => setNewSporeTags(e.target.value)}
                    placeholder="Tags (comma-separated, e.g. iep, workflow, PG-043)"
                    className="h-8 text-xs max-w-xs"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    disabled={
                      createSporeMutation.isPending ||
                      !newSporeTitle.trim() ||
                      !newSporeSummary.trim()
                    }
                    onClick={() =>
                      createSporeMutation.mutate({
                        kind: newSporeKind,
                        title: newSporeTitle.trim(),
                        summary: newSporeSummary.trim(),
                        tags: newSporeTags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                  >
                    {createSporeMutation.isPending && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Save Spore
                  </Button>
                </div>
              </div>
            )}

            {/* Search and Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search spores by title, summary, or tag..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {SPORE_KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKindFilter(k.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      kindFilter === k.value
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spores List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredSpores.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No matching spores found.
                </p>
              ) : (
                filteredSpores.map((spore) => (
                  <div
                    key={spore.id}
                    className="rounded-lg bg-muted/30 border border-border p-3 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {spore.kind}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground">
                          {spore.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          · {spore.author}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {spore.summary}
                      </p>
                      {spore.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {spore.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/70 border border-border text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => deleteSporeMutation.mutate({ sporeId: spore.id })}
                      title="Delete spore"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Recent Sync & Webhook Log */}
            {logs.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Recent Myco Sync & Webhook Activity
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {logs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded bg-muted/20 border border-border/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase ${
                            log.doNotServeMatched
                              ? "border-amber-500/40 text-amber-300"
                              : "border-emerald-500/30 text-emerald-400"
                          }`}
                        >
                          {log.direction}
                        </Badge>
                        <span className="text-muted-foreground truncate">{log.summary}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

