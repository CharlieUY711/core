"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  FolderOpen,
  FileText,
  List,
  CheckSquare,
  ShoppingCart,
  AlertTriangle,
  MessageSquare,
  BookOpen,
  LayoutDashboard,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { NavItem, ShellUser, ShellOrg } from "./types";

// ---------------------------------------------------------------------------
// Icon registry — maps string name → Lucide component.
// Apps can pass any name listed here; unknown names fall back to a dot.
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, LucideIcon> = {
  FolderOpen,
  FileText,
  List,
  CheckSquare,
  ShoppingCart,
  AlertTriangle,
  MessageSquare,
  BookOpen,
  LayoutDashboard,
  ChevronRight,
};

function NavIcon({ name }: { name?: string }) {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  if (!Icon) return <span className="size-4 rounded-full bg-current opacity-40" />;
  return <Icon className="size-4 shrink-0" />;
}

// ---------------------------------------------------------------------------
// User avatar
// ---------------------------------------------------------------------------
function Avatar({ user }: { user: ShellUser }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? user.email}
        className="size-8 rounded-full object-cover ring-2 ring-white/20"
      />
    );
  }
  const initials = (user.name ?? user.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--shell-accent)] text-xs font-semibold text-white">
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------------------
// OrgBadge
// ---------------------------------------------------------------------------
function OrgBadge({ org }: { org: ShellOrg }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {org.logoUrl ? (
        <img
          src={org.logoUrl}
          alt={org.name}
          className="size-6 rounded object-contain"
        />
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-[var(--shell-accent)]/20 text-[10px] font-bold uppercase text-[var(--shell-accent)]">
          {org.name.slice(0, 2)}
        </span>
      )}
      <span className="truncate text-xs font-medium text-[var(--shell-text-muted)]">
        {org.name}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ShellSidebarProps {
  /** Display name shown at the top of the sidebar */
  appName: string;
  /** Optional logo URL for the app (shown in top section) */
  appLogo?: string;
  /** Navigation items injected by each app */
  navItems: NavItem[];
  /** Authenticated user */
  user: ShellUser;
  /** Organisation context (optional) */
  org?: ShellOrg;
  /** Called when the user clicks "Cerrar sesión" */
  onSignOut: () => void;
}

// ---------------------------------------------------------------------------
// ShellSidebar
// ---------------------------------------------------------------------------
export function ShellSidebar({
  appName,
  appLogo,
  navItems,
  user,
  org,
  onSignOut,
}: ShellSidebarProps) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside
      className="
        flex h-full w-[var(--shell-sidebar-w,240px)] flex-col
        bg-[var(--shell-sidebar-bg)] text-[var(--shell-sidebar-fg)]
        border-r border-[var(--shell-border)]
      "
    >
      {/* ── App header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[var(--shell-border)]">
        {appLogo ? (
          <img src={appLogo} alt={appName} className="size-7 rounded object-contain" />
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded bg-[var(--shell-accent)] text-xs font-bold text-white">
            {appName.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="truncate text-sm font-semibold">{appName}</span>
      </div>

      {/* ── Org badge (top position, optional) ─────────────────── */}
      {org && (
        <div className="border-b border-[var(--shell-border)]">
          <OrgBadge org={org} />
        </div>
      )}

      {/* ── Nav items ──────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm
                transition-colors duration-150
                ${
                  active
                    ? "bg-[var(--shell-accent)] text-white font-medium"
                    : "text-[var(--shell-sidebar-fg)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-sidebar-fg)]"
                }
              `}
            >
              <NavIcon name={item.icon} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── User section ───────────────────────────────────────── */}
      <div className="border-t border-[var(--shell-border)] p-3 space-y-2">
        {/* User info */}
        <div className="flex items-center gap-2.5 px-1">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user.name ?? user.email}</p>
            {user.role && (
              <p className="truncate text-[10px] text-[var(--shell-text-muted)]">
                {user.role}
              </p>
            )}
          </div>
        </div>

        {/* Sign-out button */}
        <button
          onClick={onSignOut}
          className="
            flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs
            text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]
            hover:text-[var(--shell-sidebar-fg)] transition-colors duration-150
          "
        >
          <LogOut className="size-3.5 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
