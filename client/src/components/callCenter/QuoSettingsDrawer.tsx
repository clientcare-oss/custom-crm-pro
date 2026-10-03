import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, ShieldCheck, ShieldAlert, Eye, EyeOff, Copy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface QuoSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  isConfigured: boolean;
}

export function QuoSettingsDrawer({ open, onClose, isConfigured }: QuoSettingsDrawerProps) {
  const utils = trpc.useUtils();
  const [secretInput, setSecretInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/quo/webhook`;

  const saveSecretMutation = trpc.system.setQuoSecret.useMutation({
    onSuccess: () => {
      toast.success("Quo signing secret saved successfully");
      setSecretInput("");
      utils.system.getQuoStatus.invalidate();
    },
    onError: (e) => toast.error("Failed to save: " + e.message),
  });

  if (!open) return null;

  return (
    <Card className="p-5 rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 space-y-4 animate-in fade-in shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#C5A059]">
            <Settings2 className="h-4.5 w-4.5" />
          </div>
          <h2 className="font-serif text-base font-bold text-[#FFF4D4]">Quo Integration Configuration</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-lg text-xs"
        >
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] space-y-2">
          <div className="text-[#C6B697] font-medium">Webhook Endpoint URL</div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-[#FFE394] bg-[#07162B] border border-[#3A2C18] px-2 py-1 rounded flex-1 truncate text-[11px]">
              {webhookUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                toast.success("Webhook URL copied");
              }}
              className="h-7 text-xs border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
            >
              <Copy className="h-3 w-3 mr-1 text-[#C5A059]" /> Copy
            </Button>
          </div>
          <p className="text-[11px] text-[#A69371]">
            Configure this URL inside your Quo / OpenPhone Dashboard under Integrations → Webhooks.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] space-y-2">
          <div className="text-[#C6B697] font-medium">Webhook Signing Secret</div>
          <div className="flex items-center gap-2">
            <Input
              type={showSecret ? "text" : "password"}
              placeholder="Paste Quo signing secret..."
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              className="h-7 text-xs bg-[#07162B] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#8C7A58] focus:border-[#C5A059]"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSecret(!showSecret)}
              className="h-7 w-7 p-0 text-[#A69371] hover:text-[#FFF4D4]"
            >
              {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm"
              disabled={!secretInput.trim() || saveSecretMutation.isPending}
              onClick={() => saveSecretMutation.mutate({ secret: secretInput.trim() })}
              className="h-7 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/40"
            >
              Save
            </Button>
          </div>
          <p className="text-[11px] text-[#A69371]">
            {isConfigured ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Secret configured and active
              </span>
            ) : (
              <span className="text-[#FFE394] flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-[#C5A059]" /> Secret not configured yet
              </span>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default QuoSettingsDrawer;
