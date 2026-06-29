/**
 * OpenAI provider — stub.
 *
 * This is a minimal implementation that is intentionally not fully wired up.
 * The point of having a stub is to make it trivial to swap to OpenAI by:
 *
 *   1. Setting LLM_PROVIDER=openai in env
 *   2. Providing OPENAI_API_KEY
 *   3. Fleshing out this file (the request shape is identical to DeepSeek)
 *
 * Right now it throws clearly so we don't accidentally start charging
 * customers against the wrong account.
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

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const DEFAULT_EMBED_MODEL = "text-embedding-3-small";
const DEFAULT_EMBED_DIM = 1536;

export class OpenAIProvider implements LLMProvider {
  public readonly name = "openai";
  public readonly defaultChatModel: string;
  public readonly defaultEmbedModel: string;
  public readonly embeddingDim: number;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(opts: {
    apiKey: string;
    baseUrl?: string;
    chatModel?: string;
    embedModel?: string;
    embeddingDim?: number;
  }) {
    if (!opts.apiKey) {
      throw new LLMError("openai", "OPENAI_API_KEY is not set");
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.defaultChatModel = opts.chatModel ?? DEFAULT_CHAT_MODEL;
    this.defaultEmbedModel = opts.embedModel ?? DEFAULT_EMBED_MODEL;
    this.embeddingDim = opts.embeddingDim ?? DEFAULT_EMBED_DIM;
  }

  async chat(
    _messages: ChatMessage[],
    _opts?: ChatOptions,
  ): Promise<ChatResult> {
    throw new LLMError(
      "openai",
      "OpenAI provider is a stub. Implement request() to enable.",
    );
  }

  async embed(
    _texts: string[],
    _opts?: EmbedOptions,
  ): Promise<EmbeddingResult[]> {
    throw new LLMError(
      "openai",
      "OpenAI provider is a stub. Implement request() to enable.",
    );
  }
}
