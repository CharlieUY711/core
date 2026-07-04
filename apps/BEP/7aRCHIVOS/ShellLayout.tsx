"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { NavItem, ShellUser, ShellOrg } from "./types";

// ─── BEP Brand (equivalente a BRAND de market) ────────────────────────────────
const BRAND = {
  primary:   "#3D5689",
  secondary: "#0D2B55",
  accent:    "#2E7D57",
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ user }: { user: ShellUser }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`avatar_${user.id}`);
    if (saved) setAvatar(saved);
  }, [user.id]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatar(dataUrl);
      localStorage.setItem(`avatar_${user.id}`, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const initials = (user.name ?? user.email)
    .split(/[\s@]/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("");

  return (
    <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div onClick={() => inputRef.current?.click()} style={{
          width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
          overflow: "hidden", border: `2px solid ${BRAND.primary}`,
          background: "rgba(255,255,255,0.1)", display: "flex",
          alignItems: "center", justifyContent: "center" }}>
          {avatar
            ? <img src={avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "0.95rem", color: "#fff", fontWeight: 700 }}>{initials}</span>}
        </div>
        <div onClick={() => inputRef.current?.click()} style={{
          position: "absolute", bottom: -2, right: -2, width: 16, height: 16,
          borderRadius: "50%", background: BRAND.primary, display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer",
          fontSize: "0.55rem", border: `2px solid ${BRAND.secondary}` }}>✏️</div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.78rem", fontWeight: 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
          {user.name ?? user.email.split("@")[0]}
        </div>
        <div style={{ color: BRAND.primary, fontSize: "0.65rem", fontWeight: 700, marginTop: 2 }}>
          {user.role ?? "Usuario"}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ appName, appLogo, navItems, user, org, onSignOut }: {
  appName: string; appLogo?: string; navItems: NavItem[];
  user: ShellUser; org?: ShellOrg; onSignOut: () => void;
}) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "0.6rem",
    padding: "0.5rem 1.5rem", textDecoration: "none", fontSize: "0.84rem",
    background: active ? `rgba(${hexToRgb(BRAND.primary)},0.15)` : "transparent",
    color: active ? BRAND.primary : "rgba(255,255,255,0.62)",
    borderLeft: active ? `3px solid ${BRAND.primary}` : "3px solid transparent",
    fontWeight: active ? 600 : 400, transition: "all 0.12s",
  });

  return (
    <aside style={{ width: 220, background: BRAND.secondary, display: "flex",
      flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>

      {/* App header */}
      <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", gap: "0.6rem" }}>
        {appLogo
          ? <img src={appLogo} alt={appName} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "contain" }} />
          : <span style={{ width: 28, height: 28, borderRadius: 6, background: BRAND.primary,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {appName.slice(0, 2).toUpperCase()}
            </span>
        }
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", lineHeight: 1, color: "#fff" }}>
            {appName}
          </div>
          {org && (
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.62rem", marginTop: 3 }}>
              {org.name}
            </div>
          )}
        </div>
      </div>

      {/* User avatar */}
      <UserAvatar user={user} />

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={linkStyle(isActive(item))}>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={onSignOut} style={{
          width: "100%", padding: "0.45rem", background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
          color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", cursor: "pointer",
        }}>Cerrar sesión</button>
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
// Si se pasa `title` (p.ej. nombre del proyecto), se usa eso como breadcrumb
// principal en lugar del navItem activo. `subtitle` (p.ej. código del proyecto)
// se muestra como chip al lado. Si no se pasa `title`, se mantiene el
// comportamiento original (appName › navItem activo).
function Topbar({
  appName,
  navItems,
  title,
  subtitle,
}: {
  appName: string;
  navItems: NavItem[];
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const activeItem = navItems.find(i =>
    i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/")
  );

  return (
    <header style={{
      background: BRAND.secondary, height: 52, padding: "0 1.5rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem",
        fontSize: "0.88rem", color: "rgba(255,255,255,0.9)" }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>{appName}</span>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" }}>›</span>

        {title ? (
          <>
            {subtitle && (
              <span style={{
                fontFamily: "monospace", fontSize: "0.7rem",
                background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)",
                padding: "0.1rem 0.45rem", borderRadius: 4, marginRight: "0.15rem",
              }}>
                {subtitle}
              </span>
            )}
            <span style={{ fontWeight: 600 }}>{title}</span>
            {activeItem && (
              <>
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" }}>›</span>
                <span style={{ fontWeight: 600 }}>{activeItem.label}</span>
              </>
            )}
          </>
        ) : (
          <span style={{ fontWeight: 600 }}>{activeItem?.label ?? "Inicio"}</span>
        )}
      </div>
    </header>
  );
}

// ─── ShellLayout ──────────────────────────────────────────────────────────────
export interface ShellLayoutProps {
  appName: string;
  appLogo?: string;
  navItems: NavItem[];
  user: ShellUser;
  org?: ShellOrg;
  onSignOut?: () => void;
  /** Título principal del topbar (p.ej. nombre del proyecto activo). Si se omite, se usa el navItem activo. */
  topbarTitle?: string;
  /** Subtítulo/chip del topbar (p.ej. código del proyecto). Solo se muestra si topbarTitle está presente. */
  topbarSubtitle?: string;
  children: React.ReactNode;
}

export function ShellLayout({
  appName, appLogo, navItems, user, org, onSignOut,
  topbarTitle, topbarSubtitle, children,
}: ShellLayoutProps) {
  const router = useRouter();

  function handleSignOut() {
    if (onSignOut) { onSignOut(); return; }
    router.push("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "DM Sans, sans-serif", background: "#F4F5F7" }}>
      <Sidebar appName={appName} appLogo={appLogo} navItems={navItems}
        user={user} org={org} onSignOut={handleSignOut} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar appName={appName} navItems={navItems} title={topbarTitle} subtitle={topbarSubtitle} />
        <main style={{ flex: 1, overflow: "auto", padding: "1.5rem 2rem" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
