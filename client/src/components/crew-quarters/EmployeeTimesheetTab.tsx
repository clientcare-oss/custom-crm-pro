import { useState } from "react";
import PageIdBadge from "@/components/PageIdBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Timer,
  Clock,
  Plus,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface TimeEntry {
  id: string;
  date: string;
  student: string;
  category: "IEP Meeting" | "Document Review" | "Parent Strategy" | "Admin";
  hours: number;
  billable: boolean;
  notes: string;
}

const SAMPLE_ENTRIES: TimeEntry[] = [
  { id: "e-1", date: "Sep 29, 2026", student: "Emma Carter", category: "IEP Meeting", hours: 2.0, billable: true, notes: "Annual IEP ARD meeting attendance with school psychologist" },
  { id: "e-2", date: "Sep 29, 2026", student: "Noah Davis", category: "Parent Strategy", hours: 1.0, billable: true, notes: "Post-evaluation debrief with mother and goal formulation" },
  { id: "e-3", date: "Sep 28, 2026", student: "Liam Brooks", category: "Document Review", hours: 2.5, billable: true, notes: "Comparative review of previous 504 plan vs current draft" },
  { id: "e-4", date: "Sep 28, 2026", student: "General Practice", category: "Admin", hours: 1.5, billable: false, notes: "Internal team huddle and state complaint SOP training" },
  { id: "e-5", date: "Sep 27, 2026", student: "Ava Mitchell", category: "Document Review", hours: 3.0, billable: true, notes: "PWN analysis and formal dispute letter drafting" },
];

export default function EmployeeTimesheetTab() {
  const [entries, setEntries] = useState<TimeEntry[]>(SAMPLE_ENTRIES);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    student: "",
    category: "IEP Meeting" as TimeEntry["category"],
    hours: 1.0,
    billable: true,
    notes: "",
  });

  const totalHours = entries.reduce((acc, curr) => acc + curr.hours, 0);
  const billableHours = entries.filter((e) => e.billable).reduce((acc, curr) => acc + curr.hours, 0);
  const targetHours = 40.0;
  const progressPct = Math.min(Math.round((totalHours / targetHours) * 100), 100);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.student || !newEntry.hours) {
      toast.error("Please enter student name and hours");
      return;
    }

    const created: TimeEntry = {
      id: `e-${Date.now()}`,
      date: newEntry.date,
      student: newEntry.student,
      category: newEntry.category,
      hours: Number(newEntry.hours),
      billable: newEntry.billable,
      notes: newEntry.notes,
    };

    setEntries([created, ...entries]);
    setShowLogModal(false);
    toast.success("Time entry recorded to your advocate ledger");
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#000d2b]/90 border border-blue-900/60 rounded-2xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">My Timesheet &amp; Hours Log</h2>
            <PageIdBadge id="PG-038-TIM" name="My Timesheet & Hours" inline />
          </div>
          <p className="text-xs text-blue-200/70">
            Log IEP meeting hours, document evaluations, and track weekly billable advocacy quotas.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowLogModal(true)}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl py-2 px-4 gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Log Time Entry</span>
        </Button>
      </div>

      {/* Progress & Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Hours Card with Progress Bar */}
        <Card className="md:col-span-2 rounded-2xl border border-blue-900/60 bg-[#000821] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>This Week's Logged Hours</span>
              <span className="font-mono text-sky-400 font-bold">{progressPct}% of 40h Goal</span>
            </div>
            <div className="text-3xl font-black text-white font-mono my-1.5">
              {totalHours.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 40.0 hrs</span>
            </div>
          </div>

          <div className="w-full bg-blue-950/80 rounded-full h-2.5 overflow-hidden border border-blue-900 mt-2">
            <div
              className="bg-gradient-to-r from-sky-500 to-amber-400 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </Card>

        {/* Billable Hours */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Billable Casework</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-emerald-300 font-mono">
              {billableHours.toFixed(1)} hrs
            </div>
            <div className="text-[11px] text-blue-300/70">Direct client service</div>
          </div>
        </Card>

        {/* Practice Admin */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Practice Admin</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-white font-mono">
              {(totalHours - billableHours).toFixed(1)} hrs
            </div>
            <div className="text-[11px] text-blue-300/70">Training &amp; team huddles</div>
          </div>
        </Card>
      </div>

      {/* Time Entries Table */}
      <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Recent Time Entries</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">{entries.length} logged items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-blue-900/40 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Student / Case</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-right">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-950/60 font-medium text-slate-200">
              {entries.map((item) => (
                <tr key={item.id} className="hover:bg-blue-950/40 transition-colors">
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-300">
                    {item.date}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-bold text-white">
                    {item.student}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                    {item.notes}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-amber-400">
                    {item.hours.toFixed(1)} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Time Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#000d2b] border border-blue-900/80 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-400" />
              <span>Log Time Entry</span>
            </h3>

            <form onSubmit={handleAddEntry} className="space-y-3">
              <div>
                <Label className="text-xs text-slate-300">Student or Case Name</Label>
                <Input
                  value={newEntry.student}
                  onChange={(e) => setNewEntry({ ...newEntry, student: e.target.value })}
                  placeholder="e.g. Emma Carter or General Practice"
                  className="bg-[#001438] border-blue-900 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-300">Hours</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="12"
                    value={newEntry.hours}
                    onChange={(e) => setNewEntry({ ...newEntry, hours: Number(e.target.value) })}
                    className="bg-[#001438] border-blue-900 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Date</Label>
                  <Input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="bg-[#001438] border-blue-900 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Notes / Tasks Completed</Label>
                <Input
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  placeholder="Summary of advocacy action..."
                  className="bg-[#001438] border-blue-900 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-950">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogModal(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
                >
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
