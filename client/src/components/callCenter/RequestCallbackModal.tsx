import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, AlertTriangle, Clock, User, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useActiveCall } from "@/contexts/ActiveCallContext";

interface RequestCallbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhone?: string;
  defaultClientName?: string;
  defaultStudentName?: string;
}

export function RequestCallbackModal({
  open,
  onOpenChange,
  defaultPhone = "",
  defaultClientName = "",
  defaultStudentName = "",
}: RequestCallbackModalProps) {
  const { call, updateCall } = useActiveCall();
  const [selectedAdvocate, setSelectedAdvocate] = useState("Byron Honea (Master IEP Coach)");
  const [priority, setPriority] = useState<"Normal" | "Important" | "Urgent">("Important");
  const [reason, setReason] = useState("");
  const [bestPhone, setBestPhone] = useState(defaultPhone || call.callerInfo.phone || "");
  const [preferredTime, setPreferredTime] = useState("As soon as possible");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: team = [] } = trpc.team.listMembers.useQuery();

  const handleSaveCallback = async () => {
    if (!reason.trim()) {
      toast.error("Please provide the reason for this callback request");
      return;
    }

    setIsSubmitting(true);
    try {
      // Store on active call state
      updateCall({
        callbackRequest: {
          advocateName: selectedAdvocate,
          priority,
          reason,
          notes,
          bestPhone: bestPhone || "Phone on file",
          preferredTime,
        },
      });

      toast.success(`Advocate callback alert generated for ${selectedAdvocate}`, {
        description: `Priority: ${priority} • Preferred time: ${preferredTime}`,
      });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule callback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#061830] border border-sky-500/30 text-white p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <PhoneCall className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Request Advocate Callback
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Generate an alert ticket for Byron Honea or assigned advocate with client callback details.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {/* Client & Student Summary Header */}
          <div className="p-3 rounded-xl bg-[#040D1A] border border-slate-800 flex items-center justify-between text-slate-300">
            <div>
              <span className="text-slate-400">Client: </span>
              <strong className="text-white">{defaultClientName || call.callerInfo.name || "Caller"}</strong>
              {defaultStudentName && (
                <span className="text-amber-300 font-medium ml-2">
                  (Student: {defaultStudentName})
                </span>
              )}
            </div>
            <Badge variant="outline" className="border-sky-500/30 text-sky-300 text-[10px]">
              CRM Linked
            </Badge>
          </div>

          {/* Advocate Selection */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 font-medium">Assign Advocate</Label>
            <select
              value={selectedAdvocate}
              onChange={(e) => setSelectedAdvocate(e.target.value)}
              className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none"
            >
              <option value="Byron Honea (Master IEP Coach)">Byron Honea (Master IEP Coach®)</option>
              {team.map((member: any) => (
                <option key={member.id} value={`${member.name} (${member.role || "Advocate"})`}>
                  {member.name} — {member.role || "Advocate"}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Level */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 font-medium">Callback Priority</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["Normal", "Important", "Urgent"] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? p === "Urgent"
                          ? "bg-rose-600 text-white border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.35)]"
                          : p === "Important"
                          ? "bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                          : "bg-sky-500 text-slate-950 border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.25)]"
                        : "bg-[#040D1A] border-slate-700 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {p === "Urgent" && "🚨 "}
                    {p}
                    <div className="text-[9px] font-normal opacity-80 mt-0.5">
                      {p === "Normal" ? "Within 24h" : p === "Important" ? "Same day" : "Immediate"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 font-medium">Reason for Callback *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. IEP eligibility dispute, upcoming MDR meeting, review PWN draft..."
              className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-amber-400"
            />
          </div>

          {/* Contact Phone & Preferred Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300 font-medium">Best Callback Number</Label>
              <Input
                value={bestPhone}
                onChange={(e) => setBestPhone(e.target.value)}
                placeholder="(770) 555-0199"
                className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 font-medium">Preferred Time Window</Label>
              <Input
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                placeholder="e.g. After 2:00 PM today"
                className="bg-[#040D1A] border-slate-700 text-white text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 font-medium">Detailed Case Context for Advocate</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide background, school personnel involved, or documents the parent mentioned..."
              rows={3}
              className="bg-[#040D1A] border-slate-700 text-white text-xs rounded-xl focus:border-amber-400"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveCallback}
            disabled={isSubmitting}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-5 rounded-xl gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
          >
            <PhoneCall className="h-4 w-4" />
            Schedule Callback Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RequestCallbackModal;
