// Helper for testing unread message pulse alerts across the CRM

export function getTestUnreadState(): boolean {
  try {
    return localStorage.getItem("waypoint_test_unread_messages") === "true";
  } catch {
    return false;
  }
}

export function setTestUnreadState(active: boolean): void {
  try {
    localStorage.setItem("waypoint_test_unread_messages", active ? "true" : "false");
    window.dispatchEvent(
      new CustomEvent("waypoint-test-unread-changed", { detail: { active } })
    );
  } catch {}
}
