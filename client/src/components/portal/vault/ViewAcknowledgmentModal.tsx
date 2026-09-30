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
import { ShieldCheck, Calendar, FileText } from "lucide-react";

interface ViewAcknowledgmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata?: {
    version?: string;
    exactText?: string;
    acceptedAt?: string | Date;
    relationshipStatus?: string;
  } | null;
}

export function ViewAcknowledgmentModal({
  open,
  onOpenChange,
  metadata,
}: ViewAcknowledgmentModalProps) {
  const defaultText =
    "I understand that I am choosing to upload documents before entering into a service agreement with Waypoint Advocates. Uploading documents does not establish an advocacy relationship or mean these documents have been reviewed.";

  const acceptedDate = metadata?.acceptedAt
    ? new Date(metadata.acceptedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      })
    : "Accepted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#06172F] border-blue-900/50 text-white rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,8,33,0.9)]">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-400/15 text-emerald-300 border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider">
              Audited Record
            </Badge>
            <span className="text-xs text-blue-200/60 font-medium">
              Version {metadata?.version || "v1.0"}
            </span>
          </div>

          <DialogTitle className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Pre-Enrollment Upload Acknowledgment
          </DialogTitle>
          <DialogDescription className="text-xs text-blue-100/70">
            This acknowledgment was confirmed prior to your first document upload.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-900/50 text-xs sm:text-sm text-blue-100/90 leading-relaxed italic">
            &ldquo;{metadata?.exactText || defaultText}&rdquo;
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40">
              <span className="text-[10px] text-blue-300/70 block uppercase font-semibold">
                Relationship Status
              </span>
              <span className="font-bold text-amber-300 mt-0.5 block">
                {metadata?.relationshipStatus || "Pre-Enrollment"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40">
              <span className="text-[10px] text-blue-300/70 block uppercase font-semibold">
                Recorded At
              </span>
              <span className="font-bold text-white mt-0.5 block truncate">
                {acceptedDate}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-white/10">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl px-5 h-10 cursor-pointer ml-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
