/**
 * DeepSeek provider — OpenAI-compatible chat + embeddings.
 *
 * Base URL: https://api.deepseek.com
 * - chat:        POST /chat/completions        (model: deepseek-chat)
 * - embeddings:  POST /embeddings              (model: deepseek-embed; the
 *                spec requires 1536-dim output. DeepSeek exposes an
 *                OpenAI-compatible embeddings endpoint; if the upstream
 *                returns a different dim, we still return whatever it sends
 *                and let the consumer surface the mismatch — the schema is
 *                1536 per the migration, so production deployment must use a
 *                1536-dim embedding model like text-embedding-3-small.)
 *
 * Auth: Authorization: Bearer $DEEPSEEK_API_KEY
 */

import {
  ChatMessage,
  ChatOptions,
  ChatResult,
  EmbeddingResult,
  EmbedOptions,
  LLMError,
  LLMProvider,
} from "../provider";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_CHAT_MODEL = "deepseek-chat";
/**
 * DeepSeek currently advertises an OpenAI-compatible embeddings endpoint; in
 * practice many users point this at OpenAI's text-embedding-3-small. We
 * default to the model name that the spec called out, and the factory allows
 * overriding the env var so users can plug in any OpenAI-compatible
 * embeddings host.
 */
const DEFAULT_EMBED_MODEL = "text-embedding-3-small";
const DEFAULT_EMBED_DIM = 1536;

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface DeepSeekEmbedResponse {
  data?: Array<{ embedding?: number[]; index?: number }>;
  usage?: { prompt_tokens?: number; total_tokens?: number };
}

interface DeepSeekErrorResponse {
  error?: { message?: string; type?: string; code?: string | number };
}

export class DeepSeekProvider implements LLMProvider {
  public readonly name = "deepseek";
  public readonly defaultChatModel: string;
  public readonly defaultEmbedModel: string;
  public readonly embeddingDim: number;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  /**
   * Optional separate host for embeddings. Many deployments reuse the DeepSeek
   * base URL, but some customers point embeddings at OpenAI directly. When
   * not set, embeddings go to the same base URL as chat.
   */
  private readonly embedBaseUrl: string;

  constructor(opts: {
    apiKey: string;
    baseUrl?: string;
    chatModel?: string;
    embedModel?: string;
    embeddingDim?: number;
    embedBaseUrl?: string;
  }) {
    if (!opts.apiKey) {
      throw new LLMError("deepseek", "DEEPSEEK_API_KEY is not set");
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.embedBaseUrl = (opts.embedBaseUrl ?? this.baseUrl).replace(/\/+$/, "");
    this.defaultChatModel = opts.chatModel ?? DEFAULT_CHAT_MODEL;
    this.defaultEmbedModel = opts.embedModel ?? DEFAULT_EMBED_MODEL;
    this.embeddingDim = opts.embeddingDim ?? DEFAULT_EMBED_DIM;
  }

  async chat(
    messages: ChatMessage[],
    opts: ChatOptions = {},
  ): Promise<ChatResult> {
    const body: Record<string, unknown> = {
      model: opts.model ?? this.defaultChatModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    };
    if (typeof opts.temperature === "number") body.temperature = opts.temperature;
    if (typeof opts.maxTokens === "number") body.max_tokens = opts.maxTokens;
    if (opts.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const json = await this.request<DeepSeekChatResponse>(
      `${this.baseUrl}/chat/completions`,
      body,
    );

    const content = json.choices?.[0]?.message?.content ?? "";
    const usage = json.usage
      ? {
          promptTokens: json.usage.prompt_tokens ?? 0,
          completionTokens: json.usage.completion_tokens ?? 0,
        }
      : undefined;
    return { content, usage };
  }

  async embed(
    texts: string[],
    opts: EmbedOptions = {},
  ): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];
    const body = {
      model: opts.model ?? this.defaultEmbedModel,
      input: texts,
    };
    const json = await this.request<DeepSeekEmbedResponse>(
      `${this.embedBaseUrl}/embeddings`,
      body,
    );
    const data = json.data ?? [];
    // The API returns an `index` for each row; sort by it just in case so the
    // caller's array order is preserved even if the upstream reorders.
    const ordered = [...data].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    );
    return ordered.map((row) => ({ embedding: row.embedding ?? [] }));
  }

  private async request<T>(url: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new LLMError("deepseek", `Network error calling ${url}`, {
        cause: err,
      });
    }

    if (!res.ok) {
      let detail = "";
      try {
        const errJson = (await res.json()) as DeepSeekErrorResponse;
        detail = errJson.error?.message ?? "";
      } catch {
        try {
          detail = await res.text();
        } catch {
          detail = "";
        }
      }
      throw new LLMError(
        "deepseek",
        `DeepSeek request failed (${res.status} ${res.statusText}): ${detail}`,
        { status: res.status },
      );
    }

    try {
      return (await res.json()) as T;
    } catch (err) {
      throw new LLMError("deepseek", "Invalid JSON response from DeepSeek", {
        cause: err,
      });
    }
  }
}
