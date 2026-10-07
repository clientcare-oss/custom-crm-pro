import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ScheduleDispatchConsole from "./ScheduleDispatchConsole";

export type ScheduleActionType =
  | "MEETINGS"
  | "CLIENT_SESSIONS"
  | "HOLDS"
  | "BLOCKS"
  | "INTERNAL"
  | "BLUEPRINT"
  // Backward compatibility:
  | "CONFIRMED_APPOINTMENT"
  | "PROPOSED_HOLDS"
  | "BLOCK_TIME"
  | "OFFICE_CLOSURE"
  | "INTERNAL_EVENT";

export interface MasterScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialTime?: string;
  advocateList?: { id: string; name: string }[];
  defaultAction?: ScheduleActionType;
}

export default function MasterScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialTime,
  advocateList,
  defaultAction,
}: MasterScheduleModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] w-[1720px] max-h-[96vh] p-0 border-none bg-transparent shadow-none overflow-y-auto [&>button]:hidden">
        <ScheduleDispatchConsole
          initialDate={initialDate}
          initialTime={initialTime}
          advocateList={advocateList}
          defaultAction={defaultAction}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
          onClose={onClose}
          isSubPage={false}
        />
      </DialogContent>
    </Dialog>
  );
}
