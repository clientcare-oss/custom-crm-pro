import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import PageIdBadge from "@/components/PageIdBadge";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  Check,
  Trash2,
  Clock,
  Link2,
  Loader2,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import VoiceInput from "@/components/VoiceInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Team Management Modular Components
import {
  EmployeeRecord,
  RoleId,
} from "@/components/team/teamTypes";
import {
  getStoredEmployees,
  saveEmployee,
  addEmployee,
  deactivateEmployee,
  reactivateEmployee,
  calculateWorkforceTotals,
  calculateRoleCounts,
  calculateAttentionItems,
} from "@/components/team/teamStore";
import TeamOverviewHeader from "@/components/team/TeamOverviewHeader";
import EmployeeDirectoryTable from "@/components/team/EmployeeDirectoryTable";
import EmployeeManagementWorkspace from "@/components/team/EmployeeManagementWorkspace";
import AddEmployeeModal from "@/components/team/AddEmployeeModal";
import DeactivateEmployeeModal from "@/components/team/DeactivateEmployeeModal";

interface TimeOffRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  returnDate?: string;
  days: number;
  status: "Pending" | "Approved" | "Denied";
  notes?: string;
  createdAt?: string;
}

const DEFAULT_TIME_OFF: TimeOffRequest[] = [
  {
    id: "to-1",
    type: "Vacation",
    startDate: "Oct 10, 2026",
    endDate: "Oct 12, 2026",
    returnDate: "Oct 13, 2026",
    days: 3,
    status: "Approved",
    notes: "Fall family trip",
    createdAt: "2026-09-01",
  },
  {
    id: "to-2",
    type: "Personal",
    startDate: "Nov 26, 2026",
    endDate: "Nov 28, 2026",
    returnDate: "Nov 30, 2026",
    days: 3,
    status: "Approved",
    notes: "Thanksgiving holiday",
    createdAt: "2026-09-05",
  },
  {
    id: "to-3",
    type: "Training / Conference",
    startDate: "Dec 22, 2026",
    endDate: "Dec 23, 2026",
    returnDate: "Dec 24, 2026",
    days: 2,
    status: "Pending",
    notes: "IEP Leadership Institute",
    createdAt: "2026-09-15",
  },
];

