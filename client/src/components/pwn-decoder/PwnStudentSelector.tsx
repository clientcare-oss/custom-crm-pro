import React, { useState, useMemo } from "react";
import { Search, UserCheck, ChevronDown, RefreshCw, History, GraduationCap, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StudentHeaderInfo } from "./types";

interface PwnStudentSelectorProps {
  contacts: any[] | undefined;
  isLoading: boolean;
  selectedStudent: StudentHeaderInfo | null;
  onSelectStudent: (student: StudentHeaderInfo) => void;
  onClearStudent: () => void;
  previousReviews?: any[];
  onSelectPreviousReview?: (reviewId: number) => void;
}

export const PwnStudentSelector: React.FC<PwnStudentSelectorProps> = ({
  contacts,
  isLoading,
  selectedStudent,
  onSelectStudent,
  onClearStudent,
  previousReviews = [],
  onSelectPreviousReview,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Filter students matching query
  const studentList = useMemo(() => {
    if (!contacts) return [];
    return contacts
      .map((c: any) => ({
        id: c.id,
        name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || `Student #${c.id}`,
        firstName: c.firstName,
        lastName: c.lastName,
        school: c.schoolName || null,
        district: c.countyDistrict || null,
        state: c.state || "GA",
        gradeLevel: c.gradeLevel || null,
      }))
      .filter((s) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.school && s.school.toLowerCase().includes(q)) ||
          (s.district && s.district.toLowerCase().includes(q))
        );
      });
  }, [contacts, searchTerm]);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-300">
            1
          </span>
          Step 1 — Select Student
        </span>
        {selectedStudent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearStudent}
            className="h-7 text-xs text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Switch Student
          </Button>
        )}
      </div>

      {!selectedStudent ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder={isLoading ? "Loading students..." : "Search students by name, school, or district..."}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              disabled={isLoading}
              className="pl-10 pr-4 py-2.5 w-full bg-[#000820] border-slate-700/80 text-white placeholder:text-slate-500 rounded-xl text-sm focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
            />
          </div>

          {isOpen && (
            <div className="absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-700/80 bg-[#000820] shadow-2xl p-1.5 space-y-1 backdrop-blur-md">
              {studentList.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  {isLoading ? "Searching student records..." : "No matching students found."}
                </div>
              ) : (
                studentList.slice(0, 15).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectStudent(s);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-amber-500/10 hover:border-amber-500/20 border border-transparent transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-100 group-hover:text-amber-300">
                        {s.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        {s.school && <span>{s.school}</span>}
                        {s.district && <span>• {s.district}</span>}
                        {s.state && <span>• {s.state}</span>}
                      </div>
                    </div>
                    <UserCheck className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* Selected Student Header - Clean, Focused, No clutter */
        <div className="rounded-xl border border-amber-500/30 bg-[#000820] p-4 shadow-lg shadow-black/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white tracking-tight">
                  {selectedStudent.name}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
                  Active Student
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                {selectedStudent.school && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-400/80" />
                    {selectedStudent.school}
                  </span>
                )}
                {selectedStudent.district && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Building2 className="h-3.5 w-3.5 text-amber-400/80" />
                    {selectedStudent.district}
                  </span>
                )}
                {selectedStudent.state && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-amber-400/80" />
                    {selectedStudent.state}
                  </span>
                )}
              </div>
            </div>

            {/* Previous Reviews Quick Switcher */}
            {previousReviews.length > 0 && onSelectPreviousReview && (
              <div className="flex items-center gap-2 self-start sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                <History className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Previous Reviews ({previousReviews.length}):</span>
                <select
                  aria-label="Select a previous PWN review for this student"
                  onChange={(e) => {
                    const revId = Number(e.target.value);
                    if (revId) onSelectPreviousReview(revId);
                  }}
                  defaultValue=""
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="" disabled>Select past review...</option>
                  {previousReviews.map((r) => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.createdAt).toLocaleDateString()} — {r.documentationStrength || "Review"} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
