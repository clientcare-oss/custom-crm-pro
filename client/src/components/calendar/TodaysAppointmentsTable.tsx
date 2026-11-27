import { useState, useMemo } from "react";
import { formatDualTimes } from "@shared/timezones";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, Users, MoreHorizontal, ArrowRightLeft } from "lucide-react";

export interface CalendarAppointment {
  id: number | string;
  originalId?: number;
  clientId?: number | null;
  caseId?: string | null;
  title: string;
  description?: string | null;
  startTime: string | Date;
  endTime: string | Date;
  location?: string | null;
  videoLink?: string | null;
  clientMeetingLink?: string | null;
  meetingType?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  studentName?: string | null;
  status: string;
  clientTimeZone?: string | null;
  originalTimeZone?: string | null;
  assignedAdvocateName?: string | null;
  // Proposed Meeting & Candidate Hold properties
  isHold?: boolean;
  proposedMeetingId?: number | null;
  candidateSlotId?: number | null;
  siblingLabel?: string | null;
  totalSiblingSlots?: number | null;
  slotOrder?: number | null;
  waitingOn?: string | null;
  parentPreferred?: boolean | null;
  meetingStatus?: string | null;
}

interface TodaysAppointmentsTableProps {
  appointments: CalendarAppointment[];
  selectedDate: Date;
  loggedInAdvocateName: string;
  onEventClick: (apt: CalendarAppointment) => void;
  onReassignClick: (apt: CalendarAppointment) => void;
  activeTab?: "my" | "all";
  onTabChange?: (tab: "my" | "all") => void;
}

function matchAdvocate(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a === b) return true;
  return a.split(" ")[0] === b.split(" ")[0];
}

