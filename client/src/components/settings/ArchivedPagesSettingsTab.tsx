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
      <div className="p-4 sm:p-5 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#020A17] border border-[#3A2C18] text-[#FFE394] shrink-0">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-bold text-base text-[#FFF4D4]">
                Archived Pages & Reference Consoles
              </h3>
              <Badge variant="outline" className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-[10px]">
                Safe Repository
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#C6B697] mt-0.5 max-w-2xl leading-relaxed">
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
            className="p-5 sm:p-6 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all relative overflow-hidden group"
          >
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B]" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#3A2C18]/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] font-mono font-bold text-xs">
                    {page.id}
                  </Badge>
                  <h4 className="text-lg font-serif font-bold text-[#FFF4D4] tracking-tight">
                    {page.name}
                  </h4>
                  <Badge variant="outline" className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                    ✓ {page.status}
                  </Badge>
                </div>
                <p className="text-xs text-[#C6B697]">
                  Original Path: <code className="bg-[#020A17] text-[#FFE394] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#3A2C18]">{page.originalRoute}</code> &nbsp;·&nbsp;
                  Archived Path: <code className="bg-[#020A17] text-[#DFBE77] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#3A2C18]">{page.archivedRoute}</code> &nbsp;·&nbsp;
                  Archived: {page.archivedDate}
                </p>
              </div>

              {/* Student Picker & Launch Action */}
              <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
                {fallbackStudents.length > 0 && (
                  <div className="min-w-[200px]">
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger className="h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                        <SelectValue placeholder="Select student case..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                        {fallbackStudents.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} className="text-xs text-[#FFF4D4] focus:bg-[#071E3D] focus:text-[#FFE394]">
                            {s.firstName} {s.lastName} {s.company ? `(${s.company})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={() => handleLaunchArchived(page)}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4 gap-1.5 shrink-0 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Launch Workspace
                </Button>
              </div>
            </div>

            {/* Description & Why Archived */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs">
              <div className="p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/80">
                <span className="font-bold text-[#FFF4D4] block mb-1">Architecture Description:</span>
                <p className="text-[#C6B697] leading-relaxed">{page.description}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#071E3D]/80 border border-[#3A2C18]/80 text-[#FFF4D4]">
                <span className="font-bold text-[#FFE394] block mb-1">Redesign Reference Notes:</span>
                <p className="text-[#C6B697] leading-relaxed">{page.whyArchived}</p>
              </div>
            </div>

            {/* Complete 11-Tab Parity Checklist */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#A69371] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#FFE394]" />
                  <span>Original 11-Tab Feature Inventory (Verify nothing is missed in new PG-030)</span>
                </h5>
                <span className="text-[11px] text-[#FFE394] font-bold font-mono">
                  {page.tabBreakdown.length} Core Modules
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {page.tabBreakdown.map((tab, idx) => {
                  const Icon = tab.icon;
                  return (
                    <div
                      key={tab.title}
                      className="p-2.5 rounded-xl border border-[#3A2C18]/70 bg-[#020A17]/80 hover:bg-[#071E3D] hover:border-[#C5A059]/60 transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <div className="p-1.5 rounded-lg bg-[#05142B] text-[#FFE394] border border-[#3A2C18] shrink-0 mt-0.5">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#FFF4D4] block truncate">
                          {idx + 1}. {tab.title}
                        </span>
                        <p className="text-[11px] text-[#C6B697] leading-snug line-clamp-2 mt-0.5">
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
