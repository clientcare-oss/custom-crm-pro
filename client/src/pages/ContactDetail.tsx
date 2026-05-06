import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Compass, FileText, DollarSign, MessageSquare, Info, Folder, Calendar, ScrollText, Loader2, Pencil, Save, Clock, ChevronDown, ChevronUp, X, ExternalLink, Users, Activity, BookOpen, ArrowRightCircle, Zap, CalendarCheck, CheckSquare, Plus, CheckCircle2, Circle, Wrench } from "lucide-react";
import { IepDocumentBlocks } from "@/components/IepDocumentBlocks";
import { toast } from "sonner";

// ─── Compass section block (shared between admin + portal views) ───────────────
const COMPASS_SECTIONS = {
  status: { icon: Activity, label: "Current Status", accent: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800" },
  meeting: { icon: BookOpen, label: "Last Meeting", accent: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800" },
  nextStep: { icon: ArrowRightCircle, label: "Next Step", accent: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800" },
  ball: { icon: Zap, label: "Who Has the Ball", accent: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800" },
  nextMeeting: { icon: CalendarCheck, label: "Next Meeting Date", accent: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-800" },
} as const;

function CompassSection({ type, children }: { type: keyof typeof COMPASS_SECTIONS; children: React.ReactNode }) {
  const cfg = COMPASS_SECTIONS[type];
  const Icon = cfg.icon;
  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} px-4 py-3`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${cfg.accent}`} />
        <span className={`text-xs font-bold uppercase tracking-widest ${cfg.accent}`}>{cfg.label}</span>
      </div>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}

/** Renders text with basic markdown-like formatting: **bold**, line breaks, --- dividers */
function RichText({ text }: { text: string }) {
  const lines = text.split(/\n/);
  return (
    <div className="text-sm text-foreground leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (/^---+$/.test(line.trim())) {
          return <hr key={i} className="border-border/40 my-2" />;
        }
        const parts = line.split(/(\*\*[^*]+\*\*)/);
        return (
          <p key={i} className={line.trim() === '' ? 'h-2' : ''}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function ContactDetail() {
  const params = useParams<{ id: string }>();
  const contactId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const [showHistory, setShowHistory] = useState(false);
  const [editingCompass, setEditingCompass] = useState(false);
  const [compassForm, setCompassForm] = useState({
    currentStatus: "",
    lastMeetingSummary: "",
    nextStep: "",
    whoHasBall: "",
    nextMeetingDate: "",
  });
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.contacts.detail.useQuery(
    { id: contactId },
    { enabled: !!contactId }
  );

  // Populate compass form when data loads — MUST be before any early returns
  useEffect(() => {
    if (data?.compass) {
      const c = data.compass as any;
      setCompassForm({
        currentStatus: c.currentStatus || "",
        lastMeetingSummary: c.lastMeetingSummary || "",
        nextStep: c.nextStep || "",
        whoHasBall: c.whoHasBall || "",
        nextMeetingDate: c.nextMeetingDate
          ? new Date(c.nextMeetingDate).toISOString().slice(0, 16)
          : "",
      });
    }
  }, [data?.compass]);

  // Compass upsert mutation — MUST be before any early returns
  const compassUpsert = trpc.caseCompass.upsert.useMutation({
    onSuccess: () => {
      toast.success("Compass updated — previous version saved to history");
      setEditingCompass(false);
      utils.contacts.detail.invalidate({ id: contactId });
    },
    onError: (err) => toast.error("Failed to save Compass: " + err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Contact not found.</p>
        <Button variant="outline" onClick={() => setLocation("/contacts")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Contacts
        </Button>
      </div>
    );
  }

  const { contact, projects, invoices, contracts, appointments, files, messages, compass, compassHistory } = data;

  const isParent = contact.jobTitle !== "Student";

  const handleCompassSave = () => {
    if (!contact.caseId) {
      toast.error("This student does not have a Case ID yet. Please refresh and try again.");
      return;
    }
    compassUpsert.mutate({
      caseId: contact.caseId,
      currentStatus: compassForm.currentStatus || undefined,
      lastMeetingSummary: compassForm.lastMeetingSummary || undefined,
      nextStep: compassForm.nextStep || undefined,
      whoHasBall: compassForm.whoHasBall || undefined,
      nextMeetingDate: compassForm.nextMeetingDate ? new Date(compassForm.nextMeetingDate) : null,
    });
  };
  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div className="space-y-6 p-8">
      {/* Back */}
      <Button
        variant="outline"
        onClick={() => setLocation(isParent ? "/contacts" : "/projects")}
        className="inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> {isParent ? "All Contacts" : "All Students"}
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-xl flex-shrink-0">
          {contact.firstName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{fullName}</h1>
            {/* Preview Portal button — only for parent contacts with a linked portal account */}
            {isParent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/portal?preview=true&parentContactId=${contact.id}`, "_blank")}
                className="inline-flex items-center gap-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview Portal
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
            {contact.jobTitle && <span>{contact.jobTitle}</span>}
            {contact.company && <span>· {contact.company}</span>}
            {contact.email && <a href={`mailto:${contact.email}`} className="text-accent hover:underline">{contact.email}</a>}
            {contact.phone && <span>· {contact.phone}</span>}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          TABS — split by parent vs student
      ═══════════════════════════════════════════════════ */}
      {isParent ? (
        <ParentTabs
          contact={contact}
          contactId={contactId}
          invoices={invoices}
          contracts={contracts}
          appointments={appointments}
          files={files}
          messages={messages}
          utils={utils}
        />
      ) : (
        <StudentTabs
          contact={contact}
          contactId={contactId}
          fullName={fullName}
          projects={projects}
          invoices={invoices}
          contracts={contracts}
          appointments={appointments}
          files={files}
          messages={messages}
          compass={compass}
          compassHistory={compassHistory}
          editingCompass={editingCompass}
          setEditingCompass={setEditingCompass}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          compassForm={compassForm}
          setCompassForm={setCompassForm}
          handleCompassSave={handleCompassSave}
          compassUpsert={compassUpsert}
          utils={utils}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PARENT VIEW — Students overview + billing
// ─────────────────────────────────────────────────────────
function ParentTabs({
  contact,
  contactId,
  invoices,
  contracts,
  appointments,
  files,
  messages,
  utils,
}: {
  contact: any;
  contactId: number;
  invoices: any[];
  contracts: any[];
  appointments: any[];
  files: any[];
  messages: any[];
  utils: any;
}) {
  const [, setLocation] = useLocation();

  // Fetch linked students with next meeting + pending task count
  const { data: students = [], isLoading: studentsLoading } = trpc.contacts.getStudentsWithSummary.useQuery(
    { parentContactId: contactId },
    { enabled: !!contactId }
  );

  return (
    <Tabs defaultValue="students">
      <TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="students" className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Students
          {students.length > 0 && (
            <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs">{students.length}</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="financials" className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5" />
          Billing
          {invoices.length > 0 && (
            <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs">{invoices.length}</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="activity" className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Communication
        </TabsTrigger>
        <TabsTrigger value="files" className="flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5" />
          Files
          {files.length > 0 && (
            <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs">{files.length}</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="appointments" className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Appointments
          {appointments.length > 0 && (
            <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs">{appointments.length}</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="details" className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Details
        </TabsTrigger>
      </TabsList>

      {/* STUDENTS TAB */}
      <TabsContent value="students" className="mt-4">
        {studentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 py-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm font-semibold text-foreground mb-1">No students linked yet</p>
            <p className="text-xs text-muted-foreground">
              Add a student and select this contact as their parent.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student: any) => (
              <Card
                key={student.id}
                onClick={() => setLocation(`/contacts/${student.id}`)}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-base">
                    {student.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      {student.pendingTaskCount > 0 && (
                        <span title={`${student.pendingTaskCount} task${student.pendingTaskCount > 1 ? 's' : ''} waiting`} className="text-base leading-none">⚠️</span>
                      )}
                    </div>
                    {student.caseId && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Case ID: <span className="font-mono font-semibold">{student.caseId}</span>
                      </p>
                    )}
                    {student.nextMeeting ? (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>
                          Next: {new Date(student.nextMeeting.startTime).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {" "}
                          {new Date(student.nextMeeting.startTime).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground/60 italic">No upcoming meeting</p>
                    )}
                    {student.pendingTaskCount > 0 && (
                      <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {student.pendingTaskCount} task{student.pendingTaskCount > 1 ? 's' : ''} waiting
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* BILLING / FINANCIALS TAB */}
      <TabsContent value="financials" className="mt-4 space-y-3">
        {invoices.length === 0 && contracts.length === 0 ? (
          <EmptyState icon={<DollarSign className="h-8 w-8" />} text="No billing records for this client" />
        ) : (
          <>
            {invoices.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoices</p>
                {invoices.map((inv: any) => (
                  <Card key={inv.id} className="p-4 rounded-lg border border-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">#{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : "No due date"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">${inv.total}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {contracts.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contracts</p>
                {contracts.map((c: any) => (
                  <Card key={c.id} className="p-4 rounded-lg border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">{c.title}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </TabsContent>

      {/* ACTIVITY */}
      <TabsContent value="activity" className="mt-4 space-y-3">
        {messages.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-8 w-8" />} text="No messages yet" />
        ) : (
          messages.map((msg: any) => (
            <Card key={msg.id} className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {msg.senderId === contactId ? `${contact.firstName} ${contact.lastName}` : "You"}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground">{msg.content}</p>
            </Card>
          ))
        )}
      </TabsContent>

      {/* FILES */}
      <TabsContent value="files" className="mt-4 space-y-3">
        {files.length === 0 ? (
          <EmptyState icon={<Folder className="h-8 w-8" />} text="No files uploaded" />
        ) : (
          files.map((f: any) => (
            <Card key={f.id} className="p-4 rounded-lg border border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{f.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {f.fileSize ? `${(f.fileSize / 1024 / 1024).toFixed(2)} MB · ` : ""}
                  {new Date(f.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline font-semibold">
                Open
              </a>
            </Card>
          ))
        )}
      </TabsContent>

      {/* APPOINTMENTS */}
      <TabsContent value="appointments" className="mt-4 space-y-3">
        {appointments.length === 0 ? (
          <EmptyState icon={<Calendar className="h-8 w-8" />} text="No appointments scheduled" />
        ) : (
          appointments.map((appt: any) => (
            <Card key={appt.id} className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{appt.title || "Appointment"}</p>
                <StatusBadge status={appt.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(appt.startTime).toLocaleString()}
                {appt.endTime ? ` – ${new Date(appt.endTime).toLocaleTimeString()}` : ""}
              </p>
            </Card>
          ))
        )}
      </TabsContent>

      {/* DETAILS */}
      <TabsContent value="details" className="mt-4 space-y-4">
        <PortalLinkSection contactId={contactId} currentPortalUserId={contact.portalUserId ?? null} utils={utils} />
        <Card className="rounded-xl border border-border p-6 space-y-4">
          <DetailRow label="First Name" value={contact.firstName} />
          <DetailRow label="Last Name" value={contact.lastName} />
          {contact.email && <DetailRow label="Email" value={contact.email} />}
          {contact.phone && <DetailRow label="Phone" value={contact.phone} />}
          {contact.company && <DetailRow label="Family / Organization" value={contact.company} />}
          {contact.jobTitle && <DetailRow label="Role" value={contact.jobTitle} />}
          {contact.address && <DetailRow label="Address" value={contact.address} />}
          {contact.city && <DetailRow label="City" value={contact.city} />}
          {contact.state && <DetailRow label="State" value={contact.state} />}
          {contact.zipCode && <DetailRow label="Zip" value={contact.zipCode} />}
          {contact.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
          <div className="pt-2 border-t border-border text-xs text-muted-foreground">
            Added {new Date(contact.createdAt).toLocaleDateString()}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ─────────────────────────────────────────────────────────
// TOOLS TAB — IEP comparison and other advocacy tools
// ─────────────────────────────────────────────────────────
function ToolsTabContent({ contactId }: { contactId: number }) {
  const { data: iepDoc } = trpc.iep.get.useQuery({ contactId }, { enabled: !!contactId });
  const hasBothVersions = !!(iepDoc?.currentFileKey && iepDoc?.previousFileKey);
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Advocacy Tools</p>

      {/* IEP Comparison Tool */}
      <Card className={`p-5 rounded-xl border flex flex-col gap-3 ${hasBothVersions ? "border-emerald-200 dark:border-emerald-800" : "border-border"}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${hasBothVersions ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-muted"}`}>
            <Wrench className={`h-5 w-5 ${hasBothVersions ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">IEP/504 Comparison</p>
              {hasBothVersions ? (
                <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">Ready</span>
              ) : (
                <span className="text-xs rounded-full px-2 py-0.5 bg-muted text-muted-foreground font-semibold">Locked</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasBothVersions
                ? "Compare the current and previous IEP/504 side by side to identify changes, additions, and removals."
                : "Upload two versions of the IEP/504 in the Files tab to unlock this tool."}
            </p>
            {hasBothVersions && (
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <p>Current: <span className="font-medium text-foreground">{iepDoc!.currentFileName}</span></p>
                <p>Previous: <span className="font-medium text-foreground">{iepDoc!.previousFileName}</span></p>
              </div>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={hasBothVersions ? "default" : "outline"}
          disabled={!hasBothVersions}
          onClick={() => setLocation(`/tools?contactId=${contactId}`)}
          className="self-start inline-flex items-center gap-1.5 text-xs"
        >
          <Wrench className="h-3.5 w-3.5" />
          {hasBothVersions ? "Open IEP Comparison →" : "Locked — Upload 2 IEP versions first"}
        </Button>
      </Card>

      {/* More tools coming soon */}
      <Card className="p-5 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-2 py-8">
        <Wrench className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-semibold text-muted-foreground">More tools coming soon</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Additional AI-powered advocacy tools will appear here as they are developed.
        </p>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// STUDENT VIEW — Compass + all original tabs
// ─────────────────────────────────────────────────────────
function StudentTabs({
  contact,
  contactId,
  fullName,
  projects,
  invoices,
  contracts,
  appointments,
  files,
  messages,
  compass,
  compassHistory,
  editingCompass,
  setEditingCompass,
  showHistory,
  setShowHistory,
  compassForm,
  setCompassForm,
  handleCompassSave,
  compassUpsert,
  utils,
}: {
  contact: any;
  contactId: number;
  fullName: string;
  projects: any[];
  invoices: any[];
  contracts: any[];
  appointments: any[];
  files: any[];
  messages: any[];
  compass: any;
  compassHistory: any;
  editingCompass: boolean;
  setEditingCompass: (v: boolean) => void;
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  compassForm: any;
  setCompassForm: (v: any) => void;
  handleCompassSave: () => void;
  compassUpsert: any;
  utils: any;
}) {
  return (
    <Tabs defaultValue="compass">
      <TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="compass" className="flex items-center gap-1.5"><Compass className="h-3.5 w-3.5" />Compass</TabsTrigger>
        <TabsTrigger value="activity" className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Communication</TabsTrigger>
        <TabsTrigger value="tasks" className="flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5" />Tasks</TabsTrigger>
        <TabsTrigger value="files" className="flex items-center gap-1.5"><Folder className="h-3.5 w-3.5" />Files {files.length > 0 && <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs">{files.length}</span>}</TabsTrigger>
        <TabsTrigger value="tools" className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" />Tools</TabsTrigger>
        <TabsTrigger value="projects" className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Cases {projects.length > 0 && <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs">{projects.length}</span>}</TabsTrigger>
        <TabsTrigger value="financials" className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" />Financials {invoices.length > 0 && <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs">{invoices.length}</span>}</TabsTrigger>
        <TabsTrigger value="appointments" className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Appointments {appointments.length > 0 && <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs">{appointments.length}</span>}</TabsTrigger>
        <TabsTrigger value="details" className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5" />Details</TabsTrigger>
      </TabsList>

      {/* COMPASS TAB */}
      <TabsContent value="compass" className="mt-4">
        <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-accent/20 bg-accent/10">
            <div className="flex items-center gap-3">
              <Compass className="h-7 w-7 text-accent animate-[spin_12s_linear_infinite]" />
              <div>
                <h2 className="font-bold text-foreground text-base">Waypoint Case Compass™</h2>
                {contact.caseId && <p className="text-xs text-muted-foreground">Case ID: {contact.caseId}</p>}
                {(compass as any)?.updatedAt && (
                  <p className="text-xs text-muted-foreground">Last updated {new Date((compass as any).updatedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-xs inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />{showHistory ? "Hide History" : "View History"}{showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              {!editingCompass ? (
                <Button size="sm" onClick={() => setEditingCompass(true)} className="text-xs inline-flex items-center gap-1">
                  <Pencil className="h-3 w-3" />Edit Compass
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCompassSave} disabled={compassUpsert.isPending} className="text-xs inline-flex items-center gap-1">
                    {compassUpsert.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingCompass(false)} className="text-xs"><X className="h-3 w-3" /></Button>
                </div>
              )}
            </div>
          </div>
          <div className="p-6">
            {!editingCompass ? (
              (compass as any) ? (
                <div className="space-y-3">
                  {(compass as any).currentStatus && (
                    <CompassSection type="status"><RichText text={(compass as any).currentStatus} /></CompassSection>
                  )}
                  {(compass as any).lastMeetingSummary && (
                    <CompassSection type="meeting"><RichText text={(compass as any).lastMeetingSummary} /></CompassSection>
                  )}
                  {(compass as any).nextStep && (
                    <CompassSection type="nextStep"><RichText text={(compass as any).nextStep} /></CompassSection>
                  )}
                  {(compass as any).whoHasBall && (
                    <CompassSection type="ball"><RichText text={(compass as any).whoHasBall} /></CompassSection>
                  )}
                  {(compass as any).nextMeetingDate && (
                    <CompassSection type="nextMeeting">
                      <p className="font-semibold">{new Date((compass as any).nextMeetingDate).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </CompassSection>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Compass className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No Compass set for this student yet.</p>
                  <Button size="sm" onClick={() => setEditingCompass(true)}><Pencil className="h-3 w-3 mr-1" />Set Up Compass</Button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Status</label>
                  <Textarea rows={2} value={compassForm.currentStatus} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, currentStatus: e.target.value }))} placeholder="Brief snapshot of where the case stands..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary of Last Meeting</label>
                  <Textarea rows={2} value={compassForm.lastMeetingSummary} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, lastMeetingSummary: e.target.value }))} placeholder="Key takeaways and decisions..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next Step</label>
                  <Textarea rows={2} value={compassForm.nextStep} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, nextStep: e.target.value }))} placeholder="The next action needed..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who Has the Ball</label>
                  <Textarea rows={2} value={compassForm.whoHasBall} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, whoHasBall: e.target.value }))} placeholder="Parent, School, District, Waypoint..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next Meeting Date</label>
                  <Input type="datetime-local" value={compassForm.nextMeetingDate} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, nextMeetingDate: e.target.value }))} className="text-sm" />
                </div>
              </div>
            )}
          </div>
          {showHistory && (
            <div className="border-t border-accent/20 px-6 py-4 bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Case Compass History</p>
              {compassHistory && (compassHistory as any[]).length > 0 ? (
                <div className="space-y-3">
                  {(compassHistory as any[]).map((entry: any) => (
                    <div key={entry.id} className="rounded-lg border border-border bg-card p-3 text-xs">
                      <p className="font-semibold text-muted-foreground mb-1">{new Date(entry.savedAt).toLocaleString()}</p>
                      {entry.currentStatus && <p className="text-foreground"><span className="font-medium">Status:</span> {entry.currentStatus}</p>}
                      {entry.nextStep && <p className="text-foreground mt-0.5"><span className="font-medium">Next Step:</span> {entry.nextStep}</p>}
                      {entry.whoHasBall && <p className="text-foreground mt-0.5"><span className="font-medium">Ball:</span> {entry.whoHasBall}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No history yet.</p>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ACTIVITY */}
      <TabsContent value="activity" className="mt-4 space-y-3">
        {messages.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-8 w-8" />} text="No messages yet" />
        ) : (
          messages.map((msg: any) => (
            <Card key={msg.id} className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {msg.senderId === contactId ? fullName : "You"}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground">{msg.content}</p>
            </Card>
          ))
        )}
      </TabsContent>
      {/* TASKS */}
      <TasksTabContent contactId={contactId} projects={projects} />
      {/* FILES */}
      <TabsContent value="files" className="mt-4 space-y-3">
        <IepDocumentBlocks contactId={contactId} />
        {files.length === 0 ? (
          <EmptyState icon={<Folder className="h-8 w-8" />} text="No other files uploaded" />
        ) : (
          files.map((f: any) => (
            <Card key={f.id} className="p-4 rounded-lg border border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{f.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {f.fileSize ? `${(f.fileSize / 1024 / 1024).toFixed(2)} MB · ` : ""}
                  {new Date(f.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline font-semibold">
                Open
              </a>
            </Card>
          ))
        )}
      </TabsContent>

      {/* TOOLS */}
      <TabsContent value="tools" className="mt-4">
        <ToolsTabContent contactId={contactId} />
      </TabsContent>

      {/* CASES / PROJECTS */}
      <TabsContent value="projects" className="mt-4 space-y-3">
        {projects.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} text="No cases linked to this student" />
        ) : (
          projects.map((p: any) => (
            <Card key={p.id} className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <StatusBadge status={p.status} />
              </div>
              {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                {p.startDate ? `Started ${new Date(p.startDate).toLocaleDateString()}` : ""}
                {p.endDate ? ` · Due ${new Date(p.endDate).toLocaleDateString()}` : ""}
              </p>
            </Card>
          ))
        )}
      </TabsContent>

      {/* FINANCIALS */}
      <TabsContent value="financials" className="mt-4 space-y-3">
        {invoices.length === 0 ? (
          <EmptyState icon={<DollarSign className="h-8 w-8" />} text="No invoices for this student" />
        ) : (
          invoices.map((inv: any) => (
            <Card key={inv.id} className="p-4 rounded-lg border border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">#{inv.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : "No due date"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">${inv.total}</p>
                <StatusBadge status={inv.status} />
              </div>
            </Card>
          ))
        )}
        {contracts.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Contracts</p>
            {contracts.map((c: any) => (
              <Card key={c.id} className="p-4 rounded-lg border border-border flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">{c.title}</p>
                </div>
                <StatusBadge status={c.status} />
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* APPOINTMENTS */}
      <TabsContent value="appointments" className="mt-4 space-y-3">
        {appointments.length === 0 ? (
          <EmptyState icon={<Calendar className="h-8 w-8" />} text="No appointments scheduled" />
        ) : (
          appointments.map((appt: any) => (
            <Card key={appt.id} className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{appt.title || "Appointment"}</p>
                <StatusBadge status={appt.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(appt.startTime).toLocaleString()}
                {appt.endTime ? ` – ${new Date(appt.endTime).toLocaleTimeString()}` : ""}
              </p>
              {(appt as any).notes && <p className="text-xs text-muted-foreground mt-1">{(appt as any).notes}</p>}
            </Card>
          ))
        )}
      </TabsContent>

      {/* DETAILS */}
      <TabsContent value="details" className="mt-4 space-y-4">
        <PortalLinkSection contactId={contactId} currentPortalUserId={contact.portalUserId ?? null} utils={utils} />
        <Card className="rounded-xl border border-border p-6 space-y-4">
          <DetailRow label="First Name" value={contact.firstName} />
          <DetailRow label="Last Name" value={contact.lastName} />
          {contact.email && <DetailRow label="Email" value={contact.email} />}
          {contact.phone && <DetailRow label="Phone" value={contact.phone} />}
          {contact.company && <DetailRow label="Family / Organization" value={contact.company} />}
          {contact.jobTitle && <DetailRow label="Role" value={contact.jobTitle} />}
          {contact.address && <DetailRow label="Address" value={contact.address} />}
          {contact.city && <DetailRow label="City" value={contact.city} />}
          {contact.state && <DetailRow label="State" value={contact.state} />}
          {contact.zipCode && <DetailRow label="Zip" value={contact.zipCode} />}
          {contact.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
          <div className="pt-2 border-t border-border text-xs text-muted-foreground">
            Added {new Date(contact.createdAt).toLocaleDateString()}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function PortalLinkSection({ contactId, currentPortalUserId, utils }: { contactId: number; currentPortalUserId: number | null; utils: any }) {
  const { data: portalClients } = trpc.caseCompass.portalClients.useQuery();
  const linkMutation = trpc.contacts.linkPortalUser.useMutation({
    onSuccess: () => {
      utils.contacts.detail.invalidate({ id: contactId });
      toast.success("Portal account linked — Compass data will now appear for this student.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="rounded-xl border border-accent/30 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-accent" />
        <p className="text-sm font-semibold text-foreground">Link Portal Account (for Case Compass)</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Link this contact to a portal user account so the Case Compass data appears here. Only needed if the client has logged into the portal.
      </p>
      <div className="flex items-center gap-3">
        <Select
          value={currentPortalUserId?.toString() ?? "none"}
          onValueChange={(val) => {
            const id = val === "none" ? null : parseInt(val, 10);
            linkMutation.mutate({ contactId, portalUserId: id });
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select portal user..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Not linked —</SelectItem>
            {(portalClients ?? []).map((u: any) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.name ?? u.email ?? `User #${u.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentPortalUserId && (
          <span className="text-xs text-green-600 font-semibold">✓ Linked (user #{currentPortalUserId})</span>
        )}
      </div>
    </Card>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-12 text-center">
      <div className="text-muted-foreground mb-2">{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <p className="w-36 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-0.5">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    "In Progress": "bg-blue-100 text-blue-700",
    "Planning": "bg-yellow-100 text-yellow-700",
    "Completed": "bg-green-100 text-green-700",
    "On Hold": "bg-gray-100 text-gray-600",
    "Paid": "bg-green-100 text-green-700",
    "Sent": "bg-blue-100 text-blue-700",
    "Draft": "bg-gray-100 text-gray-600",
    "Overdue": "bg-red-100 text-red-700",
    "Signed": "bg-green-100 text-green-700",
    "Executed": "bg-green-100 text-green-700",
    "Confirmed": "bg-green-100 text-green-700",
    "Pending": "bg-yellow-100 text-yellow-700",
    "Cancelled": "bg-red-100 text-red-700",
    "Scheduled": "bg-blue-100 text-blue-700",
  };
  const cls = colors[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>
  );
}

// ─────────────────────────────────────────────────────────
// TASKS TAB — shows all tasks across student's projects
// ─────────────────────────────────────────────────────────
function TasksTabContent({ contactId, projects }: { contactId: number; projects: any[] }) {
  const utils = trpc.useUtils();
  const [newTask, setNewTask] = useState({ title: "", projectId: "", dueDate: "", priority: "Medium" });
  const [adding, setAdding] = useState(false);

  const { data: tasks = [], isLoading } = trpc.tasks.getByStudent.useQuery(
    { studentContactId: contactId },
    { enabled: !!contactId }
  );

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created");
      setAdding(false);
      setNewTask({ title: "", projectId: "", dueDate: "", priority: "Medium" });
      utils.tasks.getByStudent.invalidate({ studentContactId: contactId });
    },
    onError: (e) => toast.error("Failed to create task: " + e.message),
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => utils.tasks.getByStudent.invalidate({ studentContactId: contactId }),
    onError: (e) => toast.error("Failed to update task: " + e.message),
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => utils.tasks.getByStudent.invalidate({ studentContactId: contactId }),
    onError: (e) => toast.error("Failed to delete task: " + e.message),
  });

  const priorityColors: Record<string, string> = {
    High: "text-red-600 bg-red-50 border-red-200",
    Medium: "text-amber-600 bg-amber-50 border-amber-200",
    Low: "text-emerald-600 bg-emerald-50 border-emerald-200",
  };

  return (
    <TabsContent value="tasks" className="mt-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)} className="text-xs inline-flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />{adding ? "Cancel" : "Add Task"}
        </Button>
      </div>

      {adding && (
        <Card className="p-4 rounded-xl border border-accent/30 bg-accent/5 space-y-3">
          <Input
            placeholder="Task title..."
            value={newTask.title}
            onChange={(e: any) => setNewTask((f) => ({ ...f, title: e.target.value }))}
            className="text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            <Select value={newTask.projectId} onValueChange={(v) => setNewTask((f) => ({ ...f, projectId: v }))} >
              <SelectTrigger className="text-xs w-48"><SelectValue placeholder="Link to case..." /></SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newTask.priority} onValueChange={(v) => setNewTask((f) => ({ ...f, priority: v }))}>
              <SelectTrigger className="text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newTask.dueDate}
              onChange={(e: any) => setNewTask((f) => ({ ...f, dueDate: e.target.value }))}
              className="text-xs w-40"
            />
          </div>
          <Button
            size="sm"
            disabled={!newTask.title.trim() || !newTask.projectId || createTask.isPending}
            onClick={() => createTask.mutate({
              projectId: parseInt(newTask.projectId),
              title: newTask.title.trim(),
              dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
              priority: newTask.priority,
              status: "Todo",
              assignedTo: contactId,
            })}
            className="text-xs"
          >
            {createTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Create Task
          </Button>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={<CheckSquare className="h-8 w-8" />} text="No tasks for this student yet" />
      ) : (
        tasks.map((task: any) => (
          <Card key={task.id} className="p-4 rounded-xl border border-border flex items-start gap-3">
            <button
              onClick={() => updateTask.mutate({ id: task.id, status: task.status === "Done" ? "Todo" : "Done" })}
              className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-accent transition-colors"
            >
              {task.status === "Done"
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                : <Circle className="h-5 w-5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.status === "Done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {task.priority && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityColors[task.priority] ?? "bg-muted text-muted-foreground"}`}>
                    {task.priority}
                  </span>
                )}
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                {task.status && task.status !== "Todo" && task.status !== "Done" && (
                  <span className="text-xs text-muted-foreground">{task.status}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => deleteTask.mutate({ id: task.id })}
              className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </Card>
        ))
      )}
    </TabsContent>
  );
}
