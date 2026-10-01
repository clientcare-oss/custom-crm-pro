import React, { useState, useMemo, useEffect } from "react";
import { ChevronRight, FileText, Pause, Archive, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentFileCard, type StudentFolderData } from "./StudentFileCard";
import { StudentsListView } from "./StudentsListView";
import { type MarkerType } from "./MarkerSelectorBox";
import { CastBrassDrawerHandle, AntiqueBrassNameplate } from "./CabinetOrnaments";

export type DrawerType = "active" | "onboarding" | "paused" | "archived";

interface CabinetDrawerProps {
  type: DrawerType;
  title: string;
  subtitle?: string;
  count: number;
  students: StudentFolderData[];
  isOpen: boolean;
  onToggle: () => void;
  onStudentClick: (studentId: number) => void;
  onParentClick?: (parentId: number) => void;
  onMarkerChange?: (studentId: number, marker: MarkerType | "none") => void;
  viewMode?: "cards" | "list";
  children?: React.ReactNode;
  className?: string;
}

const DRAWER_ICONS: Record<DrawerType, React.ElementType> = {
  active: GraduationCap,
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
  onParentClick,
  onMarkerChange,
  viewMode = "cards",
  children,
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

  const hasCards = isOpen && viewMode === "cards" && students.length > 0 && !children;

  return (
    <div
      className={cn(
        "w-full relative transition-all duration-300 overflow-hidden",
        "bg-[#051327]",
        isOpen && "shadow-[0_12px_32px_rgba(0,3,10,0.95)]",
        className
      )}
    >
      {/* ─── Drawer Side Wooden Borders (touching top, running down halfway behind presenting drawer front) ─── */}
      {isOpen && (
        <>
          {/* Left Drawer Side Wooden Border (thinned to 15px, running down halfway behind presenting drawer front) */}
          <div className="absolute left-0 top-0 bottom-[28px] w-[15px] z-[25] pointer-events-none select-none overflow-hidden">
            <img
              src="/decor/drawer-side-wood.png"
              alt=""
              className="w-full h-full object-fill pointer-events-none select-none block"
            />
          </div>

          {/* Right Drawer Side Wooden Border (thinned to 15px, running down halfway behind presenting drawer front) */}
          <div className="absolute right-0 top-0 bottom-[28px] w-[15px] z-[25] pointer-events-none select-none overflow-hidden">
            <img
              src="/decor/drawer-side-wood.png"
              alt=""
              className="w-full h-full object-fill pointer-events-none select-none block"
            />
          </div>
        </>
      )}

      {/* ─── Drawer Interior Compartment (Cards sit INSIDE the opened drawer tray, extending down from top) ─── */}
      {isOpen && (
        <div
          className={cn(
            "relative w-full z-10 px-5 sm:px-8 lg:px-10 pt-6 bg-[#00081C] shadow-[inset_0_14px_36px_rgba(0,0,0,0.98)] animate-in fade-in-50 duration-200 overflow-visible",
            hasCards ? "pb-0" : "pb-6"
          )}
        >

          {children ? (
            children
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <IconComponent className="w-10 h-10 text-[#7B8EA7]/30 mb-2" />
              <p className="text-sm font-serif font-bold text-[#F0DFC5]/70">No files in this drawer</p>
              <p className="text-xs text-[#7B8EA7] mt-1">
                Student records categorized under {title.toLowerCase()} will appear organized here.
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="p-2 sm:p-4">
              <StudentsListView
                students={students}
                onStudentClick={onStudentClick}
                onParentClick={onParentClick}
              />
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
                  {/* Front retaining rail / drawer lip after EACH card row (extends cleanly to touch the thinned side pieces) */}
                  <div className="relative -mt-3.5 sm:-mt-4 lg:-mt-5 z-20 -ml-[6px] sm:-ml-[18px] lg:-ml-[26px] -mr-[6px] sm:-mr-[18px] lg:-mr-[26px] w-[calc(100%+12px)] sm:w-[calc(100%+36px)] lg:w-[calc(100%+52px)] pointer-events-none select-none px-0">
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

      {/* ─── Drawer Face (Overlaps the last divider up to its very top when drawer is open) ─── */}
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
          "w-full relative z-30 h-[56px] min-h-[56px] flex items-center justify-between cursor-pointer select-none transition-all overflow-hidden border-t border-[#8A6731]/45 border-b border-[#010612] shadow-[0_8px_24px_rgba(0,0,0,0.95)]",
          hasCards ? "-mt-[22px] sm:-mt-[26px] lg:-mt-[30px]" : "mt-0",
          "hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[#E9BA6B] outline-none"
        )}
        style={{
          backgroundImage: "url('/decor/rail-wood-grain.png')",
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 56px",
        }}
      >
        {/* Subtle drawer horizontal highlight bevel on top rim when CLOSED */}
        {!isOpen && (
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFF2D6]/30 to-transparent pointer-events-none" />
        )}

        {/* ─── 3D Illuminated Wooden Top Edge / Top Rim of Drawer (ONLY visible when drawer is OPEN) ─── */}
        {isOpen && (
          <div className="absolute top-0 left-0 right-0 h-[9px] pointer-events-none select-none z-20 overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
            <img
              src="/decor/drawer-top-edge.png"
              alt=""
              className="w-full h-full object-fill pointer-events-none select-none block"
            />
          </div>
        )}
        {/* Subtle bottom shadow line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#02050B] pointer-events-none" />

        {/* ─── Left Section: Left Hardware Bail Pull + Antique Brass Nameplate ─── */}
        <div className="flex items-center h-full shrink-0">
          <img
            src="/decor/rail-left-hardware.png"
            alt=""
            className="h-[56px] w-[22px] shrink-0 pointer-events-none select-none object-cover"
          />
          <div className="pl-2 sm:pl-3 pr-2 shrink-0 z-10">
            <AntiqueBrassNameplate
              icon={IconComponent}
              title={title}
              count={count}
              type={type}
            />
          </div>
        </div>

        {/* ─── Center: Heavy Solid Cast-Brass Horizontal Drawer Pull Handle (Dead Centered) ─── */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 hidden md:flex items-center justify-center">
          <CastBrassDrawerHandle className="w-52 sm:w-60 h-8" />
        </div>

        {/* ─── Right Section: Expansion Chevron & Right Hardware Bail Pull ─── */}
        <div className="flex items-center h-full shrink-0">
          <div className="flex items-center justify-center w-8 h-8 mr-3 sm:mr-4 text-[#D8A452] hover:text-[#FFF5DC] transition-colors">
            <ChevronRight
              className={cn(
                "w-5 h-5 stroke-[2.5] text-[#D8A452] transition-transform duration-200",
                isOpen ? "-rotate-90" : "rotate-0"
              )}
            />
          </div>
          <img
            src="/decor/rail-right-hardware.png"
            alt=""
            className="h-[56px] w-[26px] shrink-0 pointer-events-none select-none object-cover"
          />
        </div>
      </div>
    </div>
  );
}
