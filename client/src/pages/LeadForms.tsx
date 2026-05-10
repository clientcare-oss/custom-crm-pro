import { useState } from "react";
import { ClipboardList, Copy, ExternalLink, Eye, CheckCircle2, Users, GraduationCap, Link2, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const FORM_FIELDS_PREVIEW = [
  { section: "Parent / Guardian", fields: ["First Name", "Last Name", "Email", "Phone", "Timezone", "Best Time to Call", "Second Parent (optional)", "How did you hear about us?"] },
  { section: "Student Information", fields: ["Student First Name", "Student Last Name", "Date of Birth", "Grade Level", "Diagnosis / Disability", "School Name", "County / School District", "City, State, ZIP"] },
  { section: "Challenges & Concerns", fields: ["Describe challenges and concerns (free text)", "Review summary before submit"] },
];

export default function LeadForms() {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Get recent submissions from leads table
  const { data: recentLeads } = trpc.leads.list.useQuery(undefined, { retry: false });

  const intakeUrl = `${window.location.origin}/intake`;

  const handleCopy = () => {
    navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    window.open(intakeUrl, "_blank");
  };

  // Count leads from form (source = "Lead Form" or similar)
  const formLeads = recentLeads?.filter((l: any) =>
    l.source === "Lead Form" || l.source?.includes("Form")
  ) ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-accent" />
          <div>
            <h1 className="text-2xl font-bold">Lead Forms</h1>
            <p className="text-sm text-muted-foreground">Manage your client intake forms</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-xs text-muted-foreground">Active Form</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formLeads.length}</p>
                <p className="text-xs text-muted-foreground">Form Submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">Auto</p>
                <p className="text-xs text-muted-foreground">Student + Portal Setup</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Form Card */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base">Waypoint Client Intake Form</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">3-step intake form · Replaces HoneyBook form</p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-500/40 bg-green-500/10 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shareable Link */}
          <div className="bg-muted/40 border border-border/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="w-4 h-4 text-accent" />
              Shareable Form Link
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground truncate">
                {intakeUrl}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 gap-1.5"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpen}
                className="shrink-0 gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with prospective clients. No login required — anyone with the link can fill out the form.
            </p>
          </div>

          {/* What happens on submit */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">What happens when someone submits:</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold text-xs shrink-0">1</div>
                <span>Parent contact is created in <strong className="text-foreground">Contacts</strong> with all their details</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold text-xs shrink-0">2</div>
                <span>Student contact is created and linked to the parent with a unique <strong className="text-foreground">Case ID (WP-XXXX-XXXX)</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold text-xs shrink-0">3</div>
                <span>A <strong className="text-foreground">project/case</strong> is automatically created for the student</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold text-xs shrink-0">4</div>
                <span>Lead is added to your <strong className="text-foreground">Leads pipeline</strong> for follow-up</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold text-xs shrink-0">5</div>
                <span>You receive an <strong className="text-foreground">instant notification</strong> with all the details</span>
              </div>
            </div>
          </div>

          {/* Form Fields Preview Toggle */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "Hide" : "View"} form fields
            </Button>

            {showPreview && (
              <div className="mt-3 space-y-3">
                {FORM_FIELDS_PREVIEW.map((section) => (
                  <div key={section.section} className="border border-border/60 rounded-xl overflow-hidden">
                    <div className="bg-muted/40 px-4 py-2 border-b border-border/60">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Step {FORM_FIELDS_PREVIEW.indexOf(section) + 1} — {section.section}
                      </p>
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-1.5">
                      {section.fields.map((field) => (
                        <div key={field} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
                          {field}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/40">
            <Button
              size="sm"
              onClick={handleOpen}
              className="gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview Form
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info("Form customization coming soon — contact support to modify fields")}
              className="gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Customize Fields
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      {formLeads.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Form Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formLeads.slice(0, 5).map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                      {lead.contactName?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{lead.contactName ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{lead.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">{lead.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
