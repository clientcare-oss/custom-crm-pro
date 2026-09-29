import { useState } from "react";
import {
  CreditCard,
  DollarSign,
  Calendar,
  Lock,
  History,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  Plus,
  Save,
  Eye,
  EyeOff,
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
import { EmployeeRecord } from "../teamTypes";
import { toast } from "sonner";

interface EmployeePayrollAdminTabProps {
  employee: EmployeeRecord;
  onSave: (updated: EmployeeRecord) => void;
}

export default function EmployeePayrollAdminTab({
  employee,
  onSave,
}: EmployeePayrollAdminTabProps) {
  const [isEditingCompensation, setIsEditingCompensation] = useState(false);
  const [directDepositModalOpen, setDirectDepositModalOpen] = useState(false);
  const [viewSensitiveUnlocked, setViewSensitiveUnlocked] = useState(false);

  // Compensation Form State
  const [payType, setPayType] = useState(employee.compensation.payType);
  const [amount, setAmount] = useState(employee.compensation.amount);
  const [frequency, setFrequency] = useState(employee.compensation.frequency);
  const [effectiveDate, setEffectiveDate] = useState(employee.compensation.effectiveDate);
  const [changeNote, setChangeNote] = useState("");

  // Direct Deposit Form State
  const [ddBankName, setDdBankName] = useState(employee.directDeposit.bankName);
  const [ddAccountType, setDdAccountType] = useState(employee.directDeposit.accountType);
  const [ddLast4, setDdLast4] = useState(employee.directDeposit.maskedAccount.replace(/[^0-9]/g, "") || "4821");

  const handleSaveCompensation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) {
      toast.error("Please specify a valid compensation amount");
      return;
    }

    // Preserve existing compensation in history!
    const newHistoryEntry = {
      amount: employee.compensation.amount,
      effectiveDate: employee.compensation.effectiveDate,
      payType: employee.compensation.payType,
      note: changeNote.trim() || `Adjusted to ${amount} on ${effectiveDate}`,
    };

    const updated: EmployeeRecord = {
      ...employee,
      compensation: {
        payType,
        amount,
        frequency,
        effectiveDate,
        notes: changeNote.trim() || employee.compensation.notes,
        history: [newHistoryEntry, ...employee.compensation.history],
      },
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Compensation Changed",
          details: `Pay adjusted from ${employee.compensation.amount} to ${amount} effective ${effectiveDate}.`,
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    setIsEditingCompensation(false);
    setChangeNote("");
    toast.success("Compensation updated and historical record preserved!");
  };

  const handleUpdateDirectDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: EmployeeRecord = {
      ...employee,
      directDeposit: {
        ...employee.directDeposit,
        bankName: ddBankName,
        accountType: ddAccountType,
        maskedAccount: `•••• ${ddLast4.slice(-4)}`,
        lastUpdated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      },
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Direct Deposit Updated",
          details: `Direct deposit banking account information updated for ${employee.name}. Account ending in •••• ${ddLast4.slice(-4)}.`,
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    setDirectDepositModalOpen(false);
    toast.success("Direct deposit settings updated successfully!");
  };

  const handleToggleDirectDepositStatus = () => {
    const nextActive = !employee.directDeposit.active;
    const updated: EmployeeRecord = {
      ...employee,
      directDeposit: {
        ...employee.directDeposit,
        active: nextActive,
      },
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: nextActive ? "Direct Deposit Enabled" : "Direct Deposit Disabled",
          details: `Direct deposit status toggled to ${nextActive ? "Active" : "Disabled"}.`,
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    toast.success(`Direct deposit ${nextActive ? "activated" : "disabled"}`);
  };

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">
              Payroll, Compensation &amp; Direct Deposit
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Administrative compensation history, payroll schedules, and secure tokenized banking credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewSensitiveUnlocked(!viewSensitiveUnlocked)}
            className="border-blue-800 text-blue-200 hover:text-white hover:bg-blue-900/40 text-xs rounded-xl h-8 cursor-pointer"
          >
            {viewSensitiveUnlocked ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
            <span>{viewSensitiveUnlocked ? "Lock Sensitive View" : "Unlock Admin View"}</span>
          </Button>
        </div>
      </div>

      {/* ── Section 1: Current Compensation ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Current Compensation Structure</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Current active rate and disbursement frequency.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsEditingCompensation(!isEditingCompensation)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-3 cursor-pointer"
          >
            {isEditingCompensation ? "Cancel" : "Adjust Compensation"}
          </Button>
        </div>

        {!isEditingCompensation ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl border border-blue-900/40 bg-[#000d2b]/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Pay Type</span>
              <p className="text-base font-bold text-white mt-1">{employee.compensation.payType}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-900/40 bg-emerald-950/20">
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Compensation</span>
              <p className="text-base font-black text-emerald-300 font-mono mt-1">
                {employee.compensation.amount}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-blue-900/40 bg-[#000d2b]/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Pay Frequency</span>
              <p className="text-base font-bold text-white mt-1">{employee.compensation.frequency}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-blue-900/40 bg-[#000d2b]/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Effective Date</span>
              <p className="text-base font-bold text-white mt-1">{employee.compensation.effectiveDate}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveCompensation} className="p-4 rounded-xl border border-amber-400/40 bg-amber-950/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-white">Pay Type</Label>
                <Select value={payType} onValueChange={(v) => setPayType(v as any)}>
                  <SelectTrigger className="bg-[#000820] border-blue-900/60 text-xs text-white h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                    <SelectItem value="Salary">Salary</SelectItem>
                    <SelectItem value="Hourly">Hourly Rate</SelectItem>
                    <SelectItem value="Contractor">Contractor Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white">Amount / Rate (e.g. $84,000 / yr or $35.00 / hr)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="$85,000 / yr"
                  className="bg-[#000820] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white">Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                  <SelectTrigger className="bg-[#000820] border-blue-900/60 text-xs text-white h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                    <SelectItem value="Bi-Weekly">Bi-Weekly (26 periods)</SelectItem>
                    <SelectItem value="Semi-Monthly">Semi-Monthly (1st & 15th)</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-white">Effective Date</Label>
                <Input
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  placeholder="Oct 01, 2026"
                  className="bg-[#000820] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white">Reason / Audit Note</Label>
                <Input
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Annual merit adjustment, promotion, etc."
                  className="bg-[#000820] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditingCompensation(false)}
                className="text-xs text-slate-400 hover:text-white rounded-xl h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-4"
              >
                Save Compensation Update
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ── Section 2: Compensation History (Never Overwritten!) ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-1.5 pb-2 border-b border-blue-900/40">
          <History className="w-4 h-4 text-sky-400" />
          <h4 className="font-bold text-white">Preserved Compensation History</h4>
        </div>

        <div className="overflow-x-auto rounded-xl border border-blue-900/40">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-blue-900/50 bg-[#001035] text-slate-400 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Effective Date</th>
                <th className="py-2.5 px-3">Compensation</th>
                <th className="py-2.5 px-3">Pay Type</th>
                <th className="py-2.5 px-3">Administrative Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/30">
              <tr className="bg-emerald-950/20 text-emerald-300 font-semibold">
                <td className="py-2 px-3 font-mono">{employee.compensation.effectiveDate} (Current)</td>
                <td className="py-2 px-3 font-mono font-bold">{employee.compensation.amount}</td>
                <td className="py-2 px-3">{employee.compensation.payType}</td>
                <td className="py-2 px-3 text-slate-300">{employee.compensation.notes || "Current active compensation"}</td>
              </tr>
              {employee.compensation.history.map((h, i) => (
                <tr key={i} className="hover:bg-blue-950/30 text-slate-300">
                  <td className="py-2 px-3 font-mono">{h.effectiveDate}</td>
                  <td className="py-2 px-3 font-mono font-bold text-white">{h.amount}</td>
                  <td className="py-2 px-3">{h.payType}</td>
                  <td className="py-2 px-3 text-slate-400">{h.note || "Historical record"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Direct Deposit & Banking (Masked & Protected) ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Building className="w-4 h-4 text-purple-400" />
              <span>Direct Deposit / Banking Information</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Protected banking details. Raw account numbers are masked to safeguard employee privacy.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleDirectDepositStatus}
              className={`h-8 px-3 text-xs rounded-xl border ${
                employee.directDeposit.active
                  ? "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                  : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
              }`}
            >
              {employee.directDeposit.active ? "Disable Deposit" : "Activate Deposit"}
            </Button>
            <Button
              size="sm"
              onClick={() => setDirectDepositModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-3 cursor-pointer"
            >
              Update Direct Deposit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-blue-900/40 bg-[#000d2b]/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Bank Name</span>
            <p className="font-bold text-white mt-1">{employee.directDeposit.bankName}</p>
          </div>
          <div className="p-3 rounded-xl border border-blue-900/40 bg-[#000d2b]/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Account Number</span>
            <p className="font-bold text-white font-mono mt-1">
              {viewSensitiveUnlocked ? `WP-SEC-${employee.directDeposit.maskedAccount}` : employee.directDeposit.maskedAccount}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-blue-900/40 bg-[#000d2b]/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Routing Number</span>
            <p className="font-bold text-white font-mono mt-1">
              {employee.directDeposit.routingMasked}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-blue-900/40 bg-[#000d2b]/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Status &amp; Verification</span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${employee.directDeposit.active ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className="font-bold text-white">
                {employee.directDeposit.active ? "Direct Deposit Active" : "Deposit Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Deposit Modal */}
      <Dialog open={directDepositModalOpen} onOpenChange={setDirectDepositModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#000821] border border-blue-800 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-400" />
              <span>Update Direct Deposit Banking</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateDirectDeposit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-white">Financial Institution / Bank Name</Label>
              <Input
                value={ddBankName}
                onChange={(e) => setDdBankName(e.target.value)}
                placeholder="e.g. Chase Bank, Fidelity, Wells Fargo"
                className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Account Type</Label>
              <Select value={ddAccountType} onValueChange={(v) => setDdAccountType(v as any)}>
                <SelectTrigger className="bg-[#000d2b] border-blue-900/60 text-xs text-white h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                  <SelectItem value="Checking">Checking Account</SelectItem>
                  <SelectItem value="Savings">Savings Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Account Last 4 Digits (Tokenized)</Label>
              <Input
                value={ddLast4}
                maxLength={4}
                onChange={(e) => setDdLast4(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="4821"
                className="bg-[#000d2b] border-blue-900/60 text-white font-mono text-xs h-9 rounded-xl"
                required
              />
              <p className="text-[10px] text-slate-400">
                Full account numbers are securely verified via payroll provider tokenization.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDirectDepositModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl"
              >
                Save &amp; Log Banking Event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
