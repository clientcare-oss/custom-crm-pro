import { useState } from "react";
import {
  Phone,
  MessageSquare,
  MoreHorizontal,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SmsComposerDialog from "./SmsComposerDialog";

interface ClientCallControlsProps {
  contactId: number;
  contactName: string;
  phone?: string | null;
  quoSyncStatus?: string | null;
  quoLastSyncAt?: string | Date | null;
  quoSyncError?: string | null;
  isAdminOrStaff?: boolean;
  size?: "default" | "sm";
  className?: string;
}

export default function ClientCallControls({
  contactId,
  contactName,
  phone,
  quoSyncStatus,
  quoLastSyncAt,
  quoSyncError,
  isAdminOrStaff = true,
  size = "sm",
  className = "",
}: ClientCallControlsProps) {
  const [copied, setCopied] = useState(false);
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: syncDetails } = trpc.quo.getContactSyncDetails.useQuery(
    { contactId },
    { enabled: Boolean(contactId) && isAdminOrStaff }
  );

  const effectiveSyncStatus = syncDetails?.syncStatus ?? quoSyncStatus;
  const effectiveLastSyncAt = syncDetails?.lastSyncedAt ?? quoLastSyncAt;
  const effectiveSyncError = syncDetails?.lastError ?? quoSyncError;

  const cleanPhone = phone?.replace(/\D/g, "") || "";
  const telLink = cleanPhone.length >= 10 ? `tel:+1${cleanPhone.slice(-10)}` : "";

  // Handlers
  const copyNumber = () => {
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
    navigator.clipboard.writeText(phone);
    setCopied(true);
    toast.success("Phone number copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const callWithQuo = () => {
    if (!telLink) {
      toast.error("Valid 10-digit telephone number required");
      return;
    }
    // Standard OS/Device calling handler protocol
    window.location.href = telLink;
    toast.success(`Handoff to calling app: ${phone}`);
  };

  const sendCallToPhoneMutation = trpc.quo.sendCallToPhone.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Call handoff push notification sent to your registered device");
    },
    onError: (err) => {
      toast.error(`Push handoff failed: ${err.message}`);
    },
  });

  const syncContactMutation = trpc.quo.syncContact.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        utils.contacts.list.invalidate();
        utils.quo.getContactSyncDetails.invalidate({ contactId });
        utils.quo.getContactSyncConfig.invalidate();
      } else {
        toast.error(data.message || "Sync failed");
      }
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });

  const restoreContactMutation = trpc.quo.restoreContactToQuo.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || `${contactName} restored to Quo`);
        utils.contacts.list.invalidate();
        utils.quo.getContactSyncDetails.invalidate({ contactId });
        utils.quo.getContactSyncConfig.invalidate();
      } else {
        toast.error(data.message || "Failed to restore contact to Quo");
      }
    },
    onError: (err) => {
      toast.error(`Restore failed: ${err.message}`);
    },
  });

  const resolveConflictMutation = trpc.quo.resolveContactConflict.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Quo sync conflict resolved");
        utils.contacts.list.invalidate();
        utils.quo.getContactSyncDetails.invalidate({ contactId });
        utils.quo.getContactSyncConfig.invalidate();
      } else {
        toast.error(data.message || "Failed to resolve conflict");
      }
    },
    onError: (err) => {
      toast.error(`Conflict resolution failed: ${err.message}`);
    },
  });

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* ── CALL DROPDOWN ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size={size}
            variant="outline"
            disabled={!phone}
            className="h-8 px-2.5 gap-1.5 border-cyan-800/70 text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="font-semibold text-xs">CALL</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-[#06172F] border-border/80 text-foreground">
          <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Calling Options
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={callWithQuo}
            className="cursor-pointer gap-2 py-2 text-xs hover:bg-cyan-950/50 hover:text-cyan-300"
          >
            <Phone className="h-4 w-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="font-medium">Call with Quo</span>
              <span className="text-[10px] text-muted-foreground">Launches device handler ({phone})</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => sendCallToPhoneMutation.mutate({ contactId })}
            disabled={sendCallToPhoneMutation.isPending}
            className="cursor-pointer gap-2 py-2 text-xs hover:bg-cyan-950/50 hover:text-cyan-300"
          >
            <Smartphone className="h-4 w-4 text-emerald-400" />
            <div className="flex flex-col">
              <span className="font-medium">Send Call to My Phone</span>
              <span className="text-[10px] text-muted-foreground">Push notification to registered mobile</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border/60" />

          <DropdownMenuItem
            onClick={copyNumber}
            className="cursor-pointer gap-2 py-1.5 text-xs hover:bg-muted"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            <span>{copied ? "Copied!" : "Copy Number"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── TEXT BUTTON ── */}
      <Button
        size={size}
        variant="outline"
        disabled={!phone}
        onClick={() => setIsSmsOpen(true)}
        className="h-8 px-2.5 gap-1.5 border-border/80 text-foreground hover:bg-muted hover:text-cyan-300 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
        <span className="font-semibold text-xs">TEXT</span>
      </Button>

      {/* ── MORE ACTIONS / SYNC ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size={size}
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-[#06172F] border-border/80 text-foreground">
          {effectiveSyncStatus === "removed_from_quo" ? (
            <DropdownMenuItem
              onClick={() => restoreContactMutation.mutate({ contactId })}
              disabled={restoreContactMutation.isPending}
              className="cursor-pointer gap-2 text-xs py-2 text-amber-300 hover:bg-amber-950/40"
            >
              <RotateCcw className={`h-3.5 w-3.5 text-amber-400 ${restoreContactMutation.isPending ? "animate-spin" : ""}`} />
              <span>Restore to Quo</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => syncContactMutation.mutate({ contactId })}
              disabled={syncContactMutation.isPending}
              className="cursor-pointer gap-2 text-xs py-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${syncContactMutation.isPending ? "animate-spin" : ""}`} />
              <span>Sync with Quo</span>
            </DropdownMenuItem>
          )}
          {effectiveSyncStatus === "conflict" && (
            <>
              <DropdownMenuSeparator className="bg-border/60" />
              <DropdownMenuLabel className="text-[10px] text-amber-300 uppercase tracking-wider">
                Resolve Quo Sync Conflict
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => resolveConflictMutation.mutate({ contactId, resolution: "keep_waypoint" })}
                disabled={resolveConflictMutation.isPending}
                className="cursor-pointer gap-2 text-xs py-1.5"
              >
                <span>Keep Waypoint Version</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => resolveConflictMutation.mutate({ contactId, resolution: "accept_quo" })}
                disabled={resolveConflictMutation.isPending}
                className="cursor-pointer gap-2 text-xs py-1.5"
              >
                <span>Accept Quo Version</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => resolveConflictMutation.mutate({ contactId, resolution: "merge" })}
                disabled={resolveConflictMutation.isPending}
                className="cursor-pointer gap-2 text-xs py-1.5"
              >
                <span>Merge Both Versions</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/60" />
            </>
          )}
          <DropdownMenuItem onClick={copyNumber} className="cursor-pointer gap-2 text-xs py-2">
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Copy Phone Number</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── SUBTLE ADMIN-VISIBLE SYNC INDICATOR ── */}
      {isAdminOrStaff && effectiveSyncStatus && effectiveSyncStatus !== "not_synced" && (
        <div className="ml-1 inline-flex items-center gap-1">
          {effectiveSyncStatus === "synced" && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 gap-1 bg-emerald-950/20 text-emerald-400 border-emerald-800/50 font-normal"
              title={effectiveLastSyncAt ? `Last synced: ${new Date(effectiveLastSyncAt).toLocaleString()}` : "Synced with Quo"}
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Synced with Quo ✓</span>
            </Badge>
          )}

          {effectiveSyncStatus === "pending" && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 gap-1 bg-amber-950/20 text-amber-400 border-amber-800/50 font-normal"
            >
              <Clock className="h-3 w-3" />
              <span>Pending</span>
            </Badge>
          )}

          {effectiveSyncStatus === "removed_from_quo" && (
            <div className="inline-flex items-center gap-1">
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 gap-1 bg-slate-900/60 text-slate-300 border-slate-700/70 font-normal"
                title="This contact was deleted in Quo. Waypoint preserved the contact and paused automatic recreation."
              >
                <span>Removed from Quo</span>
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={restoreContactMutation.isPending}
                onClick={() => restoreContactMutation.mutate({ contactId })}
                className="h-5 px-1.5 text-[10px] text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 gap-1"
                title="Re-create and re-link this contact in Quo"
              >
                <RotateCcw className={`h-2.5 w-2.5 ${restoreContactMutation.isPending ? "animate-spin" : ""}`} />
                <span>Restore to Quo</span>
              </Button>
            </div>
          )}

          {effectiveSyncStatus === "conflict" && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 gap-1 bg-amber-950/30 text-amber-300 border-amber-700/60 font-normal cursor-pointer"
              title={effectiveSyncError || "Conflicting edits detected between Waypoint and Quo"}
              onClick={() => resolveConflictMutation.mutate({ contactId, resolution: "merge" })}
            >
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span>Quo Conflict (Click to Merge)</span>
            </Badge>
          )}

          {effectiveSyncStatus === "failed" && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 gap-1 bg-rose-950/20 text-rose-400 border-rose-800/50 font-normal cursor-pointer"
              title={effectiveSyncError || "Quo sync failed"}
              onClick={() => toast.error(`Quo Sync Error: ${effectiveSyncError || "Unknown error"}`)}
            >
              <AlertCircle className="h-3 w-3" />
              <span>Sync Failed</span>
            </Badge>
          )}
        </div>
      )}

      {/* ── SMS COMPOSER MODAL ── */}
      <SmsComposerDialog
        open={isSmsOpen}
        onOpenChange={setIsSmsOpen}
        contactId={contactId}
        contactName={contactName}
        clientPhone={phone || ""}
      />
    </div>
  );
}
