import { create } from "zustand";

export type WarningCode =
  | "CHECK_ENGINE"
  | "BRAKE_PAD_WEAR"
  | "LOW_TIRE_PRESSURE"
  | "BATTERY_WARNING"
  | "COOLANT_LOW"
  | "ENGINE_OVERHEATING"
  | "TRANSMISSION_WARNING"
  | "AIRBAG_WARNING"
  | "ABS_WARNING"
  | "ACTIVE_BRAKE_ASSIST_ERROR"
  | "BLIND_SPOT_ASSIST_ERROR"
  | "SUSPENSION_WARNING"
  | "ADBLUE_LOW"
  | "DOOR_OPEN"
  | "WIPER_SYSTEM_FAULT";

export type Severity = "low" | "medium" | "high" | "critical";

export type Warning = {
  code: WarningCode;
  label: string;
  severity: Severity;
  description: string;
  at: number;
};

export type ServiceCenter = "Whitefield" | "JP Nagar";
export const SERVICE_CENTERS: ServiceCenter[] = ["Whitefield", "JP Nagar"];

export type VisitSlot = { day: string; time: string; label: string };

export const CENTER_META: Record<ServiceCenter, { address: string; phone: string; slots: VisitSlot[] }> = {
  Whitefield: {
    address: "No. 12, ITPL Main Rd, Whitefield, Bangalore",
    phone: "+91-80-4567-1234",
    slots: [
      { day: "Today",     time: "11:00 AM", label: "Today 11:00 AM" },
      { day: "Today",     time: "3:00 PM",  label: "Today 3:00 PM" },
      { day: "Tomorrow",  time: "9:30 AM",  label: "Tomorrow 9:30 AM" },
      { day: "Tomorrow",  time: "2:00 PM",  label: "Tomorrow 2:00 PM" },
    ],
  },
  "JP Nagar": {
    address: "15, 7th Phase, JP Nagar, Bangalore",
    phone: "+91-80-2678-9900",
    slots: [
      { day: "Today",    time: "1:00 PM",  label: "Today 1:00 PM" },
      { day: "Tomorrow", time: "10:00 AM", label: "Tomorrow 10:00 AM" },
      { day: "Tomorrow", time: "4:00 PM",  label: "Tomorrow 4:00 PM" },
      { day: "Day after",time: "9:00 AM",  label: "Day after 9:00 AM" },
    ],
  },
};

export type VisitRequest = {
  id: string;
  center: ServiceCenter;
  customer: string;
  vehicle: string;
  slot: VisitSlot;
  status: "pending" | "confirmed" | "declined";
  confirmedAt?: number;
};

export type ServiceRequest = {
  id: string;
  groupId: string;
  center: ServiceCenter;
  customer: string;
  vehicle: string;
  issue: string;
  componentKey: string;
  health: number;
  predictedFailureDays: number;
  requiredPart: string;
  status: "pending" | "responded";
  createdAt: number;
  response?: {
    available: boolean;
    repairTime: string;
    slotDays: number; // days from now
    slot: string;
    center: ServiceCenter;
  };
};

export type HealthKey = "battery" | "brakes" | "wipers" | "ac" | "tires" | "engine";

export type VehicleState = {
  vehicleId: string;
  model: string;
  customer: string;
  location: string;
  health: Record<HealthKey, number>;
  warnings: Warning[];
  requests: ServiceRequest[];
  visitRequests: VisitRequest[];
  centersInventory: Record<ServiceCenter, Record<string, number>>;
  setHealth: (k: HealthKey, v: number) => void;
  triggerWarning: (code: WarningCode) => void;
  clearWarning: (code: WarningCode) => void;
  clearAllWarnings: () => void;
  requestService: (args: {
    componentKey: string;
    issue: string;
    requiredPart: string;
    health: number;
    predictedFailureDays: number;
    centers: ServiceCenter[];
  }) => string;
  requestVisit: (center: ServiceCenter, slot: VisitSlot) => string; // returns visitRequest id
  respondVisit: (id: string, status: "confirmed" | "declined") => void;
  respondRequest: (id: string, r: ServiceRequest["response"]) => void;
  reset: () => void;
};

