import React, { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronRight, FileText, Pause, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentFileCard, type StudentFolderData } from "./StudentFileCard";
import { type MarkerType } from "./MarkerSelectorBox";
import { CastBrassDrawerHandle, AntiqueBrassNameplate, BrassScrewRivet } from "./CabinetOrnaments";

export type DrawerType = "onboarding" | "paused" | "archived";

interface CabinetDrawerProps {
  type: DrawerType;
  title: string;
  subtitle?: string;
  count: number;
  students: StudentFolderData[];
  isOpen: boolean;
  onToggle: () => void;
  onStudentClick: (studentId: number) => void;
  onMarkerChange?: (studentId: number, marker: MarkerType | "none") => void;
  viewMode?: "cards" | "list";
  className?: string;
}

const DRAWER_ICONS: Record<DrawerType, React.ElementType> = {
  onboarding: FileText,
  paused: Pause,
  archived: Archive,
};

export function CabinetDrawer({
  type,
  title,
  subtitle,
  count,
  students,
  isOpen,
  onToggle,
  onStudentClick,
  onMarkerChange,
  viewMode = "cards",
  className,
}: CabinetDrawerProps) {
  const IconComponent = DRAWER_ICONS[type] || FileText;

  // Responsive Shelf Columns: Always 5 columns on tablets & desktops (>= 768px), matching the physical 5-slot card catalog
  const [cols, setCols] = useState(5);
  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w < 640) setCols(1);
      else if (w < 768) setCols(2);
      else setCols(5);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  // Partition students into rows of cols so EVERY row gets its own divider rail directly underneath
  const drawerRows = useMemo(() => {
    const rows: StudentFolderData[][] = [];
    for (let i = 0; i < students.length; i += cols) {
      rows.push(students.slice(i, i + cols));
    }
    return rows;
  }, [students, cols]);

  return (
    <div
      className={cn(
        "w-full relative transition-all duration-300 overflow-hidden",
        "bg-gradient-to-b from-[#000E26] via-[#00081C] to-[#000410]",
        isOpen && "shadow-[0_12px_32px_rgba(0,3,10,0.95)]",
        className
      )}
    >
      {/* ─── Drawer Face (Physical Wooden Credenza Drawer) ─── */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          "relative flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 cursor-pointer select-none transition-colors min-h-[56px]",
          "hover:bg-[#122744]/40 focus-visible:ring-2 focus-visible:ring-[#E9BA6B] outline-none"
        )}
      >
        {/* Subtle drawer horizontal highlight bevel on top rim */}
        <div className="absolute top-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-[#FFF2D6]/25 to-transparent pointer-events-none" />
        {/* Subtle bottom shadow line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#02050B] pointer-events-none" />

        {/* Far-left edge brass cabinet bracket screw */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
          <BrassScrewRivet className="w-2.5 h-2.5" />
        </div>

        {/* ─── Left: Antique Brass Nameplate with 4 Corner Rivets ─── */}
        <div className="flex items-center gap-3 shrink-0 z-10 pl-2 sm:pl-3">
          <AntiqueBrassNameplate
            icon={IconComponent}
            title={title}
            count={count}
          />
        </div>

        {/* ─── Center: Heavy Solid Cast-Brass Horizontal Drawer Pull Handle (Dead Centered) ─── */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 hidden md:flex items-center justify-center">
          <CastBrassDrawerHandle className="w-48 sm:w-52 h-6" />
        </div>

        {/* ─── Right: Expansion Chevron & Edge Rivet ─── */}
        <div className="flex items-center gap-3 shrink-0 z-10 pr-2 sm:pr-3">
          <div className="flex items-center justify-center w-7 h-7 text-[#D8A452] hover:text-[#FFF5DC] transition-colors">
            {isOpen ? (
              <ChevronDown className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            )}
          </div>

          {/* Far-right edge brass cabinet bracket screw */}
          <div className="pointer-events-none hidden sm:block">
            <BrassScrewRivet className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>

      {/* ─── Drawer Interior Compartment (Smooth Accordion Open) ─── */}
      {isOpen && (
        <div className="px-3 sm:px-6 lg:px-8 py-6 border-t-2 border-[#8A6731]/50 bg-[#00081C] shadow-[inset_0_14px_36px_rgba(0,0,0,0.98)] animate-in fade-in-50 duration-200">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <IconComponent className="w-10 h-10 text-[#7B8EA7]/30 mb-2" />
              <p className="text-sm font-serif font-bold text-[#F0DFC5]/70">No files in this drawer</p>
              <p className="text-xs text-[#7B8EA7] mt-1">
                Student records categorized under {title.toLowerCase()} will appear organized here.
              </p>
            </div>
          ) : (
            <div>
              {drawerRows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className={cn(
                    "relative w-full transition-all duration-200 hover:z-40 focus-within:z-40",
                    rowIdx > 0 && "-mt-[11px] sm:-mt-[13px] lg:-mt-[15px]"
                  )}
                  style={{ zIndex: 10 + rowIdx }}
                >
                  <div
                    className="grid gap-1.5 sm:gap-2 lg:gap-2.5 relative z-10"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    }}
                  >
                    {row.map((student, colIdx) => (
                      <div key={student.id} className="relative">
                        <StudentFileCard
                          student={student}
                          index={rowIdx * cols + colIdx}
                          onClick={() => onStudentClick(student.id)}
                          onMarkerChange={onMarkerChange}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Front retaining rail / drawer lip after EACH card row */}
                  <div className="relative -mt-3.5 sm:-mt-4 lg:-mt-5 z-20 -mx-1 sm:-mx-2 w-[calc(100%+8px)] sm:w-[calc(100%+16px)] pointer-events-none select-none px-0">
                    <img
                      src="/decor/shelf-retaining-rail.png"
                      alt=""
                      className="w-full h-[22px] sm:h-[26px] lg:h-[30px] object-fill pointer-events-none select-none drop-shadow-[0_10px_22px_rgba(0,0,0,0.98)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
