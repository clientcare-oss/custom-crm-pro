import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutGrid, 
  Users, 
  Settings2, 
  ShieldAlert, 
  Plus, 
  Check, 
  Sliders, 
  GraduationCap, 
  UserCheck, 
  Lock, 
  Eye, 
  FileText, 
  BookOpen, 
  Briefcase 
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface Employee {
  id: number;
  name: string;
  email: string;
  role: "Master Coach" | "Advocate" | "Intake Staff";
  permissions: string[];
  status: "Active" | "Inactive";
}

const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 1,
    name: "Byron Honea",
    email: "clientcare@waypointadvocates.com",
    role: "Master Coach",
    permissions: ["Edit Case Compass", "Internal Notes", "Billing", "Escalations"],
    status: "Active",
  },
  {
    id: 2,
    name: "Sarah Jenkins",
    email: "sarah.j@waypointadvocates.com",
    role: "Advocate",
    permissions: ["Edit Case Compass", "Internal Notes"],
    status: "Active",
  },
  {
    id: 3,
    name: "Marcus Vance",
    email: "marcus.v@waypointadvocates.com",
    role: "Intake Staff",
    permissions: ["Internal Notes"],
    status: "Active",
  },
];

export default function Workspace() {
  const [, setLocation] = useLocation();
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPLOYEES);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    role: "Advocate" as "Master Coach" | "Advocate" | "Intake Staff",
  });

  const [layoutConfig, setLayoutConfig] = useState({
    compass: { visible: true, access: "edit" },
    notes: { visible: true, access: "edit" },
    files: { visible: true, access: "edit" },
    tools: { visible: true, access: "edit" },
    billing: { visible: false, access: "read" },
    appointments: { visible: true, access: "edit" },
  });

  const handleGrantFullAccess = () => {
    setLayoutConfig({
      compass: { visible: true, access: "edit" },
      notes: { visible: true, access: "edit" },
      files: { visible: true, access: "edit" },
      tools: { visible: true, access: "edit" },
      billing: { visible: true, access: "edit" },
      appointments: { visible: true, access: "edit" },
    });
    toast.success("Granted full edit access to all workspace tabs.");
  };

  const handlePreviewWorkspace = () => {
    setLocation("/project-workspace/120024");
    toast.info("Opening employee workspace preview for Baaarbra Sheep...");
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.email) {
      toast.error("Please fill out all required fields.");
      return;
    }
    const created: Employee = {
      id: Date.now(),
      name: newEmp.name,
      email: newEmp.email,
      role: newEmp.role,
      permissions: newEmp.role === "Master Coach" 
        ? ["Edit Case Compass", "Internal Notes", "Billing", "Escalations"]
        : newEmp.role === "Advocate"
        ? ["Edit Case Compass", "Internal Notes"]
        : ["Internal Notes"],
      status: "Active",
    };
    setEmployees([...employees, created]);
    setNewEmp({ name: "", email: "", role: "Advocate" });
    setAddOpen(false);
    toast.success("Employee successfully added to the workspace.");
  };

  const togglePermission = (empId: number, permission: string) => {
    setEmployees(employees.map(emp => {
      if (emp.id !== empId) return emp;
      const hasPermission = emp.permissions.includes(permission);
      return {
        ...emp,
        permissions: hasPermission 
          ? emp.permissions.filter(p => p !== permission)
          : [...emp.permissions, permission]
      };
    }));
    toast.success("Permissions updated successfully.");
  };

  const handleSaveConfig = () => {
    toast.success("Employee Workspace layout configuration saved.");
  };

  const filteredEmployees = employees.filter(
    emp =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <LayoutGrid className="h-8 w-8 text-amber-500" />
          Workspace Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
          Configure layout presets, customize student visible tabs, and manage employee roles, access policies, and operational scopes.
        </p>
      </div>

      <Tabs defaultValue="designer" className="w-full">
        <TabsList className="bg-muted p-1 rounded-xl w-fit flex gap-1 border border-border">
          <TabsTrigger value="designer" className="rounded-lg flex items-center gap-2 px-4 py-2">
            <Sliders className="h-4 w-4" />
            Layout Designer
          </TabsTrigger>
          <TabsTrigger value="employees" className="rounded-lg flex items-center gap-2 px-4 py-2">
            <Users className="h-4 w-4" />
            Employees & Roles
          </TabsTrigger>
          <TabsTrigger value="sop" className="rounded-lg flex items-center gap-2 px-4 py-2">
            <BookOpen className="h-4 w-4" />
            SOP & Workspace Rules
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: LAYOUT DESIGNER ─── */}
        <TabsContent value="designer" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 rounded-xl border border-border bg-card shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Widget & Feature Visibility Policies</h3>
                <p className="text-xs text-muted-foreground mt-1">Specify which features are active inside the default student workspace view.</p>
              </div>

              <div className="space-y-4">
                {Object.entries(layoutConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-border bg-muted/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={config.visible}
                        onCheckedChange={(checked) => setLayoutConfig({
                          ...layoutConfig,
                          [key]: { ...config, visible: checked }
                        })}
                      />
                      <div>
                        <p className="text-sm font-semibold capitalize text-foreground">{key}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {key === "compass" && "Real-time IEP advocacy pipeline status tracking."}
                          {key === "notes" && "Internal advocate files, notes and observations."}
                          {key === "files" && "Student uploads, records, IEP packets and letters."}
                          {key === "tools" && "Special education advocacy calculators and complaint builders."}
                          {key === "billing" && "Billing, rates, invoices, and retainer tracking."}
                          {key === "appointments" && "Direct meeting schedulers and calendar timelines."}
                        </p>
                      </div>
                    </div>

                    {config.visible && (
                      <div className="flex gap-2">
                        <Button
                          variant={config.access === "read" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLayoutConfig({
                            ...layoutConfig,
                            [key]: { ...config, access: "read" }
                          })}
                          className="h-7 px-2.5 text-[10px]"
                        >
                          <Eye className="h-3 w-3 mr-1" /> Read Only
                        </Button>
                        <Button
                          variant={config.access === "edit" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLayoutConfig({
                            ...layoutConfig,
                            [key]: { ...config, access: "edit" }
                          })}
                          className="h-7 px-2.5 text-[10px]"
                        >
                          <Settings2 className="h-3 w-3 mr-1" /> Full Edit
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center border-t border-border pt-4">
                <Button variant="outline" onClick={handlePreviewWorkspace} className="border-amber-400/20 text-amber-300 bg-amber-400/5 hover:bg-amber-400/10">
                  Preview Workspace (Baaarbra)
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setLayoutConfig({
                      compass: { visible: true, access: "edit" },
                      notes: { visible: true, access: "edit" },
                      files: { visible: true, access: "edit" },
                      tools: { visible: true, access: "edit" },
                      billing: { visible: false, access: "read" },
                      appointments: { visible: true, access: "edit" },
                    });
                    toast.success("Reset workspace configuration to default preset.");
                  }}>Reset Defaults</Button>
                  <Button variant="outline" onClick={handleGrantFullAccess} className="border-emerald-500/20 text-emerald-400 hover:text-emerald-300">
                    Grant Full Access
                  </Button>
                  <Button onClick={handleSaveConfig} className="bg-amber-500 hover:bg-amber-400 text-background font-bold">
                    Save Configuration
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4 h-fit">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide text-muted-foreground">Workspace Preview</h3>
              <div className="border border-border/80 bg-muted/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-border pb-2.5">
                  <div className="h-6 w-6 rounded bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">W</div>
                  <span className="text-xs font-bold text-foreground">Workspace: Baaarbra Sheep</span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(layoutConfig).filter(([_, c]) => c.visible).map(([key]) => (
                    <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/80 px-2 py-1.5 rounded-lg border border-border/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="capitalize">{key}</span>
                      <span className="ml-auto text-[9px] px-1 bg-white/5 border border-white/10 rounded uppercase font-semibold">
                        {layoutConfig[key as keyof typeof layoutConfig].access}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 2: EMPLOYEES & ROLES ─── */}
        <TabsContent value="employees" className="mt-6 space-y-6">
          <Card className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Employees Access Directory</h3>
                <p className="text-xs text-muted-foreground mt-1">Add employee advocates and customize their workspace permissions.</p>
              </div>
              <Button onClick={() => setAddOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-background font-bold gap-2">
                <Plus className="h-4 w-4" /> Add Employee
              </Button>
            </div>

            <div className="w-full max-w-sm">
              <Input
                placeholder="Search employees by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-muted/40 border-border text-foreground"
              />
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b border-border">
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3">Name</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3">Role</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3">Permissions</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map(emp => (
                    <TableRow key={emp.id} className="border-b border-border hover:bg-muted/20">
                      <TableCell className="py-4">
                        <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{emp.email}</p>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="border-amber-400/20 text-amber-300 bg-amber-400/5">
                          {emp.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          {emp.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 max-w-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {["Edit Case Compass", "Internal Notes", "Billing", "Escalations"].map(perm => {
                            const active = emp.permissions.includes(perm);
                            return (
                              <button
                                key={perm}
                                onClick={() => togglePermission(emp.id, perm)}
                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all
                                  ${active 
                                    ? "bg-amber-400/10 border-amber-400/30 text-amber-300" 
                                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                {perm}
                              </button>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Button variant="outline" size="sm" className="h-8 text-xs">Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: SOP & RULES ─── */}
        <TabsContent value="sop" className="mt-6">
          <Card className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Standard Operating Procedure (SOP)</h3>
              <p className="text-xs text-muted-foreground mt-1">Configure default operational tasks and checklists that load inside employee workspaces.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 border border-border bg-muted/10 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
                  Intake & Validation Checklist
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500" /> Verify parent/client details.
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500" /> Assign Advocate and Master IEP Coach.
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500" /> Check case for legal attorney representation.
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-border bg-muted/10 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-4.5 w-4.5 text-amber-500" />
                  IEP Evaluation SOP
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500" /> Upload psychological evaluations and clinical therapy records.
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500" /> Check for FAPE / accommodations failures.
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Employee Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#0b192c] border border-white/10 text-white rounded-xl max-w-sm animate-in fade-in zoom-in duration-200">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Add Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-white/80">Employee Name</Label>
              <Input
                value={newEmp.name}
                onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                placeholder="John Doe"
                className="bg-[#0d1e33] border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Email Address</Label>
              <Input
                value={newEmp.email}
                onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                type="email"
                placeholder="john.doe@waypointadvocates.com"
                className="bg-[#0d1e33] border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Default Role</Label>
              <Select
                value={newEmp.role}
                onValueChange={(v: any) => setNewEmp({ ...newEmp, role: v })}
              >
                <SelectTrigger className="bg-[#0d1e33] border-white/10 text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1e33] border-white/10 text-white">
                  <SelectItem value="Master Coach">Master Coach</SelectItem>
                  <SelectItem value="Advocate">Advocate</SelectItem>
                  <SelectItem value="Intake Staff">Intake Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-background font-bold">
                Add Employee
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
