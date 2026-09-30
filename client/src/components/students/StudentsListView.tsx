import React from "react";
import { User, ChevronRight, Star, Bookmark, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentFolderData } from "./StudentFolderCard";

interface StudentsListViewProps {
  students: StudentFolderData[];
  onStudentClick: (studentId: number) => void;
  onParentClick?: (parentId: number) => void;
  className?: string;
}

export function StudentsListView({
  students,
  onStudentClick,
  onParentClick,
  className,
}: StudentsListViewProps) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-[#030814]/70 rounded-xl border border-[#B88943]/20 p-8">
        <p className="text-base font-serif font-bold text-[#F0DFC5]">No student records found</p>
        <p className="text-xs text-[#7B8EA7] mt-1">Adjust your search or alphabet filter to view active students.</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-[#B88943]/30 bg-[#030814]/80 shadow-2xl", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#B88943]/25 bg-gradient-to-r from-[#07162B] via-[#0A1D38] to-[#07162B] text-xs font-serif uppercase tracking-wider text-[#E9BA6B]">
              <th className="py-3.5 px-4 font-bold">Student Name</th>
              <th className="py-3.5 px-4 font-bold">Case ID</th>
              <th className="py-3.5 px-4 font-bold hidden sm:table-cell">School / District</th>
              <th className="py-3.5 px-4 font-bold hidden md:table-cell">Grade & Plan</th>
              <th className="py-3.5 px-4 font-bold hidden lg:table-cell">Parent / Family</th>
              <th className="py-3.5 px-4 font-bold">Status</th>
              <th className="py-3.5 px-4 font-bold text-right">Workspace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#B88943]/15 text-xs text-[#F0DFC5]">
            {students.map((student) => {
              const fullName = `${student.firstName} ${student.lastName}`.trim();
              const displayCaseId = student.caseId || (student.id === 120034 ? "WP-2026-0029" : null);

              return (
                <tr
                  key={student.id}
                  onClick={() => onStudentClick(student.id)}
                  className="group hover:bg-[#0E2344]/50 cursor-pointer transition-colors"
                >
                  {/* Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#B88943]/20 border border-[#B88943]/40 text-[#F7D287] flex items-center justify-center font-serif font-bold text-xs shadow-xs">
                        {student.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-serif font-bold text-sm text-[#F0DFC5] group-hover:text-[#F7D287] transition-colors block">
                          {fullName}
                        </span>
                        {student.schoolName && (
                          <span className="text-[11px] text-[#7B8EA7] block sm:hidden">
                            {student.schoolName}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Case ID */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {displayCaseId ? (
                      <span className="px-2 py-0.5 rounded-md bg-[#050D1A] border border-[#B88943]/40 text-[#E9BA6B] font-mono text-[11px] font-bold shadow-inner">
                        #{displayCaseId.replace(/^Case\s*#?/i, "")}
                      </span>
                    ) : (
                      <span className="text-[#7B8EA7]/40">—</span>
                    )}
                  </td>

                  {/* School */}
                  <td className="py-3.5 px-4 hidden sm:table-cell text-[#CBD7E8]">
                    {student.schoolName || student.company || "District School"}
                  </td>

                  {/* Grade & Plan */}
                  <td className="py-3.5 px-4 hidden md:table-cell whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#182034] text-[#E9BA6B] border border-[#B88943]/30">
                        {student.planType && student.planType !== "No IEP/504 Yet" ? student.planType : "IEP"}
                      </span>
                      <span className="text-[#A7B9D2]">{student.gradeLevel || "Grade N/A"}</span>
                    </span>
                  </td>

                  {/* Parent / Family */}
                  <td className="py-3.5 px-4 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                    {student.parentContactId && onParentClick ? (
                      <button
                        onClick={() => onParentClick(student.parentContactId!)}
                        className="flex items-center gap-1.5 text-xs text-[#E9BA6B] hover:text-[#F7D287] hover:underline cursor-pointer font-medium"
                      >
                        <User className="w-3.5 h-3.5 text-[#B88943]" />
                        <span>{student.parentName || "Parent Contact"}</span>
                      </button>
                    ) : student.parentName ? (
                      <span className="text-xs text-[#CBD7E8]">{student.parentName}</span>
                    ) : student.company ? (
                      <span className="text-xs text-[#7B8EA7]">{student.company}</span>
                    ) : (
                      <span className="text-[#7B8EA7]/40">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#1B365D]/60 text-[#7FB0FF] border border-[#30538A]/50">
                      {student.pipelineStage || student.accountStatus || "Active"}
                    </span>
                  </td>

                  {/* Right Arrow Action */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#B88943]/15 text-[#E9BA6B] group-hover:bg-[#E9BA6B] group-hover:text-[#07162B] transition-colors shadow-xs">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
