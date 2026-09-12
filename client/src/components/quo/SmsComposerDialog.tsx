import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Phone, Clock, ArrowDownLeft, ArrowUpRight, Shield } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface SmsComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contactName: string;
  clientPhone: string;
}

export default function SmsComposerDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  clientPhone,
}: SmsComposerDialogProps) {
  const [message, setMessage] = useState("");

  const { data: settings } = trpc.quo.getSettings.useQuery(undefined, { enabled: open });
  const { data: messages, refetch: refetchMessages, isLoading: messagesLoading } =
    trpc.quo.listSms.useQuery({ contactId }, { enabled: open });

  const sendSmsMutation = trpc.quo.sendSms.useMutation({
    onSuccess: (res) => {
      toast.success("SMS sent via Quo integration");
      setMessage("");
      refetchMessages();
    },
    onError: (err) => {
      toast.error(`Failed to send SMS: ${err.message}`);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Message body cannot be empty");
      return;
    }
    sendSmsMutation.mutate({
      contactId,
      body: message.trim(),
    });
  };

  const businessNumber = settings?.primaryPhoneNumber || "+1 (770) 555-0199";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#06172F] border-border/80 text-foreground p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-background/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/50 text-cyan-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Text Message Composer
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Send business SMS via Waypoint Quo phone line.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-cyan-950/40 text-cyan-300 border-cyan-800">
              Quo SMS
            </Badge>
          </div>
        </DialogHeader>

        {/* Client & Business Numbers Header */}
        <div className="px-5 py-3 bg-background/50 border-b border-border/40 grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">Recipient</div>
            <div className="font-medium text-foreground truncate">{contactName}</div>
            <div className="font-mono text-cyan-400 text-[11px]">{clientPhone || "No phone"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">Sending From</div>
            <div className="font-medium text-foreground truncate">{settings?.primaryPhoneDisplayName || "Waypoint Advocates"}</div>
            <div className="font-mono text-muted-foreground text-[11px]">{businessNumber}</div>
          </div>
        </div>

        {/* Recent Message Thread / History Preview */}
        <div className="px-5 py-3 max-h-48 overflow-y-auto space-y-2 border-b border-border/40 bg-[#000821]/40">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Recent Messages</span>
            <span className="text-[9px] font-normal">{messages?.length || 0} logged</span>
          </div>

          {messagesLoading ? (
            <div className="text-center py-4 text-xs text-muted-foreground">Loading message history...</div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-2">
              {messages.slice(0, 5).map((m) => {
                const isOutbound = m.direction === "outbound";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                        isOutbound
                          ? "bg-cyan-950/70 border border-cyan-800 text-cyan-100 rounded-br-none"
                          : "bg-background/80 border border-border/70 text-foreground rounded-bl-none"
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-0.5">
                        {isOutbound ? (
                          <>
                            <ArrowUpRight className="h-2.5 w-2.5 text-cyan-400" />
                            <span>Outbound</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="h-2.5 w-2.5 text-emerald-400" />
                            <span>Inbound</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.smsBody}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-3 text-xs text-muted-foreground italic">
              No prior SMS records found for this client.
            </div>
          )}
        </div>

        {/* Composer Form */}
        <form onSubmit={handleSend} className="p-5 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="sms-body" className="text-xs font-medium text-foreground">
                Message Body
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {message.length} characters ({Math.ceil(message.length / 160) || 1} SMS segment)
              </span>
            </div>
            <Textarea
              id="sms-body"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${contactName.split(" ")[0]}, Byron from Waypoint Advocates here...`}
              rows={3}
              className="text-xs bg-background/80 border-border/80 focus:border-cyan-500 resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Shield className="h-3 w-3 text-cyan-400" />
              <span>Logs automatically to client profile</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={sendSmsMutation.isPending || !message.trim()}
                className="gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sendSmsMutation.isPending ? "Sending..." : "Send SMS"}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
