import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  ExternalLink,
  ChevronRight,
  Sparkles,
  FileText,
  Compass,
  DollarSign,
  Phone,
  Scale,
  Users,
  Folder,
  Calendar,
  Layers,
  GraduationCap,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageIdBadge from "@/components/PageIdBadge";

interface ArchivedPageItem {
  id: string;
  name: string;
  originalRoute: string;
  archivedRoute: string;
  archivedDate: string;
  status: string;
  category: string;
  description: string;
  whyArchived: string;
  tabBreakdown: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }[];
}

const ARCHIVED_PAGES: ArchivedPageItem[] = [
  {
    id: "PG-030-ARC",
    name: "Legacy Student Workspace (Original 11-Tab Engine)",
    originalRoute: "/students/:id",
    archivedRoute: "/archived/pg-030",
    archivedDate: "October 2026",
    status: "Interactive Reference",
    category: "CRM / Advocacy",
    description:
      "The comprehensive monolithic student case workspace containing the original Case Compass, Service Allowances, Legal Representation, IEP Document Blocks, Quo telephony, and Voyage audio logs.",
    whyArchived:
      "Preserved as an active, queryable reference while designing the next-generation Student Workspace redesign so no operational features, client data fields, or tab workflows are missed.",
    tabBreakdown: [
      {
        icon: Compass,
        title: "Case Compass & Operational State",
        description: "Status, meeting summary, who has ball, next meeting date, and operational state indicator.",
      },
      {
        icon: GraduationCap,
        title: "Student Profile & IEP Information",
        description: "DOB, grade level, medical & educational diagnoses, IEP eligibility, school history, and plan type.",
      },
      {
        icon: Layers,
        title: "Service Allowances & Package Master",
        description: "Assigned advocacy package, 9 standard allowances, custom allowances, and remaining hours.",
      },
      {
        icon: FileText,
        title: "IEP Document Blocks & Accommodation Vault",
        description: "Structured IEP goals, classroom accommodations, modifications, and evidence files.",
      },
      {
        icon: Users,
        title: "Case Participants & Family Directory",
        description: "Parent portal provisioning, school personnel, district directors, and advocate assignments.",
      },
      {
        icon: Clock,
        title: "Notes & Timeline Activity",
        description: "Timestamped advocate case notes, voice transcription notes, and historical timeline logs.",
      },
      {
        icon: Folder,
        title: "Client Files & Document Vault",
        description: "Evaluation reports, school psychologicals, PWNs, and client file uploads.",
      },
      {
        icon: DollarSign,
        title: "Financials & Hourly Billing",
        description: "Billing hourly rates, invoices, payment status, and contract terms.",
      },
      {
        icon: Scale,
        title: "Lawyer Prep & Legal Representation",
        description: "Attorney involvement toggle, law firm contacts, representation status, and compliance notes.",
      },
      {
        icon: Phone,
        title: "Quo (OpenPhone) Telephony Controls",
        description: "Inbound & outbound call logs, call duration, recordings, and direct dial buttons.",
      },
      {
        icon: Calendar,
        title: "Voyage Meeting Audio & Log Chunks",
        description: "Live meeting speech-to-text chunks, advocate turn notes, and meeting recordings.",
      },
    ],
  },
];

export function ArchivedPagesSettingsTab() {
  const [, setLocation] = useLocation();
  const { data: contacts } = trpc.contacts.list.useQuery();

  // Find students or contacts for live selection
  const studentContacts = React.useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(
      (c) =>
        Boolean(c.parentContactId) ||
        (c.jobTitle || "").toLowerCase() === "student" ||
        Boolean(c.diagnosis) ||
        Boolean(c.gradeLevel)
    );
  }, [contacts]);

  const fallbackStudents = studentContacts.length > 0 ? studentContacts : contacts || [];
  const defaultStudentId = fallbackStudents[0]?.id ? String(fallbackStudents[0].id) : "1";

  const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Update selected student when data loads
  React.useEffect(() => {
    if (fallbackStudents.length > 0 && selectedStudentId === "1" && fallbackStudents[0]?.id) {
      setSelectedStudentId(String(fallbackStudents[0].id));
    }
  }, [fallbackStudents]);

  const handleLaunchArchived = (page: ArchivedPageItem) => {
    const route = page.id === "PG-030-ARC"
      ? `/archived/students/${selectedStudentId}`
      : page.archivedRoute;
    setLocation(route);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Archived Pages Purpose */}
      <div className="p-4 sm:p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 text-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 shrink-0">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-foreground">
                Archived Pages & Reference Consoles
              </h3>
              <Badge variant="outline" className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px]">
                Safe Repository
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
              When redesigning core CRM screens, previous versions are preserved here in full working condition. You can open any archived console with live database records to verify feature parity.
            </p>
          </div>
        </div>

        <PageIdBadge id="PG-ARC" name="Archived Pages Hub" />
      </div>

      {/* Directory of Archived Workspaces */}
      <div className="space-y-4">
        {ARCHIVED_PAGES.map((page) => (
          <Card
            key={page.id}
            className="p-5 sm:p-6 border-border/80 bg-card/80 hover:border-purple-500/40 transition-all shadow-md relative overflow-hidden group"
          >
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-500" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-purple-500/15 text-purple-300 border-purple-500/30 font-mono font-bold text-xs">
                    {page.id}
                  </Badge>
                  <h4 className="text-lg font-bold text-foreground tracking-tight">
                    {page.name}
                  </h4>
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                    ✓ {page.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Original Path: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">{page.originalRoute}</code> &nbsp;·&nbsp;
                  Archived Path: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-purple-300">{page.archivedRoute}</code> &nbsp;·&nbsp;
                  Archived: {page.archivedDate}
                </p>
              </div>

              {/* Student Picker & Launch Action */}
              <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
                {fallbackStudents.length > 0 && (
                  <div className="min-w-[200px]">
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger className="h-9 text-xs bg-card border-border">
                        <SelectValue placeholder="Select student case..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fallbackStudents.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                            {s.firstName} {s.lastName} {s.company ? `(${s.company})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={() => handleLaunchArchived(page)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 px-4 gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Launch Workspace
                </Button>
              </div>
            </div>

            {/* Description & Why Archived */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <span className="font-bold text-foreground block mb-1">Architecture Description:</span>
                <p className="text-muted-foreground leading-relaxed">{page.description}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                <span className="font-bold text-amber-300 block mb-1">Redesign Reference Notes:</span>
                <p className="text-amber-200/90 leading-relaxed">{page.whyArchived}</p>
              </div>
            </div>

            {/* Complete 11-Tab Parity Checklist */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
                  <span>Original 11-Tab Feature Inventory (Verify nothing is missed in new PG-030)</span>
                </h5>
                <span className="text-[11px] text-purple-400 font-bold font-mono">
                  {page.tabBreakdown.length} Core Modules
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {page.tabBreakdown.map((tab, idx) => {
                  const Icon = tab.icon;
                  return (
                    <div
                      key={tab.title}
                      className="p-2.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card/90 transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0 mt-0.5">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-foreground block truncate">
                          {idx + 1}. {tab.title}
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                          {tab.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ArchivedPagesSettingsTab;
