import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck, ArrowRight, Users, Key } from "lucide-react";
import { toast } from "sonner";

export default function Workspace() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    toast.info("Workspace Manager has been consolidated into Team → Permissions & Access.", {
      id: "workspace-consolidated",
      duration: 4000,
    });
    const timer = setTimeout(() => {
      setLocation("/team");
    }, 1200);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full p-8 rounded-2xl border border-blue-900/60 bg-[#000d2b] text-white shadow-2xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
          <Key className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            Workspace Manager Consolidated
          </h2>
          <p className="text-xs text-blue-200/70 leading-relaxed">
            Workspace layout controls, employee roles, Case Workspace tabs, and operational permissions have been consolidated into{" "}
            <span className="text-amber-300 font-semibold">Team → Manage Employee → Permissions &amp; Access</span> as the single source of truth throughout the CRM.
          </p>
        </div>

        <div className="pt-2">
          <Button
            onClick={() => setLocation("/team")}
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl py-2.5 gap-2 shadow-lg cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Go to Team Management</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>

        <p className="text-[10px] text-slate-400">
          Redirecting automatically to <code>/team</code>...
        </p>
      </Card>
    </div>
  );
}
