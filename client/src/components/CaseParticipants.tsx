import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus, X, Shield, User, Loader2, Phone, Mail, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

function getInitials(name?: string | null, email?: string | null) {
  const src = name?.trim() ?? email?.trim() ?? "?";
  const parts = src.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : src.slice(0, 2).toUpperCase();
}

interface CaseParticipantsProps {
  contactId: number;
  contactName?: string | null;
  /** If this contact is a student, pass their parentContactId so the parent is shown */
  parentContactId?: number | null;
}

export function CaseParticipants({ contactId, contactName, parentContactId }: CaseParticipantsProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [parentPopoverOpen, setParentPopoverOpen] = useState(false);

  const { data: assignments = [], isLoading: assignmentsLoading } =
    trpc.team.listCaseAssignments.useQuery({ contactId }, { enabled: !!contactId });

  const { data: allMembers = [] } = trpc.team.listMembers.useQuery();

  // Fetch the parent contact if this is a student
  const { data: parentContact } = trpc.contacts.get.useQuery(
    { id: parentContactId! },
    { enabled: !!parentContactId }
  );

  const assignMutation = trpc.team.assignToCase.useMutation({
    onSuccess: (data) => {
      if (data.alreadyAssigned) {
        toast.info("Already assigned to this case");
      } else {
        toast.success("Team member added to case");
      }
      utils.team.listCaseAssignments.invalidate({ contactId });
    },
    onError: (e) => toast.error("Failed to assign: " + e.message),
  });

  const removeMutation = trpc.team.removeFromCase.useMutation({
    onSuccess: () => {
      utils.team.listCaseAssignments.invalidate({ contactId });
    },
    onError: (e) => toast.error("Failed to remove: " + e.message),
  });

  // Members not yet assigned to this case
  const assignedIds = new Set(assignments.map((a) => a.teamInviteId));
  const availableMembers = allMembers.filter((m) => !assignedIds.has(m.inviteId));

  const parentName = parentContact
    ? `${parentContact.firstName} ${parentContact.lastName}`
    : null;

  // Count: owner + parent (if student) + team members
  const extraCount = (parentContactId ? 1 : 0) + assignments.length;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Label */}
      <span className="text-xs text-muted-foreground mr-1 whitespace-nowrap">
        Visible to you{extraCount > 0 ? ` + ${extraCount} participant${extraCount > 1 ? "s" : ""}` : ""}
      </span>

      {/* Owner chip — always first */}
      <div className="relative group" title={`${user?.name ?? "You"} (Owner / Advocate)`}>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold ring-2 ring-background cursor-default">
          {getInitials(user?.name, user?.email)}
        </div>
      </div>

      {/* Parent contact chip — shown when this is a student contact */}
      {parentContactId && (
        <Popover open={parentPopoverOpen} onOpenChange={setParentPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-full pl-0.5 pr-3 py-0.5 h-8 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
              title={parentName ? `${parentName} (Parent / Guardian)` : "Loading parent…"}
            >
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                {parentContact ? getInitials(parentName) : "…"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground leading-none truncate max-w-[100px]">
                  {parentName ?? "Loading…"}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-none mt-0.5 font-medium">PARENT</p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                {parentContact ? getInitials(parentName) : "…"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{parentName ?? "Loading…"}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Parent / Guardian</p>
              </div>
            </div>

            {parentContact && (
              <div className="space-y-1.5">
                {parentContact.phone && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${parentContact.phone}`}
                      className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/60 hover:bg-muted transition-colors text-sm text-foreground"
                      onClick={() => setParentPopoverOpen(false)}
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{parentContact.phone}</span>
                    </a>
                    <a
                      href={`sms:${parentContact.phone}`}
                      className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/60 hover:bg-muted transition-colors"
                      title="Send text message"
                      onClick={() => setParentPopoverOpen(false)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    </a>
                  </div>
                )}
                {parentContact.email && (
                  <a
                    href={`mailto:${parentContact.email}`}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/60 hover:bg-muted transition-colors text-sm text-foreground w-full"
                    onClick={() => setParentPopoverOpen(false)}
                  >
                    <Mail className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                    <span className="truncate">{parentContact.email}</span>
                  </a>
                )}
                {!parentContact.phone && !parentContact.email && (
                  <p className="text-xs text-muted-foreground px-1">No contact info on file.</p>
                )}
                <div className="pt-1 border-t border-border/50 mt-1">
                  <a
                    href={`/contacts/${parentContactId}`}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors text-xs text-muted-foreground"
                    onClick={() => setParentPopoverOpen(false)}
                  >
                    <User className="h-3 w-3" />
                    View full contact
                  </a>
                </div>
              </div>
            )}

            {!parentContact && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      {/* Assigned team member chips */}
      {assignmentsLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        assignments.map((a) => (
          <div
            key={a.assignmentId}
            className="flex items-center gap-1.5 bg-muted/60 rounded-full pl-0.5 pr-1.5 py-0.5 h-8 group"
            title={`${a.memberName ?? a.memberEmail} (Team Member)`}
          >
            <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 flex-shrink-0">
              {getInitials(a.memberName, a.memberEmail)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-none truncate max-w-[80px]">
                {a.memberName ?? a.memberEmail}
              </p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5 flex items-center gap-0.5">
                {a.memberRole === "admin" ? (
                  <Shield className="h-2.5 w-2.5 text-amber-500" />
                ) : (
                  <User className="h-2.5 w-2.5 text-blue-400" />
                )}
                TEAM MEMBER
              </p>
            </div>
            {/* Remove button (visible on hover) */}
            <button
              onClick={() => removeMutation.mutate({ contactId, teamInviteId: a.teamInviteId })}
              disabled={removeMutation.isPending}
              className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              title="Remove from case"
            >
              {removeMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </button>
          </div>
        ))
      )}

      {/* Add team member button */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            title="Add team member to case"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 py-1 mb-1">
            Add to case
          </p>
          {availableMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-2">
              {allMembers.length === 0
                ? "No team members yet. Go to Team to invite someone."
                : "All team members are already on this case."}
            </p>
          ) : (
            <div className="space-y-0.5">
              {availableMembers.map((m) => (
                <button
                  key={m.inviteId}
                  onClick={() => {
                    assignMutation.mutate({ contactId, teamInviteId: m.inviteId });
                    setPopoverOpen(false);
                  }}
                  disabled={assignMutation.isPending}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 flex-shrink-0">
                    {getInitials(m.userName ?? m.name, m.userEmail ?? m.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.userName ?? m.name ?? m.userEmail ?? m.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {m.role === "admin" ? (
                        <Shield className="h-2.5 w-2.5 text-amber-500" />
                      ) : (
                        <User className="h-2.5 w-2.5 text-blue-400" />
                      )}
                      {m.role === "admin" ? "Admin" : "Member"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
