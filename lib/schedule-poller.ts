const globalForPoller = globalThis as unknown as {
  mealPlannerSchedulePoller?: ReturnType<typeof setInterval>;
  mealPlannerScheduleTick?: boolean;
};

function runUrl(): string {
  const port = process.env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${port}/api/schedules/run`;
}

export function startSchedulePoller(): void {
  if (process.env.SCHEDULE_POLLER === "false") return;
  if (globalForPoller.mealPlannerSchedulePoller) return;

  const tick = async () => {
    if (globalForPoller.mealPlannerScheduleTick) return;
    globalForPoller.mealPlannerScheduleTick = true;
    try {
      const secret = process.env.CRON_SECRET?.trim();
      const response = await fetch(runUrl(), {
        method: "POST",
        headers: secret ? { Authorization: `Bearer ${secret}` } : undefined
      });
      if (!response.ok) {
        console.error("[schedule-poller] Run failed:", response.status, await response.text().catch(() => ""));
      }
    } catch (error) {
      console.error("[schedule-poller]", error);
    } finally {
      globalForPoller.mealPlannerScheduleTick = false;
    }
  };

  globalForPoller.mealPlannerSchedulePoller = setInterval(() => {
    void tick();
  }, 60_000);

  setTimeout(() => {
    void tick();
  }, 5_000);
}
