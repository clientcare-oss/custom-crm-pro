import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Type, AlignLeft, Image, FileText, PenLine, Hash, CheckSquare,
  CreditCard, GitBranch, Package, StickyNote, Heading1, DollarSign,
  Save, Eye, Send, Settings2, X
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type BlockType =
  | "heading" | "text" | "image" | "contract" | "service"
  | "signature" | "initial" | "checkbox" | "field"
  | "payment" | "conditional" | "addon" | "internal_note";

interface Block {
  id: string;        // client-side temp id
  dbId?: number;
  blockOrder: number;
  type: BlockType;
  content: Record<string, unknown>;   // parsed JSON
  settings: Record<string, unknown>;  // parsed JSON
}

interface AddOn {
  id?: number;
  name: string;
  shortDescription: string;
  price: string;
  contractText: string;
  isRequired: number;
  sortOrder: number;
}

// ─── Block palette ───────────────────────────────────────────────────────────

const BLOCK_PALETTE: { type: BlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "heading",       label: "Heading",          icon: <Heading1 className="w-4 h-4" />,    desc: "Section title" },
  { type: "text",          label: "Text / Rich Text",  icon: <AlignLeft className="w-4 h-4" />,   desc: "Paragraph or body text" },
  { type: "contract",      label: "Contract Language", icon: <FileText className="w-4 h-4" />,    desc: "Legal / contract text" },
  { type: "service",       label: "Service Section",   icon: <Package className="w-4 h-4" />,     desc: "Service details block" },
  { type: "field",         label: "Input Field",       icon: <Type className="w-4 h-4" />,        desc: "Client fills in a value" },
  { type: "checkbox",      label: "Checkbox",          icon: <CheckSquare className="w-4 h-4" />, desc: "Acknowledgment checkbox" },
  { type: "signature",     label: "Signature Block",   icon: <PenLine className="w-4 h-4" />,     desc: "Client types their name" },
  { type: "initial",       label: "Initials Block",    icon: <Hash className="w-4 h-4" />,        desc: "Client initials" },
  { type: "payment",       label: "Payment Section",   icon: <CreditCard className="w-4 h-4" />,  desc: "One-time or monthly plan" },
  { type: "addon",         label: "Add-On Section",    icon: <DollarSign className="w-4 h-4" />,  desc: "Optional purchasable items" },
  { type: "conditional",   label: "Conditional Block", icon: <GitBranch className="w-4 h-4" />,   desc: "Show/hide based on answer" },
  { type: "image",         label: "Image",             icon: <Image className="w-4 h-4" />,        desc: "Logo or image" },
  { type: "internal_note", label: "Internal Note",     icon: <StickyNote className="w-4 h-4" />,  desc: "Admin-only note (hidden from client)" },
];

// Smart field tokens
const SMART_FIELDS = [
  "{{parent_name}}", "{{student_name}}", "{{second_student_name}}",
  "{{advocate_name}}", "{{case_id}}", "{{email}}", "{{phone}}",
  "{{date_created}}", "{{due_date}}", "{{contract_total}}",
  "{{monthly_payment}}", "{{service_package}}",
];

// ─── Default content per block type ──────────────────────────────────────────

function defaultContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "heading":      return { text: "Section Heading" };
    case "text":         return { text: "Enter your text here. Use smart fields like {{parent_name}} to personalize." };
    case "contract":     return { text: "Enter contract language here..." };
    case "service":      return { title: "Service Package", description: "", price: "" };
    case "field":        return { label: "Field Label", placeholder: "" };
    case "checkbox":     return { label: "I acknowledge and agree to the above terms." };
    case "signature":    return { label: "Client Signature" };
    case "initial":      return { label: "Initials" };
    case "payment":      return { oneTimeLabel: "One-Time Payment", oneTimeAmount: "", monthlyLabel: "12-Month Plan", monthlyAmount: "", months: 12, dueDate: "" };
    case "addon":        return { label: "Optional Add-Ons" };
    case "conditional":  return { question: "Do you have more than one child receiving services?", yesLabel: "Yes", noLabel: "No", showBlocksOnYes: [] };
    case "image":        return { url: "", alt: "" };
    case "internal_note": return { text: "Internal note — not visible to client." };
    default:             return {};
  }
}

function defaultSettings(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "field":    return { required: true, fieldType: "text" };
    case "checkbox": return { required: true };
    case "payment":  return { required: true };
    default:         return {};
  }
}

