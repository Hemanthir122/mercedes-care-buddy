import { createFileRoute, Link } from "@tanstack/react-router";
import { MercedesStar } from "@/components/TopBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MBUX Predictive Care Assistant" },
      { name: "description", content: "Mercedes-Benz AI Care Companion — open all three interfaces and watch them sync in real time." },
    ],
  }),
  component: Index,
});

function Index() {
  const panels = [
    { to: "/demo", title: "Demo Control Panel", desc: "Trigger warnings & degrade components in real time.", tag: "FOR JUDGES" },
    { to: "/mbux", title: "Customer MBUX Display", desc: "In-car infotainment with AI voice assistant.", tag: "DRIVER" },
    { to: "/service", title: "Service Center Portal", desc: "Incoming requests, inventory & advisor responses.", tag: "WORKSHOP" },
  ];
  return (
    <main className="mb-grid min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col items-center text-center">
          <MercedesStar className="h-16 w-16 text-mb-silver" />
          <div className="mt-6 text-[11px] uppercase tracking-[0.4em] text-muted-foreground">Mercedes-Benz · Hackathon</div>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight md:text-6xl">MBUX Predictive Care</h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            An AI-powered care companion connecting the driver, the vehicle and the service workshop.
            Open all three screens in separate tabs — they stay in sync in real time.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {panels.map((p) => (
            <Link key={p.to} to={p.to} className="group mb-glass rounded-2xl p-6 transition hover:mb-ring-glow">
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary">{p.tag}</div>
              <div className="mt-3 text-xl font-semibold">{p.title}</div>
              <div className="mt-2 text-sm text-muted-foreground">{p.desc}</div>
              <div className="mt-6 text-xs text-primary opacity-70 group-hover:opacity-100">Open →</div>
            </Link>
          ))}
        </div>

        <div className="mt-10 mb-glass rounded-2xl p-6">
          <div className="text-sm font-medium">How to demo</div>
          <ol className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>1. Open each interface in its own browser tab (or window) — state syncs live.</li>
            <li>2. From <span className="text-foreground">Demo Control</span>, drag a slider down or trigger a warning.</li>
            <li>3. Watch the <span className="text-foreground">MBUX Display</span> update; ask the AI assistant about it.</li>
            <li>4. Send a service request, then respond from the <span className="text-foreground">Service Portal</span>.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
