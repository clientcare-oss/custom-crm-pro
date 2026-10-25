import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  SquarePen, Compass, Users, 
  UsersRound, ClipboardCheck, Landmark, Wrench, 
  CalendarDays, Clock, Coins, Link2, Eye,
  ExternalLink, Copy, Check, ShieldCheck, Lock,
  CheckCircle2, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface StudentWorkspaceMoreTabProps {
  studentId: string | number;
  caseId?: string;
  studentName?: string;
  parentContactId?: number;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  studentGrade?: string;
}

interface WorkspaceItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  external?: boolean;
}

/**
 * Custom satin-brass calendar icon matching the reference image:
 * Top hanger tabs, rounded outer calendar frame, horizontal header dividing line,
 * and distinct square day cells.
 */
function TimelineCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top hanger tabs */}
      <line x1="8" y1="2.2" x2="8" y2="5.5" strokeWidth="2.2" />
      <line x1="16" y1="2.2" x2="16" y2="5.5" strokeWidth="2.2" />
      
      {/* Outer rounded calendar container */}
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      
      {/* Header divider line */}
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      
      {/* Day square cells directly matching the portfolio reference layout */}
      <rect x="6.5" y="12" width="2.4" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="10.8" y="12" width="2.4" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="15.1" y="12" width="2.4" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="6.5" y="15.8" width="2.4" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StudentWorkspaceMoreTab({
  studentId,
  caseId,
  studentName,
  parentContactId,
  parentName,
  parentEmail,
  parentPhone,
  studentGrade,
}: StudentWorkspaceMoreTabProps) {
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string>("activity-timeline");
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const utils = trpc.useUtils();
  const ensureDevParentMutation = trpc.portal.ensureDevParentForStudent.useMutation();

  // If parent info is not directly passed, query contact detail as resilient fallback
  const numericStudentId = Number(studentId);
  const { data: contactDetail } = trpc.contacts.detail.useQuery(
    { id: numericStudentId },
    { enabled: (!parentContactId || !parentName) && !isNaN(numericStudentId) && numericStudentId > 0 }
  );

  const effectiveParentId = parentContactId || contactDetail?.parentContact?.id || contactDetail?.contact?.parentContactId;
  const effectiveParentName = parentName || (contactDetail?.parentContact ? `${contactDetail.parentContact.firstName} ${contactDetail.parentContact.lastName}` : (contactDetail?.contact?.parentName || "Parent on File"));
  const effectiveParentEmail = parentEmail || contactDetail?.parentContact?.email || contactDetail?.contact?.email;
  const effectiveParentPhone = parentPhone || contactDetail?.parentContact?.phone || contactDetail?.contact?.phone;
  const effectiveCaseId = caseId || contactDetail?.contact?.caseId;
  const effectiveGrade = studentGrade || contactDetail?.contact?.gradeLevel;

  // Build the strict Phase 2 portal preview URL
  const portalPreviewPath = `/portal?preview=true&contactId=${studentId}${effectiveParentId ? `&parentContactId=${effectiveParentId}` : ""}${effectiveCaseId ? `&caseId=${effectiveCaseId}` : ""}`;
  const fullPreviewUrl = typeof window !== "undefined" ? `${window.location.origin}${portalPreviewPath}` : portalPreviewPath;

  const handleOpenParentPortal = async () => {
    let parentId = effectiveParentId;
    if (!parentId && numericStudentId > 0) {
      try {
        const res = await ensureDevParentMutation.mutateAsync({ studentContactId: numericStudentId });
        if (res?.parentId) {
          parentId = res.parentId;
          utils.contacts.detail.invalidate({ id: numericStudentId });
        }
      } catch (err: any) {
        console.error("Failed to ensure dev parent:", err);
      }
    }
    const finalUrl = `/portal?preview=true&contactId=${studentId}${parentId ? `&parentContactId=${parentId}` : ""}${effectiveCaseId ? `&caseId=${effectiveCaseId}` : ""}`;
    window.open(finalUrl, "_blank");
  };

  const handleCopyPortalLink = async () => {
    let parentId = effectiveParentId;
    if (!parentId && numericStudentId > 0) {
      try {
        const res = await ensureDevParentMutation.mutateAsync({ studentContactId: numericStudentId });
        if (res?.parentId) {
          parentId = res.parentId;
          utils.contacts.detail.invalidate({ id: numericStudentId });
        }
      } catch (err: any) {
        console.error("Failed to ensure dev parent for link copy:", err);
      }
    }
    const finalPath = `/portal?preview=true&contactId=${studentId}${parentId ? `&parentContactId=${parentId}` : ""}${effectiveCaseId ? `&caseId=${effectiveCaseId}` : ""}`;
    const targetUrl = typeof window !== "undefined" ? `${window.location.origin}${finalPath}` : finalPath;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl);
      setCopiedLink(true);
      toast.success("Parent portal preview link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const items: WorkspaceItem[] = useMemo(() => [
    {
      id: "activity-timeline",
      title: "Activity Timeline",
      description: "Every case action in one place.",
      icon: TimelineCalendarIcon,
      onClick: () => {
        setSelectedId("activity-timeline");
        setLocation(`/contacts/${studentId}?tab=activity-timeline`);
      },
    },
    {
      id: "voyage-log",
      title: "Voyage Log",
      description: "Record case updates.",
      icon: SquarePen,
      onClick: () => {
        setSelectedId("voyage-log");
        setLocation(`/tools/voyage-recorder`);
      },
    },
    {
      id: "case-compass",
      title: "Case Compass",
      description: "Priorities and next steps.",
      icon: Compass,
      onClick: () => {
        setSelectedId("case-compass");
        setLocation(`/case-compass`);
      },
    },
    {
      id: "lawyer-status",
      title: "Lawyer Status",
      description: "Legal representation details.",
      icon: UsersRound,
      onClick: () => {
        setSelectedId("lawyer-status");
        setLocation(`/contacts/${studentId}?tab=legal`);
      },
    },
    {
      id: "iep-binder",
      title: "IEP Binder",
      description: "Documents, goals, and history.",
      icon: ClipboardCheck,
      onClick: () => {
        setSelectedId("iep-binder");
        setLocation(`/contacts/${studentId}?tab=documents`);
      },
    },
    {
      id: "school-district",
      title: "School & District",
      description: "School contacts and policies.",
      icon: Landmark,
      onClick: () => {
        setSelectedId("school-district");
        setLocation(`/contacts/${studentId}?tab=overview`);
      },
    },
    {
      id: "advocacy-tools",
      title: "Advocacy Tools",
      description: "Open your advocacy toolkit.",
      icon: Wrench,
      onClick: () => {
        setSelectedId("tools");
        setLocation(`/tools`);
      },
    },
    {
      id: "appointments",
      title: "Appointments",
      description: "View and schedule sessions.",
      icon: CalendarDays,
      onClick: () => {
        setSelectedId("appointments");
        setLocation(`/appointments`);
      },
    },
    {
      id: "time-management",
      title: "Time Management",
      description: "Track time spent on the case.",
      icon: Clock,
      onClick: () => {
        setSelectedId("time-management");
        setLocation(`/contacts/${studentId}?tab=time-tracker`);
      },
    },
    {
      id: "parent-portal-controls",
      title: "Parent Portal Controls",
      description: "Manage parent access and visibility.",
      icon: Users,
      onClick: () => {
        setSelectedId("parent-portal-controls");
        setIsPortalModalOpen(true);
      },
    },
    {
      id: "billing",
      title: "Billing",
      description: "Payments, invoices, and balance.",
      icon: Coins,
      onClick: () => {
        setSelectedId("billing");
        setLocation(`/invoices`);
      },
    },
    {
      id: "referral",
      title: "Referral",
      description: "Track referrals and credits.",
      icon: Link2,
      onClick: () => {
        setSelectedId("referral");
        setLocation(`/contacts/${studentId}?tab=referral`);
      },
    },
  ], [studentId, setLocation]);

  return (
    <div className="w-full min-h-[500px] p-5 sm:p-7 md:p-8 select-none">
      {/* ─── Grid: Responsive columns allowing long titles like "Activity Timeline" to fit on 1 line ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                // Base layout & dimensions: identical padding, height, and alignment across all buttons
                "group relative w-full h-[88px] min-h-[88px] rounded-[12px] px-5 py-3 flex items-center gap-[18px]",
                "text-left select-none cursor-pointer transition-all duration-150 ease-out",
                // Keyboard focus outline in restrained warm brass
                "focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[#D4AF37]/90 focus-visible:border-[#C59E45]",
                // Surface: Translucent midnight-navy leather letting the portfolio texture subtly show through
                "bg-gradient-to-b from-[#0c2449]/55 via-[#071933]/65 to-[#030e20]/80 backdrop-blur-[1.5px]",
                // Thin muted steel-blue edge
                "border border-[#1d3f6d]/80",
                // Layered shadows: faint top highlight, bottom dark edge, soft external shadow beneath
                "shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.18),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_4px_14px_rgba(0,0,0,0.55),0_1px_3px_rgba(0,0,0,0.65)]",
                // Hover: Gently brightens leather surface and edge
                "hover:from-[#112f5a]/65 hover:via-[#092244]/75 hover:to-[#051328]/85",
                "hover:border-[#2b5894]/85",
                "hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.24),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.7)]",
                // Pressed state: Slightly compresses shadow to feel physically pressed
                "active:translate-y-[0.5px] active:shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.5)]",
                // Selected state: Restrained brass outline
                isSelected && "border-[#C59E45]/85 ring-1 ring-[#D4AF37]/50 shadow-[0_0_14px_rgba(212,175,55,0.22),inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-1.5px_2px_rgba(0,0,0,0.85)]"
              )}
            >
              {/* ─── Consistent 56px-wide icon area directly on button surface (no square box) ─── */}
              <div className="w-[56px] min-w-[56px] h-full flex items-center justify-center shrink-0">
                <Icon className="w-[36px] h-[36px] sm:w-[38px] sm:h-[38px] text-[#F1CB6C] stroke-[1.9] drop-shadow-[0_2px_3.5px_rgba(0,0,0,0.85)] group-hover:text-[#FDE295] group-hover:scale-[1.03] transition-all" />
              </div>

              {/* ─── Content Area: Left-aligned, refined serif title & muted blue description ─── */}
              <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
                <h4
                  className="font-medium text-[15.5px] lg:text-[16px] text-[#F7F2E8] tracking-normal leading-tight whitespace-nowrap drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.85)] group-hover:text-[#FFF8EE] transition-colors"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {item.title}
                </h4>
                <p className="text-[12px] lg:text-[12.5px] text-[#93AECD] leading-[1.35] mt-1 line-clamp-2 group-hover:text-[#A8C4E6] transition-colors">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── PARENT PORTAL CONTROLS MODAL (Admiralty Theme) ─── */}
      <Dialog open={isPortalModalOpen} onOpenChange={setIsPortalModalOpen}>
        <DialogContent className="max-w-xl bg-[#05142B] border border-[#3A2C18] text-white p-0 overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-2xl">
          {/* Header Banner */}
          <div className="bg-gradient-to-b from-[#102B4E]/90 to-[#07162B] p-6 border-b border-[#3A2C18] relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#092244] border border-[#C5A059]/40 flex items-center justify-center text-[#F1CB6C] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.6)]">
                  <Users className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-widest font-mono font-bold uppercase text-[#DFBE77] bg-[#DFBE77]/10 border border-[#DFBE77]/30 px-2 py-0.5 rounded">
                      PG-023-CTL
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Portal Active
                    </span>
                  </div>
                  <h3
                    className="text-xl sm:text-2xl font-bold text-[#FFF4D4] mt-1 tracking-tight"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Parent Portal Controls
                  </h3>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#C6B697] mt-2.5 leading-relaxed">
              Manage and preview how this case appears to the family in the Client Portal (PG-023).
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Client & Family Identity Card */}
            <div className="bg-[#020A17]/85 border border-[#3A2C18]/80 rounded-xl p-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#A69371] font-semibold mb-3 flex items-center justify-between">
                <span>Family Record Association</span>
                {effectiveCaseId && (
                  <span className="text-[#DFBE77] font-mono">{effectiveCaseId}</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-[#8A9EB5] block">Student</span>
                  <span className="font-semibold text-white text-[15px]">{studentName || "Student Record"}</span>
                  {effectiveGrade && (
                    <span className="text-xs text-[#A69371] block mt-0.5">{effectiveGrade}</span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-[#8A9EB5] block">Parent / Guardian</span>
                  <span className="font-semibold text-white text-[15px]">{effectiveParentName}</span>
                  <span className="text-xs text-[#A69371] block mt-0.5 truncate">
                    {effectiveParentEmail || effectiveParentPhone || "On record"}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action Button: View Parent Portal */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenParentPortal}
                disabled={ensureDevParentMutation.isPending}
                className="w-full py-3.5 px-5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_16px_rgba(197,160,89,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer select-none disabled:opacity-60"
              >
                {ensureDevParentMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 text-[#07162B] animate-spin" />
                    <span>Preparing Portal Access...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 text-[#07162B] stroke-[2.2]" />
                    <span>View Parent Portal</span>
                    <ExternalLink className="w-4 h-4 ml-1 opacity-75" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-[#93AECD]">
                Opens an isolated staff preview for <strong className="text-[#FFE394]">{studentName}</strong> and the <strong className="text-[#FFE394]">{effectiveParentName}</strong> family.
              </p>
            </div>

            {/* Direct Portal Link Sharing */}
            <div className="bg-[#020A17]/60 border border-[#3A2C18]/60 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#C6B697]">
                <span className="font-medium flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#DFBE77]" />
                  Direct Portal URL
                </span>
                <span className="text-[10px] text-[#8A9EB5] font-mono">Staff Preview Route</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={fullPreviewUrl}
                  className="flex-1 bg-[#05142B] border border-[#1d3f6d] rounded-lg px-3 py-1.5 text-xs text-[#D8C7A5] font-mono truncate focus:outline-none focus:border-[#C59E45]"
                />
                <button
                  type="button"
                  onClick={handleCopyPortalLink}
                  className="px-3 py-1.5 rounded-lg border border-[#3A2C18] bg-[#092244] hover:bg-[#0c2e5c] text-xs font-semibold text-[#FFE394] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Read-Only Safety Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#07162B] border border-[#3A2C18]/60 text-xs text-[#C6B697]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Read-Only Safety Guard:</strong> Staff preview mode allows complete inspection of student documents, case compass, and invoice status, while payment actions remain strictly disabled.
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-[#020A17] px-6 py-3.5 border-t border-[#3A2C18] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsPortalModalOpen(false);
                setLocation("/portal-management");
              }}
              className="text-xs text-[#93AECD] hover:text-[#FFE394] transition-colors cursor-pointer"
            >
              Open Portal Management →
            </button>
            <button
              type="button"
              onClick={() => setIsPortalModalOpen(false)}
              className="px-4 py-1.5 rounded-lg border border-[#3A2C18] bg-[#07162B] hover:bg-[#0c2449] text-xs font-medium text-[#D8C7A5] hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
