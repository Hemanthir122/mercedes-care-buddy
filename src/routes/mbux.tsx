import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { askMercedes } from "@/lib/ai-chat.functions";
import { HEALTH_SCORE, useVehicleStore, type Severity } from "@/lib/vehicle-store";

export const Route = createFileRoute("/mbux")({
  head: () => ({ meta: [{ title: "MBUX Display" }] }),
  component: Mbux,
});

type Msg = { role: "user" | "assistant"; text: string };

function Mbux() {
  const [started, setStarted] = useState(false);
  return (
    <div>
      <TopBar active="mbux" />
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        {!started ? <StartScreen onStart={() => setStarted(true)} /> : <Cockpit />}
      </main>
    </div>
  );
}

/* ─────────────────────────── Start Screen ─────────────────────────── */

function StartScreen({ onStart }: { onStart: () => void }) {
  const [pressing, setPressing] = useState(false);
  return (
    <div className="amg-frame relative mx-auto flex h-[78vh] min-h-[560px] max-w-[1200px] flex-col items-center justify-center overflow-hidden rounded-[28px]">
      <div className="absolute inset-0 mb-grid opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.82_0.13_200/0.18),_transparent_60%)]" />

      <div className="relative flex flex-col items-center">
        <svg viewBox="0 0 100 100" className="h-20 w-20 text-mb-silver" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="50" cy="50" r="46" />
          <path d="M50 8 L50 50 M50 50 L14 72 M50 50 L86 72" />
        </svg>
        <div className="mt-6 text-[11px] uppercase tracking-[0.5em] text-muted-foreground">Mercedes-AMG</div>
        <div className="mt-2 font-light text-3xl tracking-[0.2em] text-mb-silver">GLC 63 S</div>
        <div className="mt-1 text-xs tracking-widest text-mb-cyan">MBUX • READY</div>
      </div>

      <button
        onMouseDown={() => setPressing(true)}
        onMouseUp={() => setPressing(false)}
        onMouseLeave={() => setPressing(false)}
        onClick={() => setTimeout(onStart, 350)}
        className="relative mt-12 h-44 w-44 rounded-full transition-transform active:scale-95"
        aria-label="Engine start"
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_oklch(0.3_0.02_240),_oklch(0.18_0.014_240))] shadow-[0_20px_60px_-10px_oklch(0_0_0/0.7),inset_0_2px_0_oklch(1_0_0/0.08)]" />
        <span className="absolute inset-3 rounded-full border border-mb-red/40 bg-[radial-gradient(circle_at_50%_40%,_oklch(0.35_0.18_25),_oklch(0.22_0.12_25))] shadow-[inset_0_-6px_20px_oklch(0_0_0/0.6)]" />
        <span className={`absolute inset-0 rounded-full ${pressing ? "opacity-100" : "opacity-60"} mb-pulse pointer-events-none`} style={{ boxShadow: "0 0 60px 4px oklch(0.65 0.22 25 / 0.45)" }} />
        <span className="relative flex h-full w-full flex-col items-center justify-center text-mb-silver">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 3v9" />
            <path d="M5.5 7a8 8 0 1 0 13 0" />
          </svg>
          <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.35em]">Engine</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em]">Start • Stop</span>
        </span>
      </button>

      <div className="mt-10 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Press to enter MBUX</div>
    </div>
  );
}

/* ─────────────────────────── Cockpit ─────────────────────────── */

const sevColor: Record<Severity, string> = {
  low: "text-mb-green border-mb-green/40 bg-mb-green/10",
  medium: "text-mb-amber border-mb-amber/40 bg-mb-amber/10",
  high: "text-mb-amber border-mb-amber/60 bg-mb-amber/15",
  critical: "text-mb-red border-mb-red/60 bg-mb-red/15",
};

