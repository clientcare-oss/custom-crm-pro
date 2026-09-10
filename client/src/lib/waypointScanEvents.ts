/**
 * Waypoint Scan Universal Event Dispatcher
 * Allows triggering the Waypoint Scan modal from anywhere in the CRM.
 */

export interface WaypointScanOpenOptions {
  studentId?: number;
  studentName?: string;
  category?: string;
  projectId?: number;
  onSuccess?: (docTitle: string, workspaceName: string) => void;
}

const EVENT_NAME = "waypoint-scan:open";

export function openWaypointScan(options?: WaypointScanOpenOptions) {
  if (typeof window === "undefined") return;
  const event = new CustomEvent(EVENT_NAME, {
    detail: options || {},
  });
  window.dispatchEvent(event);
}

export function subscribeWaypointScan(
  callback: (options: WaypointScanOpenOptions) => void
) {
  if (typeof window === "undefined") return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<WaypointScanOpenOptions>;
    callback(customEvent.detail || {});
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}
