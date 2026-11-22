import React, { useState } from "react";
import {
  Plus,
  Link2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface LinkedContextColumnProps {
  linkedContext: any;
  activeConversation: any;
  onCollapse: () => void;
  onAddTask?: () => void;
  onAttachDocument?: () => void;
}

function BrassRivet() {
  return (
    <span
      aria-hidden="true"
      className="w-2.5 h-2.5 rounded-full shrink-0 inline-block bg-[radial-gradient(circle_at_35%_35%,#FFF5CC_0%,#D4AF61_50%,#6B4E1B_90%,#2A1D06_100%)] border border-[#FFE5A3]/60 shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
    />
  );
}

export default function LinkedContextColumn({
  linkedContext,
  onAddTask,
  onAttachDocument,
}: LinkedContextColumnProps) {
  const [nextActionCompleted, setNextActionCompleted] = useState(false);

  const taskTitle =
    linkedContext?.linkedTask?.title || "Review intake checklist";
  const taskSubtitle = linkedContext?.linkedTask?.dueDate
    ? `Sarah Mitchell · ${linkedContext.linkedTask.dueDate}`
    : "Sarah Mitchell · Today";

  return (
    <aside className="w-full h-full rounded-xl border-[1.5px] border-[#C9A65E] bg-gradient-to-b from-[#091326] via-[#050C1B] to-[#030712] shadow-[0_14px_34px_rgba(0,0,0,0.88),inset_0_1px_1px_rgba(255,227,148,0.25)] flex flex-col justify-between overflow-hidden relative text-[#FFF4D4]">
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0">
        {/* ── Header Plaque with Left & Right Brass Rivets ── */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#C5A059]/35">
          <BrassRivet />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#E2C583]">
            CONVERSATION DETAILS
          </span>
          <BrassRivet />
        </div>

        {/* ── 1. SHARED FILES + PHOTOREALISTIC 3D LAYERED METAL FILE POCKET RACK ── */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-white tracking-wide">
            Shared files
          </h4>

          <button
            type="button"
            onClick={() =>
              toast.success("Opening Intake Checklist.pdf preview...")
            }
            title="Open Intake Checklist.pdf"
            className="w-full rounded-xl overflow-hidden border border-[#8E733E]/50 shadow-[0_8px_20px_rgba(0,0,0,0.75)] hover:brightness-110 transition-all cursor-pointer block"
          >
            <img
              src="/images/crew-messages/shared-files-rack.png"
              alt="Shared files rack — Intake Checklist.pdf"
              className="w-full h-auto object-cover block select-none pointer-events-none"
            />
          </button>
        </div>

        {/* ── 2. NEXT ACTION SECTION ── */}
        <div className="space-y-2 pt-0.5">
          <h4 className="text-sm font-bold text-white tracking-wide">
            Next action
          </h4>

          <div
            onClick={() => {
              setNextActionCompleted((prev) => {
                const next = !prev;
                toast.success(
                  next
                    ? `Completed: "${taskTitle}"`
                    : `Reopened: "${taskTitle}"`
                );
                return next;
              });
            }}
            className="rounded-xl bg-[#07132B] hover:bg-[#0C1D3E] border border-[#A88644]/85 p-3 flex items-start gap-3 shadow-[0_6px_18px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)] transition-all cursor-pointer"
          >
            <button
              type="button"
              aria-label="Toggle next action complete"
              className={`mt-0.5 w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                nextActionCompleted
                  ? "bg-[#C5A059] border-[#FFE394] text-[#07162B]"
                  : "bg-[#040A18] border-[#94A3B8] hover:border-[#FFE394]"
              }`}
            >
              {nextActionCompleted && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            <div className="min-w-0">
              <div
                className={`text-xs sm:text-[13px] font-bold text-white leading-snug ${
                  nextActionCompleted ? "line-through opacity-65" : ""
                }`}
              >
                {taskTitle}
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-0.5">
                {taskSubtitle}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Brushed-Steel Footer with Dual Brushed-Brass Action Plaque (+ Create task | 🔗 Link record) ── */}
      <div
        style={{
          background:
            "linear-gradient(180deg, #212B42 0%, #151C2D 50%, #0E1320 100%)",
        }}
        className="px-3 py-2.5 border-t-[1.5px] border-[#C5A059]/80 shrink-0"
      >
        <div
          style={{
            background:
              "linear-gradient(180deg, #F2D99B 0%, #CEA85D 48%, #98732F 100%)",
          }}
          className="grid grid-cols-2 h-9 rounded-lg border border-[#FFF4CE]/85 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.78)] overflow-hidden text-[#171003] font-bold text-xs"
        >
          {/* Left Half: + Create task */}
          <button
            type="button"
            onClick={onAddTask}
            className="h-full px-2 flex items-center justify-center gap-1.5 border-r border-[#6E521F]/70 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer min-w-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span className="truncate">Create task</span>
          </button>

          {/* Right Half: 🔗 Link record */}
          <button
            type="button"
            onClick={onAttachDocument}
            className="h-full px-2 flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer min-w-0"
          >
            <Link2 className="w-3.5 h-3.5 stroke-[2.3] shrink-0" />
            <span className="truncate">Link record</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
