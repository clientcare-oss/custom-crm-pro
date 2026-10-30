import { useState } from "react";
import { Link } from "wouter";
import { Plug, Phone, Copy, CheckCircle2, ExternalLink, AlertCircle, ChevronDown, ChevronUp, Eye, EyeOff, Save, Loader2, Mail, Wifi, WifiOff, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function QuoIntegrationCard() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const liveProductionUrl = "https://custom-crm-pro.clientcare-fa6.workers.dev/api/quo/webhook";
  const webhookUrl = isLocal ? liveProductionUrl : `${window.location.origin}/api/quo/webhook`;

  const { data: quoStatus, refetch: refetchStatus } = trpc.system.getQuoStatus.useQuery(undefined, {
    retry: false,
  });

  const setSecretMutation = trpc.system.setQuoSecret.useMutation({
    onSuccess: () => {
      toast.success("Quo webhook secret saved successfully");
      setSecretInput("");
      refetchStatus();
    },
    onError: (e) => toast.error("Failed to save secret: " + e.message),
  });

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      toast.success("Webhook URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSaveSecret() {
    if (!secretInput.trim()) {
      toast.error("Please enter the signing secret from Quo");
      return;
    }
    setSecretMutation.mutate({ secret: secretInput.trim() });
  }

  const isConfigured = quoStatus?.configured ?? false;

  return (
    <Card className="p-6 rounded-xl border border-border">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3 border border-emerald-200 dark:border-emerald-800">
            <Phone className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground">Quo (OpenPhone)</h3>
              <Badge variant="outline" className="text-xs">Phone System</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Auto-import call transcripts and AI summaries from Quo into student profiles.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isConfigured ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              Setup required
            </div>
          )}
          <Link href="/settings/integrations/quo">
            <Button variant="outline" size="sm" className="gap-1.5 border-cyan-800 text-cyan-400 hover:bg-cyan-950/30">
              <Phone className="h-3.5 w-3.5" />
              <span>Quo Console</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Hide" : (isConfigured ? "Manage" : "Setup")}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          {/* Webhook URL */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">
              Step 1 — Your Webhook URL
            </Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono text-foreground border border-border truncate">
                {webhookUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyWebhookUrl} className="flex-shrink-0 gap-1.5">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Copy this URL and paste it into Quo → Settings → Integrations → Webhooks.
            </p>
          </div>

          {/* Quo steps */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3 block">
              Step 2 — Configure in Quo
            </Label>
            <ol className="space-y-2.5">
              {[
                { step: "a", title: "Open Quo Settings → Integrations → Webhooks", link: "https://app.quo.com/settings/integrations", linkLabel: "Open Quo Settings ↗" },
                { step: "b", title: "Add a new webhook — paste the URL above" },
                { step: "c", title: "Select events: call.transcript.completed and call.summary.completed" },
                { step: "d", title: "Save the webhook — Quo will show a Signing Secret. Copy it." },
              ].map((item) => (
                <li key={item.step} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center mt-0.5">{item.step}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{item.title}</p>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline inline-flex items-center gap-1 mt-0.5">
                        <ExternalLink className="h-3 w-3" />{item.linkLabel}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Secret input */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">
              Step 3 — Paste Signing Secret Here
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <VoiceInput
                  type={showSecret ? "text" : "password"}
                  placeholder={isConfigured ? "Secret already saved — paste new value to update" : "Paste the signing secret from Quo..."}
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveSecret}
                disabled={setSecretMutation.isPending || !secretInput.trim()}
                className="gap-1.5 flex-shrink-0"
              >
                {setSecretMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Secret
              </Button>
            </div>
            {isConfigured && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Secret is saved. Quo webhooks are active. Paste a new value above to update it.
              </p>
            )}
          </div>

          {/* How it works */}
          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-2">How it works after setup</p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />When a call ends, Quo sends the transcript and AI summary to your CRM automatically.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />If the caller's number matches exactly one student, it auto-attaches to their Call Logs tab.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />If multiple or no students match, the call goes to the Unassigned Call Logs inbox for manual assignment.</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

function GmailIntegrationCard() {
  const [expanded, setExpanded] = useState(true);
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [oauthEmailInput, setOauthEmailInput] = useState("clientcare@waypointadvocates.com");
  const [syncRangeDays, setSyncRangeDays] = useState<number>(90);

  const { data: gmailStatus, refetch: refetchStatus } = trpc.system.getGmailStatus.useQuery(undefined, {
    retry: false,
  });

  const { data: hubStatus, refetch: refetchHubStatus } = trpc.messages.gmailStatus.useQuery(undefined, {
    retry: false,
  });

  const initiateOAuthMutation = trpc.messages.initiateGmailOAuth.useMutation({
    onSuccess: (res) => {
      if (res.authUrl) {
        toast.info("Google OAuth 2.0 URL ready. Opening authorization flow...");
        window.open(res.authUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.warning(res.message);
      }
      refetchHubStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  const connectMailboxMutation = trpc.messages.connectGmailMailbox.useMutation({
    onSuccess: (mb) => {
      toast.success(`Connected mailbox ${mb.email}`);
      refetchHubStatus();
      refetchStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  const reconnectMailboxMutation = trpc.messages.reconnectGmailMailbox.useMutation({
    onSuccess: (mb) => {
      toast.success(`Reconnected mailbox ${mb.email}`);
      refetchHubStatus();
      refetchStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  const disconnectMailboxMutation = trpc.messages.disconnectGmailMailbox.useMutation({
    onSuccess: () => {
      toast.success("Company Gmail mailbox disconnected");
      refetchHubStatus();
      refetchStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateSettingsMutation = trpc.messages.updateGmailSettings.useMutation({
    onSuccess: () => {
      toast.success("Gmail synchronization settings updated");
      refetchHubStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  const syncGmailMutation = trpc.messages.syncGmail.useMutation({
    onSuccess: (res) => {
      toast.success(`Sync complete: ${res.syncedCount} new, ${res.matchedCount} matched, ${res.needsReviewCount} in Needs Review`);
      refetchHubStatus();
    },
    onError: (e) => toast.error("Sync failed: " + e.message),
  });

  const setCredentialsMutation = trpc.system.setGmailCredentials.useMutation({
    onSuccess: () => {
      toast.success("Gmail credentials saved successfully");
      setGmailUser("");
      setGmailAppPassword("");
      refetchStatus();
      refetchHubStatus();
    },
    onError: (e) => toast.error("Failed to save credentials: " + e.message),
  });

  const testConnectionMutation = trpc.system.testGmailConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Gmail connection verified! Emails will send correctly.");
      } else {
        toast.error("Connection failed: " + result.message);
      }
    },
    onError: (e) => toast.error("Test failed: " + e.message),
  });

  const clearCredentialsMutation = trpc.system.clearGmailCredentials.useMutation({
    onSuccess: () => {
      toast.success("Gmail credentials removed");
      refetchStatus();
      refetchHubStatus();
    },
    onError: (e) => toast.error("Failed to remove credentials: " + e.message),
  });

  function handleSave() {
    if (!gmailUser.trim() || !gmailAppPassword.trim()) {
      toast.error("Please enter both your Gmail address and App Password");
      return;
    }
    setCredentialsMutation.mutate({ gmailUser: gmailUser.trim(), gmailAppPassword: gmailAppPassword.trim() });
  }

  const primaryMailbox = hubStatus?.primaryMailbox;
  const overallStatus = hubStatus?.overallStatus || (gmailStatus?.configured ? "connected" : "disconnected");
  const isConnected = overallStatus === "connected" || overallStatus === "syncing" || Boolean(gmailStatus?.configured);
  const connectedEmail = primaryMailbox?.email || gmailStatus?.gmailUser || null;

  const statusBadgeConfig: Record<string, { label: string; className: string }> = {
    connected: { label: "Connected", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    syncing: { label: "Syncing", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
    disconnected: { label: "Disconnected", className: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
    attention_required: { label: "Attention Required", className: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
    error: { label: "Error", className: "bg-rose-500/15 text-rose-300 border-rose-500/40" },
    configuration_required: { label: "Configuration Required", className: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  };
  const currentBadge = statusBadgeConfig[overallStatus] || statusBadgeConfig.disconnected;

  return (
    <Card className="p-6 rounded-xl border border-border">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 rounded-xl bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
            <Mail className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground">Gmail — Client Communication Hub</h3>
              <Badge variant="outline" className="text-xs">Two-Way Sync & OAuth 2.0</Badge>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentBadge.className}`}>
                {overallStatus === "connected" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {currentBadge.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Two-way Gmail synchronization, automatic client & student filing, Needs Review queue, and HoneyBook-style case activity feed.
            </p>
            {connectedEmail && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected Mailbox: <strong>{connectedEmail}</strong></span>
                {primaryMailbox?.lastSyncAt && (
                  <span className="text-muted-foreground ml-2">
                    · Last synced {new Date(primaryMailbox.lastSyncAt).toLocaleTimeString()}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
          <Link href="/messages">
            <Button variant="outline" size="sm" className="gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
              <Mail className="h-3.5 w-3.5" />
              <span>Open Communication Hub</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Hide" : (isConnected ? "Manage" : "Setup")}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          {/* OAuth 2.0 Connection & Sync Management Panel */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Google OAuth 2.0 Company Mailbox Connection</span>
                  {!hubStatus?.oauthConfigured && (
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      OAuth Env Keys Pending
                    </span>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Minimum required scopes: <code className="text-[11px]">gmail.readonly</code>, <code className="text-[11px]">gmail.send</code>, <code className="text-[11px]">gmail.modify</code>
                </p>
              </div>
              {hubStatus?.stats && (
                <div className="flex items-center gap-3 text-xs">
                  <div className="px-2.5 py-1 rounded-lg bg-background border border-border">
                    <span className="text-muted-foreground">Synced: </span>
                    <strong className="text-foreground">{hubStatus.stats.totalSyncedEmails}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-background border border-border">
                    <span className="text-muted-foreground">Unread: </span>
                    <strong className="text-sky-400">{hubStatus.stats.unreadInboundCount}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-background border border-border">
                    <span className="text-muted-foreground">Needs Review: </span>
                    <strong className="text-amber-400">{hubStatus.stats.needsReviewCount}</strong>
                  </div>
                </div>
              )}
            </div>

            {primaryMailbox?.errorMessage && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{primaryMailbox.errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Company Mailbox Address</Label>
                <Input
                  type="email"
                  value={oauthEmailInput}
                  onChange={(e) => setOauthEmailInput(e.target.value)}
                  placeholder="clientcare@waypointadvocates.com"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Historical Sync Range</Label>
                <select
                  value={primaryMailbox?.syncRangeDays ?? syncRangeDays}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    setSyncRangeDays(days);
                    if (primaryMailbox) {
                      updateSettingsMutation.mutate({ mailboxId: primaryMailbox.id, syncRangeDays: days });
                    }
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                >
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days (Recommended)</option>
                  <option value={180}>Last 180 Days</option>
                  <option value={365}>Last 1 Year</option>
                  <option value={1825}>All History (5 Years)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!isConnected ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => initiateOAuthMutation.mutate({ emailHint: oauthEmailInput.trim() })}
                      disabled={initiateOAuthMutation.isPending}
                      className="gap-1.5"
                    >
                      {initiateOAuthMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Connect with Google OAuth
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        connectMailboxMutation.mutate({
                          email: oauthEmailInput.trim() || "clientcare@waypointadvocates.com",
                          syncRangeDays,
                        })
                      }
                      disabled={connectMailboxMutation.isPending}
                    >
                      Authorize Mailbox
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => syncGmailMutation.mutate({ mailboxId: primaryMailbox?.id })}
                      disabled={syncGmailMutation.isPending}
                      className="gap-1.5"
                    >
                      {syncGmailMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                      Sync Now
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => reconnectMailboxMutation.mutate({ mailboxId: primaryMailbox?.id, email: connectedEmail || oauthEmailInput })}
                      disabled={reconnectMailboxMutation.isPending}
                    >
                      Reconnect
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectMailboxMutation.mutate({ mailboxId: primaryMailbox?.id })}
                      disabled={disconnectMailboxMutation.isPending}
                      className="text-destructive hover:text-destructive gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Step 1 — Get App Password (SMTP Fallback) */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3 block">
              SMTP App Password Fallback — Create a Gmail App Password
            </Label>
            <ol className="space-y-2.5">
              {[
                { step: "a", title: "Go to your Google Account security settings", link: "https://myaccount.google.com/apppasswords", linkLabel: "Open App Passwords ↗" },
                { step: "b", title: "Make sure 2-Step Verification is enabled on your account" },
                { step: "c", title: 'Under "App name", type "Waypoint CRM" and click Create' },
                { step: "d", title: "Google will show a 16-character password — copy it (spaces are OK)" },
              ].map((item) => (
                <li key={item.step} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center mt-0.5">{item.step}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{item.title}</p>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline inline-flex items-center gap-1 mt-0.5">
                        <ExternalLink className="h-3 w-3" />{item.linkLabel}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Step 2 — Enter credentials */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">
              Enter Your Gmail App Password Credentials
            </Label>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Gmail Address</Label>
                <Input
                  type="email"
                  placeholder={isConnected ? (connectedEmail ?? "your@gmail.com") : "your@gmail.com"}
                  value={gmailUser}
                  onChange={(e) => setGmailUser(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">App Password (16 characters)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={isConnected ? "Saved — paste new value to update" : "xxxx xxxx xxxx xxxx"}
                    value={gmailAppPassword}
                    onChange={(e) => setGmailAppPassword(e.target.value)}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This is the 16-character App Password from Google — not your regular Gmail password.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={setCredentialsMutation.isPending || (!gmailUser.trim() && !gmailAppPassword.trim())}
                className="gap-1.5"
              >
                {setCredentialsMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Credentials
              </Button>

              {gmailStatus?.configured && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending}
                    className="gap-1.5"
                  >
                    {testConnectionMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wifi className="h-3.5 w-3.5" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearCredentialsMutation.mutate()}
                    disabled={clearCredentialsMutation.isPending}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    {clearCredentialsMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remove App Password
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-2">How the Gmail-Connected Client Communication Hub works</p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />Incoming and outgoing client emails automatically synchronize and deduplicate by Gmail Message ID.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />Verified parent emails automatically file under the family and student, while multi-student ambiguous or unknown emails route to Needs Review.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />Newly synchronized Gmail correspondence defaults to Internal Staff View until explicitly published to the Parent Portal.</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

function WixDomainCard() {
  const [expanded, setExpanded] = useState(false);
  const [domainInput, setDomainInput] = useState("");

  const { data: domainStatus, refetch } = trpc.system.getPortalDomain.useQuery();
  const isConfigured = !!(domainStatus?.portalDomain);
  const savedDomain = domainStatus?.portalDomain ?? null;

  const setDomainMutation = trpc.system.setPortalDomain.useMutation({
    onSuccess: (data) => {
      toast.success(`Domain saved! Portal links will now use ${data.portalDomain}`);
      setDomainInput("");
      refetch();
    },
    onError: (e) => toast.error("Failed to save domain: " + e.message),
  });

  const clearDomainMutation = trpc.system.clearPortalDomain.useMutation({
    onSuccess: () => {
      toast.success("Custom domain removed. Using default Cloudflare Worker domain.");
      refetch();
    },
    onError: (e) => toast.error("Failed to remove domain: " + e.message),
  });

  const workerSubdomain = "custom-crm-pro.clientcare-fa6.workers.dev";
  const activeDomain = savedDomain ?? workerSubdomain;
  const cnamTarget = workerSubdomain;

  return (
    <Card className="p-5 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-lg">🌐</div>
          <div>
            <p className="text-sm font-semibold text-foreground">Custom Domain</p>
            <p className="text-xs text-muted-foreground">
              {isConfigured ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {savedDomain}</span>
              ) : (
                "Use your own domain for client portal links"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">Active</Badge>}
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Hide" : isConfigured ? "Manage" : "Setup"}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          {/* Current portal link */}
          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-1">Your current portal link</p>
            <p className="text-sm font-mono text-accent break-all">https://{activeDomain}/portal</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isConfigured ? "Using your custom domain" : "Using your default Cloudflare Worker domain — set up a custom domain below to use your own"}
            </p>
          </div>

          {/* Step 1 */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3 block">
              Step 1 — Choose your subdomain
            </Label>
            <p className="text-xs text-muted-foreground mb-2">Decide what URL parents will use to access their portal.</p>
          </div>

          {/* Step 2 — CNAME record */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3 block">
              Step 2 — Add CNAME record at your DNS provider
            </Label>
            <p className="text-xs text-muted-foreground mb-3">Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add this CNAME record:</p>
            <div className="rounded-lg bg-muted/60 border border-border p-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold text-foreground">CNAME</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-muted-foreground">Host / Name</span>
                <span className="font-semibold text-foreground">{domainInput ? domainInput.split(".")[0] : "portal"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Target / Value</span>
                <span className="font-semibold text-accent">{cnamTarget}</span>
              </div>
            </div>
          </div>

          {/* Step 3 — Enter custom domain */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">
              Step 3 — Save custom domain in Custom CRM Pro
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="portal.waypointadvocates.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="text-sm font-mono"
              />
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setDomainMutation.mutate({ portalDomain: domainInput })}
                disabled={setDomainMutation.isPending || !domainInput.trim()}
              >
                {setDomainMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Just the domain — no https:// needed. Example: portal.waypointadvocates.com</p>
          </div>

          {/* Step 4 — Cloudflare domain routing */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3 block">
              Step 4 — Route custom domain in Cloudflare
            </Label>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 space-y-2">
              <p className="text-sm text-foreground font-medium">Domain Routing:</p>
              <ol className="space-y-1.5 text-sm text-muted-foreground">
                <li>1. Open <strong>Cloudflare Dashboard → Workers & Pages</strong></li>
                <li>2. Select <strong>custom-crm-pro → Settings → Domains & Routes</strong></li>
                <li>3. Click <strong>Add Custom Domain</strong></li>
                <li>4. Enter your custom domain (e.g. <code className="text-xs bg-muted px-1 rounded">{domainInput || "portal.waypointadvocates.com"}</code>) and confirm</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">Once verified, your client portal links will work at your custom domain automatically.</p>
            </div>
          </div>

          {/* Remove domain */}
          {isConfigured && (
            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearDomainMutation.mutate()}
                disabled={clearDomainMutation.isPending}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {clearDomainMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remove Custom Domain
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function Integrations() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Plug className="h-7 w-7 text-accent" />
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground">Connect external apps and services to your CRM</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Phone & Communication</p>
        <QuoIntegrationCard />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Email</p>
        <GmailIntegrationCard />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Website & Domain</p>
        <WixDomainCard />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Coming Soon</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: "Google Calendar", desc: "Sync appointments and events", icon: "📅" },
            { name: "Zoom", desc: "Auto-create meeting links", icon: "🎥" },
            { name: "DocuSign", desc: "Send and track contract signatures", icon: "✍️" },
          ].map((item) => (
            <Card key={item.name} className="p-4 rounded-xl border border-dashed border-border opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
