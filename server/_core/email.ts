import nodemailer from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function getGmailCredentials(): Promise<{ user: string; pass: string } | null> {
  // Try DB-stored credentials first (set via Integrations page)
  try {
    const db = await import("../db");
    const ENV = (await import("./env")).ENV;
    if (ENV.ownerOpenId) {
      const creds = await db.getOwnerGmailCredentials(ENV.ownerOpenId);
      if (creds.gmailUser && creds.gmailAppPassword) {
        return { user: creds.gmailUser, pass: creds.gmailAppPassword };
      }
    }
  } catch {
    // fall through to env vars
  }

  // Fall back to environment variables
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailAppPassword) {
    return { user: gmailUser, pass: gmailAppPassword };
  }

  return null;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const creds = await getGmailCredentials();

  if (!creds) {
    console.warn("[Email] Gmail credentials not configured. Set them in Integrations → Gmail.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: creds.user, pass: creds.pass },
    });

    const info = await transporter.sendMail({
      from: creds.user,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    console.log("[Email] Message sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return false;
  }
}
