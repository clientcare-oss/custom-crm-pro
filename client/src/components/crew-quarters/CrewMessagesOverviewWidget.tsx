import React from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface CrewMessagesOverviewWidgetProps {
  onOpenCrewMessages: (conversationId?: number) => void;
}

export default function CrewMessagesOverviewWidget({
  onOpenCrewMessages,
}: CrewMessagesOverviewWidgetProps) {
  const { data: stats } = trpc.crewMessages.getOverviewStats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const unreadTotal = stats?.unreadTotal || 0;
  const recentConversations = stats?.recentConversations || [];
  const latestAr = stats?.latestActionRequest;

  return (
    <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between h-full space-y-4">
      <div className="space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
          <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-sm sm:text-base">
            <MessageSquare className="w-4 h-4 text-[#C5A059]" />
            <span>Crew Messages</span>
            {unreadTotal > 0 && (
              <Badge className="bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] border border-[#FFE394]/50 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                {unreadTotal} new
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenCrewMessages()}
            className="text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] p-0 h-auto font-medium cursor-pointer"
          >
            Open App →
          </Button>
        </div>

        {/* Action Button */}
        <div className="pt-1 pb-1">
          <Button
            onClick={() => onOpenCrewMessages()}
            className="w-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs rounded-xl py-2.5 border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Crew Messages</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Recent Discussions */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-[#A69371] uppercase tracking-wider font-mono">
            Recent Discussions
          </div>

          <div className="space-y-1.5">
            {recentConversations.length > 0 ? (
              recentConversations.slice(0, 2).map((c: any) => {
                const name = c.displayName || c.name || "Conversation";
                const initials = name
                  .split(" ")
                  .map((p: string) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const timeStr = c.lastMessage?.createdAt
                  ? new Date(c.lastMessage.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Recently";

                return (
                  <div
                    key={c.id}
                    onClick={() => onOpenCrewMessages(c.id)}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] text-xs hover:border-[#C5A059]/60 hover:bg-[#07162B] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="w-7 h-7 shrink-0 border border-[#3A2C18] bg-[#07162B] text-[#FFE394]">
                        <AvatarFallback className="text-[10px] font-bold font-serif bg-transparent text-[#FFE394]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors truncate">
                            {name}
                          </span>
                          {c.type === "channel" && (
                            <span className="text-[9px] text-[#C5A059] font-mono px-1 rounded bg-[#020A17] border border-[#3A2C18]">#channel</span>
                          )}
                          {c.type === "case" && (
                            <span className="text-[9px] text-[#FFE394] font-mono px-1 rounded bg-[#020A17] border border-[#3A2C18]">case</span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#C6B697] truncate">
                          {c.lastMessage?.body || "No recent messages"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-[#A69371] font-medium">{timeStr}</span>
                      {c.unreadCount > 0 && (
                        <span className="w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B]">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-2.5 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] text-xs text-[#C6B697] text-center">
                No recent messages yet. Launch Crew Messages to start a chat.
              </div>
            )}
          </div>
        </div>

        {/* Latest Action Request */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-[#A69371] uppercase tracking-wider font-mono">
            Latest Action Request
          </div>

          {latestAr ? (
            <div
              onClick={() => onOpenCrewMessages(latestAr.conversationId)}
              className="p-2.5 rounded-xl bg-[#020A17]/85 hover:bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <Badge className="bg-[#C5A059]/15 text-[#FFE394] border border-[#C5A059]/30 text-[10px] py-0 px-2 font-semibold">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {latestAr.requestType}
                </Badge>
                <span className="text-[10px] text-[#FFE394] font-semibold">Pending Review</span>
              </div>

              <h5 className="text-xs font-serif font-bold text-[#FFF4D4] leading-snug truncate">
                {latestAr.title}
              </h5>

              <div className="text-[10px] text-[#C6B697] flex items-center justify-between pt-1 border-t border-[#3A2C18]/60">
                <span>By {latestAr.requestedByName || "Advocate"}</span>
                <span className="text-[#C5A059] font-semibold">Review →</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] text-xs flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-serif font-semibold text-[#FFF4D4]">All Clear</div>
                <div className="text-[10px] text-[#C6B697]">No pending action requests assigned to you</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-2 border-t border-[#3A2C18]/60 flex items-center justify-between text-[11px] text-[#C6B697]">
        <span>Internal Collaboration</span>
        <span className="text-[#FFE394] font-mono">Real-time Channels</span>
      </div>
    </Card>
  );
}
