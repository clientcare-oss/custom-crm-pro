import React, { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Quote,
  Undo2,
  Redo2,
  Variable,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AgreementEditorProps {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
}

const MERGE_TOKEN_GROUPS = [
  {
    group: "Company & Practice",
    tokens: [
      { key: "{{company_name}}", label: "Company Name" },
      { key: "{{company_representative}}", label: "Authorized Representative" },
      { key: "{{company_email}}", label: "Company Email" },
      { key: "{{company_phone}}", label: "Company Phone" },
      { key: "{{company_website}}", label: "Portal / Website Domain" },
      { key: "{{company_address}}", label: "Company Address" },
    ],
  },
  {
    group: "Client & Parent",
    tokens: [
      { key: "{{client_name}}", label: "Client Full Name" },
      { key: "{{parent_name}}", label: "Parent Full Name" },
      { key: "{{client_email}}", label: "Client Email" },
      { key: "{{client_phone}}", label: "Client Phone" },
      { key: "{{client_address}}", label: "Client Full Address" },
      { key: "{{second_parent_name}}", label: "Second Parent Name" },
      { key: "{{second_parent_email}}", label: "Second Parent Email" },
    ],
  },
  {
    group: "Student & Case",
    tokens: [
      { key: "{{student_name}}", label: "Student Full Name" },
      { key: "{{student_grade}}", label: "Grade Level" },
      { key: "{{student_school}}", label: "School Name" },
      { key: "{{case_id}}", label: "Case ID Number" },
      { key: "{{iep_eligibility}}", label: "IEP / 504 Eligibility" },
    ],
  },
  {
    group: "Services & Retainer",
    tokens: [
      { key: "{{service_name}}", label: "Service Name" },
      { key: "{{service_description}}", label: "Service Scope / Description" },
      { key: "{{service_fee}}", label: "Fee / Billing Rate" },
      { key: "{{plan_name}}", label: "Retainer Plan Tier" },
    ],
  },
  {
    group: "Dates & Execution",
    tokens: [
      { key: "{{agreement_date}}", label: "Agreement Effective Date" },
      { key: "{{start_date}}", label: "Term Start Date" },
      { key: "{{end_date}}", label: "Term End Date" },
      { key: "{{advocate_name}}", label: "Assigned Lead Advocate" },
      { key: "{{employee_name}}", label: "Staff Advocate Name" },
      { key: "{{employee_title}}", label: "Advocate Professional Title" },
    ],
  },
];

export function AgreementEditor({
  content,
  onChange,
  readOnly = false,
  minHeight = "360px",
  placeholder = "Write or paste the legal terms of your agreement...",
}: AgreementEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const insertToken = useCallback(
    (tokenKey: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(` ${tokenKey} `).run();
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950 text-slate-100 flex flex-col shadow-inner">
      {/* Editor Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-900 border-b border-slate-800 text-slate-300">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 w-8 p-0 cursor-pointer ${editor.isActive("bold") ? "bg-amber-400/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 p-0 cursor-pointer ${editor.isActive("italic") ? "bg-amber-400/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`h-8 w-8 p-0 cursor-pointer ${editor.isActive("underline") ? "bg-amber-400/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"}`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-slate-800 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`h-8 w-8 p-0 cursor-pointer ${editor.isActive("heading", { level: 1 }) ? "bg-amber-400/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"}`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`h-8 w-8 p-0 cursor-pointer ${editor.isActive("heading", { level: 2 }) ? "bg-amber-400/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"}`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`h-8 w-8 p-0 cursor-pointer ${editor.isActive("heading", { level: 3 }) ? "bg-amber-400/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"}`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-slate-800 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-8 w-8 p-0 cursor-pointer ${editor.isActive("bulletList") ? "bg-amber-400/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`h-8 w-8 p-0 cursor-pointer ${editor.isActive("orderedList") ? "bg-amber-400/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`h-8 w-8 p-0 cursor-pointer ${editor.isActive("blockquote") ? "bg-amber-400/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"}`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="h-8 w-8 p-0 hover:bg-slate-800 text-slate-400 cursor-pointer"
            title="Horizontal Line"
          >
            <Minus className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-slate-800 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0 hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0 hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>

          {/* Merge Field Token Picker */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 bg-blue-950/70 border-blue-800/60 text-blue-200 hover:bg-blue-900/60 gap-1.5 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Variable className="w-3.5 h-3.5 text-amber-400" />
                  Insert Merge Field
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 max-h-80 overflow-y-auto bg-slate-900 border-slate-800 text-slate-200 shadow-2xl z-[1200]"
              >
                {MERGE_TOKEN_GROUPS.map((group, idx) => (
                  <React.Fragment key={group.group}>
                    {idx > 0 && <DropdownMenuSeparator className="bg-slate-800" />}
                    <DropdownMenuLabel className="text-[11px] font-bold text-amber-400 uppercase tracking-wider px-2 py-1.5">
                      {group.group}
                    </DropdownMenuLabel>
                    {group.tokens.map((token) => (
                      <DropdownMenuItem
                        key={token.key}
                        onClick={() => insertToken(token.key)}
                        className="cursor-pointer text-xs flex items-center justify-between hover:bg-blue-950 hover:text-white px-2.5 py-1.5 rounded"
                      >
                        <span>{token.label}</span>
                        <code className="text-[10px] text-blue-300 font-mono bg-blue-950/80 px-1 py-0.5 rounded border border-blue-800/40">
                          {token.key}
                        </code>
                      </DropdownMenuItem>
                    ))}
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Editor Content Surface */}
      <div
        className="p-5 flex-1 overflow-y-auto cursor-text text-sm leading-relaxed prose prose-invert max-w-none focus:outline-none"
        style={{ minHeight }}
        onClick={() => !readOnly && editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
