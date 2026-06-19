import { Data } from "effect";

export class ProcessingError extends Data.TaggedError("ProcessingError")<{
  message: string;
  cause?: unknown;
}> {}

export class IntegrationError extends Data.TaggedError("IntegrationError")<{
  service: "telegram" | "notion" | "openai" | "queue";
  message: string;
  cause?: unknown;
}> {}
