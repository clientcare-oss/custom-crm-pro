/**
 * WaypointScanGlobalModal
 * Root-level subscriber component that listens to universal `openWaypointScan`
 * events and opens the Waypoint Scan modal from anywhere in the CRM.
 */

import React, { useState, useEffect } from "react";
import { WaypointScanModal } from "./WaypointScanModal";
import { subscribeWaypointScan, WaypointScanOpenOptions } from "@/lib/waypointScanEvents";

export function WaypointScanGlobalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<WaypointScanOpenOptions>({});

  useEffect(() => {
    const unsubscribe = subscribeWaypointScan((opt) => {
      setOptions(opt);
      setIsOpen(true);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  return (
    <WaypointScanModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      studentId={options.studentId}
      studentName={options.studentName}
      category={options.category}
      onSuccess={(title, ws) => {
        options.onSuccess?.(title, ws);
      }}
    />
  );
}

export default WaypointScanGlobalModal;
