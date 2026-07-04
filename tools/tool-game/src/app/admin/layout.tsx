"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin",           label: "Dashboard", icon: "📊" },
  { href: "/admin/campaigns", label: "Campañas",  icon: "🎯" },
  { href: "/admin/rewards",   label: "Premios",   icon: "🎁" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/audit",     label: "Auditoría", icon: "🔍" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex min-h-screen text-sm">

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col py-8 px-3 gap-1"
        style={{ background: "#0a0a0a", borderRight: "1px solid var(--border)" }}>
        <div className="px-3 mb-6">
          <p className="text-lg font-bold"><span style={{ color: "var(--primary)" }}>Market</span> Admin</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Reward Engine</p>
        </div>
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || (href !== "/admin" && path.startsWith(href));
          return (
            <Link key={href} href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all"
              style={{
                background: active ? "rgba(124,58,237,0.15)" : "transparent",
                color:  active ? "var(--primary)" : "var(--text-muted)",
                border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
              }}>
              <span>{icon}</span>{label}
            </Link>
          );
        })}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
