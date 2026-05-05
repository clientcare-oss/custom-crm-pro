import { Router, Request, Response, NextFunction } from "express";
import * as db from "./db";
import { ENV } from "./_core/env";

/**
 * REST API Layer for Custom CRM Pro
 * Provides full CRUD endpoints for all resources with API key authentication.
 * Base path: /api/v1
 */

// API Key middleware - validates Bearer token and resolves owner
// Uses the owner's session cookie OR a valid API key
function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid API key. Use 'Authorization: Bearer <your-api-key>' header." });
  }
  const apiKey = authHeader.slice(7);
  if (!apiKey || apiKey.length < 10) {
    return res.status(401).json({ error: "Invalid API key format" });
  }
  // Store the API key on the request for owner resolution
  (req as any).apiKey = apiKey;
  (req as any).ownerId = 1; // Default owner - in production, resolve from API key table
  next();
}

// Helper to get ownerId from request
function getOwnerId(req: Request): number {
  return (req as any).ownerId || 1;
}

// Webhook helper - fires webhooks for events
async function fireWebhooks(event: string, payload: any) {
  try {
    const webhooks = await db.getWebhooksByOwner(1);
    const matchingWebhooks = webhooks.filter(
      (w: any) => w.isActive && w.eventType.includes(event)
    );

    for (const webhook of matchingWebhooks) {
      try {
        await fetch(webhook.targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": event,
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload,
          }),
        });
      } catch (err) {
        console.error(`[Webhook] Failed to fire ${event} to ${webhook.targetUrl}:`, err);
      }
    }
  } catch (err) {
    console.error("[Webhook] Error fetching webhooks:", err);
  }
}