function Cockpit() {
  const { health, warnings, model, location, addRequest } = useVehicleStore();
  const score = HEALTH_SCORE(health);
  const ask = useServerFn(askMercedes);

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: `Welcome. Your ${model} is at ${score}% health. Tap the mic or say "Hey Mercedes".` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const recogRef = useRef<any>(null);
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
      speak(res.text);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't reach the AI service right now." }]);
    } finally {
      setLoading(false);
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1; u.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function startVoice() {
    setVoiceOpen(true);
    setHeard("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setHeard("Voice not supported in this browser. Type instead.");
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((x: any) => x[0].transcript).join("");
      setHeard(t);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
        setTimeout(() => {
          setVoiceOpen(false);
          send(t);
        }, 600);
      }
    };
    r.onerror = () => { setListening(false); setHeard("Didn't catch that. Try again."); };
    r.onend = () => setListening(false);
    recogRef.current = r;
    try { r.start(); } catch {}
  }

  function stopVoice() {
    try { recogRef.current?.stop(); } catch {}
    setListening(false);
    setVoiceOpen(false);
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
      { role: "user", text: "Find nearest service center." },
      { role: "assistant", text: "Sent to Mercedes Whitefield. They'll confirm shortly." },
    ]);
  }

  const requests = useVehicleStore((s) => s.requests);
  const latestResponse = requests.find((r) => r.status === "responded");
  const speed = Math.round(40 + (score / 100) * 60);
  const rpm = Math.round(1.2 + (health.engine / 100) * 2.4);

  return (
    <div className="amg-frame relative overflow-hidden rounded-[28px]">
      {/* Status bar */}
      <div className="flex items-center justify-between border-b border-white/5 bg-black/30 px-6 py-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>● MBUX</span>
          <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>22°C</span>
          <span>P • D • R</span>
          <span className="text-mb-green">◉ Online</span>
        </div>
      </div>

      {/* Triple-screen layout */}
      <div className="grid gap-[2px] bg-white/5 md:grid-cols-[1fr_1.4fr_1fr]">
        {/* Left dial — speed */}
        <Dial label="km/h" value={speed} max={260} accent="mb-cyan" sub={`${score}% HEALTH`} />

        {/* Center infotainment */}
        <div className="bg-[oklch(0.13_0.012_240)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Mercedes-AMG</div>
              <div className="text-xl font-light tracking-wider text-mb-silver">{model}</div>
            </div>
            <button
              onClick={startVoice}
              className="group flex items-center gap-2 rounded-full border border-mb-cyan/40 bg-mb-cyan/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-mb-cyan hover:bg-mb-cyan/20"
            >
              <MicIcon className="h-3.5 w-3.5" /> Hey Mercedes
            </button>
          </div>

          {/* Chat transcript */}
          <div ref={scrollRef} className="mt-4 h-[280px] space-y-2 overflow-y-auto rounded-2xl border border-white/5 bg-black/30 p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "bg-mb-cyan/20 text-mb-cyan border border-mb-cyan/30" : "bg-white/5 text-foreground border border-white/5"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/5 bg-white/5 px-3.5 py-2 text-sm">
                  <Equalizer /> Mercedes is thinking…
                </div>
              </div>
            )}
          </div>

          {/* Quick chips + input */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["What is this error?", "Can I drive?", "Nearest service", "How urgent?"].map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:border-mb-cyan/40 hover:text-mb-cyan">
                {q}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Type or say Hey Mercedes…"
              className="flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm outline-none focus:border-mb-cyan/60"
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()} className="rounded-full bg-mb-cyan/20 px-4 text-xs uppercase tracking-wider text-mb-cyan disabled:opacity-40">Send</button>
          </div>
        </div>

        {/* Right dial — RPM */}
        <Dial label="× 1000 RPM" value={rpm * 10} max={80} accent="mb-amber" sub={`ENGINE ${health.engine}%`} digital={`${rpm.toFixed(1)}`} />
      </div>

      {/* Bottom — alerts + health bar */}
      <div className="grid gap-[2px] bg-white/5 md:grid-cols-[1.6fr_1fr]">
        <div className="bg-[oklch(0.14_0.012_240)] p-5">
          <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span>⚠ Vehicle Alerts</span>
            <span>{warnings.length} active</span>
          </div>
          {warnings.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-center text-xs text-muted-foreground">All systems nominal</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {warnings.slice(0, 4).map((w) => (
                <button key={w.code} onClick={() => send(`Explain ${w.label}`)} className={`rounded-xl border p-3 text-left ${sevColor[w.severity]}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">⚠ {w.label}</span>
                    <span className="rounded-full border border-current px-1.5 py-0.5 text-[9px] uppercase">{w.severity}</span>
                  </div>
                  <div className="mt-1 text-[11px] opacity-80">{w.description}</div>
                </button>
              ))}
            </div>
          )}
          {latestResponse && (
            <div className="mt-3 rounded-xl border border-mb-cyan/30 bg-mb-cyan/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-mb-cyan">Service Reply</div>
              <div className="mt-1 text-sm text-foreground">{latestResponse.response?.center} • {latestResponse.response?.slot} • {latestResponse.response?.repairTime}</div>
            </div>
          )}
        </div>

        <div className="bg-[oklch(0.14_0.012_240)] p-5">
          <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Components</div>
          <div className="space-y-2">
            {(Object.entries(health) as [string, number][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <div className="w-16 text-[10px] uppercase tracking-wider text-muted-foreground">{labelFor(k)}</div>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${v > 70 ? "bg-mb-green" : v > 40 ? "bg-mb-amber" : "bg-mb-red"}`} style={{ width: `${v}%` }} />
                </div>
                <div className="w-10 text-right font-mono text-xs">{v}%</div>
              </div>
            ))}
          </div>
          <button onClick={sendServiceRequest} className="mt-4 w-full rounded-full border border-mb-cyan/40 bg-mb-cyan/10 py-2 text-[10px] uppercase tracking-[0.25em] text-mb-cyan hover:bg-mb-cyan/20">
            Request Nearest Service
          </button>
        </div>
      </div>

      {/* Voice overlay */}
      {voiceOpen && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl">
          <div className="text-[10px] uppercase tracking-[0.5em] text-mb-cyan">Hey Mercedes</div>
          <div className="mt-8">
            <VoiceOrb active={listening} />
          </div>
          <div className="mt-8 min-h-[60px] max-w-md px-6 text-center text-lg font-light text-mb-silver">
            {heard || (listening ? "Listening…" : "Say something")}
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={stopVoice} className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">Cancel</button>
            {heard && !listening && (
              <button onClick={() => { setVoiceOpen(false); send(heard); }} className="rounded-full bg-mb-cyan/20 px-5 py-2 text-xs uppercase tracking-wider text-mb-cyan">Send</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Pieces ─────────────────────────── */

function Dial({ label, value, max, accent, sub, digital }: { label: string; value: number; max: number; accent: string; sub: string; digital?: string }) {
  const pct = Math.min(1, value / max);
  const r = 90;
  const c = 2 * Math.PI * r;
  const dash = pct * c * 0.75;
  const color = accent === "mb-cyan" ? "var(--mb-cyan)" : "var(--mb-amber)";
  return (
    <div className="relative flex aspect-square items-center justify-center bg-[oklch(0.12_0.012_240)] p-4">
      <svg viewBox="0 0 220 220" className="absolute inset-0 h-full w-full -rotate-[135deg]">
        <circle cx="110" cy="110" r={r} stroke="oklch(0.25 0.014 240)" strokeWidth="6" fill="none" strokeDasharray={`${c * 0.75} ${c}`} />
        <circle cx="110" cy="110" r={r} stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" strokeDasharray={`${dash} ${c}`} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        {Array.from({ length: 11 }).map((_, i) => {
          const a = (i / 10) * 0.75 * 2 * Math.PI;
          const x1 = 110 + Math.cos(a) * 76;
          const y1 = 110 + Math.sin(a) * 76;
          const x2 = 110 + Math.cos(a) * 84;
          const y2 = 110 + Math.sin(a) * 84;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(0.7 0.018 240)" strokeWidth="1.5" />;
        })}
      </svg>
      <div className="relative text-center">
        <div className="font-mono text-5xl font-light text-mb-silver">{digital ?? value}</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
        <div className="mt-4 text-[10px] uppercase tracking-[0.25em]" style={{ color }}>{sub}</div>
      </div>
    </div>
  );
}

