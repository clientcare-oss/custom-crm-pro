import { invokeLLM } from "../_core/llm";
import type { FirstMateDevLogEntry } from "../../shared/firstMate";

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
      };

      return {
        data: parsedData,
        rawContent,
        latencyMs,
        model,
        success: true,
        devLog,
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
      };

      return {
        data: null,
        rawContent: "",
        latencyMs,
        model,
        success: false,
        error: err?.message,
        devLog,
      };
    }
  }

  // Fallback to project standard invokeLLM if OPENAI_API_KEY is not directly configured
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
    };

    return {
      data: parsedData,
      rawContent,
      latencyMs,
      model: res.model || "fallback-llm",
      success: true,
      devLog,
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
      notes: err?.message,
    };

    return {
      data: null,
      rawContent: "",
      latencyMs,
      model: "offline-heuristics",
      success: false,
      error: err?.message,
      devLog,
    };
  }
}
