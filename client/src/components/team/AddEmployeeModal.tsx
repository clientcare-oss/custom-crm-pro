import { useState } from "react";
import {
  User,
  Briefcase,
  Crown,
  Key,
  Calendar,
  DollarSign,
  Send,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Shield,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  EmployeeRecord,
  RoleId,
  ROLE_DEFINITIONS,
  PERMISSION_DEFINITIONS,
} from "./teamTypes";
import { toast } from "sonner";

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onAddEmployee: (emp: Omit<EmployeeRecord, "id"> & { id?: string }) => void;
}

export default function AddEmployeeModal({
  open,
  onClose,
  onAddEmployee,
}: AddEmployeeModalProps) {
  const [step, setStep] = useState(1);

  // Step 1: Person
  const [name, setName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Employment
  const [jobTitle, setJobTitle] = useState("");
  const [employmentType, setEmploymentType] = useState<"Full-Time" | "Part-Time" | "Contractor">("Full-Time");
  const [startDate, setStartDate] = useState(
    new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  );
  const [manager, setManager] = useState("Byron Honea");
  const [department, setDepartment] = useState("Advocacy Casework");

  // Step 3: Role
  const [primaryRole, setPrimaryRole] = useState<RoleId>("advocate");
  const [additionalRoles, setAdditionalRoles] = useState<RoleId[]>([]);

  // Step 4: Access
  const [grantFullModuleAccess, setGrantFullModuleAccess] = useState(true);

  // Step 5: Schedule
  const [scheduleSummary, setScheduleSummary] = useState("Mon–Fri 9:00 AM – 4:00 PM");

  // Step 6: Pay
  const [payType, setPayType] = useState<"Salary" | "Hourly" | "Contractor">("Salary");
  const [amount, setAmount] = useState("$75,000 / yr");
  const [frequency, setFrequency] = useState<"Bi-Weekly" | "Semi-Monthly" | "Monthly">("Semi-Monthly");

  // Step 7: Invite
  const [sendInviteEmail, setSendInviteEmail] = useState(true);

  const resetForm = () => {
    setStep(1);
    setName("");
    setPreferredName("");
    setEmail("");
    setPhone("");
    setJobTitle("");
    setEmploymentType("Full-Time");
    setPrimaryRole("advocate");
    setAdditionalRoles([]);
    setAmount("$75,000 / yr");
    setSendInviteEmail(true);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim() || !email.trim()) {
        toast.error("Name and work email are required");
        return;
      }
    }
    if (step === 2) {
      if (!jobTitle.trim()) {
        toast.error("Job title is required");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 7));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleComplete = () => {
    const avatarColors = [
      "bg-sky-600 text-white",
      "bg-emerald-600 text-white",
      "bg-purple-600 text-white",
      "bg-cyan-600 text-white",
      "bg-amber-600 text-slate-950",
    ];
    const chosenColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newEmp: Omit<EmployeeRecord, "id"> = {
      name: name.trim(),
      preferredName: preferredName.trim() || undefined,
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      avatarColor: chosenColor,
      jobTitle: jobTitle.trim(),
      primaryRole,
      additionalRoles,
      status: "active",
      employmentType,
      startDate,
      manager,
      department,
      workLocation: "Atlanta, GA (Metro & Hybrid)",
      emergencyContact: "On file in HR records",
      availabilityStatus: "Available",
      normalScheduleSummary: scheduleSummary,
      activeCaseloadCount: 0,
      weeklySchedule: [
        { day: "Monday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
        { day: "Tuesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
        { day: "Wednesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
        { day: "Thursday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
        { day: "Friday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
        { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
        { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      ],
      compensation: {
        payType,
        amount,
        frequency,
        effectiveDate: startDate,
        history: [],
      },
      directDeposit: {
        maskedAccount: "•••• Pending",
        accountType: "Checking",
        routingMasked: "•••• Pending",
        bankName: "Pending Verification",
        active: false,
        lastUpdated: startDate,
      },
      modulePermissions: {},
      permissionOverrides: {},
      documents: [],
      equipment: [],
      training: [],
      notes: [],
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Employee Onboarded",
          details: `Created new ${primaryRole} record for ${name} (${jobTitle}).`,
        },
      ],
    };

    onAddEmployee(newEmp);
    toast.success(`Employee ${name} added! Crew Quarters access generated.`);
    resetForm();
    onClose();
  };

  const STEPS = [
    { num: 1, label: "Person", icon: User },
    { num: 2, label: "Employment", icon: Briefcase },
    { num: 3, label: "Role", icon: Crown },
    { num: 4, label: "Access", icon: Key },
    { num: 5, label: "Schedule", icon: Calendar },
    { num: 6, label: "Pay", icon: DollarSign },
    { num: 7, label: "Invite", icon: Send },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl bg-[#000821] border border-blue-800 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-blue-900/60 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>Add New Team Member</span>
            </DialogTitle>
            <span className="text-xs font-mono font-bold text-amber-400">
              Step {step} of 7
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-between gap-1 pt-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isPast = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div key={s.num} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? "bg-emerald-500 text-slate-950 font-black"
                        : isCurrent
                        ? "bg-amber-400 text-slate-950 font-black ring-2 ring-amber-400/40"
                        : "bg-[#000d2b] border border-blue-900/60 text-slate-500"
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-[10px] hidden sm:block ${isCurrent ? "text-amber-300 font-bold" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Form Body Steps */}
        <div className="py-4 text-xs">
          {/* Step 1: Person */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-white">Full Legal Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rachel Adams"
                  className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white">Preferred Name (optional)</Label>
                <Input
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="e.g. Rachel"
                  className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white">Work Email Address *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rachel.adams@waypointadvocates.com"
                  className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white">Work / Mobile Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(404) 555-0155"
                  className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Step 2: Employment */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-white">Job Title *</Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Education Advocate, Intake Specialist"
                  className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white">Employment Type</Label>
                <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as any)}>
                  <SelectTrigger className="bg-[#000d2b] border-blue-900/60 text-xs text-white h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                    <SelectItem value="Full-Time">Full-Time Employee</SelectItem>
                    <SelectItem value="Part-Time">Part-Time Employee</SelectItem>
                    <SelectItem value="Contractor">Independent Contractor (1099)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-white">Start Date</Label>
                  <Input
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white">Manager / Supervisor</Label>
                  <Input
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Role */}
          {step === 3 && (
            <div className="space-y-3">
              <Label className="text-xs text-white font-bold">Select Primary Role</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {Object.values(ROLE_DEFINITIONS).map((r) => {
                  const isSelected = primaryRole === r.id;
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setPrimaryRole(r.id)}
                      className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400"
                          : "border-blue-900/50 bg-[#000d2b] hover:border-blue-800"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${r.badgeClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{r.label}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{r.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Access */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-blue-900/50 bg-[#000d2b] space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs">Role-Default Permissions</span>
                </div>
                <p className="text-[11px] text-blue-200/80 leading-relaxed">
                  Permissions will automatically inherit from the <strong>{ROLE_DEFINITIONS[primaryRole]?.label}</strong> role. You can customize granular overrides or individual module access at any time in their profile.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-900/40 bg-[#000a26] text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-white">Default Module Grants:</span>
                <p>
                  {ROLE_DEFINITIONS[primaryRole]?.defaultModules.includes("all")
                    ? "Full CRM access across all operational modules."
                    : `${ROLE_DEFINITIONS[primaryRole]?.defaultModules.length} assigned modules based on role responsibilities.`}
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Schedule */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-white">Standard Working Hours Summary</Label>
                <Input
                  value={scheduleSummary}
                  onChange={(e) => setScheduleSummary(e.target.value)}
                  placeholder="e.g. Mon–Fri 9:00 AM – 4:00 PM"
                  className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Detailed day-by-day availability slots can be fine-tuned in the Schedule tab or modified directly by the employee in Crew Quarters → My Availability.
              </p>
            </div>
          )}

          {/* Step 6: Pay */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-white">Pay Type</Label>
                  <Select value={payType} onValueChange={(v) => setPayType(v as any)}>
                    <SelectTrigger className="bg-[#000d2b] border-blue-900/60 text-xs text-white h-9 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                      <SelectItem value="Salary">Annual Salary</SelectItem>
                      <SelectItem value="Hourly">Hourly Rate</SelectItem>
                      <SelectItem value="Contractor">Contractor Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-white">Compensation Amount</Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="$75,000 / yr or $32.00 / hr"
                    className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white">Disbursement Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                  <SelectTrigger className="bg-[#000d2b] border-blue-900/60 text-xs text-white h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                    <SelectItem value="Semi-Monthly">Semi-Monthly (1st &amp; 15th)</SelectItem>
                    <SelectItem value="Bi-Weekly">Bi-Weekly (26 Paychecks)</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 7: Invite */}
          {step === 7 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Ready to Onboard {name}!</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  A new employee profile will be generated and connected to Crew Quarters, Calendar, and the employee directory.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-900/50 bg-[#000d2b] text-left text-xs space-y-1 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="font-bold text-white">{ROLE_DEFINITIONS[primaryRole]?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-mono text-blue-300">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pay:</span>
                  <span className="font-mono text-emerald-400">{amount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <DialogFooter className="border-t border-blue-900/60 pt-4 flex items-center justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="text-xs border-blue-800 text-blue-200 hover:text-white rounded-xl h-8 px-3 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back</span>
            </Button>
          ) : (
            <div />
          )}

          {step < 7 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-4 cursor-pointer"
            >
              <span>Continue</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleComplete}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl h-8 px-5 cursor-pointer shadow-lg"
            >
              <Check className="w-4 h-4 mr-1 stroke-[3]" />
              <span>Create Employee &amp; Generate Access</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