// ─── Block editor components ─────────────────────────────────────────────────

function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: Block;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  const setContent = (key: string, value: unknown) =>
    onChange({ ...block, content: { ...block.content, [key]: value } });
  const setSettings = (key: string, value: unknown) =>
    onChange({ ...block, settings: { ...block.settings, [key]: value } });

  const paletteItem = BLOCK_PALETTE.find((p) => p.type === block.type);

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Block header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">{paletteItem?.icon}</span>
        <span className="text-sm font-medium flex-1">{paletteItem?.label ?? block.type}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isFirst} onClick={onMoveUp}>
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isLast} onClick={onMoveDown}>
            <ChevronDown className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Heading */}
          {block.type === "heading" && (
            <div>
              <Label className="text-xs">Heading Text</Label>
              <Input className="mt-1" value={String(block.content.text ?? "")} onChange={(e) => setContent("text", e.target.value)} />
            </div>
          )}

          {/* Text / Contract */}
          {(block.type === "text" || block.type === "contract" || block.type === "internal_note") && (
            <div>
              <Label className="text-xs">{block.type === "internal_note" ? "Internal Note" : "Content"}</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={5}
                value={String(block.content.text ?? "")}
                onChange={(e) => setContent("text", e.target.value)}
              />
              {block.type !== "internal_note" && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {SMART_FIELDS.map((f) => (
                    <button
                      key={f}
                      className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                      onClick={() => setContent("text", String(block.content.text ?? "") + f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Service */}
          {block.type === "service" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Service Title</Label>
                <Input className="mt-1" value={String(block.content.title ?? "")} onChange={(e) => setContent("title", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea className="mt-1" rows={3} value={String(block.content.description ?? "")} onChange={(e) => setContent("description", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Price (display only)</Label>
                <Input className="mt-1" placeholder="e.g. $2,400 or $200/month" value={String(block.content.price ?? "")} onChange={(e) => setContent("price", e.target.value)} />
              </div>
            </div>
          )}

          {/* Field */}
          {block.type === "field" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Field Label</Label>
                <Input className="mt-1" value={String(block.content.label ?? "")} onChange={(e) => setContent("label", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Placeholder</Label>
                <Input className="mt-1" value={String(block.content.placeholder ?? "")} onChange={(e) => setContent("placeholder", e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs">Field Type</Label>
                <Select value={String(block.settings.fieldType ?? "text")} onValueChange={(v) => setSettings("fieldType", v)}>
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 ml-auto">
                  <Label className="text-xs">Required</Label>
                  <Switch
                    checked={Boolean(block.settings.required)}
                    onCheckedChange={(v) => setSettings("required", v)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Checkbox */}
          {block.type === "checkbox" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Checkbox Label</Label>
                <Input className="mt-1" value={String(block.content.label ?? "")} onChange={(e) => setContent("label", e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Required</Label>
                <Switch checked={Boolean(block.settings.required)} onCheckedChange={(v) => setSettings("required", v)} />
              </div>
            </div>
          )}

          {/* Signature / Initial */}
          {(block.type === "signature" || block.type === "initial") && (
            <div>
              <Label className="text-xs">Label</Label>
              <Input className="mt-1" value={String(block.content.label ?? "")} onChange={(e) => setContent("label", e.target.value)} />
            </div>
          )}

          {/* Payment */}
          {block.type === "payment" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">One-Time Label</Label>
                  <Input className="mt-1" value={String(block.content.oneTimeLabel ?? "")} onChange={(e) => setContent("oneTimeLabel", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">One-Time Amount ($)</Label>
                  <Input className="mt-1" placeholder="e.g. 2400" value={String(block.content.oneTimeAmount ?? "")} onChange={(e) => setContent("oneTimeAmount", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Monthly Label</Label>
                  <Input className="mt-1" value={String(block.content.monthlyLabel ?? "")} onChange={(e) => setContent("monthlyLabel", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Monthly Amount ($)</Label>
                  <Input className="mt-1" placeholder="e.g. 200" value={String(block.content.monthlyAmount ?? "")} onChange={(e) => setContent("monthlyAmount", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Number of Months</Label>
                  <Input className="mt-1" type="number" value={String(block.content.months ?? 12)} onChange={(e) => setContent("months", Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Due Date (optional)</Label>
                  <Input className="mt-1" type="date" value={String(block.content.dueDate ?? "")} onChange={(e) => setContent("dueDate", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Conditional */}
          {block.type === "conditional" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Question</Label>
                <Input className="mt-1" value={String(block.content.question ?? "")} onChange={(e) => setContent("question", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Yes Label</Label>
                  <Input className="mt-1" value={String(block.content.yesLabel ?? "Yes")} onChange={(e) => setContent("yesLabel", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">No Label</Label>
                  <Input className="mt-1" value={String(block.content.noLabel ?? "No")} onChange={(e) => setContent("noLabel", e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                When the client selects "Yes", the blocks immediately following this conditional block (up to the next conditional or end) will be shown. Selecting "No" hides them.
              </p>
            </div>
          )}

          {/* Add-On section */}
          {block.type === "addon" && (
            <p className="text-xs text-muted-foreground">
              This block displays the add-ons you configure in the "Add-Ons" tab. Clients can select optional items here.
            </p>
          )}

          {/* Image */}
          {block.type === "image" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Image URL</Label>
                <Input className="mt-1" placeholder="https://..." value={String(block.content.url ?? "")} onChange={(e) => setContent("url", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Alt Text</Label>
                <Input className="mt-1" value={String(block.content.alt ?? "")} onChange={(e) => setContent("alt", e.target.value)} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add-On editor ────────────────────────────────────────────────────────────

function AddOnEditor({ addOn, onChange, onDelete }: {
  addOn: AddOn;
  onChange: (a: AddOn) => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input className="mt-1" value={addOn.name} onChange={(e) => onChange({ ...addOn, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Price ($)</Label>
                <Input className="mt-1" type="number" step="0.01" value={addOn.price} onChange={(e) => onChange({ ...addOn, price: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Short Description (shown on selection page)</Label>
              <Input className="mt-1" value={addOn.shortDescription} onChange={(e) => onChange({ ...addOn, shortDescription: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Full Contract Text (added to signed contract if selected)</Label>
              <Textarea className="mt-1 font-mono text-sm" rows={4} value={addOn.contractText} onChange={(e) => onChange({ ...addOn, contractText: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={Boolean(addOn.isRequired)} onCheckedChange={(v) => onChange({ ...addOn, isRequired: v ? 1 : 0 })} />
              <Label className="text-xs">Required (client cannot deselect)</Label>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main editor page ─────────────────────────────────────────────────────────

export default function SmartFileEditor() {
  const { id } = useParams<{ id: string }>();
  const templateId = Number(id);
  const [, navigate] = useLocation();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateStatus, setTemplateStatus] = useState<"draft" | "active" | "archived">("draft");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = trpc.smartFiles.getTemplate.useQuery({ templateId }, { enabled: !!templateId });

  useEffect(() => {
    if (!data) return;
    setTemplateName(data.name);
    setTemplateDesc(data.description ?? "");
    setTemplateStatus(data.status as "draft" | "active" | "archived");
    setBlocks(
      data.blocks.map((b, i) => ({
        id: `block-${b.id ?? i}`,
        dbId: b.id,
        blockOrder: b.blockOrder,
        type: b.type as BlockType,
        content: b.content ? JSON.parse(b.content) : {},
        settings: b.settings ? JSON.parse(b.settings) : {},
      }))
    );
    setAddOns(
      data.addOns.map((a) => ({
        id: a.id,
        name: a.name,
        shortDescription: a.shortDescription ?? "",
        price: String(a.price),
        contractText: a.contractText ?? "",
        isRequired: a.isRequired,
        sortOrder: a.sortOrder,
      }))
    );
  }, [data]);

  const updateMutation = trpc.smartFiles.updateTemplate.useMutation();
  const saveBlocksMutation = trpc.smartFiles.saveBlocks.useMutation();
  const saveAddOnsMutation = trpc.smartFiles.saveAddOns.useMutation();

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ templateId, name: templateName, description: templateDesc, status: templateStatus });
      await saveBlocksMutation.mutateAsync({
        templateId,
        blocks: blocks.map((b, i) => ({
          blockOrder: i,
          type: b.type,
          content: JSON.stringify(b.content),
          settings: JSON.stringify(b.settings),
        })),
      });
      await saveAddOnsMutation.mutateAsync({
        templateId,
        addOns: addOns.map((a, i) => ({
          name: a.name,
          shortDescription: a.shortDescription,
          price: a.price,
          contractText: a.contractText,
          isRequired: a.isRequired,
          sortOrder: i,
        })),
      });
      setDirty(false);
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }, [templateId, templateName, templateDesc, templateStatus, blocks, addOns]);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: `new-${Date.now()}`,
      blockOrder: blocks.length,
      type,
      content: defaultContent(type),
      settings: defaultSettings(type),
    };
    setBlocks((prev) => [...prev, newBlock]);
    setDirty(true);
  };

  const updateBlock = (index: number, updated: Block) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? updated : b)));
    setDirty(true);
  };

  const deleteBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const newBlocks = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    setBlocks(newBlocks);
    setDirty(true);
  };

  const addAddOn = () => {
    setAddOns((prev) => [...prev, { name: "New Add-On", shortDescription: "", price: "0.00", contractText: "", isRequired: 0, sortOrder: prev.length }]);
    setDirty(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 text-muted-foreground">Loading template...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate("/smart-files")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <Input
              className="text-base font-semibold border-none shadow-none px-0 h-7 focus-visible:ring-0"
              value={templateName}
              onChange={(e) => { setTemplateName(e.target.value); setDirty(true); }}
            />
          </div>
          <Select value={templateStatus} onValueChange={(v) => { setTemplateStatus(v as typeof templateStatus); setDirty(true); }}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            <Save className="w-3 h-3 mr-2" />
            {saving ? "Saving..." : dirty ? "Save" : "Saved"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/smart-files/${templateId}/assignments`)}>
            <Send className="w-3 h-3 mr-2" /> Assignments
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Block palette */}
          <div className="w-56 border-r bg-muted/20 overflow-y-auto p-3 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add Block</p>
            <div className="space-y-1">
              {BLOCK_PALETTE.map((item) => (
                <button
                  key={item.type}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                  onClick={() => addBlock(item.type)}
                >
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <Separator className="my-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Smart Fields</p>
            <div className="flex flex-wrap gap-1">
              {SMART_FIELDS.map((f) => (
                <span key={f} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 overflow-y-auto p-4">
            <Tabs defaultValue="blocks">
              <TabsList className="mb-4">
                <TabsTrigger value="blocks">Blocks ({blocks.length})</TabsTrigger>
                <TabsTrigger value="addons">Add-Ons ({addOns.length})</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Blocks tab */}
              <TabsContent value="blocks">
                {blocks.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Click a block type on the left to add it here.</p>
                  </div>
                )}
                <div className="space-y-3 max-w-2xl">
                  {blocks.map((block, i) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      onChange={(updated) => updateBlock(i, updated)}
                      onDelete={() => deleteBlock(i)}
                      onMoveUp={() => moveBlock(i, -1)}
                      onMoveDown={() => moveBlock(i, 1)}
                      isFirst={i === 0}
                      isLast={i === blocks.length - 1}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Add-Ons tab */}
              <TabsContent value="addons">
                <div className="max-w-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Add optional purchasable items. Clients see name, description, and price. Full contract text is added to the signed document if selected.
                    </p>
                    <Button size="sm" onClick={addAddOn}>
                      <Plus className="w-3 h-3 mr-2" /> Add Item
                    </Button>
                  </div>
                  {addOns.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                      No add-ons yet. Click "Add Item" to create one.
                    </div>
                  )}
                  {addOns.map((addOn, i) => (
                    <AddOnEditor
                      key={i}
                      addOn={addOn}
                      onChange={(updated) => { const a = [...addOns]; a[i] = updated; setAddOns(a); setDirty(true); }}
                      onDelete={() => { setAddOns(addOns.filter((_, j) => j !== i)); setDirty(true); }}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Settings tab */}
              <TabsContent value="settings">
                <div className="max-w-xl space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Template Settings</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Template Name</Label>
                        <Input className="mt-1" value={templateName} onChange={(e) => { setTemplateName(e.target.value); setDirty(true); }} />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea className="mt-1" rows={3} value={templateDesc} onChange={(e) => { setTemplateDesc(e.target.value); setDirty(true); }} />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={templateStatus} onValueChange={(v) => { setTemplateStatus(v as typeof templateStatus); setDirty(true); }}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft — not visible to clients</SelectItem>
                            <SelectItem value="active">Active — can be assigned to clients</SelectItem>
                            <SelectItem value="archived">Archived — hidden from list</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
