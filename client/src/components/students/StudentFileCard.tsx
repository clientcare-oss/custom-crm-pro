import React from "react";
import { ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkerType, MarkerSelectorPopover } from "./MarkerSelectorBox";

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
  assignedAdvocateName?: string | null;
  assignedAdvocateInitials?: string | null;
  nextRequiredAction?: string | null;
  accountStatus?: string | null;
  lifecycleStage?: string | null;
  serviceStatus?: string | null;
  priority?: boolean;
  bookmarked?: boolean;
  needsAttention?: boolean;
  upcomingMeetingDate?: string | null;
  markerType?: MarkerType;
  tags?: string[];
}

export interface StudentFileCardProps {
  student: StudentFolderData;
  onClick: () => void;
  index?: number;
  className?: string;
  onMarkerChange?: (studentId: number, marker: MarkerType | "none") => void;
  onStageChange?: (studentId: number, newStage: string) => void;
  onEmployeeChange?: (studentId: number, employeeName: string) => void;
  availableStages?: string[];
}

export const STUDENT_FOLDER_BACKGROUNDS = [
  "/decor/student-folder-bg-1.png",
  "/decor/student-folder-bg-2.png",
  "/decor/student-folder-bg-3-clean.png",
  "/decor/student-folder-bg-4.png",
  "/decor/student-folder-bg-5.png",
];

export const CARD_EMPLOYEES = [
  { name: "Byron Honea", initials: "BH" },
  { name: "Erin Smith", initials: "ES" },
  { name: "Marcus Sterling", initials: "MS" },
  { name: "Kendra Lane", initials: "KL" },
];

export const DEFAULT_CARD_STAGES = [
  "Discovery",
  "Free Session",
  "Proposal (14-Day Exp)",
  "2-Week Follow-Up",
  "30-Day Follow-Up",
  "60-Day Follow-Up",
  "Reconnect Review",
  "Intake / Onboarding",
  "Billing & Authorization",
  "Client Upload Tasks",
  "Records Review",
  "School Contact",
  "Meeting Scheduled",
  "State Complaint",
  "Monitoring",
  "Renewal",
  "Closed",
];

export function getDefaultNextRequiredAction(stage?: string | null): string {
  const s = (stage || "Discovery").toLowerCase();
  if (s.includes("discovery")) return "Complete discovery intake & review parent concerns";
  if (s.includes("free session")) return "Host strategy session & outline next steps";
  if (s.includes("proposal")) return "Follow up on service agreement & proposal";
  if (s.includes("follow-up")) return "Send follow-up check-in & schedule consult";
  if (s.includes("reconnect")) return "Review family reconnect notes & outreach";
  if (s.includes("intake") || s.includes("onboarding")) return "Complete onboarding packet & records release";
  if (s.includes("billing") || s.includes("authorization")) return "Verify billing authorization & agreement";
  if (s.includes("upload")) return "Verify parent IEP & evaluation uploads";
  if (s.includes("records")) return "Audit current IEP, evaluations & service minutes";
  if (s.includes("school")) return "Draft parent concern letter & contact case manager";
  if (s.includes("meeting")) return "Finalize parent agenda & meeting blueprint";
  if (s.includes("complaint")) return "Compile evidence exhibits & compliance timeline";
  if (s.includes("monitoring")) return "Monitor IEP implementation & progress logs";
  if (s.includes("renewal")) return "Review annual renewal options with family";
  if (s.includes("closed")) return "Archive final case summary";
  return "Review current stage milestone";
}