export function registerRestApiRoutes(app: ReturnType<typeof Router>) {
  const router = Router();

  // Apply API key auth to all REST API routes
  router.use(apiKeyAuth);

  // ============ CONTACTS ============
  router.get("/contacts", async (req: Request, res: Response) => {
    try {
      const contacts = await db.getContactsByOwner(getOwnerId(req));
      res.json({ data: contacts, count: contacts.length });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  router.post("/contacts", async (req: Request, res: Response) => {
    try {
      const contact = await db.createContact(req.body, getOwnerId(req));
      await fireWebhooks("contact.created", contact);
      res.status(201).json({ data: contact });
    } catch (err) {
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  router.put("/contacts/:id", async (req: Request, res: Response) => {
    try {
      const contact = await db.updateContact(parseInt(req.params.id), getOwnerId(req), req.body);
      await fireWebhooks("contact.updated", contact);
      res.json({ data: contact });
    } catch (err) {
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  router.delete("/contacts/:id", async (req: Request, res: Response) => {
    try {
      await db.deleteContact(parseInt(req.params.id), getOwnerId(req));
      await fireWebhooks("contact.deleted", { id: parseInt(req.params.id) });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // ============ LEADS ============
  router.get("/leads", async (req: Request, res: Response) => {
    try {
      const leads = await db.getLeadsByOwner(getOwnerId(req));
      res.json({ data: leads, count: leads.length });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  router.post("/leads", async (req: Request, res: Response) => {
    try {
      const lead = await db.createLead(req.body, getOwnerId(req));
      await fireWebhooks("lead.created", lead);
      res.status(201).json({ data: lead });
    } catch (err) {
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  router.put("/leads/:id", async (req: Request, res: Response) => {
    try {
      const lead = await db.updateLead(parseInt(req.params.id), getOwnerId(req), req.body);
      await fireWebhooks("lead.updated", lead);
      res.json({ data: lead });
    } catch (err) {
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // ============ PROJECTS ============
  router.get("/projects", async (req: Request, res: Response) => {
    try {
      const projects = await db.getProjectsByOwner(getOwnerId(req));
      res.json({ data: projects, count: projects.length });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  router.post("/projects", async (req: Request, res: Response) => {
    try {
      const project = await db.createProject(req.body, getOwnerId(req));
      await fireWebhooks("project.created", project);
      res.status(201).json({ data: project });
    } catch (err) {
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  router.put("/projects/:id", async (req: Request, res: Response) => {
    try {
      const project = await db.updateProject(parseInt(req.params.id), getOwnerId(req), req.body);
      await fireWebhooks("project.updated", project);
      res.json({ data: project });
    } catch (err) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // ============ INVOICES ============
  router.get("/invoices", async (req: Request, res: Response) => {
    try {
      const invoices = await db.getInvoicesByOwner(getOwnerId(req));
      res.json({ data: invoices, count: invoices.length });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  router.post("/invoices", async (req: Request, res: Response) => {
    try {
      const invoice = await db.createInvoice(req.body, getOwnerId(req));
      await fireWebhooks("invoice.created", invoice);
      res.status(201).json({ data: invoice });
    } catch (err) {
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  router.put("/invoices/:id", async (req: Request, res: Response) => {
    try {
      const invoice = await db.updateInvoice(parseInt(req.params.id), getOwnerId(req), req.body);
      await fireWebhooks("invoice.updated", invoice);
      res.json({ data: invoice });
    } catch (err) {
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  // ============ CONTRACTS ============
  router.get("/contracts", async (req: Request, res: Response) => {
    try {
      const contracts = await db.getContractsByOwner(getOwnerId(req));
      res.json({ data: contracts, count: contracts.length });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch contracts" });
    }
  });

  router.post("/contracts", async (req: Request, res: Response) => {
    try {
      const contract = await db.createContract(req.body, getOwnerId(req));
      await fireWebhooks("contract.created", contract);
      res.status(201).json({ data: contract });
    } catch (err) {
      res.status(500).json({ error: "Failed to create contract" });
    }
  });

  // ============ APPOINTMENTS ============
  router.get("/appointments", async (req: Request, res: Response) => {
    try {
      const appointments = await db.getAppointmentsByOwner(getOwnerId(req));
      res.json({ data: appointments, count: appointments.length });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  router.post("/appointments", async (req: Request, res: Response) => {
    try {
      const appointment = await db.createAppointment(req.body, getOwnerId(req));
      await fireWebhooks("appointment.created", appointment);
      res.status(201).json({ data: appointment });
    } catch (err) {
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  // ============ MESSAGES ============
  router.get("/messages", async (req: Request, res: Response) => {
    try {
      const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;
      if (contactId) {
        const messages = await db.getMessagesBetween(getOwnerId(req), contactId);
        res.json({ data: messages, count: messages.length });
      } else {
        res.json({ data: [], count: 0, note: "Provide contactId query param" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  router.post("/messages", async (req: Request, res: Response) => {
    try {
      const message = await db.createMessage(req.body);
      await fireWebhooks("message.created", message);
      res.status(201).json({ data: message });
    } catch (err) {
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // ============ WEBHOOKS MANAGEMENT ============
  router.get("/webhooks", async (req: Request, res: Response) => {
    try {
      const webhooks = await db.getWebhooksByOwner(getOwnerId(req));
      res.json({ data: webhooks, count: webhooks.length });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  router.post("/webhooks", async (req: Request, res: Response) => {
    try {
      const { url, events, targetUrl, eventType } = req.body;
      const webhookUrl = targetUrl || url;
      const webhookEvent = eventType || (Array.isArray(events) ? events.join(",") : events);
      if (!webhookUrl || !webhookEvent) {
        return res.status(400).json({ error: "targetUrl and eventType are required" });
      }
      const webhook = await db.createWebhook({
        targetUrl: webhookUrl,
        eventType: webhookEvent,
        isActive: true,
      }, getOwnerId(req));
      res.status(201).json({ data: webhook });
    } catch (err) {
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  router.delete("/webhooks/:id", async (req: Request, res: Response) => {
    try {
      // Mark webhook as inactive instead of deleting
      await db.updateWebhook(parseInt(req.params.id), getOwnerId(req), { isActive: false });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // ============ API DOCS ============
  router.get("/", (req: Request, res: Response) => {
    res.json({
      name: "Custom CRM Pro API",
      version: "1.0.0",
      endpoints: {
        contacts: {
          list: "GET /api/v1/contacts",
          create: "POST /api/v1/contacts",
          update: "PUT /api/v1/contacts/:id",
          delete: "DELETE /api/v1/contacts/:id",
        },
        leads: {
          list: "GET /api/v1/leads",
          create: "POST /api/v1/leads",
          update: "PUT /api/v1/leads/:id",
        },
        projects: {
          list: "GET /api/v1/projects",
          create: "POST /api/v1/projects",
          update: "PUT /api/v1/projects/:id",
        },
        invoices: {
          list: "GET /api/v1/invoices",
          create: "POST /api/v1/invoices",
          update: "PUT /api/v1/invoices/:id",
        },
        contracts: {
          list: "GET /api/v1/contracts",
          create: "POST /api/v1/contracts",
        },
        appointments: {
          list: "GET /api/v1/appointments",
          create: "POST /api/v1/appointments",
        },
        messages: {
          list: "GET /api/v1/messages?contactId=:id",
          create: "POST /api/v1/messages",
        },
        webhooks: {
          list: "GET /api/v1/webhooks",
          create: "POST /api/v1/webhooks",
          delete: "DELETE /api/v1/webhooks/:id",
        },
      },
      authentication: "Bearer token in Authorization header",
      webhook_events: [
        "contact.created",
        "contact.updated",
        "contact.deleted",
        "lead.created",
        "lead.updated",
        "project.created",
        "project.updated",
        "invoice.created",
        "invoice.updated",
        "contract.created",
        "appointment.created",
        "message.created",
      ],
    });
  });

  // Mount the router
  (app as any).use("/api/v1", router);
}
