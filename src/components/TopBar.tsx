import { Link } from "@tanstack/react-router";

export function TopBar({ active }: { active: "demo" | "mbux" | "service" }) {
  return (
    <header className="sticky top-0 z-40 mb-glass">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-3">
          <MercedesStar className="h-7 w-7 text-mb-silver" />
          <div className="leading-tight">
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Mercedes-Benz</div>
            <div className="text-sm font-semibold">MBUX Predictive Care</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
          <NavLink to="/demo" active={active === "demo"}>Demo Control</NavLink>
          <NavLink to="/mbux" active={active === "mbux"}>MBUX Display</NavLink>
          <Link
            to="/service"
            search={{ center: "Whitefield" }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              active === "service" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >Service · Whitefield</Link>
          <Link
            to="/service"
            search={{ center: "JP Nagar" }}
            className="rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >Service · JP Nagar</Link>
        </nav>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <span className="inline-block h-2 w-2 rounded-full bg-mb-green mb-pulse" />
          Live sync across tabs
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, active, children }: { to: "/demo" | "/mbux"; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >{children}</Link>
  );
}

export function MercedesStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="3">
      <circle cx="50" cy="50" r="46" />
      <path d="M50 8 L50 50" />
      <path d="M50 50 L14 72" />
      <path d="M50 50 L86 72" />
    </svg>
  );
}
