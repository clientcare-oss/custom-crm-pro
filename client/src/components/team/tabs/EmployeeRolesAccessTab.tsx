import { useState } from "react";
import {
  Shield,
  Crown,
  Key,
  CheckCircle2,
  Lock,
  Layers,
  AlertCircle,
  HelpCircle,
  Save,
  Check,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  EmployeeRecord,
  ROLE_DEFINITIONS,
  PERMISSION_DEFINITIONS,
  CRM_MODULES,
  RoleId,
} from "../teamTypes";
import { toast } from "sonner";

interface EmployeeRolesAccessTabProps {
  employee: EmployeeRecord;
  onSave: (updated: EmployeeRecord) => void;
}

export default function EmployeeRolesAccessTab({
  employee,
  onSave,
}: EmployeeRolesAccessTabProps) {
  const [primaryRole, setPrimaryRole] = useState<RoleId>(employee.primaryRole);
  const [additionalRoles, setAdditionalRoles] = useState<RoleId[]>(employee.additionalRoles || []);
  const [permissionOverrides, setPermissionOverrides] = useState<Record<string, boolean>>(
    employee.permissionOverrides || {}
  );
  const [modulePermissions, setModulePermissions] = useState<Record<string, "none" | "view" | "edit">>(
    employee.modulePermissions || {}
  );
  const [isDirty, setIsDirty] = useState(false);

  // Toggle Additional Role
  const handleToggleAdditionalRole = (roleId: RoleId) => {
    if (roleId === primaryRole) return;
    setAdditionalRoles((prev) => {
      const exists = prev.includes(roleId);
      const next = exists ? prev.filter((r) => r !== roleId) : [...prev, roleId];
      return next;
    });
    setIsDirty(true);
  };

  // Change Primary Role
  const handleSelectPrimaryRole = (newPrimary: RoleId) => {
    setPrimaryRole(newPrimary);
    setAdditionalRoles((prev) => prev.filter((r) => r !== newPrimary));
    setIsDirty(true);
  };

  // Calculate inherited permission
  const isPermissionInherited = (permId: string): boolean => {
    const roles = [primaryRole, ...additionalRoles];
    return roles.some((r) => {
      const def = ROLE_DEFINITIONS[r];
      return def?.defaultPermissions.includes("all") || def?.defaultPermissions.includes(permId);
    });
  };

  const getEffectivePermission = (permId: string): boolean => {
    if (permId in permissionOverrides) {
      return permissionOverrides[permId];
    }
    return isPermissionInherited(permId);
  };

  const handleTogglePermission = (permId: string) => {
    const current = getEffectivePermission(permId);
    setPermissionOverrides((prev) => ({
      ...prev,
      [permId]: !current,
    }));
    setIsDirty(true);
  };

  // Calculate inherited module access level
  const getInheritedModuleLevel = (moduleId: string): "none" | "view" | "edit" => {
    const roles = [primaryRole, ...additionalRoles];
    if (roles.includes("management")) return "edit";
    for (const r of roles) {
      const def = ROLE_DEFINITIONS[r];
      if (def?.defaultModules.includes("all") || def?.defaultModules.includes(moduleId)) {
        return "edit";
      }
    }
    return "none";
  };

  const getEffectiveModuleLevel = (moduleId: string): "none" | "view" | "edit" => {
    if (moduleId in modulePermissions) {
      return modulePermissions[moduleId];
    }
    return getInheritedModuleLevel(moduleId);
  };

  const handleSetModuleLevel = (moduleId: string, level: "none" | "view" | "edit") => {
    setModulePermissions((prev) => ({
      ...prev,
      [moduleId]: level,
    }));
    setIsDirty(true);
  };

  const handleResetModuleLevel = (moduleId: string) => {
    setModulePermissions((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    setIsDirty(true);
  };

  const handleSaveChanges = () => {
    const updated: EmployeeRecord = {
      ...employee,
      primaryRole,
      additionalRoles,
      permissionOverrides,
      modulePermissions,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Roles & Permissions Updated",
          details: `Primary role set to ${ROLE_DEFINITIONS[primaryRole]?.label}. Module overrides and system permissions adjusted.`,
        },
        ...employee.activity,
      ],
    };
    onSave(updated);
    setIsDirty(false);
    toast.success("Roles, permissions & module access saved successfully!");
  };

  // Group modules by category
  const moduleGroups = Array.from(new Set(CRM_MODULES.map((m) => m.group)));

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">
              Roles, Permissions &amp; CRM Module Access
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Control employee job responsibilities, administrative authority, and dynamic CRM sidebar visibility.
          </p>
        </div>

        {isDirty && (
          <Button
            size="sm"
            onClick={handleSaveChanges}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl px-4 py-2 gap-1.5 shadow-md cursor-pointer shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All Changes</span>
          </Button>
        )}
      </div>

      {/* ── Section 1: Primary & Additional Roles ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Assigned Workforce Roles</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Choose one <strong>Primary Role</strong> and any eligible <strong>Additional Roles</strong>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(ROLE_DEFINITIONS).map((role) => {
            const isPrimary = primaryRole === role.id;
            const isAdditional = additionalRoles.includes(role.id);
            const Icon = role.icon;

            return (
              <div
                key={role.id}
                className={`p-3.5 rounded-xl border transition-all text-xs space-y-2.5 ${
                  isPrimary
                    ? "border-amber-400/80 bg-amber-950/30 ring-1 ring-amber-400/50"
                    : isAdditional
                    ? "border-sky-400/60 bg-sky-950/30"
                    : "border-blue-900/40 bg-[#000d2b]/40 hover:border-blue-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${role.badgeClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-white">{role.label}</span>
                  </div>

                  {isPrimary && (
                    <Badge className="bg-amber-400 text-slate-950 text-[10px] font-black">
                      Primary
                    </Badge>
                  )}
                  {isAdditional && (
                    <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-[10px]">
                      Additional
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-blue-200/70 leading-relaxed">
                  {role.description}
                </p>

                <div className="flex items-center gap-2 pt-1 border-t border-blue-900/30">
                  <button
                    type="button"
                    onClick={() => handleSelectPrimaryRole(role.id)}
                    className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-all ${
                      isPrimary
                        ? "bg-amber-400/20 text-amber-300 pointer-events-none"
                        : "text-slate-400 hover:text-amber-300 hover:bg-amber-400/10"
                    }`}
                  >
                    Set as Primary
                  </button>

                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleToggleAdditionalRole(role.id)}
                      className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-all ${
                        isAdditional
                          ? "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
                          : "text-slate-400 hover:text-sky-300 hover:bg-sky-400/10"
                      }`}
                    >
                      {isAdditional ? "Remove" : "+ Add Role"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: CRM Module Access & Sidebar Visibility (ADD-ON) ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>CRM Module Access &amp; Sidebar Visibility</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Directly governs which modules appear in this employee's sidebar and whether they have View or Edit privileges.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Inherited from Role
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Employee Override
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {moduleGroups.map((group) => {
            const groupModules = CRM_MODULES.filter((m) => m.group === group);
            return (
              <div key={group} className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
                  {group}
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {groupModules.map((mod) => {
                    const effectiveLevel = getEffectiveModuleLevel(mod.id);
                    const inheritedLevel = getInheritedModuleLevel(mod.id);
                    const hasOverride = mod.id in modulePermissions;
                    const ModIcon = mod.icon;

                    return (
                      <div
                        key={mod.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                          effectiveLevel === "none"
                            ? "bg-[#000514]/60 border-blue-950/60 opacity-60"
                            : "bg-[#000d2b] border-blue-900/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ModIcon className="w-4 h-4 text-sky-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-white flex items-center gap-1.5 truncate">
                              <span>{mod.label}</span>
                              {mod.isSensitive && (
                                <span title="Sensitive Module" className="inline-flex">
                                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              {hasOverride ? (
                                <span className="text-amber-400 font-medium">Employee Override</span>
                              ) : (
                                <span className="text-blue-300/60">
                                  Inherited ({inheritedLevel})
                                </span>
                              )}
                              {hasOverride && (
                                <button
                                  type="button"
                                  onClick={() => handleResetModuleLevel(mod.id)}
                                  className="text-slate-400 hover:text-white underline cursor-pointer"
                                  title="Reset to role default"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tri-state buttons: No Access | View | Edit/Manage */}
                        <div className="flex items-center gap-1 bg-[#000820] p-1 rounded-lg border border-blue-900/60 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSetModuleLevel(mod.id, "none")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                              effectiveLevel === "none"
                                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            No Access
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetModuleLevel(mod.id, "view")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                              effectiveLevel === "view"
                                ? "bg-blue-500/30 text-sky-300 border border-blue-500/40"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetModuleLevel(mod.id, "edit")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                              effectiveLevel === "edit"
                                ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Granular System Permissions ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="pb-2 border-b border-blue-900/40">
          <h4 className="font-bold text-white flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Granular System Permissions</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Individual capability toggles with role-inheritance indicators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PERMISSION_DEFINITIONS.map((perm) => {
            const isGranted = getEffectivePermission(perm.id);
            const hasOverride = perm.id in permissionOverrides;
            const inherited = isPermissionInherited(perm.id);

            return (
              <div
                key={perm.id}
                onClick={() => handleTogglePermission(perm.id)}
                className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs cursor-pointer transition-all ${
                  isGranted
                    ? "bg-[#000d2b] border-blue-800/80 hover:border-blue-700"
                    : "bg-[#000820] border-blue-950/60 opacity-60 hover:opacity-80"
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">{perm.label}</span>
                    {hasOverride ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                        Override
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">
                        ({inherited ? "Inherited" : "Default Off"})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-blue-200/70 leading-relaxed">
                    {perm.description}
                  </p>
                </div>

                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                    isGranted
                      ? "bg-emerald-500 border-emerald-400 text-slate-950 font-bold"
                      : "border-slate-600 bg-transparent"
                  }`}
                >
                  {isGranted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
