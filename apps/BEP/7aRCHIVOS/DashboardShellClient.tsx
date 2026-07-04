"use client";

/**
 * DashboardShellClient
 *
 * Client Component wrapper for ShellLayout inside core-bep.
 * Handles:
 *   - signOut() via the BEP Supabase client (NEXT_PUBLIC_BEP_SUPABASE_URL)
 *   - Passing user + org + navItems to ShellLayout
 *   - Detecting whether the current route is inside /projects/[id]/* and,
 *     if so, swapping the global nav for the project's module nav, and
 *     fetching the project's name/code to show in the topbar.
 *
 * IMPORTANT: this file imports from the BEP-specific Supabase client,
 * NOT from @core/auth (which points to the CORE Supabase instance).
 */

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShellLayout, type NavItem, type ShellUser, type ShellOrg } from "@core/shell";
import { createBrowserClient } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// Global nav items — shown outside of a project context
// ---------------------------------------------------------------------------
const GLOBAL_NAV_ITEMS: NavItem[] = [
  { label: "Proyectos", href: "/projects", icon: "FolderOpen" },
  { label: "Perfil",    href: "/profile",  icon: "User"       },
];

// ---------------------------------------------------------------------------
// Project module nav items — shown when inside /projects/[id]/*
// (href is built dynamically once we know the project id)
// ---------------------------------------------------------------------------
const PROJECT_MODULES: Array<{ label: string; slug: string; icon: string }> = [
  { label: "Documentos",   slug: "documents",  icon: "FileText"      },
  { label: "BOM",          slug: "bom",        icon: "List"          },
  { label: "Cumplimiento", slug: "compliance", icon: "CheckSquare"   },
  { label: "RFQ / Cotiz.", slug: "rfq",        icon: "ShoppingCart"  },
  { label: "Riesgos",      slug: "risks",      icon: "AlertTriangle" },
  { label: "Consultas",    slug: "queries",    icon: "MessageSquare" },
  { label: "Wiki técnica", slug: "knowledge",  icon: "BookOpen"      },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts the project id from a pathname like /projects/abc-123 or /projects/abc-123/bom */
function getProjectIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (!match) return null;
  // Avoid matching a literal "/projects/new" create-route, if one exists
  if (match[1] === "new") return null;
  return match[1];
}

function buildProjectNavItems(projectId: string): NavItem[] {
  return [
    { label: "← Proyectos", href: "/projects", icon: "ArrowLeft" },
    ...PROJECT_MODULES.map((m) => ({
      label: m.label,
      href: `/projects/${projectId}/${m.slug}`,
      icon: m.icon,
    })),
  ];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DashboardShellClientProps {
  user: ShellUser;
  org?: ShellOrg;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function DashboardShellClient({ user, org, children }: DashboardShellClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const projectId = useMemo(() => getProjectIdFromPath(pathname), [pathname]);

  const [activeProject, setActiveProject] = useState<{ name: string; code: string } | null>(null);

  // Supabase client is stable across renders — create it once.
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_BEP_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_BEP_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    if (!projectId) {
      setActiveProject(null);
      return;
    }

    let cancelled = false;

    supabase
      .from("projects")
      .select("name, code")
      .eq("id", projectId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setActiveProject(null);
          return;
        }
        setActiveProject({ name: data.name, code: data.code });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItems = projectId ? buildProjectNavItems(projectId) : GLOBAL_NAV_ITEMS;

  return (
    <ShellLayout
      appName="BEP"
      navItems={navItems}
      user={user}
      org={org}
      onSignOut={handleSignOut}
      topbarTitle={projectId ? activeProject?.name : undefined}
      topbarSubtitle={projectId ? activeProject?.code : undefined}
    >
      {children}
    </ShellLayout>
  );
}
