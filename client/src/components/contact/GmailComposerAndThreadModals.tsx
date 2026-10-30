/**
 * WAP 1B.1 — Shared Gmail Compose Modal, Full Thread Drawer/Modal, and Association Review Modal
 * Reused across Client Communication Hub (PG-045) and Student Workspace Activity Timeline (PG-030).
 */

import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Send,
  Reply,
  Paperclip,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  UserCheck,
  History,
  FileText,
  Loader2,
  Shield,
} from "lucide-react";
import {
  EmailTemplateSelectorDropdown,
  type SelectedEmailTemplatePayload,
} from "@/components/email/EmailTemplateSelectorDropdown";

export interface ComposeEmailModalProps {
  open: boolean;
  onClose: () => void;
  defaultToEmail?: string;
  defaultParentContactId?: number | null;
  defaultStudentContactId?: number | null;
  defaultSubject?: string;
  replyThreadId?: string | null;
  replyToMessageId?: string | null;
  onSent?: () => void;
}

export function GmailComposeModal({
  open,
  onClose,
  defaultToEmail = "",
  defaultParentContactId = null,
  defaultStudentContactId = null,
  defaultSubject = "",
  replyThreadId = null,
  replyToMessageId = null,
  onSent,
}: ComposeEmailModalProps) {
  const utils = trpc.useUtils();
  const { data: contacts = [] } = trpc.contacts.list.useQuery(undefined, { enabled: open });

  const [parentContactId, setParentContactId] = useState<number | null>(defaultParentContactId);
  const [studentContactId, setStudentContactId] = useState<number | null>(defaultStudentContactId);
  const [toEmail, setToEmail] = useState(defaultToEmail);
  const [ccEmail, setCcEmail] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [selectedBodyHtml, setSelectedBodyHtml] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [portalVisible, setPortalVisible] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number; url?: string }>
  >([]);

  useEffect(() => {
    if (open) {
      setParentContactId(defaultParentContactId);
      setStudentContactId(defaultStudentContactId);
      setToEmail(defaultToEmail);
      setSubject(defaultSubject);
      setBody("");
      setSelectedBodyHtml("");
      setSelectedTemplateId(null);
      setPortalVisible(false);
      setAttachments([]);
    }
  }, [open, defaultToEmail, defaultParentContactId, defaultStudentContactId, defaultSubject]);

  const parentContacts = useMemo(
    () =>
      (contacts as any[]).filter(
        (c) => !c.parentContactId || c.parentContactId === c.id || (c.jobTitle || "").toLowerCase() === "parent"
      ),
    [contacts]
  );

  const studentContacts = useMemo(() => {
    const allStudents = (contacts as any[]).filter(
      (c) => (c.parentContactId && c.parentContactId !== c.id) || (c.jobTitle || "").toLowerCase() === "student"
    );
    if (parentContactId) {
      const filtered = allStudents.filter((s) => s.parentContactId === parentContactId);
      return filtered.length > 0 ? filtered : allStudents;
    }
    return allStudents;
  }, [contacts, parentContactId]);

  const sendMutation = trpc.messages.composeAndSendEmail.useMutation({
    onSuccess: (res) => {
      if (!res.accepted) {
        toast.error(res.error || "Gmail did not accept the message.");
        return;
      }
      toast.success("Email accepted by Gmail and recorded to Case Activity Timeline");
      utils.messages.listGmailThreads.invalidate();
      utils.messages.gmailStatus.invalidate();
      utils.caseActivity.unifiedFeed.invalidate();
      utils.caseActivity.list.invalidate();
      onSent?.();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedParentObj = useMemo(
    () => (contacts as any[]).find((c) => c.id === parentContactId),
    [contacts, parentContactId]
  );
  const selectedStudentObj = useMemo(
    () => (contacts as any[]).find((c) => c.id === studentContactId),
    [contacts, studentContactId]
  );
  const resolvedParentName = selectedParentObj
    ? `${selectedParentObj.firstName} ${selectedParentObj.lastName}`.trim()
    : "Parent";
  const resolvedStudentName = selectedStudentObj
    ? `${selectedStudentObj.firstName} ${selectedStudentObj.lastName}`.trim()
    : "Student";

  const handleApplyTemplate = (payload: {
    id: number;
    name: string;
    category: string;
    subject: string;
    bodyText: string;
    bodyHtml: string;
  }) => {
    setSelectedTemplateId(payload.id);
    if (!replyThreadId && payload.subject) {
      setSubject(payload.subject);
    }
    setBody(payload.bodyText);
    setSelectedBodyHtml(payload.bodyHtml);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const toList = toEmail
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (toList.length === 0) {
      toast.error("Please enter at least one recipient email address.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message body are required.");
      return;
    }

    const ccList = ccEmail
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    sendMutation.mutate({
      toEmails: toList,
      ccEmails: ccList.length > 0 ? ccList : undefined,
      subject: subject.trim(),
      bodyHtml: selectedBodyHtml || body.trim(),
      bodyText: body.trim(),
      parentContactId,
      studentContactId,
      gmailThreadId: replyThreadId,
      replyToMessageId,
      templateId: selectedTemplateId,
      portalVisible,
      attachments,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-[#061830] border border-blue-800/80 text-white shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-serif font-bold text-white">
            <Mail className="w-5 h-5 text-[#F5B544]" />
            <span>{replyThreadId ? "Reply in Gmail Conversation Thread" : "Compose Client Email (Gmail)"}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-200 mb-1 block">Client / Parent Guardian</Label>
              <select
                value={parentContactId ?? ""}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setParentContactId(id);
                  const found = (contacts as any[]).find((c) => c.id === id);
                  if (found?.email && !toEmail) {
                    setToEmail(found.email);
                  }
                }}
                className="w-full h-9 rounded-xl bg-blue-950/80 border border-blue-800/80 px-3 text-xs text-white"
              >
                <option value="">— Select Parent / Family —</option>
                {parentContacts.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.email ? `(${p.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-blue-200 mb-1 block">Associated Student</Label>
              <select
                value={studentContactId ?? ""}
                onChange={(e) => setStudentContactId(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-9 rounded-xl bg-blue-950/80 border border-blue-800/80 px-3 text-xs text-white"
              >
                <option value="">— Select Student —</option>
                {studentContacts.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} {s.caseId ? `[${s.caseId}]` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-200 mb-1 block">To Email *</Label>
              <Input
                type="text"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="parent@example.com"
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs h-9"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-blue-200 mb-1 block">Use Email Template (Optional)</Label>
              <EmailTemplateSelectorDropdown
                triggerLabel="Select Template"
                variant="field"
                placement="bottom"
                currentSubject={subject}
                currentBody={body}
                defaultSubject={defaultSubject}
                selectedTemplateId={selectedTemplateId}
                mergeContext={{
                  parentName: resolvedParentName,
                  parentFirstName: selectedParentObj?.firstName || "Parent",
                  studentFullName: resolvedStudentName,
                  studentFirstName: selectedStudentObj?.firstName || "Student",
                }}
                onSelectTemplate={handleApplyTemplate}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-200 mb-1 block">Subject *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. IEP Evaluation Request & Next Steps"
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs h-9"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-blue-200 mb-1 block">CC (Optional, comma-separated)</Label>
              <Input
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="secondary@example.com"
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs h-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-blue-200 mb-1 block">Message *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs min-h-[140px]"
              required
            />
          </div>

          {/* Attachments + Portal Visibility */}
          <div className="rounded-xl border border-blue-800/70 bg-blue-950/50 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Paperclip className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <Input
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="Attach document filename (e.g. DPR_Request_Letter.pdf)"
                  className="bg-[#041022] border-blue-800/80 text-white rounded-lg text-xs h-8"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!attachmentName.trim()) return;
                    setAttachments((prev) => [
                      ...prev,
                      {
                        id: `att-${Date.now()}`,
                        fileName: attachmentName.trim(),
                        mimeType: "application/pdf",
                        sizeBytes: 124000,
                      },
                    ]);
                    setAttachmentName("");
                  }}
                  className="h-8 border-blue-700 text-blue-200 hover:bg-blue-900/50 text-xs shrink-0"
                >
                  Attach
                </Button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-blue-100 select-none">
                <input
                  type="checkbox"
                  checked={portalVisible}
                  onChange={(e) => setPortalVisible(e.target.checked)}
                  className="rounded border-blue-700"
                />
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Also publish to Parent Portal</span>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {attachments.map((att) => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[11px]"
                  >
                    <FileText className="w-3 h-3" />
                    <span>{att.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      className="text-sky-300 hover:text-white ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2">
            <EmailTemplateSelectorDropdown
              triggerLabel="Templates"
              variant="toolbar"
              placement="top"
              currentSubject={subject}
              currentBody={body}
              defaultSubject={defaultSubject}
              selectedTemplateId={selectedTemplateId}
              mergeContext={{
                parentName: resolvedParentName,
                parentFirstName: selectedParentObj?.firstName || "Parent",
                studentFullName: resolvedStudentName,
                studentFirstName: selectedStudentObj?.firstName || "Student",
              }}
              onSelectTemplate={handleApplyTemplate}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-blue-800 text-blue-200 hover:bg-blue-900/50 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendMutation.isPending}
                className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold rounded-xl text-xs gap-1.5"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send via Connected Gmail</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface ThreadViewerModalProps {
  gmailThreadId: string | null;
  open: boolean;
  onClose: () => void;
  onReply?: (thread: any, lastMessage: any) => void;
}

export function GmailThreadViewerModal({
  gmailThreadId,
  open,
  onClose,
  onReply,
}: ThreadViewerModalProps) {
  const utils = trpc.useUtils();
  const { data: thread, isLoading } = trpc.messages.getGmailThread.useQuery(
    { gmailThreadId: gmailThreadId || "" },
    { enabled: open && Boolean(gmailThreadId) }
  );

  const { data: contacts = [] } = trpc.contacts.list.useQuery(undefined, { enabled: open });

  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [assignParentId, setAssignParentId] = useState<number | null>(null);
  const [assignStudentId, setAssignStudentId] = useState<number | null>(null);
  const [assignReason, setAssignReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (thread) {
      setAssignParentId(thread.parentContactId ?? null);
      setAssignStudentId(thread.studentContactId ?? null);
    }
  }, [thread?.gmailThreadId, thread?.parentContactId, thread?.studentContactId]);

  const assignMutation = trpc.messages.assignEmailAssociation.useMutation({
    onSuccess: () => {
      toast.success("Email thread association confirmed and recorded");
      utils.messages.getGmailThread.invalidate();
      utils.messages.listGmailThreads.invalidate();
      utils.messages.gmailStatus.invalidate();
      utils.caseActivity.unifiedFeed.invalidate();
      utils.caseActivity.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const portalVisibilityMutation = trpc.messages.setEmailPortalVisibility.useMutation({
    onSuccess: (_, vars) => {
      toast.success(
        vars.portalVisible
          ? "Thread published to Parent Portal"
          : "Thread set to Internal Staff View only"
      );
      utils.messages.getGmailThread.invalidate();
      utils.messages.listGmailThreads.invalidate();
      utils.caseActivity.unifiedFeed.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const parentContacts = useMemo(
    () =>
      (contacts as any[]).filter(
        (c) => !c.parentContactId || c.parentContactId === c.id || (c.jobTitle || "").toLowerCase() === "parent"
      ),
    [contacts]
  );

  const studentContacts = useMemo(() => {
    const allStudents = (contacts as any[]).filter(
      (c) => (c.parentContactId && c.parentContactId !== c.id) || (c.jobTitle || "").toLowerCase() === "student"
    );
    if (assignParentId) {
      const filtered = allStudents.filter((s) => s.parentContactId === assignParentId);
      return filtered.length > 0 ? filtered : allStudents;
    }
    return allStudents;
  }, [contacts, assignParentId]);

  const latestMessage = thread?.messages?.[thread.messages.length - 1];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto bg-[#061830] border border-blue-800/80 text-white shadow-2xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-lg font-serif font-bold text-white">
                {thread?.subject || "Email Conversation Thread"}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-blue-300">
                <span>{thread?.messageCount || 0} message(s) in thread</span>
                {thread?.studentName && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                    Student: {thread.studentName}
                  </Badge>
                )}
                {thread?.matchStatus === "needs_review" && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                    Needs Review ({thread.reviewReason.replace(/_/g, " ")})
                  </Badge>
                )}
                <Badge
                  className={
                    thread?.portalVisible
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px]"
                      : "bg-slate-700/60 text-slate-300 border-slate-600 text-[10px]"
                  }
                >
                  {thread?.portalVisible ? "Visible in Parent Portal" : "Internal Staff View Only"}
                </Badge>
              </div>
            </div>

            {latestMessage && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  portalVisibilityMutation.mutate({
                    emailIdOrMessageId: latestMessage.gmailMessageId,
                    portalVisible: !thread?.portalVisible,
                    applyToThread: true,
                  })
                }
                disabled={portalVisibilityMutation.isPending || thread?.matchStatus === "needs_review"}
                className="h-8 border-blue-700 bg-blue-950/70 text-blue-200 hover:bg-blue-900/60 text-xs gap-1.5 shrink-0"
              >
                {thread?.portalVisible ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Make Internal-Only</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>Publish to Parent Portal</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          </div>
        ) : !thread ? (
          <div className="py-8 text-center text-xs text-blue-300">Conversation thread not found.</div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Family & Student Association / Needs Review Bar */}
            <div className="rounded-xl border border-blue-800/80 bg-[#041022] p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {thread.matchStatus === "needs_review"
                      ? "Needs Review — Confirm Family & Student Filing"
                      : "Client & Student Association"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                >
                  <History className="w-3 h-3" />
                  <span>Association History ({latestMessage?.associationHistory?.length || 0})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                <div>
                  <Label className="text-[11px] text-blue-300 mb-1 block">Parent / Family</Label>
                  <select
                    value={assignParentId ?? ""}
                    onChange={(e) => setAssignParentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-8 rounded-lg bg-blue-950 border border-blue-800 px-2.5 text-xs text-white"
                  >
                    <option value="">— Unassigned —</option>
                    {parentContacts.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[11px] text-blue-300 mb-1 block">Student</Label>
                  <select
                    value={assignStudentId ?? ""}
                    onChange={(e) => setAssignStudentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-8 rounded-lg bg-blue-950 border border-blue-800 px-2.5 text-xs text-white"
                  >
                    <option value="">— Select Student —</option>
                    {studentContacts.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                    placeholder="Filing note (optional)"
                    className="h-8 bg-blue-950 border-blue-800 text-xs text-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!latestMessage) return;
                      assignMutation.mutate({
                        emailIdOrMessageId: latestMessage.gmailMessageId,
                        parentContactId: assignParentId,
                        studentContactId: assignStudentId,
                        applyToThread: true,
                        reason: assignReason.trim() || undefined,
                      });
                    }}
                    disabled={assignMutation.isPending}
                    className="h-8 bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold text-xs shrink-0"
                  >
                    Confirm
                  </Button>
                </div>
              </div>

              {showHistory && latestMessage?.associationHistory && (
                <div className="pt-2 border-t border-blue-900/60 space-y-1.5">
                  {latestMessage.associationHistory.map((h: any, i: number) => (
                    <div key={i} className="text-[11px] text-blue-200/80 flex items-center justify-between">
                      <span>
                        <strong>{h.actorName}</strong> ({h.action.replace(/_/g, " ")}): {h.reason}
                      </span>
                      <span className="font-mono text-[10px] text-blue-400">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chronological Messages in Thread */}
            <div className="space-y-3">
              {thread.messages.map((msg: any, idx: number) => {
                const isLast = idx === thread.messages.length - 1;
                const isCollapsed = collapsedIds[msg.gmailMessageId] ?? (!isLast && thread.messages.length > 2);

                return (
                  <div
                    key={msg.gmailMessageId}
                    className="rounded-xl border border-blue-800/70 bg-[#051429] overflow-hidden"
                  >
                    <div
                      onClick={() =>
                        setCollapsedIds((prev) => ({
                          ...prev,
                          [msg.gmailMessageId]: !isCollapsed,
                        }))
                      }
                      className="px-4 py-3 bg-blue-950/50 flex items-center justify-between gap-3 cursor-pointer hover:bg-blue-900/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              msg.direction === "outbound"
                                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {msg.direction === "outbound" ? "Outgoing" : "Incoming"}
                          </span>
                          <span className="font-bold text-white text-xs">
                            {msg.fromName || msg.fromEmail}
                          </span>
                          <span className="text-[11px] text-blue-300/75">
                            → {msg.toEmails.join(", ")}
                          </span>
                        </div>
                        {isCollapsed && (
                          <p className="text-xs text-blue-200/70 truncate mt-1">{msg.snippet}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[11px] text-blue-300 font-mono">
                        <span>{new Date(msg.timestamp).toLocaleString()}</span>
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-4 space-y-3">
                        <div
                          className="text-xs sm:text-sm text-blue-50 leading-relaxed space-y-2 prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: msg.bodyHtml || msg.bodyText }}
                        />

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="pt-2 border-t border-blue-900/50 flex flex-wrap gap-2">
                            {msg.attachments.map((att: any) => (
                              <a
                                key={att.id}
                                href={att.url || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-950 border border-blue-800 text-xs text-sky-300 hover:text-white"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>{att.fileName}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-blue-800 text-blue-200 hover:bg-blue-900/50 rounded-xl text-xs"
          >
            Close
          </Button>
          {thread && latestMessage && onReply && (
            <Button
              type="button"
              onClick={() => onReply(thread, latestMessage)}
              className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold rounded-xl text-xs gap-1.5"
            >
              <Reply className="w-3.5 h-3.5" />
              <span>Reply in Thread</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
