import React from "react";
import PageIdBadge from "@/components/PageIdBadge";
import NotesWorkspace from "@/components/braindump/NotesWorkspace";

export default function BrainDump() {
  return (
    <div className="w-full min-h-screen">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Advocate Workspace
          </span>
          <PageIdBadge id="PG-021" name="My Notes & Company Notes" />
        </div>
      </div>
      <NotesWorkspace
        scope="employee"
        targetEmployeeId="emp-byron-honea"
        targetEmployeeName="Byron Honea"
        isCeoOrAdmin={true}
        companyName="Waypoint Advocates"
      />
    </div>
  );
}
