import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Plus, Trash2, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

export type TagColorId =
  | "green"
  | "mint"
  | "blue"
  | "purple"
  | "pink"
  | "rose"
  | "peach"
  | "yellow"
  | "taupe"
  | "stone";

export interface TagColorSpec {
  id: TagColorId;
  label: string;
  bg: string;
  text: string;
  border: string;
  swatchBg: string;
}

/**
 * 10 tag color swatches arranged in 2 rows of 5, tuned to look rich and crisp
 * against Waypoint's deep navy & brass surfaces.
 */
export const TAG_COLOR_PALETTE: TagColorSpec[] = [
  // Row 1
  {
    id: "green",
    label: "Emerald Sage",
    bg: "#D8F0CE",
    text: "#143318",
    border: "#9CD48A",
    swatchBg: "#D8F0CE",
  },
  {
    id: "mint",
    label: "Seafoam Mint",
    bg: "#D6F3EE",
    text: "#0E3631",
    border: "#94DDD1",
    swatchBg: "#D6F3EE",
  },
  {
    id: "blue",
    label: "Admiralty Sky",
    bg: "#D6E4FA",
    text: "#122747",
    border: "#96B8F2",
    swatchBg: "#D6E4FA",
  },
  {
    id: "purple",
    label: "Royal Lavender",
    bg: "#E8D7F8",
    text: "#2A1544",
    border: "#C49EEB",
    swatchBg: "#E8D7F8",
  },
  {
    id: "pink",
    label: "Rose Quartz",
    bg: "#FADCEB",
    text: "#451434",
    border: "#EDA3CE",
    swatchBg: "#FADCEB",
  },
  // Row 2
  {
    id: "rose",
    label: "Crimson Blush",
    bg: "#F8DADA",
    text: "#3D1414",
    border: "#E8A2A2",
    swatchBg: "#F8DADA",
  },
  {
    id: "peach",
    label: "Burnished Amber",
    bg: "#FBE4C4",
    text: "#3E2408",
    border: "#EBB875",
    swatchBg: "#FBE4C4",
  },
  {
    id: "yellow",
    label: "Sovereign Gold",
    bg: "#FBF0C4",
    text: "#3B2C06",
    border: "#EBD378",
    swatchBg: "#FBF0C4",
  },
  {
    id: "taupe",
    label: "Warm Parchment",
    bg: "#E8DDD2",
    text: "#30241A",
    border: "#C9B49F",
    swatchBg: "#E8DDD2",
  },
  {
    id: "stone",
    label: "Slate Stone",
    bg: "#E4E7EC",
    text: "#1E2530",
    border: "#B9C2D0",
    swatchBg: "#E4E7EC",
  },
];

export interface CompanyTag {
  id: string;
  name: string;
  colorId: TagColorId;
}

export interface CustomStudentStage {
  id: string;
  label: string;
  subtitle?: string;
  linkedTagName: string;
}

export const DEFAULT_COMPANY_TAGS: CompanyTag[] = [
  { id: "tag-high-priority", name: "High Priority", colorId: "rose" },
  { id: "tag-low-priority", name: "Low priority", colorId: "blue" },
  { id: "tag-fix-errors", name: "fix errors", colorId: "purple" },
  { id: "tag-call", name: "call", colorId: "mint" },
  { id: "tag-on-hold", name: "On Hold", colorId: "yellow" },
  { id: "tag-active", name: "Active", colorId: "green" },
  { id: "tag-no-pay", name: "NO PAY", colorId: "rose" },
  { id: "tag-lawyer-action", name: "LAWYER ACTION", colorId: "peach" },
  { id: "tag-not-signed", name: "not signed", colorId: "stone" },
  { id: "tag-iep-soon", name: "IEP SOON", colorId: "purple" },
  { id: "tag-lost", name: "Lost", colorId: "taupe" },
  { id: "tag-nonpayment", name: "NONPAYMENT", colorId: "rose" },
  { id: "tag-failed-discovery", name: "Failed Discovery", colorId: "rose" },
  { id: "tag-scholarship", name: "SCHOLARSHIP", colorId: "stone" },
  { id: "tag-archive", name: "Archive", colorId: "rose" },
  { id: "tag-new", name: "New", colorId: "mint" },
  { id: "tag-assisting", name: "Assisting", colorId: "stone" },
  { id: "tag-paid-in-full", name: "PaidInFull", colorId: "purple" },
  { id: "tag-combo", name: "Combo", colorId: "blue" },
  { id: "tag-renewal-needed", name: "RENEWAL NEEDED", colorId: "rose" },
  { id: "tag-cancelation", name: "Cancelation", colorId: "rose" },
  { id: "tag-discovery", name: "Discovery", colorId: "mint" },
];