function getAvatarProps(name: string) {
  const clean = (name || "Student").trim();
  const parts = clean.split(" ");
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : clean.slice(0, 2).toUpperCase();

  // Consistent color mapping based on name
  const lower = clean.toLowerCase();
  if (lower.includes("emma")) {
    return { initials, bg: "bg-[#7c3aed] text-white" }; // Purple
  }
  if (lower.includes("liam")) {
    return { initials, bg: "bg-[#0284c7] text-white" }; // Sky Blue
  }
  if (lower.includes("ava")) {
    return { initials, bg: "bg-[#db2777] text-white" }; // Pink / Rose
  }
  if (lower.includes("noah")) {
    return { initials, bg: "bg-[#10b981] text-slate-950 font-bold" }; // Emerald
  }

  // Hash fallback
  const colors = [
    "bg-[#7c3aed] text-white",
    "bg-[#0284c7] text-white",
    "bg-[#db2777] text-white",
    "bg-[#10b981] text-slate-950",
    "bg-[#f59e0b] text-slate-950",
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash += clean.charCodeAt(i);
  return { initials, bg: colors[hash % colors.length] };
}

export default function TodaysAppointmentsTable({
  appointments,
  selectedDate,
  loggedInAdvocateName,
  onEventClick,
  onReassignClick,
  activeTab: controlledTab,
  onTabChange,
}: TodaysAppointmentsTableProps) {
  const [internalTab, setInternalTab] = useState<"my" | "all">("my");
  const tab = controlledTab ?? internalTab;
  const setTab = (t: "my" | "all") => {
    onTabChange?.(t);
    setInternalTab(t);
  };

  const selectedDateStr = useMemo(() => {
    return new Date(selectedDate).toISOString().split("T")[0];
  }, [selectedDate]);

  // Appointments for the selected day (not cancelled), sorted chronologically by startTime
  const dayAppointments = useMemo(() => {
    return appointments
      .filter((apt) => {
        const d = new Date(apt.startTime).toISOString().split("T")[0];
        return d === selectedDateStr && apt.status !== "Cancelled";
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [appointments, selectedDateStr]);

  const myAppointments = useMemo(() => {
    return dayAppointments.filter((apt) => {
      const advocate = apt.assignedAdvocateName || "Byron Honea"; // Legacy fallback
      return matchAdvocate(advocate, loggedInAdvocateName);
    });
  }, [dayAppointments, loggedInAdvocateName]);

  const displayList = tab === "my" ? myAppointments : dayAppointments;

  return (
    <div className="adm-panel-card rounded-[20px] p-4 sm:p-5 overflow-hidden">
      <div aria-hidden="true" className="adm-rim-glint-top" />
      <div aria-hidden="true" className="adm-rim-glint-bottom" />
      {/* Header: Title + Inline Tabs */}
      <div className="flex flex-wrap items-center gap-6 pb-4 border-b border-[#8a7052]/40">
        <h2 className="text-xl font-serif font-bold text-[#FAF6EC] tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
          Today's Appointments
        </h2>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setTab("my")}
            className={`text-sm font-semibold transition-all relative pb-1.5 cursor-pointer ${
              tab === "my"
                ? "text-[#FAF6EC]"
                : "text-[#9FB1C8] hover:text-[#FAF6EC]"
            }`}
          >
            My Appointments ({myAppointments.length})
            {tab === "my" && <span className="adm-pipe-tab-glow" />}
          </button>

          <button
            type="button"
            onClick={() => setTab("all")}
            className={`text-sm font-semibold transition-all relative pb-1.5 cursor-pointer ${
              tab === "all"
                ? "text-[#FAF6EC]"
                : "text-[#9FB1C8] hover:text-[#FAF6EC]"
            }`}
          >
            All Appointments ({dayAppointments.length})
            {tab === "all" && <span className="adm-pipe-tab-glow" />}
          </button>
        </div>
      </div>

      {/* Table matching Admiralty realistic kit */}
      {displayList.length === 0 ? (
        <div className="py-10 text-center text-[#9FB1C8] text-sm">
          No {tab === "my" ? "personal" : "team"} appointments scheduled for this day.
        </div>
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#8a7052]/40 text-[#E9CFA0] font-semibold text-[11px] font-mono uppercase tracking-wider">
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Meeting</th>
                <th className="py-3 px-3">Advocate</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#8a7052]/25 font-medium text-[#FAF6EC]">
              {displayList.map((apt) => {
                const startTimeFormatted = new Date(apt.startTime).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
                const studentName = apt.studentName || apt.parentName || "Emma Carter";
                const { initials, bg } = getAvatarProps(studentName);
                const advocateDisplay = (apt.assignedAdvocateName || "Byron Honea").split(" ")[0];
                const isNeedsCoverage = apt.status === "Needs Coverage";

                return (
                  <tr
                    key={apt.id}
                    onClick={() => onEventClick(apt)}
                    className="hover:bg-[#11243e]/65 transition-colors cursor-pointer group"
                  >
                    {/* Time */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono font-semibold text-[#ECC97B]">
                      {startTimeFormatted}
                    </td>

                    {/* Student with Circle Avatar */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 font-serif border border-[#8a7052]/65 ${bg}`}
                        >
                          {initials}
                        </div>
                        <span className="font-serif font-bold text-[#FAF6EC]">{studentName}</span>
                      </div>
                    </td>

                    {/* Meeting */}
                    <td className="py-3 px-3 whitespace-nowrap text-[#D4DFEE] font-normal">
                      {apt.title}
                    </td>

                    {/* Advocate */}
                    <td className="py-3 px-3 whitespace-nowrap text-[#B8C7DC] font-normal">
                      {advocateDisplay}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {isNeedsCoverage ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-rose-500/45 bg-rose-950/65 text-rose-300 font-semibold text-xs font-mono">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Needs Coverage</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-emerald-500/35 bg-emerald-500/15 text-emerald-300 font-semibold text-xs font-mono">
                          <div className="w-3.5 h-3.5 rounded-[4px] bg-emerald-500 flex items-center justify-center text-slate-950">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>Confirmed</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {isNeedsCoverage && (
                          <button
                            type="button"
                            onClick={() => onReassignClick(apt)}
                            className="adm-cal-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[#E8DEC8] hover:text-[#FAF6EC] font-semibold text-xs cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-[#ECC97B]" />
                            <span>Reassign</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onEventClick(apt)}
                          className="adm-cal-pill h-7 w-8 rounded-lg text-[#D4DFEE] hover:text-[#FAF6EC] flex items-center justify-center cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4 text-[#ECC97B]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
