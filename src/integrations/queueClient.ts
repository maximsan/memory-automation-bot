import { send } from "@vercel/queue";
import type { CaptureJob } from "@/core/types";

const CAPTURE_TOPIC = "capture-processing";

/**
 * Queue only carries work notifications. The Notion note already exists before
 * this is called, so queue retention limits cannot lose the capture itself.
 */
export async function enqueueCapture(job: CaptureJob): Promise<void> {
  await send(CAPTURE_TOPIC, job, {
    idempotencyKey: job.noteId,
    retentionSeconds: 86400
  });
}
