import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`body { max-width: 100vw !important; margin: 0 !important; } .bottom-nav { display: none !important; }`}</style>
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif", width: "100vw", overflow: "hidden" }}>
      <aside style={{
        width: "220px",
        background: "#1a1a1a",
        color: "#fff",
        padding: "2rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        flexShrink: 0,
      }}>
        <p style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem", color: "#fff" }}>
          Tailor Admin
        </p>
        <NavLink href="/admin">Dashboard</NavLink>
        <NavLink href="/admin/orders">Orders</NavLink>
        <NavLink href="/admin/customers">Customers</NavLink>
        <NavLink href="/admin/calendar">Calendar</NavLink>
        <NavLink href="/admin/services">Services</NavLink>
        <NavLink href="/admin/driver">Driver</NavLink>
        <NavLink href="/admin/settings">Inställningar</NavLink>
        <div style={{ marginTop: "auto" }}>
          <LogoutButton />
        </div>
      </aside>
      <main style={{ flex: 1, padding: "2.5rem", background: "#f9f9f8", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      color: "#ccc",
      textDecoration: "none",
      padding: "0.5rem 0.75rem",
      borderRadius: "6px",
      fontSize: "0.9rem",
      display: "block",
    }}>
      {children}
    </Link>
  );
}

function LogoutButton() {
  return (
    <form action="/api/admin/session" method="POST">
      <button
        formAction="/api/admin/logout"
        style={{
          background: "transparent",
          border: "1px solid #444",
          color: "#aaa",
          padding: "0.5rem 0.75rem",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "0.85rem",
          width: "100%",
          textAlign: "left",
        }}
      >
        Sign out
      </button>
    </form>
  );
}
