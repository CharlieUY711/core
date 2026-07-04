"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface ShellTopbarProps {
  /** Breadcrumb trail; last item is the current page (no href needed) */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional slot rendered on the right side (e.g. action buttons) */
  actions?: React.ReactNode;
  /** Optional slot rendered on the left, after breadcrumbs */
  leading?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// ShellTopbar — Server-compatible (no hooks), but "use client" for flexibility
// when consumers need to pass client-rendered actions.
// ---------------------------------------------------------------------------
export function ShellTopbar({ breadcrumbs = [], actions, leading }: ShellTopbarProps) {
  return (
    <header
      className="
        flex h-[var(--shell-topbar-h,56px)] items-center justify-between
        gap-4 border-b border-[var(--shell-border)]
        bg-[var(--shell-topbar-bg)] px-4
      "
    >
      {/* Left: breadcrumbs + optional leading slot */}
      <div className="flex min-w-0 items-center gap-2">
        {breadcrumbs.length > 0 && (
          <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <ChevronRight className="size-3.5 shrink-0 text-[var(--shell-text-muted)]" />
                  )}
                  {!isLast && crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="truncate text-[var(--shell-text-muted)] hover:text-[var(--shell-topbar-fg)] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        isLast
                          ? "truncate font-medium text-[var(--shell-topbar-fg)]"
                          : "truncate text-[var(--shell-text-muted)]"
                      }
                      aria-current={isLast ? "page" : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}
        {leading}
      </div>

      {/* Right: action slot */}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
