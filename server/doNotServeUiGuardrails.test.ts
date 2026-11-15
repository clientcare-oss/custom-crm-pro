import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

describe("Archive & Do Not Serve — UI, Sidebar, Design, Isolation & Codebase Guardrails", () => {
  it("provides exactly ONE sidebar item labeled 'Archive' with FileBox icon and no duplicate entries", () => {
    const sidebarSrc = readRel("client/src/components/DashboardLayout.tsx");
    expect(sidebarSrc).toContain("FileBox");
    expect(sidebarSrc).toContain('id: "archive"');
    expect(sidebarSrc).toContain('label: "Archive"');
    expect(sidebarSrc).toContain('path: "/archive"');
    expect(sidebarSrc).not.toContain('label: "Do Not Serve"');
    const archiveNavIdMatches = sidebarSrc.match(/id:\s*"archive"/g) || [];
    expect(archiveNavIdMatches).toHaveLength(1);
    const givingIdx = sidebarSrc.indexOf('id: "giving"');
    const archiveIdx = sidebarSrc.indexOf('id: "archive"');
    const settingsIdx = sidebarSrc.indexOf('id: "settings"');
    expect(givingIdx).toBeGreaterThan(0);
    expect(archiveIdx).toBeGreaterThan(givingIdx);
    expect(settingsIdx).toBeGreaterThan(archiveIdx);
  });

  it("renders 'Archive' overall page heading with 'Archived records' and 'Do Not Serve' local views", () => {
    const pageSrc = readRel("client/src/pages/DoNotServe.tsx");
    expect(pageSrc).toMatch(/<h1[^>]*>\s*Archive\s*<\/h1>/);
    expect(pageSrc).toContain("Archived records");
    expect(pageSrc).toContain("Do Not Serve");
    expect(pageSrc).toContain("overflow-x-hidden");
    expect(pageSrc).toContain("Search name, phone, or email");
    expect(pageSrc).toContain("Add person");
  });

  it("enforces canonical #000820 dark navy, matte gold #DFC07C, responsive overflow guards, and zero orange", () => {
    const dnsUiFiles = [
      "client/src/pages/DoNotServe.tsx",
      "client/src/components/do-not-serve/ArchivedRecordsSection.tsx",
      "client/src/components/do-not-serve/doNotServeStyles.ts",
      "client/src/components/do-not-serve/BlacklistClientDrawer.tsx",
      "client/src/components/do-not-serve/AddRestrictedPersonDrawer.tsx",
      "client/src/components/do-not-serve/DoNotServeDetailDrawer.tsx",
      "client/src/components/do-not-serve/DoNotServeNotesAndHistorySection.tsx",
      "client/src/components/do-not-serve/DoNotServeAlertComponents.tsx",
      "client/src/components/do-not-serve/DoNotServeChannelGuard.tsx",
    ];

    const stylesSrc = readRel("client/src/components/do-not-serve/doNotServeStyles.ts");
    expect(stylesSrc).toContain("#000820");
    expect(stylesSrc).toContain("#DFC07C");

    for (const rel of dnsUiFiles) {
      const content = readRel(rel);
      expect(content).not.toMatch(/orange-\d{2,3}|#f97316|#ea580c|#fb923c/i);
      expect(content).not.toMatch(/animate-ping|animate-bounce/i);
    }
  });

  it("verifies exact calm alert copy, Blacklist client drawer copy, and PG-048 registration", () => {
    const alertSrc = readRel("client/src/components/do-not-serve/DoNotServeAlertComponents.tsx");
    expect(alertSrc).toContain("Do Not Serve match");
    expect(alertSrc).toContain(
      "This contact information matches a restricted record. Review before proceeding."
    );
    expect(alertSrc).toContain("View restriction");
    expect(alertSrc).toContain("Acknowledge");
    expect(alertSrc).toContain("Possible restricted match");
    expect(alertSrc).toContain(
      "This name matches a restricted record. Verify the contact details before proceeding."
    );
    expect(alertSrc).toContain("Review match");
    expect(alertSrc).toContain("Different person");

    const blacklistSrc = readRel("client/src/components/do-not-serve/BlacklistClientDrawer.tsx");
    expect(blacklistSrc).toContain("Blacklist client");
    expect(blacklistSrc).toContain("Reason for restriction");
    expect(blacklistSrc).toContain("Additional notes");
    expect(blacklistSrc).toContain("Employee stamp · Automatic");
    expect(blacklistSrc).toContain("Adds to Do Not Serve and enables matching alerts.");
    expect(blacklistSrc).toContain("Save restriction");

    const registrySrc = readRel("client/src/lib/pageIdRegistry.ts");
    expect(registrySrc).toContain('"PG-048"');
    expect(registrySrc).toContain('"/archive"');
    expect(registrySrc).toContain('"PG-048-DNS"');
    expect(registrySrc).toContain('"/do-not-serve"');
  });

  it("guarantees zero Do Not Serve leakage in Parent Portal and public form surfaces", () => {
    const publicAndPortalFiles = [
      "client/src/pages/ClientPortal.tsx",
      "client/src/pages/IntakeForm.tsx",
      "client/src/pages/PublicForm.tsx",
      "client/src/pages/BookingPage.tsx",
    ].filter((p) => fs.existsSync(path.join(ROOT, p)));

    const portalDir = path.join(ROOT, "client/src/components/portal");
    if (fs.existsSync(portalDir)) {
      for (const entry of fs.readdirSync(portalDir)) {
        if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
          publicAndPortalFiles.push(`client/src/components/portal/${entry}`);
        }
      }
    }

    expect(publicAndPortalFiles.length).toBeGreaterThan(0);
    for (const rel of publicAndPortalFiles) {
      const content = readRel(rel);
      expect(content).not.toMatch(/doNotServe|do-not-serve|DoNotServe|BlacklistClientDrawer/);
    }
  });

  it("enforces AGENTS.md file size modularity and strict terminology guardrails across new files", () => {
    const newFiles = [
      "shared/doNotServe.ts",
      "shared/workspaceLockPolicy.ts",
      "drizzle/doNotServeSchema.ts",
      "server/db/doNotServe.ts",
      "server/db/doNotServeMutations.ts",
      "server/db/doNotServeNotesAndResolutions.ts",
      "server/services/doNotServeSync.ts",
      "server/services/doNotServeService.ts",
      "server/services/doNotServeMarketing.ts",
      "server/routers/doNotServe.ts",
      "server/routers/doNotServeActions.ts",
      "server/doNotServe.test.ts",
      "server/doNotServeMarketing.test.ts",
      "client/src/pages/DoNotServe.tsx",
      "client/src/components/do-not-serve/ArchivedRecordsSection.tsx",
      "client/src/components/do-not-serve/doNotServeStyles.ts",
      "client/src/components/do-not-serve/BlacklistClientDrawer.tsx",
      "client/src/components/do-not-serve/AddRestrictedPersonDrawer.tsx",
      "client/src/components/do-not-serve/DoNotServeDetailDrawer.tsx",
      "client/src/components/do-not-serve/DoNotServeNotesAndHistorySection.tsx",
      "client/src/components/do-not-serve/DoNotServeAlertComponents.tsx",
      "client/src/components/do-not-serve/DoNotServeChannelGuard.tsx",
    ];

    for (const rel of newFiles) {
      const content = readRel(rel);
      const lineCount = content.split(/\r?\n/).length;
      expect(lineCount, `${rel} exceeded 800-line hard cap (${lineCount})`).toBeLessThanOrEqual(800);
      expect(content).not.toMatch(/Master\s+Coach|Master\s+IEP|Master\s+Coaching/i);
    }
  });
});