export const WARNING_META: Record<WarningCode, Omit<Warning, "code" | "at">> = {
  CHECK_ENGINE: { label: "Check Engine", severity: "high", description: "Engine control unit detected an anomaly. Diagnostic scan recommended." },
  BRAKE_PAD_WEAR: { label: "Brake Pad Wear", severity: "medium", description: "Brake pads are approaching the wear limit. Service soon." },
  LOW_TIRE_PRESSURE: { label: "Low Tire Pressure", severity: "medium", description: "One or more tires below recommended pressure." },
  BATTERY_WARNING: { label: "Battery Warning", severity: "high", description: "12V battery voltage outside normal range." },
  COOLANT_LOW: { label: "Coolant Low", severity: "medium", description: "Engine coolant level is low. Top up required." },
  ENGINE_OVERHEATING: { label: "Engine Overheating", severity: "critical", description: "Engine temperature critical. Pull over safely." },
  TRANSMISSION_WARNING: { label: "Transmission Warning", severity: "high", description: "Transmission fault detected. Reduce load." },
  AIRBAG_WARNING: { label: "Airbag Warning", severity: "high", description: "SRS airbag system needs inspection." },
  ABS_WARNING: { label: "ABS Warning", severity: "high", description: "Anti-lock braking system fault." },
  ACTIVE_BRAKE_ASSIST_ERROR: { label: "Active Brake Assist Error", severity: "medium", description: "Active brake assist temporarily unavailable." },
  BLIND_SPOT_ASSIST_ERROR: { label: "Blind Spot Assist Error", severity: "low", description: "Blind spot sensor unavailable. Check rear bumper." },
  SUSPENSION_WARNING: { label: "Suspension Warning", severity: "medium", description: "Air suspension sensor anomaly detected." },
  ADBLUE_LOW: { label: "AdBlue Low", severity: "low", description: "AdBlue level low. Refill within 1500 km." },
  DOOR_OPEN: { label: "Door Open", severity: "low", description: "A door is not fully closed." },
  WIPER_SYSTEM_FAULT: { label: "Wiper System Fault", severity: "medium", description: "Wiper motor degradation detected." },
};

export const COMPONENT_META: Record<HealthKey, { issue: string; part: string; warning: WarningCode }> = {
  battery: { issue: "Battery Warning", part: "Battery", warning: "BATTERY_WARNING" },
  brakes: { issue: "Brake Pad Wear", part: "Brake Pads", warning: "BRAKE_PAD_WEAR" },
  wipers: { issue: "Wiper System Fault", part: "Wiper Motor", warning: "WIPER_SYSTEM_FAULT" },
  ac: { issue: "AC System Fault", part: "AC Compressor", warning: "CHECK_ENGINE" },
  tires: { issue: "Low Tire Pressure", part: "Tire", warning: "LOW_TIRE_PRESSURE" },
  engine: { issue: "Check Engine", part: "Coolant", warning: "CHECK_ENGINE" },
};

const CHANNEL = "mbux-state";

const initial: Omit<VehicleState, "setHealth" | "triggerWarning" | "clearWarning" | "clearAllWarnings" | "requestService" | "requestVisit" | "respondVisit" | "respondRequest" | "reset"> = {
  vehicleId: "MB001",
  model: "GLC 300",
  customer: "Mr. Sharma",
  location: "Bangalore",
  health: { battery: 95, brakes: 82, wipers: 65, ac: 91, tires: 88, engine: 96 },
  warnings: [],
  requests: [],
  visitRequests: [],
  centersInventory: {
    Whitefield: { "Brake Pads": 12, "Battery": 8, "Wiper Motor": 4, "AC Compressor": 3, "Tire": 20, "Coolant": 15 },
    "JP Nagar": { "Brake Pads": 6, "Battery": 14, "Wiper Motor": 9, "AC Compressor": 1, "Tire": 12, "Coolant": 22 },
  },
};

