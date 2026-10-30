/**
 * WAP 1B.1 — Email Template Dropdown Uplift & Category Organization
 *
 * Refined Waypoint stationery-index template selector shared across:
 * - StudentEmailComposer (bottom toolbar "Templates" dropdown + top "Select Template" control)
 * - GmailComposeModal ("Select Template" control + bottom toolbar "Templates" dropdown)
 * - Create New Email workflows across Waypoint CRM
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  Settings2,
  Compass,
  Bell,
  BookOpen,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  Folder,
  X,
  Check,
  AlertTriangle,
  Sparkles,
  Mail,
  Save,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EmailTemplates } from "@/pages/Templates";

export interface SelectedEmailTemplatePayload {
  id: number;
  name: string;
  category: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  rawBody: string;
}

export interface EmailTemplateSelectorDropdownProps {
  /** Label shown on the trigger button */
  triggerLabel?: string;
  /** Visual variant of the trigger button */
  variant?: "toolbar" | "header" | "field";
  /** Dropdown placement relative to trigger */
  placement?: "top" | "bottom";
  /** Current subject in the composer (used for overwrite check and Save as Template prefill) */
  currentSubject?: string;
  /** Current body in the composer (used for overwrite check and Save as Template prefill) */
  currentBody?: string;
  /** Default/initial subject that shouldn't count as user-typed content (e.g. "Re: ") */
  defaultSubject?: string;
  /** Context variables for resolving template merge tags */
  mergeContext?: {
    studentFirstName?: string;
    studentFullName?: string;
    parentName?: string;
    parentFirstName?: string;
    caseId?: string | number;
  };
  /** Selected template ID if tracking selection state */
  selectedTemplateId?: number | null;
  /** Callback invoked when a template is chosen and confirmed */
  onSelectTemplate: (template: SelectedEmailTemplatePayload) => void;
}

/**
 * Converts HTML email template body into clean, structured plain text while
 * preserving all links (URLs), bullet lists, headings, and paragraph breaks.
 */
