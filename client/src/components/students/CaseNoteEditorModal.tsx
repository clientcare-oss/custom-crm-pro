import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Link2, RemoveFormatting,
  Image as ImageIcon, MoreHorizontal, Eye, EyeOff, X,
  Calendar, Check, ChevronDown, Trash2, Copy, Save
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CaseNoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: {
    id: number;
    projectId?: number;
    title: string;
    content: string;
    isVisibleToClient: boolean;
  } | null;
  projectId: number;
  studentId?: number;
  studentName?: string;
  appointments?: Array<{ id: number; title?: string | null; date?: string | null }>;
  onSaveSuccess?: (savedProjectId?: number) => void;
  onDeleteSuccess?: (noteId: number) => void;
}

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"];

const TEXT_COLORS = [
  "#171717", "#000000", "#44403c", "#b91c1c", "#c2410c",
  "#b45309", "#15803d", "#0369a1", "#1d4ed8", "#6d28d9",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#fed7aa", "#e2e8f0",
];

export function CaseNoteEditorModal({
  isOpen,
  onClose,
  note,
  projectId,
  studentId,
  studentName = "Student",
  appointments = [],
  onSaveSuccess,
  onDeleteSuccess,
}: CaseNoteEditorModalProps) {
  const [currentNoteId, setCurrentNoteId] = useState<number | undefined>(note?.id);
  const [title, setTitle] = useState(note?.title || "Untitled note");
  const [isVisibleToClient, setIsVisibleToClient] = useState(note?.isVisibleToClient ?? false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [currentFontSize, setCurrentFontSize] = useState("14");
  const [linkedMeeting, setLinkedMeeting] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevNoteKeyRef = useRef<string | null>(null);

  const titleRef = useRef(title);
  titleRef.current = title;

  const isVisibleRef = useRef(isVisibleToClient);
  isVisibleRef.current = isVisibleToClient;

  const currentNoteIdRef = useRef<number | undefined>(note?.id);
  currentNoteIdRef.current = currentNoteId ?? note?.id;

  // Determine effective project ID
  const effectiveProjectId = note?.projectId || projectId || 0;

  // tRPC Mutations
  const createProjectMutation = trpc.projects.create.useMutation();
  const createMutation = trpc.notes.create.useMutation();
  const updateMutation = trpc.notes.update.useMutation();
  const deleteMutation = trpc.notes.delete.useMutation();

  // Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({
        placeholder:
          "Create notes with text, links, images, and to-dos to summarize meetings, brainstorm ideas, or track your work. Share them with clients or your team to keep them in the loop. ✨ 📋 🤲",
      }),
    ],
    content: note?.content || "",
    onUpdate: () => {
      setSaveStatus("unsaved");
      triggerAutoSave();
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[220px] px-8 py-5 text-[#171717] leading-relaxed text-[15px] font-normal selection:bg-amber-400/40",
      },
    },
  });

  // Sync content whenever editor is ready or target note changes
  useEffect(() => {
    if (!editor) return;
    const targetKey = note?.id ? `note-${note.id}` : "new-note";
    if (prevNoteKeyRef.current !== targetKey) {
      prevNoteKeyRef.current = targetKey;
      setCurrentNoteId(note?.id);
      currentNoteIdRef.current = note?.id;
      setTitle(note?.title || "Untitled note");
      setIsVisibleToClient(note?.isVisibleToClient ?? false);
      editor.commands.setContent(note?.content || "");
      setSaveStatus("saved");
    }
  }, [editor, note?.id, note?.title, note?.content, note?.isVisibleToClient]);

  // Execute note save
  const executeSave = useCallback(async (notify = false) => {
    if (!editor) return;
    const contentHtml = editor.getHTML();
    const currentTitle = titleRef.current.trim() || "Untitled note";
    const currentVisible = isVisibleRef.current;
    const activeNoteId = currentNoteIdRef.current || note?.id;

    setSaveStatus("saving");
    try {
      let targetProjectId = effectiveProjectId;
      if (!targetProjectId && studentId) {
        // Auto-create advocacy case project if missing
        const newProj = await createProjectMutation.mutateAsync({
          clientId: studentId,
          name: `${studentName} — Advocacy Case`,
          description: `Active advocacy case and notes for ${studentName}.`,
          status: "In Progress",
        });
        targetProjectId = Number(newProj?.id || (newProj as any)?.[0]?.id || (newProj as any)?.insertId);
      }

      if (!targetProjectId) {
        setSaveStatus("unsaved");
        toast.error("Case project not initialized");
        return;
      }

      if (activeNoteId) {
        await updateMutation.mutateAsync({
          id: activeNoteId,
          projectId: targetProjectId,
          title: currentTitle,
          content: contentHtml,
          isVisibleToClient: currentVisible,
        });
      } else {
        const created = await createMutation.mutateAsync({
          projectId: targetProjectId,
          title: currentTitle,
          content: contentHtml,
          isVisibleToClient: currentVisible,
        });
        const newId = Number((created as any)?.id || (created as any)?.[0]?.id);
        if (newId) {
          setCurrentNoteId(newId);
          currentNoteIdRef.current = newId;
          prevNoteKeyRef.current = `note-${newId}`;
        }
      }

      setSaveStatus("saved");
      if (notify) {
        toast.success("Note saved successfully");
      }
      onSaveSuccess?.(targetProjectId);
    } catch (e: any) {
      setSaveStatus("unsaved");
      toast.error(e?.message || "Failed to save note");
    }
  }, [editor, effectiveProjectId, studentId, studentName, note?.id, updateMutation, createMutation, createProjectMutation, onSaveSuccess]);

  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      executeSave(false);
    }, 1200);
  }, [executeSave]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    titleRef.current = val;
    setSaveStatus("unsaved");
    triggerAutoSave();
  };

  const handleToggleVisibility = async () => {
    const nextVal = !isVisibleToClient;
    setIsVisibleToClient(nextVal);
    isVisibleRef.current = nextVal;
    const activeNoteId = currentNoteIdRef.current || note?.id;
    if (activeNoteId && editor && effectiveProjectId) {
      setSaveStatus("saving");
      try {
        await updateMutation.mutateAsync({
          id: activeNoteId,
          projectId: effectiveProjectId,
          title: titleRef.current.trim() || "Untitled note",
          content: editor.getHTML(),
          isVisibleToClient: nextVal,
        });
        setSaveStatus("saved");
        toast.success(nextVal ? "Note shared with parent portal" : "Note set to advocate private");
        onSaveSuccess?.(effectiveProjectId);
      } catch (e: any) {
        setSaveStatus("unsaved");
        toast.error("Failed to update visibility");
      }
    } else {
      triggerAutoSave();
    }
  };

  const handleDelete = async () => {
    const activeNoteId = currentNoteIdRef.current || note?.id;
    if (!activeNoteId || !effectiveProjectId) return;
    try {
      await deleteMutation.mutateAsync({
        id: activeNoteId,
        projectId: effectiveProjectId,
      });
      toast.success("Note deleted");
      onDeleteSuccess?.(activeNoteId);
      onClose();
    } catch (e: any) {
      toast.error("Failed to delete note");
    }
  };

  // Helper toolbar actions
  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (!editor) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent 
          showCloseButton={false}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[90vw] sm:max-w-xl md:max-w-2xl lg:max-w-[760px] h-[75vh] max-h-[680px] p-6 bg-[#FEF08A] text-[#1c1917] rounded-[2px] border border-amber-300/40 flex items-center justify-center shadow-2xl"
          style={{
            background: "linear-gradient(180deg, #FFFDE2 0%, #FEF08A 20%, #FDE047 85%, #FACC15 100%)",
          }}
        >
          <DialogTitle className="sr-only">Loading Note Editor</DialogTitle>
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <span className="w-4 h-4 border-2 border-neutral-800 border-t-transparent rounded-full animate-spin" />
            <span>Loading note editor...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[90vw] sm:max-w-xl md:max-w-2xl lg:max-w-[760px] h-[75vh] max-h-[680px] p-0 overflow-hidden text-[#1c1917] rounded-[2px] border border-amber-300/40 focus:outline-none flex flex-col shadow-2xl"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 75%), linear-gradient(180deg, #FFFDE2 0%, #FEF9A7 6%, #FEF08A 20%, #FDE047 85%, #FACC15 100%)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.45), 0 8px 26px -2px rgba(0,0,0,0.48), 0 28px 70px -8px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.8), inset 1px 0 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.12), inset -1px 0 0 rgba(0,0,0,0.08)",
        }}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Edit Case Note</DialogTitle>

        {/* Micro-Paper Fiber Noise Texture Overlay (Pure Tactile Material Realism) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.038] mix-blend-multiply z-0">
          <filter id="tactile-paper-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#tactile-paper-grain)" />
        </svg>

        {/* Authentic Top Adhesive Strip, Micro-Sheen & Pressure Peel Crease */}
        <div className="absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-black/[0.08] via-black/[0.03] to-transparent pointer-events-none rounded-t-[2px] z-20 border-b border-black/[0.08]" />
        <div className="absolute top-7 left-0 right-0 h-px bg-white/45 pointer-events-none z-20" />

        {/* ─── TOP BAR: Logo + Title + Meeting link + Saved + Actions ────── */}
        <div className="flex items-center justify-between px-6 sm:px-8 pt-4 pb-2.5 bg-transparent select-none shrink-0 relative z-10">
          {/* Left: Waypoint Seal / Logo + Editable Title + Add to meeting */}
          <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-neutral-900/20 shadow-sm mt-0.5 bg-sky-950 flex items-center justify-center">
              <img
                src="/brand/logo.png"
                alt="Waypoint"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <span className="text-[11px] font-bold text-amber-300">W</span>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Untitled note"
                className="text-lg sm:text-xl font-bold text-neutral-900 focus:outline-none bg-transparent placeholder:text-neutral-600/60 border-b border-transparent hover:border-neutral-900/20 focus:border-neutral-900/40 transition-colors py-0.5 leading-snug"
              />

              {/* Add to a meeting link */}
              <div className="flex items-center gap-2 mt-0.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="text-xs text-sky-900 hover:text-black hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3 h-3 text-sky-850" />
                      <span>{linkedMeeting ? `Linked: ${linkedMeeting}` : "Add to a meeting"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 p-3 bg-amber-50 shadow-xl border border-amber-300 rounded-lg text-neutral-900">
                    <p className="text-xs font-semibold text-neutral-900 mb-2">Select Meeting for {studentName}</p>
                    {appointments.length > 0 ? (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {appointments.map((appt) => (
                          <button
                            key={appt.id}
                            onClick={() => {
                              setLinkedMeeting(appt.title || "IEP Session");
                              toast.success("Linked note to meeting");
                            }}
                            className="w-full text-left p-2 rounded text-xs hover:bg-amber-200/60 flex flex-col gap-0.5 transition-colors cursor-pointer"
                          >
                            <span className="font-semibold text-neutral-900">{appt.title || "Advocacy Meeting"}</span>
                            <span className="text-[10px] text-neutral-600">
                              {appt.date ? new Date(appt.date).toLocaleDateString() : "Upcoming"}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-600 py-2">No upcoming meetings scheduled for this student.</p>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Right: Save Button + Saved status | More ••• | Visibility Eye | Close X */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Explicit Save Button */}
            <button
              type="button"
              disabled={saveStatus === "saving"}
              onClick={() => executeSave(true)}
              className="px-3 py-1 bg-neutral-900 hover:bg-black text-amber-200 text-xs font-bold rounded shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              title="Save changes now"
            >
              <Check className="w-3.5 h-3.5 text-amber-300" />
              <span>{saveStatus === "saving" ? "Saving..." : "Save"}</span>
            </button>

            <span className="text-xs italic text-neutral-700 font-medium hidden sm:inline">
              {saveStatus === "saving" ? "Saving..." : saveStatus === "unsaved" ? "Unsaved" : "Saved"}
            </span>

            <span className="text-neutral-900/25 select-none">|</span>

            {/* More Menu ••• */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-black/10 text-neutral-800 hover:text-black transition-colors cursor-pointer"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-amber-50 border border-amber-300 shadow-lg rounded-lg text-neutral-900">
                <DropdownMenuItem
                  onClick={() => {
                    if (editor) {
                      navigator.clipboard.writeText(editor.getText());
                      toast.success("Note text copied to clipboard");
                    }
                  }}
                  className="cursor-pointer text-xs hover:bg-amber-200/50"
                >
                  <Copy className="w-3.5 h-3.5 mr-2 text-neutral-600" />
                  Copy note text
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => executeSave(true)}
                  className="cursor-pointer text-xs hover:bg-amber-200/50"
                >
                  <Save className="w-3.5 h-3.5 mr-2 text-neutral-600" />
                  Save now
                </DropdownMenuItem>
                {note?.id && (
                  <>
                    <DropdownMenuSeparator className="bg-amber-200" />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="cursor-pointer text-xs text-red-700 hover:bg-red-50 focus:text-red-800"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />
                      Delete note
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Client Visibility Toggle */}
            <button
              type="button"
              onClick={handleToggleVisibility}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isVisibleToClient
                  ? "text-emerald-900 bg-emerald-700/20 hover:bg-emerald-700/30"
                  : "text-neutral-700 hover:bg-black/10 hover:text-neutral-900"
              }`}
              title={isVisibleToClient ? "Visible to client in parent portal (Click to make private)" : "Advocate private (Click to share with client)"}
            >
              {isVisibleToClient ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Close Button X */}
            <button
              type="button"
              onClick={() => {
                if (saveStatus === "unsaved") executeSave(false);
                onClose();
              }}
              className="p-1.5 rounded-md hover:bg-black/10 text-neutral-700 hover:text-black transition-colors cursor-pointer"
              title="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── HORIZONTAL DIVIDER ────────────────────────────────────────── */}
        <div className="w-full h-px bg-black/[0.08] shrink-0" />

        {/* ─── RICH TEXT FORMATTING TOOLBAR ─── */}
        <div className="flex items-center flex-wrap gap-1 px-6 sm:px-8 py-1.5 bg-amber-400/20 backdrop-blur-[0.5px] border-b border-black/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] text-neutral-850 select-none shrink-0 relative z-10">
          {/* Font Size Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-neutral-800 hover:bg-black/10 transition-colors cursor-pointer"
              >
                <span>{currentFontSize}</span>
                <ChevronDown className="w-3 h-3 text-neutral-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-20 bg-amber-50 border border-amber-300 shadow-md">
              {FONT_SIZES.map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => setCurrentFontSize(size)}
                  className="text-xs cursor-pointer justify-center hover:bg-amber-200/50"
                >
                  {size}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-neutral-900/20 mx-1">|</span>

          {/* Bold */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-black/10 transition-colors cursor-pointer ${editor?.isActive("bold") ? "bg-black/15 font-black text-black" : "text-neutral-800"}`}
            title="Bold"
          >
            <Bold className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-black/10 transition-colors cursor-pointer ${editor?.isActive("italic") ? "bg-black/15 font-bold text-black" : "text-neutral-800"}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-black/10 transition-colors cursor-pointer ${editor?.isActive("underline") ? "bg-black/15 font-bold text-black" : "text-neutral-800"}`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-black/10 transition-colors cursor-pointer ${editor?.isActive("strike") ? "bg-black/15 font-bold text-black" : "text-neutral-800"}`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          {/* Text Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-0.5 p-1.5 rounded hover:bg-black/10 text-neutral-800 transition-colors cursor-pointer"
                title="Text color"
              >
                <span className="font-bold text-sm leading-none border-b-2 border-neutral-900 pb-0.5">A</span>
                <ChevronDown className="w-2.5 h-2.5 text-neutral-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-2 bg-amber-50 border border-amber-300 shadow-md">
              <div className="grid grid-cols-5 gap-1.5">
                {TEXT_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => editor?.chain().focus().setColor(col).run()}
                    className="w-6 h-6 rounded-full border border-neutral-400 cursor-pointer hover:scale-110 transition-transform shadow-xs"
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Highlight Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-0.5 p-1.5 rounded hover:bg-black/10 text-neutral-800 transition-colors cursor-pointer"
                title="Highlight"
              >
                <span className="text-sm">✎</span>
                <ChevronDown className="w-2.5 h-2.5 text-neutral-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-2 bg-amber-50 border border-amber-300 shadow-md">
              <div className="grid grid-cols-6 gap-1.5">
                {HIGHLIGHT_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => editor?.chain().focus().toggleHighlight({ color: col }).run()}
                    className="w-5 h-5 rounded border border-neutral-400 cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Alignment */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-0.5 p-1.5 rounded hover:bg-black/10 text-neutral-800 transition-colors cursor-pointer"
                title="Align"
              >
                <AlignLeft className="w-4 h-4" />
                <ChevronDown className="w-2.5 h-2.5 text-neutral-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-32 bg-amber-50 border border-amber-300 shadow-md">
              <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("left").run()} className="cursor-pointer text-xs hover:bg-amber-200/50">
                <AlignLeft className="w-3.5 h-3.5 mr-2" /> Left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("center").run()} className="cursor-pointer text-xs hover:bg-amber-200/50">
                <AlignCenter className="w-3.5 h-3.5 mr-2" /> Center
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("right").run()} className="cursor-pointer text-xs hover:bg-amber-200/50">
                <AlignRight className="w-3.5 h-3.5 mr-2" /> Right
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("justify").run()} className="cursor-pointer text-xs hover:bg-amber-200/50">
                <AlignJustify className="w-3.5 h-3.5 mr-2" /> Justify
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-black/10 transition-colors cursor-pointer ${editor?.isActive("bulletList") ? "bg-black/15 font-bold text-black" : "text-neutral-800"}`}
            title="Bulleted list"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-black/10 transition-colors cursor-pointer ${editor?.isActive("orderedList") ? "bg-black/15 font-bold text-black" : "text-neutral-800"}`}
            title="Numbered list"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          {/* Checklist / To-do */}
          <button
            type="button"
            onClick={() => {
              if (editor) {
                editor.chain().focus().toggleBulletList().run();
              }
            }}
            className="p-1.5 rounded hover:bg-black/10 text-neutral-800 transition-colors cursor-pointer"
            title="Checklist / To-do items"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          {/* Link */}
          <button
            type="button"
            onClick={setLink}
            className={`p-1.5 rounded hover:bg-black/10 transition-colors cursor-pointer ${editor?.isActive("link") ? "bg-black/15 font-bold text-black" : "text-neutral-800"}`}
            title="Insert link"
          >
            <Link2 className="w-4 h-4" />
          </button>

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
            className="p-1.5 rounded hover:bg-black/10 text-neutral-800 transition-colors cursor-pointer"
            title="Clear formatting"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>

          {/* Image */}
          <button
            type="button"
            onClick={addImage}
            className="p-1.5 rounded hover:bg-black/10 text-neutral-800 transition-colors cursor-pointer"
            title="Insert image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>

        {/* ─── EDITOR CONTENT CANVAS (Seamless Yellow Sticky Note Paper) ─── */}
        <div className="bg-transparent flex-1 min-h-0 overflow-y-auto px-2 sm:px-4">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
