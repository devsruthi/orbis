"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  bindHistoryBackNavigation,
  onKeyboardInsetChange,
} from "@/lib/client/platform";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/practice", label: "Practice" },
  { href: "/progress", label: "Progress" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const immersive = Boolean(
    pathname?.startsWith("/play") || pathname?.startsWith("/review"),
  );

  useEffect(() => bindHistoryBackNavigation(), []);

  useEffect(() => {
    if (!immersive) {
      document.documentElement.style.removeProperty("--keyboard-inset");
      return;
    }
    return onKeyboardInsetChange((inset) => {
      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${inset}px`,
      );
    });
  }, [immersive]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-[#f3eee4]/90 backdrop-blur dark:border-zinc-800 dark:bg-[#14110e]/90">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-[#c45c26]"
            />
            <span className="text-lg font-semibold tracking-tight">Orbis</span>
          </Link>
          <nav aria-label="Main" className="hidden sm:block">
            <ul className="flex gap-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <NavLink href={link.href} label={link.label} pathname={pathname} />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <div
        className={[
          "mx-auto flex min-h-0 w-full min-w-0 max-w-3xl flex-1 flex-col px-4 pt-6 sm:px-6 sm:pb-10",
          immersive ? "pb-6" : "pb-24",
        ].join(" ")}
      >
        {children}
      </div>

      {immersive ? null : (
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200/80 bg-[#f3eee4]/95 backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-[#14110e]/95"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {LINKS.map((link) => (
            <li key={link.href}>
              <NavLink
                href={link.href}
                label={link.label}
                pathname={pathname}
                stacked
              />
            </li>
          ))}
        </ul>
      </nav>
      )}
    </div>
  );
}

function NavLink({
  href,
  label,
  pathname,
  stacked = false,
}: {
  href: string;
  label: string;
  pathname: string | null;
  stacked?: boolean;
}) {
  const active = href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "block text-center text-sm font-medium",
        stacked ? "px-2 py-3" : "rounded-full px-3 py-1.5",
        active
          ? "text-[#c45c26]"
          : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
