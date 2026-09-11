import { describe, expect, it } from "vitest";
import { compileWaypointPdfs } from "../client/src/lib/pdfFinisher";
import { WaypointScanPageDraft, DocumentAnnotation } from "../client/src/lib/waypointScanStorage";

// 1x1 transparent PNG data URL for testing image embedding
const TEST_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("Waypoint Scan PDF Finisher", () => {
  it("compiles PDF cleanly with vector checkmarks, text, and signatures without WinAnsi errors", async () => {
    const page: WaypointScanPageDraft = {
      id: "page-test-1",
      dataUrl: TEST_PNG_DATA_URL,
      rotation: 0,
      timestamp: Date.now(),
    };

    const annotations: DocumentAnnotation[] = [
      {
        id: "check-1",
        type: "check",
        x: 25,
        y: 30,
        fontSize: 14, // Minimum checkmark size
      },
      {
        id: "check-2",
        type: "check",
        x: 50,
        y: 30,
        fontSize: 24, // Medium checkmark
      },
      {
        id: "date-1",
        type: "date",
        x: 35,
        y: 75,
        content: "09/11/2026",
        fontSize: 12,
      },
      {
        id: "text-1",
        type: "text",
        x: 40,
        y: 60,
        content: "Parent Consent Approved",
        fontSize: 14,
      },
      {
        id: "sig-1",
        type: "signature",
        x: 80,
        y: 88,
        content: TEST_PNG_DATA_URL,
        width: 24,
      },
    ];

    const result = await compileWaypointPdfs([page], { [page.id]: annotations }, "Test Document");

    expect(result).toBeDefined();
    expect(result.originalBytes).toBeInstanceOf(Uint8Array);
    expect(result.completedBytes).toBeInstanceOf(Uint8Array);
    expect(result.originalBytes.byteLength).toBeGreaterThan(100);
    expect(result.completedBytes.byteLength).toBeGreaterThan(100);
    expect(result.completedFileName).toBe("Test Document - Completed.pdf");
  });

  it("handles extreme minimum and maximum sizes gracefully", async () => {
    const page: WaypointScanPageDraft = {
      id: "page-test-2",
      dataUrl: TEST_PNG_DATA_URL,
      rotation: 0,
      timestamp: Date.now(),
    };

    const annotations: DocumentAnnotation[] = [
      {
        id: "tiny-check",
        type: "check",
        x: 10,
        y: 10,
        fontSize: 10, // Below minimum, should clamp to 14
      },
      {
        id: "giant-sig",
        type: "signature",
        x: 50,
        y: 50,
        content: TEST_PNG_DATA_URL,
        width: 75, // Above max, should clamp to 55
      },
    ];

    const result = await compileWaypointPdfs([page], { [page.id]: annotations }, "Clamped Document");
    expect(result.completedBytes.byteLength).toBeGreaterThan(100);
  });
});
