import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { askMercedes } from "@/lib/ai-chat.functions";
import { HEALTH_SCORE, useVehicleStore, WARNING_META, type Severity } from "@/lib/vehicle-store";

export const Route = createFileRoute("/mbux")({
  head: () => ({ meta: [{ title: "MBUX Display" }] }),
  component: Mbux,
});

const sevColor: Record<Severity, string> = {
  low: "text-mb-green border-mb-green/40 bg-mb-green/10",
  medium: "text-mb-amber border-mb-amber/40 bg-mb-amber/10",
  high: "text-mb-amber border-mb-amber/60 bg-mb-amber/15",
  critical: "text-mb-red border-mb-red/60 bg-mb-red/15",
};

type Msg = { role: "user" | "assistant"; text: string };

function Mbux() {
  const { health, warnings, model, location, addRequest } = useVehicleStore();
  const score = HEALTH_SCORE(health);
  const ask = useServerFn(askMercedes);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: `Welcome back. I'm your Mercedes AI Care Companion. Your ${model} is at ${score}% overall health. How can I help?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({
        data: {
          question,
          vehicle: { model, location, health },
          warnings: warnings.map((w) => ({ code: w.code, label: w.label, severity: w.severity })),
        },
      });
      setMessages((m) => [...m, { role: "assistant", text: res.text }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't reach the AI service right now." }]);
    } finally {
      setLoading(false);
    }
  }

  function sendServiceRequest() {
    const worst = [...warnings].sort((a, b) => sevWeight(b.severity) - sevWeight(a.severity))[0];
    const lowest = lowestComponent(health);
    addRequest({
      customer: "John Doe",
      vehicle: `Mercedes ${model}`,
      issue: worst ? worst.label : `${lowest.label} degradation`,
      health: lowest.value,
      predictedFailureDays: Math.max(7, Math.round(lowest.value * 1.2)),
      requiredPart: partFor(lowest.key),
    });
    setMessages((m) => [
      ...m,
      { role: "user", text: "Find nearest service center and check part availability." },
      { role: "assistant", text: "I've sent your request to Mercedes Whitefield. They'll confirm the part and slot shortly. You'll see the response appear here." },
    ]);
  }

  const score_color = score > 80 ? "text-mb-green" : score > 60 ? "text-mb-amber" : "text-mb-red";
  const requests = useVehicleStore((s) => s.requests);
  const latestResponse = requests.find((r) => r.status === "responded");

  return (
    <div>
      <TopBar active="mbux" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Left column */}
          <div className="space-y-6">
            <section className="mb-glass relative overflow-hidden rounded-3xl p-8">
              <div className="absolute inset-0 mb-grid opacity-30" />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Vehicle Health</div>
                  <div className={`mt-2 text-7xl font-semibold tracking-tight ${score_color}`}>{score}<span className="text-3xl text-muted-foreground">%</span></div>
                  <div className="mt-2 text-sm text-muted-foreground">Mercedes-Benz {model} · {location}</div>
                </div>
                <RingGauge value={score} />
              </div>
              <div className="relative mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {(Object.entries(health) as [keyof typeof health, number][]).map(([k, v]) => (
                  <HealthChip key={k} label={labelFor(k)} value={v} />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Active Alerts</h2>
                <span className="text-xs text-muted-foreground">{warnings.length} active</span>
              </div>
              {warnings.length === 0 ? (
                <div className="mb-glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
                  All systems nominal. Drive safely.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {warnings.map((w) => (
                    <div key={w.code} className={`rounded-2xl border p-4 ${sevColor[w.severity]}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">⚠ {w.label}</div>
                        <span className="rounded-full border border-current px-2 py-0.5 text-[10px] uppercase tracking-wider">
                          {w.severity}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-foreground/80">{w.description}</div>
                      <button
                        onClick={() => send(`What is the ${w.label} warning? Is it safe to drive?`)}
                        className="mt-3 text-xs underline-offset-2 hover:underline"
                      >
                        Ask AI about this →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {latestResponse && (
              <section className="mb-glass mb-ring-glow rounded-2xl p-5">
                <div className="text-[11px] uppercase tracking-[0.3em] text-primary">Service Center Response</div>
                <div className="mt-2 text-lg font-semibold">{latestResponse.response?.center}</div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <Info label="Part" value={latestResponse.response?.available ? "Available" : "Unavailable"} />
                  <Info label="Repair time" value={latestResponse.response?.repairTime ?? "—"} />
                  <Info label="Slot" value={latestResponse.response?.slot ?? "—"} />
                </div>
              </section>
            )}
          </div>

          {/* Right column — Voice assistant */}
          <aside className="mb-glass flex h-[80vh] min-h-[600px] flex-col overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-primary">AI Care Companion</div>
                <div className="mt-1 text-base font-semibold">Hey Mercedes</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-mb-green mb-pulse" /> Online
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-2 text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-surface-2 px-4 py-2.5 text-sm">
                    <span className="mb-pulse">●</span> thinking…
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {["What is this error?", "Can I continue driving?", "How serious is this?", "How much time do I have?"].map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => send("What is the most important thing I should know about my vehicle right now?")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:scale-105"
                  aria-label="Voice"
                >
                  🎤
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder="Ask Mercedes AI…"
                  className="flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none focus:border-primary/60"
                />
                <Button onClick={() => send(input)} disabled={loading || !input.trim()} className="rounded-full">
                  Send
                </Button>
              </div>
              <Button variant="secondary" className="mt-3 w-full" onClick={sendServiceRequest}>
                Find nearest service center & request part
              </Button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function RingGauge({ value }: { value: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const color = value > 80 ? "var(--mb-green)" : value > 60 ? "var(--mb-amber)" : "var(--mb-red)";
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
      <circle cx="70" cy="70" r={r} stroke="oklch(0.3 0.014 240)" strokeWidth="10" fill="none" />
      <circle
        cx="70" cy="70" r={r}
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        fill="none"
      />
    </svg>
  );
}

function HealthChip({ label, value }: { label: string; value: number }) {
  const color = value > 70 ? "text-mb-green" : value > 40 ? "text-mb-amber" : "text-mb-red";
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-xl font-semibold ${color}`}>{value}%</div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: "currentColor" }} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function labelFor(k: string) {
  const m: Record<string, string> = { battery: "Battery", brakes: "Brakes", wipers: "Wipers", ac: "AC", tires: "Tires", engine: "Engine" };
  return m[k] ?? k;
}
function sevWeight(s: Severity) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[s];
}
function lowestComponent(h: Record<string, number>) {
  let key = "brakes", value = 100;
  for (const [k, v] of Object.entries(h)) if (v < value) { key = k; value = v; }
  return { key, value, label: labelFor(key) };
}
function partFor(k: string) {
  const m: Record<string, string> = {
    brakes: "Brake Pads", wipers: "Wiper Motor", battery: "Battery",
    ac: "AC Compressor", tires: "Tire", engine: "Coolant",
  };
  return m[k] ?? "Diagnostic";
}
