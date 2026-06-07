# MBUX Predictive Care Assistant

An AI-powered in-car care companion built for the Mercedes-Benz hackathon. It connects three interfaces — the driver's MBUX display, a demo control panel, and service center portals — all syncing live in real time through the browser.

---

## What It Does

The system simulates a complete predictive maintenance loop:

1. **Vehicle health degrades** (via demo sliders or real telemetry)
2. **MBUX AI assistant detects it** and alerts the driver by voice
3. **Service centers are automatically notified** with the issue details
4. **Centers respond** with available slots and parts inventory
5. **Driver books a visit**, center confirms, navigation starts

Everything talks to each other in real time across browser tabs using `localStorage` + `BroadcastChannel`.

---

## Three Interfaces

### `/demo` — Demo Control Panel
For judges and presenters. Used to simulate vehicle degradation in real time.

- **Warning light buttons** — toggle any of 15 warning codes (Check Engine, ABS, Airbag, etc.)
- **Health sliders** — drag battery, brakes, wipers, AC, tires, or engine health from 0–100%
- Dropping below 40% auto-triggers the matching warning on MBUX
- Live telemetry JSON shown at the bottom

### `/mbux` — Customer MBUX Display
The in-car infotainment screen. The driver interacts here.

- Fullscreen cockpit background with an embedded MBUX screen overlay
- Press the **Engine Start** button to enter
- Personalized welcome: *"Hi Hemanth, welcome back!"* spoken aloud on entry
- If issues exist, shows a notification card — driver clicks **Show me** to reveal
- **AI voice assistant** powered by local Ollama (phi3 model)
- **Wake word** — say *"Hey Mercedes"* to activate the mic hands-free
- **Voice modal** auto-opens for critical alerts (health < 20%)
- Type or speak questions — AI answers in plain 1–2 sentence human language
- Service center cards with slots, responses, and part availability
- 2-way chat with chosen service center agent
- Visit booking with confirmation flow

### `/service` — Service Center Portal
Two portals: **Whitefield** and **JP Nagar**.

- Shows all incoming service requests from the MBUX side
- Each request shows: vehicle, issue, component health %, predicted failure days, required part, and stock level
- Advisor can set repair time and appointment slot, then confirm or decline
- Confirming triggers a response back to the MBUX chat in real time
- Parts inventory panel shows live stock counts per center

---

## Voice Features

| Feature | How to trigger |
|---|---|
| Wake word | Say *"Hey Mercedes"* — mic activates automatically |
| Manual mic | Tap the 🎙 Voice button |
| Critical alert | Auto-opens voice modal when health < 20% |
| Welcome speech | Plays automatically on cockpit entry |
| Notification hint | Spoken aloud if issues exist on startup |
| Service confirmation | Spoken when center confirms a booking |

---

## AI Assistant

- Runs locally via **Ollama** on `http://localhost:11434`
- Model: **phi3**
- Responds in plain English — no jargon, no technical terms
- Knows current vehicle health, warnings, and location
- Answers are hard-trimmed to 2 sentences server-side
- Intent detection (no AI needed) for: listing centers, booking visits, showing notifications

### Running Ollama

```bash
ollama run phi3
```

Make sure it is running on port `11434` before starting the app.

---

## Smart Alerts

| Health Level | Behaviour |
|---|---|
| < 30% | Soft notification: *"Heads up — your brakes need attention soon."* |
| < 20% | Critical: voice modal opens, both service centers auto-notified, responses simulated |

The 20% alert fires regardless of whether the driver has opened notifications. The service center auto-response simulates both Whitefield and JP Nagar replying within a few seconds, checking real inventory.

---

## Service Booking Flow

```
User: "list service centers"
  → Shows both centers with available time slots

User taps a slot (e.g. Whitefield — Today 11:00 AM)
  → Request sent to center
  → 1.5s: Center confirms
  → Voice announces confirmation
  → System notifies center: "Mr. Sharma will visit on Today 11:00 AM"
  → Center replies: "Slot reserved. See you then!"
```

---

## Real-Time Sync

All state (health, warnings, service requests, visit bookings) is stored in `localStorage` under the key `mbux-state` and broadcast via `BroadcastChannel`. Opening the three pages in separate tabs keeps them perfectly in sync — changes on the demo panel appear on MBUX within milliseconds.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (React SSR) |
| Routing | TanStack Router (file-based) |
| State | Zustand + localStorage + BroadcastChannel |
| AI | Vercel AI SDK (`ai` package) via `@ai-sdk/openai-compatible` |
| LLM | Ollama phi3 (local, `http://localhost:11434`) |
| Voice Input | Web Speech API (`SpeechRecognition`) |
| Voice Output | Web Speech API (`SpeechSynthesis`) |
| UI | Tailwind CSS v4 + shadcn/ui components |
| Build | Vite + Nitro (Cloudflare target) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start Ollama with phi3 (in a separate terminal)
ollama run phi3

# Start the dev server
npm run dev
```

Open `http://localhost:3000` and launch all three tabs from the home screen.

---

## Project Structure

```
src/
├── routes/
│   ├── index.tsx          # Home — links to all three interfaces
│   ├── mbux.tsx           # MBUX driver display + voice assistant
│   ├── demo.tsx           # Demo control panel for judges
│   ├── service.tsx        # Service center portal (Whitefield / JP Nagar)
│   └── __root.tsx         # Root layout
├── lib/
│   ├── vehicle-store.ts   # Zustand store — all vehicle state, sync logic
│   ├── ai-chat.functions.ts   # Server function — calls Ollama via AI SDK
│   └── ai-gateway.server.ts  # OpenAI-compatible provider pointing to Ollama
├── components/
│   ├── TopBar.tsx         # Navigation bar + Mercedes star logo
│   └── ui/                # shadcn/ui component library
└── assets/
    └── cockpit.png        # MBUX cockpit background image
```

---

## Notes for Judges

- Open **Demo Control**, **MBUX Display**, and one **Service Portal** in three separate browser tabs
- Drag a health slider (e.g. Brakes) below 20% — watch MBUX react with voice + UI alert
- The service center portal receives the request automatically and you can respond manually or let auto-response kick in
- Say *"Hey Mercedes"* on the MBUX tab to test the wake word (requires mic permission)
- Say *"list service centers"* to see the visit booking flow
