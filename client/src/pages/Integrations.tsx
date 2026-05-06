import { Plug } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Integrations() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Plug className="h-7 w-7 text-accent" />
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground">Connect external apps and services to your CRM</p>
        </div>
      </div>
      <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
        <Plug className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Integrations — Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Connect Google Calendar, Zoom, email providers, payment processors, and more. This feature is under development.
        </p>
      </Card>
    </div>
  );
}
