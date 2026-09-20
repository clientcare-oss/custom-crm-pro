import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  GraduationCap,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  Paperclip,
  ChevronRight,
  Info,
  Calendar,
  Clock,
  MessageSquare,
  Users,
  PanelRightClose,
  FolderOpen,
} from "lucide-react";
import { WaypointWaveIcon } from "@/components/portal/WaypointWavyBackdrop";

interface LinkedContextColumnProps {
  linkedContext: any;
  activeConversation: any;
  onCollapse: () => void;
  onAddTask?: () => void;
  onAttachDocument?: () => void;
}

export default function LinkedContextColumn({
  linkedContext,
  activeConversation,
  onCollapse,
  onAddTask,
  onAttachDocument,
}: LinkedContextColumnProps) {
  const [, setLocation] = useLocation();

  const student = linkedContext?.linkedStudent || {
    id: 1,
    name: activeConversation?.displayName || "Pierre",
    grade: "12th Grade",
    focus: "College Planning",
    caseNumber: "Case #WA-0287",
  };

  const task = linkedContext?.linkedTask || {
    title: "Review signed agreement",
    dueDate: "Due Today",
  };

  const members = linkedContext?.members || [
    { id: 1, name: "Emily", role: "Paperwork & Administration", initials: "ED" },
    { id: 2, name: "Byron", role: "Master Coach", initials: "BH" },
  ];

  const createdDate = linkedContext?.createdAt
    ? new Date(linkedContext.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Mar 12, 2024";

  const lastMessageTime = linkedContext?.lastMessageTime
    ? new Date(linkedContext.lastMessageTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "10:20 AM";

  const messageCount = linkedContext?.messageCount || 24;

  return (
    <aside className="w-80 shrink-0 bg-[#07162B] border-l border-sky-500/20 flex flex-col justify-between overflow-y-auto relative text-slate-100">
      <div className="p-4 space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            Linked Context
          </h3>
          <button
            onClick={onCollapse}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Collapse Linked Context"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>

        {/* Linked Student Card */}
        <div
          onClick={() => student?.id && setLocation(`/contacts/${student.id}`)}
          className="group relative bg-[#001433]/85 hover:bg-[#001A41] border border-sky-500/25 hover:border-sky-400/50 rounded-2xl p-3.5 shadow-lg transition-all duration-200 cursor-pointer space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/30 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-inner">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                  {student.name}
                </h4>
                <p className="text-[11px] text-blue-200/70 font-medium">Student</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="border-t border-sky-500/10 pt-2 text-[11px] text-blue-200/80 space-y-0.5 font-medium">
            <p>
              {student.grade} <span className="text-slate-500">|</span> {student.focus}
            </p>
            <p className="text-sky-400/90 font-mono text-[10px]">{student.caseNumber}</p>
          </div>
        </div>

        {/* Linked Task Card */}
        <div
          onClick={() => setLocation("/tasks")}
          className="group relative bg-[#001433]/85 hover:bg-[#001A41] border border-sky-500/25 hover:border-sky-400/50 rounded-2xl p-3.5 shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h5 className="text-xs font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                {task.title}
              </h5>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                {task.dueDate}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </div>

        {/* Context Action Buttons */}
        <div className="space-y-2 pt-1">
          {student?.id && (
            <Button
              onClick={() => setLocation(`/contacts/${student.id}`)}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-[#0062E3] to-[#004BB5] hover:from-[#0070F3] hover:to-[#0055CC] text-white text-xs font-bold shadow-lg shadow-blue-900/40 border border-sky-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <ExternalLink className="w-4 h-4 text-sky-200" />
              Open Workspace
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onAddTask}
            className="w-full h-9 rounded-xl bg-[#001433]/70 hover:bg-[#001E4D] text-slate-200 hover:text-white border-sky-500/25 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            Add Task
          </Button>

          <Button
            variant="outline"
            onClick={onAttachDocument}
            className="w-full h-9 rounded-xl bg-[#001433]/70 hover:bg-[#001E4D] text-slate-200 hover:text-white border-sky-500/25 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <Paperclip className="w-3.5 h-3.5 text-sky-400" />
            Attach Document
          </Button>
        </div>

        {/* Conversation Details Section */}
        <div className="pt-3 border-t border-sky-500/15 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider">
              Conversation Details
            </h4>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Members */}
            <div className="flex items-center justify-between">
              <span className="text-blue-200/70">Members</span>
              <div className="flex items-center -space-x-2">
                {members.map((m: any, idx: number) => (
                  <Avatar
                    key={m.id || idx}
                    className="w-7 h-7 border-2 border-[#07162B] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm"
                    title={m.name}
                  >
                    <AvatarFallback className="text-[10px] font-bold bg-transparent">
                      {m.initials || m.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>

            {/* Created */}
            <div className="flex items-center justify-between">
              <span className="text-blue-200/70">Created</span>
              <span className="font-semibold text-white">{createdDate}</span>
            </div>

            {/* Last message */}
            <div className="flex items-center justify-between">
              <span className="text-blue-200/70">Last message</span>
              <span className="font-semibold text-white">{lastMessageTime}</span>
            </div>

            {/* Messages count */}
            <div className="flex items-center justify-between">
              <span className="text-blue-200/70">Messages</span>
              <span className="font-semibold text-white">{messageCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Nautical Wave Ribbon Footer */}
      <div className="p-4 border-t border-sky-500/15 bg-[#001026]/70 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-sky-400/80 font-mono">
          <WaypointWaveIcon className="w-5 h-2 text-sky-400" />
          <span>Crew Quarters Security</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">FERPA Protected</span>
      </div>
    </aside>
  );
}
