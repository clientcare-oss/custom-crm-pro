import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Scale, BookOpen, UserCheck, CheckCircle2, ShieldCheck, FileText } from "lucide-react";
import type { FederalLegalProvisionData } from "../../../../shared/federalEducationLawData";
import type { FederalGuidanceDocumentData } from "../../../../shared/federalGuidanceArchiveData";

interface SaveFederalLegalToCaseNoteModalProps {
  provision?: FederalLegalProvisionData | null;
  guidance?: FederalGuidanceDocumentData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function SaveFederalLegalToCaseNoteModal({
  provision,
  guidance,
  isOpen,
  onClose,
  onSaved,
}: SaveFederalLegalToCaseNoteModalProps) {
  const [selectedContactId, setSelectedContactId] = useState<number | "">("");
  const [advocateNote, setAdvocateNote] = useState("");
  const [searchContact, setSearchContact] = useState("");

  const { data: contacts = [], isLoading: loadingContacts } = trpc.contacts.list.useQuery();
  const utils = trpc.useUtils();

  const saveProvisionMutation = trpc.federalLaw.saveProvisionToCaseNote.useMutation({
    onSuccess: (res) => {
      toast.success(`Federal authority (${res.citation}) attached to ${res.studentName}'s case record.`);
      utils.contacts.invalidate();
      onSaved?.();
      onClose();
      setAdvocateNote("");
      setSelectedContactId("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to attach legal citation to case notes");
    },
  });

  const saveGuidanceMutation = trpc.federalLaw.saveGuidanceToCaseNote.useMutation({
    onSuccess: (res) => {
      toast.success(`Federal guidance attached to ${res.studentName}'s case record.`);
      utils.contacts.invalidate();
      onSaved?.();
      onClose();
      setAdvocateNote("");
      setSelectedContactId("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to attach guidance to case notes");
    },
  });

  if (!provision && !guidance) return null;

  const isProvision = !!provision;
  const title = isProvision ? provision!.title : guidance!.title;
  const citation = isProvision
    ? provision!.sectionCitation
    : guidance!.documentNumber || `${guidance!.issuingOffice} (${guidance!.dateIssued})`;

  const filteredContacts = contacts.filter((c: any) => {
    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
    const search = searchContact.toLowerCase();
    return fullName.includes(search) || (c.schoolDistrict || "").toLowerCase().includes(search);
  });

  const selectedContact = contacts.find((c: any) => c.id === selectedContactId);

  const handleSave = () => {
    if (!selectedContactId) {
      toast.error("Please select a student or client record");
      return;
    }

    if (isProvision) {
      saveProvisionMutation.mutate({
        provisionId: provision!.id,
        studentContactId: Number(selectedContactId),
        advocateCustomNote: advocateNote.trim() || undefined,
      });
    } else {
      saveGuidanceMutation.mutate({
        guidanceId: guidance!.id,
        studentContactId: Number(selectedContactId),
        advocateCustomNote: advocateNote.trim() || undefined,
      });
    }
  };

  const isPending = saveProvisionMutation.isPending || saveGuidanceMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] p-6 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.9)]">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-[#3A2C18]/80">
          <div className="flex items-center gap-2 text-[#C5A059]">
            {isProvision ? <Scale className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            <span className="text-[11px] font-mono uppercase tracking-widest font-semibold">
              {isProvision ? "Attach Binding Federal Law to Case" : "Attach Federal Guidance to Case"}
            </span>
          </div>
          <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4]">
            {citation}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#C6B697] line-clamp-2">
            {title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Student Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#D8C7A5] flex items-center justify-between">
              <span>Select Student / Client Record</span>
              {selectedContact && (
                <span className="text-[11px] text-[#C5A059] flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Selected: {selectedContact.firstName} {selectedContact.lastName}
                </span>
              )}
            </label>

            <Input
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              placeholder="Search by student name or school district..."
              className="h-9 bg-[#020A17] border-[#3A2C18] text-xs text-[#FFF4D4] placeholder-[#A69371] rounded-xl focus:border-[#C5A059]"
            />

            <div className="max-h-36 overflow-y-auto space-y-1 border border-[#3A2C18] rounded-xl p-1.5 bg-[#020A17]/60">
              {loadingContacts ? (
                <div className="text-xs text-[#A69371] p-3 text-center">Loading client records...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-xs text-[#A69371] p-3 text-center">No student records found.</div>
              ) : (
                filteredContacts.slice(0, 15).map((c: any) => {
                  const isSelected = selectedContactId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedContactId(c.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isSelected
                          ? "bg-[#C5A059]/20 border border-[#C5A059]/60 text-[#FFF4D4]"
                          : "hover:bg-[#07162B] text-[#D8C7A5]"
                      }`}
                    >
                      <div>
                        <span className="font-semibold">
                          {c.firstName} {c.lastName}
                        </span>
                        {c.schoolDistrict && (
                          <span className="text-[10px] text-[#A69371] ml-2">({c.schoolDistrict})</span>
                        )}
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C5A059]" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Advocate Case Context Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D8C7A5]">
              Advocate Context & Strategic Rationale (Optional)
            </label>
            <Textarea
              value={advocateNote}
              onChange={(e) => setAdvocateNote(e.target.value)}
              placeholder="e.g., Citing 34 CFR § 300.324(a)(2)(i) to compel the district to conduct an FBA and adopt a BIP prior to proposed change of placement..."
              className="min-h-[85px] bg-[#020A17] border-[#3A2C18] text-xs text-[#FFF4D4] placeholder-[#A69371] rounded-xl focus:border-[#C5A059]"
            />
          </div>

          {/* Legal Authority Notice */}
          <div className="p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] text-[11px] text-[#C6B697] space-y-1">
            <div className="flex items-center gap-1.5 text-[#C5A059] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Case Record Integration</span>
            </div>
            <p>
              This action appends the authoritative legal citation, full plain-language analysis, and official federal source link directly to the student&apos;s active case dossier and creates an event on the Case Activity Timeline.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3A2C18]/80">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B]"
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedContactId || isPending}
            className="h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(197,160,89,0.3)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isPending ? "Attaching..." : "Save to Case Record"}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
