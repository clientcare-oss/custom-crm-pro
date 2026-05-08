import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  Check,
  Trash2,
  Shield,
  User,
  Clock,
  Link2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name?: string | null, email?: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return (email ?? "?").slice(0, 2).toUpperCase();
}

function AvatarChip({
  name,
  email,
  color = "bg-muted",
}: {
  name?: string | null;
  email?: string | null;
  color?: string;
}) {
  return (
    <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-foreground ${color} flex-shrink-0`}
      title={name ?? email ?? undefined}
    >
      {getInitials(name, email ?? undefined)}
    </div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: members = [], isLoading: membersLoading } = trpc.team.listMembers.useQuery();
  const { data: invites = [], isLoading: invitesLoading } = trpc.team.listInvites.useQuery();

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

  const removeMemberMutation = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.team.listMembers.invalidate();
    },
    onError: (e) => toast.error("Failed to remove: " + e.message),
  });

  const updateRoleMutation = trpc.team.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      utils.team.listMembers.invalidate();
    },
    onError: (e) => toast.error("Failed to update role: " + e.message),
  });

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), name: inviteName.trim() || undefined, role: inviteRole });
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCloseInvite = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInviteRole("member");
    setGeneratedLink(null);
    setCopied(false);
  };

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Team
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Invite staff members to help manage clients. Admins have full access; Members can view and edit clients.
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>

        {/* You (owner) */}
        <Card className="p-4 rounded-xl border border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Owner</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
              {getInitials(user?.name ?? undefined, user?.email ?? undefined)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{user?.name ?? "You"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-xs">Owner</Badge>
          </div>
        </Card>

        {/* Active Members */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Active Members {members.length > 0 && `(${members.length})`}
          </p>
          {membersLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
            </div>
          ) : members.length === 0 ? (
            <Card className="p-6 rounded-xl border border-dashed border-border text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No team members yet. Invite someone to get started.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <Card key={m.inviteId} className="p-4 rounded-xl border border-border flex items-center gap-3">
                  <AvatarChip
                    name={m.userName ?? m.name}
                    email={m.userEmail ?? m.email}
                    color="bg-violet-100 dark:bg-violet-900/40"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">
                      {m.userName ?? m.name ?? m.userEmail ?? m.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.userEmail ?? m.email}</p>
                    {m.acceptedAt && (
                      <p className="text-xs text-muted-foreground/60">
                        Joined {new Date(m.acceptedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {/* Role selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs h-7 px-2">
                        {m.role === "admin" ? (
                          <Shield className="h-3 w-3 text-amber-500" />
                        ) : (
                          <User className="h-3 w-3 text-blue-500" />
                        )}
                        {m.role === "admin" ? "Admin" : "Member"}
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => updateRoleMutation.mutate({ inviteId: m.inviteId, role: "admin" })}
                        className="flex items-center gap-2"
                      >
                        <Shield className="h-3.5 w-3.5 text-amber-500" />
                        Admin — full access
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateRoleMutation.mutate({ inviteId: m.inviteId, role: "member" })}
                        className="flex items-center gap-2"
                      >
                        <User className="h-3.5 w-3.5 text-blue-500" />
                        Member — view/edit clients
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMemberMutation.mutate({ inviteId: m.inviteId })}
                    disabled={removeMemberMutation.isPending}
                    title="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invites */}
        {(invitesLoading || pendingInvites.length > 0) && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Pending Invites {pendingInvites.length > 0 && `(${pendingInvites.length})`}
            </p>
            {invitesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-2">
                {pendingInvites.map((inv) => (
                  <Card key={inv.id} className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/15 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{inv.name ?? inv.email}</p>
                      {inv.name && <p className="text-xs text-muted-foreground truncate">{inv.email}</p>}
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground/60">
                          Sent {new Date(inv.createdAt).toLocaleDateString()}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                          {inv.role}
                        </Badge>
                      </div>
                    </div>
                    {/* Copy link */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const link = `${window.location.origin}/team/join?token=${inv.token}`;
                        navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied!"));
                      }}
                      title="Copy invite link"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => revokeInviteMutation.mutate({ id: inv.id })}
                      disabled={revokeInviteMutation.isPending}
                      title="Revoke invite"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) handleCloseInvite(); else setInviteOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite Team Member
            </DialogTitle>
          </DialogHeader>

          {!generatedLink ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email address *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Name (optional)</Label>
                <Input
                  id="invite-name"
                  placeholder="Jane Smith"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-blue-500" />
                        <span>Member</span>
                        <span className="text-xs text-muted-foreground">— view/edit clients</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-amber-500" />
                        <span>Admin</span>
                        <span className="text-xs text-muted-foreground">— full access</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
                <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Invite link ready!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this link with <strong>{inviteEmail}</strong>. They'll need to log in with Manus to accept.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={generatedLink}
                  className="text-xs font-mono bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {!generatedLink ? (
              <>
                <Button variant="ghost" onClick={handleCloseInvite}>Cancel</Button>
                <Button
                  onClick={handleSendInvite}
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {inviteMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                  ) : (
                    <><Link2 className="h-4 w-4" /> Generate Invite Link</>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleCloseInvite}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
