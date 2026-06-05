import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useVehicleStore, WARNING_META, type WarningCode } from "@/lib/vehicle-store";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Demo Control · MBUX" }] }),
  component: DemoPanel,
});

function DemoPanel() {
  const { health, warnings, setHealth, triggerWarning, clearWarning, clearAllWarnings, reset } =
    useVehicleStore();

  const warningButtons = Object.keys(WARNING_META) as WarningCode[];

  const sliders: Array<{ k: keyof typeof health; label: string }> = [
    { k: "battery", label: "Battery Health" },
    { k: "brakes", label: "Brake Pad Health" },
    { k: "wipers", label: "Wiper Health" },
    { k: "ac", label: "AC Health" },
    { k: "tires", label: "Tire Health" },
    { k: "engine", label: "Engine Health" },
  ];

  return (
    <div>
      <TopBar active="demo" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-primary">Hackathon Simulator</div>
            <h1 className="mt-1 text-3xl font-semibold">Demo Control Panel</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Trigger warnings or degrade components. The MBUX display and service portal react instantly.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={clearAllWarnings}>Clear warnings</Button>
            <Button variant="destructive" onClick={reset}>Reset vehicle</Button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="mb-glass rounded-2xl p-6">
            <div className="text-sm font-medium">Trigger warning lights</div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {warningButtons.map((code) => {
                const active = warnings.some((w) => w.code === code);
                return (
                  <button
                    key={code}
                    onClick={() => (active ? clearWarning(code) : triggerWarning(code))}
                    className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                      active
                        ? "border-mb-amber/60 bg-mb-amber/10 text-mb-amber"
                        : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-mb-amber mb-pulse" : "bg-muted-foreground/40"}`} />
                      <span className="font-medium">{WARNING_META[code].label}</span>
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider opacity-70">
                      {WARNING_META[code].severity}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mb-glass rounded-2xl p-6">
            <div className="text-sm font-medium">Component health sliders</div>
            <div className="mt-4 space-y-5">
              {sliders.map(({ k, label }) => {
                const v = health[k];
                const color = v < 30 ? "text-mb-red" : v < 60 ? "text-mb-amber" : "text-mb-green";
                return (
                  <div key={k}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-mono text-base font-semibold ${color}`}>{v}%</span>
                    </div>
                    <Slider value={[v]} onValueChange={(val) => setHealth(k, val[0])} min={0} max={100} step={1} />
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Dropping a value below 40% automatically raises the matching warning on the MBUX display.
            </p>
          </section>
        </div>

        <section className="mt-6 mb-glass rounded-2xl p-6">
          <div className="text-sm font-medium">Live vehicle telemetry</div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface p-4 text-xs text-muted-foreground">
{JSON.stringify({ vehicleId: "MB001", model: "GLC 300", health, warnings: warnings.map(w => ({ code: w.code, severity: w.severity })) }, null, 2)}
          </pre>
        </section>
      </main>
    </div>
  );
}
