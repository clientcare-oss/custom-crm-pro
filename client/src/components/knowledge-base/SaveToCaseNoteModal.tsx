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
import { Scale, UserCheck, CheckCircle2 } from "lucide-react";
import type { LegalReference } from "../../../../shared/stateEducationLawData";

interface SaveToCaseNoteModalProps {
  reference: LegalReference | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function SaveToCaseNoteModal({
  reference,
  isOpen,
  onClose,
  onSaved,
}: SaveToCaseNoteModalProps) {
  const [selectedContactId, setSelectedContactId] = useState<number | "">("");
  const [advocateNote, setAdvocateNote] = useState("");
  const [searchContact, setSearchContact] = useState("");

  const { data: contacts = [], isLoading: loadingContacts } = trpc.contacts.list.useQuery();
  const utils = trpc.useUtils();

  const saveMutation = trpc.stateLaw.saveToCaseNote.useMutation({
    onSuccess: (res) => {
      toast.success(`Legal citation attached to ${res.studentName}'s case record and timeline.`);
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

  if (!reference) return null;

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

    saveMutation.mutate({
      referenceId: reference.id,
      studentContactId: Number(selectedContactId),
      advocateCustomNote: advocateNote.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] p-6 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.9)]">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-[#3A2C18]/80">
          <div className="flex items-center gap-2 text-[#C5A059]">
            <Scale className="w-5 h-5" />
            <span className="text-[11px] font-mono uppercase tracking-widest font-semibold">
              Advocacy Case File Integration
            </span>
          </div>
          <DialogTitle className="text-xl font-serif text-[#FFF4D4] font-normal">
            Save Citation to Student Case Notes
          </DialogTitle>
          <DialogDescription className="text-xs text-[#C6B697]">
            Attach this verified statutory citation and advocacy guidance directly to a student's active case timeline and case notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {/* Reference Preview Card */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#020A17]/80 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="font-mono text-[#C5A059] font-bold">
                {reference.state} · {reference.citation}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#102B4E]/60 text-[#FFE394] border border-[#C5A059]/30 text-[10px] font-semibold">
                {reference.category}
              </span>
            </div>
            <div className="text-sm font-serif font-bold text-[#FFF4D4]">
              {reference.title}
            </div>
            <p className="text-xs text-[#C6B697] line-clamp-2 leading-relaxed">
              {reference.plainLanguageExplanation}
            </p>
          </div>

          {/* Student Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#FFE394] flex items-center justify-between">
              <span>Select Student Case</span>
              {selectedContact && (
                <span className="text-[11px] text-[#C5A059] font-mono flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Selected: {selectedContact.firstName} {selectedContact.lastName}
                </span>
              )}
            </label>

            <Input
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              placeholder="Search student or district..."
              className="h-8 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371]"
            />

            <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 p-1.5">
              {loadingContacts ? (
                <div className="p-3 text-center text-xs text-[#A69371]">Loading student records...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#A69371]">No matching students found</div>
              ) : (
                filteredContacts.slice(0, 15).map((contact: any) => {
                  const isSelected = selectedContactId === contact.id;
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setSelectedContactId(contact.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-[#C5A059]/20 border border-[#C5A059] text-[#FFF4D4]"
                          : "hover:bg-[#07162B] text-[#D8C7A5] border border-transparent"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#FFF4D4]">
                          {contact.firstName} {contact.lastName}
                        </span>
                        <span className="text-[10px] text-[#A69371]">
                          {contact.schoolDistrict || contact.email || "Student Case"}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#FFE394]" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Advocate Note Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#FFE394]">
              Advocate Note / Context (Optional)
            </label>
            <Textarea
              rows={3}
              value={advocateNote}
              onChange={(e) => setAdvocateNote(e.target.value)}
              placeholder="e.g. Cite during next week's IEP meeting regarding the 60-day psychological reevaluation timeline."
              className="text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371] resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#3A2C18]/80">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs border-[#3A2C18] bg-transparent text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!selectedContactId || saveMutation.isPending}
              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(197,160,89,0.3)] hover:brightness-110 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Attaching to Record..." : "Save to Case File"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
