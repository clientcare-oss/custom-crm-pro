import React, { useState } from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck,
  GraduationCap,
  Calendar,
  FolderOpen,
  Compass,
  MessageSquare,
  FileText,
  PhoneCall,
  CheckSquare,
  ExternalLink,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { RequestCallbackModal } from "./RequestCallbackModal";
import { trpc } from "@/lib/trpc";

interface ExistingClientFlowProps {
  onRequestCallback?: () => void;
}

export function ExistingClientFlow({ onRequestCallback }: ExistingClientFlowProps = {}) {
  const { call } = useActiveCall();
  const [showCallbackModal, setShowCallbackModal] = useState(false);

  // Queries for real appointments & tasks
  const { data: appointments = [] } = trpc.appointments.list.useQuery();
  const { data: tasks = [] } = trpc.tasks.getAll.useQuery();

  const clientName = call.contactName || call.callerInfo.name || "Client";
  const studentName = call.studentName || "Student on file";
  const contactId = call.contactId || 1;

  // Upcoming meetings for this student
  const nextMeeting = appointments.find((a: any) =>
    a.title?.toLowerCase().includes(studentName.toLowerCase()) ||
    a.description?.toLowerCase().includes(clientName.toLowerCase())
  );

  return (
    <div className="p-5 rounded-2xl bg-[#082245] border border-sky-500/30 space-y-5 animate-in fade-in">
      {/* Header telemetry row */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-sky-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-white tracking-tight">
                {clientName}
              </h4>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                Retainer Client
              </Badge>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-amber-300 font-medium">
                <GraduationCap className="h-3.5 w-3.5" />
                Student: {studentName}
              </span>
              <span>•</span>
              <span className="text-slate-400">Assigned Advocate: Byron Honea</span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => {
            window.location.href = `/contacts/${contactId}`;
          }}
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-3.5 rounded-xl gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Full Student Workspace
        </Button>
      </div>

      {/* Case Quick Telemetry 3-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Next Meeting */}
        <div className="p-3.5 rounded-xl bg-[#040D1A] border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
            Upcoming Meeting
          </div>
          <div className="text-sm font-bold text-white">
            {nextMeeting?.title || "Annual IEP Review"}
          </div>
          <div className="text-[11px] text-slate-300 font-mono">
            {nextMeeting?.date ? new Date(nextMeeting.date).toLocaleDateString() : "Next 14 Days"}
          </div>
        </div>

        {/* Case Status */}
        <div className="p-3.5 rounded-xl bg-[#040D1A] border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            IEP Case Status
          </div>
          <div className="text-sm font-bold text-emerald-400">
            Active Review
          </div>
          <div className="text-[11px] text-slate-400">
            Psych evaluation analyzed • Awaiting draft IEP
          </div>
        </div>

        {/* Open Tasks */}
        <div className="p-3.5 rounded-xl bg-[#040D1A] border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <CheckSquare className="h-3.5 w-3.5 text-amber-400" />
            Open Action Items
          </div>
          <div className="text-sm font-bold text-white">
            2 Pending Tasks
          </div>
          <div className="text-[11px] text-amber-300/90">
            • Review OT observation data
          </div>
        </div>
      </div>

      {/* Direct Smart Navigation Actions */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Direct Client & Student Navigation (Active call continues in background)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = `/contacts/${contactId}?tab=vault`;
            }}
            className="border-sky-500/30 text-sky-200 hover:bg-sky-500/10 h-8 rounded-xl justify-start gap-2"
          >
            <FolderOpen className="h-3.5 w-3.5 text-sky-400" />
            Document Vault
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = `/contacts/${contactId}?tab=blueprint`;
            }}
            className="border-sky-500/30 text-sky-200 hover:bg-sky-500/10 h-8 rounded-xl justify-start gap-2"
          >
            <FileText className="h-3.5 w-3.5 text-cyan-400" />
            IEP Blueprint
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = `/case-compass`;
            }}
            className="border-sky-500/30 text-sky-200 hover:bg-sky-500/10 h-8 rounded-xl justify-start gap-2"
          >
            <Compass className="h-3.5 w-3.5 text-indigo-400" />
            Case Compass
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = `/scheduler`;
            }}
            className="border-sky-500/30 text-sky-200 hover:bg-sky-500/10 h-8 rounded-xl justify-start gap-2"
          >
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            Schedule Session
          </Button>
        </div>
      </div>

      {/* Triage & Callback Trigger */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <Button
          size="sm"
          onClick={() => (onRequestCallback ? onRequestCallback() : setShowCallbackModal(true))}
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
        >
          <PhoneCall className="h-4 w-4" />
          Request Advocate Callback
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = `/tasks`;
            }}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <CheckSquare className="h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Callback Modal */}
      <RequestCallbackModal
        open={showCallbackModal}
        onOpenChange={setShowCallbackModal}
        defaultClientName={clientName}
        defaultStudentName={studentName}
        defaultPhone={call.callerInfo.phone || ""}
      />
    </div>
  );
}

export default ExistingClientFlow;
