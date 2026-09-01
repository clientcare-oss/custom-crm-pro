import React, { useState, useRef, useEffect } from "react";
import { 
  Sun, 
  Moon, 
  Link2, 
  Calendar, 
  LogOut, 
  ArrowLeftRight, 
  ChevronDown, 
  Check, 
  Plus 
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export interface StudentOption {
  id: number | string;
  firstName: string;
  lastName: string;
  studentIdNumber?: string;
  grade?: string;
}

interface ClientPortalHeaderProps {
  displayName: string;
  studentName?: string;
  studentIdNumber?: string;
  students?: StudentOption[];
  selectedStudentId?: number | string;
  onSelectStudent?: (student: StudentOption) => void;
  onAddStudent?: () => void;
  parentContactId?: number | null;
  theme: string;
  onToggleTheme: () => void;
  onOpenIepLinkDialog: () => void;
  onOpenScheduler: () => void;
  onLogout: () => void;
}

export function ClientPortalHeader({
  displayName,
  studentName = "Alex Honea",
  studentIdNumber = "84257",
  students,
  selectedStudentId,
  onSelectStudent,
  onAddStudent,
  parentContactId,
  theme,
  onToggleTheme,
  onOpenIepLinkDialog,
  onOpenScheduler,
  onLogout,
}: ClientPortalHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default demo student profiles if none passed
  const availableStudents: StudentOption[] = students && students.length > 0 ? students : [
    { id: "84257", firstName: "Alex", lastName: "Honea", studentIdNumber: "84257", grade: "4th Grade" },
    { id: "96321", firstName: "Brooklyn", lastName: "Honea", studentIdNumber: "96321", grade: "2nd Grade" },
  ];

  const [currentStudent, setCurrentStudent] = useState<StudentOption>(() => {
    if (selectedStudentId) {
      const match = availableStudents.find(s => String(s.id) === String(selectedStudentId));
      if (match) return match;
    }
    return availableStudents[0];
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStudentSelect = (student: StudentOption) => {
    setCurrentStudent(student);
    setDropdownOpen(false);
    toast.success(`Switched active student to ${student.firstName} ${student.lastName}`);
    onSelectStudent?.(student);
  };

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "BH";

  const isLight = theme === "blue";

  const studentInitials = `${currentStudent.firstName[0] || "A"}${currentStudent.lastName[0] || "H"}`.toUpperCase();

  return (
    <div
      className={`relative z-40 shrink-0 overflow-visible border-b transition-colors duration-[300ms] ease-in-out ${
        isLight ? "border-slate-200" : "border-white/10"
      }`}
      style={{ minHeight: "64px" }}
    >
      {/* Dark background panel with Navigational Sextant Artwork */}
      <div 
        className="absolute inset-0 transition-opacity duration-[300ms] ease-in-out pointer-events-none overflow-hidden bg-[#06172F]"
        style={{ opacity: isLight ? 0 : 1 }}
      >
        <img
          src="/sextant-header-bg.png"
          alt="Navigational Sextant & Chart"
          className="w-full h-full object-cover object-right sm:object-[90%_center] scale-90 sm:scale-95 origin-right opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06172F] via-[#06172F]/50 to-transparent" />
      </div>
      {/* Light background panel */}
      <div 
        className="absolute inset-0 transition-opacity duration-[300ms] ease-in-out pointer-events-none"
        style={{
          background: `linear-gradient(to right, #f8fafc 0%, #e2e8f0 40%, rgba(226,232,240,0.7) 70%, rgba(226,232,240,0.4) 100%), url('/compass-bg.jpg') center/cover no-repeat`,
          opacity: isLight ? 1 : 0,
        }}
      />

      <div className="relative z-40 flex items-center justify-between px-5 py-2.5 gap-4 overflow-visible">
        {/* Left: Student Name (Top) + Welcome Parent (Below) */}
        <div className="min-w-0 shrink-0">
          <h1 
            className={`text-sm sm:text-base font-bold tracking-wide truncate transition-colors duration-[300ms] ease-in-out ${isLight ? "text-slate-800" : "text-white"}`}
            style={{ fontFamily: "'Libre Baskerville', serif" }}
          >
            {`${currentStudent.firstName} ${currentStudent.lastName}`}
          </h1>
          <p className={`text-[11px] font-medium mt-0.5 transition-colors duration-[300ms] ease-in-out ${isLight ? "text-amber-800" : "text-amber-400"}`}>
            Welcome,{" "}
            {parentContactId ? (
              <Link href={`/contacts/${parentContactId}`} className="font-semibold underline hover:text-amber-500 transition-colors">
                {displayName}
              </Link>
            ) : (
              <span className="font-semibold">{displayName}</span>
            )}
          </p>
        </div>

        {/* ── Middle: Interactive Student Switcher Dropdown ───────────────── */}
        <div className="relative z-50 overflow-visible" ref={dropdownRef}>
          {/* Trigger Pill */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="rounded-xl border border-[#F5B544]/60 bg-[#07152B] hover:border-[#F5B544] px-2.5 py-1 flex items-center gap-2.5 transition-all shadow-md group cursor-pointer text-left"
          >
            {/* Student Avatar Circle */}
            <div className="w-8 h-8 rounded-full border border-[#F5B544] bg-[#0C1F3D] text-[#F5B544] font-bold text-[11px] flex items-center justify-center shrink-0 shadow-inner">
              {studentInitials}
            </div>

            {/* Student Details Stack */}
            <div className="space-y-0 min-w-[85px]">
              <p className="text-xs font-bold text-white leading-tight group-hover:text-amber-300 transition-colors">
                {currentStudent.firstName} {currentStudent.lastName}
              </p>
              <p className="text-[10px] text-blue-200/70 leading-tight">
                Student ID: {currentStudent.studentIdNumber || currentStudent.id}
              </p>
              <p className="text-[9px] text-blue-300/60 leading-tight font-medium">
                Current Student
              </p>
            </div>

            {/* Right Divider & Switch Icons */}
            <div className="flex items-center gap-1 pl-1 border-l border-white/10 shrink-0">
              <ArrowLeftRight className="h-3 w-3 text-[#F5B544]" />
              <ChevronDown className={`h-3 w-3 text-[#F5B544]/80 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[999] w-72 rounded-2xl border border-[#18365D] bg-[#07152B] shadow-2xl p-2 space-y-1 backdrop-blur-xl animate-in fade-in-50 zoom-in-95">
              <p className="text-[10px] font-extrabold tracking-widest text-blue-300/60 uppercase px-3 py-1.5">
                SELECT STUDENT
              </p>

              {/* Student Items List */}
              <div className="space-y-1">
                {availableStudents.map((st) => {
                  const isCurrent = String(st.id) === String(currentStudent.id);
                  const stInitials = `${st.firstName[0] || ""}${st.lastName[0] || ""}`.toUpperCase();

                  return (
                    <div
                      key={st.id}
                      onClick={() => handleStudentSelect(st)}
                      className={`rounded-xl p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                        isCurrent
                          ? "border border-[#F5B544]/40 bg-white/[0.04]"
                          : "border border-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCurrent
                            ? "border border-[#F5B544] bg-[#0C1F3D] text-[#F5B544]"
                            : "border border-blue-400/30 bg-[#0C1F3D] text-blue-300"
                        }`}>
                          {stInitials}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate leading-tight ${isCurrent ? "text-[#F5B544]" : "text-white"}`}>
                            {st.firstName} {st.lastName}
                          </p>
                          <p className="text-[10px] text-blue-200/60 leading-tight pt-0.5">
                            ID: {st.studentIdNumber || st.id}
                          </p>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#F5B544]/15 text-[#F5B544] border border-[#F5B544]/20">
                            Viewing
                          </span>
                          <Check className="h-4 w-4 text-[#F5B544] stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Another Student Option */}
              <div className="border-t border-white/5 pt-1 mt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    if (onAddStudent) {
                      onAddStudent();
                    } else {
                      toast.info("Add Student flow initiated. Contact advocate or submit enrollment form.");
                    }
                  }}
                  className="w-full rounded-xl hover:bg-white/[0.04] p-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 flex items-center justify-center shrink-0">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-300 leading-tight">
                      Add Another Student
                    </p>
                    <p className="text-[10px] text-blue-200/50 leading-tight pt-0.5">
                      Add a new student profile
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className={`relative w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden transition-all duration-[3000ms] ease-in-out ${
              isLight 
                ? "border-slate-350 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400" 
                : "border-white/20 bg-white/5 text-white/70 hover:text-white hover:border-amber-400/50"
            }`}
            title={isLight ? "Dark mode" : "Light mode"}
          >
            {/* Sun Icon (rises and rotates in light mode) */}
            <Sun className={`absolute h-4 w-4 text-amber-500 transition-all duration-[3000ms] ease-in-out transform ${
              isLight 
                ? "translate-y-0 rotate-0 scale-100 opacity-100" 
                : "translate-y-6 -rotate-90 scale-50 opacity-0"
            }`} />
            {/* Moon Icon (sets and rotates in dark mode) */}
            <Moon className={`absolute h-4 w-4 text-indigo-400 transition-all duration-[3000ms] ease-in-out transform ${
              !isLight 
                ? "translate-y-0 rotate-0 scale-100 opacity-100" 
                : "-translate-y-6 rotate-90 scale-50 opacity-0"
            }`} />
          </button>

          {/* Schedule Meeting Button */}
          <button
            onClick={onOpenScheduler}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg transition-all ${
              isLight 
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10" 
                : "bg-amber-500 hover:bg-amber-400 text-[#071422] shadow-amber-500/20"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Schedule Meeting
          </button>

          {/* User Avatar Circle */}
          <div className="relative group">
            <button className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all shadow-md ${
              isLight 
                ? "bg-amber-500/10 border-amber-500 text-amber-700 hover:bg-amber-500/20" 
                : "bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30"
            }`}>
              {initials}
            </button>

            {/* Dropdown Menu */}
            <div className={`absolute right-0 top-full mt-1.5 w-44 border rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 p-1 ${
              isLight ? "bg-white border-slate-200" : "bg-[#0d1b2a] border-white/15"
            }`}>
              <button
                onClick={onLogout}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  isLight 
                    ? "text-slate-650 hover:text-slate-900 hover:bg-slate-50" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <LogOut className="h-3.5 w-3.5 text-red-500" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
