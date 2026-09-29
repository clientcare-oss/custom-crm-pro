import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "admin-user-1",
      email: "advocate@waypoint.com",
      name: "Byron Advocate",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: { "user-agent": "Vitest-Test-Runner" },
      ip: "127.0.0.1",
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

function createClientContext(userId: number = 2): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `client-user-${userId}`,
      email: `parent${userId}@example.com`,
      name: `Parent User ${userId}`,
      loginMethod: "manus",
      role: "client",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: { "user-agent": "Client-Portal-Browser" },
      ip: "192.168.1.100",
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

describe("Agreements Engine (PG-046)", () => {
  it("TEST A: Creates, retrieves, and updates an agreement template with rich content and merge tags", async () => {
    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    const templateResult = await adminCaller.agreements.saveTemplate({
      name: "Advocacy Standard Agreement Test",
      description: "Standard terms for educational representation",
      agreementType: "service_agreement",
      content: "<h2>AGREEMENT</h2><p>Agreement for {{client_name}} regarding {{student_name}}.</p>",
      requiredAcknowledgments: JSON.stringify([
        { id: "ack-1", text: "I confirm legal authority to sign", required: true },
      ]),
      initialsRequired: 1,
      status: "active",
    });

    expect(templateResult.success).toBe(true);
    expect(templateResult.id).toBeDefined();

    const fetchedTemplate = await adminCaller.agreements.getTemplate({ id: templateResult.id! });
    expect(fetchedTemplate.name).toBe("Advocacy Standard Agreement Test");
    expect(fetchedTemplate.content).toContain("{{client_name}}");
    expect(fetchedTemplate.initialsRequired).toBe(1);
  });

  it("TEST B & C: Generates an agreement snapshot with resolved CRM tokens, creates signers, and sends", async () => {
    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    // 1. Create Template
    const template = await adminCaller.agreements.saveTemplate({
      name: "Student Representation Agreement",
      agreementType: "service_agreement",
      content: "<p>Representation agreement for {{client_name}} on behalf of {{student_name}}.</p>",
      status: "active",
    });

    // 2. Generate Agreement from template for contact ID 1
    const generated = await adminCaller.agreements.createFromTemplate({
      templateId: template.id!,
      clientId: 1,
      title: "Generated Case Agreement",
      internalNotes: "Generated via automated test suite",
      sendImmediately: false,
    });

    expect(generated.success).toBe(true);
    expect(generated.id).toBeDefined();

    // 3. Verify snapshot content and Draft status
    const agreementRecord = await adminCaller.agreements.get({ id: generated.id });
    expect(agreementRecord.agreement.status).toBe("Draft");
    expect(agreementRecord.agreement.contentLocked).toBe(0);
    expect(agreementRecord.agreement.mergeFieldSnapshot).toBeDefined();
    expect(agreementRecord.signers.length).toBeGreaterThan(0);
    expect(agreementRecord.signers[0].role).toBe("client");

    // 4. Send Agreement
    const sendResult = await adminCaller.agreements.send({ id: generated.id });
    expect(sendResult.success).toBe(true);

    const sentRecord = await adminCaller.agreements.get({ id: generated.id });
    expect(sentRecord.agreement.status).toBe("Sent");
    expect(sentRecord.agreement.sentAt).toBeDefined();
  });

  it("TEST D: Client marks agreement as viewed upon portal inspection", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const template = await adminCaller.agreements.saveTemplate({
      name: "Portal View Test Template",
      content: "<p>Terms to view</p>",
      status: "active",
    });

    const agreement = await adminCaller.agreements.createFromTemplate({
      templateId: template.id!,
      clientId: 1,
      sendImmediately: true,
    });

    // Client views agreement
    const clientCaller = appRouter.createCaller(createClientContext(1));
    const portalData = await clientCaller.agreements.clientGet({ id: agreement.id });

    expect(portalData.agreement.id).toBe(agreement.id);
    expect(portalData.agreement.viewedAt).toBeDefined();
    expect(portalData.agreement.status).toBe("Awaiting_Signature");
  });

  it("TEST E: Blocks execution when required acknowledgments are incomplete", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const template = await adminCaller.agreements.saveTemplate({
      name: "Strict Acknowledgment Agreement",
      content: "<p>Strict terms</p>",
      requiredAcknowledgments: JSON.stringify([
        { id: "ack-1", text: "Must acknowledge privacy rights", required: true },
      ]),
      status: "active",
    });

    const agreement = await adminCaller.agreements.createFromTemplate({
      templateId: template.id!,
      clientId: 1,
      sendImmediately: true,
    });

    const clientCaller = appRouter.createCaller(createClientContext(1));

    // Attempting to sign without acknowledging ack-1
    await expect(
      clientCaller.agreements.clientSign({
        id: agreement.id,
        signerName: "John Doe",
        signaturePngBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        acknowledgments: [{ id: "ack-1", text: "Must acknowledge privacy rights", acknowledged: false }],
        eSignConsent: true,
      })
    ).rejects.toThrow(/Please complete all required acknowledgments/);
  });

  it("TEST F, G, H, I: Executes agreement, locks legal content, generates PDF with SHA-256 hash", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const template = await adminCaller.agreements.saveTemplate({
      name: "Full Execution Flow Template",
      content: "<h2>LEGAL AGREEMENT</h2><p>Advocacy representation terms and disclosures.</p>",
      status: "active",
    });

    const agreement = await adminCaller.agreements.createFromTemplate({
      templateId: template.id!,
      clientId: 1,
      sendImmediately: true,
    });

    const clientCaller = appRouter.createCaller(createClientContext(1));

    // Valid 1x1 base64 PNG signature
    const validPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const signResult = await clientCaller.agreements.clientSign({
      id: agreement.id,
      signerName: "Jane Smith",
      signaturePngBase64: validPng,
      acknowledgments: [],
      eSignConsent: true,
    });

    expect(signResult.success).toBe(true);
    expect(signResult.pdfUrl).toBeDefined();
    expect(signResult.documentHash).toBeDefined();

    // Verify executed agreement is Locked and Completed
    const executed = await adminCaller.agreements.get({ id: agreement.id });
    expect(executed.agreement.status).toBe("Completed");
    expect(executed.agreement.contentLocked).toBe(1);
    expect(executed.agreement.documentHash).toBe(signResult.documentHash);
    expect(executed.agreement.signedPdfUrl).toBe(signResult.pdfUrl);

    // TEST G: Server-side immutability guard
    await expect(
      adminCaller.agreements.updateDraft({
        id: agreement.id,
        content: "<p>Modified illicit text</p>",
      })
    ).rejects.toThrow(/Executed agreements are locked and immutable/);
  });

  it("TEST K: Enforces client authorization and isolation", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const template = await adminCaller.agreements.saveTemplate({
      name: "Client A Confidential Agreement",
      content: "<p>Private terms for Client A only</p>",
      status: "active",
    });

    // Agreement belongs to Client 100
    const agreement = await adminCaller.agreements.createFromTemplate({
      templateId: template.id!,
      clientId: 100,
      sendImmediately: true,
    });

    // Client 200 attempts to read Client 100's agreement
    const unauthorizedCaller = appRouter.createCaller(createClientContext(200));

    await expect(
      unauthorizedCaller.agreements.clientGet({ id: agreement.id })
    ).rejects.toThrow(/You are not authorized to view this agreement/);

    await expect(
      unauthorizedCaller.agreements.clientSign({
        id: agreement.id,
        signerName: "Intruder",
        signaturePngBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        acknowledgments: [],
        eSignConsent: true,
      })
    ).rejects.toThrow(/You are not authorized to sign this agreement/);
  });

  it("TEST L: Template alterations do not change previously generated agreement snapshot", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const template = await adminCaller.agreements.saveTemplate({
      name: "Template Pre-Edit",
      content: "<p>Original Terms V1</p>",
      status: "active",
    });

    const agreement = await adminCaller.agreements.createFromTemplate({
      templateId: template.id!,
      clientId: 1,
      sendImmediately: true,
    });

    // Edit template AFTER agreement is created
    await adminCaller.agreements.saveTemplate({
      id: template.id,
      name: "Template Post-Edit V2",
      content: "<p>Radically altered terms V2</p>",
    });

    // The agreement's frozen snapshot must remain Original Terms V1
    const agreementAfterEdit = await adminCaller.agreements.get({ id: agreement.id });
    expect(agreementAfterEdit.agreement.content).toContain("Original Terms V1");
    expect(agreementAfterEdit.agreement.content).not.toContain("Radically altered terms V2");
  });
});
