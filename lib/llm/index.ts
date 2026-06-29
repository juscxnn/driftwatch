/**
 * LLM provider factory.
 *
 * Reads the LLM_PROVIDER env var and returns the configured provider.
 * Defaults to deepseek. Falls back to deepseek (and logs a warning) if an
 * unknown provider is requested.
 *
 * Usage:
 *   import { getLLM } from "@/lib/llm";
 *   const llm = getLLM();
 *   const { content } = await llm.chat([...]);
 */

import { LLMProvider } from "./provider";
import { DeepSeekProvider } from "./providers/deepseek";
import { OpenAIProvider } from "./providers/openai";

export type ProviderName = "deepseek" | "openai";

let cached: LLMProvider | null = null;
let cachedKey: string | null = null;

function readEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Resolve the provider for a given name. `name` is the LLM_PROVIDER value or
 * the per-project override. Throws if the provider requires env vars that
 * aren't set.
 */
export function getProvider(name?: string): LLMProvider {
  const provider = (name ?? readEnv("LLM_PROVIDER") ?? "deepseek").toLowerCase();

  switch (provider) {
    case "deepseek": {
      const apiKey = readEnv("DEEPSEEK_API_KEY");
      if (!apiKey) {
        throw new Error(
          "DEEPSEEK_API_KEY is not set. Add it to .env.local to use the deepseek provider.",
        );
      }
      return new DeepSeekProvider({
        apiKey,
        baseUrl: readEnv("DEEPSEEK_BASE_URL"),
        chatModel: readEnv("DEEPSEEK_CHAT_MODEL"),
        embedModel: readEnv("DEEPSEEK_EMBED_MODEL"),
        embedBaseUrl: readEnv("DEEPSEEK_EMBED_BASE_URL"),
        embeddingDim: readEnv("DEEPSEEK_EMBED_DIM")
          ? Number(readEnv("DEEPSEEK_EMBED_DIM"))
          : undefined,
      });
    }
    case "openai": {
      const apiKey = readEnv("OPENAI_API_KEY");
      if (!apiKey) {
        throw new Error(
          "OPENAI_API_KEY is not set. Add it to .env.local to use the openai provider.",
        );
      }
      return new OpenAIProvider({
        apiKey,
        baseUrl: readEnv("OPENAI_BASE_URL"),
        chatModel: readEnv("OPENAI_CHAT_MODEL"),
        embedModel: readEnv("OPENAI_EMBED_MODEL"),
        embeddingDim: readEnv("OPENAI_EMBED_DIM")
          ? Number(readEnv("OPENAI_EMBED_DIM"))
          : undefined,
      });
    }
    default:
      // Unknown provider — fall back to deepseek so we never silently no-op.
      // eslint-disable-next-line no-console
      console.warn(
        `[llm] Unknown LLM_PROVIDER="${provider}". Falling back to deepseek.`,
      );
      return getProvider("deepseek");
  }
}

/**
 * Cached default LLM provider. The cache is busted if the underlying env
 * changes (we compare relevant keys on each call).
 */
export function getLLM(): LLMProvider {
  const key = [
    readEnv("LLM_PROVIDER") ?? "deepseek",
    readEnv("DEEPSEEK_API_KEY") ?? "",
    readEnv("DEEPSEEK_BASE_URL") ?? "",
    readEnv("DEEPSEEK_EMBED_MODEL") ?? "",
    readEnv("DEEPSEEK_EMBED_BASE_URL") ?? "",
    readEnv("DEEPSEEK_EMBED_DIM") ?? "",
    readEnv("OPENAI_API_KEY") ?? "",
    readEnv("OPENAI_BASE_URL") ?? "",
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
