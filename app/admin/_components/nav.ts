/**
 * One description of the panel's navigation, used by the rail, the breadcrumb
 * and the command palette. Adding a screen in one place adds it to all three.
 */
import type { IconName } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Hidden from editors, and its page redirects them away too. */
  adminOnly?: boolean;
  /** Shown under the label in the palette. */
  hint?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: "dashboard", hint: "Figures and recent activity" },
      { href: "/admin/leads", label: "Submissions", icon: "inbox", hint: "Enquiries from every site form" },
      { href: "/admin/activity", label: "Activity log", icon: "activity", adminOnly: true, hint: "Who changed what, and when" },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/hotels", label: "Venues", icon: "venue", hint: "Every venue page, and the wedding types they list under" },
      { href: "/admin/blogs", label: "Articles", icon: "article", hint: "Blog posts, categories and tags" },
      { href: "/admin/cities", label: "City pages", icon: "city", adminOnly: true, hint: "Which venues each city lists" },
      { href: "/admin/hero", label: "Hero slider", icon: "slides", hint: "The homepage carousel" },
      { href: "/admin/media", label: "Images", icon: "image", hint: "Everything uploaded through the panel" },
      { href: "/admin/pages", label: "Pages", icon: "grid", adminOnly: true, hint: "The calculators, landing, policy and story pages" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/admin/settings", label: "Contact details", icon: "settings", adminOnly: true, hint: "Phone, email, address, social" },
      { href: "/admin/calculator", label: "Cost calculator", icon: "grid", adminOnly: true, hint: "Cities, hotels, monthly prices, tax rates and currencies" },
      { href: "/admin/labels", label: "Section headings", icon: "type", adminOnly: true, hint: "Fixed wording across the site" },
      { href: "/admin/users", label: "Users", icon: "users", adminOnly: true, hint: "Who can sign in, and as what" },
      // Open to every role: this is the only place anyone can change their own
      // password, which is why it is not adminOnly.
      { href: "/admin/account", label: "Your account", icon: "users", hint: "Your name, password and sessions" },
    ],
  },
];

/** Every item the given role may reach, flattened. */
export function navFor(role: string): NavItem[] {
  return NAV.flatMap((group) => group.items).filter((item) => !item.adminOnly || role === "admin");
}

export function navGroupsFor(role: string): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || role === "admin"),
  })).filter((group) => group.items.length > 0);
}

/**
 * The label for a screen, used in the breadcrumb. Longest matching href wins so
 * `/admin/blogs/7` resolves to Articles rather than to the dashboard.
 */
export function navLabel(pathname: string): string {
  let best: NavItem | null = null;
  for (const item of NAV.flatMap((group) => group.items)) {
    const matches = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
    if (matches && (!best || item.href.length > best.href.length)) best = item;
  }
  return best?.label ?? "Admin";
}
