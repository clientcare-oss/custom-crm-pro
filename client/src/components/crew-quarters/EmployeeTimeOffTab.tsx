import { useState } from "react";
import PageIdBadge from "@/components/PageIdBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plane,
  Palmtree,
  CalendarCheck,
  CalendarClock,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  HeartPulse,
  SunMedium,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface TimeOffItem {
  id: string;
  type: "Vacation / PTO" | "Sick Leave" | "Personal" | "Bereavement" | "Training";
  startDate: string;
  endDate: string;
  returnDate: string;
  days: number;
  status: "Approved" | "Pending" | "Denied";
  notes?: string;
  coverageAdvocate?: string;
}

const INITIAL_REQUESTS: TimeOffItem[] = [
  {
    id: "to-1",
    type: "Vacation / PTO",
    startDate: "Oct 10, 2026",
    endDate: "Oct 14, 2026",
    returnDate: "Oct 15, 2026",
    days: 4,
    status: "Approved",
    notes: "Fall family vacation",
    coverageAdvocate: "Wyatt Smith",
  },
  {
    id: "to-2",
    type: "Personal",
    startDate: "Nov 25, 2026",
    endDate: "Nov 27, 2026",
    returnDate: "Nov 30, 2026",
    days: 3,
    status: "Approved",
    notes: "Thanksgiving personal holiday",
    coverageAdvocate: "Abby Miller",
  },
  {
    id: "to-3",
    type: "Training",
    startDate: "Dec 04, 2026",
    endDate: "Dec 05, 2026",
    returnDate: "Dec 08, 2026",
    days: 2,
    status: "Pending",
    notes: "National IEP Law Symposium",
    coverageAdvocate: "Byron Honea",
  },
];

const COMPANY_HOLIDAYS_2026 = [
  { name: "New Year's Day", date: "Jan 1, 2026" },
  { name: "Martin Luther King Jr. Day", date: "Jan 19, 2026" },
  { name: "Memorial Day", date: "May 25, 2026" },
  { name: "Juneteenth", date: "Jun 19, 2026" },
  { name: "Independence Day", date: "Jul 4, 2026" },
  { name: "Labor Day", date: "Sep 7, 2026" },
  { name: "Thanksgiving Day & Friday", date: "Nov 26–27, 2026" },
  { name: "Christmas Eve & Christmas", date: "Dec 24–25, 2026" },
];

export default function EmployeeTimeOffTab() {
  const [requests, setRequests] = useState<TimeOffItem[]>(INITIAL_REQUESTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "Vacation / PTO" as TimeOffItem["type"],
    startDate: "",
    endDate: "",
    returnDate: "",
    coverageAdvocate: "Wyatt Smith",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      toast.error("Please specify both start and end dates");
      return;
    }

    const newReq: TimeOffItem = {
      id: `to-${Date.now()}`,
      type: formData.type,
      startDate: formData.startDate,
      endDate: formData.endDate,
      returnDate: formData.returnDate || formData.endDate,
      days: 3,
      status: "Pending",
      notes: formData.notes,
      coverageAdvocate: formData.coverageAdvocate,
    };

    setRequests([newReq, ...requests]);
    setModalOpen(false);
    toast.success("Time off request submitted for leadership review");
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#000d2b]/90 border border-blue-900/60 rounded-2xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">Time Off &amp; PTO Management</h2>
            <PageIdBadge id="PG-038-PTO" name="Time Off & PTO" inline />
          </div>
          <p className="text-xs text-blue-200/70">
            Submit leave requests, track PTO balances, and review upcoming practice holidays.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl py-2 px-4 gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Request Time Off</span>
        </Button>
      </div>

      {/* PTO Balance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "PTO Remaining", val: "11 Days", sub: "of 14 total allocated", icon: Palmtree, color: "text-amber-400" },
          { label: "Sick Leave", val: "4 Days", sub: "5 total allocated", icon: HeartPulse, color: "text-rose-400" },
          { label: "Floating Holidays", val: "2 Days", sub: "Use before Dec 31", icon: SunMedium, color: "text-sky-400" },
          { label: "Used This Year", val: "5 Days", sub: "Approved & taken", icon: CalendarCheck, color: "text-emerald-400" },
        ].map((stat, idx) => (
          <Card key={idx} className="rounded-2xl border border-blue-900/60 bg-[#000821] p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="my-2">
              <div className="text-2xl font-black text-white font-mono">{stat.val}</div>
              <div className="text-[11px] text-blue-300/70">{stat.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Grid: My Requests + Company Holiday Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leave Requests Table (2 Cols) */}
        <Card className="lg:col-span-2 rounded-2xl border border-blue-900/60 bg-[#000821] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-sky-400" />
              <span>Leave Request History</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{requests.length} Requests</span>
          </div>

          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 hover:border-blue-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{req.type}</span>
                    <span className="text-slate-400">· {req.days} days</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        req.status === "Approved"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : req.status === "Pending"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="text-slate-300 font-mono">
                    {req.startDate} – {req.endDate}
                  </div>

                  {req.returnDate && (
                    <div className="text-[11px] text-amber-300/90 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>First day back: <strong className="text-amber-200">{req.returnDate}</strong></span>
                    </div>
                  )}

                  {req.notes && (
                    <p className="text-[11px] text-slate-400 italic">“{req.notes}”</p>
                  )}
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block">Coverage Assigned:</span>
                  <span className="font-semibold text-sky-300">{req.coverageAdvocate || "Team Pool"}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 2026 Company Holidays (1 Col) */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>2026 Office Holidays</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900 text-blue-200 font-bold">
              Paid Closed
            </span>
          </div>

          <div className="space-y-2">
            {COMPANY_HOLIDAYS_2026.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-[#00102b] border border-blue-950 text-xs"
              >
                <span className="text-white font-medium">{h.name}</span>
                <span className="text-slate-400 font-mono text-[11px]">{h.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Request Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-[#000d2b] border border-blue-900/80 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Plane className="w-4 h-4 text-amber-400" />
              <span>Submit Time Off Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Submit your dates for review. An email notification will be routed to practice leadership.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Leave Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as any })}
              >
                <SelectTrigger className="bg-[#001438] border-blue-900 text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#00102b] border-blue-900 text-white text-xs">
                  <SelectItem value="Vacation / PTO">Vacation / PTO</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Personal">Personal Day</SelectItem>
                  <SelectItem value="Training">Conference / Professional Training</SelectItem>
                  <SelectItem value="Bereavement">Bereavement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-[#001438] border-blue-900 text-xs text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="bg-[#001438] border-blue-900 text-xs text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">First Day Back in Office</Label>
              <Input
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                className="bg-[#001438] border-blue-900 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Designated Coverage Advocate</Label>
              <Select
                value={formData.coverageAdvocate}
                onValueChange={(v) => setFormData({ ...formData, coverageAdvocate: v })}
              >
                <SelectTrigger className="bg-[#001438] border-blue-900 text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#00102b] border-blue-900 text-white text-xs">
                  <SelectItem value="Byron Honea">Byron Honea (Lead Advocate)</SelectItem>
                  <SelectItem value="Wyatt Smith">Wyatt Smith</SelectItem>
                  <SelectItem value="Sarah Jenkins">Sarah Jenkins</SelectItem>
                  <SelectItem value="Abby Miller">Abby Miller</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Notes / Handover Details</Label>
              <Textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Important client milestones or files covered during this window..."
                className="bg-[#001438] border-blue-900 text-xs text-white"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
