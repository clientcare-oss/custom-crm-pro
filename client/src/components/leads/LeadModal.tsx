import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEAD_STATUSES, format12Hour, type LeadFormData, type LeadStatus } from "./types";

interface LeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
  formData: LeadFormData;
  setFormData: React.Dispatch<React.SetStateAction<LeadFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function LeadModal({
  open,
  onOpenChange,
  editingId,
  formData,
  setFormData,
  onSubmit,
  isPending,
}: LeadModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#05142B]/95 border-[#3A2C18] text-[#FFF4D4] shadow-[0_16px_48px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-2xl no-scrollbar">
        <DialogHeader>
          <DialogTitle className="font-serif font-bold text-lg text-[#FFF4D4]">
            {editingId ? "Edit Lead Record" : "Add New Prospective Lead"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          {/* Parent Info */}
          <div className="space-y-1">
            <p className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
              Parent / Guardian
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#C6B697]">Parent Name</label>
              <VoiceInput
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                placeholder="e.g. Maria Gonzalez"
                className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#C5A059] rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#C6B697]">Parent Phone</label>
              <VoiceInput
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                placeholder="(555) 000-0000"
                className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#C5A059] rounded-lg"
              />
            </div>
          </div>

          {/* Student Info */}
          <div className="space-y-1 pt-1 border-t border-[#3A2C18]/60">
            <p className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
              Student Details
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 space-y-1.5">
              <label className="block text-xs font-semibold text-[#C6B697]">Student Name</label>
              <VoiceInput
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                placeholder="e.g. Diego Gonzalez"
                className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#C5A059] rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#C6B697]">Age</label>
              <Input
                type="number"
                value={formData.studentAge}
                onChange={(e) => setFormData({ ...formData, studentAge: e.target.value })}
                placeholder="10"
                min={1}
                max={25}
                className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#C5A059] rounded-lg h-9"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-[#C6B697]">Grade</label>
              <VoiceInput
                value={formData.studentGrade}
                onChange={(e) => setFormData({ ...formData, studentGrade: e.target.value })}
                placeholder="4th Grade"
                className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#C5A059] rounded-lg"
              />
            </div>
          </div>

          {/* Discovery Call Schedule */}
          <div className="space-y-2 pt-2 border-t border-[#3A2C18]/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Discovery Call Schedule</span>
              </p>
              {formData.discoveryCallDate && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discoveryCallDate: "", discoveryCallTime: "" })}
                  className="text-[11px] text-[#A69371] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                >
                  Clear Schedule
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#C6B697]">Call Date</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const y = today.getFullYear();
                        const m = String(today.getMonth() + 1).padStart(2, "0");
                        const d = String(today.getDate()).padStart(2, "0");
                        setFormData({ ...formData, discoveryCallDate: `${y}-${m}-${d}` });
                      }}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#020A17] text-[#FFE394] border border-[#3A2C18] hover:border-[#C5A059]/60 cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tmrw = new Date();
                        tmrw.setDate(tmrw.getDate() + 1);
                        const y = tmrw.getFullYear();
                        const m = String(tmrw.getMonth() + 1).padStart(2, "0");
                        const d = String(tmrw.getDate()).padStart(2, "0");
                        setFormData({ ...formData, discoveryCallDate: `${y}-${m}-${d}` });
                      }}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#020A17] text-[#C6B697] border border-[#3A2C18] hover:text-[#FFF4D4] cursor-pointer"
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>
                <Input
                  type="date"
                  value={formData.discoveryCallDate}
                  onChange={(e) => setFormData({ ...formData, discoveryCallDate: e.target.value })}
                  className="h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059] rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#C6B697]">Call Time</label>
                  <span className="text-[10px] text-[#A69371]">Local Time</span>
                </div>
                <Input
                  type="time"
                  value={formData.discoveryCallTime}
                  onChange={(e) => setFormData({ ...formData, discoveryCallTime: e.target.value })}
                  className="h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059] rounded-lg"
                />
              </div>
            </div>

            {/* Quick Time Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-[#A69371] font-medium mr-1">Time presets:</span>
              {[
                { label: "9:00 AM", value: "09:00" },
                { label: "10:00 AM", value: "10:00" },
                { label: "11:30 AM", value: "11:30" },
                { label: "1:00 PM", value: "13:00" },
                { label: "2:00 PM", value: "14:00" },
                { label: "3:30 PM", value: "15:30" },
                { label: "4:30 PM", value: "16:30" },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    let dateVal = formData.discoveryCallDate;
                    if (!dateVal) {
                      const today = new Date();
                      const y = today.getFullYear();
                      const m = String(today.getMonth() + 1).padStart(2, "0");
                      const d = String(today.getDate()).padStart(2, "0");
                      dateVal = `${y}-${m}-${d}`;
                    }
                    setFormData({ ...formData, discoveryCallDate: dateVal, discoveryCallTime: preset.value });
                  }}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-medium rounded-md border transition-all cursor-pointer",
                    formData.discoveryCallTime === preset.value
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/60 shadow-xs"
                      : "bg-[#020A17] hover:bg-[#07162B] text-[#C6B697] border-[#3A2C18]"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Live scheduling feedback banner */}
            {formData.discoveryCallDate && (() => {
              const today = new Date();
              const y = today.getFullYear();
              const m = String(today.getMonth() + 1).padStart(2, "0");
              const d = String(today.getDate()).padStart(2, "0");
              const isTodayDate = formData.discoveryCallDate === `${y}-${m}-${d}`;

              return isTodayDate ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#07162B] border border-[#C5A059]/60 text-xs text-[#FFE394] font-medium">
                  <span className="flex h-2 w-2 rounded-full bg-[#FFE394] animate-ping" />
                  <span>
                    Will appear in <strong>Today’s Discovery Calls</strong>
                    {formData.discoveryCallTime ? ` at ${format12Hour(formData.discoveryCallTime)}` : " (Time TBD)"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#C6B697]">
                  <Calendar className="w-3.5 h-3.5 text-[#A69371]" />
                  <span>
                    Will appear in <strong>Upcoming Discovery Calls</strong>: {formData.discoveryCallDate}
                    {formData.discoveryCallTime ? ` at ${format12Hour(formData.discoveryCallTime)}` : ""}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Lead Details */}
          <div className="space-y-1 pt-1 border-t border-[#3A2C18]/60">
            <p className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
              Lead Details
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#C6B697]">Source</label>
            <VoiceInput
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="e.g., Referral, Website, Cold Call"
              className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#C5A059] rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#C6B697]">Deal Value ($)</label>
            <VoiceInput
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="10000"
              className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#C5A059] rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#C6B697]">Status</label>
            <Select
              value={String(formData.status) || "New"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as LeadStatus,
                })
              }
            >
              <SelectTrigger className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs rounded-lg focus:border-[#C5A059]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs">
                {LEAD_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#C6B697]">Notes</label>
            <VoiceInput
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes about this lead..."
              className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#C5A059] rounded-lg"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-[#3A2C18]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs cursor-pointer rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-110 disabled:opacity-50 text-xs cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#07162B]" />
              ) : editingId ? (
                "Update Lead"
              ) : (
                "Create Lead"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
