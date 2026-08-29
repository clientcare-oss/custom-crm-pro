import React from "react";
import { StateEngineRule } from "./types";
import { STATE_ENGINE_RULES } from "./journeyData";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Cpu, 
  Layers, 
  Database, 
  Workflow, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  GitBranch,
  Sparkles,
  Server
} from "lucide-react";

export function StateEngineMatrix() {
  return (
    <div className="space-y-6">
      {/* Architecture Overview Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-card to-background shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Cpu className="h-4 w-4" />
            Dynamic Experience Architecture & Resolution Hierarchy
          </div>
          <CardTitle className="text-lg font-bold text-foreground">
            Account / Household → Students → Cases
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed">
            The Client Portal is an authenticated reusable application. The authenticated user's Household ID 
            determines their dynamic state, students, cases, documents, appointments, and progress. 
            Individual client information is never hardcoded.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="bg-muted/40 p-3 rounded-lg border border-border/40 space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              1. Household Scope
            </span>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Maps primary parents, contact records, billing ledger, and authorized family users.
            </p>
          </div>

          <div className="bg-muted/40 p-3 rounded-lg border border-border/40 space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
              2. Student Scope
            </span>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Supports 1 to multiple students per household with independent IEPs, goals, and school profiles.
            </p>
          </div>

          <div className="bg-muted/40 p-3 rounded-lg border border-border/40 space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Workflow className="h-3.5 w-3.5 text-emerald-500" />
              3. Case / Stage Scope
            </span>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Drives Case Compass stage, active tasks, meeting countdowns, and progressive onboarding status.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* State Engine Matrix Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            10-State Portal Experience Resolution Matrix
          </h3>
          <span className="text-xs text-muted-foreground">Deterministic Routing Engine</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {STATE_ENGINE_RULES.map((rule) => (
            <Card key={rule.state} className="border-border/60 hover:border-border transition-all bg-card/80">
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                {/* State Tag and Label */}
                <div className="md:w-1/4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`font-mono text-[10px] font-bold ${rule.color}`}>
                      {rule.state}
                    </Badge>
                  </div>
                  <p className="font-bold text-foreground text-sm">{rule.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{rule.description}</p>
                </div>

                {/* Resolved Experience */}
                <div className="md:w-1/3 bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Resolved Experience
                  </span>
                  <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    {rule.resolvedExperience}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {rule.householdResolution}
                  </p>
                </div>

                {/* Entry Triggers & Exit */}
                <div className="md:w-1/3 space-y-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Entry Trigger(s)
                    </span>
                    <p className="text-[11px] text-foreground font-medium">
                      {rule.entryTriggers.join(" · ")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Exit Condition
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {rule.exitCondition}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
