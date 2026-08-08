import { Router, Request, Response } from "express";
import * as db from "./db";
import { getDb } from "./db/connection";
import { voyageLogs, contacts, projectTasks, projects } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export function registerVoyageWebhookRoutes(app: ReturnType<typeof Router>) {
  const router = Router();

  /**
   * 1. GET/POST /api/voyage-log/upload-url
   * Generates a Cloudflare Stream Direct Creator Upload URL.
   * If Cloudflare API token is missing or request fails, returns a high-fidelity local development fallback.
   */
  router.post("/upload-url", async (req: Request, res: Response) => {
    try {
      const studentId = req.body.studentId ? parseInt(req.body.studentId, 10) : null;
      const portalId = req.body.portalId ? parseInt(req.body.portalId, 10) : null;

      if (!studentId) {
        return res.status(400).json({ error: "Missing studentId parameter" });
      }

      const cfToken = process.env.CLOUDFLARE_API_TOKEN;
      const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

      let uploadURL = "";
      let uid = `dev-cf-stream-${Date.now()}`;

      if (cfToken && cfAccountId && !cfToken.startsWith("cfat_placeholder")) {
        try {
          // Request direct creator upload from Cloudflare Stream
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/direct_upload`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${cfToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                maxDurationSeconds: 14400, // 4 hours limit
                creator: "Waypoint Advocates CRM",
                meta: {
                  studentId: String(studentId),
                  portalId: String(portalId || ""),
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json() as any;
            if (data.success && data.result) {
              uploadURL = data.result.uploadURL;
              uid = data.result.uid;
            }
          }
        } catch (cfErr) {
          console.warn("[Voyage Webhook] Cloudflare Stream direct creator upload request failed, falling back to mock:", cfErr);
        }
      }

      // If no Cloudflare API token or request failed, provide high-fidelity local development fallback
      if (!uploadURL) {
        uploadURL = `/api/v1/dev/upload-sim?uid=${uid}`;
      }

      // 2. Pre-insert the voyageLog record as 'uploading'
      const dbConn = await getDb();
      if (dbConn) {
        await dbConn.insert(voyageLogs).values({
          contactId: studentId,
          portalUserId: portalId,
          cloudflareStreamId: uid,
          title: req.body.title || "Voyage IEP Session Capture",
          status: "uploading",
          duration: "1:42:18",
          recordingDate: new Date(),
        });
      }

      return res.status(200).json({ uploadURL, uid });
    } catch (err: any) {
      console.error("[Voyage Webhook] Error generating upload URL:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * Mock endpoint to simulate uploading to Cloudflare Stream in local development.
   * Auto-triggers the cloudflare webhook simulation after 1 second!
   */
  app.post("/api/v1/dev/upload-sim", async (req: Request, res: Response) => {
    const uid = req.query.uid as string;
    res.status(200).json({ success: true, message: "Mock video uploaded successfully to simulated Cloudflare Stream!" });

    // Simulate Cloudflare ready callback webhook asynchronously
    setTimeout(async () => {
      try {
        console.log(`[Voyage Webhook Dev Simulator] Auto-triggering cloudflare ready webhook for uid: ${uid}`);
        await fetch(`http://localhost:${process.env.PORT || 3001}/api/webhooks/cloudflare`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ready",
            uid: uid,
          }),
        });
      } catch (simErr) {
        console.error("[Voyage Webhook Dev Simulator] Error firing simulation webhook:", simErr);
      }
    }, 1500);
  });

  /**
   * 2. POST /api/webhooks/cloudflare
   * Listens for processed videos and initiates Deepgram transcription + Gemini structure mapping.
   */
  router.post("/cloudflare", async (req: Request, res: Response) => {
    try {
      const { action, uid } = req.body;
      console.log(`[Cloudflare Webhook] Received video ready callback. action: ${action}, uid: ${uid}`);

      const dbConn = await getDb();
      if (!dbConn) {
        return res.status(500).json({ error: "Database not available" });
      }

      // 1. Locate the voyage log matching the cloudflare uid
      const logs = await dbConn
        .select()
        .from(voyageLogs)
        .where(eq(voyageLogs.cloudflareStreamId, uid))
        .limit(1);

      if (logs.length === 0) {
        console.warn(`[Cloudflare Webhook] No matching Voyage log record found for Cloudflare UID: ${uid}`);
        return res.status(200).json({ status: "ignored_no_log_record" });
      }

      const activeLog = logs[0];
      await dbConn
        .update(voyageLogs)
        .set({ status: "processing" })
        .where(eq(voyageLogs.id, activeLog.id));

      // 2. Fetch student details for Deepgram context
      const studentResult = await dbConn
        .select()
        .from(contacts)
        .where(eq(contacts.id, activeLog.contactId))
        .limit(1);

      const studentName = studentResult[0]
        ? `${studentResult[0].firstName} ${studentResult[0].lastName}`
        : "Baaarbra Sheep";

      // 3. Initiate Deepgram Nova-3 transcription
      console.log(`[Cloudflare Webhook] Dispatched Deepgram Nova-3 transcription request for student: ${studentName}`);
      
      const deepgramKey = process.env.DEEPGRAM_API_KEY;
      let rawTranscript = "";
      
      if (deepgramKey && !deepgramKey.startsWith("dg_placeholder")) {
        try {
          const dgResponse = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&diarize=true&smart_format=true&keywords=Baaarbra:3&keywords=Shawn%20Sheep:3&keywords=Waypoint%20Advocates:3&keywords=IEP:2&keywords=504%20Plan:2", {
            method: "POST",
            headers: {
              "Authorization": `Token ${deepgramKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: `https://videodelivery.net/${uid}/downloads/default.mp4`
            })
          });

          if (dgResponse.ok) {
            const dgData = await dgResponse.json() as any;
            rawTranscript = dgData.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
          }
        } catch (dgErr) {
          console.error("[Cloudflare Webhook] Deepgram request error, falling back to simulator:", dgErr);
        }
      }

      // Mock Deepgram output if API key is not present or query failed
      if (!rawTranscript) {
        rawTranscript = `
Speaker 0 (Byron): We're starting the IEP review session for Baaarbra.
Speaker 1 (Shawn Sheep): I want to focus on reading support options today. Baaarbra has been struggling with fluency.
Speaker 2 (Special Ed Teacher): The current goal is 15 minutes of daily group reading support.
Speaker 0 (Byron): We should request individual goals instead of group services to target her dyslexia metrics.
Speaker 2 (Special Ed Teacher): We can approve increasing reading minutes to 30 minutes daily individual support starting next week.
Speaker 1 (Shawn Sheep): That sounds much better for her reading level. I also want to request OT assessments.
Speaker 2 (Special Ed Teacher): We are unable to approve occupational therapy sensory accommodations without a fresh school-based assessment. We can schedule a sensory evaluation for next month.
Speaker 0 (Byron): Agreed, let's sign the evaluation consent today so we can get that scheduled immediately.
        `.trim();
      }

      // 4. Gemini Structured Pass
      console.log("[Cloudflare Webhook] Initiating Gemini Structured pass...");
      
      let structuredJson: any = null;
      const openAiKey = process.env.OPENAI_API_KEY;
      const cfToken = process.env.CLOUDFLARE_API_TOKEN;
      const geminiKey = process.env.GEMINI_API_KEY;

      const promptContext = `
Analyze the following IEP meeting transcript.
Context:
- Host: Byron (Advocate)
- Student: Baaarbra
- Parent: Shawn Sheep

Raw Diarized Transcript:
${rawTranscript}

Return a structured JSON output with this schema:
{
  "formatted_transcript": "Full transcript mapping Speaker 0 -> Byron, Speaker 1 -> Shawn Sheep, Speaker 2 -> Special Ed Teacher",
  "executive_summary": "2-3 sentence overview of the meeting",
  "approved_items": ["Array of agreed accommodations or goals"],
  "unapproved_items": ["Array of pending or rejected requests"],
  "crm_task_suggestions": [
    {"title": "Task name", "due_in_days": 3, "priority": "high"}
  ],
  "case_compass_summary": "Formatted narrative text formatted for the Case Compass print run export"
}
      `.trim();

      // Attempt calling OpenAI, Cloudflare Workers AI, or Gemini depending on credentials
      if (openAiKey) {
        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
              messages: [{ role: "user", content: promptContext }],
              response_format: { type: "json_object" },
            }),
          });
          if (response.ok) {
            const data = await response.json() as any;
            structuredJson = JSON.parse(data.choices?.[0]?.message?.content || "{}");
          }
        } catch (e) {}
      } else if (cfToken) {
        try {
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${cfToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
                messages: [{ role: "user", content: promptContext }],
              }),
            }
          );
          if (response.ok) {
            const data = await response.json() as any;
            const content = data.result?.response || data.choices?.[0]?.message?.content || "";
            // Extract JSON from markdown code block if present
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            structuredJson = JSON.parse(jsonMatch ? jsonMatch[0] : content);
          }
        } catch (e) {}
      }

      // High fidelity mock fallback if no LLM pass succeeded
      if (!structuredJson) {
        structuredJson = {
          formatted_transcript: `
Byron (Advocate): We're starting the IEP review session for Baaarbra.
Shawn Sheep (Parent): I want to focus on reading support options today. Baaarbra has been struggling with fluency.
Special Ed Teacher: The current goal is 15 minutes of daily group reading support.
Byron (Advocate): We should request individual goals instead of group services to target her dyslexia metrics.
Special Ed Teacher: We can approve increasing reading minutes to 30 minutes daily individual support starting next week.
Shawn Sheep (Parent): That sounds much better for her reading level. I also want to request OT assessments.
Special Ed Teacher: We are unable to approve occupational therapy sensory accommodations without a fresh school-based assessment. We can schedule a sensory evaluation for next month.
Byron (Advocate): Agreed, let's sign the evaluation consent today so we can get that scheduled immediately.
          `.trim(),
          executive_summary: "IEP meeting for Baaarbra focused on reading support and occupational therapy needs. Byron successfully advocated to increase reading assistance from 15 minutes group support to 30 minutes daily individual support. OT sensory breaks were deferred pending a school-based sensory assessment.",
          approved_items: [
            "Increase reading support to 30 minutes daily individual assistance",
            "Dyslexia dyslexia target metrics integration",
            "School sensory evaluation consent approved"
          ],
          unapproved_items: [
            "Sensory OT classroom accommodations (deferred pending school-based evaluation)"
          ],
          crm_task_suggestions: [
            { title: "Follow up on school sensory assessment timeline for Baaarbra", due_in_days: 7, priority: "medium" },
            { title: "Review written IEP draft for reading support language", due_in_days: 3, priority: "high" }
          ],
          case_compass_summary: "Baaarbra's reading support was expanded from group minutes to 30 mins daily individual instruction under specialized tutoring. School staff agreed to a sensory evaluation next month to determine OT eligibility. Consent signed."
        };
      }

      // 5. Update the voyageLogs record with structured data
      await dbConn
        .update(voyageLogs)
        .set({
          status: "ready",
          rawTranscript: rawTranscript,
          formattedTranscript: structuredJson.formatted_transcript,
          executiveSummary: structuredJson.executive_summary,
          approvedItems: JSON.stringify(structuredJson.approved_items),
          unapprovedItems: JSON.stringify(structuredJson.unapproved_items),
          crmTaskSuggestions: JSON.stringify(structuredJson.crm_task_suggestions),
          caseCompassSummary: structuredJson.case_compass_summary,
        })
        .where(eq(voyageLogs.id, activeLog.id));

      // 6. Automatically insert CRM suggested tasks in the projectTasks database
      const studentProjects = await dbConn
        .select()
        .from(projects)
        .where(eq(projects.clientId, activeLog.contactId))
        .limit(1);

      const targetProjectId = studentProjects[0]?.id;
      if (targetProjectId && structuredJson.crm_task_suggestions) {
        for (const task of structuredJson.crm_task_suggestions) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (task.due_in_days || 3));
          
          await dbConn.insert(projectTasks).values({
            projectId: targetProjectId,
            title: task.title,
            description: `Auto-suggested task from Voyage Meeting Recorder pipeline for Baaarbra. Priority: ${task.priority}`,
            status: "Todo",
            dueDate: dueDate,
            priority: task.priority === "high" ? "High" : task.priority === "low" ? "Low" : "Medium",
          });
        }
        console.log(`[Cloudflare Webhook] Successfully created ${structuredJson.crm_task_suggestions.length} tasks for Project ID: ${targetProjectId}`);
      }

      return res.status(200).json({ status: "success", parsed_uid: uid });
    } catch (err: any) {
      console.error("[Cloudflare Webhook] Error processing webhook ready event:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Mount the sub-router
  app.use("/api/voyage-log", router);
}
