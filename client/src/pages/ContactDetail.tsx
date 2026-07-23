import { trpc } from "@/lib/trpc";
import { CreateTaskInline } from "@/components/CreateTaskInline";
import { EditTaskModal, type TaskEditPayload } from "@/components/EditTaskModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import { Textarea } from "@/components/ui/textarea";
import VoiceTextarea from "@/components/VoiceTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Compass, FileText, DollarSign, MessageSquare, Info, Folder, Calendar, ScrollText, Loader2, Pencil, Save, Clock, ChevronDown, ChevronRight, ChevronUp, X, ExternalLink, Users, Activity, BookOpen, ArrowRightCircle, Zap, CalendarCheck, CheckSquare, Plus, CheckCircle2, Circle, Wrench, Timer, Play, Square, Trash2, Phone, PhoneIncoming, PhoneOutgoing, User, Copy, Send, Eye } from "lucide-react";
import { IepDocumentBlocks } from "@/components/IepDocumentBlocks";
import { CaseParticipants } from "@/components/CaseParticipants";
import { NotesSection } from "@/components/NotesSection";
import AiButtonRunner from "@/components/AiButtonRunner";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";

// ─── Client Portal Card ───────────────────────────────────────────────────────
function ClientPortalCard({ contact, parentContactId }: { contact: any; parentContactId?: number | null }) {
  const [selectedParents, setSelectedParents] = useState<number[]>([]);
  const [includeInEmails, setIncludeInEmails] = useState(true);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [pwEmail, setPwEmail] = useState("");
  const [pwPassword, setPwPassword] = useState("");

  const { data: portalStatus, refetch: refetchStatus } = trpc.portalAuth.getClientPortalStatus.useQuery(
    { contactId: contact.id },
    { enabled: !!contact.id }
  );
  const setPasswordMutation = trpc.portalAuth.setClientPassword.useMutation({
    onSuccess: () => {
      toast.success("Portal credentials saved!");
      setShowSetPassword(false);
      setPwPassword("");
      refetchStatus();
    },
    onError: (err) => toast.error(err.message),
  });
  const removeCredsMutation = trpc.portalAuth.removeClientCredentials.useMutation({
    onSuccess: () => { toast.success("Portal access removed"); refetchStatus(); },
    onError: (err) => toast.error(err.message),
  });

  // Fetch the saved custom portal domain from the DB
  const { data: domainData } = trpc.system.getPortalDomain.useQuery();
  const savedDomain = domainData?.portalDomain;
  // Priority: DB saved domain > env var > current origin (dev fallback)
  const publicBase = savedDomain
    ? `https://${savedDomain}`
    : ((import.meta.env.VITE_APP_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin);
  const portalLink = `${publicBase}/portal?caseId=${contact.caseId}`;

  // Fetch parent contact details if parentContactId exists
  const { data: parentContactData } = trpc.contacts.detail.useQuery(
    { id: parentContactId ?? 0 },
    { enabled: !!parentContactId }
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalLink);
    toast.success("Portal link copied to clipboard");
  };

  const sendPortalLinkMutation = trpc.contacts.sendPortalLink.useMutation();

  const handleSendEmail = async () => {
    if (selectedParents.length === 0) {
      toast.error("Please select at least one parent contact");
      return;
    }
    
    try {
      const result = await sendPortalLinkMutation.mutateAsync({
        parentContactIds: selectedParents,
        portalLink: portalLink,
        studentName: `${contact.firstName} ${contact.lastName}`,
      });
      
      if (result.success) {
        toast.success(`Portal link sent to ${result.sent} parent contact(s)`);
        setSelectedParents([]);
      } else {
        toast.error("Failed to send portal link");
      }
    } catch (error) {
      toast.error("Error sending portal link");
      console.error(error);
    }
  };

  // Build parent contacts list with full details
  const parentContacts = parentContactData?.contact
    ? [
        {
          id: parentContactData.contact.id,
          firstName: parentContactData.contact.firstName,
          lastName: parentContactData.contact.lastName,
          initials: `${parentContactData.contact.firstName.charAt(0)}${parentContactData.contact.lastName.charAt(0)}`.toUpperCase(),
          role: parentContactData.contact.jobTitle || "PARENT",
        },
      ]
    : [];

  return (
    <>
    <Card className="border border-accent/30 bg-gradient-to-br from-card to-accent/5 shadow-sm">
      <div className="flex items-start justify-between p-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="font-bold text-foreground">Client portal</h3>
            <div className="ml-auto flex items-center gap-2">
              {portalStatus?.hasCredentials ? (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> Access enabled
                </span>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> No access yet
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-accent hover:bg-accent/10"
                onClick={() => { setPwEmail(portalStatus?.email ?? contact.email ?? ""); setShowSetPassword(true); }}
              >
                {portalStatus?.hasCredentials ? "Update Login" : "Set Login"}
              </Button>
              {portalStatus?.hasCredentials && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => removeCredsMutation.mutate({ contactId: contact.id })}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4 bg-muted/50 rounded px-3 py-2 text-sm text-muted-foreground font-mono">
            <span className="truncate">{portalLink.substring(0, 50)}...</span>
            <Button variant="ghost" size="sm" onClick={handleCopyLink} className="ml-auto h-6 w-6 p-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            Select the connected contacts you want to send the client portal link to.
          </div>
          {parentContacts.length > 0 ? (
            <div className="flex gap-2 mb-4 flex-wrap">
              {parentContacts.map((parent) => (
                <label key={parent.id} className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/5 px-3 py-1.5 cursor-pointer hover:bg-accent/10 transition-colors">
                  <Checkbox
                    checked={selectedParents.includes(parent.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedParents([...selectedParents, parent.id]);
                      } else {
                        setSelectedParents(selectedParents.filter((id) => id !== parent.id));
                      }
                    }}
                  />
                  <span className="text-xs font-semibold text-accent">{parent.initials}</span>
                  <span className="text-xs text-foreground">{parent.firstName} {parent.lastName}</span>
                  <span className="text-xs font-semibold text-accent uppercase">{parent.role}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mb-4">No parent contacts linked to this student.</div>
          )}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={includeInEmails} onCheckedChange={(checked) => setIncludeInEmails(checked === true)} />
              <span className="text-xs text-foreground">Include client portal links in files and emails</span>
            </label>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <Button 
          onClick={handleSendEmail} 
          disabled={sendPortalLinkMutation.isPending || selectedParents.length === 0}
          size="sm" 
          className="ml-4 h-10 w-10 p-0 flex-shrink-0"
        >
          {sendPortalLinkMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </Card>

    {/* Set Portal Password Dialog */}
    <Dialog open={showSetPassword} onOpenChange={setShowSetPassword}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-accent" />
            {portalStatus?.hasCredentials ? "Update Portal Login" : "Set Portal Login"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Set the email and password this client will use to sign in to their portal.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="pw-email">Client Email</Label>
            <Input
              id="pw-email"
              type="email"
              value={pwEmail}
              onChange={(e) => setPwEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-password">{portalStatus?.hasCredentials ? "New Password" : "Password"}</Label>
            <Input
              id="pw-password"
              type="password"
              value={pwPassword}
              onChange={(e) => setPwPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSetPassword(false)}>Cancel</Button>
          <Button
            onClick={() => setPasswordMutation.mutate({ contactId: contact.id, email: pwEmail, password: pwPassword })}
            disabled={setPasswordMutation.isPending || !pwEmail || pwPassword.length < 8}
          >
            {setPasswordMutation.isPending ? "Saving..." : "Save Credentials"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ─── Compass section block (shared between admin + portal views) ───────────────
const COMPASS_SECTIONS = {
  status: { icon: Activity, label: "Current Status", accent: "text-blue-600 dark:text-blue-400 navy:text-blue-300", bg: "bg-blue-50 dark:bg-blue-950/40 navy:bg-blue-900/30", border: "border-blue-200 dark:border-blue-800 navy:border-blue-600/40" },
  meeting: { icon: BookOpen, label: "Last Meeting", accent: "text-violet-600 dark:text-violet-400 navy:text-violet-300", bg: "bg-violet-50 dark:bg-violet-950/40 navy:bg-violet-900/30", border: "border-violet-200 dark:border-violet-800 navy:border-violet-600/40" },
  nextStep: { icon: ArrowRightCircle, label: "Next Step", accent: "text-emerald-600 dark:text-emerald-400 navy:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/40 navy:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800 navy:border-emerald-600/40" },
  ball: { icon: Zap, label: "Who Has the Ball", accent: "text-amber-600 dark:text-amber-400 navy:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/40 navy:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800 navy:border-amber-600/40" },
  nextMeeting: { icon: CalendarCheck, label: "Next Meeting Date", accent: "text-rose-600 dark:text-rose-400 navy:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/40 navy:bg-rose-900/30", border: "border-rose-200 dark:border-rose-800 navy:border-rose-600/40" },
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
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");

  const archiveMutation = trpc.contacts.archive.useMutation({
    onSuccess: () => {
      toast.success("Contact archived");
      setShowArchiveDialog(false);
      setArchiveReason("");
      utils.contacts.detail.invalidate({ id: contactId });
    },
    onError: (err) => toast.error(err.message),
  });

  const unarchiveMutation = trpc.contacts.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Contact unarchived");
      utils.contacts.detail.invalidate({ id: contactId });
    },
    onError: (err) => toast.error(err.message),
  });

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
            {/* Archive / Unarchive button */}
            {(contact as any).archivedAt ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unarchiveMutation.mutate({ id: contact.id })}
                disabled={unarchiveMutation.isPending}
                className="inline-flex items-center gap-1.5 text-xs border-green-500/40 text-green-600 hover:bg-green-500/10"
              >
                Unarchive
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchiveDialog(true)}
                className="inline-flex items-center gap-1.5 text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              >
                Archive
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
            {contact.jobTitle && <span>{contact.jobTitle}</span>}
            {contact.company && <span>· {contact.company}</span>}
            {contact.email && <a href={`mailto:${contact.email}`} className="text-accent hover:underline">{contact.email}</a>}
            {contact.phone && <span>· {contact.phone}</span>}
          </div>
          {/* Case ID badge — students only */}
          {!isParent && contact.caseId && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 border border-accent/20 px-2 py-0.5 text-xs font-mono font-semibold text-accent tracking-wide">
                Case ID: {contact.caseId}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Case Participants bar */}
      <CaseParticipants contactId={contactId} contactName={fullName} parentContactId={contact.parentContactId} />

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

      {/* Archive Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={(v) => { setShowArchiveDialog(v); if (!v) setArchiveReason(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Contact</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Archiving <strong>{fullName}</strong> will hide them from active lists. You can unarchive at any time.
            </p>
            <div>
              <Label htmlFor="archiveReason" className="text-sm font-medium">Reason for archiving *</Label>
              <Textarea
                id="archiveReason"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. Case closed, no longer a client, moved to another provider..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowArchiveDialog(false); setArchiveReason(""); }}>Cancel</Button>
            <Button
              onClick={() => archiveMutation.mutate({ id: contact.id, reason: archiveReason })}
              disabled={!archiveReason.trim() || archiveMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  
  // Debug logging
  useEffect(() => {
    if (students.length > 0) {
      console.log('[DEBUG ContactDetail] Students fetched:', students.map(s => ({ id: s.id, name: s.firstName, nextMeeting: s.nextMeeting })));
    }
  }, [students]);

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
        <TabsTrigger value="cases" className="flex items-center gap-1.5">
          <ScrollText className="h-3.5 w-3.5" />
          Cases
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
                      <div className="mt-2 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                        {/* IEP meeting link status pill — only for IEP-type meetings */}
                        {student.nextMeeting.meetingType && /iep|504/i.test(student.nextMeeting.meetingType) && (
                          <span className={`inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                            student.nextMeeting.videoLink || student.nextMeeting.clientMeetingLink
                              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                              : 'bg-red-500/15 text-red-600 dark:text-red-400'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              student.nextMeeting.videoLink || student.nextMeeting.clientMeetingLink
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`} />
                            {student.nextMeeting.videoLink || student.nextMeeting.clientMeetingLink
                              ? 'Link sent to advocate'
                              : 'Link not sent to advocate'}
                          </span>
                        )}
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

      {/* State Complaint Builder */}
      <Card className="p-5 rounded-xl border border-rose-200 dark:border-rose-800 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/40">
            <ScrollText className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">State Complaint Builder</p>
              <span className="text-xs rounded-full px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold">AI-Assisted</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Draft a formal state complaint using this student's IEP data, case history, and documented violations. The builder walks you through each required section and generates a structured complaint ready for submission.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["FAPE Violations", "Procedural Safeguards", "Prior Written Notice", "Timelines", "Compensatory Services"].map((tag) => (
                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLocation(`/state-complaint-builder?contactId=${contactId}`)}
          className="self-start inline-flex items-center gap-1.5 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
        >
          <ScrollText className="h-3.5 w-3.5" />
          Open State Complaint Builder →
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
      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
        <TabsTrigger value="compass" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5"><Compass className="h-3.5 w-3.5" />Compass</TabsTrigger>
        <TabsTrigger value="activity" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Messages</TabsTrigger>
        <TabsTrigger value="tasks" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5" />Tasks</TabsTrigger>
        <TabsTrigger value="files" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5" />Files{files.length > 0 && <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-medium">{files.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="time-tracker" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" />Time</TabsTrigger>
        <TabsTrigger value="call-logs" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Calls</TabsTrigger>
        <TabsTrigger value="tools" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" />Tools</TabsTrigger>
        <TabsTrigger value="projects" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />Cases{projects.length > 0 && <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-medium">{projects.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="financials" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5" />Billing{invoices.length > 0 && <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-medium">{invoices.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="appointments" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />Appts{appointments.length > 0 && <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-medium">{appointments.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="notes" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Notes</TabsTrigger>
        <TabsTrigger value="details" className="rounded-lg text-sm px-3 py-1.5 flex items-center gap-1.5"><Info className="h-3.5 w-3.5" />Details</TabsTrigger>
      </TabsList>

      {/* COMPASS TAB */}
      <TabsContent value="compass" className="mt-4">
        {/* Client Portal Card */}
        <ClientPortalCard contact={contact} parentContactId={contact.parentContactId} />
        <div className="mt-6" />
        {/* AI Buttons for Compass tab */}
        <AiButtonRunner
          contactId={contactId}
          projectId={projects[0]?.id}
          location="compass"
          studentName={`${contact.firstName} ${contact.lastName}`}
          caseId={contact.caseId ?? undefined}
        />
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
                  <VoiceTextarea rows={2} value={compassForm.currentStatus} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, currentStatus: e.target.value }))} placeholder="Brief snapshot of where the case stands..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary of Last Meeting</label>
                  <VoiceTextarea rows={2} value={compassForm.lastMeetingSummary} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, lastMeetingSummary: e.target.value }))} placeholder="Key takeaways and decisions..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next Step</label>
                  <VoiceTextarea rows={2} value={compassForm.nextStep} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, nextStep: e.target.value }))} placeholder="The next action needed..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who Has the Ball</label>
                  <VoiceTextarea rows={2} value={compassForm.whoHasBall} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, whoHasBall: e.target.value }))} placeholder="Parent, School, District, Waypoint..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next Meeting Date</label>
                  <VoiceInput type="datetime-local" value={compassForm.nextMeetingDate} onChange={(e: any) => setCompassForm((f: any) => ({ ...f, nextMeetingDate: e.target.value }))} className="text-sm" />
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
      <TasksTabContent contactId={contactId} projects={projects} caseId={contact.caseId} parentContactId={contact.parentContactId} />
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

      {/* TIME TRACKER */}
      <TabsContent value="time-tracker" className="mt-4">
        <TimeTrackerTab studentId={contactId} studentName={fullName} contact={contact} />
      </TabsContent>
      {/* CALL LOGS */}
      <TabsContent value="call-logs" className="mt-4">
        <CallLogsTab studentId={contactId} />
      </TabsContent>
      {/* TOOLS */}
      <TabsContent value="tools" className="mt-4">
        <ToolsTabContent contactId={contactId} />
      </TabsContent>

      {/* CASES / PROJECTS */}
      <TabsContent value="projects" className="mt-4 space-y-3">
        {/* Context banner */}
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20 px-5 py-4 flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
              <ScrollText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Formal Escalation Files</p>
            <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5 leading-relaxed">
              This is where state complaints, resolution orders, MDR documents, tribunal records, findings, and federal case files are stored. Our goal is to keep this section empty — but when formal action is necessary, every document lives here.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["State Complaint", "Resolution Order", "MDR", "Tribunal Docs", "Findings", "Federal Case File"].map((tag) => (
                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">{tag}</span>
              ))}
            </div>
          </div>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 py-10 text-center">
            <ScrollText className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-semibold text-foreground">No formal cases on file</p>
            <p className="text-xs text-muted-foreground mt-1">Great news — this is exactly where we want to be.</p>
          </div>
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

      {/* CASES */}
      <TabsContent value="cases" className="mt-4 space-y-3">
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20 px-5 py-4 flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
              <ScrollText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Formal Escalation Files</p>
            <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5 leading-relaxed">
              This is where state complaints, resolution orders, MDR documents, tribunal records, findings, and federal case files are stored. Our goal is to keep this section empty — but when formal action is necessary, every document lives here.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["State Complaint", "Resolution Order", "MDR", "Tribunal Docs", "Findings", "Federal Case File"].map((tag) => (
                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-muted/20 py-10 text-center">
          <ScrollText className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm font-semibold text-foreground">No formal cases on file</p>
          <p className="text-xs text-muted-foreground mt-1">Great news — this is exactly where we want to be.</p>
        </div>
      </TabsContent>

      {/* NOTES */}
      <TabsContent value="notes" className="mt-4">
        {/* AI Buttons for Notes tab */}
        <AiButtonRunner
          contactId={contactId}
          projectId={projects[0]?.id}
          location="notes"
          studentName={`${contact.firstName} ${contact.lastName}`}
          caseId={contact.caseId ?? undefined}
        />
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-semibold text-foreground">No cases on file yet</p>
            <p className="text-xs text-muted-foreground mt-1">Notes are organized by case. Add a case first to start taking notes.</p>
          </div>
        ) : projects.length === 1 ? (
          <NotesSection projectId={projects[0].id} studentName={contact.firstName} />
        ) : (
          <div className="space-y-6">
            {projects.map((p: any) => (
              <div key={p.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">{p.name}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <NotesSection projectId={p.id} studentName={contact.firstName} />
              </div>
            ))}
          </div>
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
// CONTACT DETAIL TASK ROW — full-featured expandable row
// ─────────────────────────────────────────────────────────
const CD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Todo: { label: "Todo", color: "bg-gray-100 text-gray-600 border-gray-200" },
  "In Progress": { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200" },
  Done: { label: "Done", color: "bg-green-100 text-green-700 border-green-200" },
};
function ContactDetailTaskRow({ task, contactId }: { task: any; contactId: number }) {
  const [expanded, setExpanded] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);
  const [editPayload, setEditPayload] = useState<TaskEditPayload | null>(null);
  const utils = trpc.useUtils();
  const inv = () => utils.tasks.getByStudent.invalidate({ studentContactId: contactId });
  const stepCount = (task.steps ?? []).length;
  const doneCount = (task.steps ?? []).filter((s: any) => s.isComplete).length;
  const progress = stepCount > 0 ? Math.round((doneCount / stepCount) * 100) : 0;
  const isDone = (task.status ?? "Todo") === "Done";
  const prevDone = useRef(isDone);
  const statusCfg = CD_STATUS_CONFIG[task.status ?? "Todo"] ?? CD_STATUS_CONFIG["Todo"];

  // Fire confetti when task transitions to Done (with or without steps)
  useEffect(() => {
    if (isDone && !prevDone.current) {
      const end = Date.now() + 1200;
      const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
      (function frame() {
        import("canvas-confetti").then(({ default: confetti }) => {
          confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
          confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
    prevDone.current = isDone;
  }, [isDone]);

  const updateTask = trpc.tasks.update.useMutation({ onSuccess: inv });
  const deleteTask = trpc.tasks.delete.useMutation({ onSuccess: () => { inv(); toast("Task deleted"); } });
  const addStep = trpc.tasks.addStep.useMutation({ onSuccess: () => { inv(); setNewStepTitle(""); setAddingStep(false); } });
  const toggleStep = trpc.tasks.toggleStep.useMutation({
    onSuccess: (_data, vars) => {
      inv().then(() => {
        const updatedSteps = (task.steps ?? []).map((s: any) =>
          s.id === vars.stepId ? { ...s, isComplete: vars.isComplete } : s
        );
        const allDone = updatedSteps.length > 0 && updatedSteps.every((s: any) => s.isComplete);
        if (allDone && !isDone) {
          updateTask.mutate({ id: task.id, status: "Done" });
        }
      });
    },
  });
  const deleteStep = trpc.tasks.deleteStep.useMutation({ onSuccess: inv });

  return (
    <div className={`border rounded-lg mb-3 overflow-hidden transition-all ${
      isDone ? "border-green-200 bg-green-50/30" : "border-border bg-card"
    }`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button
          onClick={() => updateTask.mutate({ id: task.id, status: isDone ? "In Progress" : "Done" })}
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
        >
          {isDone ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${
              isDone ? "line-through text-muted-foreground" : "text-foreground"
            }`}>{task.title}</span>
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {task.priority && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                task.priority === "High" ? "bg-red-100 text-red-700" :
                task.priority === "Medium" ? "bg-amber-100 text-amber-700" :
                "bg-muted text-muted-foreground"
              }`}>{task.priority}</span>
            )}
          </div>
          {stepCount > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <Progress
                value={progress}
                className={`h-1.5 flex-1 max-w-[200px] transition-all duration-700 ${
                  progress === 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-blue-500"
                }`}
              />
              <span className="text-xs text-muted-foreground">{doneCount}/{stepCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editingStatus ? (
            <Select
              value={task.status ?? "Todo"}
              onValueChange={(val) => { updateTask.mutate({ id: task.id, status: val as any }); setEditingStatus(false); }}
            >
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CD_STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <button onClick={() => setEditingStatus(true)}>
              <Badge variant="outline" className={`text-xs cursor-pointer hover:opacity-80 ${statusCfg.color}`}>
                {statusCfg.label}
              </Badge>
            </button>
          )}
          <button
            onClick={() => setEditPayload({ kind: "project", id: task.id, title: task.title, status: task.status ?? "Todo", priority: task.priority, dueDate: task.dueDate, assignedToUserId: (task as any).assignedToUserId, assignedTo: (task as any).assignedTo, studentContactId: contactId, seenByClient: (task as any).seenByClient ?? false, description: (task as any).description })}
            className="text-muted-foreground hover:text-blue-500 transition-colors"
            title="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => deleteTask.mutate({ id: task.id })} className="text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <EditTaskModal task={editPayload} open={!!editPayload} onClose={() => setEditPayload(null)} />
      {expanded && (
        <div className="border-t border-border">
          {task.description && (
            <div className="px-10 py-2 text-sm text-muted-foreground bg-muted/20">{task.description}</div>
          )}
          <div>
            {(task.steps ?? []).map((step: any) => (
              <div key={step.id} className="flex items-center gap-3 px-10 py-2 border-b border-border/50 last:border-0 hover:bg-muted/20 group">
                <button
                  onClick={() => toggleStep.mutate({ stepId: step.id, isComplete: !step.isComplete })}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                >
                  {step.isComplete ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5" />}
                </button>
                <span className={`text-sm flex-1 ${
                  step.isComplete ? "line-through text-muted-foreground" : "text-foreground"
                }`}>{step.title}</span>
                <button
                  onClick={() => deleteStep.mutate({ stepId: step.id })}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="px-8 py-2">
            {addingStep ? (
              <div className="flex gap-2 items-center">
                <VoiceInput
                  autoFocus
                  placeholder="Step title..."
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newStepTitle.trim()) addStep.mutate({ taskId: task.id, title: newStepTitle.trim() });
                    if (e.key === "Escape") setAddingStep(false);
                  }}
                  className="h-7 text-sm flex-1"
                />
                <Button size="sm" onClick={() => { if (newStepTitle.trim()) addStep.mutate({ taskId: task.id, title: newStepTitle.trim() }); }} className="h-7 px-3 text-xs">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingStep(false)} className="h-7 px-2 text-xs">Cancel</Button>
              </div>
            ) : (
              <button onClick={() => setAddingStep(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1">
                <Plus className="h-3.5 w-3.5" />Add step
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────
// TASKS TAB — shows all tasks across student's projects
// ─────────────────────────────────────────────────────────
function TasksTabContent({ contactId, projects, caseId, parentContactId }: { contactId: number; projects: any[]; caseId?: string | null; parentContactId?: number | null }) {
  const utils = trpc.useUtils();

  const { data: tasks = [], isLoading } = trpc.tasks.getByStudent.useQuery(
    { studentContactId: contactId },
    { enabled: !!contactId }
  );

  return (
    <TabsContent value="tasks" className="mt-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {tasks.length} task{tasks.length !== 1 ? "s" : ""}
      </p>
      {/* Unified task creation */}
      <CreateTaskInline
        studentContactId={contactId}
        parentContactId={parentContactId}
        caseId={caseId ?? undefined}
        projectId={projects[0]?.id}
        onCreated={() => utils.tasks.getByStudent.invalidate({ studentContactId: contactId })}
      />

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={<CheckSquare className="h-8 w-8" />} text="No tasks for this student yet" />
      ) : (
        <div>
          {tasks.map((task: any) => (
            <ContactDetailTaskRow
              key={task.id}
              task={task}
              contactId={contactId}
            />
          ))}
        </div>
      )}
    </TabsContent>
  );
}

// ─────────────────────────────────────────────────────────
// TIME TRACKER TAB
// ─────────────────────────────────────────────────────────
function TimeTrackerTab({ studentId, studentName, contact }: { studentId: number; studentName: string; contact: any }) {
  const utils = trpc.useUtils();
  const [elapsed, setElapsed] = useState(0);
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(contact.hourlyRate ?? "");
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active timer
  const { data: activeEntry, refetch: refetchActive } = trpc.timeTracker.getActive.useQuery(
    { studentId },
    { refetchInterval: 5000 }
  );

  // Fetch session log
  const { data: entries = [] } = trpc.timeTracker.list.useQuery({ studentId });

  // Live elapsed counter
  useEffect(() => {
    if (activeEntry) {
      const tick = () => setElapsed(Math.floor((Date.now() - activeEntry.startedAt) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeEntry?.id, activeEntry?.startedAt]);

  const startMutation = trpc.timeTracker.start.useMutation({
    onSuccess: () => {
      toast.success("Timer started");
      utils.timeTracker.getActive.invalidate({ studentId });
      utils.timeTracker.list.invalidate({ studentId });
    },
    onError: (e) => toast.error(e.message),
  });

  const stopMutation = trpc.timeTracker.stop.useMutation({
    onSuccess: (data) => {
      toast.success(`Session saved — ${formatDuration(data.durationSeconds)}`);
      utils.timeTracker.getActive.invalidate({ studentId });
      utils.timeTracker.list.invalidate({ studentId });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.timeTracker.delete.useMutation({
    onSuccess: () => {
      toast.success("Entry deleted");
      utils.timeTracker.list.invalidate({ studentId });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleFlagMutation = trpc.timeTracker.toggleFlag.useMutation({
    onSuccess: () => utils.timeTracker.list.invalidate({ studentId }),
    onError: (e) => toast.error(e.message),
  });

  const updateNotesMutation = trpc.timeTracker.updateNotes.useMutation({
    onSuccess: () => {
      utils.timeTracker.list.invalidate({ studentId });
      setEditingNotes(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const setRateMutation = trpc.timeTracker.setHourlyRate.useMutation({
    onSuccess: () => {
      toast.success("Hourly rate saved");
      setEditingRate(false);
      utils.contacts.detail.invalidate({ id: studentId });
    },
    onError: (e) => toast.error(e.message),
  });

  // Billing summary
  const billableEntries = entries.filter((e: any) => e.billable && !e.invoiced);
  const totalBillableSeconds = billableEntries.reduce((sum: number, e: any) => sum + (e.durationSeconds ?? 0), 0);
  const hourlyRate = parseFloat(contact.hourlyRate ?? rateInput ?? "0") || 0;
  const totalBillableAmount = (totalBillableSeconds / 3600) * hourlyRate;
  const totalTrackedSeconds = entries.reduce((sum: number, e: any) => sum + (e.durationSeconds ?? 0), 0);

  function formatDuration(seconds: number | null | undefined) {
    if (!seconds) return "0m 0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  }

  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const isRunning = !!activeEntry;

  return (
    <div className="space-y-5">
      {/* Timer card */}
      <div className={`rounded-2xl border-2 p-6 transition-colors ${isRunning ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-border bg-card"}`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Clock display */}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {isRunning ? "Session in Progress" : "Ready to Track"}
            </p>
            <p className={`text-5xl font-mono font-bold tabular-nums tracking-tight ${isRunning ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
              {formatElapsed(elapsed)}
            </p>
            {isRunning && activeEntry && (
              <p className="text-xs text-muted-foreground mt-1">
                Started {new Date(activeEntry.startedAt).toLocaleTimeString()}
                {activeEntry.hourlyRate ? ` · $${activeEntry.hourlyRate}/hr` : ""}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-3">
            {!isRunning ? (
              <Button
                size="lg"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8"
                onClick={() => startMutation.mutate({ studentId })}
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                Start Timer
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                className="gap-2 px-8"
                onClick={() => activeEntry && stopMutation.mutate({ entryId: activeEntry.id })}
                disabled={stopMutation.isPending}
              >
                {stopMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-5 w-5" />}
                Stop & Save
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Billing summary + hourly rate */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 rounded-xl border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Tracked</p>
          <p className="text-2xl font-bold text-foreground">{formatDuration(totalTrackedSeconds)}</p>
          <p className="text-xs text-muted-foreground">{entries.length} session{entries.length !== 1 ? "s" : ""}</p>
        </Card>
        <Card className="p-4 rounded-xl border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Unbilled Hours</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatDuration(totalBillableSeconds)}</p>
          <p className="text-xs text-muted-foreground">{billableEntries.length} unbilled session{billableEntries.length !== 1 ? "s" : ""}</p>
        </Card>
        <Card className="p-4 rounded-xl border">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unbilled Amount</p>
            <button onClick={() => { setEditingRate(true); setRateInput(contact.hourlyRate ?? ""); }} className="text-xs text-accent hover:underline">
              {contact.hourlyRate ? `$${contact.hourlyRate}/hr` : "Set rate"}
            </button>
          </div>
          {editingRate ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-muted-foreground">$</span>
              <VoiceInput
                type="number"
                min="0"
                step="0.01"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="h-8 text-sm w-24"
                placeholder="0.00"
                autoFocus
              />
              <span className="text-sm text-muted-foreground">/hr</span>
              <Button size="sm" className="h-8 px-3" onClick={() => setRateMutation.mutate({ studentId, hourlyRate: rateInput })} disabled={setRateMutation.isPending}>
                {setRateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
              <button onClick={() => setEditingRate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <p className="text-2xl font-bold text-foreground">
              {hourlyRate > 0 ? `$${totalBillableAmount.toFixed(2)}` : <span className="text-base text-muted-foreground">Set hourly rate →</span>}
            </p>
          )}
        </Card>
      </div>

      {/* Session log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Session Log
          </h3>
          <p className="text-xs text-muted-foreground">Completed sessions only</p>
        </div>

        {entries.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
            <Timer className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No sessions recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the timer to begin tracking time for {studentName}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((entry: any) => {
              const amount = entry.hourlyRate && entry.durationSeconds
                ? ((entry.durationSeconds / 3600) * parseFloat(entry.hourlyRate)).toFixed(2)
                : null;
              return (
                <div key={entry.id} className="group rounded-xl border bg-card px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold tabular-nums text-foreground">{formatDuration(entry.durationSeconds)}</span>
                      {entry.hourlyRate && <span className="text-xs text-muted-foreground">${entry.hourlyRate}/hr</span>}
                      {amount && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">${amount}</span>}
                      <span className="text-xs text-muted-foreground">{new Date(entry.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span className="text-xs text-muted-foreground">{new Date(entry.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} – {entry.endedAt ? new Date(entry.endedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    </div>
                    {editingNotes === entry.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <VoiceInput
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Add session notes..."
                          className="h-7 text-xs flex-1"
                          autoFocus
                        />
                        <Button size="sm" className="h-7 px-2" onClick={() => updateNotesMutation.mutate({ entryId: entry.id, notes: notesInput })}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <button onClick={() => setEditingNotes(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNotes(entry.id); setNotesInput(entry.notes ?? ""); }}
                        className="text-xs text-muted-foreground hover:text-foreground mt-1 text-left"
                      >
                        {entry.notes || <span className="italic">Add notes…</span>}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Billable toggle */}
                    <button
                      onClick={() => toggleFlagMutation.mutate({ entryId: entry.id, field: "billable", value: !entry.billable })}
                      className={`text-xs px-2 py-1 rounded-full border font-medium transition-colors ${entry.billable ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300" : "bg-muted border-border text-muted-foreground"}`}
                      title="Toggle billable"
                    >
                      {entry.billable ? "Billable" : "Non-billable"}
                    </button>
                    {/* Invoiced toggle */}
                    <button
                      onClick={() => toggleFlagMutation.mutate({ entryId: entry.id, field: "invoiced", value: !entry.invoiced })}
                      className={`text-xs px-2 py-1 rounded-full border font-medium transition-colors ${entry.invoiced ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300" : "bg-muted border-border text-muted-foreground"}`}
                      title="Toggle invoiced"
                    >
                      {entry.invoiced ? "Invoiced" : "Not invoiced"}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => { if (confirm("Delete this session?")) deleteMutation.mutate({ entryId: entry.id }); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CALL LOGS TAB — shows Quo (OpenPhone) call transcripts for this student
// ─────────────────────────────────────────────────────────
function CallLogsTab({ studentId }: { studentId: number }) {
  const { data: logs = [], isLoading } = trpc.callLogs.listByStudent.useQuery({ studentId });
  const deleteMutation = trpc.callLogs.delete.useMutation({
    onSuccess: () => { toast.success("Call log deleted"); utils.callLogs.listByStudent.invalidate({ studentId }); },
    onError: (e) => toast.error("Failed to delete: " + e.message),
  });
  const utils = trpc.useUtils();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function formatDuration(secs: number) {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Phone className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No call logs yet</p>
        <p className="text-xs text-muted-foreground/70 max-w-xs">
          Call logs from Quo (OpenPhone) will appear here automatically when a call ends and a transcript is ready.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{logs.length} call{logs.length !== 1 ? "s" : ""} logged</p>
      {logs.map((log: any) => (
        <Card key={log.id} className="p-4 rounded-lg border border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex-shrink-0 rounded-full p-2 ${log.direction === "inbound" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"}`}>
                {log.direction === "inbound" ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">
                    {log.direction === "inbound" ? "Incoming" : "Outgoing"} Call
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDuration(log.durationSeconds)}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  {log.fromNumber && <span>From: {log.fromNumber}</span>}
                  {log.toNumber && <span>To: {log.toNumber}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="text-xs text-accent hover:underline"
              >
                {expandedId === log.id ? "Hide" : "View transcript"}
              </button>
              <button
                onClick={() => { if (confirm("Delete this call log?")) deleteMutation.mutate({ id: log.id }); }}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Summary always shown if available */}
          {log.summary && (
            <div className="mt-3 rounded-lg bg-accent/5 border border-accent/20 px-3 py-2">
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">AI Summary</p>
              <p className="text-sm text-foreground leading-relaxed">{log.summary}</p>
            </div>
          )}

          {/* Full transcript expandable */}
          {expandedId === log.id && log.transcript && (
            <div className="mt-3 rounded-lg bg-muted/50 border border-border px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Full Transcript</p>
              <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{log.transcript}</pre>
            </div>
          )}
          {expandedId === log.id && !log.transcript && (
            <div className="mt-3 text-xs text-muted-foreground italic">No transcript available for this call.</div>
          )}
        </Card>
      ))}
    </div>
  );
}
