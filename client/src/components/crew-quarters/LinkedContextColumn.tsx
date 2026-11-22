import React, { useState } from "react";
import {
  FileText,
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
      className="w-2.5 h-2.5 rounded-full shrink-0 inline-block bg-[radial-gradient(circle_at_35%_35%,#FFF5CC_0%,#D4AF61_50%,#6B4E1B_90%,#2A1D06_100%)] border border-[#FFE5A3]/55 shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
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
    <aside className="w-[265px] sm:w-[280px] xl:w-[295px] shrink-0 rounded-xl border-[1.5px] border-[#C5A059]/85 bg-gradient-to-b from-[#0A1428] via-[#060D1D] to-[#040814] shadow-[0_14px_34px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,227,148,0.2)] flex flex-col justify-between h-full overflow-hidden relative text-[#FFF4D4]">
      <div className="flex-1 overflow-y-auto p-3.5 space-y-5 min-h-0">
        {/* ── Header Plaque with Left & Right Brass Rivets ── */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#C5A059]/35">
          <BrassRivet />
          <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#DFC17B]">
            CONVERSATION DETAILS
          </span>
          <BrassRivet />
        </div>

        {/* ── 1. SHARED FILES + 3D LAYERED METAL FILE POCKET RACK ── */}
        <div className="space-y-2.5">
          <h4 className="text-sm font-bold text-white tracking-wide">
            Shared files
          </h4>

          {/* 3D Brushed-Metal & Brass Layered Wall File Holder */}
          <div
            style={{
              background:
                "linear-gradient(180deg, #1B2336 0%, #101624 100%)",
            }}
            className="rounded-xl p-2 border border-[#7C8BA6]/35 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_6px_16px_rgba(0,0,0,0.65)] space-y-0"
          >
            {/* Top Pocket Slot Containing the "Intake Checklist.pdf" Folder Tab Card */}
            <div className="relative pt-1 px-1">
              <div
                onClick={() =>
                  toast.success("Opening Intake Checklist.pdf preview...")
                }
                style={{
                  background:
                    "linear-gradient(180deg, #16294D 0%, #0C1830 100%)",
                  clipPath:
                    "polygon(0 0, calc(100% - 18px) 0, 100% 16px, 100% 100%, 0 100%)",
                }}
                className="w-full h-12 px-3.5 rounded-t-lg border-t-[1.5px] border-x-[1.5px] border-[#D5B56E] flex items-center gap-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.7)] hover:brightness-115 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#A5CEFF] shrink-0" />
                <span className="text-xs font-semibold text-white truncate">
                  Intake Checklist.pdf
                </span>
              </div>
            </div>

            {/* Pocket Slot 1 Metallic Front Plate */}
            <div
              style={{
                background:
                  "linear-gradient(180deg, #2B3346 0%, #171D2B 55%, #0E121C 100%)",
              }}
              className="h-7 w-full border-t-[1.5px] border-x border-[#C5A059]/85 shadow-[0_-3px_8px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.2)]"
            />

            {/* Pocket Slot 2 Metallic Front Plate */}
            <div
              style={{
                background:
                  "linear-gradient(180deg, #272F42 0%, #151B28 55%, #0C1018 100%)",
              }}
              className="h-7 w-full border-t-[1.5px] border-x border-[#C5A059]/85 shadow-[0_-3px_8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.18)]"
            />

            {/* Pocket Slot 3 Metallic Bottom Lip */}
            <div
              style={{
                background:
                  "linear-gradient(180deg, #232A3C 0%, #111622 65%, #090C14 100%)",
              }}
              className="h-6 w-full rounded-b-lg border-[1.5px] border-[#C5A059]/90 shadow-[0_-3px_8px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.16)]"
            />
          </div>
        </div>

        {/* ── 2. NEXT ACTION SECTION ── */}
        <div className="space-y-2.5 pt-1">
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
            className="rounded-xl bg-[#08142C] hover:bg-[#0C1D3E] border border-[#C5A059]/75 p-3.5 flex items-start gap-3 shadow-[0_6px_18px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)] transition-all cursor-pointer"
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
            "linear-gradient(180deg, #1C263B 0%, #111829 50%, #0C111E 100%)",
        }}
        className="p-2.5 border-t-[1.5px] border-[#C5A059]/75 shrink-0"
      >
        <div
          style={{
            background:
              "linear-gradient(180deg, #F0D696 0%, #CEA95E 48%, #9B7732 100%)",
          }}
          className="grid grid-cols-2 h-10 rounded-lg border border-[#FFF3C8]/85 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.75)] overflow-hidden text-[#171003] font-bold text-xs"
        >
          {/* Left Half: + Create task */}
          <button
            type="button"
            onClick={onAddTask}
            className="h-full px-2.5 flex items-center justify-between border-r border-[#6E521F]/65 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#5E4414] shrink-0" />
            <span className="inline-flex items-center gap-1 truncate">
              <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span className="truncate">Create task</span>
            </span>
            <span className="w-1" />
          </button>

          {/* Right Half: 🔗 Link record */}
          <button
            type="button"
            onClick={onAttachDocument}
            className="h-full px-2.5 flex items-center justify-between hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span className="w-1" />
            <span className="inline-flex items-center gap-1 truncate">
              <Link2 className="w-3.5 h-3.5 stroke-[2.3] shrink-0" />
              <span className="truncate">Link record</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#5E4414] shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
}