export default function TeamPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  // Backend invites / members queries
  const { data: members = [] } = trpc.team.listMembers.useQuery();
  const { data: invites = [], isLoading: invitesLoading } = trpc.team.listInvites.useQuery();

  // Employee Directory state (connected to Crew Quarters shared storage)
  const [employees, setEmployees] = useState<EmployeeRecord[]>(getStoredEmployees);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<EmployeeRecord | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleId | "all">("all");

  // Sync listener across tabs and windows
  useEffect(() => {
    const handleUpdate = () => {
      const latest = getStoredEmployees();
      setEmployees(latest);
      if (selectedEmployee) {
        const found = latest.find((e) => e.id === selectedEmployee.id);
        if (found) setSelectedEmployee(found);
      }
    };
    window.addEventListener("waypoint_team_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("waypoint_team_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [selectedEmployee]);

  // Time off state synced with Crew Quarters
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(() => {
    try {
      const saved = localStorage.getItem("waypoint_time_off_requests");
      return saved ? JSON.parse(saved) : DEFAULT_TIME_OFF;
    } catch {
      return DEFAULT_TIME_OFF;
    }
  });

  const handleApproveTimeOff = (id: string, note?: string) => {
    const updated = timeOffRequests.map((req) =>
      req.id === id ? { ...req, status: "Approved" as const, adminNote: note } : req
    );
    setTimeOffRequests(updated);
    try {
      localStorage.setItem("waypoint_time_off_requests", JSON.stringify(updated));
    } catch {}
    toast.success("Time off approved and coverage synchronized!");
  };

  const handleDenyTimeOff = (id: string, note?: string) => {
    const updated = timeOffRequests.map((req) =>
      req.id === id ? { ...req, status: "Denied" as const, adminNote: note } : req
    );
    setTimeOffRequests(updated);
    try {
      localStorage.setItem("waypoint_time_off_requests", JSON.stringify(updated));
    } catch {}
    toast.info("Time off request denied");
  };

  // Workforce totals & role counts (dynamic from actual employee records)
  const totals = calculateWorkforceTotals(employees);
  const roleCounts = calculateRoleCounts(employees);
  const pendingLeaves = timeOffRequests.filter((r) => r.status === "Pending");
  const attentionItems = calculateAttentionItems(employees, pendingLeaves.length);

  // Invite modal state (for sending backend invite links)
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteMutation = trpc.team.invite.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}/team/join?token=${data.token}`;
      setGeneratedLink(link);
      utils.team.listInvites.invalidate();
      if (data.alreadyExists) {
        toast.info("A pending invite already exists for this email — link shown below.");
      } else {
        toast.success("Invite created! Copy the link and share it.");
      }
    },
    onError: (e) => toast.error("Failed to create invite: " + e.message),
  });

  const revokeInviteMutation = trpc.team.revokeInvite.useMutation({
    onSuccess: () => {
      toast.success("Invite revoked");
      utils.team.listInvites.invalidate();
    },
    onError: (e) => toast.error("Failed to revoke: " + e.message),
  });

  const handleOpenEmployee = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveEmployee = (updated: EmployeeRecord) => {
    saveEmployee(updated);
    const refreshed = getStoredEmployees();
    setEmployees(refreshed);
    setSelectedEmployee(updated);
  };

  const handleAddEmployee = (newEmp: Omit<EmployeeRecord, "id"> & { id?: string }) => {
    const created = addEmployee(newEmp);
    const refreshed = getStoredEmployees();
    setEmployees(refreshed);
    setSelectedEmployee(created);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeactivateClick = (emp: EmployeeRecord) => {
    setDeactivatingEmployee(emp);
    setDeactivateModalOpen(true);
  };

  const handleConfirmDeactivate = (id: string, notes: string) => {
    deactivateEmployee(id, notes);
    const refreshed = getStoredEmployees();
    setEmployees(refreshed);
    if (selectedEmployee?.id === id) {
      const updated = refreshed.find((e) => e.id === id);
      if (updated) setSelectedEmployee(updated);
    }
  };

  const handleReactivateClick = (emp: EmployeeRecord) => {
    reactivateEmployee(emp.id);
    const refreshed = getStoredEmployees();
    setEmployees(refreshed);
    if (selectedEmployee?.id === emp.id) {
      const updated = refreshed.find((e) => e.id === emp.id);
      if (updated) setSelectedEmployee(updated);
    }
    toast.success(`${emp.name} restored to Active status!`);
  };

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {selectedEmployee ? (
          <EmployeeManagementWorkspace
            employee={selectedEmployee}
            allEmployees={employees}
            onBackToDirectory={() => setSelectedEmployee(null)}
            onSelectEmployee={(emp) => {
              setSelectedEmployee(emp);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSaveEmployee={handleSaveEmployee}
            timeOffRequests={timeOffRequests}
            onApproveTimeOff={handleApproveTimeOff}
            onDenyTimeOff={handleDenyTimeOff}
            onDeactivateClick={handleDeactivateClick}
            onReactivateClick={handleReactivateClick}
          />
        ) : (
          <>
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                    <Users className="h-7 w-7 text-sky-400" />
                    Team &amp; Staff Management
                  </h1>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                    PG-019
                  </span>
                  <PageIdBadge id="PG-019" name="Team & Staff Management" />
                </div>
                <p className="text-xs sm:text-sm text-blue-200/70 mt-1">
                  Centralized practice administration for Waypoint Advocates. Administer workforce records, roles, PTO approvals, equipment, payroll, and module permissions.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => setInviteOpen(true)}
                  variant="outline"
                  className="border-blue-700/60 text-blue-200 hover:text-white hover:bg-blue-900/40 text-xs rounded-xl h-9 px-3 gap-1.5 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Invite Link</span>
                </Button>

                <Button
                  onClick={() => setAddModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-9 px-4 gap-1.5 cursor-pointer shadow-md"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>+ Add Employee</span>
                </Button>
              </div>
            </div>

            {/* ── Workforce Totals, Role Distribution & Relocated Management Deck ── */}
            <TeamOverviewHeader
              totals={totals}
              roleCounts={roleCounts}
              attentionItems={attentionItems}
              timeOffRequests={timeOffRequests}
              onApproveTimeOff={handleApproveTimeOff}
              onAddEmployee={() => setAddModalOpen(true)}
              onSelectEmployeeById={(id) => {
                const found = employees.find((e) => e.id === id);
                if (found) handleOpenEmployee(found);
              }}
              activeRoleFilter={roleFilter}
              onRoleFilterSelect={(r) => setRoleFilter(r)}
            />

            {/* ── Primary Workforce Directory ── */}
            <EmployeeDirectoryTable
              employees={employees}
              onSelectEmployee={handleOpenEmployee}
              onAddEmployee={() => setAddModalOpen(true)}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              onDeactivateClick={handleDeactivateClick}
              onReactivateClick={handleReactivateClick}
            />

            {/* ── Pending Invite Tokens Section (Preserved Backend Integration) ── */}
            {(invitesLoading || pendingInvites.length > 0) && (
              <div className="rounded-2xl border border-blue-900/40 bg-[#000d2b]/60 p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending Crew Registration Invites ({pendingInvites.length})
                </p>
                {invitesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading invites…
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-xl border border-amber-400/30 bg-[#000820] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{inv.name ?? inv.email}</p>
                            <p className="text-[11px] text-slate-400 truncate">{inv.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = `${window.location.origin}/team/join?token=${inv.token}`;
                              navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied!"));
                            }}
                            className="h-7 px-2 text-xs text-sky-400 hover:text-white rounded-lg cursor-pointer"
                          >
                            <Link2 className="h-3.5 w-3.5 mr-1" />
                            <span>Copy Link</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => revokeInviteMutation.mutate({ id: inv.id })}
                            className="h-7 w-7 text-slate-500 hover:text-red-400 rounded-lg cursor-pointer"
                            title="Revoke Invite"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 7-Step Add Employee Wizard Modal ── */}
      <AddEmployeeModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddEmployee={handleAddEmployee}
      />

      {/* ── Deactivate Employee Offboarding Checklist Modal ── */}
      <DeactivateEmployeeModal
        employee={deactivatingEmployee}
        open={deactivateModalOpen}
        onClose={() => {
          setDeactivateModalOpen(false);
          setDeactivatingEmployee(null);
        }}
        onConfirmDeactivate={handleConfirmDeactivate}
      />

      {/* ── Backend Fast Invite Dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md bg-[#000821] border border-blue-800 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-400" />
              <span>Create Crew Registration Invite</span>
            </DialogTitle>
          </DialogHeader>

          {!generatedLink ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-xs text-white">Email Address *</Label>
                <VoiceInput
                  id="invite-email"
                  type="email"
                  placeholder="colleague@waypointadvocates.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-name" className="text-xs text-white">Full Name (optional)</Label>
                <VoiceInput
                  id="invite-name"
                  placeholder="Jane Smith"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/60 p-4 text-center space-y-1">
                <Check className="h-6 w-6 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-white">Invite link generated!</p>
                <p className="text-xs text-slate-300">
                  Share this registration link with <strong>{inviteEmail}</strong>.
                </p>
              </div>
              <VoiceInput
                readOnly
                value={generatedLink}
                className="text-xs font-mono bg-[#000d2b] border-blue-900/60 text-white h-9 rounded-xl"
              />
            </div>
          )}

          <DialogFooter>
            {!generatedLink ? (
              <Button
                onClick={() => {
                  if (!inviteEmail.trim()) return;
                  inviteMutation.mutate({
                    email: inviteEmail.trim(),
                    name: inviteName.trim() || undefined,
                    role: inviteRole,
                  });
                }}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl"
              >
                {inviteMutation.isPending ? "Generating…" : "Generate Invite Token"}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setInviteOpen(false);
                  setGeneratedLink(null);
                  setInviteEmail("");
                  setInviteName("");
                }}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl"
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
