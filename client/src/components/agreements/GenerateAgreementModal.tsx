import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Send, FileText, CheckCircle2, User, GraduationCap, Briefcase, Sparkles } from "lucide-react";

interface GenerateAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (agreementId: number) => void;
  initialClientId?: number;
  initialStudentId?: number;
  initialServiceId?: number;
}

export function GenerateAgreementModal({
  isOpen,
  onClose,
  onSuccess,
  initialClientId,
  initialStudentId,
  initialServiceId,
}: GenerateAgreementModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(initialClientId || null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(initialStudentId || null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(initialServiceId || null);
  const [customTitle, setCustomTitle] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [sendImmediately, setSendImmediately] = useState(false);

  // Queries
  const { data: templates = [], isLoading: loadingTemplates } = trpc.agreements.listTemplates.useQuery(undefined, {
    enabled: isOpen,
  });

  const { data: contactsData = [], isLoading: loadingContacts } = trpc.contacts.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const { data: servicesData = [], isLoading: loadingServices } = trpc.services.list.useQuery(undefined, {
    enabled: isOpen,
  });

  // Filter clients vs students
  const clients = useMemo(() => {
    return contactsData.filter((c: any) => !c.parentContactId);
  }, [contactsData]);

  const studentsForSelectedClient = useMemo(() => {
    if (!selectedClientId) return [];
    return contactsData.filter((c: any) => c.parentContactId === selectedClientId);
  }, [contactsData, selectedClientId]);

  // Set default template if available
  React.useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const active = templates.find((t: any) => t.status === "active") || templates[0];
      if (active) {
        setSelectedTemplateId(active.id);
        if (!customTitle) setCustomTitle(active.name);
      }
    }
  }, [templates, selectedTemplateId, customTitle]);

  // Auto-set title when template changes
  const handleTemplateChange = (tplId: number) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t: any) => t.id === tplId);
    if (tpl) {
      setCustomTitle(tpl.name);
    }
  };

  const createMutation = trpc.agreements.createFromTemplate.useMutation({
    onSuccess: (res) => {
      toast.success(sendImmediately ? "Agreement sent to client portal!" : "Agreement draft generated successfully!");
      onSuccess(res.id);
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate agreement");
    },
  });

  const handleGenerate = (sendNow: boolean) => {
    if (!selectedTemplateId) {
      toast.error("Please select an agreement template");
      return;
    }
    if (!selectedClientId) {
      toast.error("Please select a client contact");
      return;
    }

    setSendImmediately(sendNow);
    createMutation.mutate({
      templateId: selectedTemplateId,
      clientId: selectedClientId,
      studentContactId: selectedStudentId || undefined,
      serviceId: selectedServiceId || undefined,
      title: customTitle.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      sendImmediately: sendNow,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[92vw] bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] rounded-2xl p-0 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-[1100]">
        <DialogHeader className="p-6 pb-4 border-b border-[#3A2C18] bg-[#020A17]/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] shadow-md shadow-black/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4] tracking-wide">
                Generate New Agreement
              </DialogTitle>
              <p className="text-xs text-[#C6B697] mt-0.5">
                Populate CRM merge fields and create an immutable agreement instance.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Template */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#C6B697] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FFE394]" />
              Select Template *
            </Label>
            <select
              value={selectedTemplateId || ""}
              onChange={(e) => handleTemplateChange(Number(e.target.value))}
              className="w-full h-10 rounded-lg bg-[#020A17]/90 border border-[#3A2C18] px-3 text-sm text-[#FFF4D4] focus:outline-none focus:border-[#C5A059] cursor-pointer"
            >
              <option value="" disabled className="bg-[#05142B] text-[#A69371]">Choose a template...</option>
              {templates.map((tpl: any) => (
                <option key={tpl.id} value={tpl.id} className="bg-[#05142B] text-[#FFF4D4]">
                  {tpl.name} ({tpl.agreementType.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          {/* Agreement Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#C6B697]">Agreement Title</Label>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Advocacy Service Agreement - Smith Family"
              className="bg-[#020A17]/90 border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371] focus:border-[#C5A059] h-9"
            />
          </div>

          {/* Step 2 & 3: Client & Student */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#C6B697] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FFE394]" />
                Client / Parent Contact *
              </Label>
              <select
                value={selectedClientId || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedClientId(val);
                  setSelectedStudentId(null);
                }}
                className="w-full h-10 rounded-lg bg-[#020A17]/90 border border-[#3A2C18] px-3 text-sm text-[#FFF4D4] focus:outline-none focus:border-[#C5A059] cursor-pointer"
              >
                <option value="" disabled className="bg-[#05142B] text-[#A69371]">Select client...</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id} className="bg-[#05142B] text-[#FFF4D4]">
                    {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#C6B697] flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#FFE394]" />
                Student Record (Optional)
              </Label>
              <select
                value={selectedStudentId || ""}
                onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedClientId}
                className="w-full h-10 rounded-lg bg-[#020A17]/90 border border-[#3A2C18] px-3 text-sm text-[#FFF4D4] focus:outline-none focus:border-[#C5A059] disabled:opacity-40 cursor-pointer"
              >
                <option value="" className="bg-[#05142B] text-[#A69371]">No specific student linked</option>
                {studentsForSelectedClient.map((s: any) => (
                  <option key={s.id} value={s.id} className="bg-[#05142B] text-[#FFF4D4]">
                    {s.firstName} {s.lastName} {s.gradeLevel ? `(${s.gradeLevel})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 4: Associated Service */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#C6B697] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#FFE394]" />
              Associated Service from Catalog (Optional)
            </Label>
            <select
              value={selectedServiceId || ""}
              onChange={(e) => setSelectedServiceId(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-10 rounded-lg bg-[#020A17]/90 border border-[#3A2C18] px-3 text-sm text-[#FFF4D4] focus:outline-none focus:border-[#C5A059] cursor-pointer"
            >
              <option value="" className="bg-[#05142B] text-[#A69371]">No service associated</option>
              {servicesData.map((srv: any) => (
                <option key={srv.id} value={srv.id} className="bg-[#05142B] text-[#FFF4D4]">
                  {srv.name} {srv.price ? `($${srv.price})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#C6B697]">Internal Staff Notes (Optional)</Label>
            <Input
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g. Prepared following discovery call; customized scope for IEP review."
              className="bg-[#020A17]/90 border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371] focus:border-[#C5A059] h-9"
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-[#3A2C18] bg-[#020A17]/80 flex flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] cursor-pointer"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleGenerate(false)}
              disabled={createMutation.isPending}
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] cursor-pointer text-xs h-9"
            >
              Save as Draft
            </Button>

            <Button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 gap-1.5 border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {createMutation.isPending ? "Generating..." : "Generate & Send Now"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
