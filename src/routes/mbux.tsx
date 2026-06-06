import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { askMercedes } from "@/lib/ai-chat.functions";
import cockpitAsset from "@/assets/cockpit.png.asset.json";
import { useVehicleStore, type Severity } from "@/lib/vehicle-store";

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
  const { health, warnings, model, location } = useVehicleStore();
  const ask = useServerFn(askMercedes);

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: `Welcome. Your ${model} is ready. Tap mic or say "Hey Mercedes".` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [clock, setClock] = useState("");
  const recogRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

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
      {/* Cockpit photo */}
      <img src={cockpitAsset.url} alt="Mercedes cockpit" className="absolute inset-0 h-full w-full object-cover" draggable={false} />

      {/* Center infotainment screen overlay */}
      {/* Image center display: x 38.5–66.5%, y 28.5–44.5% */}
      <div
        className="absolute overflow-hidden bg-[oklch(0.08_0.02_240)] ring-1 ring-mb-cyan/20"
        style={{ left: "38.5%", top: "28.5%", width: "28%", height: "16%", borderRadius: "0.4vw" }}
      >
        <ScreenContent
          clock={clock}
          warnings={warnings}
          messages={messages}
          loading={loading}
          input={input}
          setInput={setInput}
          send={send}
          startVoice={startVoice}
          scrollRef={scrollRef}
        />
      </div>

      {/* Voice overlay confined to the screen too */}
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
  clock, warnings, messages, loading, input, setInput, send, startVoice, scrollRef,
}: {
  clock: string;
  warnings: ReturnType<typeof useVehicleStore.getState>["warnings"];
  messages: Msg[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  send: (q: string) => void;
  startVoice: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex h-full w-full flex-col p-[0.6%] text-[clamp(7px,0.6vw,11px)]" style={{ fontFamily: "system-ui" }}>
      {/* Status bar */}
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

      {/* Active warnings strip */}
      {warnings.length > 0 && (
        <div className="mt-0.5 flex gap-0.5 overflow-x-auto px-0.5 pb-0.5">
          {warnings.slice(0, 4).map((w) => (
            <div key={w.code} className={`shrink-0 rounded border px-1 py-0.5 text-[0.75em] uppercase tracking-wider ${sevColor[w.severity]}`}>
              ⚠ {w.label}
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      <div ref={scrollRef} className="mt-0.5 flex-1 space-y-0.5 overflow-y-auto px-0.5">
        {messages.slice(-6).map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-md px-1.5 py-0.5 text-[0.95em] leading-tight ${m.role === "user" ? "bg-mb-cyan/25 text-mb-cyan" : "bg-white/10 text-foreground"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-md bg-white/10 px-1.5 py-0.5 text-[0.9em]"><Equalizer /> Thinking…</div>
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="mt-0.5 flex items-center gap-0.5 border-t border-white/10 px-0.5 pt-0.5">
        <button
          onClick={startVoice}
          className="rounded-full border border-mb-cyan/50 bg-mb-cyan/15 px-1.5 py-0.5 text-[0.85em] uppercase tracking-wider text-mb-cyan hover:bg-mb-cyan/25"
          title="Hey Mercedes"
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
