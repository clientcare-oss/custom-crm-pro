import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  RefreshCw,
  Search,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Percent,
  Check,
  Copy,
  Plus,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { InteractivePageIdPill } from "./InteractivePageIdPill";

interface RenewalRecord {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentName: string;
  studentGrade: string;
  district: string;
  currentTier: string;
  contractEnd: string;
  daysRemaining: number;
  status: "approaching" | "due" | "offer_sent" | "renewed" | "lapsed";
  recommendedRenewalTier: string;
  renewalValue: number;
  lastContactDate: string;
}

const SAMPLE_RENEWALS: RenewalRecord[] = [
  {
    id: "ren-001",
    parentName: "Sarah Jenkins",
    parentEmail: "sarah.jenkins@example.com",
    parentPhone: "(404) 555-0192",
    studentName: "Liam Jenkins",
    studentGrade: "5th → 6th Grade",
    district: "Fulton County Schools",
    currentTier: "Full IEP Representation (2025–2026)",
    contractEnd: "2026-09-15",
    daysRemaining: 16,
    status: "approaching",
    recommendedRenewalTier: "Full Academic Year (2026–2027)",
    renewalValue: 3450,
    lastContactDate: "2026-08-28"
  },
  {
    id: "ren-002",
    parentName: "Marcus & Elena Vance",
    parentEmail: "elena.vance@example.com",
    parentPhone: "(770) 555-8312",
    studentName: "Noah Vance",
    studentGrade: "8th → 9th Grade",
    district: "Gwinnett County Public Schools",
    currentTier: "Full IEP Representation (2025–2026)",
    contractEnd: "2026-09-01",
    daysRemaining: 2,
    status: "offer_sent",
    recommendedRenewalTier: "High School Placement Transition",
    renewalValue: 2450,
    lastContactDate: "2026-08-25"
  },
  {
    id: "ren-003",
    parentName: "David & Rachel Miller",
    parentEmail: "rachel.m@millerfamily.org",
    parentPhone: "(404) 555-7744",
    studentName: "Emma Miller",
    studentGrade: "3rd Grade",
    district: "Atlanta Public Schools",
    currentTier: "Annual Goal Audit & Defense",
    contractEnd: "2026-09-30",
    daysRemaining: 31,
    status: "approaching",
    recommendedRenewalTier: "Annual IEP Goal Audit (2026–2027)",
    renewalValue: 1850,
    lastContactDate: "2026-08-20"
  },
  {
    id: "ren-004",
    parentName: "Patricia Owens",
    parentEmail: "patricia.owens@techcorp.com",
    parentPhone: "(678) 555-9021",
    studentName: "Caleb Owens",
    studentGrade: "7th Grade",
    district: "Cobb County School District",
    currentTier: "Advocacy Retainer (15 Hours)",
    contractEnd: "2026-08-20",
    daysRemaining: -10,
    status: "due",
    recommendedRenewalTier: "Advocacy Retainer Block (15 Hours)",
    renewalValue: 1950,
    lastContactDate: "2026-08-15"
  },
  {
    id: "ren-005",
    parentName: "Carlos & Maria Ramirez",
    parentEmail: "carlos.ramirez@example.com",
    parentPhone: "(404) 555-3399",
    studentName: "Lucas Ramirez",
    studentGrade: "4th Grade",
    district: "DeKalb County School District",
    currentTier: "Full IEP Representation (2025–2026)",
    contractEnd: "2026-08-31",
    daysRemaining: 1,
    status: "renewed",
    recommendedRenewalTier: "Full Academic Year (2026–2027)",
    renewalValue: 3450,
    lastContactDate: "2026-08-29"
  },
  {
    id: "ren-006",
    parentName: "Jennifer Taylor",
    parentEmail: "jennifer.taylor@example.com",
    parentPhone: "(770) 555-1234",
    studentName: "Mason Taylor",
    studentGrade: "11th Grade",
    district: "Cherokee County School District",
    currentTier: "Document Review & Strategy",
    contractEnd: "2026-07-31",
    daysRemaining: -30,
    status: "lapsed",
    recommendedRenewalTier: "Annual IEP Goal Audit & Defense",
    renewalValue: 1850,
    lastContactDate: "2026-07-28"
  }
];

interface RenewalListingManagerProps {
  onOpenPreviewStage?: (stageId: string) => void;
}

