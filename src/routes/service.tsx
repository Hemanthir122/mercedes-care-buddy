import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { useVehicleStore } from "@/lib/vehicle-store";

export const Route = createFileRoute("/service")({
  head: () => ({ meta: [{ title: "Service Portal" }] }),
  component: ServicePortal,
});

function ServicePortal() {
  const { requests, inventory, respondRequest } = useVehicleStore();
  const pending = requests.filter((r) => r.status === "pending");
  const handled = requests.filter((r) => r.status === "responded");

  return (
    <div>
      <TopBar active="service" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-primary">Mercedes Whitefield</div>
          <h1 className="mt-1 text-3xl font-semibold">Service Center Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live customer requests from connected Mercedes vehicles.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-4">
            <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Incoming Requests · {pending.length}
            </div>
            {pending.length === 0 && (
              <div className="mb-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                No pending requests. Trigger one from the MBUX display.
              </div>
            )}
            {pending.map((r) => (
              <RequestCard key={r.id} request={r} inventory={inventory} onRespond={respondRequest} />
            ))}

            {handled.length > 0 && (
              <>
                <div className="mt-8 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Handled
                </div>
                {handled.map((r) => (
                  <div key={r.id} className="mb-glass rounded-2xl p-4 opacity-80">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-semibold">{r.vehicle} · {r.customer}</div>
                        <div className="text-xs text-muted-foreground">{r.issue} — {r.requiredPart}</div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-mb-green">✓ Confirmed</div>
                        <div className="text-muted-foreground">{r.response?.slot}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>

          <aside className="space-y-4">
            <div className="mb-glass rounded-2xl p-5">
              <div className="text-sm font-medium">Parts inventory</div>
              <div className="mt-3 space-y-2 text-sm">
                {Object.entries(inventory).map(([part, qty]) => (
                  <div key={part} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
                    <span className="text-muted-foreground">{part}</span>
                    <span className={`font-mono font-semibold ${qty > 5 ? "text-mb-green" : qty > 0 ? "text-mb-amber" : "text-mb-red"}`}>
                      {qty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-glass rounded-2xl p-5 text-xs text-muted-foreground">
              <div className="mb-2 font-medium text-foreground">Service Center</div>
              Mercedes Whitefield · Bangalore<br />
              Bays free: 3 · Advisors online: 2
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function RequestCard({
  request: r,
  inventory,
  onRespond,
}: {
  request: ReturnType<typeof useVehicleStore.getState>["requests"][number];
  inventory: Record<string, number>;
  onRespond: (id: string, resp: any) => void;
}) {
  const stocked = (inventory[r.requiredPart] ?? 0) > 0;
  const [repairTime, setRepairTime] = useState("1 Hour");
  const [slot, setSlot] = useState("Tomorrow 10:00 AM");

  return (
    <div className="mb-glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-mb-amber">New request</div>
          <div className="mt-1 text-lg font-semibold">{r.vehicle} · {r.customer}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Component health</div>
          <div className={`font-mono text-2xl font-semibold ${r.health < 30 ? "text-mb-red" : "text-mb-amber"}`}>{r.health}%</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Issue" value={r.issue} />
        <Stat label="Predicted failure" value={`${r.predictedFailureDays} days`} />
        <Stat label="Required part" value={r.requiredPart} />
        <Stat label="In stock" value={stocked ? `${inventory[r.requiredPart]} units` : "0"} tone={stocked ? "good" : "bad"} />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface/70 p-4 text-sm">
        <div className="text-xs font-medium uppercase tracking-wider text-primary">AI Summary</div>
        <p className="mt-2 text-muted-foreground">
          Customer reported <span className="text-foreground">{r.issue.toLowerCase()}</span>. Telemetry shows {r.health}% remaining life,
          predicted failure in ~{r.predictedFailureDays} days. Recommend replacing the {r.requiredPart.toLowerCase()} at next visit.
          {stocked ? " Part is in stock." : " Part must be ordered."}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Estimated repair time
          <input
            value={repairTime}
            onChange={(e) => setRepairTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Earliest appointment
          <input
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => onRespond(r.id, { available: false, repairTime, slot, center: "Mercedes Whitefield" })}
        >
          Mark unavailable
        </Button>
        <Button
          disabled={!stocked}
          onClick={() => onRespond(r.id, { available: true, repairTime, slot, center: "Mercedes Whitefield" })}
        >
          Confirm & notify customer
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-mb-green" : tone === "bad" ? "text-mb-red" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-medium ${color}`}>{value}</div>
    </div>
  );
}
