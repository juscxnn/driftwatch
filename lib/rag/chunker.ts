/**
 * Naive chunker for source content.
 *
 * Splits on paragraphs first, then on sentences, then on word boundaries,
 * capping each chunk at ~`maxTokens` tokens. Token count is approximated as
 * `chars / 4` — accurate enough for v1, no need to ship tiktoken.
 *
 * Input: free-form text (HTML already stripped by the caller).
 * Output: ordered array of string chunks, each <= maxTokens.
 */

export interface ChunkOptions {
  /** Approximate token cap per chunk. Default 500. */
  maxTokens?: number;
}

const DEFAULT_MAX_TOKENS = 500;
const CHARS_PER_TOKEN = 4;

function approxTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Split a paragraph into sentences. Tolerates common abbreviations. */
function splitSentences(paragraph: string): string[] {
  if (!paragraph.trim()) return [];
  // Split on sentence-ending punctuation followed by whitespace and capital
  // letter, or end-of-string. This is intentionally simple.
  const re = /(?<=[.!?])\s+(?=[A-Z(\["'])|$/g;
  return paragraph
    .split(re)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitWords(text: string, maxTokens: number): string[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const out: string[] = [];
  const words = text.split(/\s+/);
  let buf = "";
  for (const w of words) {
    const candidate = buf.length === 0 ? w : `${buf} ${w}`;
    if (candidate.length > maxChars && buf.length > 0) {
      out.push(buf);
      buf = w;
    } else {
      buf = candidate;
    }
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

/**
 * Split `text` into chunks of <= maxTokens (approximate). Always returns
 * at least one chunk unless the input is empty.
 */
export function chunkText(
  text: string,
  opts: ChunkOptions = {},
): string[] {
  const maxTokens = Math.max(16, opts.maxTokens ?? DEFAULT_MAX_TOKENS);
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks: string[] = [];
  // 1. Split on blank lines (paragraphs).
  const paragraphs = trimmed.split(/\n\s*\n+/);
  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;
    if (approxTokens(p) <= maxTokens) {
      chunks.push(p);
      continue;
    }
    // 2. Too long -> try sentences.
    const sentences = splitSentences(p);
    if (sentences.length === 0) {
      chunks.push(p);
      continue;
    }
    let buf = "";
    for (const s of sentences) {
      const candidate = buf.length === 0 ? s : `${buf} ${s}`;
      if (approxTokens(candidate) > maxTokens && buf.length > 0) {
        if (approxTokens(buf) <= maxTokens) {
          chunks.push(buf);
        } else {
          // 3. Sentence itself too long -> word-boundary split.
          chunks.push(...splitWords(buf, maxTokens));
        }
        buf = s;
      } else {
        buf = candidate;
      }
    }
    if (buf.length > 0) {
      if (approxTokens(buf) <= maxTokens) {
        chunks.push(buf);
      } else {
        chunks.push(...splitWords(buf, maxTokens));
      }
    }
  }
  return chunks;
}
