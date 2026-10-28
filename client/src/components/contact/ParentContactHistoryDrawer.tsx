import React, { useState } from "react";
import { 
  X, Shield, Clock, AlertTriangle, CheckCircle2, User, Mail, Phone, MapPin, 
  Calendar, ArrowRight, UserCheck, Eye, RefreshCw, Send, Check, AlertCircle,
  FileText, ExternalLink, ChevronRight, HelpCircle, Sparkles
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ParentContactHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parentContactId?: number;
  parentName?: string;
  onOpenStudentWorkspace?: (studentId: number) => void;
}

const CONCERN_REASONS = [
  "Email delivery failure",
  "Disconnected phone number",
  "Repeated unanswered outreach",
  "Unverified contact change",
  "Returned mail",
  "Other contact concern",
] as const;

export function ParentContactHistoryDrawer({
  isOpen,
  onClose,
  parentContactId,
  parentName,
  onOpenStudentWorkspace,
}: ParentContactHistoryDrawerProps) {
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
  const [isFlaggingConcern, setIsFlaggingConcern] = useState(false);
  const [concernReason, setConcernReason] = useState<string>(CONCERN_REASONS[0]);
  const [concernNotes, setConcernNotes] = useState("");
  const [concernFollowUpDate, setConcernFollowUpDate] = useState("");
  const [concernAssignedTo, setConcernAssignedTo] = useState("Lead Advocate");

  // Fetch Parent Profile & History via tRPC
  const { 
    data: profileData, 
    isLoading: isProfileLoading, 
    refetch: refetchProfile 
  } = trpc.parentProfile.getProfile.useQuery(
    { parentContactId },
    { enabled: isOpen && !!parentContactId }
  );

  const {
    data: history = [],
    isLoading: isHistoryLoading,
    refetch: refetchHistory
  } = trpc.parentProfile.getHistory.useQuery(
    { parentContactId: parentContactId ?? 0 },
    { enabled: isOpen && !!parentContactId }
  );

  const setConcernMutation = trpc.parentProfile.setContactConcern.useMutation({
    onSuccess: () => {
      toast.success("Contact concern flagged successfully");
      setIsFlaggingConcern(false);
      setConcernNotes("");
      refetchProfile();
    },
    onError: (err) => toast.error(err.message || "Failed to flag contact concern")
  });

  const resolveConcernMutation = trpc.parentProfile.resolveContactConcern.useMutation({
    onSuccess: () => {
      toast.success("Contact concern resolved");
      refetchProfile();
    },
    onError: (err) => toast.error(err.message || "Failed to resolve contact concern")
  });

  const verifyEmailMutation = trpc.parentProfile.verifyEmailChange.useMutation({
    onSuccess: () => {
      toast.success("Email change approved & verified");
      refetchProfile();
      refetchHistory();
    },
    onError: (err) => toast.error(err.message || "Verification failed")
  });

  const verifyPhoneMutation = trpc.parentProfile.verifyPhoneChange.useMutation({
    onSuccess: () => {
      toast.success("Phone change approved & verified");
      refetchProfile();
      refetchHistory();
    },
    onError: (err) => toast.error(err.message || "Verification failed")
  });

  if (!isOpen) return null;

  const profile = profileData;
  const linkedStudents = profileData?.students || [];
  const hasActiveConcern = profile?.contactConcernStatus === "active";
  const hasPendingEmail = !!profile?.pendingEmail;
  const hasPendingPhone = !!profile?.pendingPhone;

  const handleSaveConcern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentContactId) return;
    setConcernMutation.mutate({
      parentContactId,
      reason: concernReason,
      notes: concernNotes,
      followUpDate: concernFollowUpDate || undefined,
      assignedTo: concernAssignedTo
    });
  };

  const handleResolveConcern = () => {
    if (!parentContactId) return;
    resolveConcernMutation.mutate({ parentContactId });
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-[#000820] text-slate-100 h-full shadow-2xl border-l border-[#1A2C4E] flex flex-col z-10 transition-transform duration-250 ease-out">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#030E26] via-[#05163A] to-[#030E26] border-b border-[#1A2C4E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                  Parent Contact & History Console
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  STAFF AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {parentName || profile?.name || "Parent Account"} • ID #{parentContactId || profile?.id}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Contact Concern Warning Banner */}
          {hasActiveConcern && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Active Contact Concern</span>
                </div>
                <button
                  type="button"
                  onClick={handleResolveConcern}
                  disabled={resolveConcernMutation.isPending}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-md transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>
              </div>

              <div className="text-xs space-y-1 text-slate-300 bg-black/30 p-2.5 rounded-lg border border-white/5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reason:</span>
                  <span className="font-semibold text-amber-200">{profile?.contactConcernReason}</span>
                </div>
                {profile?.contactConcernFollowUpDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Follow-Up Date:</span>
                    <span className="font-semibold text-white">{profile.contactConcernFollowUpDate}</span>
                  </div>
                )}
                {profile?.contactConcernAssignedTo && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Advocate:</span>
                    <span className="font-semibold text-white">{profile.contactConcernAssignedTo}</span>
                  </div>
                )}
                {profile?.contactConcernNotes && (
                  <div className="pt-1 border-t border-white/5 text-[11px] text-slate-300">
                    <span className="text-slate-400 font-medium">Internal Notes: </span>
                    {profile.contactConcernNotes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Changes Action Callout */}
          {(hasPendingEmail || hasPendingPhone) && (
            <div className="rounded-xl border border-sky-500/40 bg-sky-950/20 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-sky-300">
                <Clock className="w-4 h-4 text-sky-400 animate-spin" style={{ animationDuration: "6s" }} />
                <span className="text-xs font-bold uppercase tracking-wider">Verification In Progress</span>
              </div>
              
              {hasPendingEmail && (
                <div className="flex items-center justify-between text-xs bg-black/30 p-2 rounded-lg border border-white/5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Requested Email:</span>
                    <span className="font-mono text-sky-200">{profile?.pendingEmail}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!parentContactId) return;
                      // Staff manual verification override
                      verifyEmailMutation.mutate({ 
                        parentContactId,
                        staffOverride: true,
                        staffName: "Waypoint Advocate"
                      });
                    }}
                    disabled={verifyEmailMutation.isPending}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 rounded-md transition-colors"
                  >
                    Staff Approve Email
                  </button>
                </div>
              )}

              {hasPendingPhone && (
                <div className="flex items-center justify-between text-xs bg-black/30 p-2 rounded-lg border border-white/5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Requested Mobile Phone:</span>
                    <span className="font-mono text-sky-200">{profile?.pendingPhone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!parentContactId) return;
                      // Staff manual verification override
                      verifyPhoneMutation.mutate({ 
                        parentContactId, 
                        staffOverride: true,
                        staffName: "Waypoint Advocate"
                      });
                    }}
                    disabled={verifyPhoneMutation.isPending}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 rounded-md transition-colors"
                  >
                    Staff Approve Phone
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Current Verified Information Card */}
          <div className="rounded-xl border border-[#1A2C4E] bg-[#051128]/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1A2C4E] pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Active Verified Profile Data
              </span>
              {!hasActiveConcern && !isFlaggingConcern && (
                <button
                  type="button"
                  onClick={() => setIsFlaggingConcern(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flag Contact Concern</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Full Legal Name:</span>
                <span className="font-medium text-white">{profile?.name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Preferred Name:</span>
                <span className="font-medium text-white">{profile?.preferredName || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Primary Verified Email:</span>
                <span className="font-mono text-emerald-300 truncate block">{profile?.email || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Primary Verified Phone:</span>
                <span className="font-mono text-emerald-300">{profile?.phone || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Alternate Phone:</span>
                <span className="text-slate-300">{profile?.altPhone || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Mailing Address:</span>
                <span className="text-slate-300 truncate block">{profile?.address || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Communication Preference:</span>
                <span className="text-slate-300">{profile?.preferredContactMethod || "Email"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Emergency Contact:</span>
                <span className="text-slate-300">
                  {profile?.emergencyContactName ? `${profile.emergencyContactName} (${profile.emergencyContactRelationship || "Contact"}) - ${profile.emergencyContactPhone || ""}` : "None Listed"}
                </span>
              </div>
            </div>

            {/* Linked Students List */}
            {linkedStudents.length > 0 && (
              <div className="pt-2 border-t border-[#1A2C4E]">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Associated Student Records ({linkedStudents.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {linkedStudents.map((st: any) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onOpenStudentWorkspace?.(st.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#0A1A3A] border border-[#1A2C4E] text-slate-200 hover:text-white hover:border-[#D4AF37]/50 transition-colors"
                    >
                      <User className="w-3 h-3 text-[#D4AF37]" />
                      <span>{st.name}</span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inline Flag Contact Concern Form */}
          {isFlaggingConcern && (
            <form onSubmit={handleSaveConcern} className="rounded-xl border border-amber-500/40 bg-[#0B152A] p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Flag New Contact Concern
                </span>
                <button
                  type="button"
                  onClick={() => setIsFlaggingConcern(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Concern Reason:</label>
                  <select
                    value={concernReason}
                    onChange={(e) => setConcernReason(e.target.value)}
                    className="w-full bg-[#050D1C] border border-[#1A2C4E] rounded-md px-2.5 py-1.5 text-white text-xs"
                  >
                    {CONCERN_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Follow-Up Date:</label>
                    <input
                      type="date"
                      value={concernFollowUpDate}
                      onChange={(e) => setConcernFollowUpDate(e.target.value)}
                      className="w-full bg-[#050D1C] border border-[#1A2C4E] rounded-md px-2 py-1 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Assigned Advocate:</label>
                    <input
                      type="text"
                      value={concernAssignedTo}
                      onChange={(e) => setConcernAssignedTo(e.target.value)}
                      className="w-full bg-[#050D1C] border border-[#1A2C4E] rounded-md px-2 py-1 text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Internal Notes & Context:</label>
                  <textarea
                    rows={2}
                    value={concernNotes}
                    onChange={(e) => setConcernNotes(e.target.value)}
                    placeholder="Provide context regarding failed outreach or bounce details..."
                    className="w-full bg-[#050D1C] border border-[#1A2C4E] rounded-md p-2 text-white text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsFlaggingConcern(false)}
                    className="px-3 py-1 text-xs border border-white/20 rounded-md text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={setConcernMutation.isPending}
                    className="px-3 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md transition-colors"
                  >
                    {setConcernMutation.isPending ? "Flagging..." : "Save Concern"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Append-Only Contact History Section */}
          <div className="rounded-xl border border-[#1A2C4E] bg-[#051128]/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1A2C4E] pb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Permanent Contact Change History
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {history.length} audit {history.length === 1 ? "record" : "records"}
              </span>
            </div>

            {isHistoryLoading ? (
              <div className="text-center py-6 text-xs text-slate-400">Loading audit history...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No profile modifications recorded yet. Historical changes will appear here in append-only chronological order.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item: any) => {
                  const dateStr = item.changedAt ? new Date(item.changedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                  }) : "Date Unknown";

                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedHistoryItem(item)}
                      className={cn(
                        "p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:border-[#D4AF37]/50",
                        selectedHistoryItem?.id === item.id 
                          ? "bg-[#0B1E40] border-[#D4AF37]" 
                          : "bg-[#030A1B] border-[#13233F]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{item.fieldModified}</span>
                          <span className={cn(
                            "px-1.5 py-0.2 rounded text-[9px] font-mono uppercase",
                            item.verificationStatus === "verified" ? "bg-emerald-500/20 text-emerald-300" :
                            item.verificationStatus === "pending" ? "bg-sky-500/20 text-sky-300" :
                            "bg-slate-700 text-slate-300"
                          )}>
                            {item.verificationStatus}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{dateStr}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <span className="text-rose-400/80 line-through truncate max-w-[140px] font-mono">
                          {item.previousValue || "(empty)"}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-emerald-300 truncate max-w-[150px] font-mono">
                          {item.newValue || "(empty)"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 mt-1 border-t border-white/5 text-[10px] text-slate-400">
                        <span>Changed by: <strong className="text-slate-300">{item.actorName || item.actorRole}</strong></span>
                        <span className="text-[9px] text-[#D4AF37]/80">Click for details →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Historical Item Detail View (Sub-Drawer / Bottom Card) */}
        {selectedHistoryItem && (
          <div className="border-t border-[#1A2C4E] bg-[#030B1C] p-4 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Audit Record #{selectedHistoryItem.id} Details
              </span>
              <button
                type="button"
                onClick={() => setSelectedHistoryItem(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close Details
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 p-2.5 rounded-lg border border-white/5">
              <div>
                <span className="text-slate-400 block text-[10px]">Field Modified:</span>
                <span className="font-semibold text-white">{selectedHistoryItem.fieldModified}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Timestamp:</span>
                <span className="text-slate-200 font-mono">
                  {new Date(selectedHistoryItem.changedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Previous Value:</span>
                <span className="font-mono text-rose-300 break-all">{selectedHistoryItem.previousValue || "(empty)"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">New Value:</span>
                <span className="font-mono text-emerald-300 break-all">{selectedHistoryItem.newValue || "(empty)"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Actor:</span>
                <span className="text-slate-200">{selectedHistoryItem.actorName} ({selectedHistoryItem.actorRole})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Source / Origin:</span>
                <span className="text-slate-200 capitalize">{selectedHistoryItem.source || "portal"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
