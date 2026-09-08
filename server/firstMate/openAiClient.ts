import { invokeLLM } from "../_core/llm";
import type { FirstMateDevLogEntry, FirstMateProvenance } from "../../shared/firstMate";

interface ChatCompletionOptions {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  response_format?: any;
  temperature?: number;
  stage: "FAST" | "DEEP" | "REPHRASE" | "ASK" | "SUMMARY";
}

export interface ChatCompletionResult<T = any> {
  data: T | null;
  rawContent: string;
  latencyMs: number;
  model: string;
  success: boolean;
  error?: string;
  devLog: FirstMateDevLogEntry;
  provenance: FirstMateProvenance;
  provider: string;
}

export async function executeOpenAiChat<T = any>(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult<T>> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // If OpenAI key is present, execute via OpenAI endpoint
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          response_format: options.response_format,
          temperature: options.temperature ?? 0.2,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errText}`);
      }

      const json = (await response.json()) as any;
      const rawContent = json.choices?.[0]?.message?.content || "";
      let parsedData: T | null = null;

      try {
        parsedData = JSON.parse(rawContent) as T;
      } catch {
        parsedData = null;
      }

      const devLog: FirstMateDevLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        stage: options.stage,
        latencyMs,
        model,
        success: true,
        provenance: "AI: OPENAI",
        provider: "OpenAI",
        rawStructuredOutput: parsedData,
      };

      return {
        data: parsedData,
        rawContent,
        latencyMs,
        model,
        success: true,
        devLog,
        provenance: "AI: OPENAI",
        provider: "OpenAI",
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      console.warn(`[FirstMateOpenAi] OpenAI direct call error:`, err?.message);

      const devLog: FirstMateDevLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        stage: options.stage,
        latencyMs,
        model,
        success: false,
        notes: err?.message,
        provenance: "AI: ERROR",
        provider: "OpenAI (Failed)",
      };

      return {
        data: null,
        rawContent: "",
        latencyMs,
        model,
        success: false,
        error: err?.message,
        devLog,
        provenance: "AI: ERROR",
        provider: "OpenAI (Failed)",
      };
    }
  }

  // If OPENAI_API_KEY is missing:
  // In development / test mode, unmask the failure immediately with AI: ERROR so developers know OpenAI is offline.
  const isDevOrTest = process.env.NODE_ENV !== "production";
  if (isDevOrTest) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = "OPENAI_API_KEY environment variable is not configured in server environment (.env)";
    const devLog: FirstMateDevLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      stage: options.stage,
      latencyMs,
      model,
      success: false,
      notes: errorMsg,
      provenance: "AI: ERROR",
      provider: "OpenAI (Key Missing)",
      rawStructuredOutput: {
        error: errorMsg,
        expectedEnvVar: "OPENAI_API_KEY",
        modelRequested: model,
        requestSent: false,
      },
    };

    return {
      data: null,
      rawContent: "",
      latencyMs,
      model,
      success: false,
      error: errorMsg,
      devLog,
      provenance: "AI: ERROR",
      provider: "OpenAI (Key Missing)",
    };
  }

  // Fallback to project standard invokeLLM if OPENAI_API_KEY is not directly configured in production
  try {
    const res = await invokeLLM({
      messages: options.messages as any,
      response_format: options.response_format,
    });

    const latencyMs = Date.now() - startTime;
    const rawContent = (res.choices?.[0]?.message?.content as string) || "";
    let parsedData: T | null = null;
    try {
      parsedData = JSON.parse(rawContent) as T;
    } catch {
      parsedData = null;
    }

    const devLog: FirstMateDevLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      stage: options.stage,
      latencyMs,
      model: res.model || "fallback-llm",
      success: true,
      provenance: "AI: FALLBACK",
      provider: "Cloudflare Workers AI",
      rawStructuredOutput: parsedData,
    };

    return {
      data: parsedData,
      rawContent,
      latencyMs,
      model: res.model || "fallback-llm",
      success: true,
      devLog,
      provenance: "AI: FALLBACK",
      provider: "Cloudflare Workers AI",
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const devLog: FirstMateDevLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      stage: options.stage,
      latencyMs,
      model: "offline-heuristics",
      success: false,
      notes: "OPENAI_API_KEY missing or inactive: " + (err?.message || "fallback mode"),
      provenance: "AI: FALLBACK",
      provider: "Local Fallback Heuristics",
    };

    return {
      data: null,
      rawContent: "",
      latencyMs,
      model: "offline-heuristics",
      success: false,
      error: err?.message,
      devLog,
      provenance: "AI: FALLBACK",
      provider: "Local Fallback Heuristics",
    };
  }
}
