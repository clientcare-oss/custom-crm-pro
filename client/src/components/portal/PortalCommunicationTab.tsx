import React, { useState } from "react";
import { MessageSquare, Send, Bot, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PageIdBadge from "@/components/PageIdBadge";

interface MessageItem {
  id: number;
  content: string;
  senderId?: number;
  isRead?: boolean;
  createdAt?: string | Date;
}

interface PortalCommunicationTabProps {
  messages?: MessageItem[];
  currentUserId?: number;
  onSendMessage?: (content: string) => void;
}

export default function PortalCommunicationTab({
  messages = [],
  currentUserId,
  onSendMessage,
}: PortalCommunicationTabProps) {
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSendMessage?.(content);
    setContent("");
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* ── Header with PG-023-COM Badge ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Communication & Messages
              </h2>
              <PageIdBadge id="PG-023-COM" name="Portal Communication" />
            </div>
            <p className="text-xs sm:text-sm text-white/60 mt-0.5">Direct encrypted messaging with Byron Honea (Master IEP Coach®)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold self-start sm:self-auto shadow-sm">
          <Lock className="w-3.5 h-3.5 text-emerald-400" /> FERPA Encrypted (AES-256)
        </div>
      </div>

      {/* Message Thread Box */}
      <Card className="border border-blue-900/40 bg-[#06172F] text-white shadow-xl min-h-[380px] flex flex-col justify-between rounded-2xl overflow-hidden">
        <CardContent className="p-5 space-y-3.5 overflow-y-auto max-h-[480px]">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-white/50 text-xs space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-950/50 border border-blue-900/40 flex items-center justify-center mx-auto text-amber-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="font-semibold text-white">No message history yet</p>
              <p className="text-white/40">Send a direct message below to connect with Byron.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg ${
                      isMine
                        ? "bg-amber-400 text-slate-950 font-semibold rounded-br-none shadow-[0_0_15px_rgba(245,181,68,0.2)]"
                        : "bg-[#030C22] text-white border border-blue-900/40 rounded-bl-none"
                    }`}
                  >
                    <p>{msg.content}</p>
                    {msg.createdAt && (
                      <p className={`text-[10px] mt-1.5 text-right font-mono ${isMine ? "text-slate-900/70 font-semibold" : "text-white/50"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>

        {/* Message Input Form */}
        <div className="p-3.5 border-t border-blue-900/40 bg-[#030C22]">
          <form onSubmit={handleSubmit} className="flex gap-2.5">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message to Byron Honea (Master IEP Coach)..."
              rows={2}
              className="bg-[#06172F] border-blue-900/40 text-white placeholder:text-white/40 text-xs resize-none rounded-xl focus:border-amber-400/60 focus-visible:ring-amber-400"
            />
            <Button
              type="submit"
              disabled={!content.trim()}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs h-auto px-4 py-3 rounded-xl self-end shrink-0 shadow-[0_0_12px_rgba(245,181,68,0.25)] transition-all"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
