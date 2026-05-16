import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle, FileText, PenLine, Hash, CreditCard, DollarSign } from "lucide-react";

// ─── Smart field replacement ──────────────────────────────────────────────────

function replaceSmartFields(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] ?? `{{${key}}}`);
}

function buildSmartFieldContext(contact: any, student: any): Record<string, string> {
  return {
    parent_name: [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || "",
    student_name: [student?.firstName, student?.lastName].filter(Boolean).join(" ") || "",
    second_student_name: "",
    advocate_name: "Waypoint Advocacy",
    case_id: String(contact?.id ?? ""),
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    date_created: new Date().toLocaleDateString(),
    due_date: "",
    contract_total: "",
    monthly_payment: "",
    service_package: "",
  };
}

// ─── Block renderer ───────────────────────────────────────────────────────────

interface BlockRendererProps {
  block: any;
  fieldValues: Record<string, string>;
  onFieldChange: (blockId: string, value: string) => void;
  checkboxValues: Record<string, boolean>;
  onCheckboxChange: (blockId: string, value: boolean) => void;
  conditionalAnswers: Record<string, "yes" | "no">;
  onConditionalChange: (blockId: string, value: "yes" | "no") => void;
  selectedAddOns: number[];
  onAddOnToggle: (id: number) => void;
  addOns: any[];
  paymentOption: "one_time" | "monthly" | null;
  onPaymentChange: (v: "one_time" | "monthly") => void;
  smartCtx: Record<string, string>;
  isHidden: boolean;
}

function BlockRenderer({
  block, fieldValues, onFieldChange, checkboxValues, onCheckboxChange,
  conditionalAnswers, onConditionalChange, selectedAddOns, onAddOnToggle,
  addOns, paymentOption, onPaymentChange, smartCtx, isHidden
}: BlockRendererProps) {
  if (isHidden) return null;
  const content = block.content ? JSON.parse(block.content) : {};
  const settings = block.settings ? JSON.parse(block.settings) : {};
  const blockId = String(block.id);

  switch (block.type) {
    case "heading":
      return (
        <h2 className="text-xl font-bold mt-6 mb-2 text-foreground">
          {replaceSmartFields(content.text ?? "", smartCtx)}
        </h2>
      );

    case "text":
      return (
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {replaceSmartFields(content.text ?? "", smartCtx)}
        </p>
      );

    case "contract":
      return (
        <div className="bg-muted/30 border rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground">
          {replaceSmartFields(content.text ?? "", smartCtx)}
        </div>
      );

    case "service":
      return (
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{replaceSmartFields(content.title ?? "", smartCtx)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {content.description && (
              <p className="text-sm text-muted-foreground">{replaceSmartFields(content.description, smartCtx)}</p>
            )}
            {content.price && (
              <p className="text-sm font-semibold">{replaceSmartFields(content.price, smartCtx)}</p>
            )}
          </CardContent>
        </Card>
      );

    case "field":
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium">
            {content.label ?? "Field"}
            {settings.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {settings.fieldType === "textarea" ? (
            <Textarea
              placeholder={content.placeholder ?? ""}
              value={fieldValues[blockId] ?? ""}
              onChange={(e) => onFieldChange(blockId, e.target.value)}
              rows={3}
            />
          ) : (
            <Input
              type={settings.fieldType ?? "text"}
              placeholder={content.placeholder ?? ""}
              value={fieldValues[blockId] ?? ""}
              onChange={(e) => onFieldChange(blockId, e.target.value)}
            />
          )}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-start gap-3 p-3 border rounded-lg">
          <Checkbox
            id={`cb-${blockId}`}
            checked={checkboxValues[blockId] ?? false}
            onCheckedChange={(v) => onCheckboxChange(blockId, Boolean(v))}
            className="mt-0.5"
          />
          <Label htmlFor={`cb-${blockId}`} className="text-sm leading-relaxed cursor-pointer">
            {replaceSmartFields(content.label ?? "", smartCtx)}
            {settings.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
      );

    case "signature":
      return (
        <div className="space-y-2 p-4 border-2 border-dashed rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <PenLine className="w-4 h-4" />
            <span>{content.label ?? "Client Signature"}</span>
          </div>
          <p className="text-xs text-muted-foreground">Type your full legal name to sign:</p>
          <Input
            placeholder="Your full name"
            value={fieldValues[`sig-${blockId}`] ?? ""}
            onChange={(e) => onFieldChange(`sig-${blockId}`, e.target.value)}
            className="font-serif text-lg"
          />
          {fieldValues[`sig-${blockId}`] && (
            <p className="font-serif text-xl italic text-foreground">{fieldValues[`sig-${blockId}`]}</p>
          )}
        </div>
      );

    case "initial":
      return (
        <div className="space-y-2 p-3 border rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Hash className="w-4 h-4" />
            <span>{content.label ?? "Initials"}</span>
          </div>
          <Input
            placeholder="Your initials"
            value={fieldValues[`init-${blockId}`] ?? ""}
            onChange={(e) => onFieldChange(`init-${blockId}`, e.target.value)}
            className="w-24 font-serif text-lg"
            maxLength={5}
          />
        </div>
      );

    case "payment":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="w-4 h-4" />
            <span>Select Payment Option</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {content.oneTimeAmount && (
              <button
                className={`p-4 border-2 rounded-xl text-left transition-all ${paymentOption === "one_time" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => onPaymentChange("one_time")}
              >
                <p className="font-semibold text-sm">{content.oneTimeLabel ?? "One-Time Payment"}</p>
                <p className="text-2xl font-bold mt-1">${content.oneTimeAmount}</p>
                <p className="text-xs text-muted-foreground mt-1">Single payment, full access</p>
              </button>
            )}
            {content.monthlyAmount && (
              <button
                className={`p-4 border-2 rounded-xl text-left transition-all ${paymentOption === "monthly" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => onPaymentChange("monthly")}
              >
                <p className="font-semibold text-sm">{content.monthlyLabel ?? "Monthly Plan"}</p>
                <p className="text-2xl font-bold mt-1">${content.monthlyAmount}<span className="text-sm font-normal">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">{content.months ?? 12} months</p>
              </button>
            )}
          </div>
        </div>
      );

    case "addon":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <DollarSign className="w-4 h-4" />
            <span>{content.label ?? "Optional Add-Ons"}</span>
          </div>
          {addOns.length === 0 && <p className="text-sm text-muted-foreground">No add-ons available.</p>}
          {addOns.map((a: any) => (
            <div
              key={a.id}
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedAddOns.includes(a.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              onClick={() => !a.isRequired && onAddOnToggle(a.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{a.name}</p>
                  {a.shortDescription && <p className="text-xs text-muted-foreground mt-0.5">{a.shortDescription}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">${a.price}</p>
                  {a.isRequired ? (
                    <Badge variant="outline" className="text-xs mt-1">Required</Badge>
                  ) : (
                    <Badge variant={selectedAddOns.includes(a.id) ? "default" : "outline"} className="text-xs mt-1">
                      {selectedAddOns.includes(a.id) ? "Added" : "Optional"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    case "conditional":
      return (
        <div className="p-4 border-2 border-dashed rounded-xl space-y-3">
          <p className="text-sm font-medium">{replaceSmartFields(content.question ?? "", smartCtx)}</p>
          <div className="flex gap-3">
            <Button
              variant={conditionalAnswers[blockId] === "yes" ? "default" : "outline"}
              size="sm"
              onClick={() => onConditionalChange(blockId, "yes")}
            >
              {content.yesLabel ?? "Yes"}
            </Button>
            <Button
              variant={conditionalAnswers[blockId] === "no" ? "default" : "outline"}
              size="sm"
              onClick={() => onConditionalChange(blockId, "no")}
            >
              {content.noLabel ?? "No"}
            </Button>
          </div>
        </div>
      );

    case "image":
      return content.url ? (
        <img src={content.url} alt={content.alt ?? ""} className="max-w-full rounded-lg" />
      ) : null;

    case "internal_note":
      // Never shown to client
      return null;

    default:
      return null;
  }
}

// ─── Main portal viewer ───────────────────────────────────────────────────────

export default function SmartFilePortalViewer() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = Number(id);
  const [, navigate] = useLocation();

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [checkboxValues, setCheckboxValues] = useState<Record<string, boolean>>({});
  const [conditionalAnswers, setConditionalAnswers] = useState<Record<string, "yes" | "no">>({});
  const [selectedAddOns, setSelectedAddOns] = useState<number[]>([]);
  const [paymentOption, setPaymentOption] = useState<"one_time" | "monthly" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = trpc.smartFiles.portalGetAssignment.useQuery({ assignmentId });
  const markViewedMutation = trpc.smartFiles.portalMarkViewed.useMutation();
  const submitMutation = trpc.smartFiles.portalSubmit.useMutation();

  useEffect(() => {
    if (data && data.assignment.status === "sent") {
      markViewedMutation.mutate({ assignmentId });
    }
    // Pre-select required add-ons
    if (data?.addOns) {
      const required = data.addOns.filter((a: any) => a.isRequired).map((a: any) => a.id);
      setSelectedAddOns(required);
    }
    if (data?.assignment.status === "payment_completed" || data?.assignment.status === "in_progress") {
      setSubmitted(true);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading document...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Document not found or access denied.</p>
      </div>
    );
  }

  const { assignment, template, blocks, addOns, contact, student } = data;
  const smartCtx = buildSmartFieldContext(contact, student);

  // Compute which blocks are hidden due to conditional logic
  const hiddenBlocks = new Set<number>();
  let lastConditionalBlockId: string | null = null;
  let lastConditionalAnswer: "yes" | "no" | null = null;

  for (const block of blocks) {
    if (block.type === "conditional") {
      lastConditionalBlockId = String(block.id);
      lastConditionalAnswer = conditionalAnswers[lastConditionalBlockId] ?? null;
    } else if (lastConditionalBlockId && lastConditionalAnswer !== null) {
      // Blocks after a conditional are hidden if answer is "no"
      if (lastConditionalAnswer === "no") {
        hiddenBlocks.add(block.id);
      } else {
        // Reset after we've passed the conditional group (next conditional resets)
        lastConditionalBlockId = null;
        lastConditionalAnswer = null;
      }
    }
  }

  // Find the primary signature block
  const sigBlock = blocks.find((b: any) => b.type === "signature");
  const sigValue = sigBlock ? (fieldValues[`sig-${sigBlock.id}`] ?? "") : "";

  const handleSubmit = async () => {
    // Validate required fields
    for (const block of blocks) {
      if (hiddenBlocks.has(block.id)) continue;
      const content = block.content ? JSON.parse(block.content) : {};
      const settings = block.settings ? JSON.parse(block.settings) : {};
      const blockId = String(block.id);

      if (block.type === "field" && settings.required && !fieldValues[blockId]?.trim()) {
        toast.error(`Please fill in: ${content.label ?? "required field"}`);
        return;
      }
      if (block.type === "checkbox" && settings.required && !checkboxValues[blockId]) {
        toast.error(`Please check: ${content.label ?? "required checkbox"}`);
        return;
      }
    }
    if (!sigValue.trim()) {
      toast.error("Please type your signature to complete the document.");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        assignmentId,
        fieldValues: JSON.stringify(fieldValues),
        initialsData: JSON.stringify(
          Object.fromEntries(
            Object.entries(fieldValues).filter(([k]) => k.startsWith("init-"))
          )
        ),
        signatureName: sigValue,
        paymentOption: paymentOption ?? undefined,
        selectedAddOnIds: JSON.stringify(selectedAddOns),
      });
      setSubmitted(true);
      toast.success("Document submitted successfully!");
    } catch {
      toast.error("Failed to submit. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto p-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Document Submitted!</h1>
          <p className="text-muted-foreground text-sm">
            Your document has been signed and submitted. You'll receive a copy shortly.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => navigate("/portal")}>
            Back to Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-semibold text-sm">{template?.name ?? "Document"}</p>
            {assignment.dueDate && (
              <p className="text-xs text-muted-foreground">Due {new Date(assignment.dueDate).toLocaleDateString()}</p>
            )}
          </div>
          <Badge variant="outline" className="text-xs">{assignment.status}</Badge>
        </div>
      </div>

      {/* Document body */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {blocks.map((block: any) => (
          <BlockRenderer
            key={block.id}
            block={block}
            fieldValues={fieldValues}
            onFieldChange={(id, v) => setFieldValues((prev) => ({ ...prev, [id]: v }))}
            checkboxValues={checkboxValues}
            onCheckboxChange={(id, v) => setCheckboxValues((prev) => ({ ...prev, [id]: v }))}
            conditionalAnswers={conditionalAnswers}
            onConditionalChange={(id, v) => setConditionalAnswers((prev) => ({ ...prev, [id]: v }))}
            selectedAddOns={selectedAddOns}
            onAddOnToggle={(id) => setSelectedAddOns((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )}
            addOns={addOns}
            paymentOption={paymentOption}
            onPaymentChange={setPaymentOption}
            smartCtx={smartCtx}
            isHidden={hiddenBlocks.has(block.id)}
          />
        ))}

        <Separator />

        {/* Submit */}
        <div className="pb-8">
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "Submitting..." : "Sign & Submit Document"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            By submitting, you agree to the terms outlined in this document.
          </p>
        </div>
      </div>
    </div>
  );
}
