import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function LeadForms() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="h-7 w-7 text-accent" />
        <div>
          <h1 className="text-2xl font-bold">Lead Forms</h1>
          <p className="text-sm text-muted-foreground">Build and manage intake forms to capture new leads</p>
        </div>
      </div>
      <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
        <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Lead Forms — Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Create custom intake forms to capture new leads and automatically add them to your pipeline. This feature is under development.
        </p>
      </Card>
    </div>
  );
}
