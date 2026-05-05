import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import { useState } from "react";
import ClientPortal from "@/pages/ClientPortal";

/**
 * ClientPortalPreview - Allows admins to preview the client portal experience
 * without needing to create a fake client account
 */
export function ClientPortalPreview() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
      >
        <Eye className="h-4 w-4" />
        Preview Client Portal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4 flex items-center justify-between">
            <DialogTitle>Client Portal Preview</DialogTitle>
            <Button
              onClick={() => setOpen(false)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-md hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {/* Client Portal Preview - Simulated as client role */}
          <div className="bg-background">
            <ClientPortal />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
