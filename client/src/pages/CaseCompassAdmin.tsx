import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Users, Sparkles, Eye, ShieldCheck, Settings } from "lucide-react";
import CaseCompassCard from "@/components/CaseCompassCard";
import StudentCaseCompassConsole from "@/components/students/compass/StudentCaseCompassConsole";
import CompassSettingsModal from "@/components/students/compass/CompassSettingsModal";
import PageIdBadge from "@/components/PageIdBadge";

export default function CaseCompassAdmin() {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<"console" | "dial">("console");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Query contacts list
  const { data: contactsList } = trpc.contacts.list.useQuery();
  const { data: portalClients } = trpc.caseCompass.portalClients.useQuery();

  // Normalize students from contacts list
  const students = useMemo(() => {
    if (!contactsList) return [];
    return contactsList
      .filter((c: any) => c.role === "student" || c.schoolName || c.gradeLevel || c.planType || c.caseId)
      .map((c: any) => ({
        id: c.id,
        name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || `Student #${c.id}`,
        caseId: c.caseId || `CASE-${c.id}`,
      }));
  }, [contactsList]);

  // Select first student by default
  useEffect(() => {
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const activeStudent = students.find((s) => s.id === selectedStudentId) || (students[0] ?? null);

  const { data: transcriptsData } = trpc.caseCompass.getAvailableTranscripts.useQuery(
    { studentId: activeStudent?.id || 0 },
    { enabled: !!activeStudent?.id }
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 select-none text-[#F7F2E8]">
      <PageIdBadge id="PG-025" name="Case Compass Console" />

      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3A2C18]/80">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c2449] to-[#030e20] border border-[#C5A059]/60 text-[#F1CB6C] shadow-lg">
            <Compass className="h-6 w-6 animate-[spin_24s_linear_infinite]" />
          </div>
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#F7F2E8]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Waypoint Case Compass™ Console
            </h1>
            <p className="text-xs text-[#93AECD] mt-0.5">
              Live case trajectory, AI-assisted update synthesis, and client portal synchronization
            </p>
          </div>
        </div>

        {/* View Mode Switcher and Settings Shortcut */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowSettingsModal(true)}
            className="border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs px-3 py-1.5 flex items-center gap-1.5"
            title="Inspect transcript connections, intake handoff, and meeting sources"
          >
            <Settings className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Settings & Sources</span>
          </Button>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#020A17] border border-[#3A2C18]">
            <button
              onClick={() => setActiveMode("console")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeMode === "console"
                  ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 shadow-sm"
                  : "text-[#93AECD] hover:text-[#F7F2E8]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F1CB6C]" />
              Internal Management
            </button>
            <button
              onClick={() => setActiveMode("dial")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeMode === "dial"
                  ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 shadow-sm"
                  : "text-[#93AECD] hover:text-[#F7F2E8]"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              Client Portal Dial View
            </button>
          </div>
        </div>
      </div>

      {/* Student Selector Card */}
      <Card className="p-4 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-md text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#FFE394]">
            <Users className="h-4 w-4 text-[#C5A059]" />
            <span>Select Student Case Dossier:</span>
          </div>
          <select
            className="w-full sm:w-80 bg-[#020A17] border border-[#3A2C18] rounded-lg px-3 py-2 text-xs text-[#F7F2E8] focus:border-[#C5A059] focus:outline-none"
            value={selectedStudentId ?? ""}
            onChange={(e) => setSelectedStudentId(Number(e.target.value) || null)}
          >
            <option value="">— Choose a student case —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.caseId})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Main Content Area */}
      {activeStudent ? (
        activeMode === "console" ? (
          <div className="rounded-xl border border-[#3A2C18]/60 bg-[#030e20]/60 p-2 sm:p-4">
            <StudentCaseCompassConsole
              studentId={activeStudent.id}
              studentName={activeStudent.name}
              caseId={activeStudent.caseId}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#020A17]/80 border border-blue-900/40 text-xs text-[#93AECD] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Preserved Client Portal Digital Compass Dial (100% Original Geometry, Needle Kinematics & Animations)
              </span>
              <span className="font-mono text-[#FFE394]">Active Case: {activeStudent.caseId}</span>
            </div>
            {/* Visual Interactive Case Compass Card - 100% Untouched */}
            <div className="max-w-4xl mx-auto">
              <CaseCompassCard caseId={activeStudent.caseId} isAdminView={true} />
            </div>
          </div>
        )
      ) : (
        <Card className="p-8 text-center bg-[#05142B] border border-[#3A2C18] rounded-xl text-xs text-[#93AECD]">
          Please select a student above to manage their Case Compass.
        </Card>
      )}

      {/* Compass Settings & Sources Modal */}
      <CompassSettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        studentId={activeStudent?.id}
        studentName={activeStudent?.name}
        transcripts={transcriptsData?.sessions || []}
      />
    </div>
  );
}
