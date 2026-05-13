import { useState } from "react";
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

  const webhookUrl = `${window.location.origin}/api/quo/webhook`;

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
  const [expanded, setExpanded] = useState(false);
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const utils = trpc.useUtils();

  const { data: gmailStatus, refetch: refetchStatus } = trpc.system.getGmailStatus.useQuery(undefined, {
    retry: false,
  });

  const setCredentialsMutation = trpc.system.setGmailCredentials.useMutation({
    onSuccess: () => {
      toast.success("Gmail credentials saved successfully");
      setGmailUser("");
      setGmailAppPassword("");
      refetchStatus();
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

  const isConfigured = gmailStatus?.configured ?? false;

  return (
    <Card className="p-6 rounded-xl border border-border">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 rounded-xl bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
            <Mail className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground">Gmail</h3>
              <Badge variant="outline" className="text-xs">Email</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Send portal links and notifications to parents directly from your Gmail workspace.
            </p>
            {isConfigured && gmailStatus?.gmailUser && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sending from: {gmailStatus.gmailUser}
              </p>
            )}
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
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Hide" : (isConfigured ? "Manage" : "Setup")}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">

          {/* Step 1 — Get App Password */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3 block">
              Step 1 — Create a Gmail App Password
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
              Step 2 — Enter Your Gmail Credentials
            </Label>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Gmail Address</Label>
                <Input
                  type="email"
                  placeholder={isConfigured ? (gmailStatus?.gmailUser ?? "your@gmail.com") : "your@gmail.com"}
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
                    placeholder={isConfigured ? "Saved — paste new value to update" : "xxxx xxxx xxxx xxxx"}
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

              {isConfigured && (
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
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-2">What Gmail is used for</p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />Send client portal links to parent contacts from the Contact Detail page.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />Emails are sent from your Gmail workspace address so parents recognize the sender.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />Your App Password is stored securely in the database — never exposed to the browser.</li>
            </ul>
          </div>
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
