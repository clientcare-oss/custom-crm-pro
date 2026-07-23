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
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import FontFamily from "@tiptap/extension-font-family";
import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, RemoveFormatting, Minus, Smile, Link2, Type, Palette,
  Highlighter, Image as ImageIcon, Sparkles, FileSignature, Unlink, Calendar,
  MailX, Wand2, ArrowDown, Check, Copy, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

// ─── Types ────────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  showInsertOptions?: boolean; // show signature, unsubscribe, calendar links
}

// ─── Smart Fields ─────────────────────────────────────────────────────────────

const SMART_FIELDS = [
  { label: "First Name", value: "{{first_name}}" },
  { label: "Last Name", value: "{{last_name}}" },
  { label: "Full Name", value: "{{full_name}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Phone", value: "{{phone}}" },
  { label: "Student Name", value: "{{student_name}}" },
  { label: "Case ID", value: "{{case_id}}" },
  { label: "Meeting Date", value: "{{meeting_date}}" },
  { label: "Meeting Time", value: "{{meeting_time}}" },
  { label: "Company Name", value: "{{company_name}}" },
];

const FONTS = [
  { label: "Default", value: "" },
  { label: "Inter", value: "Inter" },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
  { label: "Verdana", value: "Verdana" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

const COLORS = [
  "#000000", "#374151", "#6b7280", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff",
];

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function ToolbarBtn({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Start typing...",
  minHeight = "200px",
  showInsertOptions = true,
}: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<"rewrite" | "rephrase">("rewrite");

  const aiRewrite = trpc.ai.rewriteText.useMutation();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true }),
      Placeholder.configure({ placeholder }),
      HorizontalRule,
      FontFamily,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSetLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
  };

  const handleInsertSmartField = (value: string) => {
    editor.chain().focus().insertContent(value).run();
  };

  const handleInsertSignature = () => {
    editor.chain().focus().insertContent(
      `<p style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;"><strong>{{full_name}}</strong><br/>{{company_name}}<br/>{{email}} | {{phone}}</p>`
    ).run();
  };

  const handleInsertUnsubscribe = () => {
    editor.chain().focus().insertContent(
      `<p style="font-size:11px;color:#9ca3af;margin-top:24px;">If you no longer wish to receive these emails, <a href="{{unsubscribe_link}}">click here to unsubscribe</a>.</p>`
    ).run();
  };

  const handleInsertCalendarLink = () => {
    editor.chain().focus().insertContent(
      `<p><a href="{{calendar_booking_link}}">Book a session on my calendar</a></p>`
    ).run();
  };

  const handleInsertImage = () => {
    const url = prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleAiRewrite = async () => {
    const textToRewrite = aiMode === "rewrite"
      ? editor.state.doc.textContent
      : aiInput;

    if (!textToRewrite.trim()) {
      toast.error("No text to process");
      return;
    }

    setAiLoading(true);
    try {
      const result = await aiRewrite.mutateAsync({
        text: textToRewrite,
        mode: aiMode,
      });
      setAiResult(result.text as string);
    } catch {
      toast.error("AI rewrite failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptRewrite = () => {
    if (aiMode === "rewrite") {
      editor.commands.setContent(aiResult);
    } else {
      editor.chain().focus().insertContent(`<p>${aiResult}</p>`).run();
    }
    setAiDialogOpen(false);
    setAiResult("");
    setAiInput("");
    toast.success("Applied");
  };

  const handleCopyRewrite = () => {
    navigator.clipboard.writeText(aiResult);
    toast.success("Copied to clipboard");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Toolbar Row 1: Formatting */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
        {/* Font Family */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground">
              <Type className="h-3.5 w-3.5" />
              <span className="hidden sm:inline max-w-[60px] truncate">Font</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {FONTS.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => f.value ? editor.chain().focus().setFontFamily(f.value).run() : editor.chain().focus().unsetFontFamily().run()}>
                <span style={{ fontFamily: f.value || "inherit" }}>{f.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Size */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground">
              <span>Size</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-24">
            {FONT_SIZES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => editor.chain().focus().setMark("textStyle", { fontSize: s }).run()}>
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Bold / Italic / Underline */}
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded text-muted-foreground hover:bg-accent/50 hover:text-foreground" title="Text color">
              <Palette className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((c) => (
                <button key={c} onClick={() => editor.chain().focus().setColor(c).run()} className="h-6 w-6 rounded border" style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={() => editor.chain().focus().unsetColor().run()} className="mt-1 text-xs text-muted-foreground hover:text-foreground">Reset</button>
          </PopoverContent>
        </Popover>

        {/* Highlight Color */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded text-muted-foreground hover:bg-accent/50 hover:text-foreground" title="Highlight">
              <Highlighter className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-6 gap-1">
              {COLORS.filter((c) => c !== "#000000" && c !== "#374151").map((c) => (
                <button key={c} onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()} className="h-6 w-6 rounded border" style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={() => editor.chain().focus().unsetHighlight().run()} className="mt-1 text-xs text-muted-foreground hover:text-foreground">Remove</button>
          </PopoverContent>
        </Popover>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Alignment */}
        <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Lists */}
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Remove formatting */}
        <ToolbarBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Remove formatting">
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarBtn>

        {/* Divider */}
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Add divider">
          <Minus className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      {/* Toolbar Row 2: Insert & AI */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/20">
        {/* Emoji */}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded text-muted-foreground hover:bg-accent/50 hover:text-foreground" title="Insert emoji">
              <Smile className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Loading...</div>}>
              <EmojiPicker
                onEmojiClick={(emoji: any) => { editor.chain().focus().insertContent(emoji.emoji).run(); setEmojiOpen(false); }}
                width={320}
                height={350}
              />
            </Suspense>
          </PopoverContent>
        </Popover>

        {/* Link */}
        <ToolbarBtn active={editor.isActive("link")} onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
          } else {
            setLinkUrl("");
            setLinkDialogOpen(true);
          }
        }} title={editor.isActive("link") ? "Remove link" : "Insert link"}>
          {editor.isActive("link") ? <Unlink className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        </ToolbarBtn>

        {/* Smart Fields */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground" title="Insert smart field">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Smart Field</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {SMART_FIELDS.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => handleInsertSmartField(f.value)}>
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {showInsertOptions && (
          <>
            <div className="w-px h-5 bg-border mx-1" />

            {/* Signature */}
            <ToolbarBtn onClick={handleInsertSignature} title="Insert signature">
              <FileSignature className="h-3.5 w-3.5" />
            </ToolbarBtn>

            {/* Image */}
            <ToolbarBtn onClick={handleInsertImage} title="Insert image">
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolbarBtn>

            {/* Unsubscribe */}
            <ToolbarBtn onClick={handleInsertUnsubscribe} title="Insert unsubscribe link">
              <MailX className="h-3.5 w-3.5" />
            </ToolbarBtn>

            {/* Calendar link */}
            <ToolbarBtn onClick={handleInsertCalendarLink} title="Insert calendar booking link">
              <Calendar className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </>
        )}

        <div className="flex-1" />

        {/* AI Rewrite */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 font-medium">
              <Wand2 className="h-3.5 w-3.5" />
              AI Assist
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => { setAiMode("rewrite"); setAiResult(""); setAiDialogOpen(true); }}>
              <Wand2 className="h-3.5 w-3.5 mr-2" /> Rewrite entire text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setAiMode("rephrase"); setAiResult(""); setAiInput(""); setAiDialogOpen(true); }}>
              <ArrowDown className="h-3.5 w-3.5 mr-2" /> Rephrase a sentence
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none px-4 py-3 focus:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[var(--min-h)]"
        style={{ "--min-h": minHeight } as any}
      />

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSetLink(); }} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSetLink} disabled={!linkUrl.trim()}>Insert</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-violet-500" />
              {aiMode === "rewrite" ? "AI Rewrite Suggestion" : "AI Rephrase"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {aiMode === "rephrase" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type or paste the sentence to rephrase:</label>
                <Input value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Enter sentence..." />
              </div>
            )}
            {aiMode === "rewrite" && (
              <p className="text-sm text-muted-foreground">The AI will rewrite the entire content of the editor with improved clarity and tone.</p>
            )}

            {!aiResult && (
              <Button onClick={handleAiRewrite} disabled={aiLoading} className="gap-2">
                <Wand2 className="h-4 w-4" />
                {aiLoading ? "Generating..." : aiMode === "rewrite" ? "Generate Rewrite" : "Rephrase"}
              </Button>
            )}

            {aiResult && (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {aiResult}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAcceptRewrite} className="gap-1">
                    <Check className="h-3.5 w-3.5" /> Accept & {aiMode === "rewrite" ? "Replace" : "Insert Below"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCopyRewrite} className="gap-1">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAiResult(""); }} className="gap-1">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
