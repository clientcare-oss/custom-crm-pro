import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AddNewContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contact: any) => void;
}

export function AddNewContactModal({
  open,
  onOpenChange,
  onSuccess,
}: AddNewContactModalProps) {
  const utils = trpc.useUtils();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("GA");
  const [status, setStatus] = useState<"Client" | "Lead" | "Prospect">("Lead");

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: (newContact) => {
      toast.success("Contact created successfully");
      utils.contacts.list.invalidate();
      if (onSuccess) onSuccess(newContact);
      onOpenChange(false);
      // Reset
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setCity("");
    },
    onError: (err) => {
      toast.error(`Failed to create contact: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    createMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || "GA",
      jobTitle: status === "Client" ? "Client" : status === "Lead" ? "Lead" : "Prospect",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#061830] border border-sky-500/30 text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Add New Contact
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Quick entry for inbound callers and new inquiries
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">First Name *</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Jennifer"
                className="bg-[#040D1A] border-slate-700 text-white focus:border-amber-400"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Smith"
                className="bg-[#040D1A] border-slate-700 text-white focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(770) 555-0199"
                className="bg-[#040D1A] border-slate-700 text-white focus:border-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                className="bg-[#040D1A] border-slate-700 text-white focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-slate-300">City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Marietta"
                className="bg-[#040D1A] border-slate-700 text-white focus:border-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">State</Label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="GA"
                maxLength={2}
                className="bg-[#040D1A] border-slate-700 text-white focus:border-amber-400 uppercase"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Status Classification</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="bg-[#040D1A] border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#061830] border-slate-700 text-slate-100">
                <SelectItem value="Lead">Lead (Inquiry / Discovery)</SelectItem>
                <SelectItem value="Prospect">Prospect (Warm Follow-Up)</SelectItem>
                <SelectItem value="Client">Client (Retained / Active)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold gap-1.5"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddNewContactModal;
