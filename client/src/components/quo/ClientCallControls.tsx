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
      } else {
        toast.error(data.message || "Sync failed");
      }
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
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
        <DropdownMenuContent align="end" className="w-48 bg-[#06172F] border-border/80 text-foreground">
          <DropdownMenuItem
            onClick={() => syncContactMutation.mutate({ contactId })}
            disabled={syncContactMutation.isPending}
            className="cursor-pointer gap-2 text-xs py-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${syncContactMutation.isPending ? "animate-spin" : ""}`} />
            <span>Sync with Quo</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyNumber} className="cursor-pointer gap-2 text-xs py-2">
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Copy Phone Number</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── SUBTLE ADMIN-VISIBLE SYNC INDICATOR ── */}
      {isAdminOrStaff && quoSyncStatus && quoSyncStatus !== "not_synced" && (
        <div className="ml-1 inline-flex items-center">
          {quoSyncStatus === "synced" && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 gap-1 bg-emerald-950/20 text-emerald-400 border-emerald-800/50 font-normal"
              title={quoLastSyncAt ? `Last synced: ${new Date(quoLastSyncAt).toLocaleString()}` : "Synced with Quo"}
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Synced with Quo ✓</span>
            </Badge>
          )}

          {quoSyncStatus === "pending" && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 gap-1 bg-amber-950/20 text-amber-400 border-amber-800/50 font-normal"
            >
              <Clock className="h-3 w-3" />
              <span>Pending</span>
            </Badge>
          )}

          {quoSyncStatus === "failed" && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 gap-1 bg-rose-950/20 text-rose-400 border-rose-800/50 font-normal cursor-pointer"
              title={quoSyncError || "Quo sync failed"}
              onClick={() => toast.error(`Quo Sync Error: ${quoSyncError || "Unknown error"}`)}
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