export function RenewalListingManager({ onOpenPreviewStage }: RenewalListingManagerProps) {
  const [renewals, setRenewals] = useState<RenewalRecord[]>(SAMPLE_RENEWALS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalRecord | null>(null);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [customOfferNote, setCustomOfferNote] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Stats
  const totalPipeline = renewals.reduce((sum, r) => sum + r.renewalValue, 0);
  const approachingCount = renewals.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 30 && r.status !== "renewed").length;
  const dueCount = renewals.filter((r) => r.daysRemaining <= 0 && r.status !== "renewed").length;
  const renewedCount = renewals.filter((r) => r.status === "renewed").length;

  const filteredRenewals = renewals.filter((r) => {
    const matchesSearch =
      r.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.parentEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenOfferModal = (record: RenewalRecord) => {
    setSelectedRenewal(record);
    setCustomOfferNote(
      `Hi ${record.parentName.split(" ")[0]},\n\nAs we prepare for the 2026–2027 school year, we'd love to continue advocating for ${record.studentName} as they transition into ${record.studentGrade}. Your current representation plan expires on ${record.contractEnd}.\n\nWe've prepared your renewal options with our 10% loyalty savings rate. You can review your customized renewal proposal and secure your spot on Byron's 2026–2027 caseload here:\nhttps://waypointadvocates.com/portal/renewal\n\nWarm regards,\nByron Honea, Master IEP Coach®`
    );
    setOfferModalOpen(true);
  };

  const handleSendOffer = () => {
    if (!selectedRenewal) return;
    setRenewals((prev) =>
      prev.map((r) => (r.id === selectedRenewal.id ? { ...r, status: "offer_sent" } : r))
    );
    toast.success(`Renewal proposal dispatched to ${selectedRenewal.parentEmail}!`);
    setOfferModalOpen(false);
  };

  const handleManualMarkRenewed = (recordId: string) => {
    setRenewals((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status: "renewed" } : r))
    );
    toast.success("Client marked as Renewed for the 2026–2027 academic cycle!");
  };

  const handleCopyRenewalLink = () => {
    setCopiedLink(true);
    navigator.clipboard.writeText(`${window.location.origin}/portal/renewal`);
    toast.success("Direct Parent Renewal Link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner with PG-027-S15 Badge */}
      <div className="bg-gradient-to-r from-amber-500/15 via-primary/10 to-background p-6 rounded-2xl border border-amber-500/25 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase px-2.5 py-0.5">
                Stage 15 · Retention Engine
              </Badge>
              <InteractivePageIdPill pageId="PG-027-S15" size="sm" />
            </div>

            <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2.5">
              <RefreshCw className="h-6 w-6 text-amber-500" />
              Annual Advocacy Plan Renewal & Retention Suite
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Manage client contract rollovers, expiring representation retainers, automated renewal offer dispatches, and multi-student academic continuity for the 2026–2027 school year.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              onClick={handleCopyRenewalLink}
              className="gap-2 text-xs font-semibold h-10 border-border/60 bg-background/80 hover:bg-muted"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              Copy Parent Portal Renewal Link
            </Button>

            <Button
              onClick={() => onOpenPreviewStage ? onOpenPreviewStage("stage-15") : null}
              className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold text-xs h-10 shadow-md hover:from-amber-600 hover:to-amber-700"
            >
              <Eye className="h-4 w-4" />
              Live Parent Renewal View
            </Button>
          </div>
        </div>

        {/* Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/40 text-xs">
          <div className="bg-card/80 backdrop-blur-sm p-3 rounded-xl border border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium block">Renewal Pipeline</span>
            <span className="text-lg font-extrabold text-foreground">${totalPipeline.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
              6 Households Tracked
            </span>
          </div>

          <div className="bg-card/80 backdrop-blur-sm p-3 rounded-xl border border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium block">Expiring in ≤30 Days</span>
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{approachingCount} Cases</span>
            <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
              Urgent outreach needed
            </span>
          </div>

          <div className="bg-card/80 backdrop-blur-sm p-3 rounded-xl border border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium block">Due / Expired</span>
            <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400">{dueCount} Cases</span>
            <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
              Action required
            </span>
          </div>

          <div className="bg-card/80 backdrop-blur-sm p-3 rounded-xl border border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium block">2026–2027 Confirmed</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{renewedCount} Renewed</span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              88.4% Target Retention Rate
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl border border-border/50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parent, student, district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/80"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: `All (${renewals.length})` },
            { id: "approaching", label: `Expiring Soon (${approachingCount})` },
            { id: "offer_sent", label: "Offer Sent" },
            { id: "due", label: "Due / Overdue" },
            { id: "renewed", label: `Renewed (${renewedCount})` },
            { id: "lapsed", label: "Lapsed" }
          ].map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={statusFilter === cat.id ? "default" : "outline"}
              onClick={() => setStatusFilter(cat.id)}
              className={`h-8 text-xs font-semibold px-2.5 transition-all ${
                statusFilter === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Renewals Table */}
      <Card className="border-border/60 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-muted/15 border-b border-border/40 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Client Renewal & Retention Pipeline (2026–2027)
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {filteredRenewals.length} Matching Records
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Direct tracking of student representation lifecycle and contract renewal checkpoints.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Client / Parent</th>
                  <th className="p-3.5">Student & District</th>
                  <th className="p-3.5">Current Plan</th>
                  <th className="p-3.5">Expiration / Days Left</th>
                  <th className="p-3.5">Recommended Renewal Tier</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredRenewals.map((record) => {
                  const getStatusBadge = () => {
                    switch (record.status) {
                      case "renewed":
                        return (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                            ✓ Renewed (2026–2027)
                          </Badge>
                        );
                      case "offer_sent":
                        return (
                          <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px]">
                            Offer Sent
                          </Badge>
                        );
                      case "due":
                        return (
                          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] animate-pulse">
                            Expired / Overdue
                          </Badge>
                        );
                      case "lapsed":
                        return (
                          <Badge variant="outline" className="text-muted-foreground border-border/60 text-[10px]">
                            Lapsed
                          </Badge>
                        );
                      case "approaching":
                      default:
                        return (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                            {record.daysRemaining} Days Left
                          </Badge>
                        );
                    }
                  };

                  return (
                    <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-semibold text-foreground">{record.parentName}</div>
                        <div className="text-[11px] text-muted-foreground">{record.parentEmail}</div>
                        <div className="text-[10px] text-muted-foreground">{record.parentPhone}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-primary" />
                          {record.studentName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{record.studentGrade}</div>
                        <div className="text-[10px] text-muted-foreground/80">{record.district}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-medium text-foreground">{record.currentTier}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono text-foreground font-semibold">{record.contractEnd}</div>
                        <div className="text-[11px] mt-0.5">
                          {record.daysRemaining > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              Expires in {record.daysRemaining} days
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              Expired {Math.abs(record.daysRemaining)} days ago
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{record.recommendedRenewalTier}</div>
                        <div className="text-[11px] font-bold text-primary">${record.renewalValue.toLocaleString()}/yr</div>
                      </td>

                      <td className="p-3.5">
                        {getStatusBadge()}
                      </td>

                      <td className="p-3.5 pr-5 text-right space-x-1.5 whitespace-nowrap">
                        {record.status !== "renewed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenOfferModal(record)}
                            className="h-7 text-xs font-semibold gap-1 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            <Send className="h-3 w-3" />
                            Send Offer
                          </Button>
                        )}

                        {record.status !== "renewed" ? (
                          <Button
                            size="sm"
                            onClick={() => handleManualMarkRenewed(record.id)}
                            className="h-7 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="h-3 w-3" />
                            Renew
                          </Button>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs py-1 px-2">
                            Locked In ✓
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Offer Modal Dialog */}
      <Dialog open={offerModalOpen} onOpenChange={setOfferModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-primary" />
              Dispatch 2026–2027 Renewal Proposal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sending personalized renewal notice to <strong className="text-foreground">{selectedRenewal?.parentName}</strong> ({selectedRenewal?.parentEmail}) for <strong className="text-foreground">{selectedRenewal?.studentName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="bg-muted/30 p-3 rounded-xl border border-border/50 grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block text-[11px]">Recommended Tier:</span>
                <span className="font-bold text-foreground text-xs">{selectedRenewal?.recommendedRenewalTier}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Annual Investment:</span>
                <span className="font-bold text-primary text-xs">${selectedRenewal?.renewalValue.toLocaleString()} (Includes 10% Loyalty Savings)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Personalized Message to Parent</label>
              <Textarea
                rows={7}
                value={customOfferNote}
                onChange={(e) => setCustomOfferNote(e.target.value)}
                className="text-xs font-mono leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendOffer} className="gap-1.5 bg-primary text-primary-foreground font-semibold">
              <Send className="h-3.5 w-3.5" />
              Dispatch Renewal Notice & Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
