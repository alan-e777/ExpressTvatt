import Link from "next/link";
import ChatNavLink from "./ChatNavLink";
import OrderStatusNotifier from "@/components/admin/OrderStatusNotifier";
import AdminMobileNav from "./AdminMobileNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        body { max-width: 100vw !important; margin: 0 !important; }
        .bottom-nav { display: none !important; }

        /* Mobile: hide sidebar, add top-bar offset */
        @media (max-width: 767px) {
          .admin-layout-sidebar { display: none !important; }
          .admin-layout-main {
            padding: 72px 1rem 2rem !important;
            overflow-x: hidden !important;
          }
        }

        /* Desktop: hide mobile nav */
        @media (min-width: 768px) {
          .admin-mobile-nav { display: none !important; }
        }

        /* Mobile nav — always fixed at the top, full width */
        .admin-mobile-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 56px;
          background: #1a1a1a;
          z-index: 300;
          box-shadow: 0 1px 8px rgba(0,0,0,0.4);
        }
      `}</style>

      <AdminMobileNav />

      <div style={{
        display: "flex",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
        width: "100vw",
        overflow: "hidden",
      }}>
        <aside className="admin-layout-sidebar" style={{
          width: "220px",
          background: "#1a1a1a",
          color: "#fff",
          padding: "2rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          flexShrink: 0,
          overflowY: "auto",
        }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem", color: "#fff" }}>
            Tvättio Admin
          </p>
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/orders">Orders</NavLink>
          <NavLink href="/admin/customers">Customers</NavLink>
          <NavLink href="/admin/calendar">Calendar</NavLink>
          <ChatNavLink />
          <NavLink href="/admin/services">Services</NavLink>
          <NavLink href="/admin/driver">Driver</NavLink>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <NavLink href="/admin/settings">Inställningar</NavLink>
            <LogoutButton />
          </div>
        </aside>

        <main className="admin-layout-main" style={{
          flex: 1,
          padding: "2.5rem",
          background: "#f9f9f8",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}>
          {children}
        </main>
      </div>

      <OrderStatusNotifier />
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
