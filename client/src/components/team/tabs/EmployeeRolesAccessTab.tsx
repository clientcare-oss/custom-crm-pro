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
  Compass,
  FileText,
  Folder,
  Wrench,
  Calendar,
  DollarSign,
  Zap,
  ScrollText,
  Video,
  CheckSquare,
  Milestone,
  Sliders,
  Eye,
  Edit3,
  XCircle,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  EmployeeRecord,
  ROLE_DEFINITIONS,
  PERMISSION_DEFINITIONS,
  CRM_MODULES,
  CASE_WORKSPACE_MODULES,
  RoleId,
  CaseAccessLevel,
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
  const [caseWorkspaceAccess, setCaseWorkspaceAccess] = useState<Record<string, CaseAccessLevel>>(
    employee.caseWorkspaceAccess || {}
  );
  const [isDirty, setIsDirty] = useState(false);

  // ── Role Management ──
  const handleToggleAdditionalRole = (roleId: RoleId) => {
    if (roleId === primaryRole) return;
    setAdditionalRoles((prev) => {
      const exists = prev.includes(roleId);
      const next = exists ? prev.filter((r) => r !== roleId) : [...prev, roleId];
      return next;
    });
    setIsDirty(true);
  };

  const handleSelectPrimaryRole = (newPrimary: RoleId) => {
    setPrimaryRole(newPrimary);
    setAdditionalRoles((prev) => prev.filter((r) => r !== newPrimary));
    setIsDirty(true);
  };

  // ── System Permissions Inheritance ──
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

  const handleResetPermission = (permId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPermissionOverrides((prev) => {
      const next = { ...prev };
      delete next[permId];
      return next;
    });
    setIsDirty(true);
  };

  // ── CRM Module Access Inheritance ──
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

  // ── Case / Student Workspace Access Inheritance ──
  const levelRank: Record<CaseAccessLevel, number> = {
    none: 0,
    view: 1,
    edit: 2,
    manage: 3,
  };

  const getInheritedCaseLevel = (caseModId: string): CaseAccessLevel => {
    const roles = [primaryRole, ...additionalRoles];
    if (roles.includes("management")) return "manage";

    let highest: CaseAccessLevel = "none";
    for (const r of roles) {
      const def = ROLE_DEFINITIONS[r];
      if (def?.defaultCaseAccess && caseModId in def.defaultCaseAccess) {
        const lvl = def.defaultCaseAccess[caseModId];
        if (levelRank[lvl] > levelRank[highest]) {
          highest = lvl;
        }
      }
    }
    return highest;
  };

  const getEffectiveCaseLevel = (caseModId: string): CaseAccessLevel => {
    if (caseModId in caseWorkspaceAccess) {
      return caseWorkspaceAccess[caseModId];
    }
    return getInheritedCaseLevel(caseModId);
  };

  const handleSetCaseLevel = (caseModId: string, level: CaseAccessLevel) => {
    setCaseWorkspaceAccess((prev) => ({
      ...prev,
      [caseModId]: level,
    }));
    setIsDirty(true);
  };

  const handleResetCaseLevel = (caseModId: string) => {
    setCaseWorkspaceAccess((prev) => {
      const next = { ...prev };
      delete next[caseModId];
      return next;
    });
    setIsDirty(true);
  };

  // ── Global & Section Resets ──
  const handleResetAllToRoleDefaults = () => {
    setModulePermissions({});
    setCaseWorkspaceAccess({});
    setPermissionOverrides({});
    setIsDirty(true);
    toast.info("All CRM modules, case workspace tabs, and system permissions reset to role defaults.");
  };

  const handleResetCaseSection = () => {
    setCaseWorkspaceAccess({});
    setIsDirty(true);
    toast.info("All Student & Case Workspace tabs reset to role defaults.");
  };

  const handleResetModulesSection = () => {
    setModulePermissions({});
    setIsDirty(true);
    toast.info("All CRM sidebar modules reset to role defaults.");
  };

  const handleResetPermissionsSection = () => {
    setPermissionOverrides({});
    setIsDirty(true);
    toast.info("All system action permissions reset to role defaults.");
  };

  // ── Save Handler ──
  const handleSaveChanges = () => {
    const updated: EmployeeRecord = {
      ...employee,
      primaryRole,
      additionalRoles,
      permissionOverrides,
      modulePermissions,
      caseWorkspaceAccess,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Permissions & Access Consolidated",
          details: `Primary role set to ${ROLE_DEFINITIONS[primaryRole]?.label}. Updated CRM sidebar modules (${Object.keys(modulePermissions).length} overrides), Case Workspace tabs (${Object.keys(caseWorkspaceAccess).length} overrides), and sensitive permissions (${Object.keys(permissionOverrides).length} overrides).`,
        },
        ...employee.activity,
      ],
    };
    onSave(updated);
    setIsDirty(false);
    toast.success("Permissions & access settings saved successfully!");
  };

  // Groups
  const moduleGroups = Array.from(new Set(CRM_MODULES.map((m) => m.group)));
  const caseGroups = Array.from(new Set(CASE_WORKSPACE_MODULES.map((m) => m.category)));
  const permCategories = Array.from(new Set(PERMISSION_DEFINITIONS.map((p) => p.category)));

  // Icons for case modules
  const getCaseModuleIcon = (id: string) => {
    switch (id) {
      case "compass": return Compass;
      case "notes": return FileText;
      case "files": return Folder;
      case "tools": return Wrench;
      case "appointments": return Calendar;
      case "financials": return DollarSign;
      case "meeting_workspace": return Zap;
      case "post_meeting_review": return Zap;
      case "projects": return ScrollText;
      case "voyage_log": return Video;
      case "tasks": return CheckSquare;
      case "activity_timeline": return Milestone;
      default: return Sliders;
    }
  };

  return (
    <div className="space-y-6 text-xs text-white">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              Permissions &amp; Access Control
            </h3>
            <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px] font-bold">
              Single Source of Truth
            </Badge>
          </div>
          <p className="text-[11.5px] text-blue-200/70 max-w-2xl leading-relaxed">
            Consolidated authority console for <strong>{employee.name}</strong>. Governs CRM sidebar visibility, Student Case Workspace tabs, and sensitive operational permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetAllToRoleDefaults}
            className="border-blue-800/80 bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 text-xs rounded-xl px-3 py-2 gap-1.5 cursor-pointer"
            title="Reset all modules, case workspace tabs, and permissions to role defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>Reset to Role Defaults</span>
          </Button>

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
      </div>

      {/* ── Section 1: Assigned Workforce Roles ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Assigned Workforce Roles &amp; Authority Defaults</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select one <strong>Primary Role</strong> and optional <strong>Additional Roles</strong>. Roles establish default visibility and permissions across the CRM.
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

      {/* ── Section 2: Case & Student Workspace Access ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Case / Student Workspace Access</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Controls which tabs and features appear when this employee opens a student record (<code>/contacts/:id</code>, <code>/projects</code>).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetCaseSection}
              className="text-[10px] font-semibold text-blue-300/80 hover:text-blue-100 flex items-center gap-1 cursor-pointer bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-900/60"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Case Tabs to Defaults</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {caseGroups.map((group) => {
            const groupMods = CASE_WORKSPACE_MODULES.filter((m) => m.category === group);
            return (
              <div key={group} className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {group}
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {groupMods.map((mod) => {
                    const effectiveLevel = getEffectiveCaseLevel(mod.id);
                    const inheritedLevel = getInheritedCaseLevel(mod.id);
                    const hasOverride = mod.id in caseWorkspaceAccess;
                    const ModIcon = getCaseModuleIcon(mod.id);

                    return (
                      <div
                        key={mod.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 text-xs transition-all ${
                          effectiveLevel === "none"
                            ? "bg-[#000514]/60 border-blue-950/60 opacity-60"
                            : "bg-[#000d2b] border-blue-900/60 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-blue-950/80 border border-blue-800/50 shrink-0 mt-0.5">
                              <ModIcon className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="font-bold text-white truncate flex items-center gap-1.5">
                                <span>{mod.label}</span>
                              </div>
                              <p className="text-[11px] text-blue-200/70 line-clamp-2 leading-relaxed">
                                {mod.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {hasOverride ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 inline-block">
                                Override
                              </span>
                            ) : (
                              <span className="text-[9px] text-blue-300/60">
                                Inherited ({inheritedLevel})
                              </span>
                            )}
                            {hasOverride && (
                              <button
                                type="button"
                                onClick={() => handleResetCaseLevel(mod.id)}
                                className="block ml-auto text-[9px] text-slate-400 hover:text-white underline cursor-pointer mt-0.5"
                                title="Reset to role default"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Granular Level Buttons */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-blue-900/40">
                          <span className="text-[10px] text-slate-400 font-medium">Access Tier:</span>
                          <div className="flex items-center gap-1 bg-[#000820] p-1 rounded-lg border border-blue-900/60 shrink-0">
                            {mod.allowedLevels.includes("none") && (
                              <button
                                type="button"
                                onClick={() => handleSetCaseLevel(mod.id, "none")}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all flex items-center gap-1 ${
                                  effectiveLevel === "none"
                                    ? "bg-red-500/25 text-red-300 border border-red-500/40"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                <span>🚫</span>
                                <span>No Access</span>
                              </button>
                            )}

                            {mod.allowedLevels.includes("view") && (
                              <button
                                type="button"
                                onClick={() => handleSetCaseLevel(mod.id, "view")}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all flex items-center gap-1 ${
                                  effectiveLevel === "view"
                                    ? "bg-blue-500/30 text-sky-300 border border-blue-500/40"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                <span>👁</span>
                                <span>View Only</span>
                              </button>
                            )}

                            {mod.allowedLevels.includes("edit") && (
                              <button
                                type="button"
                                onClick={() => handleSetCaseLevel(mod.id, "edit")}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all flex items-center gap-1 ${
                                  effectiveLevel === "edit"
                                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </button>
                            )}

                            {mod.allowedLevels.includes("manage") && (
                              <button
                                type="button"
                                onClick={() => handleSetCaseLevel(mod.id, "manage")}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all flex items-center gap-1 ${
                                  effectiveLevel === "manage"
                                    ? "bg-amber-400/25 text-amber-300 border border-amber-400/40"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                <span>🔑</span>
                                <span>Manage</span>
                              </button>
                            )}
                          </div>
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

      {/* ── Section 3: CRM Sidebar Module Access ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>CRM Sidebar &amp; Top-Level Module Access</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Directly controls which 30 CRM modules appear in this employee's navigation bar and blocks direct route navigation if forbidden.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetModulesSection}
              className="text-[10px] font-semibold text-blue-300/80 hover:text-blue-100 flex items-center gap-1 cursor-pointer bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-900/60"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Modules to Defaults</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {moduleGroups.map((group) => {
            const groupModules = CRM_MODULES.filter((m) => m.group === group);
            return (
              <div key={group} className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
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

                        {/* Tri-state buttons: No Access | View | Edit */}
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

      {/* ── Section 4: Actions & Sensitive Permissions ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Actions &amp; Sensitive Permissions</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Fine-grained privileges for deletion, financial modifications, contracts, and system administration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetPermissionsSection}
              className="text-[10px] font-semibold text-blue-300/80 hover:text-blue-100 flex items-center gap-1 cursor-pointer bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-900/60"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Actions to Defaults</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {permCategories.map((category) => {
            const perms = PERMISSION_DEFINITIONS.filter((p) => p.category === category);
            return (
              <div key={category} className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {category}
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {perms.map((perm) => {
                    const isGranted = getEffectivePermission(perm.id);
                    const hasOverride = perm.id in permissionOverrides;
                    const inherited = isPermissionInherited(perm.id);

                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs cursor-pointer transition-all select-none ${
                          isGranted
                            ? "bg-[#000d2b] border-blue-800/80 hover:border-blue-700 shadow-sm"
                            : "bg-[#000820] border-blue-950/60 opacity-60 hover:opacity-80"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{perm.label}</span>
                            {hasOverride ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                                Override
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400">
                                ({inherited ? "Inherited On" : "Default Off"})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-blue-200/70 leading-relaxed">
                            {perm.description}
                          </p>

                          {hasOverride && (
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={(e) => handleResetPermission(perm.id, e)}
                                className="text-[9.5px] text-amber-300/80 hover:text-amber-200 underline cursor-pointer"
                              >
                                Reset to {inherited ? "Granted" : "Denied"}
                              </button>
                            </div>
                          )}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