const COMPANY_TAGS_STORAGE_KEY = "waypoint_company_tags_v1";
const STUDENT_TAGS_MAP_STORAGE_KEY = "waypoint_student_tags_map_v1";
const CUSTOM_STAGES_STORAGE_KEY = "waypoint_student_custom_stages_v1";

export function getTagColorSpec(colorId?: TagColorId | string): TagColorSpec {
  return (
    TAG_COLOR_PALETTE.find((c) => c.id === colorId) || TAG_COLOR_PALETTE[2]
  );
}

export function loadCompanyTags(): CompanyTag[] {
  try {
    const raw = localStorage.getItem(COMPANY_TAGS_STORAGE_KEY);
    if (!raw) return DEFAULT_COMPANY_TAGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_COMPANY_TAGS;
}

export function saveCompanyTags(tags: CompanyTag[]) {
  try {
    localStorage.setItem(COMPANY_TAGS_STORAGE_KEY, JSON.stringify(tags));
    window.dispatchEvent(new CustomEvent("waypoint-tags-updated"));
  } catch (err) {
    console.error("Failed to save company tags:", err);
  }
}

export function loadStudentTagsMap(): Record<number, string[]> {
  try {
    const raw = localStorage.getItem(STUDENT_TAGS_MAP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveStudentTagsMap(map: Record<number, string[]>) {
  try {
    localStorage.setItem(STUDENT_TAGS_MAP_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("waypoint-tags-updated"));
  } catch (err) {
    console.error("Failed to save student tags map:", err);
  }
}

export function loadCustomStudentStages(): CustomStudentStage[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveCustomStudentStages(stages: CustomStudentStage[]) {
  try {
    localStorage.setItem(CUSTOM_STAGES_STORAGE_KEY, JSON.stringify(stages));
    window.dispatchEvent(new CustomEvent("waypoint-tags-updated"));
  } catch (err) {
    console.error("Failed to save custom student stages:", err);
  }
}

/**
 * Renders a single colored tag pill with crisp border and shadow.
 */
export function TagBadgePill({
  name,
  colorId,
  onRemove,
  onClick,
  size = "md",
  className,
}: {
  name: string;
  colorId?: TagColorId;
  onRemove?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const spec = getTagColorSpec(colorId);
  return (
    <span
      onClick={onClick}
      style={{
        backgroundColor: spec.bg,
        color: spec.text,
        borderColor: spec.border,
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] font-sans font-semibold border select-none transition-all shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
        size === "sm" ? "px-2 py-0.5 text-[11px] leading-4" : "px-2.5 py-1 text-[12px] leading-4",
        onClick && "cursor-pointer hover:brightness-95 active:scale-[0.98]",
        className
      )}
    >
      <span className="truncate max-w-[145px]">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-xs opacity-70 hover:opacity-100 transition-opacity cursor-pointer -mr-0.5"
          title={`Remove ${name}`}
        >
          <X className="w-3.5 h-3.5 stroke-[2.4]" />
        </button>
      )}
    </span>
  );
}

/**
 * Waypoint-styled Popover on each student row / card for viewing, adding,
 * and removing tags, plus opening the Waypoint "Manage tags" modal.
 */
export function StudentTagCellPopover({
  studentId,
  studentTags,
  companyTags,
  onAssignTag,
  onRemoveTag,
  onOpenManageCompanyTags,
  variant = "row",
}: {
  studentId: number;
  studentTags: string[];
  companyTags: CompanyTag[];
  onAssignTag: (studentId: number, tagName: string) => void;
  onRemoveTag: (studentId: number, tagName: string) => void;
  onOpenManageCompanyTags: () => void;
  variant?: "row" | "card";
}) {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const colorMap = useMemo(() => {
    const map = new Map<string, TagColorId>();
    companyTags.forEach((t) => map.set(t.name.toLowerCase(), t.colorId));
    return map;
  }, [companyTags]);

  const getTagColor = (tagName: string): TagColorId => {
    return colorMap.get(tagName.toLowerCase()) || "blue";
  };

  const availableTags = useMemo(() => {
    const assignedSet = new Set(studentTags.map((t) => t.toLowerCase()));
    const q = searchText.trim().toLowerCase();
    return companyTags.filter((t) => {
      if (assignedSet.has(t.name.toLowerCase())) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [companyTags, studentTags, searchText]);

  const visibleTags = studentTags.slice(0, 2);
  const overflowCount = Math.max(0, studentTags.length - 2);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDropdownOpen(false);
          setSearchText("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={cn(
            "group/tagcell inline-flex items-center gap-1.5 min-h-[30px] rounded-lg transition-all cursor-pointer select-none",
            variant === "row"
              ? "px-2 py-1 hover:bg-[#162F52]/80 border border-transparent hover:border-[#C5A059]/35 max-w-full"
              : "px-1.5 py-0.5 hover:bg-black/10"
          )}
          title="Click to add or manage student tags"
        >
          {studentTags.length === 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium transition-colors",
                variant === "row"
                  ? "text-[#8BA3C4] group-hover/tagcell:text-[#F2CD80]"
                  : "text-[#5A4228]/75 group-hover/tagcell:text-[#2A1A08]"
              )}
            >
              <Plus className="w-3 h-3 opacity-75 group-hover/tagcell:opacity-100" />
              <span>Add tags</span>
            </span>
          ) : (
            <>
              {visibleTags.map((tagName) => (
                <TagBadgePill
                  key={tagName}
                  name={tagName}
                  colorId={getTagColor(tagName)}
                  size={variant === "card" ? "sm" : "md"}
                />
              ))}
              {overflowCount > 0 && (
                <span
                  className={cn(
                    "text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0",
                    variant === "row"
                      ? "text-[#FFE394] bg-[#07162B] border border-[#C5A059]/50 shadow-xs"
                      : "text-[#2A1A08] bg-black/10"
                  )}
                >
                  +{overflowCount}
                </span>
              )}
            </>
          )}
        </div>
      </PopoverTrigger>

      {/* Waypoint Admiralty Styled Popover Window */}
      <PopoverContent
        align="start"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 60%, #040D1A 100%)",
        }}
        className="w-[280px] p-4 rounded-xl bg-[#07162B] text-[#FFF4D4] border border-[#B88943]/55 shadow-[0_16px_44px_rgba(0,0,0,0.92),inset_0_1px_1px_rgba(255,255,255,0.08)] z-50"
      >
        {/* Top Subtle Header */}
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#B88943]/25">
          <span className="font-serif text-[11px] font-bold uppercase tracking-[0.14em] text-[#E9BA6B] flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-[#E9BA6B]" />
            <span>Student Tags</span>
          </span>
          {studentTags.length > 0 && (
            <span className="text-[11px] font-mono text-[#A69371]">
              {studentTags.length} assigned
            </span>
          )}
        </div>

        {/* Assigned Tags or "No tags" */}
        {studentTags.length === 0 ? (
          <div className="text-[13.5px] font-serif text-[#C6B697] mb-3 py-1">
            No tags
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3.5">
            {studentTags.map((tagName) => (
              <TagBadgePill
                key={tagName}
                name={tagName}
                colorId={getTagColor(tagName)}
                onRemove={(e) => {
                  e.stopPropagation();
                  onRemoveTag(studentId, tagName);
                }}
              />
            ))}
          </div>
        )}

        {/* "Add tags..." Combobox / Dropdown in Waypoint Recessed Obsidian Style */}
        <div className="relative">
          <div
            onClick={() => {
              setDropdownOpen((prev) => !prev);
              setTimeout(() => inputRef.current?.focus(), 20);
            }}
            className="flex items-center justify-between w-full h-10 px-3 rounded-lg bg-[#030B17]/95 hover:bg-[#051122] border border-[#8A6731]/50 focus-within:border-[#F2CD80] shadow-[inset_0_2px_4px_rgba(0,0,0,0.75)] transition-all cursor-text"
          >
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setSearchText(e.target.value);
                setDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchText.trim()) {
                  e.preventDefault();
                  onAssignTag(studentId, searchText.trim());
                  setSearchText("");
                }
              }}
              placeholder="Add tags..."
              className="w-full bg-transparent text-[13px] text-[#FFF4D4] placeholder:text-[#7E97B8] focus:outline-none"
            />
            <ChevronDown
              className={cn(
                "w-4 h-4 text-[#E9BA6B] shrink-0 transition-transform duration-150 cursor-pointer",
                dropdownOpen && "rotate-180"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen((prev) => !prev);
              }}
            />
          </div>

          {/* Dropdown Menu of Company Tags (Waypoint Dark Navy Surface) */}
          {dropdownOpen && (
            <div className="mt-1.5 max-h-[195px] overflow-y-auto rounded-lg border border-[#8A6731]/50 bg-[#040E1E] shadow-[0_12px_28px_rgba(0,0,0,0.9)] py-1.5 px-1.5 space-y-1">
              {availableTags.length > 0 ? (
                availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      onAssignTag(studentId, tag.name);
                      setSearchText("");
                    }}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#102644] transition-colors text-left cursor-pointer"
                  >
                    <TagBadgePill name={tag.name} colorId={tag.colorId} />
                  </button>
                ))
              ) : searchText.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    onAssignTag(studentId, searchText.trim());
                    setSearchText("");
                  }}
                  className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-md hover:bg-[#102644] text-xs font-serif font-semibold text-[#FFE394] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#E9BA6B]" />
                  <span>Create &amp; add &ldquo;{searchText.trim()}&rdquo;</span>
                </button>
              ) : (
                <div className="px-2.5 py-2 text-xs text-[#7E97B8]">
                  All company tags assigned
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Link: Manage company tags */}
        <div className="mt-3.5 pt-2 border-t border-[#3A2C18]/70 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenManageCompanyTags();
            }}
            className="text-[12.5px] font-serif font-medium text-[#D8C7A5] underline underline-offset-4 decoration-[#8A6731] hover:text-[#FFE394] hover:decoration-[#FFE394] transition-colors cursor-pointer"
          >
            Manage company tags
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Waypoint Admiralty Modal ("Manage tags"):
 * - Deep navy & brass framing matching the rest of Waypoint CRM.
 * - Displays all company tags as colored pills + a brass-framed "+" button.
 * - Clicking "+" or an existing tag opens the Waypoint dark navy tag editor card
 *   with "Name your tag...", 10 circular color swatches (2 rows of 5), and Save/Delete.
 */
