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
import {
  Shield,
  Users,
  Eye,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  Presentation,
} from "lucide-react";
import { toast } from "sonner";
import type {
  StudioAccessSettings,
  StudioPage,
  StudioRole,
  StudioSurfaceMode,
} from "./studioTypes";

interface ShareAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  boardTitle: string;
  pages: StudioPage[];
  access: StudioAccessSettings;
  myRole: StudioRole;
  teamRoster: { id: number; name: string; role: string; initials: string }[];
  onSaveAccess: (nextAccess: StudioAccessSettings) => void;
  onLaunchPresentation: () => void;
  onOpenAudienceWindow: () => void;
}

export function StudioShareAccessModal({
  open,
  onOpenChange,
  boardId,
  boardTitle,
  pages,
  access,
  myRole,
  teamRoster,
  onSaveAccess,
  onLaunchPresentation,
  onOpenAudienceWindow,
}: ShareAccessModalProps) {
  const [draft, setDraft] = useState<StudioAccessSettings>(access);
  const [copiedAudienceUrl, setCopiedAudienceUrl] = useState(false);

  useEffect(() => {
    setDraft(access);
  }, [access, open]);

  const isOwner = myRole === "owner";

  const handleMemberRoleChange = (
    userId: number,
    userName: string,
    role: StudioRole | "default"
  ) => {
    setDraft((prev) => {
      const others = prev.members.filter((m) => m.userId !== userId);
      if (role === "default") {
        return { ...prev, members: others };
      }
      return {
        ...prev,
        members: [...others, { userId, userName, role }],
      };
    });
  };

  const toggleAllowedPage = (pageId: string) => {
    setDraft((prev) => {
      const current = new Set(prev.audienceFilters.allowedPageIds || []);
      if (current.has(pageId)) {
        if (current.size <= 1) {
          toast.error("At least one page must remain visible for audience presentation.");
          return prev;
        }
        current.delete(pageId);
      } else {
        current.add(pageId);
      }
      return {
        ...prev,
        audienceFilters: {
          ...prev.audienceFilters,
          allowedPageIds: Array.from(current),
        },
      };
    });
  };

  const audienceUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/studio/audience/${boardId}`
      : `/studio/audience/${boardId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#030B22] border border-[#1E3264] text-slate-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-serif font-bold text-white flex items-center gap-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <Shield className="w-5 h-5 text-[#DFBE77]" />
            <span>Share, Access & Presentation Privacy — {boardTitle}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            Configure team permissions (Owner, Editor, Viewer) and choose which pages and content are visible when screen sharing or presenting to families.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. Team Visibility & Role Permissions */}
          <div className="rounded-xl border border-[#182954] bg-[#05102C] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#FFE394] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>CRM Team Access Policy</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#02081A] border border-[#1E3264] text-cyan-300">
                Your Role: {myRole.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: "private",
                    label: "Owner & Invited Only",
                    desc: "Only explicitly listed members",
                  },
                  {
                    id: "team_view",
                    label: "Team Viewer Access",
                    desc: "All staff can view; owners/editors edit",
                  },
                  {
                    id: "team_edit",
                    label: "Team Editor Access",
                    desc: "All staff can add notes, draw & assign",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!isOwner}
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, visibility: opt.id }))
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    draft.visibility === opt.id
                      ? "border-[#FFE394] bg-[#0B1E4A] text-white"
                      : "border-[#182954] bg-[#02081A] text-slate-300 hover:border-cyan-400/40"
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Individual Teammate Role Overrides */}
            <div className="space-y-1.5 pt-2 border-t border-[#182954]">
              <div className="text-[11px] font-medium text-slate-300">
                Member Permissions
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {teamRoster.map((member) => {
                  const explicit = draft.members.find((m) => m.userId === member.id);
                  const currentRole = explicit?.role || "default";
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#02081A] border border-[#182954] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#0B1E4A] border border-cyan-400/40 text-cyan-200 font-bold text-[10px] flex items-center justify-center">
                          {member.initials}
                        </span>
                        <span className="font-medium text-white">{member.name}</span>
                      </div>
                      <select
                        disabled={!isOwner}
                        value={currentRole}
                        onChange={(e) =>
                          handleMemberRoleChange(
                            member.id,
                            member.name,
                            e.target.value as StudioRole | "default"
                          )
                        }
                        className="h-7 rounded bg-[#05102C] border border-[#1E3264] px-2 text-xs text-slate-200"
                      >
                        <option value="default">Default ({draft.visibility})</option>
                        <option value="owner">Owner (Full Access)</option>
                        <option value="editor">Editor (Can Modify)</option>
                        <option value="viewer">Viewer (Read Only)</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Audience & Screen-Sharing Content Filter */}
          <div className="rounded-xl border border-[#182954] bg-[#05102C] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Presentation className="w-3.5 h-3.5" />
                <span>Audience & Screen-Sharing Content Filter</span>
              </div>
              <span className="text-[10px] text-emerald-300 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Private task metadata always excluded
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                {
                  key: "showDrawings" as const,
                  label: "Show Freehand Neon / Marker Drawings",
                },
                {
                  key: "showTypedText" as const,
                  label: "Show Typed Text Headings",
                },
                {
                  key: "showShapesAndConnectors" as const,
                  label: "Show Diagrams, Shapes & Connectors",
                },
                {
                  key: "showOrdinaryNotes" as const,
                  label: "Show Ordinary Sticky Notes",
                },
                {
                  key: "showTaskTitlesOnly" as const,
                  label: "Show Task Note Titles (Hides Assignee/Due/Checklist)",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[#02081A] border border-[#182954] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(draft.audienceFilters[item.key])}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        audienceFilters: {
                          ...prev.audienceFilters,
                          [item.key]: e.target.checked,
                        },
                      }))
                    }
                    className="rounded border-cyan-400"
                  />
                  <span className="text-slate-200 text-[11px]">{item.label}</span>
                </label>
              ))}
            </div>

            {/* Select Which Pages Are Visible to Audience */}
            <div className="space-y-1.5 pt-2 border-t border-[#182954]">
              <div className="text-[11px] font-medium text-slate-300">
                Pages Visible to Audience ({draft.audienceFilters.allowedPageIds.length} of{" "}
                {pages.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pages.map((p) => {
                  const allowed = draft.audienceFilters.allowedPageIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleAllowedPage(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        allowed
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                          : "bg-[#02081A] border-[#182954] text-slate-400"
                      }`}
                    >
                      {allowed ? "✓ " : ""}
                      {p.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Synchronized Audience Window Link (Clean for Zoom / Google Meet / Teams screen sharing) */}
            <div className="pt-2 border-t border-[#182954] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <Input
                  readOnly
                  value={audienceUrl}
                  className="h-8 bg-[#02081A] border-[#182954] text-slate-300 text-[11px] font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(audienceUrl);
                    setCopiedAudienceUrl(true);
                    toast.success("Audience view link copied");
                    setTimeout(() => setCopiedAudienceUrl(false), 2000);
                  }}
                  className="h-8 border-[#1E3264] bg-[#02081A] text-slate-200 hover:text-white text-xs shrink-0 cursor-pointer"
                >
                  {copiedAudienceUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onSaveAccess(draft);
                  onOpenAudienceWindow();
                }}
                className="h-8 border-cyan-400/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 text-xs gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Clean Audience Window</span>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#1E3264] bg-[#02081A] text-slate-300 hover:text-white text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSaveAccess(draft);
              onOpenChange(false);
            }}
            className="bg-[#0B1E4A] hover:bg-[#122B66] border border-cyan-400/50 text-cyan-200 text-xs font-semibold cursor-pointer"
          >
            Save Access Settings
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSaveAccess(draft);
              onOpenChange(false);
              onLaunchPresentation();
            }}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-xs cursor-pointer"
          >
            Save & Present Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface NewOrRenameBoardModalProps {
  mode: "create" | "rename" | null;
  initialTitle?: string;
  onClose: () => void;
  onSubmit: (title: string, defaultSurface?: StudioSurfaceMode) => void;
}

export function StudioBoardNameModal({
  mode,
  initialTitle = "",
  onClose,
  onSubmit,
}: NewOrRenameBoardModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [surface, setSurface] = useState<StudioSurfaceMode>("neon");

  useEffect(() => {
    setTitle(initialTitle);
    setSurface("neon");
  }, [initialTitle, mode]);

  if (!mode) return null;

  return (
    <Dialog open={Boolean(mode)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-[#030B22] border border-[#1E3264] text-slate-100 rounded-2xl">
        <DialogHeader>
          <DialogTitle
            className="text-lg font-serif font-bold text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {mode === "create" ? "Create New Studio Board" : "Rename Studio Board"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            {mode === "create"
              ? "Start a fresh board for notes, tasks, brainstorming, and live teaching."
              : "Enter a new name for this Studio board."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onSubmit(title.trim(), surface);
          }}
          className="space-y-4 py-2"
        >
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Board Name</label>
            <Input
              data-testid="studio-board-name-input"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 IEP Teaching & Case Strategy"
              className="bg-[#02081A] border-[#1E3264] text-white text-xs h-9"
            />
          </div>

          {mode === "create" && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Starting Surface (Default: Neon)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "neon", label: "Neon" },
                    { id: "whiteboard", label: "Whiteboard" },
                    { id: "cards", label: "Cards" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSurface(s.id)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      surface === s.id
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-[#02081A] border-[#182954] text-slate-400"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#1E3264] bg-[#02081A] text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="studio-board-name-submit"
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-xs cursor-pointer"
            >
              {mode === "create" ? "Create Board" : "Save Name"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
