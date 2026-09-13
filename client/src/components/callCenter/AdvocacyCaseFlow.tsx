import React, { useState } from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Compass,
  AlertTriangle,
  FileText,
  Calendar,
  FolderOpen,
  PhoneCall,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { RequestCallbackModal } from "./RequestCallbackModal";
import { toast } from "sonner";

interface AdvocacyCaseFlowProps {
  onRequestCallback?: () => void;
}

export function AdvocacyCaseFlow({ onRequestCallback }: AdvocacyCaseFlowProps = {}) {
  const { call, updateCall } = useActiveCall();
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [whatNeeded, setWhatNeeded] = useState(call.advocacyNeeds?.whatNeeded || "");
  const [handledBy, setHandledBy] = useState<
    "staff" | "advocate" | "callback" | "appointment" | "urgent"
  >(call.advocacyNeeds?.handledBy || "advocate");
  const [isUrgent, setIsUrgent] = useState(call.advocacyNeeds?.isUrgent || false);

  const studentName = call.studentName || "Student on file";
  const contactId = call.contactId || 1;

  const handleUpdateNeeds = (text: string) => {
    setWhatNeeded(text);
    updateCall({
      advocacyNeeds: {
        whatNeeded: text,
        handledBy,
        isUrgent,
      },
    });
  };

  const handleSetHandledBy = (type: any) => {
    setHandledBy(type);
    updateCall({
      advocacyNeeds: {
        whatNeeded,
        handledBy: type,
        isUrgent,
      },
    });
  };

  const handleToggleUrgent = () => {
    const nextUrgent = !isUrgent;
    setIsUrgent(nextUrgent);
    updateCall({
      advocacyNeeds: {
        whatNeeded,
        handledBy,
        isUrgent: nextUrgent,
      },
    });
    if (nextUrgent) {
      toast.warning("Flagged as URGENT case issue");
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-[#091b36] border border-indigo-500/30 space-y-5 animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-indigo-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-white tracking-tight">
                Advocacy & Case Triage
              </h4>
              {isUrgent && (
                <Badge className="bg-rose-600 text-white font-black text-[10px] animate-pulse">
                  URGENT CASE
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Assessing special education accommodations, meeting disputes, or legal procedural compliance for{" "}
              <strong className="text-amber-300">{studentName}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleUrgent}
            className={`text-xs h-8 px-3 rounded-xl gap-1.5 font-bold ${
              isUrgent
                ? "bg-rose-600 text-white border-rose-500"
                : "border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {isUrgent ? "Urgent Flag Active" : "Flag as Urgent"}
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCallbackModal(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-3.5 rounded-xl gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Request Advocate Callback
          </Button>
        </div>
      </div>

      {/* Direct Smart Links Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            window.location.href = `/contacts/${contactId}`;
          }}
          className="border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/10 h-7 rounded-lg gap-1.5 shrink-0"
        >
          <ExternalLink className="h-3 w-3" />
          Student Workspace
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            window.location.href = `/case-compass`;
          }}
          className="border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/10 h-7 rounded-lg gap-1.5 shrink-0"
        >
          <Compass className="h-3 w-3" />
          Case Compass
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            window.location.href = `/contacts/${contactId}?tab=vault`;
          }}
          className="border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/10 h-7 rounded-lg gap-1.5 shrink-0"
        >
          <FolderOpen className="h-3 w-3" />
          Document Vault
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            window.location.href = `/scheduler`;
          }}
          className="border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/10 h-7 rounded-lg gap-1.5 shrink-0"
        >
          <Calendar className="h-3 w-3" />
          Upcoming Appointments
        </Button>
      </div>

      {/* Core Question: What does the client need? */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4" />
          What does the client need? *
        </Label>
        <Textarea
          value={whatNeeded}
          onChange={(e) => handleUpdateNeeds(e.target.value)}
          placeholder="Document the exact dispute, proposed school action, denied service, or reason for advocacy assistance..."
          rows={4}
          className="bg-[#040D1A] border-slate-700 text-white text-xs rounded-xl focus:border-amber-400 leading-relaxed"
        />
      </div>

      {/* Triage Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-sky-300">
          Triage Determination (Who or what handles this?)
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {[
            { id: "staff", label: "Can staff handle?", desc: "Routine document or info request" },
            { id: "advocate", label: "Advocate review needed", desc: "Complex IEP data or draft analysis" },
            { id: "callback", label: "Callback needed", desc: "Parent requested phone consultation" },
            { id: "appointment", label: "Schedule appointment", desc: "Meeting prep session required" },
            { id: "urgent", label: "Urgent issue", desc: "Expulsion, MDR, or hearing in <48h" },
          ].map((item) => {
            const isSelected = handledBy === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSetHandledBy(item.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                    : "bg-[#040D1A] border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>{item.label}</span>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prominent Action Bar */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <Button
          size="sm"
          onClick={() => (onRequestCallback ? onRequestCallback() : setShowCallbackModal(true))}
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
        >
          <PhoneCall className="h-4 w-4" />
          Request Advocate Callback
        </Button>
      </div>

      {/* Callback Modal */}
      <RequestCallbackModal
        open={showCallbackModal}
        onOpenChange={setShowCallbackModal}
        defaultClientName={call.callerInfo.name || call.contactName || ""}
        defaultStudentName={studentName}
        defaultPhone={call.callerInfo.phone || ""}
      />
    </div>
  );
}

export default AdvocacyCaseFlow;