function load() {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(CHANNEL);
    return raw ? { ...initial, ...JSON.parse(raw) } : initial;
  } catch {
    return initial;
  }
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  ...load(),
  setHealth: (k, v) => {
    set((s) => ({ health: { ...s.health, [k]: Math.max(0, Math.min(100, Math.round(v))) } }));
    autoTriggerByHealth(get, set);
    persist(get());
  },
  triggerWarning: (code) => {
    const exists = get().warnings.find((w) => w.code === code);
    if (exists) return;
    const meta = WARNING_META[code];
    set((s) => ({ warnings: [...s.warnings, { code, at: Date.now(), ...meta }] }));
    persist(get());
  },
  clearWarning: (code) => {
    set((s) => ({ warnings: s.warnings.filter((w) => w.code !== code) }));
    persist(get());
  },
  clearAllWarnings: () => {
    set({ warnings: [] });
    persist(get());
  },
  requestService: ({ componentKey, issue, requiredPart, health, predictedFailureDays, centers }) => {
    const groupId = crypto.randomUUID();
    const s = get();
    const newReqs: ServiceRequest[] = centers.map((center) => ({
      id: crypto.randomUUID(),
      groupId,
      center,
      customer: s.customer,
      vehicle: `${s.model} · ${s.vehicleId}`,
      issue,
      componentKey,
      health,
      predictedFailureDays,
      requiredPart,
      status: "pending",
      createdAt: Date.now(),
    }));
    set((st) => ({ requests: [...newReqs, ...st.requests] }));
    persist(get());
    return groupId;
  },
  respondRequest: (id, response) => {
    set((s) => ({
      requests: s.requests.map((r) => (r.id === id ? { ...r, status: "responded", response } : r)),
    }));
    persist(get());
  },
  requestVisit: (center, slot) => {
    const s = get();
    const id = crypto.randomUUID();
    const vr: VisitRequest = {
      id,
      center,
      customer: s.customer,
      vehicle: `${s.model} · ${s.vehicleId}`,
      slot,
      status: "pending",
    };
    set((st) => ({ visitRequests: [vr, ...st.visitRequests] }));
    persist(get());
    // Simulate center agent confirming after 1.5s
    setTimeout(() => {
      set((st) => ({
        visitRequests: st.visitRequests.map((v) =>
          v.id === id ? { ...v, status: "confirmed", confirmedAt: Date.now() } : v
        ),
      }));
      persist(useVehicleStore.getState());
    }, 1500);
    return id;
  },
  respondVisit: (id, status) => {
    set((s) => ({
      visitRequests: s.visitRequests.map((v) => (v.id === id ? { ...v, status } : v)),
    }));
    persist(get());
  },
  reset: () => {
    set(initial);
    persist(get());
  },
}));

function autoTriggerByHealth(get: () => VehicleState, set: (p: Partial<VehicleState>) => void) {
  const s = get();
  const triggers: Array<[HealthKey, WarningCode]> = [
    ["brakes", "BRAKE_PAD_WEAR"],
    ["wipers", "WIPER_SYSTEM_FAULT"],
    ["battery", "BATTERY_WARNING"],
    ["tires", "LOW_TIRE_PRESSURE"],
    ["engine", "CHECK_ENGINE"],
  ];
  const newWarnings = [...s.warnings];
  for (const [k, code] of triggers) {
    if (s.health[k] < 40 && !newWarnings.find((w) => w.code === code)) {
      newWarnings.push({ code, at: Date.now(), ...WARNING_META[code] });
    }
  }
  if (newWarnings.length !== s.warnings.length) set({ warnings: newWarnings });
}

let bc: BroadcastChannel | null = null;
let suppress = false;

function persist(state: VehicleState) {
  if (typeof window === "undefined") return;
  const data = {
    vehicleId: state.vehicleId,
    model: state.model,
    customer: state.customer,
    location: state.location,
    health: state.health,
    warnings: state.warnings,
    requests: state.requests,
    visitRequests: state.visitRequests,
    centersInventory: state.centersInventory,
  };
  try {
    localStorage.setItem(CHANNEL, JSON.stringify(data));
  } catch {}
  if (!suppress && bc) bc.postMessage(data);
}

if (typeof window !== "undefined") {
  bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = (e) => {
    suppress = true;
    useVehicleStore.setState(e.data);
    suppress = false;
  };
  window.addEventListener("storage", (e) => {
    if (e.key === CHANNEL && e.newValue) {
      suppress = true;
      useVehicleStore.setState(JSON.parse(e.newValue));
      suppress = false;
    }
  });
}

export const HEALTH_SCORE = (h: VehicleState["health"]) =>
  Math.round((h.battery + h.brakes + h.wipers + h.ac + h.tires + h.engine) / 6);
