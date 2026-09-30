import React from "react";
import { ChevronRight } from "lucide-react";
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

export interface StudentFileCardProps {
  student: StudentFolderData;
  onClick: () => void;
  index?: number;
  className?: string;
}

/**
 * Physical Rear Document Folders Configuration (Plane 2)
 * Staggered folder tops peeking out 22-30px above the cream sheet
 */
interface RearFolderPreset {
  bg: string;
  border: string;
  highlight: string;
  left: string;
  width: string;
  height: string;
}

const REAR_FOLDER_SETS: RearFolderPreset[][] = [
  // Variation 0: Ochre + Wine + Teal + Violet + Navy (Matches Avery / Olivia)
  [
    { bg: "bg-[#14263D]", border: "border-[#253D5C]", highlight: "#416086", left: "2%", width: "96%", height: "26px" },
    { bg: "bg-[#7A5A29]", border: "border-[#A0793D]", highlight: "#D4A559", left: "5%", width: "34%", height: "30px" },
    { bg: "bg-[#421A2A]", border: "border-[#662C43]", highlight: "#8F4462", left: "26%", width: "30%", height: "24px" },
    { bg: "bg-[#14424B]", border: "border-[#215E6A]", highlight: "#328292", left: "46%", width: "32%", height: "27px" },
    { bg: "bg-[#332252]", border: "border-[#4D3577]", highlight: "#6C4DA3", left: "68%", width: "27%", height: "29px" },
  ],
  // Variation 1: Navy + Ochre + Teal + Wine + Plum (Matches Ethan / Paul)
  [
    { bg: "bg-[#101F33]", border: "border-[#1E3756]", highlight: "#345A87", left: "3%", width: "94%", height: "25px" },
    { bg: "bg-[#381F4A]", border: "border-[#54306E]", highlight: "#764799", left: "7%", width: "28%", height: "28px" },
    { bg: "bg-[#7D6031]", border: "border-[#A47F44]", highlight: "#D9AD62", left: "28%", width: "33%", height: "31px" },
    { bg: "bg-[#133F48]", border: "border-[#205D69]", highlight: "#308090", left: "52%", width: "30%", height: "26px" },
    { bg: "bg-[#4A1D2F]", border: "border-[#6A2D45]", highlight: "#934363", left: "72%", width: "24%", height: "28px" },
  ],
  // Variation 2: Teal + Plum + Gold + Navy + Slate (Matches Klaire / Shanderious)
  [
    { bg: "bg-[#162B42]", border: "border-[#274465]", highlight: "#446B99", left: "2%", width: "96%", height: "27px" },
    { bg: "bg-[#154650]", border: "border-[#226371]", highlight: "#348699", left: "6%", width: "32%", height: "31px" },
    { bg: "bg-[#451C35]", border: "border-[#682F52]", highlight: "#8F4573", left: "30%", width: "29%", height: "25px" },
    { bg: "bg-[#7E5E2C]", border: "border-[#A57E3F]", highlight: "#DAAB5A", left: "50%", width: "34%", height: "28px" },
    { bg: "bg-[#281D45]", border: "border-[#3F2F67]", highlight: "#5B468F", left: "74%", width: "22%", height: "30px" },
  ],
  // Variation 3: Wine + Gold + Teal + Violet + Charcoal (Matches Noah / Liam)
  [
    { bg: "bg-[#122238]", border: "border-[#203758]", highlight: "#365885", left: "2%", width: "96%", height: "26px" },
    { bg: "bg-[#481E2E]", border: "border-[#693045]", highlight: "#914863", left: "8%", width: "30%", height: "29px" },
    { bg: "bg-[#164049]", border: "border-[#225A66]", highlight: "#357A89", left: "32%", width: "31%", height: "26px" },
    { bg: "bg-[#7B5927]", border: "border-[#9F7538]", highlight: "#D2A253", left: "55%", width: "28%", height: "30px" },
    { bg: "bg-[#32204D]", border: "border-[#4D3373]", highlight: "#6C4B9F", left: "75%", width: "22%", height: "27px" },
  ],
];

