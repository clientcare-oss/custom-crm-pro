import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Sparkles, Check, X, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface IepProfileUpdateBubbleProps {
  contactId: number;
  studentName: string;
}

export function IepProfileUpdateBubble({
  contactId,
  studentName,
}: IepProfileUpdateBubbleProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});

  const utils = trpc.useUtils();

  // Query pending updates for this student
  const { data, isLoading } = trpc.iep.getPendingUpdates.useQuery(
    { contactId },
    { enabled: contactId > 0, refetchInterval: 5000 }
  );

  const pending = data?.pending;
  const fields = pending?.fields || [];

  // Mutations
  const applyMutation = trpc.iep.applyPendingUpdates.useMutation({
    onSuccess: (res) => {
      toast.success(`Updated ${res.updatedCount} field(s) on student profile from IEP`);
      utils.iep.getPendingUpdates.invalidate({ contactId });
      utils.contacts.detail.invalidate({ id: contactId });
      setModalOpen(false);
    },
    onError: (err) => {
      toast.error(`Failed to apply updates: ${err.message}`);
    },
  });

  const dismissMutation = trpc.iep.dismissPendingUpdates.useMutation({
    onSuccess: () => {
      toast.info("IEP profile update suggestions dismissed");
      utils.iep.getPendingUpdates.invalidate({ contactId });
      setModalOpen(false);
    },
    onError: (err) => {
      toast.error(`Failed to dismiss: ${err.message}`);
    },
  });

  // When opening modal, initialize all fields as selected by default
  const handleOpenReview = () => {
    const initialSelection: Record<string, boolean> = {};
    for (const f of fields) {
      initialSelection[f.field] = true;
    }
    setSelectedFields(initialSelection);
    setModalOpen(true);
  };

  const toggleField = (fieldName: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const handleApplySelected = () => {
    const acceptedFields: Record<string, string> = {};
    for (const f of fields) {
      if (selectedFields[f.field]) {
        acceptedFields[f.field] = f.extractedValue;
      }
    }

    if (Object.keys(acceptedFields).length === 0) {
      toast.info("No updates selected");
      return;
    }

    applyMutation.mutate({
      contactId,
      acceptedFields,
      dismissRemaining: true,
    });
  };

  const handleDismissAll = () => {
    dismissMutation.mutate({ contactId });
  };

  if (isLoading || !pending || fields.length === 0) {
    return null;
  }

  const selectedCount = Object.values(selectedFields).filter(Boolean).length;

  return (
    <>
      {/* ─── Admiralty-Themed Review Bubble on Overview Tab ───────────────── */}
      <div className="w-full mb-5 relative group overflow-hidden rounded-xl bg-gradient-to-r from-[#0d274a]/95 via-[#0c2444]/95 to-[#07162b]/95 border border-[#D4AF37]/60 shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)] p-4 sm:p-4.5 transition-all">
        {/* Subtle Ambient Gold Glow Top-Left */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#D4AF37]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          {/* Left: Indicator & Description */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ffe082] via-[#d4af37] to-[#8c6700] text-[#051428] flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/30">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide flex items-center gap-1.5" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  <span>IEP Profile Updates Detected</span>
                </span>
                <Badge className="bg-amber-500/20 text-[#FFE394] border border-[#D4AF37]/50 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {fields.length} {fields.length === 1 ? "field differs" : "fields differ"}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-[#C6B697] mt-0.5">
                New information extracted from <span className="font-semibold text-white/90">{pending.sourceDocument || "uploaded IEP"}</span> differs from current profile.
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              onClick={handleOpenReview}
              size="sm"
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs h-8.5 px-3.5 rounded-lg border border-[#FFE394]/60 shadow-[0_2px_8px_rgba(0,0,0,0.5)] gap-1.5 cursor-pointer"
            >
              <span>Review & Accept</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>

            <Button
              onClick={handleDismissAll}
              variant="outline"
              size="sm"
              disabled={dismissMutation.isPending}
              className="bg-transparent hover:bg-white/10 text-white/70 hover:text-white border-white/20 text-xs h-8.5 px-2.5 rounded-lg cursor-pointer"
              title="Dismiss suggestions"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Dismiss</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Review & Confirmation Modal ─────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-[#07162B] border border-[#3A2C18] text-white p-6 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.9)] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#3A2C18] pb-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>Smart Hybrid IEP Sync</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white mt-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Review Extracted IEP Updates for {studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#C6B697] mt-1">
              Empty profile fields were automatically populated. Review the {fields.length} conflicting fields below extracted from <strong className="text-white">{pending.sourceDocument}</strong> and confirm which values to apply.
            </DialogDescription>
          </DialogHeader>

          {/* Fields Comparison Table */}
          <div className="space-y-3 py-4">
            {fields.map((f) => {
              const isChecked = Boolean(selectedFields[f.field]);
              return (
                <div
                  key={f.field}
                  onClick={() => toggleField(f.field)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? "bg-[#0b213f]/90 border-[#D4AF37]/70 shadow-[0_2px_12px_rgba(212,175,55,0.15)]"
                      : "bg-[#020A17]/60 border-[#3A2C18] opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-300">
                      {f.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#C6B697]">
                        {isChecked ? "Apply IEP Value" : "Keep Current"}
                      </span>
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          isChecked
                            ? "bg-[#C5A059] border-[#FFE394] text-[#07162B]"
                            : "border-white/30 bg-transparent text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Current Profile Value */}
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                      <span className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold mb-1">
                        Current Profile Value
                      </span>
                      <span className="text-white/80 font-medium">
                        {f.currentValue || "(Empty)"}
                      </span>
                    </div>

                    {/* Extracted IEP Value */}
                    <div className={`p-2.5 rounded-lg border ${
                      isChecked
                        ? "bg-[#0e2c54]/80 border-[#D4AF37]/50"
                        : "bg-black/30 border-white/5"
                    }`}>
                      <span className="text-[10px] uppercase tracking-wider text-amber-300/80 block font-semibold mb-1 flex items-center gap-1">
                        <span>Extracted from IEP</span>
                        {isChecked && <CheckCircle2 className="w-3 h-3 text-amber-300 inline" />}
                      </span>
                      <span className="text-amber-100 font-bold">
                        {f.extractedValue}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="border-t border-[#3A2C18] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDismissAll}
              disabled={dismissMutation.isPending}
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-9 w-full sm:w-auto"
            >
              Keep Current Profile (Dismiss)
            </Button>

            <Button
              type="button"
              onClick={handleApplySelected}
              disabled={applyMutation.isPending || selectedCount === 0}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs h-9 px-5 rounded-lg border border-[#FFE394]/60 shadow-md gap-1.5 w-full sm:w-auto cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {applyMutation.isPending
                  ? "Applying Updates..."
                  : `Apply Selected Updates (${selectedCount})`}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