export function htmlTemplateToReadableText(htmlOrText: string): string {
  if (!htmlOrText) return "";
  if (!/<[a-z][\s\S]*>/i.test(htmlOrText)) {
    return htmlOrText;
  }

  let s = htmlOrText;

  // Preserve anchor links: <a href="URL">Label</a> -> Label (URL) if Label !== URL
  s = s.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, inner) => {
    const cleanInner = inner.replace(/<[^>]+>/g, "").trim();
    const cleanHref = href.trim();
    if (!cleanInner || cleanInner === cleanHref) {
      return cleanHref;
    }
    return `${cleanInner} (${cleanHref})`;
  });

  // Structural line breaks
  s = s
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<h[1-6][^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/div>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n---\n");

  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Normalize excessive blank lines
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

export function resolveTemplateVariables(
  text: string,
  ctx?: EmailTemplateSelectorDropdownProps["mergeContext"]
): string {
  if (!text) return "";
  const studentFull = ctx?.studentFullName || "Student";
  const studentFirst = ctx?.studentFirstName || studentFull.split(" ")[0] || "Student";
  const parentFull = ctx?.parentName || "Parent";
  const parentFirst = ctx?.parentFirstName || parentFull.split(" ")[0] || "Parent";
  const caseIdStr = String(ctx?.caseId || "");
  const todayStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return text
    .replace(/\{\{\s*student_first_name\s*\}\}/gi, studentFirst)
    .replace(/\{\{\s*student_name\s*\}\}/gi, studentFull)
    .replace(/\{\{\s*student\s*\}\}/gi, studentFull)
    .replace(/\{\{\s*parent_name\s*\}\}/gi, parentFull)
    .replace(/\{\{\s*client_name\s*\}\}/gi, parentFull)
    .replace(/\{\{\s*full_name\s*\}\}/gi, parentFull)
    .replace(/\{\{\s*name\s*\}\}/gi, parentFull)
    .replace(/\{\{\s*first_name\s*\}\}/gi, parentFirst)
    .replace(/\{\{\s*case_id\s*\}\}/gi, caseIdStr)
    .replace(/\{\{\s*date\s*\}\}/gi, todayStr);
}

function getCategoryIcon(categoryName: string, iconName?: string) {
  const key = (iconName || categoryName || "").toLowerCase();
  if (key.includes("compass") || key.includes("onboard")) {
    return <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  }
  if (key.includes("bell") || key.includes("update")) {
    return <Bell className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
  }
  if (key.includes("book") || key.includes("resource")) {
    return <BookOpen className="w-3.5 h-3.5 text-teal-400 shrink-0" />;
  }
  if (key.includes("calendar") || key.includes("meeting") || key.includes("schedul")) {
    return <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }
  if (key.includes("file") || key.includes("document") || key.includes("record")) {
    return <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
  }
  if (key.includes("credit") || key.includes("billing") || key.includes("plan")) {
    return <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  }
  if (key.includes("message") || key.includes("follow") || key.includes("review")) {
    return <MessageSquare className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  }
  return <Folder className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />;
}

export function EmailTemplateSelectorDropdown({
  triggerLabel = "Templates",
  variant = "toolbar",
  placement = "top",
  currentSubject = "",
  currentBody = "",
  defaultSubject = "Re: ",
  mergeContext,
  selectedTemplateId = null,
  onSelectTemplate,
}: EmailTemplateSelectorDropdownProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showRecentlyUsed, setShowRecentlyUsed] = useState(true);
  const [pendingConfirmTemplate, setPendingConfirmTemplate] = useState<any | null>(null);

  // Save as Template Modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState("General");
  const [saveDescription, setSaveDescription] = useState("");

  // Manage Templates In-App Modal state
  const [manageModalOpen, setManageModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: templates = [] } = trpc.emailTemplates.list.useQuery(undefined, {
    retry: false,
  });
  const { data: categories = [] } = trpc.emailTemplates.categories.list.useQuery(undefined, {
    retry: false,
  });
  const { data: recentlyUsed = [] } = trpc.emailTemplates.recentlyUsed.useQuery(undefined, {
    retry: false,
  });

  const markUsedMutation = trpc.emailTemplates.markUsed.useMutation({
    onSuccess: () => {
      utils.emailTemplates.recentlyUsed.invalidate();
    },
  });

  const createTemplateMutation = trpc.emailTemplates.create.useMutation({
    onSuccess: (created) => {
      utils.emailTemplates.list.invalidate();
      utils.emailTemplates.categories.list.invalidate();
      utils.emailTemplates.recentlyUsed.invalidate();
      setSaveModalOpen(false);
      setSaveName("");
      setSaveDescription("");
      toast.success(`Saved "${created.name}" to ${created.category}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save email template");
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingConfirmTemplate(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus search input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    } else {
      setSearchQuery("");
      setPendingConfirmTemplate(null);
    }
  }, [open]);

  const selectedTemplateObj = useMemo(
    () => (templates as any[]).find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // Group templates by category in canonical order
  const categorizedGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const cat of categories as any[]) {
      map.set(cat.name, []);
    }
    for (const tpl of templates as any[]) {
      const catName = tpl.category || "General";
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(tpl);
    }

    const orderedCategories =
      (categories as any[]).length > 0
        ? (categories as any[])
        : Array.from(map.keys()).map((name, i) => ({
            id: `cat-${i}`,
            name,
            description: "",
            icon: "Folder",
            sortOrder: i + 1,
          }));

    return orderedCategories.map((cat: any) => ({
      ...cat,
      templates: (map.get(cat.name) || []).sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      ),
    }));
  }, [templates, categories]);

  // Search across all categories (including collapsed ones) by name, category, description, subject, and keywords
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return (templates as any[]).filter((tpl) => {
      const nameMatch = (tpl.name || "").toLowerCase().includes(q);
      const catMatch = (tpl.category || "").toLowerCase().includes(q);
      const subjMatch = (tpl.subject || "").toLowerCase().includes(q);
      const descMatch = (tpl.description || "").toLowerCase().includes(q);
      const bodyMatch = (tpl.body || "").toLowerCase().includes(q);
      return nameMatch || catMatch || subjMatch || descMatch || bodyMatch;
    });
  }, [templates, searchQuery]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const hasExistingUserDraft = useMemo(() => {
    const trimmedBody = (currentBody || "").trim();
    const trimmedSubj = (currentSubject || "").trim();
    const isDefaultSubj =
      !trimmedSubj ||
      trimmedSubj === (defaultSubject || "").trim() ||
      trimmedSubj === "Re:" ||
      trimmedSubj === "New Case Email";
    return Boolean(trimmedBody.length > 0 || !isDefaultSubj);
  }, [currentBody, currentSubject, defaultSubject]);

  const commitTemplateSelection = (tpl: any) => {
    const resolvedSubject = resolveTemplateVariables(tpl.subject || tpl.name, mergeContext);
    const resolvedRawHtml = resolveTemplateVariables(tpl.body || "", mergeContext);
    const resolvedReadableText = htmlTemplateToReadableText(resolvedRawHtml);

    markUsedMutation.mutate({ id: tpl.id });

    onSelectTemplate({
      id: tpl.id,
      name: tpl.name,
      category: tpl.category || "General",
      subject: resolvedSubject,
      bodyText: resolvedReadableText,
      bodyHtml: resolvedRawHtml,
      rawBody: tpl.body || "",
    });

    setPendingConfirmTemplate(null);
    setOpen(false);
    toast.success(`Inserted template: ${tpl.name}`);
  };

  const handleCandidateClick = (tpl: any) => {
    if (hasExistingUserDraft) {
      setPendingConfirmTemplate(tpl);
      return;
    }
    commitTemplateSelection(tpl);
  };

  const handleOpenSaveAsTemplate = () => {
    setOpen(false);
    const cleanSubj =
      currentSubject && currentSubject.trim() !== "Re:" ? currentSubject.trim() : "";
    setSaveName(cleanSubj);
    setSaveCategory("General");
    setSaveDescription("");
    setSaveModalOpen(true);
  };

  const handleSaveAsTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) {
      toast.error("Please enter a template name.");
      return;
    }
    const effectiveSubject =
      currentSubject && currentSubject.trim() && currentSubject.trim() !== "Re:"
        ? currentSubject.trim()
        : saveName.trim();
    const effectiveBody = currentBody?.trim() || `<p>${saveName.trim()}</p>`;

    createTemplateMutation.mutate({
      name: saveName.trim(),
      subject: effectiveSubject,
      body: effectiveBody,
      category: saveCategory || "General",
      description: saveDescription.trim() || null,
    });
  };

  const handleOpenManageTemplates = () => {
    setOpen(false);
    setManageModalOpen(true);
  };

  const handleCloseManageTemplates = () => {
    setManageModalOpen(false);
    // Refresh template list and categories immediately on return to composer
    utils.emailTemplates.list.invalidate();
    utils.emailTemplates.categories.list.invalidate();
    utils.emailTemplates.recentlyUsed.invalidate();
  };

  return (
    <>
      <div ref={dropdownRef} className="relative inline-block">
        {/* Trigger Button */}
        {variant === "field" ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full h-9 rounded-xl bg-[#000820] hover:bg-[#05142B] border border-blue-800/80 hover:border-[#C5A059]/60 px-3 text-xs text-[#FFF4D4] flex items-center justify-between gap-2 transition-colors cursor-pointer shadow-inner"
          >
            <span className="flex items-center gap-2 truncate">
              <FileText className="w-3.5 h-3.5 text-[#FFE394] shrink-0" />
              <span className="truncate">
                {selectedTemplateObj
                  ? `${selectedTemplateObj.category || "General"} → ${selectedTemplateObj.name}`
                  : triggerLabel}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-[#FFE394] shrink-0 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        ) : variant === "header" ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#000820] hover:bg-[#0E274A] border border-[#C5A059]/50 text-[#FFE394] font-semibold text-xs transition-colors cursor-pointer shadow-sm shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{selectedTemplateObj ? selectedTemplateObj.name : triggerLabel}</span>
            <ChevronDown
              className={cn("w-3 h-3 text-[#FFE394] transition-transform", open && "rotate-180")}
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E274A] hover:bg-[#163866] border border-[#C5A059]/60 text-[#FFE394] font-semibold text-xs shadow-md transition-colors cursor-pointer"
          >
            <span>{triggerLabel}</span>
            <ChevronDown
              className={cn("w-3 h-3 text-[#FFE394] transition-transform", open && "rotate-180")}
            />
          </button>
        )}

        {/* Stationery-Index Dropdown Panel */}
        {open && (
          <div
            className={cn(
              "absolute z-50 w-[340px] sm:w-[390px] bg-[#000820] border border-[#C5A059]/70 rounded-xl shadow-[0_18px_48px_rgba(0,0,0,0.95),0_0_24px_rgba(30,64,175,0.2)] overflow-x-hidden flex flex-col",
              placement === "top" ? "bottom-10 left-0" : "top-10 right-0 sm:left-0"
            )}
          >
            {/* Top Header & Compact Search Field */}
            <div className="p-2.5 bg-[#05142B] border-b border-[#3A2C18]/80 space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFE394] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#C5A059]" />
                  <span>Waypoint Stationery Index</span>
                </span>
                <span className="text-[10px] text-[#A69371]">
                  {(templates as any[]).length} templates · {categorizedGroups.length} categories
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#A69371] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, category, or keyword…"
                  className="w-full h-8 pl-8 pr-7 rounded-lg bg-[#000820] border border-blue-900/80 focus:border-[#C5A059] text-xs text-[#FFF4D4] placeholder:text-[#A69371]/70 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A69371] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Overwrite Confirmation Prompt (if current email already contains text) */}
            {pendingConfirmTemplate && (
              <div className="p-3 bg-[#0A1E3C] border-b border-[#C5A059]/60 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FFE394] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#FFF4D4]">
                      Replace current email content?
                    </p>
                    <p className="text-[11px] text-[#C6B697] truncate mt-0.5">
                      Insert "{pendingConfirmTemplate.name}" into editor
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingConfirmTemplate(null)}
                    className="px-2.5 py-1 rounded-md bg-[#000820] border border-[#3A2C18] text-[11px] text-[#C6B697] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => commitTemplateSelection(pendingConfirmTemplate)}
                    className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] font-bold text-[11px] cursor-pointer"
                  >
                    Replace Content
                  </button>
                </div>
              </div>
            )}

            {/* Main Scrollable Area (Vertical only, no horizontal scroll) */}
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden divide-y divide-[#13284C]/60">
              {searchQuery.trim() ? (
                /* Search Results Across All Categories */
                <div className="p-1.5 space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#A69371] flex items-center justify-between">
                    <span>Matching Templates</span>
                    <span>{searchResults.length} found</span>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="py-6 px-3 text-center text-xs text-[#A69371]">
                      No templates matching "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((tpl: any) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleCandidateClick(tpl)}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#0E274A]/90 transition-colors cursor-pointer group flex flex-col gap-0.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#FFF4D4] group-hover:text-[#FFE394] truncate">
                            {tpl.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#05142B] text-[#FFE394] border border-[#C5A059]/40 shrink-0">
                            {tpl.category || "General"}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#C6B697] truncate block">
                          {tpl.description || tpl.subject}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {/* Recently Used Section (When Search Field is Empty) */}
                  {(recentlyUsed as any[]).length > 0 && (
                    <div className="bg-[#030D22]">
                      <button
                        type="button"
                        onClick={() => setShowRecentlyUsed((v) => !v)}
                        className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#C6B697] hover:text-[#FFE394] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#C5A059]" />
                          <span>Recently Used</span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-3 h-3 text-[#A69371] transition-transform",
                            !showRecentlyUsed && "-rotate-90"
                          )}
                        />
                      </button>
                      {showRecentlyUsed && (
                        <div className="px-1.5 pb-1.5 space-y-0.5">
                          {(recentlyUsed as any[]).slice(0, 3).map((tpl: any) => (
                            <button
                              key={`recent-${tpl.id}`}
                              type="button"
                              onClick={() => handleCandidateClick(tpl)}
                              className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#0E274A]/80 transition-colors cursor-pointer group flex items-center justify-between gap-2"
                            >
                              <span className="text-xs font-medium text-[#FFF4D4] group-hover:text-[#FFE394] truncate">
                                {tpl.name}
                              </span>
                              <span className="text-[9px] text-[#A69371] shrink-0">
                                {tpl.category || "General"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expandable & Collapsible Category Index */}
                  <div className="divide-y divide-[#13284C]/40">
                    {categorizedGroups.map((cat: any) => {
                      const isExpanded = !!expandedCategories[cat.name];
                      const count = cat.templates.length;
                      return (
                        <div key={cat.id || cat.name} className="bg-[#000820]">
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat.name)}
                            className={cn(
                              "w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer",
                              isExpanded
                                ? "bg-[#071936] text-[#FFE394]"
                                : "hover:bg-[#05142B] text-[#FFF4D4]"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[#FFE394] shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-[#A69371] shrink-0" />
                              )}
                              {getCategoryIcon(cat.name, cat.icon)}
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold truncate">{cat.name}</div>
                                {cat.description && !isExpanded && (
                                  <div className="text-[10px] text-[#A69371] truncate">
                                    {cat.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#05142B] border border-[#3A2C18] text-[#C6B697] shrink-0">
                              {count}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="bg-[#030C1E] px-2 py-1.5 space-y-0.5 border-t border-[#13284C]/50">
                              {count === 0 ? (
                                <p className="px-3 py-2 text-[11px] text-[#A69371] italic">
                                  No templates in {cat.name} yet.
                                </p>
                              ) : (
                                cat.templates.map((tpl: any) => {
                                  const isSelected = selectedTemplateId === tpl.id;
                                  return (
                                    <button
                                      key={tpl.id}
                                      type="button"
                                      onClick={() => handleCandidateClick(tpl)}
                                      className={cn(
                                        "w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer group flex items-start justify-between gap-2",
                                        isSelected
                                          ? "bg-[#0E274A] border border-[#C5A059]/50"
                                          : "hover:bg-[#0E274A]/80"
                                      )}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-[#FFF4D4] group-hover:text-[#FFE394] truncate">
                                          {tpl.name}
                                        </div>
                                        <div className="text-[10px] text-[#A69371] truncate">
                                          {tpl.description || tpl.subject}
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-[#FFE394] shrink-0 mt-0.5" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Template Management Actions */}
            <div className="p-2 bg-[#05142B] border-t border-[#3A2C18] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleOpenSaveAsTemplate}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0E274A] hover:bg-[#163866] border border-[#C5A059]/50 text-[#FFE394] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Save Email as Template</span>
              </button>

              <button
                type="button"
                onClick={handleOpenManageTemplates}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#000820] hover:bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059]/50 text-[#C6B697] hover:text-[#FFF4D4] text-[11px] font-medium transition-colors cursor-pointer shrink-0"
              >
                <Settings2 className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Manage Templates</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* "+ Save Email as Template" Dialog */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-[#3A2C18] pb-3">
            <DialogTitle className="flex items-center gap-2 font-serif text-lg font-bold text-[#FFF4D4]">
              <div className="h-7 w-7 rounded-lg bg-[#000820] border border-[#3A2C18] flex items-center justify-center">
                <Mail className="h-4 w-4 text-[#FFE394]" />
              </div>
              <span>Save Email as Template</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAsTemplateSubmit} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">
                Template Name *
              </Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Marcus Autism Center Follow-Up"
                className="bg-[#000820] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">
                Category *
              </Label>
              <select
                value={saveCategory}
                onChange={(e) => setSaveCategory(e.target.value)}
                className="w-full h-9 rounded-lg bg-[#000820] border border-[#3A2C18] px-3 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
              >
                {categorizedGroups.map((cat: any) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">
                Description (Optional)
              </Label>
              <Textarea
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Brief note about when staff should use this template…"
                rows={2}
                className="bg-[#000820] border-[#3A2C18] text-[#FFF4D4] text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#3A2C18]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaveModalOpen(false)}
                className="border-[#3A2C18] bg-[#000820] text-[#C6B697] hover:text-white text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTemplateMutation.isPending}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{createTemplateMutation.isPending ? "Saving…" : "Save Template"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* In-App "Manage Templates" Focused View (Preserves Current Email Draft!) */}
      <Dialog open={manageModalOpen} onOpenChange={(v) => !v && handleCloseManageTemplates()}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto bg-[#000820] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_25px_70px_rgba(0,0,0,0.95)] rounded-2xl p-6">
          <EmailTemplates
            onBack={handleCloseManageTemplates}
            backLabel="Return to Email Composer"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

