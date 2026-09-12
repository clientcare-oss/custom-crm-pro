import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Phone,
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Copy,
  Users,
  Smartphone,
  Send,
  Trash2,
  Save,
  Check,
  Zap,
  Radio,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageIdBadge from "@/components/PageIdBadge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function QuoSettings() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // tRPC queries
  const { data: settings, refetch: refetchSettings, isLoading: settingsLoading } =
    trpc.quo.getSettings.useQuery();

  const { data: employeeData, refetch: refetchMappings, isLoading: mappingsLoading } =
    trpc.quo.listEmployeeMappings.useQuery();

  const { data: devices, refetch: refetchDevices, isLoading: devicesLoading } =
    trpc.quo.listMyDevices.useQuery();

  // Mutations
  const saveSettingsMutation = trpc.quo.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Quo phone settings saved successfully");
      refetchSettings();
    },
    onError: (err) => toast.error(`Failed to save settings: ${err.message}`),
  });

  const testConnectionMutation = trpc.quo.testConnection.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchSettings();
    },
    onError: (err) => toast.error(`Connection test failed: ${err.message}`),
  });

  const saveMappingMutation = trpc.quo.saveEmployeeMapping.useMutation({
    onSuccess: () => {
      toast.success("Employee Quo mapping saved");
      refetchMappings();
      setSelectedEmployeeId(null);
      setQuoUserId("");
      setQuoDisplayName("");
    },
    onError: (err) => toast.error(`Failed to save mapping: ${err.message}`),
  });

  const deleteMappingMutation = trpc.quo.deleteEmployeeMapping.useMutation({
    onSuccess: () => {
      toast.success("Employee mapping removed");
      refetchMappings();
    },
    onError: (err) => toast.error(`Failed to delete mapping: ${err.message}`),
  });

  const registerDeviceMutation = trpc.quo.registerDevice.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      refetchDevices();
    },
    onError: (err) => toast.error(`Device registration failed: ${err.message}`),
  });

  const deleteDeviceMutation = trpc.quo.deleteDevice.useMutation({
    onSuccess: () => {
      toast.success("Device removed");
      refetchDevices();
    },
    onError: (err) => toast.error(`Failed to remove device: ${err.message}`),
  });

  // Local state for Phone Settings
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneDisplayName, setPhoneDisplayName] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  // Sync state from query
  useEffect(() => {
    if (settings) {
      setPhoneNumber(settings.primaryPhoneNumber || "+1 (770) 555-0199");
      setPhoneDisplayName(settings.primaryPhoneDisplayName || "Waypoint Advocates Primary Line");
      setPhoneId(settings.primaryPhoneId || "PN_WAYPOINT_PRIMARY_01");
    }
  }, [settings]);

  // Local state for Mapping Form
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [quoUserId, setQuoUserId] = useState("");
  const [quoDisplayName, setQuoDisplayName] = useState("");

  const webhookPrimary = `${window.location.origin}/api/integrations/quo/webhooks`;
  const webhookLegacy = `${window.location.origin}/api/quo/webhook`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUrl(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const handleSavePhoneSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast.error("Please enter a valid phone number");
      return;
    }
    saveSettingsMutation.mutate({
      primaryPhoneNumber: phoneNumber.trim(),
      primaryPhoneDisplayName: phoneDisplayName.trim(),
      primaryPhoneId: phoneId.trim(),
      status: "connected",
    });
  };

  const handleSaveMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!quoUserId.trim()) {
      toast.error("Please provide the Quo User ID");
      return;
    }

    const employee = employeeData?.teamUsers?.find((u) => u.id === selectedEmployeeId);
    saveMappingMutation.mutate({
      employeeId: selectedEmployeeId,
      employeeName: employee?.name || "Employee",
      quoUserId: quoUserId.trim(),
      quoUserDisplayName: quoDisplayName.trim() || employee?.name || "Employee",
    });
  };

  const handleRegisterCurrentDevice = () => {
    const userAgent = navigator.userAgent;
    let platform: "ios" | "android" | "web" | "other" = "web";
    if (/iPhone|iPad|iPod/i.test(userAgent)) platform = "ios";
    else if (/Android/i.test(userAgent)) platform = "android";

    const browserDeviceName = `${platform.toUpperCase()} Browser (${navigator.platform || "Desktop"})`;
    const deviceFingerprint = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    registerDeviceMutation.mutate({
      deviceId: deviceFingerprint,
      deviceName: browserDeviceName,
      platform,
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/integrations">
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span>Integrations</span>
              </Button>
            </Link>
            <PageIdBadge id="PG-014-QUO" name="Quo Integration Settings" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-700/50 text-cyan-400">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Quo Phone Integration
              </h1>
              <p className="text-sm text-muted-foreground">
                Command center for business voice calling, SMS messaging, call recordings, AI summaries, and employee handoffs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSettings()}
            disabled={settingsLoading}
            className="gap-2 border-border/70"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${settingsLoading ? "animate-spin" : ""}`} />
            <span>Sync Status</span>
          </Button>
          <Button
            size="sm"
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending}
            className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{testConnectionMutation.isPending ? "Testing..." : "Test Connection"}</span>
          </Button>
        </div>
      </div>

      {/* Grid: Section 1 (Connection) & Section 2 (Phone Number) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: CONNECTION & WEBHOOKS */}
        <Card className="border-border/70 bg-[#06172F]/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Shield className="h-4 w-4 text-cyan-400" />
                Connection & Security Architecture
              </CardTitle>
              <Badge
                variant="outline"
                className={
                  settings?.status === "connected"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }
              >
                {settings?.status === "connected" ? "Connected" : "Ready / Standby"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Quo API configuration and webhook ingestion endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {/* Security Guardrail Notice */}
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200/90 flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-cyan-300">Strict Secret Protection:</span> API credentials and webhook signing keys are managed exclusively in secure backend server environment bindings. Client-side code never exposes sensitive credentials.
              </div>
            </div>

            {/* Webhook URLs */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Primary Webhook Endpoint</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-background/60 border border-border/80 px-3 py-2 rounded-md text-cyan-300 truncate">
                  {webhookPrimary}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(webhookPrimary, "Primary Webhook")}
                  className="h-8 px-2.5 flex-shrink-0 gap-1"
                >
                  {copiedUrl === "Primary Webhook" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="text-xs">{copiedUrl === "Primary Webhook" ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Legacy Compatibility Path</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-background/60 border border-border/80 px-3 py-2 rounded-md text-muted-foreground truncate">
                  {webhookLegacy}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(webhookLegacy, "Legacy Webhook")}
                  className="h-8 px-2.5 flex-shrink-0 gap-1"
                >
                  {copiedUrl === "Legacy Webhook" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="text-xs">{copiedUrl === "Legacy Webhook" ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            {/* Ingestion Status Info */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-2.5 rounded-lg border border-border/50 bg-background/40">
                <div className="text-[11px] text-muted-foreground">Webhook Listener</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-400">
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  <span>Active &amp; Ready</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-border/50 bg-background/40">
                <div className="text-[11px] text-muted-foreground">Last Sync Handshake</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-foreground">
                  <Clock className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{settings?.lastSyncAt ? new Date(settings.lastSyncAt).toLocaleTimeString() : "Pending traffic"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: PRIMARY PHONE NUMBER */}
        <Card className="border-border/70 bg-[#06172F]/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Phone className="h-4 w-4 text-cyan-400" />
              Primary Waypoint Quo Phone Number
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              The central telephone number used for all client calling, SMS messaging, and caller ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <form onSubmit={handleSavePhoneSettings} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quo-phone" className="text-xs font-medium text-foreground">
                  Master Phone Number
                </Label>
                <Input
                  id="quo-phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (770) 555-0199"
                  className="bg-background/60 text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quo-phone-name" className="text-xs font-medium text-foreground">
                    Caller ID Display Name
                  </Label>
                  <Input
                    id="quo-phone-name"
                    value={phoneDisplayName}
                    onChange={(e) => setPhoneDisplayName(e.target.value)}
                    placeholder="Waypoint Advocates Main"
                    className="bg-background/60 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quo-phone-id" className="text-xs font-medium text-foreground">
                    Quo Phone Number ID
                  </Label>
                  <Input
                    id="quo-phone-id"
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value)}
                    placeholder="PN_WAYPOINT_01"
                    className="bg-background/60 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/40">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">Primary Outbound Business Number</div>
                  <div className="text-[11px] text-muted-foreground">
                    Employees without their own line will route and text via this shared number.
                  </div>
                </div>
                <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={saveSettingsMutation.isPending}
                  className="gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saveSettingsMutation.isPending ? "Saving..." : "Save Phone Settings"}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3: EMPLOYEE MAPPING */}
      <Card className="border-border/70 bg-[#06172F]/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4 text-cyan-400" />
                Employee to Quo User Mapping
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Map each Waypoint employee to their Quo user identity for call attribution and routing. Employees share the primary business number.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-cyan-950/30 text-cyan-300 border-cyan-800 self-start sm:self-auto">
              Multi-Employee Shared Number
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-1">
          {/* Add Mapping Form */}
          <form onSubmit={handleSaveMapping} className="p-4 rounded-xl border border-border/60 bg-background/40 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add or Update Employee Link
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Waypoint Employee</Label>
                <Select
                  value={selectedEmployeeId ? String(selectedEmployeeId) : ""}
                  onValueChange={(val) => {
                    const id = Number(val);
                    setSelectedEmployeeId(id);
                    const employee = employeeData?.teamUsers?.find((u) => u.id === id);
                    if (employee) {
                      setQuoDisplayName(employee.name || "");
                      // Auto-suggest Quo user ID format
                      setQuoUserId(`usr_${(employee.name || "emp").toLowerCase().replace(/\s+/g, "_")}`);
                    }
                  }}
                >
                  <SelectTrigger className="text-xs bg-background/80">
                    <SelectValue placeholder="Select employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeData?.teamUsers?.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name || u.email} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Quo User ID</Label>
                <Input
                  value={quoUserId}
                  onChange={(e) => setQuoUserId(e.target.value)}
                  placeholder="e.g. usr_byron_01"
                  className="text-xs font-mono bg-background/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Quo Display Name</Label>
                <Input
                  value={quoDisplayName}
                  onChange={(e) => setQuoDisplayName(e.target.value)}
                  placeholder="e.g. Byron Honea"
                  className="text-xs bg-background/80"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={saveMappingMutation.isPending || !selectedEmployeeId}
                className="gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saveMappingMutation.isPending ? "Saving..." : "Save Mapping"}</span>
              </Button>
            </div>
          </form>

          {/* Current Mappings Table */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground">Active Team Mappings</div>
            {mappingsLoading ? (
              <div className="text-center py-6 text-xs text-muted-foreground">Loading mappings...</div>
            ) : employeeData?.mappings && employeeData.mappings.length > 0 ? (
              <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/60">
                {employeeData.mappings.map((m) => (
                  <div key={m.id} className="p-3 bg-background/40 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300 flex items-center justify-center font-bold text-xs">
                        {m.employeeName ? m.employeeName[0]?.toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{m.employeeName || `Employee #${m.employeeId}`}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>Quo User: <strong className="text-cyan-400 font-mono">{m.quoUserId}</strong></span>
                          <span>•</span>
                          <span>{m.quoUserDisplayName || "Default"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-emerald-950/30 text-emerald-400 border-emerald-800">
                        Mapped ✓
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMappingMutation.mutate({ id: m.id })}
                        disabled={deleteMappingMutation.isPending}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground">
                No employees mapped to Quo users yet. Select an employee above to configure their Quo user ID.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: EMPLOYEE REGISTERED DEVICES ("Send Call to My Phone") */}
      <Card className="border-border/70 bg-[#06172F]/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Smartphone className="h-4 w-4 text-cyan-400" />
                Employee Device Registration (Call Handoff Engine)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Devices registered to receive "Send Call to My Phone" push notifications. Does not require storing personal cell numbers.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegisterCurrentDevice}
              disabled={registerDeviceMutation.isPending}
              className="gap-1.5 border-cyan-800/60 text-cyan-300 hover:bg-cyan-950/40 text-xs self-start sm:self-auto"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Register This Device</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              <span>
                When an employee clicks <strong>"Send Call to My Phone"</strong> on any client record, their registered mobile device receives a notification with a 1-tap <code className="text-cyan-300 font-mono">tel:</code> calling handoff.
              </span>
            </div>
          </div>

          {/* Device List */}
          <div className="space-y-2">
            {devicesLoading ? (
              <div className="text-center py-6 text-xs text-muted-foreground">Loading registered devices...</div>
            ) : devices && devices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {devices.map((d) => (
                  <div key={d.id} className="p-3.5 rounded-xl border border-border/60 bg-background/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{d.deviceName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Platform: <span className="uppercase text-cyan-400 font-mono">{d.platform}</span> • Registered {new Date(d.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-emerald-950/30 text-emerald-400 border-emerald-800">
                        Active
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteDeviceMutation.mutate({ id: d.id })}
                        disabled={deleteDeviceMutation.isPending}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground">
                No mobile devices registered yet. Click "Register This Device" from your mobile browser or desktop to activate instant call handoff.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
