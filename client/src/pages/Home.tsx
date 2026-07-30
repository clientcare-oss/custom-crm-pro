import { Button } from "@/components/ui/button";
import { ShieldCheck, Database, ArrowRight, UserCheck, LayoutDashboard } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              W
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Waypoint Advocates CRM
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/portal">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800/60">
                Client Portal
              </Button>
            </a>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-md shadow-cyan-500/20">
                  Sign In / Admin
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <a href="/dashboard">
                <Button variant="outline" className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800">
                  Dashboard
                </Button>
              </a>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
          <Database className="w-3.5 h-3.5" />
          Cloudflare D1 Database Active
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight mb-6 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Special Education Advocacy & Client Management System
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Manage contacts, leads, student profiles, case compass tracking, and client communications seamlessly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base shadow-xl shadow-cyan-500/25 transition-all">
                <LayoutDashboard className="w-5 h-5 mr-2" />
                Sign In to Admin Dashboard
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <a href="/">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base shadow-xl shadow-cyan-500/25 transition-all">
                <LayoutDashboard className="w-5 h-5 mr-2" />
                Open Admin Dashboard
              </Button>
            </a>
          </Show>
          <a href="/portal">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-base">
              <UserCheck className="w-5 h-5 mr-2" />
              Client Portal
            </Button>
          </a>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-3xl w-full text-left">
          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <ShieldCheck className="w-6 h-6 text-cyan-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Cloudflare Edge Storage</h3>
            <p className="text-xs text-slate-400">Powered by serverless Cloudflare D1 SQL for lightning fast queries.</p>
          </div>
          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <UserCheck className="w-6 h-6 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Client Management</h3>
            <p className="text-xs text-slate-400">Track cases, contacts, students, and advocates in one platform.</p>
          </div>
          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <LayoutDashboard className="w-6 h-6 text-indigo-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Case Compass</h3>
            <p className="text-xs text-slate-400">Real-time status, meeting summaries, and task step tracking.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        © Waypoint Advocates. All rights reserved. Connected to Cloudflare D1.
      </footer>
    </div>
  );
}
