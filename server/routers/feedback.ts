import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

import dotenv from "dotenv";

function getLinearApiKey(): string {
  if (process.env.LINEAR_API_KEY) {
    return process.env.LINEAR_API_KEY;
  }
  try {
    const result = dotenv.config();
    if (result.parsed?.LINEAR_API_KEY) {
      return result.parsed.LINEAR_API_KEY;
    }
  } catch (_) {}
  return process.env.LINEAR_API_KEY || "";
}

const PROJECT_ID = "a8036307-5566-45e5-93b2-7bf9fe06b4e7"; // Waypoint Advocates
const TEAM_ID = "8c97d3e4-9744-4a46-9ad0-1c0ee992b3c2"; // VER team
const BACKLOG_STATE_ID = "1145e40e-7e1a-4f03-ab19-c46640b44fe2";

const LABEL_MAP: Record<string, string> = {
  bug: "29732a6d-08d7-46ad-8e2e-52ee3081e160", // Bug
  feature: "ecc4e5db-ba0a-41b2-a856-b24fa61ebfb1", // Feature
  improvement: "0e75fe59-a68a-47ea-ab47-3acbf89d697d", // Improvement
  viaWeb: "75058a4d-934f-4667-9af9-16c05fc785ff", // via-web
};

async function linearGraphQL(query: string, variables: any = {}) {
  const apiKey = getLinearApiKey();
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not configured in .env or server environment");
  }

  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0]?.message || "Linear API error");
  }
  return json.data;
}

export const feedbackRouter = router({
  /**
   * Submit an issue/bug/feature request directly to the Waypoint Advocates Linear Backlog
   */
  submitIssue: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Please provide a title"),
        description: z.string().min(1, "Please provide description details"),
        issueType: z.enum(["bug", "feature", "improvement", "question"]).default("bug"),
        priority: z.number().min(0).max(4).default(3), // 1: Urgent, 2: High, 3: Medium, 4: Low
        routeContext: z.object({
          url: z.string().optional(),
          pathname: z.string().optional(),
          search: z.string().optional(),
        }).optional(),
        browserContext: z.object({
          userAgent: z.string().optional(),
          platform: z.string().optional(),
          screenWidth: z.number().optional(),
          screenHeight: z.number().optional(),
        }).optional(),
        consoleLogs: z.array(
          z.object({
            timestamp: z.string(),
            type: z.string(),
            message: z.string(),
            stack: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const userName = user?.name || "Anonymous User";
      const userEmail = user?.email || "Unknown Email";
      const userRole = user?.role || "user";

      // Select labels
      const labelIds: string[] = [LABEL_MAP.viaWeb];
      if (input.issueType in LABEL_MAP) {
        labelIds.push(LABEL_MAP[input.issueType]);
      }

      // Format console logs section
      let logsMarkdown = "";
      if (input.consoleLogs && input.consoleLogs.length > 0) {
        const formattedLogs = input.consoleLogs
          .map((log) => `[${log.timestamp.slice(11, 19)}] [${log.type.toUpperCase()}] ${log.message}${log.stack ? `\n${log.stack}` : ""}`)
          .join("\n");

        logsMarkdown = `
<details>
<summary><b>🔍 Console Logs & Runtime Diagnostics (${input.consoleLogs.length})</b></summary>

\`\`\`log
${formattedLogs}
\`\`\`
</details>
`;
      }

      // Construct Markdown Body
      const markdownBody = `### Description
${input.description}

---

### 👤 Reporter Info
- **Name**: ${userName}
- **Email**: ${userEmail}
- **Role**: \`${userRole}\` (User ID: \`#${user?.id ?? "unknown"}\`)

### 🌐 Environment Context
- **URL**: ${input.routeContext?.url ? `[${input.routeContext.url}](${input.routeContext.url})` : "N/A"}
- **Route**: \`${input.routeContext?.pathname || "/"}\`
- **Viewport**: \`${input.browserContext?.screenWidth ?? "?"}x${input.browserContext?.screenHeight ?? "?"}\`
- **User Agent**: \`${input.browserContext?.userAgent || "Unknown"}\`
${logsMarkdown}
`;

      try {
        const mutation = `
          mutation CreateIssue($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              success
              issue {
                id
                identifier
                title
                url
                state {
                  name
                }
              }
            }
          }
        `;

        const prefix = input.issueType === "bug" ? "🐛 [BUG]" : input.issueType === "feature" ? "💡 [FEATURE]" : "⚡ [IMPROVEMENT]";
        const formattedTitle = `${prefix} ${input.title.trim()}`;

        const data = await linearGraphQL(mutation, {
          input: {
            teamId: TEAM_ID,
            projectId: PROJECT_ID,
            stateId: BACKLOG_STATE_ID,
            title: formattedTitle,
            description: markdownBody,
            priority: input.priority,
            labelIds,
          },
        });

        const createdIssue = data?.issueCreate?.issue;
        return {
          success: true,
          issue: {
            id: createdIssue?.id,
            identifier: createdIssue?.identifier,
            title: createdIssue?.title,
            url: createdIssue?.url,
            state: createdIssue?.state?.name ?? "Backlog",
          },
        };
      } catch (err: any) {
        console.error("[FeedbackRouter] Linear API Error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to submit issue to Linear: ${err?.message || "Unknown error"}`,
        });
      }
    }),

  /**
   * List recent issues filed for this project so users can view status
   */
  listRecentIssues: protectedProcedure.query(async () => {
    try {
      const query = `
        query GetProjectIssues($projectId: String!) {
          project(id: $projectId) {
            issues(first: 10, orderBy: createdAt) {
              nodes {
                id
                identifier
                title
                priority
                url
                createdAt
                state {
                  id
                  name
                  type
                }
              }
            }
          }
        }
      `;

      const data = await linearGraphQL(query, { projectId: PROJECT_ID });
      const nodes = data?.project?.issues?.nodes ?? [];
      return nodes.map((node: any) => ({
        id: node.id,
        identifier: node.identifier,
        title: node.title,
        priority: node.priority,
        url: node.url,
        createdAt: node.createdAt,
        stateName: node.state?.name ?? "Backlog",
        stateType: node.state?.type ?? "backlog",
      }));
    } catch (err: any) {
      console.warn("[FeedbackRouter] Error fetching issues:", err?.message);
      return [];
    }
  }),
});
