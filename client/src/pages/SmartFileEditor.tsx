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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ChevronRight,
  Type, AlignLeft, Image, FileText, PenLine, Hash, CheckSquare,
  CreditCard, GitBranch, Package, StickyNote, Heading1, DollarSign,
  Save, Eye, Send, Settings2, X, Minus, Video, Globe, CalendarClock,
  Settings, Palette, EyeOff, LayoutGrid, Check, Sparkles, HelpCircle
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type BlockType =
  | "heading" | "text" | "image" | "contract" | "service"
  | "signature" | "initial" | "checkbox" | "field"
  | "payment" | "conditional" | "addon" | "internal_note"
  | "divider" | "video" | "iframe" | "scheduler";

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
  { type: "divider",       label: "Divider",          icon: <Minus className="w-4 h-4" />,       desc: "Visual page break line" },
  { type: "video",          label: "Video",             icon: <Video className="w-4 h-4" />,       desc: "Video embed player" },
  { type: "iframe",         label: "Iframe Link",       icon: <Globe className="w-4 h-4" />,       desc: "Embed external site page" },
  { type: "scheduler",      label: "Scheduler",         icon: <CalendarClock className="w-4 h-4" />, desc: "Booking calendar layout" },
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
    case "service":      return { title: "Service Package", description: "", price: "", showDescription: true, showPrice: true, showSubItems: false, subItemsText: "" };
    case "field":        return { label: "Field Label", placeholder: "" };
    case "checkbox":     return { label: "I acknowledge and agree to the above terms." };
    case "signature":    return { label: "Client Signature" };
    case "initial":      return { label: "Initials" };
    case "payment":      return { oneTimeLabel: "One-Time Payment", oneTimeAmount: "", monthlyLabel: "12-Month Plan", monthlyAmount: "", months: 12, dueDate: "" };
    case "addon":        return { label: "Optional Add-Ons" };
    case "conditional":  return { question: "Do you have more than one child receiving services?", yesLabel: "Yes", noLabel: "No", showBlocksOnYes: [] };
    case "image":        return { url: "", alt: "" };
    case "internal_note": return { text: "Internal note — not visible to client." };
    case "divider":      return { style: "solid", height: 1, color: "#e2e8f0" };
    case "video":        return { url: "", provider: "youtube" };
    case "iframe":       return { url: "", height: "400" };
    case "scheduler":    return { title: "Schedule a Session", appointmentTypeId: "" };
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

function BlockFieldsEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const setContent = (key: string, value: unknown) =>
    onChange({ ...block, content: { ...block.content, [key]: value } });
  const setSettings = (key: string, value: unknown) =>
    onChange({ ...block, settings: { ...block.settings, [key]: value } });

  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Heading Text</Label>
            <Input className="mt-1" value={String(block.content.text ?? "")} onChange={(e) => setContent("text", e.target.value)} />
          </div>
        </div>
      );
    case "text":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Body Text</Label>
            <Textarea className="mt-1 text-xs" rows={6} value={String(block.content.text ?? "")} onChange={(e) => setContent("text", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Smart Field Tokens</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {SMART_FIELDS.map((f) => (
                <button
                  key={f}
                  className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded hover:bg-amber-500/20 transition-colors font-mono"
                  onClick={() => setContent("text", String(block.content.text ?? "") + f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    case "contract":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Contract Terms Language</Label>
            <Textarea className="mt-1 font-mono text-xs" rows={10} value={String(block.content.text ?? "")} onChange={(e) => setContent("text", e.target.value)} />
          </div>
        </div>
      );
    case "service":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Service Title</Label>
            <Input className="mt-1" value={String(block.content.title ?? "")} onChange={(e) => setContent("title", e.target.value)} />
          </div>
          
          <div className="flex items-center justify-between py-1 border-t pt-2">
            <Label className="text-xs">Show Description</Label>
            <Switch checked={Boolean(block.content.showDescription ?? true)} onCheckedChange={(v) => setContent("showDescription", v)} />
          </div>
          {Boolean(block.content.showDescription ?? true) && (
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea className="mt-1" rows={3} value={String(block.content.description ?? "")} onChange={(e) => setContent("description", e.target.value)} />
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-t pt-2">
            <Label className="text-xs">Show Price</Label>
            <Switch checked={Boolean(block.content.showPrice ?? true)} onCheckedChange={(v) => setContent("showPrice", v)} />
          </div>
          {Boolean(block.content.showPrice ?? true) && (
            <div>
              <Label className="text-xs">Price (display only)</Label>
              <Input className="mt-1" placeholder="e.g. $2,400 or $200/month" value={String(block.content.price ?? "")} onChange={(e) => setContent("price", e.target.value)} />
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-t pt-2">
            <Label className="text-xs font-semibold text-amber-500">Include Sub-items/Details list</Label>
            <Switch checked={Boolean(block.content.showSubItems ?? false)} onCheckedChange={(v) => setContent("showSubItems", v)} />
          </div>
          {Boolean(block.content.showSubItems ?? false) && (
            <div>
              <Label className="text-xs text-muted-foreground">Sub-items list (one item per line)</Label>
              <Textarea
                className="mt-1 font-mono text-xs"
                rows={5}
                placeholder="e.g.&#10;1-on-1 strategy coaching&#10;Record folders setup&#10;School representation support"
                value={String(block.content.subItemsText ?? "")}
                onChange={(e) => setContent("subItemsText", e.target.value)}
              />
            </div>
          )}
        </div>
      );
    case "field":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Question Label / Prompt</Label>
            <Input className="mt-1" value={String(block.content.label ?? "")} onChange={(e) => setContent("label", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Placeholder Text</Label>
            <Input className="mt-1" value={String(block.content.placeholder ?? "")} onChange={(e) => setContent("placeholder", e.target.value)} />
          </div>
          <div className="flex items-center justify-between py-1 border-t pt-2">
            <Label className="text-xs">Required Response</Label>
            <Switch checked={Boolean(block.settings.required ?? true)} onCheckedChange={(v) => setSettings("required", v)} />
          </div>
          <div>
            <Label className="text-xs">Field Response Type</Label>
            <Select value={String(block.settings.fieldType ?? "text")} onValueChange={(v) => setSettings("fieldType", v)}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Single Line Text</SelectItem>
                <SelectItem value="textarea">Paragraph / Freeform Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date picker</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    case "checkbox":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Acknowledgment Text Label</Label>
            <Textarea className="mt-1 text-xs" rows={3} value={String(block.content.label ?? "")} onChange={(e) => setContent("label", e.target.value)} />
          </div>
          <div className="flex items-center justify-between py-1 border-t pt-2">
            <Label className="text-xs">Client Must Check to Proceed</Label>
            <Switch checked={Boolean(block.settings.required ?? true)} onCheckedChange={(v) => setSettings("required", v)} />
          </div>
        </div>
      );
    case "signature":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Signature Field Label</Label>
            <Input className="mt-1" value={String(block.content.label ?? "")} onChange={(e) => setContent("label", e.target.value)} />
          </div>
        </div>
      );
    case "initial":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Initials Label Reference</Label>
            <Input className="mt-1" value={String(block.content.label ?? "")} onChange={(e) => setContent("label", e.target.value)} />
          </div>
        </div>
      );
    case "payment":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">One-Time Payment Selection Label</Label>
            <Input className="mt-1" value={String(block.content.oneTimeLabel ?? "")} onChange={(e) => setContent("oneTimeLabel", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">One-Time Price Amount ($)</Label>
            <Input className="mt-1" type="number" value={String(block.content.oneTimeAmount ?? "")} onChange={(e) => setContent("oneTimeAmount", e.target.value)} />
          </div>
          <div className="border-t my-2 pt-2" />
          <div>
            <Label className="text-xs">Installment Plan Option Label</Label>
            <Input className="mt-1" value={String(block.content.monthlyLabel ?? "")} onChange={(e) => setContent("monthlyLabel", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Installment Rate ($)</Label>
              <Input className="mt-1" type="number" value={String(block.content.monthlyAmount ?? "")} onChange={(e) => setContent("monthlyAmount", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Months Count</Label>
              <Input className="mt-1" type="number" value={Number(block.content.months ?? 12)} onChange={(e) => setContent("months", Number(e.target.value))} />
            </div>
          </div>
        </div>
      );
    case "addon":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Add-on Container Label</Label>
            <Input className="mt-1" value={String(block.content.label ?? "")} onChange={(e) => setContent("label", e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground italic pt-1">
            Configure purchasable add-on selections directly inside the 'Add-Ons' tab header link.
          </p>
        </div>
      );
    case "conditional":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Conditional Question Text</Label>
            <Input className="mt-1" value={String(block.content.question ?? "")} onChange={(e) => setContent("question", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Yes Option Label</Label>
              <Input className="mt-1" value={String(block.content.yesLabel ?? "")} onChange={(e) => setContent("yesLabel", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">No Option Label</Label>
              <Input className="mt-1" value={String(block.content.noLabel ?? "")} onChange={(e) => setContent("noLabel", e.target.value)} />
            </div>
          </div>
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Image URL link</Label>
            <Input className="mt-1" placeholder="https://..." value={String(block.content.url ?? "")} onChange={(e) => setContent("url", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Alt Text description</Label>
            <Input className="mt-1" value={String(block.content.alt ?? "")} onChange={(e) => setContent("alt", e.target.value)} />
          </div>
        </div>
      );
    case "internal_note":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Internal Advocate Note Text</Label>
            <Textarea className="mt-1 text-xs font-mono" rows={6} value={String(block.content.text ?? "")} onChange={(e) => setContent("text", e.target.value)} />
          </div>
        </div>
      );
    case "divider":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Line Style</Label>
            <Select value={String(block.content.style ?? "solid")} onValueChange={(v) => setContent("style", v)}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Line Height (px)</Label>
            <Input className="mt-1 h-8 text-xs" type="number" value={Number(block.content.height ?? 1)} onChange={(e) => setContent("height", Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Line Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="color" className="w-8 h-8 p-0 rounded cursor-pointer" value={String(block.content.color ?? "#e2e8f0")} onChange={(e) => setContent("color", e.target.value)} />
              <Input type="text" className="h-8 text-xs font-mono" value={String(block.content.color ?? "#e2e8f0")} onChange={(e) => setContent("color", e.target.value)} />
            </div>
          </div>
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Video Embed URL (YouTube/Vimeo)</Label>
            <Input className="mt-1" placeholder="e.g. https://www.youtube.com/embed/dQw4w9WgXcQ" value={String(block.content.url ?? "")} onChange={(e) => setContent("url", e.target.value)} />
          </div>
        </div>
      );
    case "iframe":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Iframe Source URL Destination</Label>
            <Input className="mt-1" placeholder="e.g. https://www.wikipedia.org" value={String(block.content.url ?? "")} onChange={(e) => setContent("url", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Height (px)</Label>
            <Input className="mt-1 h-8 text-xs" placeholder="e.g. 400" value={String(block.content.height ?? "400")} onChange={(e) => setContent("height", e.target.value)} />
          </div>
        </div>
      );
    case "scheduler":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Scheduler Section Title</Label>
            <Input className="mt-1" value={String(block.content.title ?? "Schedule a Meeting")} onChange={(e) => setContent("title", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Appointment Type ID</Label>
            <Input className="mt-1 h-8 text-xs" placeholder="e.g. 1" value={String(block.content.appointmentTypeId ?? "")} onChange={(e) => setContent("appointmentTypeId", e.target.value)} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

function VisualBlock({
  block,
  isActive,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  templateSettings,
}: {
  block: Block;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  templateSettings: Record<string, any>;
}) {
  const paletteItem = BLOCK_PALETTE.find((p) => p.type === block.type);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative group/block border rounded-xl bg-card overflow-hidden cursor-pointer transition-all duration-300 ${
        isActive ? "ring-2 ring-amber-500 shadow-md scale-[1.01]" : "hover:border-amber-500/50 border-muted"
      }`}
    >
      {/* Visual Overlay Banner on Hover or Active */}
      <div className={`absolute top-0 left-0 right-0 h-7 bg-muted/45 border-b px-3 py-1 flex items-center justify-between opacity-0 group-hover/block:opacity-100 transition-opacity z-10 ${isActive ? "opacity-100" : ""}`}>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {paletteItem?.icon}
          {paletteItem?.label ?? block.type}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-muted"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-muted"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Styled visual block content preview */}
      <div className="p-6 pt-9">
        {/* heading */}
        {block.type === "heading" && (
          <h2
            style={{ fontFamily: templateSettings.headingFont || "sans-serif" }}
            className="text-2xl font-bold tracking-tight"
          >
            {String(block.content.text || "Heading")}
          </h2>
        )}

        {/* text */}
        {block.type === "text" && (
          <p
            style={{ fontFamily: templateSettings.bodyFont || "sans-serif" }}
            className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
          >
            {String(block.content.text || "Enter your text here...")}
          </p>
        )}

        {/* contract */}
        {block.type === "contract" && (
          <div className="text-xs font-mono bg-muted/40 p-4 rounded-lg border border-dashed leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">
            {String(block.content.text || "Enter contract terms here...")}
          </div>
        )}

        {/* service */}
        {block.type === "service" && (
          <div className="space-y-2 border p-4 rounded-lg bg-muted/15 shadow-sm">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-base text-amber-500">{String(block.content.title || "Service Package")}</h3>
              {Boolean(block.content.showPrice ?? true) && (
                <span className="font-bold text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded">
                  {String(block.content.price || "$0.00")}
                </span>
              )}
            </div>
            {Boolean(block.content.showDescription ?? true) && Boolean(block.content.description) && (
              <p className="text-xs text-muted-foreground leading-relaxed">{String(block.content.description)}</p>
            )}
            {Boolean(block.content.showSubItems ?? false) && Boolean(block.content.subItemsText) && (
              <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground mt-2 border-t pt-2">
                {String(block.content.subItemsText).split("\n").filter(line => line.trim() !== "").map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* field */}
        {block.type === "field" && (
          <div className="space-y-1.5 max-w-md">
            <Label className="text-xs font-semibold">{String(block.content.label || "Field Label")}</Label>
            <Input disabled placeholder={String(block.content.placeholder || "Client input response...")} className="h-8 text-xs bg-background" />
          </div>
        )}

        {/* checkbox */}
        {block.type === "checkbox" && (
          <div className="flex items-start gap-2.5 max-w-md">
            <input type="checkbox" disabled className="w-4 h-4 mt-0.5 rounded cursor-not-allowed border-muted bg-background" />
            <span className="text-xs leading-relaxed text-muted-foreground">{String(block.content.label || "I acknowledge and agree.")}</span>
          </div>
        )}

        {/* signature */}
        {block.type === "signature" && (
          <div className="border-t border-dashed pt-4 mt-2 space-y-3 max-w-md">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="font-semibold">{String(block.content.label || "Client Signature")}</span>
              <span>Date: ________________________</span>
            </div>
            <div className="h-10 bg-muted/20 rounded flex items-center justify-center border text-[10px] text-muted-foreground italic">
              Digital Signature Box
            </div>
          </div>
        )}

        {/* initial */}
        {block.type === "initial" && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold">{String(block.content.label || "Initials")}</span>
            <div className="w-12 h-8 bg-muted/20 rounded border flex items-center justify-center text-[10px] text-muted-foreground font-mono">
              [   ]
            </div>
          </div>
        )}

        {/* payment */}
        {block.type === "payment" && (
          <Card className="border bg-card max-w-md">
            <CardContent className="p-3.5 space-y-2.5">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">Payment Plan Selection</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded border bg-muted/10 text-xs">
                  <span className="font-medium">{String(block.content.oneTimeLabel || "Pay in Full")}</span>
                  <span className="font-bold text-amber-500">${String(block.content.oneTimeAmount || "0.00")}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded border bg-muted/10 text-xs">
                  <span className="font-medium">{String(block.content.monthlyLabel || "Installment Plan")}</span>
                  <span className="font-bold text-amber-500">${String(block.content.monthlyAmount || "0.00")} / mo ({String(block.content.months || 12)} months)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* addon */}
        {block.type === "addon" && (
          <div className="space-y-2 max-w-md">
            <Label className="text-xs font-bold text-muted-foreground">{String(block.content.label || "Optional Add-ons")}</Label>
            <div className="p-4 border border-dashed rounded-xl bg-muted/5 text-xs text-muted-foreground italic text-center">
              (Optional purchasable items display selection checkbox)
            </div>
          </div>
        )}

        {/* conditional */}
        {block.type === "conditional" && (
          <div className="p-4 border border-amber-500/20 rounded-xl bg-amber-500/5 space-y-2.5 max-w-md">
            <div className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              Conditional Block Link
            </div>
            <p className="text-xs font-semibold">{String(block.content.question || "Condition Question?")}</p>
            <div className="flex gap-2">
              <Button disabled variant="outline" className="h-7 text-xs px-3">{String(block.content.yesLabel || "Yes")}</Button>
              <Button disabled variant="outline" className="h-7 text-xs px-3">{String(block.content.noLabel || "No")}</Button>
            </div>
          </div>
        )}

        {/* image */}
        {block.type === "image" && (
          <div className="flex items-center justify-center p-3 border rounded-xl bg-muted/5 min-h-16">
            {block.content.url ? (
              <img src={String(block.content.url)} alt={String(block.content.alt || "")} className="max-h-40 object-contain rounded" />
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Image className="w-4 h-4" /> Image Preview</span>
            )}
          </div>
        )}

        {/* internal_note */}
        {block.type === "internal_note" && (
          <div className="p-4 border border-purple-500/20 rounded-xl bg-purple-500/5 space-y-1.5 max-w-md">
            <div className="text-xs font-bold text-purple-600 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" />
              Advocate Only Note
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{String(block.content.text || "(empty note)")}</p>
          </div>
        )}

        {/* divider */}
        {block.type === "divider" && (
          <div className="py-2">
            <div
              style={{
                borderTopStyle: (block.content.style as any) || "solid",
                borderTopWidth: `${block.content.height ?? 1}px`,
                borderTopColor: String(block.content.color ?? "#e2e8f0"),
              }}
              className="w-full"
            />
          </div>
        )}

        {/* video */}
        {block.type === "video" && (
          <div className="aspect-video bg-slate-950 rounded-lg flex flex-col items-center justify-center border text-xs text-slate-400 gap-2 overflow-hidden max-w-md relative">
            <Video className="w-8 h-8 text-amber-500" />
            <span className="font-medium">Video Player Preview</span>
            {Boolean(block.content.url) && <span className="text-[10px] text-slate-600 font-mono truncate max-w-xs">{String(block.content.url)}</span>}
          </div>
        )}

        {/* iframe */}
        {block.type === "iframe" && (
          <div className="border rounded-lg bg-card overflow-hidden max-w-md">
            <div className="bg-muted px-3 py-1.5 text-[9px] text-muted-foreground border-b flex items-center gap-1.5 font-mono truncate">
              <Globe className="w-3 h-3 text-muted-foreground" />
              {String(block.content.url || "https://example.com")}
            </div>
            <div
              style={{ height: `${block.content.height ?? 200}px` }}
              className="bg-muted/5 flex items-center justify-center text-xs text-muted-foreground italic"
            >
              Iframe Preview Window
            </div>
          </div>
        )}

        {/* scheduler */}
        {block.type === "scheduler" && (
          <div className="p-4 border rounded-xl bg-card space-y-3 max-w-md">
            <div className="flex items-center justify-between border-b pb-1.5">
              <h4 className="font-semibold text-xs flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-amber-500" />
                {String(block.content.title || "Schedule a Meeting")}
              </h4>
              <Badge variant="secondary" className="text-[10px] font-medium">Calendar Widget</Badge>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground py-1.5 border rounded bg-muted/5 font-mono">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <div key={i} className="py-1 border-r last:border-r-0">
                  <div className="font-bold border-b pb-0.5">{d}</div>
                  <div className="pt-1 text-muted-foreground/30">{10 + i}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
  const [templateSettings, setTemplateSettings] = useState<Record<string, any>>({
    headingFont: "Inter",
    bodyFont: "Inter",
    backgroundColor: "",
    textColor: "",
    highlightColor: "#f59e0b",
    buttonFont: "Inter",
    buttonSize: "normal",
    buttonRadius: 8,
    buttonTextColor: "#ffffff",
    questionFont: "Inter",
    questionSize: "normal",
    questionTextColor: "",
    questionWarningColor: "#ef4444",
    questionInputFill: "transparent",
    questionInputBorder: "#e2e8f0",
    questionInputRadius: 6,
    expirationEnabled: false,
    expirationValue: 2,
    expirationUnit: "weeks",
    expirationDisplay: false,
    expirationMessage: "This file has expired.",
    redirectUrlEnabled: false,
    redirectUrl: "https://",
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Layout Sidebar & Dialog controls
  const [activeStyleBlockId, setActiveStyleBlockId] = useState<string | null>(null);
  const [showAddBlockDialog, setShowAddBlockDialog] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const { data, isLoading } = trpc.smartFiles.getTemplate.useQuery({ templateId }, { enabled: !!templateId });

  useEffect(() => {
    if (!data) return;
    setTemplateName(data.name);
    setTemplateDesc(data.description ?? "");
    setTemplateStatus(data.status as "draft" | "active" | "archived");
    if (data.settings) {
      try {
        setTemplateSettings((prev) => ({ ...prev, ...JSON.parse(data.settings ?? "{}") }));
      } catch (e) {
        console.error("Failed to parse template settings:", e);
      }
    }
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
      await updateMutation.mutateAsync({ templateId, name: templateName, description: templateDesc, status: templateStatus, settings: JSON.stringify(templateSettings) });
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
  }, [templateId, templateName, templateDesc, templateStatus, templateSettings, blocks, addOns]);

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

  const applyStarterTemplate = (type: string) => {
    let starterBlocks: Block[] = [];
    const timestamp = Date.now();
    
    switch (type) {
      case "invoice_pay":
        starterBlocks = [
          { id: `start-1-${timestamp}`, blockOrder: 0, type: "heading", content: { text: "Invoice & Payment" }, settings: {} },
          { id: `start-2-${timestamp}`, blockOrder: 1, type: "text", content: { text: "Thank you for choosing Waypoint Advocates. Below you will find your invoice and payment terms for our advocacy services." }, settings: {} },
          { id: `start-3-${timestamp}`, blockOrder: 2, type: "service", content: { title: "IEP Coaching & Consultation Package", description: "Comprehensive coaching package including document reviews, strategy sessions, and school meeting advocacy representation.", price: "$2,400", showDescription: true, showPrice: true, showSubItems: false }, settings: {} },
          { id: `start-4-${timestamp}`, blockOrder: 3, type: "payment", content: { oneTimeLabel: "Pay in Full", oneTimeAmount: "2400", monthlyLabel: "3-Month Installments", monthlyAmount: "800", months: 3, dueDate: "" }, settings: { required: true } },
          { id: `start-5-${timestamp}`, blockOrder: 4, type: "signature", content: { label: "Client Authorization" }, settings: {} }
        ];
        break;
      case "contract":
        starterBlocks = [
          { id: `start-1-${timestamp}`, blockOrder: 0, type: "heading", content: { text: "Advocacy Services Agreement" }, settings: {} },
          { id: `start-2-${timestamp}`, blockOrder: 1, type: "text", content: { text: "This agreement is entered into by and between Waypoint Advocates and the parent/client." }, settings: {} },
          { id: `start-3-${timestamp}`, blockOrder: 2, type: "contract", content: { text: "1. Scope of Representation\nWaypoint Advocates will provide Master IEP Coach consulting, document review, and meeting advocacy services as requested.\n\n2. Fees and Billing\nClient agrees to pay the package rates in full or in agreed installments before services are rendered." }, settings: {} },
          { id: `start-4-${timestamp}`, blockOrder: 3, type: "initial", content: { label: "I have read and agree to Section 1 & 2" }, settings: {} },
          { id: `start-5-${timestamp}`, blockOrder: 4, type: "signature", content: { label: "Advocate Signature" }, settings: {} },
          { id: `start-6-${timestamp}`, blockOrder: 5, type: "signature", content: { label: "Parent/Client Signature" }, settings: {} }
        ];
        break;
      case "proposal":
        starterBlocks = [
          { id: `start-1-${timestamp}`, blockOrder: 0, type: "heading", content: { text: "Advocacy Services Proposal" }, settings: {} },
          { id: `start-2-${timestamp}`, blockOrder: 1, type: "text", content: { text: "Here are the customized packages prepared for your student. Choose a package below to proceed to the agreement." }, settings: {} },
          { id: `start-3-${timestamp}`, blockOrder: 2, type: "service", content: { title: "Complete IEP Strategy Package", description: "Includes complete review of records, customized strategy blueprint, and 2 school advocacy meetings.", price: "$1,800", showDescription: true, showPrice: true, showSubItems: false }, settings: {} },
          { id: `start-4-${timestamp}`, blockOrder: 3, type: "addon", content: { label: "Optional Add-On: Additional Meeting Representation" }, settings: {} },
          { id: `start-5-${timestamp}`, blockOrder: 4, type: "signature", content: { label: "Sign to Accept Proposal" }, settings: {} }
        ];
        break;
      case "questions":
        starterBlocks = [
          { id: `start-1-${timestamp}`, blockOrder: 0, type: "heading", content: { text: "IEP Client Intake Questions" }, settings: {} },
          { id: `start-2-${timestamp}`, blockOrder: 1, type: "text", content: { text: "Please complete these initial questions to help us prepare for our consultation session." }, settings: {} },
          { id: `start-3-${timestamp}`, blockOrder: 2, type: "field", content: { label: "What is your child's primary eligibility category?", placeholder: "e.g. Autism, OHI, SLD" }, settings: { required: true, fieldType: "text" } },
          { id: `start-4-${timestamp}`, blockOrder: 3, type: "field", content: { label: "What are your main concerns regarding the current IEP?", placeholder: "Describe goals, accommodations, or placements..." }, settings: { required: false, fieldType: "textarea" } },
          { id: `start-5-${timestamp}`, blockOrder: 4, type: "checkbox", content: { label: "I authorize Waypoint Advocates to review my child's education records." }, settings: { required: true } }
        ];
        break;
      case "service_selection":
        starterBlocks = [
          { id: `start-1-${timestamp}`, blockOrder: 0, type: "heading", content: { text: "Select Your Advocacy Package" }, settings: {} },
          { id: `start-2-${timestamp}`, blockOrder: 1, type: "service", content: { title: "Basic Record Audit", description: "Audit of current IEP, previous evaluations, and progress reports with summary memo.", price: "$450", showDescription: true, showPrice: true, showSubItems: false }, settings: {} },
          { id: `start-3-${timestamp}`, blockOrder: 2, type: "service", content: { title: "Premium Strategy Plan", description: "Full audit + 2 strategy zoom sessions + customized advocacy target guidelines.", price: "$950", showDescription: true, showPrice: true, showSubItems: false }, settings: {} },
          { id: `start-4-${timestamp}`, blockOrder: 3, type: "addon", content: { label: "Add-on: IEP Draft Review Session ($150)" }, settings: {} }
        ];
        break;
      case "scheduling":
        starterBlocks = [
          { id: `start-1-${timestamp}`, blockOrder: 0, type: "heading", content: { text: "Book Your Advocacy Strategy Session" }, settings: {} },
          { id: `start-2-${timestamp}`, blockOrder: 1, type: "text", content: { text: "Choose a time on the calendar below to book your strategy meeting with our coaching team." }, settings: {} },
          { id: `start-3-${timestamp}`, blockOrder: 2, type: "scheduler", content: { title: "IEP Strategy Zoom (1 Hour)", appointmentTypeId: "" }, settings: {} }
        ];
        break;
      default:
        break;
    }
    
    setBlocks(starterBlocks);
    setShowOnboarding(false);
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

  const fontFamilies = ["Inter", "Roboto", "Outfit", "Raleway", "Playfair Display", "Concert One"];

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading template...
      </div>
    );
  }

  const selectedBlockIndex = activeStyleBlockId ? blocks.findIndex(b => b.id === activeStyleBlockId) : -1;
  const selectedBlock = selectedBlockIndex !== -1 ? blocks[selectedBlockIndex] : null;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-background transition-colors duration-300">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card sticky top-0 z-10">
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
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowThemeModal(true)} className="flex items-center gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
              <Palette className="w-3.5 h-3.5" />
              Customize theme
            </Button>

            <Button size="sm" variant="outline" onClick={() => setShowSettingsModal(true)} className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              File settings
            </Button>

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

            <Button size="sm" onClick={handleSave} disabled={saving || !dirty} className="bg-amber-500 text-amber-950 font-semibold hover:bg-amber-600 transition-all duration-300 shadow-sm">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving..." : dirty ? "Save" : "Saved"}
            </Button>

            <Button size="sm" variant="ghost" onClick={() => navigate(`/smart-files/${templateId}/assignments`)}>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Assignments
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Blocks / AddOns selector canvas */}
          {blocks.length === 0 && showOnboarding ? (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
                <div className="text-center space-y-3">
                  <h2 className="text-3xl font-extrabold tracking-tight">Select a starting point for your smart file</h2>
                  <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                    Choose one of our hand-crafted starting flows to pre-populate custom blocks, or start completely custom.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <Card className="hover:border-amber-500 hover:shadow-md cursor-pointer transition-all duration-300 group border bg-card" onClick={() => applyStarterTemplate("invoice_pay")}>
                    <CardContent className="pt-6 text-center space-y-3">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-base">Invoice & Pay</h3>
                      <p className="text-xs text-muted-foreground">List services, pricing structures, and accept secure payments.</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-amber-500 hover:shadow-md cursor-pointer transition-all duration-300 group border bg-card" onClick={() => applyStarterTemplate("contract")}>
                    <CardContent className="pt-6 text-center space-y-3">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-base">Contract</h3>
                      <p className="text-xs text-muted-foreground">Add legal terms, client initials, and digital signatures.</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-amber-500 hover:shadow-md cursor-pointer transition-all duration-300 group border bg-card" onClick={() => applyStarterTemplate("proposal")}>
                    <CardContent className="pt-6 text-center space-y-3">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-base">Proposal</h3>
                      <p className="text-xs text-muted-foreground">Showcase services package configurations with custom styling.</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-amber-500 hover:shadow-md cursor-pointer transition-all duration-300 group border bg-card" onClick={() => applyStarterTemplate("questions")}>
                    <CardContent className="pt-6 text-center space-y-3">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-base">Questions</h3>
                      <p className="text-xs text-muted-foreground">Collect student details, parent goals, and intake forms.</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-amber-500 hover:shadow-md cursor-pointer transition-all duration-300 group border bg-card" onClick={() => applyStarterTemplate("service_selection")}>
                    <CardContent className="pt-6 text-center space-y-3">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                        <LayoutGrid className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-base">Service Selection</h3>
                      <p className="text-xs text-muted-foreground">Allow clients to review and choose their preferred plan.</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-amber-500 hover:shadow-md cursor-pointer transition-all duration-300 group border bg-card" onClick={() => applyStarterTemplate("scheduling")}>
                    <CardContent className="pt-6 text-center space-y-3">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                        <CalendarClock className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-base">Scheduling</h3>
                      <p className="text-xs text-muted-foreground">Embed appointment booking widgets and calendar scheduler.</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-center pt-6">
                  <Button variant="ghost" className="text-amber-500 hover:text-amber-600 font-semibold flex items-center gap-1 mx-auto" onClick={() => setShowOnboarding(false)}>
                    Or build custom file block by block <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Left: Block palette */}
              <div className="w-56 border-r bg-card overflow-y-auto p-3 shrink-0 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add Block</p>
                  <div className="space-y-1">
                    {BLOCK_PALETTE.map((item) => (
                      <button
                        key={item.type}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left font-medium"
                        onClick={() => addBlock(item.type)}
                      >
                        <span className="text-muted-foreground">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mt-6 border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Smart Fields</p>
                  <div className="flex flex-wrap gap-1">
                    {SMART_FIELDS.map((f) => (
                      <span key={f} className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-mono">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center: Canvas */}
              <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                <Tabs defaultValue="blocks">
                  <TabsList className="mb-4">
                    <TabsTrigger value="blocks">Blocks ({blocks.length})</TabsTrigger>
                    <TabsTrigger value="addons">Add-Ons ({addOns.length})</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  {/* Blocks tab */}
                  <TabsContent value="blocks">
                    {blocks.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground max-w-2xl bg-card">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Click a block type on the left to add it here.</p>
                      </div>
                    )}
                    <div className="space-y-4 max-w-2xl">
                      {blocks.map((block, i) => {
                        const isSelected = activeStyleBlockId === block.id;
                        const blockStyle = {
                          backgroundColor: String(block.settings.bgColor ?? ""),
                          opacity: Number(block.settings.bgOpacity ?? 100) / 100,
                          padding: block.settings.paddingSize === "none" ? "0" :
                                   block.settings.paddingSize === "S" ? "0.5rem" :
                                   block.settings.paddingSize === "L" ? "1.5rem" :
                                   block.settings.paddingSize === "XL" ? "2.5rem" : "1rem",
                        };

                        return (
                          <div
                            key={block.id}
                            style={blockStyle}
                            className={`rounded-xl transition-all duration-300 ${
                              isSelected ? "ring-2 ring-amber-500 shadow-md scale-[1.01]" : "hover:shadow-sm"
                            }`}
                          >
                            <VisualBlock
                              block={block}
                              isActive={isSelected}
                              onSelect={() => setActiveStyleBlockId(block.id)}
                              onDelete={() => deleteBlock(i)}
                              onMoveUp={() => moveBlock(i, -1)}
                              onMoveDown={() => moveBlock(i, 1)}
                              isFirst={i === 0}
                              isLast={i === blocks.length - 1}
                              templateSettings={templateSettings}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* Add-Ons tab */}
                  <TabsContent value="addons">
                    <div className="max-w-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Add optional purchasable items. Clients see name, description, and price. Full contract text is added to the signed document if selected.
                        </p>
                        <Button size="sm" onClick={addAddOn} className="bg-amber-500 text-amber-950 font-semibold hover:bg-amber-600">
                          <Plus className="w-3 h-3 mr-2" /> Add Item
                        </Button>
                      </div>
                      {addOns.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm bg-card">
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

              {/* Right: Block Fields & Layout Customizer Sidebar */}
              {selectedBlock && (
                <div className="w-80 border-l bg-card flex flex-col overflow-hidden shrink-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-amber-500 uppercase tracking-wider">
                        {BLOCK_PALETTE.find((p) => p.type === selectedBlock.type)?.label || selectedBlock.type}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setActiveStyleBlockId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid grid-cols-2 rounded-none border-b h-10 p-0 bg-transparent shrink-0">
                      <TabsTrigger value="content" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent h-full">Content</TabsTrigger>
                      <TabsTrigger value="layout" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent h-full">Layout</TabsTrigger>
                    </TabsList>

                    {/* Content tab: edit values/inputs */}
                    <TabsContent value="content" className="flex-1 overflow-y-auto p-4 space-y-4 focus-visible:outline-none">
                      <BlockFieldsEditor block={selectedBlock} onChange={(updated) => updateBlock(selectedBlockIndex, updated)} />
                    </TabsContent>

                    {/* Layout tab: edit style rules */}
                    <TabsContent value="layout" className="flex-1 overflow-y-auto p-4 space-y-4 focus-visible:outline-none">
                      {/* Column Layout */}
                      <div className="space-y-2">
                        <Label className="text-xs">Columns layout</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3].map((col) => (
                            <Button
                              key={col}
                              variant={Number(selectedBlock.settings.cols ?? 1) === col ? "default" : "outline"}
                              className="h-8 text-xs font-semibold"
                              onClick={() => {
                                const updated = { ...selectedBlock, settings: { ...selectedBlock.settings, cols: col } };
                                updateBlock(selectedBlockIndex, updated);
                              }}
                            >
                              {col} Col
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Padding Size */}
                      <div className="space-y-2">
                        <Label className="text-xs">Block Padding presets</Label>
                        <div className="grid grid-cols-5 gap-1">
                          {["none", "S", "M", "L", "XL"].map((sz) => (
                            <Button
                              key={sz}
                              variant={(selectedBlock.settings.paddingSize ?? "M") === sz ? "default" : "outline"}
                              className="h-7 text-xs p-0"
                              onClick={() => {
                                const updated = { ...selectedBlock, settings: { ...selectedBlock.settings, paddingSize: sz } };
                                updateBlock(selectedBlockIndex, updated);
                              }}
                            >
                              {sz.toUpperCase()}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Content Width Preset */}
                      <div className="space-y-2">
                        <Label className="text-xs">Content Width preset</Label>
                        <div className="grid grid-cols-4 gap-1">
                          {["S", "M", "L", "100%"].map((wd) => (
                            <Button
                              key={wd}
                              variant={(selectedBlock.settings.contentWidth ?? "100%") === wd ? "default" : "outline"}
                              className="h-7 text-[10px] p-0"
                              onClick={() => {
                                const updated = { ...selectedBlock, settings: { ...selectedBlock.settings, contentWidth: wd } };
                                updateBlock(selectedBlockIndex, updated);
                              }}
                            >
                              {wd}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Background Color */}
                      <div className="space-y-2">
                        <Label className="text-xs">Background color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            className="w-8 h-8 p-0 rounded cursor-pointer shrink-0"
                            value={String(selectedBlock.settings.bgColor ?? "#ffffff")}
                            onChange={(e) => {
                              const updated = { ...selectedBlock, settings: { ...selectedBlock.settings, bgColor: e.target.value } };
                              updateBlock(selectedBlockIndex, updated);
                            }}
                          />
                          <Input
                            type="text"
                            className="h-8 text-xs font-mono"
                            placeholder="#ffffff"
                            value={String(selectedBlock.settings.bgColor ?? "")}
                            onChange={(e) => {
                              const updated = { ...selectedBlock, settings: { ...selectedBlock.settings, bgColor: e.target.value } };
                              updateBlock(selectedBlockIndex, updated);
                            }}
                          />
                        </div>
                      </div>

                      {/* Opacity slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <Label>Background Opacity</Label>
                          <span className="font-semibold text-muted-foreground">{Number(selectedBlock.settings.bgOpacity ?? 100)}%</span>
                        </div>
                        <Slider
                          value={[Number(selectedBlock.settings.bgOpacity ?? 100)]}
                          max={100}
                          min={0}
                          step={5}
                          onValueChange={(val) => {
                            const updated = { ...selectedBlock, settings: { ...selectedBlock.settings, bgOpacity: val[0] } };
                            updateBlock(selectedBlockIndex, updated);
                          }}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="p-4 border-t bg-muted/10">
                    <p className="text-[10px] text-muted-foreground">
                      * Changes are saved live to this block element. Press the Save button in the header to persist files.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {/* ─── Customize Theme Modal ─── */}
      <Dialog open={showThemeModal} onOpenChange={setShowThemeModal}>
        <DialogContent className="max-w-4xl p-6 bg-card border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
              <Palette className="w-5 h-5 text-amber-500" />
              Customize document theme
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Left Column: Customizer inputs */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Typography</Label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <div>
                    <Label className="text-[11px]">Heading Font</Label>
                    <Select value={templateSettings.headingFont} onValueChange={(v) => { setTemplateSettings({ ...templateSettings, headingFont: v }); setDirty(true); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontFamilies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Body Font</Label>
                    <Select value={templateSettings.bodyFont} onValueChange={(v) => { setTemplateSettings({ ...templateSettings, bodyFont: v }); setDirty(true); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontFamilies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colors</Label>
                <div className="space-y-3 mt-1.5">
                  <div>
                    <Label className="text-[11px]">Background color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="color" className="w-8 h-8 p-0 rounded cursor-pointer" value={templateSettings.backgroundColor || "#ffffff"} onChange={(e) => { setTemplateSettings({ ...templateSettings, backgroundColor: e.target.value }); setDirty(true); }} />
                      <Input type="text" className="h-8 text-xs font-mono" value={templateSettings.backgroundColor || ""} placeholder="Default (Theme dependent)" onChange={(e) => { setTemplateSettings({ ...templateSettings, backgroundColor: e.target.value }); setDirty(true); }} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px]">Text color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="color" className="w-8 h-8 p-0 rounded cursor-pointer" value={templateSettings.textColor || "#000000"} onChange={(e) => { setTemplateSettings({ ...templateSettings, textColor: e.target.value }); setDirty(true); }} />
                      <Input type="text" className="h-8 text-xs font-mono" value={templateSettings.textColor || ""} placeholder="Default (Theme dependent)" onChange={(e) => { setTemplateSettings({ ...templateSettings, textColor: e.target.value }); setDirty(true); }} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px]">Highlight / Accent color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="color" className="w-8 h-8 p-0 rounded cursor-pointer" value={templateSettings.highlightColor || "#f59e0b"} onChange={(e) => { setTemplateSettings({ ...templateSettings, highlightColor: e.target.value }); setDirty(true); }} />
                      <Input type="text" className="h-8 text-xs font-mono" value={templateSettings.highlightColor || ""} onChange={(e) => { setTemplateSettings({ ...templateSettings, highlightColor: e.target.value }); setDirty(true); }} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action Buttons</Label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <div>
                    <Label className="text-[11px]">Button Font</Label>
                    <Select value={templateSettings.buttonFont} onValueChange={(v) => { setTemplateSettings({ ...templateSettings, buttonFont: v }); setDirty(true); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontFamilies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Button Radius (px)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Slider
                        value={[Number(templateSettings.buttonRadius ?? 8)]}
                        max={30}
                        min={0}
                        step={2}
                        onValueChange={(val) => { setTemplateSettings({ ...templateSettings, buttonRadius: val[0] }); setDirty(true); }}
                        className="flex-1"
                      />
                      <span className="text-xs font-semibold shrink-0 w-6 text-right">{templateSettings.buttonRadius ?? 8}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Preview Pane */}
            <div className="border rounded-xl p-4 bg-muted/30 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b pb-1">Real-time theme preview</p>
                <div
                  style={{
                    backgroundColor: templateSettings.backgroundColor || "transparent",
                    color: templateSettings.textColor || "inherit",
                    fontFamily: templateSettings.bodyFont || "sans-serif"
                  }}
                  className="p-4 rounded-lg border bg-background space-y-4 shadow-sm"
                >
                  <h1
                    style={{ fontFamily: templateSettings.headingFont || "sans-serif" }}
                    className="text-lg font-bold border-b pb-1"
                  >
                    Sample Header Title
                  </h1>
                  <p className="text-xs">
                    This is an interactive preview demonstrating how your smart document layouts will look to the client when they view the final form.
                  </p>
                  
                  <div className="space-y-1.5 p-3 rounded-lg border bg-muted/40">
                    <Label
                      style={{
                        fontFamily: templateSettings.questionFont || "sans-serif",
                        color: templateSettings.questionTextColor || templateSettings.textColor || "inherit"
                      }}
                      className="text-xs font-semibold"
                    >
                      Question: Describe your concerns
                    </Label>
                    <Input disabled placeholder="Intake answer input..." className="h-8 text-xs bg-background" />
                  </div>

                  <Button
                    style={{
                      fontFamily: templateSettings.buttonFont || "sans-serif",
                      borderRadius: `${templateSettings.buttonRadius ?? 8}px`,
                      backgroundColor: templateSettings.highlightColor || "#f59e0b",
                      color: templateSettings.buttonTextColor || "#ffffff"
                    }}
                    className="w-full h-8 text-xs font-semibold hover:opacity-90"
                    disabled
                  >
                    Submit Agreement & Pay
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 text-center">
                Font preview rendering may vary depending on local system support.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button size="sm" onClick={() => setShowThemeModal(false)} className="bg-amber-500 text-amber-950 font-semibold hover:bg-amber-600">
              Apply theme settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── File settings (Expiration & Redirect) Modal ─── */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-lg p-6 bg-card border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
              <Settings className="w-5 h-5 text-amber-500" />
              File Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Title & Thumbnail */}
            <div className="space-y-2 border rounded-xl p-4 bg-muted/10">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title & Thumbnail</Label>
              <div>
                <Label className="text-xs">Give your file a title</Label>
                <Input
                  className="mt-1"
                  value={templateName}
                  onChange={(e) => { setTemplateName(e.target.value); setDirty(true); }}
                />
              </div>
            </div>

            {/* File Expiration */}
            <div className="space-y-3 border rounded-xl p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">File Expiration</Label>
                  <span className="text-[11px] text-muted-foreground">Add an expiration to encourage clients to respond quickly</span>
                </div>
                <Switch
                  checked={Boolean(templateSettings.expirationEnabled)}
                  onCheckedChange={(v) => { setTemplateSettings({ ...templateSettings, expirationEnabled: v }); setDirty(true); }}
                />
              </div>

              {Boolean(templateSettings.expirationEnabled) && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Expires in</Label>
                      <Input
                        type="number"
                        className="mt-1 h-8 text-xs"
                        value={Number(templateSettings.expirationValue ?? 2)}
                        onChange={(e) => { setTemplateSettings({ ...templateSettings, expirationValue: Number(e.target.value) }); setDirty(true); }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Time Unit</Label>
                      <Select value={templateSettings.expirationUnit} onValueChange={(v) => { setTemplateSettings({ ...templateSettings, expirationUnit: v }); setDirty(true); }}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">days</SelectItem>
                          <SelectItem value="weeks">weeks</SelectItem>
                          <SelectItem value="months">months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={Boolean(templateSettings.expirationDisplay)}
                      onCheckedChange={(v) => { setTemplateSettings({ ...templateSettings, expirationDisplay: v }); setDirty(true); }}
                    />
                    <Label className="text-xs">Display expiration date inside the file</Label>
                  </div>

                  <div>
                    <Label className="text-xs">Expiration message</Label>
                    <Textarea
                      className="mt-1 text-xs"
                      rows={2}
                      value={templateSettings.expirationMessage}
                      onChange={(e) => { setTemplateSettings({ ...templateSettings, expirationMessage: e.target.value }); setDirty(true); }}
                    />
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground italic">
                    * Once a client books this file, it will no longer expire.
                  </p>
                </div>
              )}
            </div>

            {/* Redirect URL */}
            <div className="space-y-3 border rounded-xl p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Redirect URL</Label>
                  <span className="text-[11px] text-muted-foreground">Send clients to a URL of your choice after completion</span>
                </div>
                <Switch
                  checked={Boolean(templateSettings.redirectUrlEnabled)}
                  onCheckedChange={(v) => { setTemplateSettings({ ...templateSettings, redirectUrlEnabled: v }); setDirty(true); }}
                />
              </div>

              {Boolean(templateSettings.redirectUrlEnabled) && (
                <div className="pt-2 border-t">
                  <Label className="text-xs">Redirect Destination URL</Label>
                  <Input
                    className="mt-1 h-8 text-xs font-mono"
                    placeholder="https://www.yoururlhere.com"
                    value={templateSettings.redirectUrl}
                    onChange={(e) => { setTemplateSettings({ ...templateSettings, redirectUrl: e.target.value }); setDirty(true); }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    If no redirect URL is active, your clients will be presented with the default file completion message.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button size="sm" onClick={() => setShowSettingsModal(false)} className="bg-amber-500 text-amber-950 font-semibold hover:bg-amber-600">
              Save & exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
