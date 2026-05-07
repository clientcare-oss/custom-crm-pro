import { useState } from "react";
import { Plug, Phone, Copy, CheckCircle2, ExternalLink, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function QuoIntegrationCard() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${window.location.origin}/api/quo/webhook`;

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      toast.success("Webhook URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            Setup required
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Hide" : "Setup"}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          {/* Webhook URL */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Your Webhook URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono text-foreground border border-border truncate">
                {webhookUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyWebhookUrl} className="flex-shrink-0 gap-1.5">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              This URL only works after you publish the CRM. Publish first, then set up the webhook in Quo.
            </p>
          </div>

          {/* Steps */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Setup Steps</p>
            <ol className="space-y-3">
              {[
                { step: "1", title: "Publish your CRM", desc: "Click the Publish button in the top-right of the Management UI. The webhook URL only works on the live published site." },
                { step: "2", title: "Open Quo → Settings → Integrations → Webhooks", desc: "Log in to your Quo account and navigate to the Webhooks section.", link: "https://app.quo.com/settings/integrations", linkLabel: "Open Quo Settings ↗" },
                { step: "3", title: "Add a new webhook", desc: "Paste the webhook URL above. Select events: call.transcript.completed and call.summary.completed." },
                { step: "4", title: "Copy the signing secret", desc: "After saving, Quo shows a Signing Secret. Copy it." },
                { step: "5", title: "Add the secret to your CRM", desc: "In your CRM, go to Settings → Secrets and add QUO_WEBHOOK_SECRET with the value you just copied." },
              ].map((item) => (
                <li key={item.step} className="flex gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">{item.step}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline inline-flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" />{item.linkLabel}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Coming Soon</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: "Google Calendar", desc: "Sync appointments and events", icon: "📅" },
            { name: "Zoom", desc: "Auto-create meeting links", icon: "🎥" },
            { name: "Gmail / Outlook", desc: "Log emails to student profiles", icon: "✉️" },
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
