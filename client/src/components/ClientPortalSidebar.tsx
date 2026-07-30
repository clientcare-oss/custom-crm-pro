import React from "react";
import {
  Compass, MessageSquare, CheckSquare, FileText, FolderOpen, Wrench,
  Briefcase, DollarSign, Calendar, StickyNote, Info, Sun, Moon, LogOut, X
} from "lucide-react";

const LOGO_URL = "/storage/waypoint-logo-new_dbe73a36.png";

export const NAV_ITEMS = [
  { id: "compass",       icon: Compass,        label: "Compass" },
  { id: "communication", icon: MessageSquare,   label: "Communication" },
  { id: "tasks",         icon: CheckSquare,     label: "Tasks" },
  { id: "smart-docs",    icon: FileText,        label: "Documents" },
  { id: "files",         icon: FolderOpen,      label: "Files" },
  { id: "tools",         icon: Wrench,          label: "Tools" },
  { id: "cases",         icon: Briefcase,       label: "Cases" },
  { id: "financials",    icon: DollarSign,      label: "Billing" },
  { id: "appointments",  icon: Calendar,        label: "Appointments" },
  { id: "notes",         icon: StickyNote,      label: "Notes" },
  { id: "details",       icon: Info,            label: "Details" },
] as const;

export type NavId = typeof NAV_ITEMS[number]["id"];

interface ClientPortalSidebarProps {
  activeTab: NavId;
  onSelectTab: (tab: NavId) => void;
  mobile?: boolean;
  onCloseMobile?: () => void;
  displayName: string;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function ClientPortalSidebar({
  activeTab,
  onSelectTab,
  mobile = false,
  onCloseMobile,
  displayName,
  theme,
  onToggleTheme,
  onLogout,
}: ClientPortalSidebarProps) {
  return (
    <div className={`flex flex-col h-full bg-[#071422] border-r border-white/10 ${mobile ? "w-72" : "w-64 shrink-0"}`}>
      {/* Header Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-white/8">
        <img src={LOGO_URL} alt="Waypoint Advocates" className="h-10 w-10 object-contain shrink-0" />
        <div>
          <p className="text-sm font-bold tracking-widest text-white uppercase leading-tight font-serif">Waypoint</p>
          <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">Advocates</p>
        </div>
        {mobile && (
          <button onClick={onCloseMobile} className="ml-auto text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                onSelectTab(id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all text-sm font-medium
                ${isActive
                  ? "border border-amber-400/80 text-amber-300 bg-amber-400/10 shadow-lg shadow-amber-500/10"
                  : "border border-transparent text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-400" : "text-white/40"}`} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Quote Banner Box (as seen in Mockup) */}
      <div className="px-3 py-2">
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3.5 text-center relative overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/30 mx-auto flex items-center justify-center mb-2">
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-[11px] text-slate-300 leading-snug font-serif">
            No one should have to navigate special education alone.
          </p>
          <p className="text-[11px] font-semibold text-amber-400 mt-1">
            We're here for you.
          </p>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="px-3 pb-4 pt-3 border-t border-white/8 space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <button
            onClick={onToggleTheme}
            title={theme === "navy" ? "Light mode" : "Dark mode"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/70 text-xs"
          >
            {theme === "navy" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-300" />}
            <span>{theme === "navy" ? "Light" : "Dark"}</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-red-400 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>

        <div className="px-1 pt-1">
          <p className="text-xs font-medium text-white/60 truncate">{displayName}</p>
        </div>
      </div>
    </div>
  );
}
