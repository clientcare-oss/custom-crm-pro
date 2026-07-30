import React from "react";
import { GraduationCap, Plus, ChevronRight, School, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StudentItem {
  id: number;
  firstName: string;
  lastName: string;
  gradeLevel?: string;
  schoolName?: string;
  diagnosis?: string;
  caseId?: string;
}

interface ContactStudentsTabProps {
  students?: StudentItem[];
  onSelectStudent?: (studentId: number) => void;
  onAddStudent?: () => void;
}

export default function ContactStudentsTab({
  students = [],
  onSelectStudent,
  onAddStudent,
}: ContactStudentsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Linked Students</h3>
        </div>
        <Button onClick={onAddStudent} size="sm" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Student
        </Button>
      </div>

      {students.length === 0 ? (
        <div className="text-center p-8 bg-[#0A1628]/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
          No students linked to this parent contact yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {students.map((student) => (
            <Card
              key={student.id}
              onClick={() => onSelectStudent?.(student.id)}
              className="border-slate-800 bg-[#0A1628]/90 text-slate-100 hover:border-amber-400/50 cursor-pointer transition-all group"
            >
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {student.firstName} {student.lastName}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                      <School className="w-3 h-3 text-slate-500" />
                      {student.schoolName || "School Not Set"} {student.gradeLevel ? `• ${student.gradeLevel}` : ""}
                    </p>
                    {student.caseId && (
                      <Badge className="mt-1.5 bg-slate-800 text-amber-400 border-amber-400/30 text-[10px]">
                        Case: {student.caseId}
                      </Badge>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
