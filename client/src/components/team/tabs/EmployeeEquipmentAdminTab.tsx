import { useState } from "react";
import {
  Laptop,
  Monitor,
  Headphones,
  Key,
  CreditCard,
  Tablet,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmployeeEquipmentItem, EmployeeRecord } from "../teamTypes";
import { toast } from "sonner";

interface EmployeeEquipmentAdminTabProps {
  employee: EmployeeRecord;
  onSave: (updated: EmployeeRecord) => void;
}

export default function EmployeeEquipmentAdminTab({
  employee,
  onSave,
}: EmployeeEquipmentAdminTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [item, setItem] = useState("");
  const [assetId, setAssetId] = useState("");
  const [category, setCategory] = useState<EmployeeEquipmentItem["category"]>("Laptop");
  const [notes, setNotes] = useState("");

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !assetId.trim()) {
      toast.error("Please fill in item name and asset ID");
      return;
    }

    const newItem: EmployeeEquipmentItem = {
      id: `eq-${Date.now()}`,
      item: item.trim(),
      assetId: assetId.trim(),
      category,
      assignedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "Assigned",
      notes: notes.trim() || undefined,
    };

    const updated: EmployeeRecord = {
      ...employee,
      equipment: [...(employee.equipment || []), newItem],
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Equipment Assigned",
          details: `Assigned ${newItem.category}: ${newItem.item} (Asset: ${newItem.assetId}).`,
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    setModalOpen(false);
    setItem("");
    setAssetId("");
    setNotes("");
    toast.success("Equipment item assigned to employee!");
  };

  const handleToggleStatus = (eqId: string, newStatus: "Assigned" | "Returned" | "Repair") => {
    const updatedItems = (employee.equipment || []).map((eq) =>
      eq.id === eqId
        ? {
            ...eq,
            status: newStatus,
            returnedDate:
              newStatus === "Returned"
                ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : undefined,
          }
        : eq
    );

    const updated: EmployeeRecord = {
      ...employee,
      equipment: updatedItems,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Equipment Status Changed",
          details: `Asset status changed to ${newStatus}.`,
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    toast.info(`Asset status updated to ${newStatus}`);
  };

  const getCategoryIcon = (cat: EmployeeEquipmentItem["category"]) => {
    switch (cat) {
      case "Laptop":
        return Laptop;
      case "Display":
        return Monitor;
      case "Headset":
        return Headphones;
      case "Security Key":
        return Key;
      case "Credit Card":
        return CreditCard;
      default:
        return Tablet;
    }
  };

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">
              Assigned Company Equipment &amp; Hardware Assets
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Track laptops, headsets, hardware security keys, and corporate credit cards. Vital for offboarding asset recovery.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-4 gap-1.5 shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Assign Equipment</span>
        </Button>
      </div>

      {/* Equipment List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(employee.equipment || []).map((eq) => {
          const Icon = getCategoryIcon(eq.category);
          return (
            <div
              key={eq.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                eq.status === "Returned"
                  ? "bg-[#000514]/60 border-blue-950 opacity-60"
                  : eq.status === "Repair"
                  ? "bg-amber-950/20 border-amber-500/40"
                  : "bg-[#000d2b] border-blue-900/50 hover:border-blue-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{eq.item}</h4>
                    <span className="font-mono text-[11px] text-amber-300 font-semibold">
                      {eq.assetId}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    eq.status === "Assigned"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : eq.status === "Repair"
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {eq.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-blue-900/40">
                <span>Assigned {eq.assignedDate}</span>
                {eq.returnedDate && <span>Returned {eq.returnedDate}</span>}
              </div>

              {eq.notes && <p className="text-[11px] text-blue-200/70 italic">"{eq.notes}"</p>}

              <div className="flex items-center justify-end gap-1.5 pt-1">
                {eq.status === "Assigned" && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(eq.id, "Repair")}
                      className="h-6 px-2 text-[10px] text-amber-400 hover:bg-amber-400/10 rounded cursor-pointer"
                    >
                      Flag for Repair
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(eq.id, "Returned")}
                      className="h-6 px-2 text-[10px] text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 rounded cursor-pointer"
                    >
                      Mark Returned
                    </Button>
                  </>
                )}
                {eq.status !== "Assigned" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleStatus(eq.id, "Assigned")}
                    className="h-6 px-2 text-[10px] text-sky-400 hover:bg-sky-500/10 rounded cursor-pointer"
                  >
                    Re-assign
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {(!employee.equipment || employee.equipment.length === 0) && (
          <div className="col-span-full p-8 rounded-2xl border border-blue-900/30 bg-[#000820] text-center space-y-1">
            <Laptop className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-white">No company assets assigned</p>
            <p className="text-xs text-slate-400">
              Click "Assign Equipment" above to register laptops, displays, or 2FA keys.
            </p>
          </div>
        )}
      </div>

      {/* Add Equipment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#000821] border border-blue-800 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="w-5 h-5 text-amber-400" />
              <span>Assign Company Hardware Asset</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddEquipment} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-white">Item Description / Model</Label>
              <Input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder='e.g. Apple MacBook Pro 14" M3, Jabra Evolve2'
                className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Asset Tag / Serial ID</Label>
              <Input
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="WP-MBP-022"
                className="bg-[#000d2b] border-blue-900/60 text-white font-mono text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger className="bg-[#000d2b] border-blue-900/60 text-xs text-white h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                  <SelectItem value="Laptop">Laptop / Workstation</SelectItem>
                  <SelectItem value="Display">Display Monitor</SelectItem>
                  <SelectItem value="Headset">Noise-Cancelling Headset</SelectItem>
                  <SelectItem value="Security Key">YubiKey / Hardware 2FA</SelectItem>
                  <SelectItem value="Tablet">Tablet / iPad</SelectItem>
                  <SelectItem value="Credit Card">Corporate Credit Card</SelectItem>
                  <SelectItem value="Other">Other Asset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Asset Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condition, accessories included, etc."
                className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl"
              >
                Assign Asset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
