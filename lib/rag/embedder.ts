/**
 * Embed source chunks using the project's LLM provider.
 *
 * Used by the source watcher to (re-)build the source_chunks table after a
 * source content change.
 */

import { LLMProvider } from "../llm/provider";
import { getLLM } from "../llm";

export interface EmbedChunksInput {
  chunks: string[];
  /** Override the default LLM provider. Defaults to the env-configured one. */
  provider?: LLMProvider;
  /** Override the embed model. */
  model?: string;
}

export interface EmbedChunksResult {
  /** Aligned with the input chunks array. */
  embeddings: number[][];
  /** The provider/model used (for logging). */
  provider: string;
  model: string;
}

/**
 * Embed an array of chunks. Returns one embedding per chunk, in the same
 * order. Empty input -> empty result.
 */
export async function embedChunks(
  input: EmbedChunksInput,
): Promise<EmbedChunksResult> {
  if (input.chunks.length === 0) {
    return { embeddings: [], provider: "", model: "" };
  }
  const provider = input.provider ?? getLLM();
  const model = input.model ?? provider.defaultEmbedModel;
  const result = await provider.embed(input.chunks, { model });
  // Defensive: if the provider returns fewer embeddings than chunks (some
  // do that on partial failure), pad with empty vectors so callers can write
  // them in a single batch and surface the mismatch separately.
  const embeddings: number[][] = input.chunks.map((_, i) => {
    const v = result[i]?.embedding ?? [];
    return v;
  });
  return { embeddings, provider: provider.name, model };
}
