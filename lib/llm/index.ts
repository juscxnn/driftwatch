/**
 * LLM provider factory.
 *
 * Reads the LLM_PROVIDER env var and returns the configured provider.
 * Defaults to deepseek. Falls back to deepseek (and logs a warning) if an
 * unknown provider is requested.
 *
 * BYOK (bring-your-own-key):
 *   `buildLLM(opts)` accepts an optional `apiKey` (and `provider` name)
 *   that wins over the env var. The engine decrypts the org's stored
 *   LLM key once per run and threads it through every judge call so
 *   individual questions don't repeat the work.
 *
 * Usage:
 *   import { getLLM } from "@/lib/llm";
 *   const llm = getLLM();                 // env-based default
 *   const llm = buildLLM({ apiKey });    // explicit (BYOK)
 */

import { LLMProvider } from "./provider";
import { DeepSeekProvider } from "./providers/deepseek";
import { OpenAIProvider } from "./providers/openai";

export type ProviderName = "deepseek" | "openai";

export interface BuildLLMOpts {
  /** Override the API key for this provider. Wins over the env var. */
  apiKey?: string | null;
  /** Override the provider name. Falls back to the LLM_PROVIDER env var. */
  provider?: string | null;
}

let cached: LLMProvider | null = null;
let cachedKey: string | null = null;

function readEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

function resolveApiKey(provider: string, override: string | null | undefined): string | undefined {
  // Explicit override wins (BYOK path).
  if (override && override.length > 0) return override;
  switch (provider) {
    case "deepseek":
      return readEnv("DEEPSEEK_API_KEY");
    case "openai":
      return readEnv("OPENAI_API_KEY");
    default:
      return undefined;
  }
}

interface BuildArgs {
  name: string;
  apiKey: string;
  baseUrl?: string;
  chatModel?: string;
  embedModel?: string;
  embedBaseUrl?: string;
  embeddingDim?: number;
}

function buildProvider(args: BuildArgs): LLMProvider {
  switch (args.name) {
    case "deepseek":
      return new DeepSeekProvider({
        apiKey: args.apiKey,
        baseUrl: args.baseUrl,
        chatModel: args.chatModel,
        embedModel: args.embedModel,
        embedBaseUrl: args.embedBaseUrl,
        embeddingDim: args.embeddingDim,
      });
    case "openai":
      return new OpenAIProvider({
        apiKey: args.apiKey,
        baseUrl: args.baseUrl,
        chatModel: args.chatModel,
        embedModel: args.embedModel,
        embeddingDim: args.embeddingDim,
      });
    default:
      throw new Error(`Unknown LLM provider: ${args.name}`);
  }
}

function resolveProviderName(name?: string | null): string {
  const provider = (name ?? readEnv("LLM_PROVIDER") ?? "deepseek").toLowerCase();
  if (provider !== "deepseek" && provider !== "openai") {
    // eslint-disable-next-line no-console
    console.warn(
      `[llm] Unknown LLM_PROVIDER="${provider}". Falling back to deepseek.`,
    );
    return "deepseek";
  }
  return provider;
}

/**
 * Resolve the provider for a given name + key. `name` is the LLM_PROVIDER
 * value or the per-project override. Throws if the provider requires env
 * vars that aren't set (and no override was provided).
 */
export function getProvider(name?: string): LLMProvider {
  return buildLLM({ provider: name });
}

/**
 * Build an LLM provider, optionally overriding the API key (BYOK). The
 * override path is what the engine uses after decrypting the org's stored
 * key; if the override is missing we fall back to the env var so local
 * development works without setting up pgcrypto.
 */
export function buildLLM(opts: BuildLLMOpts = {}): LLMProvider {
  const name = resolveProviderName(opts.provider);
  const apiKey = resolveApiKey(name, opts.apiKey);
  if (!apiKey) {
    throw new Error(
      `${name === "openai" ? "OPENAI_API_KEY" : "DEEPSEEK_API_KEY"} is not set. Add it to .env.local or save one in Settings → LLM key.`,
    );
  }
  return buildProvider({
    name,
    apiKey,
    baseUrl:
      name === "openai"
        ? readEnv("OPENAI_BASE_URL")
        : readEnv("DEEPSEEK_BASE_URL"),
    chatModel:
      name === "openai"
        ? readEnv("OPENAI_CHAT_MODEL")
        : readEnv("DEEPSEEK_CHAT_MODEL"),
    embedModel:
      name === "openai"
        ? readEnv("OPENAI_EMBED_MODEL")
        : readEnv("DEEPSEEK_EMBED_MODEL"),
    embedBaseUrl:
      name === "openai"
        ? undefined
        : readEnv("DEEPSEEK_EMBED_BASE_URL"),
    embeddingDim:
      name === "openai"
        ? readEnv("OPENAI_EMBED_DIM")
          ? Number(readEnv("OPENAI_EMBED_DIM"))
          : undefined
        : readEnv("DEEPSEEK_EMBED_DIM")
          ? Number(readEnv("DEEPSEEK_EMBED_DIM"))
          : undefined,
  });
}

/**
 * Cached default LLM provider (env-based). The cache is busted if any of
 * the relevant env values change between calls. BYOK callers should use
 * `buildLLM({ apiKey })` directly instead of touching this helper.
 */
export function getLLM(): LLMProvider {
  const key = [
    readEnv("LLM_PROVIDER") ?? "deepseek",
    readEnv("DEEPSEEK_API_KEY") ?? "",
    readEnv("DEEPSEEK_BASE_URL") ?? "",
    readEnv("DEEPSEEK_CHAT_MODEL") ?? "",
    readEnv("DEEPSEEK_EMBED_MODEL") ?? "",
    readEnv("DEEPSEEK_EMBED_BASE_URL") ?? "",
    readEnv("DEEPSEEK_EMBED_DIM") ?? "",
    readEnv("OPENAI_API_KEY") ?? "",
    readEnv("OPENAI_BASE_URL") ?? "",
    readEnv("OPENAI_CHAT_MODEL") ?? "",
    readEnv("OPENAI_EMBED_MODEL") ?? "",
    readEnv("OPENAI_EMBED_DIM") ?? "",
  ].join("|");
  if (cached && cachedKey === key) return cached;
  cached = getProvider();
  cachedKey = key;
  return cached;
}

export type { LLMProvider } from "./provider";
export type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  EmbedOptions,
  EmbeddingResult,
} from "./provider";
export { LLMError } from "./provider";
