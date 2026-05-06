import { LayoutTemplate } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Templates() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <LayoutTemplate className="h-7 w-7 text-accent" />
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">Manage reusable templates for documents, emails, and more</p>
        </div>
      </div>
      <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
        <LayoutTemplate className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Templates — Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Create and manage reusable templates for IEP documents, emails, contracts, and meeting agendas. This feature is under development.
        </p>
      </Card>
    </div>
  );
}