function VoiceOrb({ active }: { active: boolean }) {
  return (
    <div className="relative h-44 w-44">
      <span className={`absolute inset-0 rounded-full bg-mb-cyan/20 ${active ? "mb-pulse" : ""}`} style={{ filter: "blur(20px)" }} />
      <span className={`absolute inset-4 rounded-full border border-mb-cyan/50 bg-gradient-to-br from-mb-cyan/30 to-transparent ${active ? "mb-pulse" : ""}`} />
      <span className="absolute inset-10 flex items-center justify-center rounded-full bg-black/40">
        <MicIcon className="h-10 w-10 text-mb-cyan" />
      </span>
      {active && (
        <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 items-end gap-1">
          {[0,1,2,3,4,5,6].map((i) => (
            <span key={i} className="w-1 rounded-full bg-mb-cyan" style={{ height: `${10 + (i % 3) * 8}px`, animation: `eq 0.9s ${i * 0.08}s ease-in-out infinite alternate` }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Equalizer() {
  return (
    <span className="inline-flex items-end gap-0.5 align-middle">
      {[0,1,2,3].map((i) => (
        <span key={i} className="w-0.5 rounded bg-mb-cyan" style={{ height: `${6 + (i%3)*4}px`, animation: `eq 0.7s ${i*0.1}s ease-in-out infinite alternate` }} />
      ))}
    </span>
  );
}

function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function sevWeight(s: Severity) { return { low: 1, medium: 2, high: 3, critical: 4 }[s]; }
function labelFor(k: string) { return ({ battery: "Battery", brakes: "Brakes", wipers: "Wipers", ac: "AC", tires: "Tires", engine: "Engine" } as Record<string,string>)[k] ?? k; }
function lowestComponent(h: Record<string, number>) {
  let key = "brakes", value = 100;
  for (const [k, v] of Object.entries(h)) if (v < value) { key = k; value = v; }
  return { key, value, label: labelFor(key) };
}
function partFor(k: string) {
  return ({ brakes: "Brake Pads", wipers: "Wiper Motor", battery: "Battery", ac: "AC Compressor", tires: "Tire", engine: "Coolant" } as Record<string,string>)[k] ?? "Diagnostic";
}
