import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale, AlertTriangle, User, Building, Mail, Phone, Calendar, FileText, UploadCloud, CheckCircle2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AttorneyDocument } from "./types";

interface LegalInvolvementModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentContactId: number;
  studentName: string;
  onSaved?: () => void;
}

export function LegalInvolvementModal({
  isOpen,
  onClose,
  studentContactId,
  studentName,
  onSaved,
}: LegalInvolvementModalProps) {
  const { data: legalData, isLoading, refetch } = trpc.lawyerPrep.getLegalStatus.useQuery(
    { studentContactId },
    { enabled: isOpen && studentContactId > 0 }
  );

  const updateMutation = trpc.lawyerPrep.updateLegalStatus.useMutation({
    onSuccess: (res) => {
      toast.success(
        res.lawyerInvolved
          ? "Legal involvement active — Red case warning updated"
          : "Legal involvement deactivated"
      );
      refetch();
      onSaved?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update legal status");
    },
  });

  const [lawyerInvolved, setLawyerInvolved] = useState(false);
  const [attorneyName, setAttorneyName] = useState("");
  const [attorneyFirm, setAttorneyFirm] = useState("");
  const [attorneyEmail, setAttorneyEmail] = useState("");
  const [attorneyPhone, setAttorneyPhone] = useState("");
  const [attorneyRepresents, setAttorneyRepresents] = useState("Parent/Student");
  const [attorneyInvolvementDate, setAttorneyInvolvementDate] = useState("");
  const [legalNotes, setLegalNotes] = useState("");
  const [documents, setDocuments] = useState<AttorneyDocument[]>([]);
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");

  useEffect(() => {
    if (legalData) {
      setLawyerInvolved(legalData.lawyerInvolved);
      setAttorneyName(legalData.attorneyName || "");
      setAttorneyFirm(legalData.attorneyFirm || "");
      setAttorneyEmail(legalData.attorneyEmail || "");
      setAttorneyPhone(legalData.attorneyPhone || "");
      setAttorneyRepresents(legalData.attorneyRepresents || "Parent/Student");
      setAttorneyInvolvementDate(legalData.attorneyInvolvementDate || "");
      setLegalNotes(legalData.legalNotes || "");
      setDocuments(Array.isArray(legalData.attorneyDocuments) ? legalData.attorneyDocuments : []);
    }
  }, [legalData]);

  const handleSave = () => {
    updateMutation.mutate({
      studentContactId,
      lawyerInvolved,
      attorneyName: attorneyName.trim(),
      attorneyFirm: attorneyFirm.trim(),
      attorneyEmail: attorneyEmail.trim(),
      attorneyPhone: attorneyPhone.trim(),
      attorneyRepresents,
      attorneyInvolvementDate,
      legalNotes: legalNotes.trim(),
      attorneyDocuments: JSON.stringify(documents),
    });
  };

  const handleDeactivate = () => {
    setLawyerInvolved(false);
    updateMutation.mutate({
      studentContactId,
      lawyerInvolved: false,
      attorneyName: attorneyName.trim(),
      attorneyFirm: attorneyFirm.trim(),
      attorneyEmail: attorneyEmail.trim(),
      attorneyPhone: attorneyPhone.trim(),
      attorneyRepresents,
      attorneyInvolvementDate,
      legalNotes: legalNotes.trim(),
      attorneyDocuments: JSON.stringify(documents),
    });
  };

  const handleAddDocument = () => {
    if (!newDocName.trim()) {
      toast.error("Please enter a document name or reference");
      return;
    }
    const doc: AttorneyDocument = {
      id: `doc-${Date.now()}`,
      name: newDocName.trim(),
      url: newDocUrl.trim() || undefined,
      uploadedAt: new Date().toISOString(),
    };
    setDocuments([...documents, doc]);
    setNewDocName("");
    setNewDocUrl("");
    toast.success("Document reference attached");
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#07162B] border-[#0E3E75] text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="pb-3 border-b border-[#0E3E75]/80">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Legal Involvement Setup</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    PG-030
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Manage active attorney representation for <strong className="text-white">{studentName}</strong>.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading legal status...</div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Master Activation Toggle Box */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 to-slate-900/60 shadow-inner">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Lawyer Involved on this Case
                  </span>
                  {lawyerInvolved && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500 text-slate-950 animate-pulse">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When active, displays a high-visibility red case warning across the student workspace and activates the AI Lawyer Prep tool.
                </p>
              </div>
              <Switch
                checked={lawyerInvolved}
                onCheckedChange={setLawyerInvolved}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>

            {/* Attorney Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#F5B544]" />
                  Attorney Name
                </Label>
                <Input
                  value={attorneyName}
                  onChange={(e) => setAttorneyName(e.target.value)}
                  placeholder="e.g., Elena Rostova, Esq."
                  className="bg-[#0B2144]/80 border-[#0E3E75] text-xs h-9 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#F5B544]" />
                  Law Firm / Organization
                </Label>
                <Input
                  value={attorneyFirm}
                  onChange={(e) => setAttorneyFirm(e.target.value)}
                  placeholder="e.g., Rostova Education Law Group"
                  className="bg-[#0B2144]/80 border-[#0E3E75] text-xs h-9 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Attorney Email
                </Label>
                <Input
                  type="email"
                  value={attorneyEmail}
                  onChange={(e) => setAttorneyEmail(e.target.value)}
                  placeholder="elena@rostovalaw.com"
                  className="bg-[#0B2144]/80 border-[#0E3E75] text-xs h-9 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Attorney Phone
                </Label>
                <Input
                  type="tel"
                  value={attorneyPhone}
                  onChange={(e) => setAttorneyPhone(e.target.value)}
                  placeholder="(404) 555-0188"
                  className="bg-[#0B2144]/80 border-[#0E3E75] text-xs h-9 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#F5B544]" />
                  Represents
                </Label>
                <Select value={attorneyRepresents} onValueChange={setAttorneyRepresents}>
                  <SelectTrigger className="bg-[#0B2144]/80 border-[#0E3E75] text-xs h-9 text-white">
                    <SelectValue placeholder="Select party" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#07162B] border-[#0E3E75] text-slate-200">
                    <SelectItem value="Parent/Student">Parent / Student (Family Counsel)</SelectItem>
                    <SelectItem value="School/District">School / District Counsel</SelectItem>
                    <SelectItem value="Other">Other / Independent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#F5B544]" />
                  Date Attorney Became Involved
                </Label>
                <Input
                  type="date"
                  value={attorneyInvolvementDate}
                  onChange={(e) => setAttorneyInvolvementDate(e.target.value)}
                  className="bg-[#0B2144]/80 border-[#0E3E75] text-xs h-9 text-white"
                />
              </div>
            </div>

            {/* Legal Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#F5B544]" />
                Legal Notes & Case Directives
              </Label>
              <Textarea
                value={legalNotes}
                onChange={(e) => setLegalNotes(e.target.value)}
                placeholder="Notes regarding legal scope, communication protocols with counsel, pending mediation dates, or retainer details..."
                className="bg-[#0B2144]/80 border-[#0E3E75] text-xs min-h-[85px] text-white placeholder:text-slate-500 leading-relaxed"
              />
            </div>

            {/* Attorney Documents / Reference Attachment */}
            <div className="space-y-2 pt-2 border-t border-[#0E3E75]/80">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Attorney Files & Document References
                </Label>
                <span className="text-[10px] text-slate-400">Optional internal reference links</span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Document Title (e.g. Representation Letter)"
                  className="bg-[#0B2144]/80 border-[#0E3E75] text-xs h-8 text-white flex-1"
                />
                <Input
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  placeholder="URL / File Key (optional)"
                  className="bg-[#0B2144]/80 border-[#0E3E75] text-xs h-8 text-white flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddDocument}
                  className="h-8 px-3 text-xs bg-[#0E3E75] hover:bg-[#155499] text-white shrink-0 font-semibold"
                >
                  Add
                </Button>
              </div>

              {documents.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#0B2144]/50 border border-[#0E3E75]/60 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#F5B544] shrink-0" />
                        <span className="font-medium text-white truncate">{doc.name}</span>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-sky-400 hover:underline truncate max-w-[200px]"
                          >
                            {doc.url}
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                        title="Remove reference"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-[#0E3E75]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            {legalData?.lawyerInvolved && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeactivate}
                disabled={updateMutation.isPending}
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8"
              >
                Deactivate Legal Involvement
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="text-xs font-bold bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 h-8 px-4 shadow-sm"
            >
              {updateMutation.isPending ? "Saving..." : "Save Legal Details"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
