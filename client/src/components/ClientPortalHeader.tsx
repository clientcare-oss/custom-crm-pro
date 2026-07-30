import React from "react";
import { Sun, Moon, Link2, Calendar, LogOut } from "lucide-react";

interface ClientPortalHeaderProps {
  displayName: string;
  theme: string;
  onToggleTheme: () => void;
  onOpenIepLinkDialog: () => void;
  onOpenScheduler: () => void;
  onLogout: () => void;
}

export function ClientPortalHeader({
  displayName,
  theme,
  onToggleTheme,
  onOpenIepLinkDialog,
  onOpenScheduler,
  onLogout,
}: ClientPortalHeaderProps) {
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "BH";

  return (
    <div
      className="relative shrink-0 overflow-hidden border-b border-white/10"
      style={{
        background: `linear-gradient(to right, #071422 0%, #0d1b2a 40%, rgba(13,27,42,0.7) 70%, rgba(13,27,42,0.4) 100%), url('/storage/lighthouse-header-bg_485f0bf3.jpg') center/cover no-repeat`,
        minHeight: "90px",
      }}
    >
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        {/* Left: Title + Welcome */}
        <div>
          <h1 className="text-xl font-serif font-bold text-white tracking-wide">Client Portal</h1>
          <p className="text-sm text-amber-400 font-medium mt-0.5">
            Welcome, <span className="font-semibold">{displayName}</span>
          </p>
        </div>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:border-amber-400/50 transition-all"
            title={theme === "navy" ? "Light mode" : "Dark mode"}
          >
            {theme === "navy" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-300" />}
          </button>

          {/* Send Advocate Meeting Link */}
          <button
            onClick={onOpenIepLinkDialog}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/20 bg-white/5 hover:border-amber-400/50 hover:bg-white/10 text-white/80 hover:text-amber-300 text-xs font-semibold transition-all"
          >
            <Link2 className="h-4 w-4 text-amber-400" />
            <span>Send Advocate My IEP Meeting Link</span>
          </button>

          {/* Schedule Meeting Button */}
          <button
            onClick={onOpenScheduler}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#071422] font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            <Calendar className="h-4 w-4" />
            Schedule Meeting
          </button>

          {/* User Avatar Circle */}
          <div className="relative group">
            <button className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition-all shadow-md">
              {initials}
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#0d1b2a] border border-white/15 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 p-1">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <LogOut className="h-3.5 w-3.5 text-red-400" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
