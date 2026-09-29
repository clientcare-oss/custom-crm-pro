import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AgreementEditor } from "./AgreementEditor";
import { Plus, Trash2, FileSignature, CheckCircle, ShieldCheck } from "lucide-react";

interface AgreementTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId?: number | null;
  onSuccess: () => void;
}

export function AgreementTemplateModal({
  isOpen,
  onClose,
  templateId,
  onSuccess,
}: AgreementTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agreementType, setAgreementType] = useState("service_agreement");
  const [content, setContent] = useState("");
  const [initialsRequired, setInitialsRequired] = useState(false);
  const [includeSecondParent, setIncludeSecondParent] = useState(false);
  const [requireCounterSignature, setRequireCounterSignature] = useState(false);
  const [acknowledgments, setAcknowledgments] = useState<Array<{ id: string; text: string; required: boolean }>>([
    {
      id: "ack-1",
      text: "I confirm that I am the legal parent/guardian of the student and have authority to execute this agreement.",
      required: true,
    },
    {
      id: "ack-2",
      text: "I consent to conduct this transaction and receive notifications electronically.",
      required: true,
    },
  ]);

  const { data: existingTemplate, isLoading } = trpc.agreements.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId && isOpen }
  );

  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setDescription(existingTemplate.description || "");
      setAgreementType(existingTemplate.agreementType || "service_agreement");
      setContent(existingTemplate.content || "");
      setInitialsRequired(Boolean(existingTemplate.initialsRequired));

      if (existingTemplate.requiredAcknowledgments) {
        try {
          const parsed = JSON.parse(existingTemplate.requiredAcknowledgments);
          if (Array.isArray(parsed)) setAcknowledgments(parsed);
        } catch (e) {}
      }

      if (existingTemplate.signatureConfig) {
        try {
          const cfg = JSON.parse(existingTemplate.signatureConfig);
          setIncludeSecondParent(Boolean(cfg.includeSecondParent));
          setRequireCounterSignature(Boolean(cfg.requireCounterSignature));
        } catch (e) {}
      }
    } else if (!templateId && isOpen) {
      // Default initial template text for new templates
      setName("");
      setDescription("");
      setAgreementType("service_agreement");
      setContent(`<h2>ADVOCACY SERVICES AGREEMENT</h2>
<p>This Educational Advocacy Services Agreement ("Agreement") is made effective as of <strong>{{agreement_date}}</strong>, by and between <strong>{{company_name}}</strong> ("Advocate") and <strong>{{client_name}}</strong> ("Parent/Client"), for educational advocacy and consulting services regarding <strong>{{student_name}}</strong> ("Student").</p>

<h3>1. Scope of Advocacy Services</h3>
<p>Advocate agrees to provide professional educational representation, record review, IEP/504 consultation, and meeting strategy support as described under <strong>{{service_name}}</strong>. Services shall commence on <strong>{{start_date}}</strong> and remain active through the term specified herein.</p>

<h3>2. Confidentiality & Student Educational Records</h3>
<p>All information, student records, psychological evaluations, and correspondence provided to Advocate shall be treated as confidential and handled in accordance with professional ethical standards and applicable privacy laws.</p>

<h3>3. Client Representation & Cooperation</h3>
<p>Client agrees to provide accurate, complete educational records and timely notice of all district meetings, school communications, and Prior Written Notices (PWN).</p>

<h3>4. Compensation & Retainer Schedule</h3>
<p>Professional services are provided at the agreed fee of <strong>{{service_fee}}</strong> under the <strong>{{plan_name}}</strong> schedule.</p>
`);
      setInitialsRequired(true);
      setIncludeSecondParent(false);
      setRequireCounterSignature(false);
    }
  }, [existingTemplate, templateId, isOpen]);

  const saveMutation = trpc.agreements.saveTemplate.useMutation({
    onSuccess: () => {
      toast.success(templateId ? "Template updated successfully" : "Template created successfully");
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save template");
    },
  });

  const handleAddAck = () => {
    setAcknowledgments([
      ...acknowledgments,
      {
        id: `ack-${Date.now()}`,
        text: "",
        required: true,
      },
    ]);
  };

  const handleRemoveAck = (index: number) => {
    setAcknowledgments(acknowledgments.filter((_, idx) => idx !== index));
  };

  const handleUpdateAckText = (index: number, text: string) => {
    const updated = [...acknowledgments];
    updated[index].text = text;
    setAcknowledgments(updated);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!content.trim()) {
      toast.error("Please provide agreement content");
      return;
    }

    const signatureConfig = JSON.stringify({
      includeSecondParent,
      requireCounterSignature,
    });

    const validAcks = acknowledgments.filter((a) => a.text.trim().length > 0);

    saveMutation.mutate({
      id: templateId || undefined,
      name: name.trim(),
      description: description.trim() || undefined,
      agreementType,
      content,
      requiredAcknowledgments: JSON.stringify(validAcks),
      initialsRequired: initialsRequired ? 1 : 0,
      signatureConfig,
      status: "active",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100 rounded-2xl p-0 overflow-hidden shadow-2xl z-[1100]">
        <DialogHeader className="p-6 pb-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,181,68,0.2)]">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-wide">
                {templateId ? "Edit Agreement Template" : "New Agreement Template"}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Design reusable legal terms with smart merge tags, initials, and required acknowledgments.
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-slate-400">
            Loading template details...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Template Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Template Title *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Advocacy Service Agreement (Full Retainer)"
                  className="bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Agreement Type</Label>
                <select
                  value={agreementType}
                  onChange={(e) => setAgreementType(e.target.value)}
                  className="w-full h-9 rounded-md bg-slate-950 border border-slate-700 px-3 text-sm text-slate-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="service_agreement">Advocacy Service Agreement</option>
                  <option value="one_time_service">One-Time Service Agreement</option>
                  <option value="authorization_release">Authorization & Records Release</option>
                  <option value="policy_acknowledgment">Policy Acknowledgment & Consent</option>
                  <option value="amendment">Agreement Amendment</option>
                  <option value="custom">General Custom Agreement</option>
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-300">Internal Description (Optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief internal note regarding when to use this template..."
                  className="bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-400"
                />
              </div>
            </div>

            {/* Rich Text Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-300">Agreement Terms & Content *</Label>
                <span className="text-[11px] text-slate-400">
                  Use the <strong>Insert Merge Field</strong> button to inject CRM variables.
                </span>
              </div>
              <AgreementEditor content={content} onChange={setContent} minHeight="300px" />
            </div>

            {/* Required Acknowledgments */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Required Signer Acknowledgments
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Signers must actively check each statement before signing is permitted.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAck}
                  className="h-8 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 gap-1 text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {acknowledgments.map((ack, idx) => (
                  <div key={ack.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono w-4">{idx + 1}.</span>
                    <Input
                      value={ack.text}
                      onChange={(e) => handleUpdateAckText(idx, e.target.value)}
                      placeholder="e.g. I agree to provide school notices within 48 hours..."
                      className="flex-1 bg-slate-900 border-slate-800 text-slate-200 text-xs h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAck(idx)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Signature & Verification Controls */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Signer & Execution Rules
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                  <div className="pr-3">
                    <p className="text-xs font-semibold text-slate-200">Require Initials</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Prompt signer to initial key clauses</p>
                  </div>
                  <Switch checked={initialsRequired} onCheckedChange={setInitialsRequired} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                  <div className="pr-3">
                    <p className="text-xs font-semibold text-slate-200">Second Parent Signer</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Include second parent if registered</p>
                  </div>
                  <Switch checked={includeSecondParent} onCheckedChange={setIncludeSecondParent} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                  <div className="pr-3">
                    <p className="text-xs font-semibold text-slate-200">Staff Counter-Signature</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Require advocate signature block</p>
                  </div>
                  <Switch checked={requireCounterSignature} onCheckedChange={setRequireCounterSignature} />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 shadow-[0_0_16px_rgba(245,181,68,0.25)] cursor-pointer"
          >
            {saveMutation.isPending ? "Saving..." : templateId ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