export function StudentFileCard({
  student,
  onClick,
  index = 0,
  className,
  onMarkerChange,
  onStageChange,
  onEmployeeChange,
  availableStages = DEFAULT_CARD_STAGES,
}: StudentFileCardProps) {
  // Format student name: "Avery J.", "Ethan R.", etc.
  const rawFirst = (student.firstName || "Student").trim();
  const rawLast = (student.lastName || "").trim();
  const formattedFirst = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const formattedLastInitial = rawLast ? `${rawLast.charAt(0).toUpperCase()}.` : "";
  const displayName = `${formattedFirst} ${formattedLastInitial}`.trim();

  // Grade & Family / Primary Parent
  const gradeText = student.gradeLevel || "3rd Grade";

  // Display what family they're with (e.g. "Sheep Family") or primary parent's name
  const familyOrParentText = React.useMemo(() => {
    // 1. Explicit company containing "Family" (e.g. "Sheep Family", "The Sheep Family")
    if (student.company && /family/i.test(student.company)) {
      return student.company.trim();
    }
    // 2. Student's last name -> "[Last] Family" (e.g. "Sheep Family")
    if (student.lastName && student.lastName.trim()) {
      const cleanLast = student.lastName.trim();
      return `${cleanLast} Family`;
    }
    // 3. Primary parent's name (e.g. "Mary Sheep" -> "Sheep Family" or full parent name)
    if (student.parentName && student.parentName.trim()) {
      const pName = student.parentName.trim();
      if (/family/i.test(pName)) return pName;
      const parts = pName.split(/\s+/);
      if (parts.length > 1) {
        return `${parts[parts.length - 1]} Family`;
      }
      return pName;
    }
    // 4. Fallback to company or generic family label
    if (student.company && student.company.trim()) {
      return `${student.company.trim()} Family`;
    }
    return "Family File";
  }, [student.company, student.lastName, student.parentName]);

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

  // Physical Accessory Marker Type:
  // ONLY displayed if explicitly selected by user. NO random assignment!
  const markerType = student.markerType;

  // Select 3D folder background from user's official fleet of 5 designs
  const folderBg = STUDENT_FOLDER_BACKGROUNDS[index % STUDENT_FOLDER_BACKGROUNDS.length];

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
        "group relative w-full aspect-[439/343] cursor-pointer transition-all duration-200 select-none outline-none",
        "hover:-translate-y-2.5 hover:z-50 focus-visible:ring-2 focus-visible:ring-[#E9BA6B] rounded-xl",
        className
      )}
    >
      {/* ─── 3D Photorealistic Folder Background Asset ─── */}
      <img
        src={folderBg}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_14px_28px_rgba(0,0,0,0.95)] transition-all duration-200"
      />

      {/* ─── PHYSICAL OVERLAPPING MARKERS (Click to select/change/remove) ─── */}
      <div
        className="absolute top-[8.5%] right-[11.5%] z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <MarkerSelectorPopover
          currentMarker={markerType}
          studentName={displayName}
          onSelect={(newMarker) => onMarkerChange?.(student.id, newMarker)}
        >
          {markerType ? (
            <div
              role="button"
              tabIndex={0}
              title={`Marker: ${markerType} (Click to change or remove)`}
              className="cursor-pointer transition-transform hover:scale-105 active:scale-95 outline-none"
            >
                    {/* 1. Paperclip (Dimensional gold/brass wire overlapping top edge) */}
                    {markerType === "paperclip" && (
                      <div style={{ filter: "drop-shadow(1px 3px 3px rgba(0,0,0,0.55))" }}>
                        <svg width="15" height="30" viewBox="0 0 15 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M4 11V23C4 25.5 6 27.5 8.5 27.5C11 27.5 13 25.5 13 23V5C13 2.5 11 0.5 8.5 0.5C6 0.5 4 2.5 4 5V21C4 22.4 5.1 23.5 6.5 23.5C7.9 23.5 9 22.4 9 21V10"
                            stroke="url(#clip-brass-grad)"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
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
                      <div style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))" }}>
                        <div className="w-5.5 h-6 sm:w-6 sm:h-6.5 rounded-[3.5px] bg-gradient-to-b from-[#E7B863] via-[#C08C36] to-[#7D5215] border border-[#FFE2A4]/80 flex items-center justify-center shadow-xs">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#2C1904] drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">
                            <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* 3. Violet Bookmark Ribbon (Hangs downward over front of paper with V-notch) */}
                    {markerType === "violet_bookmark" && (
                      <div style={{ filter: "drop-shadow(1px 3px 4px rgba(0,0,0,0.55))" }}>
                        <svg width="18" height="28" viewBox="0 0 18 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M1 0H17V26L9 20.5L1 26V0Z"
                            fill="url(#v-ribbon-grad-card)"
                            stroke="#553488"
                            strokeWidth="0.8"
                          />
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
                      <div style={{ filter: "drop-shadow(1px 3px 4px rgba(0,0,0,0.55))" }}>
                        <svg width="18" height="28" viewBox="0 0 18 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M1 0H17V26L9 20.5L1 26V0Z"
                            fill="url(#g-ribbon-grad-card)"
                            stroke="#23663C"
                            strokeWidth="0.8"
                          />
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
                      <div style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))" }}>
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
                      <div style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))" }}>
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FF4D4D] to-[#C92222] border border-[#FFA199] flex items-center justify-center text-white font-black text-xs leading-none shadow-xs">
                          !
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* When no marker is attached: hover reveals a subtle clip trigger */
                  <button
                    type="button"
                    title="Attach physical marker"
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md bg-[#FAF4E8] border border-[#8A6731]/60 text-[#8A6731] hover:text-[#182034] hover:bg-[#FFEEC7] flex items-center justify-center shadow-xs cursor-pointer transition-all duration-150"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                )}
              </MarkerSelectorPopover>
            </div>

      {/* ─── CARD CONTENT OVERLAY (Positioned precisely on the cream card parchment) ─── */}
      <div className="absolute top-[13.5%] left-[8%] right-[8%] bottom-[11.5%] flex flex-col justify-between px-2 sm:px-2.5 pt-1 sm:pt-1.5 pb-1 z-20 pointer-events-none">
        {/* Top: Student Name + Quiet Chevron */}
        <div>
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <h3 className="font-serif font-bold text-[15px] sm:text-[17px] lg:text-[18px] text-[#141B28] tracking-tight leading-tight line-clamp-1 group-hover:text-[#060B14] transition-colors drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
              {displayName}
            </h3>

            {/* Quiet Right-Facing Chevron (NOT inside a button) */}
            <div className="text-[#8A9AB0] group-hover:text-[#3A4556] group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0">
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
            </div>
          </div>

          {/* Grade & Family / Primary Parent + Stage & Employee Row */}
          <div className="space-y-0.5">
            <p className="font-serif text-[#3A4556] text-[11px] sm:text-[12px] leading-tight line-clamp-1 font-medium">
              {gradeText} · <span className="font-sans font-semibold text-[#1B365D]">{familyOrParentText}</span>
            </p>
            <div
              className="flex items-center gap-1 pt-0.5 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Compact Stage Selector on Folder Card */}
              <select
                value={student.pipelineStage || "Discovery"}
                onChange={(e) => onStageChange?.(student.id, e.target.value)}
                title={`Stage: ${student.pipelineStage || "Discovery"}`}
                className="h-4.5 max-w-[108px] rounded px-1 text-[9.5px] font-semibold bg-[#102B52] text-[#C7E0FF] border border-[#3E79C9]/80 truncate cursor-pointer focus:outline-hidden"
              >
                {availableStages.map((st) => (
                  <option key={st} value={st} className="bg-[#071326] text-[#FFF4D4]">
                    {st}
                  </option>
                ))}
              </select>

              {/* Compact Assigned Employee Selector on Folder Card */}
              <select
                value={student.assignedAdvocateName || "Byron Honea"}
                onChange={(e) => onEmployeeChange?.(student.id, e.target.value)}
                title={`Assigned Employee: ${student.assignedAdvocateName || "Byron Honea"}`}
                className="h-4.5 rounded px-1 text-[9.5px] font-bold bg-[#3B2A0C] text-[#FFE394] border border-[#C5A059]/80 cursor-pointer focus:outline-hidden"
              >
                {CARD_EMPLOYEES.map((emp) => (
                  <option key={emp.name} value={emp.name} className="bg-[#071326] text-[#FFF4D4]">
                    {emp.initials} · {emp.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Compact Next Required Action on Folder Card */}
            <p
              className="text-[9.5px] sm:text-[10px] font-medium text-[#2C3E55] truncate pt-0.5"
              title={`Next Required Action: ${student.nextRequiredAction || getDefaultNextRequiredAction(student.pipelineStage)}`}
            >
              Next: {student.nextRequiredAction || getDefaultNextRequiredAction(student.pipelineStage)}
            </p>
          </div>
        </div>

        {/* Bottom Status / Eligibility Printed Labels (Firmly anchored with clear separation from family name) */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#D9CABB]/60 mt-auto">
          {/* Plan Type Pill (IEP or 504) */}
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10.5px] font-bold font-mono tracking-wider uppercase border shadow-[0_1px_1px_rgba(0,0,0,0.06)] shrink-0",
              is504
                ? "bg-[#D6EDE3]/90 text-[#245D47] border-[#A5D0BF]"
                : "bg-[#E4D9EE]/90 text-[#55386E] border-[#C5B3D4]"
            )}
          >
            {planTag}
          </span>

          {/* Diagnosis / Category Pill */}
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10.5px] font-bold font-mono tracking-wider uppercase border shadow-[0_1px_1px_rgba(0,0,0,0.06)] shrink-0",
              diagTag === "SLD" && "bg-[#DDE2ED]/90 text-[#3B4A6C] border-[#B7BFD4]",
              diagTag === "ADHD" && "bg-[#D5ECE1]/90 text-[#225A41] border-[#A6D1BD]",
              diagTag === "ASD" && "bg-[#D6E3F0]/90 text-[#295076] border-[#A7BFDA]",
              diagTag === "AuD" && "bg-[#E8DEF2]/90 text-[#5C2E85] border-[#CEBCE0]",
              diagTag === "OHI" && "bg-[#EBDCE3]/90 text-[#69364E] border-[#CEB2C0]",
              diagTag === "EBD" && "bg-[#F4E3D7]/90 text-[#843A18] border-[#E0BDAB]",
            )}
          >
            {diagTag}
          </span>

          {/* Custom Tag Indicator on Card if present */}
          {student.tags && student.tags.length > 0 && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-[#F9E2E2]/95 text-[#3B1A1A] border border-[#F1C4C4] truncate max-w-[85px] shadow-[0_1px_1px_rgba(0,0,0,0.06)]"
              title={student.tags.join(", ")}
            >
              {student.tags[0]}
              {student.tags.length > 1 ? ` +${student.tags.length - 1}` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Backwards compatibility alias
export const StudentFolderCard = StudentFileCard;
