import { handleSchedule } from "@vercel/schedules";
import { getStore } from "@/lib/data";
import { sendMorningDigests } from "@/lib/notify/run-digest";

export const dynamic = "force-dynamic";

const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

/**
 * The morning summary. Vercel's scheduler calls this privately on weekday
 * mornings (see "schedules" in vercel.json); it has no public URL to call.
 */
export const POST = handleSchedule(async (metadata) => {
  // After an outage, Vercel delivers missed runs. A summary from yesterday
  // morning is no use at lunch, so skip anything more than three hours late.
  if (Date.now() - metadata.scheduledAt.getTime() > STALE_AFTER_MS) {
    console.log("morning summary skipped: run is stale", metadata.executionId);
    return;
  }
  const result = await sendMorningDigests(await getStore());
  console.log("morning summary", metadata.executionId, JSON.stringify(result));
});
