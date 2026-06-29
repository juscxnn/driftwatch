/**
 * LLM provider adapter — single interface for chat + embed.
 *
 * All LLM calls in the app go through this interface so that the provider can
 * be swapped (deepseek, openai, kimi, anthropic-via-proxy, …) by env var
 * without touching call sites.
 *
 * Implementations live in `lib/llm/providers/<name>.ts` and are wired up by
 * `lib/llm/index.ts`.
 */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface ChatResult {
  /** The assistant's message text. */
  content: string;
  /** Token usage if the provider reports it. */
  usage?: ChatUsage;
}

export interface ChatOptions {
  /** Override the default model for this provider. */
  model?: string;
  /** Sampling temperature. Defaults to provider default if omitted. */
  temperature?: number;
  /** Max output tokens. Defaults to provider default if omitted. */
  maxTokens?: number;
  /**
   * If set, the provider will attempt JSON-mode / strict JSON output.
   * Providers that don't support it should still try to comply via the system
   * prompt and tolerate slightly-malformed JSON at the call site.
   */
  responseFormat?: "json" | "text";
}

export interface EmbeddingResult {
  /** The embedding vector. Length depends on the model (1536 for text-embedding-3-small). */
  embedding: number[];
}

export interface EmbedOptions {
  /** Override the default embedding model. */
  model?: string;
}

export interface LLMProvider {
  /** Provider slug (e.g. "deepseek", "openai"). */
  readonly name: string;
  /** Default chat model used when none is specified. */
  readonly defaultChatModel: string;
  /** Default embedding model used when none is specified. */
  readonly defaultEmbedModel: string;
  /** Embedding dimension this provider emits (e.g. 1536 for text-embedding-3-small). */
  readonly embeddingDim: number;

  /**
   * Run a chat completion. Messages must be ordered oldest -> newest.
   * Throws on transport / API errors. Throws a typed error on non-2xx upstream.
   */
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;

  /**
   * Embed one or more texts. Order of returned embeddings matches the order
   * of the input array. Throws on transport / API errors.
   */
  embed(texts: string[], opts?: EmbedOptions): Promise<EmbeddingResult[]>;
}

/**
 * Standardized error thrown by provider implementations. Callers can read
 * `status` to decide whether to retry / surface a specific message.
 */
export class LLMError extends Error {
  public readonly provider: string;
  public readonly status: number | undefined;
  public readonly cause?: unknown;

  constructor(
    provider: string,
    message: string,
    opts: { status?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "LLMError";
    this.provider = provider;
    this.status = opts.status;
    this.cause = opts.cause;
  }
}
