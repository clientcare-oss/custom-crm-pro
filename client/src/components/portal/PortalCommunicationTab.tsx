import React, { useState } from "react";
import { MessageSquare, Send, Bot, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            Communication & Messages
          </h2>
          <p className="text-xs text-slate-400 mt-1">Direct encrypted messaging with your Waypoint advocate</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5" /> FERPA Compliant
        </div>
      </div>

      {/* Message Thread */}
      <Card className="border-white/10 bg-[#161B22]/90 text-slate-100 shadow-xl min-h-[350px] flex flex-col justify-between">
        <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[450px]">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No message history yet. Send a message below to reach your advocate.
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isMine
                        ? "bg-amber-400 text-slate-950 font-medium rounded-br-none shadow-md"
                        : "bg-[#21262D] text-slate-100 border border-white/10 rounded-bl-none shadow-md"
                    }`}
                  >
                    <p>{msg.content}</p>
                    {msg.createdAt && (
                      <p className={`text-[10px] mt-1.5 text-right ${isMine ? "text-slate-900/70" : "text-slate-400"}`}>
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
        <div className="p-3 border-t border-white/10 bg-[#161B22] rounded-b-xl">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message to Byron Honea (Master IEP Coach)..."
              rows={2}
              className="bg-[#0D1117] border-white/15 text-white text-xs resize-none"
            />
            <Button
              type="submit"
              disabled={!content.trim()}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs h-auto px-4 self-end shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
