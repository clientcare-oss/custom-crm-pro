import type { Express, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { processMycoWebhookPayload } from "./services/mycoService";

export function registerMycoWebhookRoutes(app: Express): void {
  const handler = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const body =
        req.body && typeof req.body === "object"
          ? (req.body as Record<string, any>)
          : {};
      const rawBody =
        typeof (req as Record<string, any>).rawBody === "string"
          ? String((req as Record<string, any>).rawBody)
          : JSON.stringify(body);

      const signatureHeader =
        (req.headers["x-myco-signature"] as string | undefined) || null;
      const secretHeader =
        (req.headers["x-myco-secret"] as string | undefined) || null;

      const result = await processMycoWebhookPayload({
        ownerId: 1,
        rawBody,
        body,
        signatureHeader,
        secretHeader,
      });

      res.status(result.httpStatus).json({
        ok: result.ok,
        error: result.error,
        doNotServeMatched: result.doNotServeMatched,
        doNotServeSummary: result.doNotServeSummary ?? null,
        sporeId: result.spore?.id ?? null,
        logId: result.log.id,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "Myco webhook processing failed",
      });
    }
  };

  app.post("/api/myco/webhook", handler);
  app.post("/api/webhooks/myco", handler);
}

export async function handleMycoWebhookRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await request.text();
    let body: Record<string, any> = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      body = {};
    }

    const signatureHeader = request.headers.get("x-myco-signature");
    const secretHeader = request.headers.get("x-myco-secret");

    const result = await processMycoWebhookPayload({
      ownerId: 1,
      rawBody,
      body,
      signatureHeader,
      secretHeader,
    });

    return new Response(
      JSON.stringify({
        ok: result.ok,
        error: result.error,
        doNotServeMatched: result.doNotServeMatched,
        doNotServeSummary: result.doNotServeSummary ?? null,
        sporeId: result.spore?.id ?? null,
        logId: result.log.id,
      }),
      {
        status: result.httpStatus,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Myco webhook processing failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
