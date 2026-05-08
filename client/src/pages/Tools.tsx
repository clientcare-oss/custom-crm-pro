import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wrench, GitCompare, Lock, Loader2, ArrowLeft, ExternalLink, FileText, ScrollText
} from "lucide-react";

export default function Tools() {
  const [location, setLocation] = useLocation();

  // Parse contactId from query string
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const contactIdParam = params.get("contactId");
  const contactId = contactIdParam ? parseInt(contactIdParam, 10) : null;

  const { data: iepDoc, isLoading: iepLoading } = trpc.iep.get.useQuery(
    { contactId: contactId! },
    { enabled: !!contactId }
  );

  const { data: contact, isLoading: contactLoading } = trpc.contacts.detail.useQuery(
    { id: contactId! },
    { enabled: !!contactId }
  );

  const hasBothVersions = !!(iepDoc?.currentFileKey && iepDoc?.previousFileKey);
  const isLoading = iepLoading || contactLoading;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
          <Wrench className="h-6 w-6 text-accent" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Advocacy Tools</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-powered tools to support IEP advocacy and case management
          </p>
        </div>
        {contactId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/contacts/${contactId}`)}
            className="inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Student
          </Button>
        )}
      </div>

      {/* Student context banner */}
      {contactId && (
        <div className="rounded-xl border border-border bg-muted/30 px-5 py-3 flex items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {contactLoading ? (
            <span className="text-sm text-muted-foreground">Loading student…</span>
          ) : contact ? (
            <span className="text-sm text-foreground">
              Tools for:{" "}
              <span className="font-semibold">
                {(contact as any).contact?.firstName ?? (contact as any).firstName}{" "}
                {(contact as any).contact?.lastName ?? (contact as any).lastName}
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Student #{contactId}</span>
          )}
        </div>
      )}

      {/* IEP Comparison Tool */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Document Analysis
        </p>

        <Card
          className={`p-6 rounded-xl border transition-colors ${
            hasBothVersions
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10"
              : "border-border"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl flex-shrink-0 ${
                hasBothVersions
                  ? "bg-emerald-100 dark:bg-emerald-950/40"
                  : "bg-muted"
              }`}
            >
              {hasBothVersions ? (
                <GitCompare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Lock className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">IEP / 504 Comparison</h2>
                {hasBothVersions ? (
                  <span className="text-xs rounded-full px-2.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">
                    Ready
                  </span>
                ) : (
                  <span className="text-xs rounded-full px-2.5 py-0.5 bg-muted text-muted-foreground font-semibold">
                    Locked
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Compare two versions of an IEP or 504 plan side by side. The AI will identify
                changes, additions, and removals — helping you quickly understand what shifted
                between meetings.
              </p>

              {isLoading && contactId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking IEP documents…
                </div>
              )}

              {!isLoading && hasBothVersions && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-background p-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20">Current</span>
                    <a
                      href={iepDoc!.currentFileUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-accent hover:underline font-medium"
                    >
                      {iepDoc!.currentFileName}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20">Previous</span>
                    <a
                      href={iepDoc!.previousFileUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-accent hover:underline font-medium"
                    >
                      {iepDoc!.previousFileName}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {!isLoading && !hasBothVersions && contactId && (
                <p className="text-xs text-muted-foreground pt-1">
                  {iepDoc?.currentFileKey
                    ? "Upload a second IEP/504 version in the student's Files tab to unlock comparison."
                    : "No IEP/504 documents found. Upload them in the student's Files tab first."}
                </p>
              )}

              {!contactId && (
                <p className="text-xs text-muted-foreground pt-1">
                  Navigate here from a student's Tools tab to use this feature.
                </p>
              )}

              <div className="pt-2">
                <Button
                  size="sm"
                  variant={hasBothVersions ? "default" : "outline"}
                  disabled={!hasBothVersions}
                  className="inline-flex items-center gap-1.5"
                  onClick={() => {
                    if (hasBothVersions) {
                      // TODO: open the AI comparison modal/page
                      // For now, show a toast
                      import("sonner").then(({ toast }) =>
                        toast.info("IEP Comparison AI tool — coming soon!")
                      );
                    }
                  }}
                >
                  <GitCompare className="h-4 w-4" />
                  {hasBothVersions ? "Run IEP Comparison" : "Locked — Upload 2 IEP versions first"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Formal Actions section */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Formal Actions
        </p>
        <Card className="p-5 rounded-xl border border-rose-200 dark:border-rose-800">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex-shrink-0">
              <ScrollText className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">State Complaint Builder</h2>
                <span className="text-xs rounded-full px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold">AI-Assisted</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Draft a formal state complaint under IDEA. The builder walks you through each required section — violations, legal basis, requested relief — and generates a structured document ready for review and submission.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["FAPE Violations", "Procedural Safeguards", "Prior Written Notice", "Timelines", "Compensatory Services"].map((tag) => (
                  <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">{tag}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">
                {contactId
                  ? `Linked to current student — opens pre-filled.`
                  : "You can select a student when the builder opens, or navigate here from a student's Tools tab."}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(contactId ? `/state-complaint-builder?contactId=${contactId}` : `/state-complaint-builder`)}
              className="inline-flex items-center gap-1.5 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Open State Complaint Builder →
            </Button>
          </div>
        </Card>
      </section>

      {/* Coming soon section */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Coming Soon
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: "IEP Goal Tracker",
              description: "Track progress toward IEP goals across reporting periods with visual trend charts.",
            },
            {
              title: "Meeting Prep Assistant",
              description: "Generate a structured agenda and talking points for upcoming IEP meetings.",
            },
            {
              title: "Accommodation Audit",
              description: "Review listed accommodations against best-practice checklists for completeness.",
            },
            {
              title: "Transition Planning Tool",
              description: "Build post-secondary transition plans aligned with IDEA requirements.",
            },
          ].map((tool) => (
            <Card
              key={tool.title}
              className="p-5 rounded-xl border border-dashed border-border bg-muted/10 opacity-70"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tool.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
                  <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
