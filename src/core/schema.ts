import { Schema } from "effect";
import type { AiExtraction } from "./types";

export const AiExtractionSchema = Schema.Struct({
  project: Schema.NullOr(Schema.String),
  summary: Schema.String,
  proposedTask: Schema.NullOr(Schema.String),
  needsReviewReason: Schema.NullOr(Schema.String),
});

export function parseAiExtraction(value: unknown): AiExtraction {
  const parsed = Schema.decodeUnknownSync(AiExtractionSchema)(value);

  return {
    project: normalizeNullableString(parsed.project),
    summary: parsed.summary.trim(),
    proposedTask: normalizeNullableString(parsed.proposedTask),
    needsReviewReason: normalizeNullableString(parsed.needsReviewReason),
  };
}

function normalizeNullableString(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}
