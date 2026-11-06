import nodemailer from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
};

export type EmailDeliveryStatus =
  | "simulated"
  | "submitted_to_provider"
  | "delivered"
  | "provider_unconfigured"
  | "failed";

export interface EmailDeliveryResult {
  sent: boolean;
  status: EmailDeliveryStatus;
  messageId?: string;
  senderEmail?: string;
  provider?: string;
  missingConfig?: string[];
  error?: string;
  uncertainDelivery?: boolean;
}

type MockEmailTransport = (
  payload: EmailPayload
) => Promise<EmailDeliveryResult> | EmailDeliveryResult;

let _mockEmailTransportForTests: MockEmailTransport | null = null;

export function __setMockEmailTransportForTests(mockFn: MockEmailTransport | null): void {
  _mockEmailTransportForTests = mockFn;
}

export async function getGmailCredentials(): Promise<{ user: string; pass: string; source: "database" | "env" } | null> {
  // Try DB-stored credentials first (set via Integrations page)
  try {
    const db = await import("../db");
    const ENV = (await import("./env")).ENV;
    if (ENV.ownerOpenId) {
      const creds = await db.getOwnerGmailCredentials(ENV.ownerOpenId);
      if (creds.gmailUser && creds.gmailAppPassword) {
        return { user: creds.gmailUser, pass: creds.gmailAppPassword, source: "database" };
      }
    }
  } catch {
    // fall through to env vars
  }

  // Fall back to environment variables
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailAppPassword) {
    return { user: gmailUser, pass: gmailAppPassword, source: "env" };
  }

  return null;
}

export async function getEmailProviderStatus(): Promise<{
  configured: boolean;
  provider: string;
  senderEmail: string | null;
  source: "database" | "env" | "mock" | "unconfigured";
  missingConfig: string[];
}> {
  if (_mockEmailTransportForTests) {
    return {
      configured: true,
      provider: "Test Mock Transport",
      senderEmail: "advocate@waypointadvocates.com",
      source: "mock",
      missingConfig: [],
    };
  }
  const creds = await getGmailCredentials();
  if (creds) {
    return {
      configured: true,
      provider: "Gmail SMTP (Nodemailer)",
      senderEmail: creds.user,
      source: creds.source,
      missingConfig: [],
    };
  }
  return {
    configured: false,
    provider: "Gmail SMTP (Nodemailer)",
    senderEmail: null,
    source: "unconfigured",
    missingConfig: [
      "Integrations → Gmail (gmailUser & gmailAppPassword) OR environment variables GMAIL_USER & GMAIL_APP_PASSWORD",
    ],
  };
}

export async function sendEmailDetailed(
  payload: EmailPayload,
  options?: { simulateOnly?: boolean }
): Promise<EmailDeliveryResult> {
  if (options?.simulateOnly) {
    return {
      sent: false,
      status: "simulated",
      provider: "Simulation Engine (No External Send)",
    };
  }

  const recipient = (payload.to || "").trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return {
      sent: false,
      status: "failed",
      error: `Invalid or missing recipient email address: "${payload.to || "(empty)"}"`,
    };
  }

  if (!payload.subject || !payload.subject.trim()) {
    return {
      sent: false,
      status: "failed",
      error: "Missing required email subject.",
    };
  }

  if (!payload.html || !payload.html.trim()) {
    return {
      sent: false,
      status: "failed",
      error: "Missing required email body content.",
    };
  }

  if (_mockEmailTransportForTests) {
    return await _mockEmailTransportForTests(payload);
  }

  // Never send live external emails during automated test suites unless a test mock is installed
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return {
      sent: false,
      status: "provider_unconfigured",
      provider: "Test Sandbox (External Sending Blocked)",
      missingConfig: [
        "GMAIL_USER & GMAIL_APP_PASSWORD (blocked in test environment unless mocked)",
      ],
      error:
        "Outbound email provider is not configured in test mode. Configure Gmail credentials in Integrations → Gmail (PG-014) or set GMAIL_USER and GMAIL_APP_PASSWORD.",
    };
  }

  const creds = await getGmailCredentials();

  if (!creds) {
    console.warn("[Email] Gmail credentials not configured. Set them in Integrations → Gmail.");
    return {
      sent: false,
      status: "provider_unconfigured",
      provider: "Gmail SMTP (Nodemailer)",
      missingConfig: [
        "Integrations → Gmail (gmailUser & gmailAppPassword) OR environment variables GMAIL_USER & GMAIL_APP_PASSWORD",
      ],
      error:
        "Outbound email provider is not configured. Configure Gmail credentials in Integrations → Gmail (PG-014) or set GMAIL_USER and GMAIL_APP_PASSWORD.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: creds.user, pass: creds.pass },
    });

    const info = await transporter.sendMail({
      from: creds.user,
      to: recipient,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers: payload.idempotencyKey
        ? { "X-Waypoint-Idempotency-Key": payload.idempotencyKey }
        : undefined,
    });

    console.log("[Email] Message submitted to provider:", info.messageId);
    const accepted = Array.isArray((info as { accepted?: unknown[] }).accepted)
      ? (info as { accepted: unknown[] }).accepted.length > 0
      : true;

    return {
      sent: true,
      status: accepted ? "submitted_to_provider" : "failed",
      messageId: info.messageId || `smtp-${Date.now()}`,
      senderEmail: creds.user,
      provider: "Gmail SMTP",
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[Email] Error sending email:", error);
    const uncertainDelivery = /timeout|socket hang up|econnreset|etimedout/i.test(errMsg);
    return {
      sent: false,
      status: "failed",
      senderEmail: creds.user,
      provider: "Gmail SMTP",
      error: `Email transport error: ${errMsg}`,
      uncertainDelivery,
    };
  }
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const result = await sendEmailDetailed(payload);
  return result.sent;
}