export function StudentFileCard({
  student,
  onClick,
  index = 0,
  className,
}: StudentFileCardProps) {
  // Format student name: "Avery J.", "Ethan R.", etc.
  const rawFirst = (student.firstName || "Student").trim();
  const rawLast = (student.lastName || "").trim();
  const formattedFirst = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const formattedLastInitial = rawLast ? `${rawLast.charAt(0).toUpperCase()}.` : "";
  const displayName = `${formattedFirst} ${formattedLastInitial}`.trim();

  // Grade & School
  const gradeText = student.gradeLevel || "3rd Grade";
  const schoolText = student.schoolName || student.company || "District Elementary";

  // Plan Type (IEP or 504)
  const rawPlan = (student.planType || "").toUpperCase();
  const is504 = rawPlan.includes("504");
  const planTag = is504 ? "504" : "IEP";

  // Eligibility / Category Diagnosis
  const diagRaw = (student.diagnosis || student.iepEligibility || "").toUpperCase();
  let diagTag = "SLD";
  if (diagRaw.includes("ADHD") || diagRaw.includes("ATTENTION")) diagTag = "ADHD";
  else if (diagRaw.includes("ASD") || diagRaw.includes("AUTISM")) diagTag = "ASD";
  else if (diagRaw.includes("AUD") || diagRaw.includes("AUDITORY")) diagTag = "AuD";
  else if (diagRaw.includes("OHI") || diagRaw.includes("HEALTH")) diagTag = "OHI";
  else if (diagRaw.includes("EBD") || diagRaw.includes("BEHAVIOR")) diagTag = "EBD";
  else if (diagRaw.includes("SLI") || diagRaw.includes("SPEECH")) diagTag = "SLI";
  else {
    const referenceTags = [
      "OHI", "SLD", "ASD", "AuD", "ADHD",
      "SLD", "OHI", "ASD", "ADHD", "OHI",
      "SLD", "ADHD", "EBD", "SLD", "ADHD"
    ];
    diagTag = referenceTags[index % referenceTags.length];
  }

  // Physical Accessory Marker Type (Exactly matching the GPT reference catalog)
  const markerType = student.markerType || (() => {
    const referenceMarkers: ("paperclip" | "star" | "violet_bookmark" | "green_bookmark" | "calendar" | "red_exclamation")[] = [
      "paperclip",        // Avery J. (0)
      "star",             // Ethan R. (1)
      "violet_bookmark",  // Klaire M. (2)
      "red_exclamation",  // Klikey P. (3)
      "green_bookmark",   // Noah L. (4)
      "paperclip",        // Olivia S. (5)
      "violet_bookmark",  // Paul D. (6)
      "calendar",         // Shanderious A. (7)
      "red_exclamation",  // Jeremiah M. (8)
      "star",             // Tiana B. (9)
      "green_bookmark",   // Liam C. (10)
      "calendar",         // Emma K. (11)
      "paperclip",        // James T. (12)
      "violet_bookmark",  // Sophia R. (13)
      "calendar",         // Caleb W. (14)
    ];
    return referenceMarkers[index % referenceMarkers.length];
  })();

  // Select rear folders set by index
  const rearFolders = REAR_FOLDER_SETS[index % REAR_FOLDER_SETS.length];

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
        "group relative flex flex-col cursor-pointer transition-all duration-200 text-left select-none outline-none w-full",
        "focus-visible:ring-2 focus-visible:ring-[#E9BA6B] rounded-md",
        className
      )}
    >
      {/* ─────────────────────────────────────────────────────────────────────────────
          PLANE 1 — FILE POCKET / DRAWER CHASSIS
          Permanent dark navy physical pocket surrounding the lower and side portions
          of every student file. Structured with dark side walls, bottom rail, and cavity.
      ───────────────────────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "relative w-full rounded-md flex flex-col",
          // Canonical Waypoint dark filing chassis layered values (#000820 / #020B1B / #041329 / #071A32)
          "bg-gradient-to-b from-[#020B1B] via-[#041329] to-[#071A32]",
          // Structured pocket borders with subtle bevel
          "border border-[#142844] shadow-[0_8px_22px_rgba(0,3,12,0.92),inset_0_1px_2px_rgba(255,255,255,0.06)]",
          "p-[2.5px] sm:p-[3px] pb-0"
        )}
      >
        {/* Top Rim Bevel Highlight */}
        <div className="absolute top-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-[#254A78]/60 to-transparent pointer-events-none" />

        {/* ─── Recessed Pocket Interior Cavity (Deep blue-black well #000820) ─── */}
        <div
          className={cn(
            "relative w-full rounded-xs overflow-hidden flex flex-col justify-end",
            "bg-gradient-to-b from-[#000615] via-[#010B1C] to-[#031126]",
            "shadow-[inset_0_6px_14px_rgba(0,0,0,0.95)]",
            "pt-7 sm:pt-8 px-1 pb-1"
          )}
        >
          {/* Subtle interior drop shadow at the top of the dark pocket */}
          <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#00040E] to-transparent pointer-events-none z-0" />

          {/* ─────────────────────────────────────────────────────────────────────────
              PLANE 2 — REAR DOCUMENT FOLDERS
              4 to 6 overlapping file folders/documents behind the cream sheet.
              Only approximately the upper 22-35px of these folders remain visible.
          ───────────────────────────────────────────────────────────────────────── */}
          <div className="absolute top-1 inset-x-1.5 h-8 pointer-events-none z-0">
            {rearFolders.map((folder, fIdx) => (
              <div
                key={fIdx}
                className={cn(
                  "absolute rounded-t-[5px] border-t border-l border-r shadow-[0_2px_5px_rgba(0,0,0,0.6)]",
                  folder.bg,
                  folder.border
                )}
                style={{
                  left: folder.left,
                  width: folder.width,
                  height: folder.height,
                  top: `calc(100% - ${folder.height})`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
              >
                {/* Thin folder edge highlight */}
                <div
                  className="w-full h-[1px] opacity-40 rounded-t-[5px]"
                  style={{ backgroundColor: folder.highlight }}
                />
              </div>
            ))}
          </div>

          {/* ─────────────────────────────────────────────────────────────────────────
              PLANE 3 — STUDENT INDEX SHEET
              Warm ivory/parchment paper sheet inserted in FRONT of the rear folders.
              Sits inside the dark pocket chassis with subtle contact shadow.
          ───────────────────────────────────────────────────────────────────────── */}
          <div
            className={cn(
              "relative z-10 w-full rounded-[9px] flex flex-col justify-between",
              // Warm ivory / parchment tone (#F7EBD7 / #F4E8D1 / #EFE0C6)
              "bg-gradient-to-b from-[#FBF5EB] via-[#F4E9D8] to-[#E8DCC9]",
              // Thin warm beige border & realistic physical paper shadow
              "border border-[#D2C0A5] shadow-[0_4px_14px_rgba(0,3,10,0.7),inset_0_1px_1px_rgba(255,255,255,0.9)]",
              // Interaction: card responds with a tactile micro-lift like pulling a file
              "transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_20px_rgba(0,3,10,0.85)]",
              "group-hover:border-[#C49B55]",
              "p-3 sm:p-3.5 min-h-[118px] sm:min-h-[122px]"
            )}
          >
            {/* Top paper edge highlight bevel */}
            <div className="absolute top-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-[#FFFFFF]/80 to-transparent pointer-events-none" />

            {/* ─── PHYSICAL OVERLAPPING MARKERS (Overlapping upper edge of cream sheet) ─── */}

            {/* 1. Paperclip (Dimensional gold/brass wire overlapping top edge) */}
            {markerType === "paperclip" && (
              <div
                className="absolute -top-3.5 right-5 sm:right-6 z-20 pointer-events-none"
                style={{ filter: "drop-shadow(1px 3px 3px rgba(0,0,0,0.55))" }}
              >
                <svg width="15" height="30" viewBox="0 0 15 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Outer back curve and inner clip loop */}
                  <path
                    d="M4 11V23C4 25.5 6 27.5 8.5 27.5C11 27.5 13 25.5 13 23V5C13 2.5 11 0.5 8.5 0.5C6 0.5 4 2.5 4 5V21C4 22.4 5.1 23.5 6.5 23.5C7.9 23.5 9 22.4 9 21V10"
                    stroke="url(#clip-brass-grad)"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Fine edge glint on right side */}
                  <path
                    d="M12.8 6V22"
                    stroke="#FFF7E6"
                    strokeWidth="0.7"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <defs>
                    <linearGradient id="clip-brass-grad" x1="4" y1="0.5" x2="13" y2="28" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFF9E8" />
                      <stop offset="0.25" stopColor="#F5D07A" />
                      <stop offset="0.65" stopColor="#B88939" />
                      <stop offset="1" stopColor="#5E3F0F" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}

            {/* 2. Star Tab (Saddle leather / antique brass tab attached over top edge) */}
            {markerType === "star" && (
              <div
                className="absolute -top-3 right-4 sm:right-5 z-20 pointer-events-none"
                style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))" }}
              >
                <div className="w-5.5 h-6 sm:w-6 sm:h-6.5 rounded-[3.5px] bg-gradient-to-b from-[#E7B863] via-[#C08C36] to-[#7D5215] border border-[#FFE2A4]/80 flex items-center justify-center shadow-xs">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#2C1904] drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">
                    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                  </svg>
                </div>
              </div>
            )}

            {/* 3. Violet Bookmark Ribbon (Hangs downward over front of paper with V-notch) */}
            {markerType === "violet_bookmark" && (
              <div
                className="absolute -top-3 right-5 sm:right-6 z-20 pointer-events-none"
                style={{ filter: "drop-shadow(1px 3px 4px rgba(0,0,0,0.55))" }}
              >
                <svg width="18" height="28" viewBox="0 0 18 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1 0H17V26L9 20.5L1 26V0Z"
                    fill="url(#v-ribbon-grad-card)"
                    stroke="#553488"
                    strokeWidth="0.8"
                  />
                  {/* Subtle ribbon top fold highlight */}
                  <line x1="2" y1="2" x2="16" y2="2" stroke="#E1D0FC" strokeWidth="0.8" opacity="0.75" />
                  <defs>
                    <linearGradient id="v-ribbon-grad-card" x1="1" y1="0" x2="17" y2="28" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#BEA4F0" />
                      <stop offset="0.35" stopColor="#8F67D1" />
                      <stop offset="1" stopColor="#55338D" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}

            {/* 4. Green Bookmark Ribbon */}
            {markerType === "green_bookmark" && (
              <div
                className="absolute -top-3 right-5 sm:right-6 z-20 pointer-events-none"
                style={{ filter: "drop-shadow(1px 3px 4px rgba(0,0,0,0.55))" }}
              >
                <svg width="18" height="28" viewBox="0 0 18 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1 0H17V26L9 20.5L1 26V0Z"
                    fill="url(#g-ribbon-grad-card)"
                    stroke="#23663C"
                    strokeWidth="0.8"
                  />
                  {/* Top fold highlight */}
                  <line x1="2" y1="2" x2="16" y2="2" stroke="#B8F0CC" strokeWidth="0.8" opacity="0.75" />
                  <defs>
                    <linearGradient id="g-ribbon-grad-card" x1="1" y1="0" x2="17" y2="28" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#8DEAA9" />
                      <stop offset="0.35" stopColor="#48B876" />
                      <stop offset="1" stopColor="#22643A" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}

            {/* 5. Calendar Badge Marker */}
            {markerType === "calendar" && (
              <div
                className="absolute -top-2.5 right-4 sm:right-5 z-20 pointer-events-none"
                style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))" }}
              >
                <div className="w-5.5 h-5.5 rounded bg-[#FAF5EB] border border-[#8C6225]/60 flex flex-col items-center justify-between p-0.5 shadow-xs overflow-hidden">
                  <div className="w-full flex justify-around px-0.5 border-b border-[#D8A452]/40 pb-0.5">
                    <span className="w-0.5 h-1 bg-[#4A320A] rounded-full" />
                    <span className="w-0.5 h-1 bg-[#4A320A] rounded-full" />
                    <span className="w-0.5 h-1 bg-[#4A320A] rounded-full" />
                  </div>
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

            {/* 6. Red Exclamation Dot Alert */}
            {markerType === "red_exclamation" && (
              <div
                className="absolute -top-2.5 right-4 sm:right-5 z-20 pointer-events-none"
                style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))" }}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FF4D4D] to-[#C92222] border border-[#FFA199] flex items-center justify-center text-white font-black text-xs leading-none shadow-xs">
                  !
                </div>
              </div>
            )}

            {/* ─── Card Content Row: Name + Quiet Chevron ─── */}
            <div>
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <h3 className="font-serif font-bold text-[18px] sm:text-[20px] text-[#141B28] tracking-tight leading-tight line-clamp-1 group-hover:text-[#060B14] transition-colors">
                  {displayName}
                </h3>

                {/* Quiet Right-Facing Chevron (NOT inside a button) */}
                <div className="text-[#8A9AB0] group-hover:text-[#3A4556] group-hover:translate-x-0.5 transition-all mt-1 shrink-0">
                  <ChevronRight className="w-4 h-4 stroke-[2]" />
                </div>
              </div>

              {/* Grade & School */}
              <div className="space-y-0.5">
                <p className="font-serif text-[#3A4556] text-[13px] sm:text-[14px] leading-tight line-clamp-1">
                  {gradeText}
                </p>
                <p className="font-sans text-[#5A687C] text-[12px] sm:text-[13px] leading-tight truncate line-clamp-1">
                  {schoolText}
                </p>
              </div>
            </div>

            {/* ─── Bottom Status / Eligibility Printed Labels ─── */}
            <div className="flex items-center gap-1.5 pt-2">
              {/* Plan Type Pill (IEP or 504) */}
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider uppercase border shadow-[0_1px_1px_rgba(0,0,0,0.06)]",
                  is504
                    ? "bg-[#D6EDE3] text-[#245D47] border-[#A5D0BF]"
                    : "bg-[#E4D9EE] text-[#55386E] border-[#C5B3D4]"
                )}
              >
                {planTag}
              </span>

              {/* Diagnosis / Category Pill */}
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider uppercase border shadow-[0_1px_1px_rgba(0,0,0,0.06)]",
                  diagTag === "SLD" && "bg-[#DDE2ED] text-[#3B4A6C] border-[#B7BFD4]",
                  diagTag === "ADHD" && "bg-[#D5ECE1] text-[#225A41] border-[#A6D1BD]",
                  diagTag === "ASD" && "bg-[#D6E3F0] text-[#295076] border-[#A7BFDA]",
                  diagTag === "AuD" && "bg-[#E8DEF2] text-[#5C2E85] border-[#CEBCE0]",
                  diagTag === "OHI" && "bg-[#EBDCE3] text-[#69364E] border-[#CEB2C0]",
                  diagTag === "EBD" && "bg-[#F4E3D7] text-[#843A18] border-[#E0BDAB]",
                  diagTag === "SLI" && "bg-[#D6E3F0] text-[#295076] border-[#A7BFDA]"
                )}
              >
                {diagTag}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Bottom Drawer Rail (Strong horizontal shelf ledge/lip across the bottom) ─── */}
        <div className="relative h-2 sm:h-2.5 w-full rounded-b-xs bg-gradient-to-r from-[#030B18] via-[#0E243E] to-[#030B18] border-t border-[#8A6731]/45 shadow-[0_3px_8px_rgba(0,0,0,0.95)] flex items-center">
          {/* Subtle gold hairline reflection bevel */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#F7D287]/30 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

// Backwards compatibility alias
export const StudentFolderCard = StudentFileCard;
