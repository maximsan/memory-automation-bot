import { send } from "@vercel/queue";
import type { CaptureJob } from "@/core/types";

const CAPTURE_TOPIC = "capture-processing";

export async function enqueueCapture(job: CaptureJob): Promise<void> {
  await send(CAPTURE_TOPIC, job, {
    idempotencyKey: job.noteId,
    retentionSeconds: 86400
  });
}