export function ManageCompanyTagsModal({
  open,
  onOpenChange,
  companyTags,
  onSaveTag,
  onDeleteTag,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyTags: CompanyTag[];
  onSaveTag: (tag: CompanyTag, previousName?: string) => void;
  onDeleteTag: (tagId: string, tagName: string) => void;
}) {
  const [editorMode, setEditorMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingOriginalName, setEditingOriginalName] = useState<string>("");
  const [tagNameInput, setTagNameInput] = useState("");
  const [selectedColor, setSelectedColor] = useState<TagColorId>("blue");

  useEffect(() => {
    if (!open) {
      setEditorMode("closed");
      setEditingTagId(null);
      setTagNameInput("");
    }
  }, [open]);

  const openCreatePopover = () => {
    setEditorMode("create");
    setEditingTagId(null);
    setEditingOriginalName("");
    setTagNameInput("");
    setSelectedColor("blue");
  };

  const openEditPopover = (tag: CompanyTag) => {
    setEditorMode("edit");
    setEditingTagId(tag.id);
    setEditingOriginalName(tag.name);
    setTagNameInput(tag.name);
    setSelectedColor(tag.colorId);
  };

  const handleSave = () => {
    const cleanName = tagNameInput.trim();
    if (!cleanName) {
      toast.error("Please enter a name for your tag");
      return;
    }

    if (editorMode === "create") {
      const duplicate = companyTags.some(
        (t) => t.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        toast.error(`A tag named "${cleanName}" already exists`);
        return;
      }
      const newTag: CompanyTag = {
        id: `tag-${Date.now()}`,
        name: cleanName,
        colorId: selectedColor,
      };
      onSaveTag(newTag);
      toast.success(`Tag "${cleanName}" created`);
    } else if (editorMode === "edit" && editingTagId) {
      const updatedTag: CompanyTag = {
        id: editingTagId,
        name: cleanName,
        colorId: selectedColor,
      };
      onSaveTag(updatedTag, editingOriginalName);
      toast.success(`Tag "${cleanName}" updated`);
    }

    setEditorMode("closed");
    setEditingTagId(null);
    setTagNameInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 58%, #030D1A 100%)",
        }}
        className="max-w-[600px] p-0 overflow-visible bg-[#07162B] text-[#FFF4D4] border border-[#B88943]/60 rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.08)]"
      >
        {/* Top Centered Admiralty Header */}
        <div className="py-4 px-6 border-b border-[#B88943]/30 bg-[#051224]/90 rounded-t-2xl flex items-center justify-center relative">
          <DialogTitle className="font-serif text-[19px] font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2 text-center">
            <Tag className="w-4 h-4 text-[#E9BA6B]" />
            <span>Manage tags</span>
          </DialogTitle>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 relative">
          <p className="text-[13.5px] text-[#C6B697] leading-relaxed mb-6">
            Add, edit, or remove tags; changes will apply to all previously tagged students,
            contacts, or cases. Click any tag below to edit its name or color.
          </p>

          {/* All Company Tags Flex Grid + "+" Button */}
          <div className="flex flex-wrap items-center gap-2.5 p-4 rounded-xl bg-[#030B17]/80 border border-[#3A2C18]/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.75)] relative">
            {companyTags.map((tag) => (
              <TagBadgePill
                key={tag.id}
                name={tag.name}
                colorId={tag.colorId}
                onClick={() => openEditPopover(tag)}
                className={cn(
                  "text-[13px] px-3 py-1.5 rounded-[7px]",
                  editingTagId === tag.id &&
                    "ring-2 ring-[#FFE394] ring-offset-2 ring-offset-[#030B17]"
                )}
              />
            ))}

            {/* "+" Add Tag Button in Waypoint Brass Style */}
            <button
              type="button"
              onClick={openCreatePopover}
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-[7px] bg-gradient-to-b from-[#1A3254] to-[#0D1E36] hover:from-[#23426E] hover:to-[#132A4A] text-[#FFE394] border border-[#C5A059]/60 hover:border-[#FFE394] transition-all cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.6)]",
                editorMode === "create" &&
                  "ring-2 ring-[#FFE394] ring-offset-2 ring-offset-[#030B17]"
              )}
              title="Create new tag"
            >
              <Plus className="w-4 h-4 stroke-[2.6]" />
            </button>

            {/* Floating Waypoint Tag Creator / Editor Card */}
            {editorMode !== "closed" && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 0%, #13325B 0%, #07162B 70%, #040D1A 100%)",
                }}
                className="w-[264px] p-4 rounded-xl bg-[#07162B] border border-[#C5A059]/75 shadow-[0_18px_48px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.1)] z-50 mt-2 sm:mt-0 sm:absolute sm:left-1/2 sm:-translate-x-1/4 sm:top-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif text-[11px] font-bold uppercase tracking-wider text-[#E9BA6B]">
                    {editorMode === "create" ? "New Company Tag" : "Edit Tag"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditorMode("closed")}
                    className="text-[#8BA3C4] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  type="text"
                  value={tagNameInput}
                  onChange={(e) => setTagNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  placeholder="Name your tag..."
                  autoFocus
                  className="w-full h-10 px-3 rounded-lg bg-[#020914] text-[13.5px] text-[#FFF4D4] placeholder:text-[#6E87A8] border border-[#8A6731]/55 focus:border-[#FFE394] focus:outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] mb-3.5"
                />

                {/* 10 Color Swatches (2 rows of 5 circles) */}
                <div className="grid grid-cols-5 gap-2.5 mb-4 justify-items-center">
                  {TAG_COLOR_PALETTE.map((swatch) => {
                    const isSelected = selectedColor === swatch.id;
                    return (
                      <button
                        key={swatch.id}
                        type="button"
                        onClick={() => setSelectedColor(swatch.id)}
                        style={{
                          backgroundColor: swatch.swatchBg,
                          borderColor: isSelected ? "#FFE394" : swatch.border,
                        }}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-[0_2px_5px_rgba(0,0,0,0.6)]",
                          isSelected && "ring-2 ring-[#FFE394]/60 scale-105"
                        )}
                        title={swatch.label}
                      >
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#111827] stroke-[2.8]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Actions Row: Save / Cancel / Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-[#3A2C18]/80">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-3 py-1 rounded-md text-[12.5px] font-serif font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/60 shadow-[0_2px_6px_rgba(0,0,0,0.7)] hover:brightness-105 transition-all cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("closed")}
                      className="text-[12.5px] text-[#A69371] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {editorMode === "edit" && editingTagId && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteTag(editingTagId, editingOriginalName);
                        setEditorMode("closed");
                      }}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-[#F87171] hover:text-[#FCA5A5] transition-colors cursor-pointer"
                      title="Delete tag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Row: Info tip + Waypoint Gold Done button */}
          <div className="mt-6 flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Click any tag above to rename or recolor it, or click + to add a new company tag."
                )
              }
              className="text-[12.5px] font-serif text-[#A69371] underline underline-offset-4 decoration-[#8A6731]/70 hover:text-[#FFE394] cursor-pointer"
            >
              Learn more about tags.
            </button>

            <button
              type="button"
              onClick={() => {
                setEditorMode("closed");
                onOpenChange(false);
              }}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-105 text-[#07162B] text-[13.5px] font-serif font-bold border border-[#FFE394]/60 shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Waypoint Admiralty "+" Popover next to the Stage Pill Tabs
 * for creating or managing custom stages ordered/filtered by tags.
 */
export function AddCustomStagePopover({
  companyTags,
  customStages,
  onAddStage,
  onDeleteStage,
}: {
  companyTags: CompanyTag[];
  customStages: CustomStudentStage[];
  onAddStage: (label: string, linkedTagName: string) => void;
  onDeleteStage: (stageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stageLabel, setStageLabel] = useState("");
  const [linkedTag, setLinkedTag] = useState("");

  const handleCreate = () => {
    const cleanLabel = stageLabel.trim();
    if (!cleanLabel) {
      toast.error("Please enter a custom stage name");
      return;
    }
    const effectiveTag = (linkedTag || cleanLabel).trim();
    onAddStage(cleanLabel, effectiveTag);
    setStageLabel("");
    setLinkedTag("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Add a new custom stage (linked to a tag)"
          className="inline-flex items-center justify-center h-[38px] w-[38px] sm:h-[42px] sm:w-[42px] rounded-2xl border border-[#B88943]/75 hover:border-[#FFE299] bg-gradient-to-b from-[#142B49] via-[#0E2038] to-[#081527] hover:from-[#1B3A63] hover:via-[#112744] hover:to-[#09182D] text-[#FFE299] shadow-[0_0_12px_rgba(184,137,67,0.22),inset_0_1px_1.5px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.55),0_3px_8px_rgba(0,0,0,0.75)] transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 60%, #030D1A 100%)",
        }}
        className="w-[300px] p-4 rounded-xl bg-[#07162B] text-[#FFF4D4] border border-[#B88943]/60 shadow-[0_18px_48px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.08)] z-50"
      >
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#B88943]/25">
          <span className="font-serif text-xs font-bold uppercase tracking-[0.12em] text-[#E9BA6B]">
            + New Custom Stage
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[#8BA3C4] hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-serif font-semibold uppercase tracking-wider text-[#C6B697] mb-1">
              Stage Name
            </label>
            <input
              type="text"
              value={stageLabel}
              onChange={(e) => {
                setStageLabel(e.target.value);
                if (!linkedTag) {
                  // match existing tag if possible
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="e.g. IEP Soon, On Hold, Discovery..."
              autoFocus
              className="w-full h-9 px-3 rounded-lg bg-[#020A17] text-xs text-[#FFF4D4] placeholder:text-[#6E87A8] border border-[#8A6731]/50 focus:border-[#FFE394] focus:outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-serif font-semibold uppercase tracking-wider text-[#C6B697] mb-1">
              Order / Populate by Tag
            </label>
            <select
              value={linkedTag}
              onChange={(e) => {
                const val = e.target.value;
                setLinkedTag(val);
                if (!stageLabel.trim() && val) {
                  setStageLabel(val);
                }
              }}
              className="w-full h-9 px-2.5 rounded-lg bg-[#020A17] text-xs text-[#FFF4D4] border border-[#8A6731]/50 focus:border-[#FFE394] focus:outline-none"
            >
              <option value="">Same as stage name (auto-create tag)</option>
              {companyTags.map((t) => (
                <option key={t.id} value={t.name}>
                  Tag: {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-105 text-[#07162B] text-xs font-serif font-bold border border-[#FFE394]/60 shadow-[0_3px_10px_rgba(0,0,0,0.8)] transition-all cursor-pointer"
          >
            Add Stage Tab
          </button>
        </div>

        {customStages.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#3A2C18]/80">
            <span className="block text-[10.5px] font-serif uppercase tracking-wider text-[#A69371] mb-2">
              Custom Stages
            </span>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
              {customStages.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#020A17]/90 border border-[#3A2C18]/70 text-xs"
                >
                  <div className="truncate">
                    <span className="font-serif font-semibold text-[#FFF4D4]">
                      {st.label}
                    </span>
                    <span className="ml-1.5 text-[10.5px] text-[#A69371]">
                      ({st.linkedTagName})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteStage(st.id)}
                    className="text-[#F87171] hover:text-[#FCA5A5] p-0.5 cursor-pointer"
                    title={`Remove ${st.label} stage`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

