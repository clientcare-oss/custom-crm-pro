import React from "react";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, UserCheck, LayoutDashboard, Calendar, FileText, Lock, Sparkles, Compass } from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/react";

// Gold Compass Rose Graphic
function GoldCompassRose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="compassGlowHome" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0B172A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goldGradHome" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D77F" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#AA7C11" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="url(#compassGlowHome)" />
      <circle cx="60" cy="60" r="48" stroke="url(#goldGradHome)" strokeWidth="1.5" opacity="0.8" />
      <circle cx="60" cy="60" r="40" stroke="url(#goldGradHome)" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.5" />
      <polygon points="60,12 55,60 60,54 65,60" fill="url(#goldGradHome)" />
      <polygon points="60,108 55,60 60,66 65,60" fill="url(#goldGradHome)" opacity="0.6" />
      <polygon points="12,60 60,55 54,60 60,65" fill="url(#goldGradHome)" opacity="0.6" />
      <polygon points="108,60 60,55 66,60 60,65" fill="url(#goldGradHome)" opacity="0.9" />
      <circle cx="60" cy="60" r="8" stroke="url(#goldGradHome)" strokeWidth="1.5" fill="#0B172A" />
      <circle cx="60" cy="60" r="3" fill="url(#goldGradHome)" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#040C16] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans">
      
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-[#071422]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GoldCompassRose className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="font-serif font-bold text-base tracking-wide text-white">
                Waypoint Advocates
              </span>
              <span className="text-[10px] text-amber-400 font-medium tracking-wider uppercase">
                Professional Advocacy Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href="/portal">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800/60 text-xs">
                Parent Portal
              </Button>
            </a>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20">
                  Sign In <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <a href="/dashboard">
                <Button variant="outline" className="border-amber-400/30 text-amber-300 hover:bg-amber-400/10 text-xs">
                  Open Dashboard
                </Button>
              </a>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      {/* Main Hero / Portal Gateway */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Special Education IEP Advocacy Platform
        </div>

        <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight max-w-3xl leading-tight mb-4 text-white">
          Guided by Knowledge. Driven by Advocacy.
        </h1>

        <p className="text-sm sm:text-base text-slate-300/80 max-w-xl mb-12 leading-relaxed font-sans">
          Welcome to the Waypoint Advocates portal. Access your student's case compass, IEP documentation, scheduled meetings, and advocate communications.
        </p>

        {/* Portal Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full text-left">
          
          {/* Card 1: Advocate & Staff Access */}
          <div className="bg-[#0A1628]/95 border border-slate-700/60 hover:border-amber-400/40 rounded-2xl p-6 shadow-2xl backdrop-blur-sm flex flex-col justify-between space-y-6 transition-all group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-serif">Advocate & Staff Portal</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Internal advocate management suite for student cases, discovery intake worksheets, state complaint drafting, and client records.
                </p>
              </div>
            </div>

            <div>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-2">
                    <Lock className="w-3.5 h-3.5" /> Staff Sign In
                  </Button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <a href="/dashboard" className="w-full block">
                  <Button className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Open Admin Dashboard
                  </Button>
                </a>
              </Show>
            </div>
          </div>

          {/* Card 2: Parent & Family Access */}
          <div className="bg-[#0A1628]/95 border border-slate-700/60 hover:border-amber-400/40 rounded-2xl p-6 shadow-2xl backdrop-blur-sm flex flex-col justify-between space-y-6 transition-all group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-serif">Parent & Family Portal</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Client portal for parents to view student Case Compass updates, upcoming IEP meetings, signed agreements, and advocate messages.
                </p>
              </div>
            </div>

            <a href="/portal" className="w-full block">
              <Button variant="outline" className="w-full border-slate-700 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-slate-100 hover:text-amber-300 font-bold text-xs gap-2">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Enter Parent Portal →
              </Button>
            </a>
          </div>

        </div>

        {/* Public Access Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-slate-400">
          <a href="/form/public-intake" className="hover:text-amber-300 transition-colors flex items-center gap-1.5 font-medium">
            <FileText className="w-3.5 h-3.5 text-amber-400" /> New Student Intake Form
          </a>
          <span className="text-slate-700">•</span>
          <a href="/portal/book" className="hover:text-amber-300 transition-colors flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-400" /> Schedule Discovery Call
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#071422]/90 py-4 px-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        <p className="font-serif italic text-amber-400/90">
          Waypoint Advocates — Special Education Advocacy Platform
        </p>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1 text-slate-300 font-medium">
            <Shield className="w-3.5 h-3.5 text-amber-400" /> Encrypted FERPA-Protected Records
          </span>
        </div>
      </footer>

    </div>
  );
}
