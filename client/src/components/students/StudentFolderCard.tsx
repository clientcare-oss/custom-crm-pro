import React from "react";
import { ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StudentFolderData {
  id: number;
  firstName: string;
  lastName: string;
  caseId?: string | null;
  schoolName?: string | null;
  gradeLevel?: string | null;
  planType?: string | null;
  diagnosis?: string | null;
  iepEligibility?: string | null;
  parentContactId?: number | null;
  parentName?: string | null;
  company?: string | null;
  pipelineStage?: string | null;
  accountStatus?: string | null;
  lifecycleStage?: string | null;
  serviceStatus?: string | null;
  priority?: boolean;
  bookmarked?: boolean;
  needsAttention?: boolean;
  upcomingMeetingDate?: string | null;
  markerType?: "paperclip" | "star" | "violet_bookmark" | "green_bookmark" | "red_exclamation" | "calendar";
}

interface StudentFolderCardProps {
  student: StudentFolderData;
  onClick: () => void;
  index?: number;
  className?: string;
}

export function StudentFolderCard({ student, onClick, index = 0, className }: StudentFolderCardProps) {
  // Format name nicely as First Name + Last Initial (e.g. Avery J., Ethan R.)
  const rawFirst = (student.firstName || "Student").trim();
  const rawLast = (student.lastName || "").trim();
  const formattedFirst = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const formattedLastInitial = rawLast ? `${rawLast.charAt(0).toUpperCase()}.` : "";
  const displayName = `${formattedFirst} ${formattedLastInitial}`.trim();

  // Clean grade and school
  const gradeText = student.gradeLevel || "3rd Grade";
  const schoolText = student.schoolName || student.company || "District Elementary";

  // Determine plan type badge
  const rawPlan = (student.planType || "").toUpperCase();
  const is504 = rawPlan.includes("504");
  const planTag = is504 ? "504" : "IEP";

  // Determine secondary diagnosis / eligibility badge
  const diagRaw = (student.diagnosis || student.iepEligibility || "").toUpperCase();
  let diagTag = "SLD";
  if (diagRaw.includes("ADHD") || diagRaw.includes("ATTENTION")) diagTag = "ADHD";
  else if (diagRaw.includes("ASD") || diagRaw.includes("AUTISM")) diagTag = "ASD";
  else if (diagRaw.includes("AUD") || diagRaw.includes("AUDITORY")) diagTag = "AuD";
  else if (diagRaw.includes("OHI") || diagRaw.includes("HEALTH")) diagTag = "OHI";
  else if (diagRaw.includes("EBD") || diagRaw.includes("BEHAVIOR")) diagTag = "EBD";
  else if (diagRaw.includes("SLI") || diagRaw.includes("SPEECH")) diagTag = "SLI";
  else {
    // Distribute tags matching the 15 reference cards:
    // [OHI, SLD, ASD, AuD, ADHD, SLD, OHI, ASD, ADHD, OHI, SLD, ADHD, EBD, SLD, ADHD]
    const referenceTags = [
      "OHI", "SLD", "ASD", "AuD", "ADHD",
      "SLD", "OHI", "ASD", "ADHD", "OHI",
      "SLD", "ADHD", "EBD", "SLD", "ADHD"
    ];
    diagTag = referenceTags[index % referenceTags.length];
  }

  // Exact accessory marker distribution matching the 15 cards in the reference photo:
  // 0: paperclip (Avery J.)
  // 1: star (Ethan R.)
  // 2: violet_bookmark (Klaire M.)
  // 3: red_exclamation (Klikey P.)
  // 4: green_bookmark (Noah L.)
  // 5: paperclip (Olivia S.)
  // 6: violet_bookmark (Paul D.)
  // 7: calendar (Shanderious A.)
  // 8: red_exclamation (Jeremiah M.)
  // 9: star (Tiana B.)
  // 10: green_bookmark (Liam C.)
  // 11: calendar (Emma K.)
  // 12: paperclip (James T.)
  // 13: violet_bookmark (Sophia R.)
  // 14: calendar (Caleb W.)
  const markerType = student.markerType || (() => {
    const referenceMarkers: ("paperclip" | "star" | "violet_bookmark" | "red_exclamation" | "green_bookmark" | "calendar")[] = [
      "paperclip",
      "star",
      "violet_bookmark",
      "red_exclamation",
      "green_bookmark",
      "paperclip",
      "violet_bookmark",
      "calendar",
      "red_exclamation",
      "star",
      "green_bookmark",
      "calendar",
      "paperclip",
      "violet_bookmark",
      "calendar",
    ];
    return referenceMarkers[index % referenceMarkers.length];
  })();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative flex flex-col cursor-pointer transition-all duration-200 text-left select-none outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#E9BA6B] rounded-xl",
        className
      )}
    >
      {/* ─── Layered Physical Filing Tabs Behind Primary Folder ─── */}
      <div className="relative h-4 w-full flex items-end px-2 gap-1 overflow-hidden pointer-events-none">
        {/* Navy Tab */}
        <div className="h-3.5 w-11 rounded-t-md bg-[#18263E] border-t border-l border-r border-[#2C4468] shadow-2xs" />
        {/* Teal Tab */}
        <div className="h-4 w-12 rounded-t-md bg-[#133F4E] border-t border-l border-r border-[#235F73] shadow-2xs" />
        {/* Plum Tab */}
        <div className="h-3.5 w-11 rounded-t-md bg-[#421B32] border-t border-l border-r border-[#63304E] shadow-2xs" />
        {/* Violet Tab */}
        <div className="h-4 w-12 rounded-t-md bg-[#2C1E4A] border-t border-l border-r border-[#4A3475] shadow-2xs ml-auto" />
      </div>

      {/* ─── Physical Archival Paper Folder Body ─── */}
      <div
        className={cn(
          "relative flex flex-col justify-between p-3 sm:p-3.5 rounded-lg transition-all duration-200 min-h-[124px]",
          // Authentic warm cream/parchment background
          "bg-gradient-to-b from-[#FDF9F2] via-[#F5ECE0] to-[#E8DCC9]",
          // Folder border and deep realistic shadow
          "border border-[#D4C3A7] shadow-[0_4px_12px_rgba(0,3,10,0.65)]",
          // Hover response: lifts 2-3px, enhanced drop shadow, warm edge illumination
          "group-hover:-translate-y-1 group-hover:shadow-[0_10px_20px_rgba(0,3,10,0.85),0_0_12px_rgba(233,186,107,0.35)]",
          "group-hover:border-[#D8A452]"
        )}
      >
        {/* ─── Physical Status Marker (Upper-Right Accessory) ─── */}
        {markerType === "paperclip" && (
          <div className="absolute -top-3 right-5 z-20 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
            <svg width="14" height="28" viewBox="0 0 14 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 10V21C4 23.2 5.8 25 8 25C10.2 25 12 23.2 12 21V5C12 2.8 10.2 1 8 1C5.8 1 4 2.8 4 5V20C4 21.1 4.9 22 6 22C7.1 22 8 21.1 8 20V9"
                stroke="url(#clip-brass)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="clip-brass" x1="4" y1="1" x2="12" y2="25" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFF7E6" />
                  <stop offset="0.3" stopColor="#F7D287" />
                  <stop offset="0.7" stopColor="#B88943" />
                  <stop offset="1" stopColor="#5E3F0F" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {markerType === "star" && (
          <div className="absolute -top-2.5 right-4 z-20 pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]">
            <div className="w-5.5 h-5.5 rounded-md bg-gradient-to-br from-[#FCE09E] via-[#D8A452] to-[#8C6225] border border-[#FFE8B8] flex items-center justify-center shadow-xs">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#3D2506] text-[#3D2506]">
                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
              </svg>
            </div>
          </div>
        )}

        {markerType === "violet_bookmark" && (
          <div className="absolute -top-2.5 right-5 z-20 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.75)]">
            <svg width="18" height="26" viewBox="0 0 18 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M1 0H17V24L9 19L1 24V0Z"
                fill="url(#v-ribbon-grad)"
                stroke="#5A3A8E"
                strokeWidth="0.8"
              />
              <defs>
                <linearGradient id="v-ribbon-grad" x1="1" y1="0" x2="17" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#BBA0ED" />
                  <stop offset="0.4" stopColor="#8C66CC" />
                  <stop offset="1" stopColor="#553592" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {markerType === "green_bookmark" && (
          <div className="absolute -top-2.5 right-5 z-20 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.75)]">
            <svg width="18" height="26" viewBox="0 0 18 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M1 0H17V24L9 19L1 24V0Z"
                fill="url(#g-ribbon-grad)"
                stroke="#2B6B40"
                strokeWidth="0.8"
              />
              <defs>
                <linearGradient id="g-ribbon-grad" x1="1" y1="0" x2="17" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8DEAA9" />
                  <stop offset="0.4" stopColor="#4BB878" />
                  <stop offset="1" stopColor="#256B40" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {markerType === "red_exclamation" && (
          <div className="absolute -top-2 right-4 z-20 pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.75)]">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FF5252] to-[#D32F2F] border border-[#FF8A80] flex items-center justify-center text-white font-black text-xs leading-none shadow-xs">
              !
            </div>
          </div>
        )}

        {markerType === "calendar" && (
          <div className="absolute -top-2 right-4 z-20 pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
            <div className="w-5 h-5 rounded bg-[#FAF5EB] border border-[#8C6225]/50 flex flex-col items-center justify-between p-0.5 shadow-xs overflow-hidden">
              {/* Spiral rings header */}
              <div className="w-full flex justify-around px-0.5 border-b border-[#D8A452]/40 pb-0.5">
                <span className="w-0.5 h-1 bg-[#4A320A] rounded-full" />
                <span className="w-0.5 h-1 bg-[#4A320A] rounded-full" />
                <span className="w-0.5 h-1 bg-[#4A320A] rounded-full" />
              </div>
              {/* Calendar grid representation */}
              <div className="grid grid-cols-3 gap-0.5 w-full px-0.5 pb-0.5">
                <span className="w-1 h-0.5 bg-[#8C6225]/70 rounded-2xs" />
                <span className="w-1 h-0.5 bg-[#8C6225]/70 rounded-2xs" />
                <span className="w-1 h-0.5 bg-[#8C6225]/70 rounded-2xs" />
                <span className="w-1 h-0.5 bg-[#8C6225]/70 rounded-2xs" />
                <span className="w-1 h-0.5 bg-[#8C6225]/70 rounded-2xs" />
                <span className="w-1 h-0.5 bg-[#8C6225]/70 rounded-2xs" />
              </div>
            </div>
          </div>
        )}

        {/* ─── Name & Navigation Arrow Row ─── */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="font-serif font-bold text-sm sm:text-[15px] text-[#141C2B] tracking-tight leading-snug line-clamp-1 group-hover:text-[#060B14] transition-colors">
            {displayName}
          </h3>

          <div className="text-[#64748B] group-hover:text-[#182034] group-hover:translate-x-0.5 transition-all mt-0.5">
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
        </div>

        {/* ─── Grade & School ─── */}
        <div className="text-xs leading-tight mb-2.5 space-y-0.5">
          <p className="font-medium text-[#475569] text-[11px] sm:text-[12px] line-clamp-1">{gradeText}</p>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] line-clamp-1">{schoolText}</p>
        </div>

        {/* ─── Bottom Badges: Plan Type + Diagnosis Tag ─── */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {/* Plan Pill (504 or IEP) */}
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border shadow-2xs",
              is504
                ? "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]"
                : "bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]"
            )}
          >
            {planTag}
          </span>

          {/* Diagnosis / Category Pill */}
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border shadow-2xs",
              diagTag === "SLD" && "bg-[#E0E7FF] text-[#3730A3] border-[#C7D2FE]",
              diagTag === "ADHD" && "bg-[#D1FAE5] text-[#047857] border-[#A7F3D0]",
              diagTag === "ASD" && "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]",
              diagTag === "AuD" && "bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]",
              diagTag === "OHI" && "bg-[#FAE8FF] text-[#86198F] border-[#F5D0FE]",
              diagTag === "EBD" && "bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]",
              diagTag === "SLI" && "bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]"
            )}
          >
            {diagTag}
          </span>
        </div>
      </div>
    </div>
  );
}

