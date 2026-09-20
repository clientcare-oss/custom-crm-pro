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
    <aside className="w-48 sm:w-52 md:w-56 shrink-0 bg-gradient-to-b from-[#061833]/98 via-[#041228]/98 to-[#020b18]/98 border-l border-sky-500/25 flex flex-col justify-between overflow-y-auto relative text-slate-100 shadow-[inset_10px_0_20px_rgba(0,0,0,0.35)]">
      <div className="p-2.5 space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-sky-500/20">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 font-sans">
            Linked Context
          </h3>
          <button
            onClick={onCollapse}
            className="p-1 rounded-lg hover:bg-sky-500/20 text-sky-300 hover:text-white transition-colors cursor-pointer"
            title="Collapse Linked Context"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>

        {/* Linked Student Card (3D Elevated) */}
        <div
          onClick={() => student?.id && setLocation(`/contacts/${student.id}`)}
          className="group relative bg-gradient-to-b from-[#0c284f] to-[#061730] hover:from-[#0f3261] hover:to-[#081d3d] border-t border-t-sky-400/40 border border-sky-500/25 rounded-2xl p-3 shadow-[0_8px_20px_rgba(0,5,20,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200 cursor-pointer space-y-2 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/25 to-blue-600/35 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-inner">
                <GraduationCap className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                  {student.name}
                </h4>
                <p className="text-[10px] text-blue-200/70 font-medium">Student Profile</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="border-t border-sky-500/15 pt-2 text-[10px] text-blue-200/80 space-y-0.5 font-medium">
            <p>
              {student.grade} <span className="text-slate-500">|</span> {student.focus}
            </p>
            <p className="text-sky-400/90 font-mono text-[10px]">{student.caseNumber}</p>
          </div>
        </div>

        {/* Linked Task Card (3D Elevated) */}
        <div
          onClick={() => setLocation("/tasks")}
          className="group relative bg-gradient-to-b from-[#0c284f] to-[#061730] hover:from-[#0f3261] hover:to-[#081d3d] border-t border-t-sky-400/40 border border-sky-500/25 rounded-2xl p-3 shadow-[0_8px_20px_rgba(0,5,20,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200 cursor-pointer flex items-center justify-between hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/25 border border-blue-400/40 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
              <CheckCircle2 className="w-4 h-4" />
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
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
        </div>

        {/* Context Action Buttons (3D Styled) */}
        <div className="space-y-2 pt-1">
          {student?.id && (
            <Button
              onClick={() => setLocation(`/contacts/${student.id}`)}
              className="w-full h-9 rounded-xl bg-gradient-to-b from-[#0077FF] via-[#0062E3] to-[#004BB5] hover:from-[#0088FF] hover:to-[#0055CC] text-white text-xs font-bold shadow-[0_6px_18px_rgba(0,102,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] border-t border-t-sky-200/50 border border-sky-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-200" />
              Open Student Case
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onAddTask}
            className="w-full h-8.5 rounded-xl bg-gradient-to-b from-[#0e2c59] to-[#071933] hover:from-[#133973] hover:to-[#092244] text-sky-200 hover:text-white border-t border-t-sky-300/40 border border-sky-500/30 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            Add To-Do Task
          </Button>

          <Button
            variant="outline"
            onClick={onAttachDocument}
            className="w-full h-8.5 rounded-xl bg-gradient-to-b from-[#0e2c59] to-[#071933] hover:from-[#133973] hover:to-[#092244] text-sky-200 hover:text-white border-t border-t-sky-300/40 border border-sky-500/30 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all"
          >
            <Paperclip className="w-3.5 h-3.5 text-sky-400" />
            Attach Document
          </Button>
        </div>

        {/* Conversation Details Section (3D Card) */}
        <div className="pt-3 border-t border-sky-500/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-sky-300 uppercase tracking-wider font-mono">
              Thread Details
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">SECURE</span>
          </div>

          <div className="space-y-2 text-xs bg-[#020b18]/70 border border-sky-500/20 rounded-xl p-2.5 shadow-inner">
            {/* Members */}
            <div className="flex items-center justify-between">
              <span className="text-blue-200/70 text-[11px]">Members</span>
              <div className="flex items-center -space-x-1.5">
                {members.map((m: any, idx: number) => (
                  <Avatar
                    key={m.id || idx}
                    className="w-6 h-6 border-2 border-[#041228] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xs"
                    title={m.name}
                  >
                    <AvatarFallback className="text-[9px] font-bold bg-transparent">
                      {m.initials || m.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>

            {/* Created */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-200/70">Created</span>
              <span className="font-semibold text-white">{createdDate}</span>
            </div>

            {/* Last message */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-200/70">Last active</span>
              <span className="font-semibold text-white">{lastMessageTime}</span>
            </div>

            {/* Messages count */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-200/70">Messages</span>
              <span className="font-semibold text-white">{messageCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Nautical Wave Ribbon Footer */}
      <div className="p-3 border-t border-sky-500/20 bg-[#020b18]/90 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-sky-400/90 font-mono">
          <WaypointWaveIcon className="w-5 h-2 text-sky-400" />
          <span>Crew Quarters</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">FERPA Encrypted</span>
      </div>
    </aside>
  );
}
