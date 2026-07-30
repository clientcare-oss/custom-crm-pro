import { describe, it, expect } from "vitest";

const hasGmailCreds = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

describe.runIf(hasGmailCreds)("Gmail email configuration", () => {
  it("should have GMAIL_USER set", () => {
    expect(process.env.GMAIL_USER).toBeTruthy();
    expect(process.env.GMAIL_USER).toContain("@");
  });

  it("should have GMAIL_APP_PASSWORD set", () => {
    expect(process.env.GMAIL_APP_PASSWORD).toBeTruthy();
    expect(process.env.GMAIL_APP_PASSWORD!.length).toBeGreaterThanOrEqual(16);
  });

  it("should create a nodemailer transporter with Gmail credentials", async () => {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    expect(transporter).toBeTruthy();
    await expect(transporter.verify()).resolves.toBe(true);
  });
});

