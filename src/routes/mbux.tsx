import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { askMercedes } from "@/lib/ai-chat.functions";
import cockpitAsset from "@/assets/cockpit.png.asset.json";
import {
  useVehicleStore,
  SERVICE_CENTERS,
  COMPONENT_META,
  type Severity,
  type HealthKey,
  type ServiceRequest,
} from "@/lib/vehicle-store";

export const Route = createFileRoute("/mbux")({
  head: () => ({ meta: [{ title: "MBUX Display" }] }),
  component: Mbux,
});

type Msg =
  | { kind: "text"; role: "user" | "assistant"; text: string }
  | { kind: "prompt"; id: string; componentKey: HealthKey; text: string; resolved?: "yes" | "no" }
  | { kind: "responses"; groupId: string; componentKey: HealthKey };

function Mbux() {
  const [started, setStarted] = useState(false);
  return (
    <div>
      <TopBar active="mbux" />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
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
  const { health, warnings, model, location, requests, requestService } = useVehicleStore();
  const ask = useServerFn(askMercedes);

  const [messages, setMessages] = useState<Msg[]>([
    { kind: "text", role: "assistant", text: `Welcome. Your ${model} is ready. Tap mic or say "Hey Mercedes".` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [clock, setClock] = useState("");
  const recogRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track which components have been auto-notified / prompted to avoid spam
  const notifyState = useRef<Record<string, { autoSent?: boolean; promptShown?: boolean }>>({});

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Threshold watcher: <20% auto-send both centers, <30% prompt customer
  useEffect(() => {
    const keys = Object.keys(health) as HealthKey[];
    for (const k of keys) {
      const v = health[k];
      const state = (notifyState.current[k] ||= {});
      if (v >= 30) {
        // Reset when recovered above prompt threshold
        state.autoSent = false;
        state.promptShown = false;
        continue;
      }
      const meta = COMPONENT_META[k];
      if (v < 20 && !state.autoSent) {
        state.autoSent = true;
        state.promptShown = true;
        const groupId = requestService({
          componentKey: k,
          issue: meta.issue,
          requiredPart: meta.part,
          health: v,
          predictedFailureDays: Math.max(1, Math.round(v / 3)),
          centers: [...SERVICE_CENTERS],
        });
        const sysText = `⚠ Critical: ${meta.issue} at ${v}%. I've automatically notified Mercedes ${SERVICE_CENTERS.join(" and ")} service centers.`;
        setMessages((m) => [
          ...m,
          { kind: "text", role: "assistant", text: sysText },
          { kind: "responses", groupId, componentKey: k },
        ]);
        speak(sysText);
      } else if (v < 30 && !state.promptShown) {
        state.promptShown = true;
        const text = `Your ${meta.issue.toLowerCase()} is at ${v}%. Would you like me to connect you with a Mercedes service center?`;
        setMessages((m) => [
          ...m,
          { kind: "prompt", id: crypto.randomUUID(), componentKey: k, text },
        ]);
        speak(text);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health.battery, health.brakes, health.wipers, health.ac, health.tires, health.engine]);

  function handlePromptAnswer(promptId: string, componentKey: HealthKey, answer: "yes" | "no") {
    setMessages((m) =>
      m.map((msg) =>
        msg.kind === "prompt" && msg.id === promptId ? { ...msg, resolved: answer } : msg
      )
    );
    if (answer === "no") {
      const t = "Understood. I'll keep monitoring and alert you if it gets worse.";
      setMessages((m) => [...m, { kind: "text", role: "assistant", text: t }]);
      speak(t);
      return;
    }
    const meta = COMPONENT_META[componentKey];
    const v = health[componentKey];
    const groupId = requestService({
      componentKey,
      issue: meta.issue,
      requiredPart: meta.part,
      health: v,
      predictedFailureDays: Math.max(1, Math.round(v / 3)),
      centers: [...SERVICE_CENTERS],
    });
    const t = `Connecting you to ${SERVICE_CENTERS.join(" and ")}. I'll show their responses here.`;
    setMessages((m) => [
      ...m,
      { kind: "text", role: "user", text: "Yes, please connect me." },
      { kind: "text", role: "assistant", text: t },
      { kind: "responses", groupId, componentKey },
    ]);
    speak(t);
  }

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { kind: "text", role: "user", text: question }]);
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
      setMessages((m) => [...m, { kind: "text", role: "assistant", text: res.text }]);
      speak(res.text);
    } catch {
      setMessages((m) => [...m, { kind: "text", role: "assistant", text: "Sorry, I couldn't reach the AI service right now." }]);
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
    if (!SR) { setHeard("Voice not supported. Type instead."); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = true; r.continuous = false;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((x: any) => x[0].transcript).join("");
      setHeard(t);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
        setTimeout(() => { setVoiceOpen(false); send(t); }, 600);
      }
    };
    r.onerror = () => { setListening(false); setHeard("Didn't catch that."); };
    r.onend = () => setListening(false);
    recogRef.current = r;
    try { r.start(); } catch {}
  }

  function stopVoice() {
    try { recogRef.current?.stop(); } catch {}
    setListening(false);
    setVoiceOpen(false);
  }

  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-2xl bg-black shadow-2xl" style={{ aspectRatio: "1660 / 933" }}>
      <img src={cockpitAsset.url} alt="Mercedes cockpit" className="absolute inset-0 h-full w-full object-cover" draggable={false} />

      <div
        className="absolute overflow-hidden bg-[oklch(0.08_0.02_240)] ring-1 ring-mb-cyan/20"
        style={{ left: "38.5%", top: "28.5%", width: "28%", height: "16%", borderRadius: "0.4vw" }}
      >
        <ScreenContent
          clock={clock}
          warnings={warnings}
          messages={messages}
          requests={requests}
          loading={loading}
          input={input}
          setInput={setInput}
          send={send}
          startVoice={startVoice}
          scrollRef={scrollRef}
          onPromptAnswer={handlePromptAnswer}
        />
      </div>

      {voiceOpen && (
        <div
          className="absolute z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
          style={{ left: "38.5%", top: "28.5%", width: "28%", height: "16%", borderRadius: "0.4vw" }}
        >
          <div className="text-[clamp(8px,0.7vw,12px)] uppercase tracking-[0.4em] text-mb-cyan">Hey Mercedes</div>
          <div className="mt-2"><VoiceOrb active={listening} /></div>
          <div className="mt-2 max-w-[90%] px-2 text-center text-[clamp(9px,0.8vw,14px)] font-light text-mb-silver line-clamp-2">
            {heard || (listening ? "Listening…" : "Say something")}
          </div>
          <button onClick={stopVoice} className="mt-2 rounded-full border border-white/20 px-3 py-0.5 text-[clamp(7px,0.55vw,10px)] uppercase tracking-wider text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Screen content ─────────────────────────── */

function ScreenContent({
  clock, warnings, messages, requests, loading, input, setInput, send, startVoice, scrollRef, onPromptAnswer,
}: {
  clock: string;
  warnings: ReturnType<typeof useVehicleStore.getState>["warnings"];
  messages: Msg[];
  requests: ServiceRequest[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  send: (q: string) => void;
  startVoice: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onPromptAnswer: (id: string, k: HealthKey, a: "yes" | "no") => void;
}) {
  return (
    <div className="flex h-full w-full flex-col p-[0.6%] text-[clamp(7px,0.6vw,11px)]" style={{ fontFamily: "system-ui" }}>
      <div className="flex items-center justify-between border-b border-white/10 px-1 pb-0.5 text-[0.85em] uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="text-mb-cyan">⌂</span>
          <span>MBUX</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>{warnings.length} ⚠</span>
          <span className="text-mb-green">●</span>
          <span suppressHydrationWarning>{clock || "--:--"}</span>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-0.5 flex gap-0.5 overflow-x-auto px-0.5 pb-0.5">
          {warnings.slice(0, 4).map((w) => (
            <div key={w.code} className={`shrink-0 rounded border px-1 py-0.5 text-[0.75em] uppercase tracking-wider ${sevColor[w.severity]}`}>
              ⚠ {w.label}
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="mt-0.5 flex-1 space-y-0.5 overflow-y-auto px-0.5">
        {messages.slice(-8).map((m, i) => {
          if (m.kind === "text") {
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-md px-1.5 py-0.5 text-[0.95em] leading-tight ${m.role === "user" ? "bg-mb-cyan/25 text-mb-cyan" : "bg-white/10 text-foreground"}`}>
                  {m.text}
                </div>
              </div>
            );
          }
          if (m.kind === "prompt") {
            return (
              <div key={i} className="rounded-md border border-mb-amber/40 bg-mb-amber/10 px-1.5 py-1">
                <div className="text-[0.9em] text-foreground">{m.text}</div>
                {!m.resolved && (
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={() => onPromptAnswer(m.id, m.componentKey, "yes")}
                      className="rounded-full bg-mb-cyan/30 px-1.5 py-0.5 text-[0.8em] font-semibold uppercase tracking-wider text-mb-cyan"
                    >Yes, connect</button>
                    <button
                      onClick={() => onPromptAnswer(m.id, m.componentKey, "no")}
                      className="rounded-full border border-white/20 px-1.5 py-0.5 text-[0.8em] uppercase tracking-wider text-muted-foreground"
                    >Not now</button>
                  </div>
                )}
                {m.resolved && <div className="mt-0.5 text-[0.75em] opacity-60">— {m.resolved === "yes" ? "Connected" : "Dismissed"}</div>}
              </div>
            );
          }
          // responses
          return <ResponsesBlock key={i} groupId={m.groupId} requests={requests} />;
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-md bg-white/10 px-1.5 py-0.5 text-[0.9em]"><Equalizer /> Thinking…</div>
          </div>
        )}
      </div>

      <div className="mt-0.5 flex items-center gap-0.5 border-t border-white/10 px-0.5 pt-0.5">
        <button
          onClick={startVoice}
          className="rounded-full border border-mb-cyan/50 bg-mb-cyan/15 px-1.5 py-0.5 text-[0.85em] uppercase tracking-wider text-mb-cyan hover:bg-mb-cyan/25"
        >
          🎙 Voice
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask Mercedes…"
          className="flex-1 rounded-full border border-white/15 bg-black/40 px-1.5 py-0.5 text-[0.9em] outline-none focus:border-mb-cyan/60"
        />
        <button onClick={() => send(input)} disabled={loading || !input.trim()} className="rounded-full bg-mb-cyan/25 px-1.5 py-0.5 text-[0.85em] uppercase tracking-wider text-mb-cyan disabled:opacity-40">
          Send
        </button>
      </div>
    </div>
  );
}

function ResponsesBlock({ groupId, requests }: { groupId: string; requests: ServiceRequest[] }) {
  const group = useMemo(() => requests.filter((r) => r.groupId === groupId), [requests, groupId]);
  if (group.length === 0) return null;
  const responded = group.filter((r) => r.status === "responded" && r.response?.available);
  const fastest = responded.length
    ? responded.reduce((a, b) => ((a.response?.slotDays ?? 99) <= (b.response?.slotDays ?? 99) ? a : b))
    : null;

  return (
    <div className="rounded-md border border-mb-cyan/30 bg-mb-cyan/5 p-1">
      <div className="text-[0.75em] uppercase tracking-wider text-mb-cyan">Service center responses</div>
      <div className="mt-0.5 grid grid-cols-2 gap-0.5">
        {group.map((r) => {
          const isFastest = fastest && r.id === fastest.id;
          return (
            <div key={r.id} className={`rounded border px-1 py-0.5 text-[0.8em] ${isFastest ? "border-mb-green/60 bg-mb-green/10" : "border-white/10 bg-black/30"}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{r.center}</span>
                {isFastest && <span className="text-[0.85em] text-mb-green">★ Fastest</span>}
              </div>
              {r.status === "pending" && <div className="opacity-70">Awaiting reply…</div>}
              {r.status === "responded" && r.response && (
                r.response.available ? (
                  <div className="leading-tight">
                    <div>✓ {r.response.slot}</div>
                    <div className="opacity-70">{r.response.repairTime}</div>
                  </div>
                ) : (
                  <div className="text-mb-red">Unavailable</div>
                )
              )}
            </div>
          );
        })}
      </div>
      {fastest && (
        <div className="mt-0.5 text-[0.75em] text-mb-green">
          Recommended: Mercedes {fastest.center} — {fastest.response?.slot}
        </div>
      )}
    </div>
  );
}

function VoiceOrb({ active }: { active: boolean }) {
  return (
    <div className="relative h-[clamp(28px,2.5vw,48px)] w-[clamp(28px,2.5vw,48px)]">
      <span className={`absolute inset-0 rounded-full bg-mb-cyan/30 ${active ? "mb-pulse" : ""}`} style={{ filter: "blur(6px)" }} />
      <span className={`absolute inset-1 rounded-full border border-mb-cyan/60 bg-gradient-to-br from-mb-cyan/40 to-transparent ${active ? "mb-pulse" : ""}`} />
    </div>
  );
}

function Equalizer() {
  return (
    <span className="inline-flex items-end gap-0.5 align-middle">
      {[0,1,2,3].map((i) => (
        <span key={i} className="w-0.5 rounded bg-mb-cyan" style={{ height: `${4 + (i%3)*3}px`, animation: `eq 0.7s ${i*0.1}s ease-in-out infinite alternate` }} />
      ))}
    </span>
  );
}
