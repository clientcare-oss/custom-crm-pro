import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, ExternalLink, Smartphone, ShieldCheck, Headset, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface OpenQuoPhoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPhone?: string | null;
  targetName?: string | null;
}

export function OpenQuoPhoneModal({
  open,
  onOpenChange,
  targetPhone,
  targetName,
}: OpenQuoPhoneModalProps) {
  const [copied, setCopied] = React.useState(false);
  const { data: settings } = trpc.quo.getSettings.useQuery(undefined, { enabled: open });

  const primaryNumber = settings?.primaryPhoneNumber || "+1 (770) 555-0199";
  const primaryName = settings?.primaryPhoneDisplayName || "Waypoint Advocates Primary Line";

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    toast.success("Phone number copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCallInQuo = () => {
    if (targetPhone) {
      const clean = targetPhone.replace(/\D/g, "");
      // OpenPhone/Quo native protocol or tel
      window.location.href = `openphone://call?number=${clean}`;
      setTimeout(() => {
        // Fallback to web or tel
        toast.info("Opening Quo call session...");
      }, 500);
    } else {
      window.open("https://my.openphone.com", "_blank");
    }
    onOpenChange(false);
  };

  const handleOpenWeb = () => {
    window.open("https://my.openphone.com", "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#061830] border border-sky-500/30 text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Headset className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                {targetPhone ? "Call via Quo" : "Open Quo Phone System"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Waypoint Advocates VoIP & Telephony System
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {targetPhone && (
            <div className="p-3.5 rounded-xl bg-[#092244] border border-sky-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs text-sky-300 font-medium">Destination Client</div>
                <div className="text-sm font-semibold text-white">{targetName || "Selected Contact"}</div>
                <div className="text-xs font-mono text-slate-300">{targetPhone}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(targetPhone)}
                className="text-slate-400 hover:text-white"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-[#040D1A]/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Outbound Caller ID</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Line
              </Badge>
            </div>
            <div className="text-sm font-mono text-white font-semibold">{primaryNumber}</div>
            <div className="text-xs text-slate-400">{primaryName}</div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed">
            Calls are placed through your local Quo desktop app or web dialer. Call logs, recordings, and AI transcripts automatically sync back to this Call Center workstation upon completion.
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleOpenWeb}
            className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 gap-1.5 w-full sm:w-auto"
          >
            <ExternalLink className="h-4 w-4" />
            Open Web App
          </Button>
          <Button
            onClick={handleCallInQuo}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold gap-1.5 w-full sm:w-auto flex-1"
          >
            <Phone className="h-4 w-4 fill-current" />
            {targetPhone ? "Place Call in Quo" : "Open Quo Dial Pad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OpenQuoPhoneModal;
