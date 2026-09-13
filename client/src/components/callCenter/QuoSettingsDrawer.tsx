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
    <Card className="p-5 rounded-2xl border border-sky-500/30 bg-[#061830] space-y-4 animate-in fade-in shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Quo Integration Configuration</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-slate-400 hover:text-white"
        >
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-[#040D1A] border border-slate-800 space-y-2">
          <div className="text-slate-400 font-medium">Webhook Endpoint URL</div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-sky-300 bg-sky-950/40 px-2 py-1 rounded flex-1 truncate">
              {webhookUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                toast.success("Webhook URL copied");
              }}
              className="h-7 text-xs border-sky-500/30 text-sky-300"
            >
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            Configure this URL inside your Quo / OpenPhone Dashboard under Integrations → Webhooks.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#040D1A] border border-slate-800 space-y-2">
          <div className="text-slate-400 font-medium">Webhook Signing Secret</div>
          <div className="flex items-center gap-2">
            <Input
              type={showSecret ? "text" : "password"}
              placeholder="Paste Quo signing secret..."
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              className="h-7 text-xs bg-[#061830] border-slate-700 text-white"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSecret(!showSecret)}
              className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            >
              {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm"
              disabled={!secretInput.trim() || saveSecretMutation.isPending}
              onClick={() => saveSecretMutation.mutate({ secret: secretInput.trim() })}
              className="h-7 text-xs bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold"
            >
              Save
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            {isConfigured ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Secret configured and active
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Secret not configured yet
              </span>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
