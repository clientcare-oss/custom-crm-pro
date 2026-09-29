import { useState } from "react";
import {
  Briefcase,
  Building,
  Calendar,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  Save,
  CheckCircle2,
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
import { EmployeeRecord } from "../teamTypes";
import { toast } from "sonner";

interface EmployeeEmploymentTabProps {
  employee: EmployeeRecord;
  onSave: (updated: EmployeeRecord) => void;
}

export default function EmployeeEmploymentTab({
  employee,
  onSave,
}: EmployeeEmploymentTabProps) {
  const [jobTitle, setJobTitle] = useState(employee.jobTitle);
  const [employmentType, setEmploymentType] = useState(employee.employmentType);
  const [startDate, setStartDate] = useState(employee.startDate);
  const [manager, setManager] = useState(employee.manager);
  const [department, setDepartment] = useState(employee.department);
  const [workLocation, setWorkLocation] = useState(employee.workLocation);
  const [emergencyContact, setEmergencyContact] = useState(employee.emergencyContact);
  const [statesCovered, setStatesCovered] = useState(employee.statesCovered || "Georgia");
  const [certifications, setCertifications] = useState(employee.certifications || "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: EmployeeRecord = {
      ...employee,
      jobTitle,
      employmentType,
      startDate,
      manager,
      department,
      workLocation,
      emergencyContact,
      statesCovered,
      certifications,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Employment Details Updated",
          details: `Updated title to "${jobTitle}", department to "${department}", and emergency contact.`,
        },
        ...employee.activity,
      ],
    };
    onSave(updated);
    toast.success("Employment information saved successfully!");
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-white text-sm">
              Employment Information &amp; Practice Operations
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Administrative job classification, supervisory hierarchy, work locations, and emergency contacts.
          </p>
        </div>

        <Button
          type="submit"
          size="sm"
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl px-4 py-2 gap-1.5 shadow-md cursor-pointer shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Employment Info</span>
        </Button>
      </div>

      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-white">Job Title</Label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
              required
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

          <div className="space-y-1">
            <Label className="text-xs text-white">Hire / Start Date</Label>
            <Input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white">Reporting Manager / Supervisor</Label>
            <Input
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white">Department / Division</Label>
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white">Work Location / Office</Label>
            <Input
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value)}
              placeholder="e.g. Atlanta, GA (Metro Hub & Virtual)"
              className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white">Emergency Contact Details</Label>
            <Input
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Name (Relationship) — (XXX) XXX-XXXX"
              className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white">Jurisdictions &amp; States Covered</Label>
            <Input
              value={statesCovered}
              onChange={(e) => setStatesCovered(e.target.value)}
              placeholder="e.g. Georgia (Primary), Florida"
              className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1 pt-2">
          <Label className="text-xs text-white">Professional Licenses &amp; Certifications</Label>
          <Input
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
            placeholder="e.g. Master IEP Coach® (MIPC-2024-884), GA Special Ed Teaching Certificate"
            className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
          />
        </div>
      </div>
    </form>
  );
}
