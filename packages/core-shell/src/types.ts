/**
 * @core/shell — shared types
 * Consumed by any Next.js app in the monorepo.
 */

export interface NavItem {
  label: string;
  href: string;
  /** Lucide icon name (string key of lucide-react exports) */
  icon?: string;
  /** Use exact matching for active detection (default false) */
  exact?: boolean;
}

export interface ShellUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
}

export interface ShellOrg {
  id: string;
  name: string;
  logoUrl?: string;
}
