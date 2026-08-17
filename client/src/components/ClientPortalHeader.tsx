import React from "react";
import { Sun, Moon, Link2, Calendar, LogOut } from "lucide-react";
import { Link } from "wouter";

interface ClientPortalHeaderProps {
  displayName: string;
  parentContactId?: number | null;
  theme: string;
  onToggleTheme: () => void;
  onOpenIepLinkDialog: () => void;
  onOpenScheduler: () => void;
  onLogout: () => void;
}

export function ClientPortalHeader({
  displayName,
  parentContactId,
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

  const isLight = theme === "blue";

  return (
    <div
      className={`relative shrink-0 overflow-hidden border-b transition-colors duration-[3000ms] ease-in-out ${
        isLight ? "border-slate-200" : "border-white/10"
      }`}
      style={{ minHeight: "70px" }}
    >
      {/* Dark background panel */}
      <div 
        className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out pointer-events-none"
        style={{
          background: `linear-gradient(to right, #071422 0%, #0d1b2a 40%, rgba(13,27,42,0.7) 70%, rgba(13,27,42,0.4) 100%), url('/compass-bg.jpg') center/cover no-repeat`,
          opacity: isLight ? 0 : 1,
        }}
      />
      {/* Light background panel */}
      <div 
        className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out pointer-events-none"
        style={{
          background: `linear-gradient(to right, #f8fafc 0%, #e2e8f0 40%, rgba(226,232,240,0.7) 70%, rgba(226,232,240,0.4) 100%), url('/compass-bg.jpg') center/cover no-repeat`,
          opacity: isLight ? 1 : 0,
        }}
      />

      <div className="relative z-10 flex items-center justify-between px-6 py-3">
        {/* Left: Title + Welcome */}
        <div>
          <h1 
            className={`text-lg font-bold tracking-wide transition-colors duration-[3000ms] ease-in-out ${isLight ? "text-slate-800" : "text-white"}`}
            style={{ fontFamily: "'Libre Baskerville', serif" }}
          >
            Waypoint Advocates
          </h1>
          <p className={`text-xs font-medium mt-0.5 transition-colors duration-[3000ms] ease-in-out ${isLight ? "text-amber-800" : "text-amber-400"}`}>
            Welcome,{" "}
            {parentContactId ? (
              <Link href={`/contacts/${parentContactId}`} className="font-semibold underline hover:text-amber-500 transition-colors">
                {displayName}
              </Link>
            ) : (
              <span className="font-semibold">{displayName}</span>
            )}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className={`relative w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden transition-all duration-[3000ms] ease-in-out ${
              isLight 
                ? "border-slate-350 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400" 
                : "border-white/20 bg-white/5 text-white/70 hover:text-white hover:border-amber-400/50"
            }`}
            title={isLight ? "Dark mode" : "Light mode"}
          >
            {/* Sun Icon (rises and rotates in light mode) */}
            <Sun className={`absolute h-4 w-4 text-amber-500 transition-all duration-[3000ms] ease-in-out transform ${
              isLight 
                ? "translate-y-0 rotate-0 scale-100 opacity-100" 
                : "translate-y-6 -rotate-90 scale-50 opacity-0"
            }`} />
            {/* Moon Icon (sets and rotates in dark mode) */}
            <Moon className={`absolute h-4 w-4 text-indigo-400 transition-all duration-[3000ms] ease-in-out transform ${
              !isLight 
                ? "translate-y-0 rotate-0 scale-100 opacity-100" 
                : "-translate-y-6 rotate-90 scale-50 opacity-0"
            }`} />
          </button>

          {/* Schedule Meeting Button */}
          <button
            onClick={onOpenScheduler}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg transition-all ${
              isLight 
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10" 
                : "bg-amber-500 hover:bg-amber-400 text-[#071422] shadow-amber-500/20"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Schedule Meeting
          </button>

          {/* User Avatar Circle */}
          <div className="relative group">
            <button className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all shadow-md ${
              isLight 
                ? "bg-amber-500/10 border-amber-500 text-amber-700 hover:bg-amber-500/20" 
                : "bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30"
            }`}>
              {initials}
            </button>

            {/* Dropdown Menu */}
            <div className={`absolute right-0 top-full mt-1.5 w-44 border rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 p-1 ${
              isLight ? "bg-white border-slate-200" : "bg-[#0d1b2a] border-white/15"
            }`}>
              <button
                onClick={onLogout}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  isLight 
                    ? "text-slate-650 hover:text-slate-900 hover:bg-slate-50" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <LogOut className="h-3.5 w-3.5 text-red-500" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
