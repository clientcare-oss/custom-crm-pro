import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, Globe, ShieldCheck } from "lucide-react";
import {
  SIX_CORE_ZONES,
  getTimeInZone,
  formatPlainLanguageExplanation,
  getFriendlyTimeZoneName,
} from "@shared/timezones";

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillClient?: {
    id: number;
    name: string;
    studentName?: string;
    timeZone: string;
    city?: string;
    state?: string;
  } | null;
  viewerTimeZone?: string;
}

export function ScheduleMeetingModal({
  open,
  onOpenChange,
  prefillClient,
  viewerTimeZone = "America/New_York",
}: ScheduleMeetingModalProps) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<"details" | "confirm_tz">("details");

  const [title, setTitle] = useState("IEP Meeting");
  const [meetingType, setMeetingType] = useState("IEP Meeting");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [timeStr, setTimeStr] = useState("09:00");
  const [meetingTimeZone, setMeetingTimeZone] = useState(
    prefillClient?.timeZone || "America/Los_Angeles"
  );
  const [clientTimeZone, setClientTimeZone] = useState(
    prefillClient?.timeZone || "America/Los_Angeles"
  );
  const [schoolTimeZone, setSchoolTimeZone] = useState(
    prefillClient?.timeZone || "America/Los_Angeles"
  );
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/way-point-adv");

  // Create appointment mutation
  const bookMutation = trpc.appointments.book.useMutation();

  // Reset or initialize on open
  React.useEffect(() => {
    if (prefillClient?.timeZone) {
      setMeetingTimeZone(prefillClient.timeZone);
      setClientTimeZone(prefillClient.timeZone);
      setSchoolTimeZone(prefillClient.timeZone);
    }
    setStep("details");
  }, [prefillClient, open]);

  // Compute converted times
  const meetingDate = new Date(`${dateStr}T${timeStr}:00`);
  const viewerTime = getTimeInZone(viewerTimeZone, meetingDate);
  const clientTime = getTimeInZone(meetingTimeZone, meetingDate);

  const plainExplanation = formatPlainLanguageExplanation(
    meetingDate,
    meetingTimeZone,
    viewerTimeZone,
    "school"
  );

  const handleProceedToConfirm = () => {
    setStep("confirm_tz");
  };

  const handleFinalSave = async () => {
    try {
      // Calculate start and end times in UTC
      const [hours, minutes] = timeStr.split(":").map(Number);
      const start = new Date(dateStr);
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hr default

      await bookMutation.mutateAsync({
        title: `${prefillClient?.studentName || prefillClient?.name || "Student"} - ${title}`,
        meetingType,
        clientId: prefillClient?.id,
        studentName: prefillClient?.studentName || prefillClient?.name,
        startTime: start,
        endTime: end,
        location: meetingLink,
        clientTimeZone: meetingTimeZone,
        originalTimeZone: viewerTimeZone || "America/New_York",
      });

      toast.success("Meeting scheduled with confirmed time zone");
      utils.nationalCoverage.getOverview.invalidate();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule meeting");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#07162B] border border-slate-800 text-slate-100 shadow-2xl">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mb-2">
            <Globe className="w-5 h-5 text-sky-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-white">
            {step === "details" ? "Schedule Time-Zone Aware Meeting" : "Confirm Meeting Time Zone"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {step === "details"
              ? "All participants will receive notifications in their confirmed local time."
              : "Verify multi-party time zone alignment before calendar invites are dispatched."}
          </DialogDescription>
        </DialogHeader>

        {step === "details" ? (
          <div className="space-y-4 py-2">
            {/* Student Name */}
            {prefillClient && (
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Student / Client: </span>
                  <strong className="text-white">{prefillClient.name}</strong>
                  {prefillClient.city && (
                    <span className="text-slate-400"> ({prefillClient.city}, {prefillClient.state})</span>
                  )}
                </div>
                <span className="text-sky-400 font-medium">
                  {getFriendlyTimeZoneName(meetingTimeZone)}
                </span>
              </div>
            )}

            {/* Title & Meeting Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Meeting Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs bg-slate-900 border-slate-800 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Meeting Type</Label>
                <Select value={meetingType} onValueChange={setMeetingType}>
                  <SelectTrigger className="h-9 text-xs bg-slate-900 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="IEP Meeting">IEP Meeting</SelectItem>
                    <SelectItem value="504 Plan Review">504 Plan Review</SelectItem>
                    <SelectItem value="Eligibility Meeting">Eligibility Meeting</SelectItem>
                    <SelectItem value="Progress Update">Progress Update</SelectItem>
                    <SelectItem value="PWN Dispute Review">PWN Dispute Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Date</Label>
                <Input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-9 text-xs bg-slate-900 border-slate-800 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Local Time (for School/Client)</Label>
                <Input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="h-9 text-xs bg-slate-900 border-slate-800 text-white font-mono"
                />
              </div>
            </div>

            {/* Time Zone Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Meeting Official Time Zone</Label>
              <Select value={meetingTimeZone} onValueChange={setMeetingTimeZone}>
                <SelectTrigger className="h-9 text-xs bg-slate-900 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {SIX_CORE_ZONES.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name} ({z.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video Link */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Meeting Video Link</Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="Google Meet, Zoom, or Teams URL"
                className="h-9 text-xs bg-slate-900 border-slate-800 text-white"
              />
            </div>
          </div>
        ) : (
          /* Confirmation Step */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
              {/* 🔴 RED: Client time */}
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Client Scheduled Time ({getFriendlyTimeZoneName(meetingTimeZone)})
                </span>
                <div className="text-base font-bold text-rose-100 font-mono">
                  {timeStr} ({getFriendlyTimeZoneName(meetingTimeZone)} Time)
                </div>
              </div>

              {/* 🟢 GREEN: Waypoint Advocate time */}
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Waypoint Advocate Time (Atlanta / Eastern)
                </span>
                <div className="text-base font-bold text-emerald-100 font-mono">
                  {viewerTime.timeString} ({getFriendlyTimeZoneName(viewerTimeZone)} Time)
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 italic">
                {plainExplanation}
              </div>

              <div className="text-xs font-semibold text-sky-400 pt-1">
                Is {getFriendlyTimeZoneName(meetingTimeZone)} Time correct for this family?
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "details" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-800 bg-slate-900 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleProceedToConfirm}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold"
              >
                Continue to Confirmation
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("details")}
                className="border-slate-800 bg-slate-900 text-slate-300"
              >
                Change Time Zone
              </Button>
              <Button
                type="button"
                onClick={handleFinalSave}
                disabled={bookMutation.isPending}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold gap-1.5 shadow-md shadow-sky-600/30"
              >
                <ShieldCheck className="w-4 h-4" />
                Yes, {getFriendlyTimeZoneName(meetingTimeZone)} is Correct
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
