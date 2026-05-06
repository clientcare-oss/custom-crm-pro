import { Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Automations() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-7 w-7 text-accent" />
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-sm text-muted-foreground">Build workflows and automated sequences to save time</p>
        </div>
      </div>
      <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
        <Zap className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Automations — Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Create trigger-based workflows to automate follow-ups, task creation, notifications, and more. This feature is under development.
        </p>
      </Card>
    </div>
  );
}
