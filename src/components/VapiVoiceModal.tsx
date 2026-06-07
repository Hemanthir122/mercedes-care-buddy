/**
 * VapiVoiceModal — 100% Vapi, zero browser speech APIs
 *
 * - useVapi() hook: persistent Vapi singleton with say() for announcements
 * - VapiVoiceModal: UI overlay for interactive voice calls
 * - Wake word: browser SpeechRecognition (no cost, just triggers Vapi)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Vapi from "@vapi-ai/web";

const VAPI_KEY = (import.meta as any).env?.VITE_VAPI_API_KEY ?? "";

const WAKE_WORDS = ["hey mercedes", "hi mercedes", "hello mercedes"];

// ─────────────────────────────────────────────────────────────────────────────
// Shared Vapi instance — module-level singleton
// ─────────────────────────────────────────────────────────────────────────────
let _vapiInstance: any = null;
function getVapi() {
  if (!_vapiInstance) _vapiInstance = new Vapi(VAPI_KEY);
  return _vapiInstance;
}

function buildSystemPrompt(
  vehicleData: { health: Record<string, number>; warnings: { label: string; severity: string }[] },
  inventory: Record<string, Record<string, number>>,
  name: string
) {
  const healthLines = Object.entries(vehicleData.health)
    .map(([k, v]) => `  ${k}: ${v}%`)
    .join("\n");
  const warnLines = vehicleData.warnings.length
    ? vehicleData.warnings.map((w) => `  [${w.severity.toUpperCase()}] ${w.label}`).join("\n")
    : "  None";
  const inventoryLines = Object.entries(inventory)
    .map(([center, parts]) =>
      `  ${center}: ${Object.entries(parts).map(([p, q]) => `${p}(${q})`).join(", ")}`
    )
    .join("\n");

  return `You are MBUX, the Mercedes-Benz in-car voice assistant for ${name}.
Be calm, concise, warm. Max 2 short sentences per reply.
Never mention software or sensors. You ARE the car's voice system.
Address the driver as ${name}. Refer to yourself as "M B U X".

Vehicle health:
${healthLines}

Active warnings:
${warnLines}

Service centers near Bangalore:
  Whitefield: No. 12, ITPL Main Rd, +91-80-4567-1234
  JP Nagar: 15, 7th Phase, +91-80-2678-9900

Parts inventory:
${inventoryLines}

When asked about service or parts, tell the driver which center has the part they need and suggest going there.
If a component is below 30%, proactively mention it needs attention.
If below 20%, treat it as urgent and recommend immediate service.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// useVapi — persistent hook, exposes say() and startCall()
// ─────────────────────────────────────────────────────────────────────────────
export type VapiHandle = {
  say: (text: string) => void;
  startCall: (firstMessage?: string) => void;
  stopCall: () => void;
  isCallActive: () => boolean;
};

export function useVapi(
  vehicleData: { health: Record<string, number>; warnings: { label: string; severity: string }[] },
  inventory: Record<string, Record<string, number>>,
  customerName: string,
  onCallEnd: () => void,
  onTranscript: (text: string) => void
): VapiHandle {
  const vehicleRef = useRef(vehicleData);
  vehicleRef.current = vehicleData;
  const inventoryRef = useRef(inventory);
  inventoryRef.current = inventory;
  const isActiveRef = useRef(false);
  const listenersSet = useRef(false);

  useEffect(() => {
    const vapi = getVapi();
    if (listenersSet.current) return;
    listenersSet.current = true;

    vapi.on("call-end", () => {
      isActiveRef.current = false;
      onCallEnd();
    });
    vapi.on("message", (msg: any) => {
      if (
        msg.type === "transcript" &&
        msg.role === "user" &&
        msg.transcriptType === "final"
      ) {
        onTranscript(msg.transcript);
      }
    });
    vapi.on("error", (err: any) => {
      console.error("Vapi error:", err);
      isActiveRef.current = false;
      onCallEnd();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const say = useCallback((text: string) => {
    const vapi = getVapi();

    if (isActiveRef.current) {
      // Call is live — use Vapi's native say() to inject speech into the active session
      vapi.say(text, false, false, false);
    } else {
      // No active call — start a one-shot announcement call that ends after speaking
      isActiveRef.current = true;
      const data = vehicleRef.current;
      const inv = inventoryRef.current;
      vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: buildSystemPrompt(data, inv, customerName) }],
        },
        voice: { provider: "cartesia", voiceId: "a0e99841-438c-4a64-b679-ae501e7d6091" },
        firstMessage: text,
        transcriber: { provider: "deepgram", model: "nova-2", language: "en-US" },
      }).then(() => {
        // End the call immediately after Vapi speaks the firstMessage
        vapi.say(text, true, false, false);
      }).catch(() => {
        isActiveRef.current = false;
      });
    }
  }, [customerName]);

  const startCall = useCallback((firstMessage?: string) => {
    if (isActiveRef.current) return;
    isActiveRef.current = true;
    const vapi = getVapi();
    const data = vehicleRef.current;
    const inv = inventoryRef.current;
    const defaultFirst = data.warnings.length
      ? `Hello ${customerName}, your ${data.warnings[0].label.toLowerCase()} needs attention. Want me to help?`
      : `Hello ${customerName}, M B U X at your service. How can I help?`;

    vapi.start({
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: buildSystemPrompt(data, inv, customerName) }],
      },
      voice: { provider: "cartesia", voiceId: "a0e99841-438c-4a64-b679-ae501e7d6091" },
      firstMessage: firstMessage ?? defaultFirst,
      transcriber: { provider: "deepgram", model: "nova-2", language: "en-US" },
    });
  }, [customerName]);

  const stopCall = useCallback(() => {
    try { getVapi().stop(); } catch {}
    isActiveRef.current = false;
  }, []);

  const isCallActive = useCallback(() => isActiveRef.current, []);

  return { say, startCall, stopCall, isCallActive };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wake word hook — browser SpeechRecognition (no cost), fires callback
// ─────────────────────────────────────────────────────────────────────────────
export function useVapiWakeWord(onWakeWord: () => void, delayMs = 4000) {
  const recognizerRef = useRef<any>(null);
  const activeRef = useRef(false);
  const onWakeRef = useRef(onWakeWord);
  onWakeRef.current = onWakeWord;

  const stop = useCallback(() => {
    activeRef.current = false;
    try { recognizerRef.current?.stop(); } catch {}
    recognizerRef.current = null;
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || activeRef.current) return;
    activeRef.current = true;
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e: any) => {
      const t = Array.from(e.results as any[]).map((x: any) => x[0].transcript).join(" ").toLowerCase();
      if (WAKE_WORDS.some((w) => t.includes(w))) { stop(); onWakeRef.current(); }
    };
    r.onerror = () => { activeRef.current = false; recognizerRef.current = null; setTimeout(() => { if (!activeRef.current) start(); }, 2000); };
    r.onend = () => { if (activeRef.current) { try { r.start(); } catch {} } };
    recognizerRef.current = r;
    try { r.start(); } catch {}
  }, [stop]);

  useEffect(() => {
    const t = setTimeout(start, delayMs);
    return () => { clearTimeout(t); stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { start, stop };
}

// ─────────────────────────────────────────────────────────────────────────────
// VapiVoiceModal — UI overlay shown during interactive voice call
// ─────────────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  vapiHandle: VapiHandle;
  firstMessage?: string;
}

export function VapiVoiceModal({ open, onClose, vapiHandle, firstMessage }: ModalProps) {
  const [status, setStatus] = useState<"connecting" | "active" | "error">("connecting");
  const [displayText, setDisplayText] = useState("Connecting…");
  const startedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      setStatus("connecting");
      setDisplayText("Connecting…");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const vapi = getVapi();

    const onStart = () => { setStatus("active"); setDisplayText("Listening…"); };
    const onSpeechStart = () => setDisplayText("Speaking…");
    const onSpeechEnd = () => setDisplayText("Listening…");
    const onMsg = (msg: any) => {
      if (msg.type === "conversation-update" && msg.conversation) {
        const last = msg.conversation[msg.conversation.length - 1];
        if (last?.role === "assistant") setDisplayText(last.content);
      }
    };
    const onEnd = () => { setStatus("connecting"); onClose(); };
    const onErr = () => { setStatus("error"); setDisplayText("Connection failed. Check Vapi key."); setTimeout(onClose, 3000); };

    vapi.on("call-start", onStart);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("message", onMsg);
    vapi.on("call-end", onEnd);
    vapi.on("error", onErr);

    vapiHandle.startCall(firstMessage);

    return () => {
      vapi.off("call-start", onStart);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("message", onMsg);
      vapi.off("call-end", onEnd);
      vapi.off("error", onErr);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isActive = status === "active";
  const isError = status === "error";

  return (
    <div
      className="absolute z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
      style={{ left: "38.5%", top: "28.5%", width: "28%", height: "16%", borderRadius: "0.4vw" }}
    >
      <div className="text-[clamp(8px,0.7vw,12px)] uppercase tracking-[0.4em] text-mb-cyan">
        {isActive ? "MBUX Active" : isError ? "Error" : "Connecting…"}
      </div>

      <div className="mt-1 relative h-[clamp(24px,2vw,40px)] w-[clamp(24px,2vw,40px)]">
        <span className={`absolute inset-0 rounded-full ${isError ? "bg-mb-red/30" : isActive ? "bg-mb-green/30" : "bg-mb-cyan/30"} ${isActive ? "mb-pulse" : ""}`} style={{ filter: "blur(5px)" }} />
        <span className={`absolute inset-1 rounded-full border ${isError ? "border-mb-red/60 bg-gradient-to-br from-mb-red/40" : isActive ? "border-mb-green/60 bg-gradient-to-br from-mb-green/40" : "border-mb-cyan/60 bg-gradient-to-br from-mb-cyan/40"} to-transparent`} />
      </div>

      <div className="mt-1 max-w-[92%] px-2 text-center text-[clamp(8px,0.75vw,13px)] font-light text-mb-silver line-clamp-2">
        {displayText}
      </div>

      <button
        onClick={() => { vapiHandle.stopCall(); onClose(); }}
        className="mt-1 rounded-full border border-white/20 px-3 py-0.5 text-[clamp(7px,0.5vw,10px)] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {isActive ? "End call" : "Cancel"}
      </button>
    </div>
  );
}
