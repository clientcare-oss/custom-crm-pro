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
    <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
      <div className="space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
          <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span>Crew Messages</span>
            {unreadTotal > 0 && (
              <Badge className="bg-[#0070F3] text-white border-none text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-blue-500/40">
                {unreadTotal} new
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenCrewMessages()}
            className="text-xs text-blue-300 hover:text-sky-300 hover:bg-blue-900/40 p-0 h-auto font-medium cursor-pointer"
          >
            Open App →
          </Button>
        </div>

        {/* Action Button */}
        <div className="pt-1 pb-1">
          <Button
            onClick={() => onOpenCrewMessages()}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl py-2.5 shadow-[0_0_15px_rgba(56,189,248,0.2)] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Crew Messages</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Recent Discussions */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-blue-300/80 uppercase tracking-wider">
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
                    className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs hover:border-sky-400/50 hover:bg-blue-900/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="w-7 h-7 shrink-0 border border-sky-500/30 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                        <AvatarFallback className="text-[10px] font-bold bg-transparent">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                            {name}
                          </span>
                          {c.type === "channel" && (
                            <span className="text-[9px] text-sky-400 font-mono px-1 rounded bg-sky-500/10">#channel</span>
                          )}
                          {c.type === "case" && (
                            <span className="text-[9px] text-purple-400 font-mono px-1 rounded bg-purple-500/10">case</span>
                          )}
                        </div>
                        <p className="text-[10px] text-blue-300/70 truncate">
                          {c.lastMessage?.body || "No recent messages"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-blue-300/50 font-medium">{timeStr}</span>
                      {c.unreadCount > 0 && (
                        <span className="w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-[#0070F3] text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-300/70 text-center">
                No recent messages yet. Launch Crew Messages to start a chat.
              </div>
            )}
          </div>
        </div>

        {/* Latest Action Request */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-blue-300/80 uppercase tracking-wider">
            Latest Action Request
          </div>

          {latestAr ? (
            <div
              onClick={() => onOpenCrewMessages(latestAr.conversationId)}
              className="p-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/30 border border-blue-800/40 hover:border-sky-400/50 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <Badge className="bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[10px] py-0 px-2 font-semibold">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {latestAr.requestType}
                </Badge>
                <span className="text-[10px] text-amber-300 font-semibold">Pending Review</span>
              </div>

              <h5 className="text-xs font-bold text-white leading-snug truncate">
                {latestAr.title}
              </h5>

              <div className="text-[10px] text-blue-300/70 flex items-center justify-between pt-1 border-t border-blue-900/30">
                <span>By {latestAr.requestedByName || "Advocate"}</span>
                <span className="text-sky-400 font-semibold">Review →</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-white">All Clear</div>
                <div className="text-[10px] text-blue-300/70">No pending action requests assigned to you</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-2 border-t border-blue-900/30 flex items-center justify-between text-[11px] text-blue-300/70">
        <span>Internal Collaboration</span>
        <span className="text-sky-400 font-mono">Real-time Channels</span>
      </div>
    </Card>
  );
}
