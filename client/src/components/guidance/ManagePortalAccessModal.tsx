import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  KeyRound,
  Eye,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

interface ManagePortalAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  parentContact?: any;
}

const LIFECYCLE_STAGES = [
  "Discovery",
  "Sign-Up",
  "Onboarding",
  "Active",
  "Renewal",
  "Service Paused",
  "Payment Attention",
  "Offboarding",
];

export function ManagePortalAccessModal({
  open,
  onOpenChange,
  contact,
  parentContact,
}: ManagePortalAccessModalProps) {
  const [stage, setStage] = useState<string>(contact?.lifecycleStage || "Active");
  const [vaultAccess, setVaultAccess] = useState<boolean>(true);
  const [tasksAccess, setTasksAccess] = useState<boolean>(true);
  const [parkingLotAccess, setParkingLotAccess] = useState<boolean>(true);
  const [iepZoneAccess, setIepZoneAccess] = useState<boolean>(true);
  const [billingAccess, setBillingAccess] = useState<boolean>(true);

  const utils = trpc.useUtils();

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Client portal access settings updated successfully.");
      utils.contacts.detail.invalidate({ id: contact.id });
      utils.contacts.list.invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update portal access.");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: contact.id,
      lifecycleStage: stage,
    });
  };

  const clientName = parentContact
    ? `${parentContact.firstName || ""} ${parentContact.lastName || ""}`.trim()
    : `${contact?.parentName || contact?.firstName || "Client"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#07162B] border border-blue-900/60 text-white shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5 border-b border-blue-900/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5B544]/15 border border-[#F5B544]/30 flex items-center justify-center text-[#F5B544]">
              <Settings className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-white tracking-wide">
              Manage Portal Access
            </DialogTitle>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold ml-auto">
              PG-027
            </span>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Configure portal lifecycle stage, unlocked modules, and visibility settings for {clientName}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* Lifecycle Stage Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-300">
              Active Portal Lifecycle Stage
            </Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="w-full bg-[#030A17] border-blue-900/60 text-white text-xs h-10">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent className="bg-[#07162B] border-blue-900/60 text-white">
                {LIFECYCLE_STAGES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-400">
              Controls what onboarding experiences and progress bars the client sees when logging in.
            </p>
          </div>

          {/* Unlocked Modules & Visibility */}
          <div className="space-y-3 pt-2 border-t border-blue-900/40">
            <Label className="text-xs font-semibold text-slate-300 block">
              Unlocked Modules & Features
            </Label>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030A17] border border-blue-950">
                <div>
                  <p className="text-xs font-semibold text-white">Document Vault & IEP Zone</p>
                  <p className="text-[10px] text-slate-400">Allows client to upload and view IEP evaluations</p>
                </div>
                <Switch checked={vaultAccess} onCheckedChange={setVaultAccess} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030A17] border border-blue-950">
                <div>
                  <p className="text-xs font-semibold text-white">Action Center & Assigned Tasks</p>
                  <p className="text-[10px] text-slate-400">Parent checklist items and smart files</p>
                </div>
                <Switch checked={tasksAccess} onCheckedChange={setTasksAccess} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030A17] border border-blue-950">
                <div>
                  <p className="text-xs font-semibold text-white">Marina Parking Lot View</p>
                  <p className="text-[10px] text-slate-400">Visual parking spot milestone tracker</p>
                </div>
                <Switch checked={parkingLotAccess} onCheckedChange={setParkingLotAccess} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030A17] border border-blue-950">
                <div>
                  <p className="text-xs font-semibold text-white">Billing & Plan Invoices</p>
                  <p className="text-[10px] text-slate-400">Payment receipts and plan management</p>
                </div>
                <Switch checked={billingAccess} onCheckedChange={setBillingAccess} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-blue-900/40 pt-3 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07162B] font-bold text-xs h-9 px-5 shadow-md cursor-pointer"
          >
            Save Access Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
