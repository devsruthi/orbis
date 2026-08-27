"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  bindHistoryBackNavigation,
  onKeyboardInsetChange,
} from "@/lib/client/platform";
import {
  DashboardProvider,
  useLearnerDashboard,
} from "@/lib/client/use-dashboard";
import { pathHasStartedScene } from "@/lib/client/labels";
import {
  HomeIcon,
  MicIcon,
  MissionsIcon,
  OrbitMark,
  ProgressIcon,
  ReviewsIcon,
} from "./icons";
import { PathChips } from "./page-header";
import { UserMenu } from "./user-menu";

const LINKS = [
  { href: "/", label: "Dashboard", Icon: HomeIcon },
  { href: "/explore", label: "Missions", Icon: MissionsIcon },
  { href: "/practice", label: "Reviews", Icon: ReviewsIcon },
  { href: "/progress", label: "Progress", Icon: ProgressIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </DashboardProvider>
  );
}

function AppShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const immersive = Boolean(
    pathname?.startsWith("/play") || pathname?.startsWith("/review"),
  );
  const { data } = useLearnerDashboard();
  const learner = data?.learner;
  const paths = data?.paths ?? [];
  const startedPaths = paths.filter(pathHasStartedScene);

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
    <div className="flex h-dvh min-h-0 bg-background text-foreground">
      <aside className="hidden h-dvh min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-stone-200/70 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/40 lg:flex">
        <div className="shrink-0 px-4 pt-5">
          <UserMenu />

          <div className="mt-5 flex items-start gap-2 px-2 py-1 text-orbis-gold">
            <OrbitMark className="mt-0.5 h-7 w-7 shrink-0" />
            <div className="min-w-0">
              <p className="font-serif text-2xl tracking-wide text-foreground">
                ORBIS
              </p>
              <p className="mt-0.5 text-sm leading-snug text-stone-500 dark:text-zinc-400">
                AI Language Immersion Simulator
              </p>
            </div>
          </div>

          {startedPaths.length > 0 ? (
            <div className="mt-5 px-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">
                In progress
              </p>
              <div className="mt-2">
                <PathChips paths={startedPaths} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          <nav aria-label="Main" className="mt-6">
            <ul className="flex flex-col gap-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <NavLink
                    href={link.href}
                    label={link.label}
                    pathname={pathname}
                    Icon={link.Icon}
                  />
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6 flex flex-col gap-3 pb-4">
            <Link
              href={learner?.setupComplete ? "/explore" : "/"}
              className="flex items-center gap-3 rounded-2xl bg-orbis-gold/12 px-3 py-3 text-sm text-orbis-gold-deep"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orbis-gold text-white">
                <MicIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-medium">Voice mode</span>
                <span className="block text-xs text-stone-500">
                  Speak in a mission.
                </span>
              </span>
            </Link>
          </div>
        </div>

        <div className="shrink-0 px-4 py-4">
          <p className="px-1 text-[11px] text-stone-400">Made with care by Orbis.</p>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 shrink-0 border-b border-stone-200/70 bg-[#f6f3ec]/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-zinc-800 dark:bg-[#16130f]/90 lg:hidden">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex min-h-11 items-center gap-2 text-orbis-gold">
              <OrbitMark className="h-6 w-6" />
              <span className="font-serif text-xl tracking-wide text-foreground">
                ORBIS
              </span>
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              {startedPaths.length > 0 ? <PathChips paths={startedPaths} /> : null}
              <UserMenu compact />
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            className={[
              "mx-auto min-h-full w-full min-w-0 px-4 pt-6 sm:px-6 sm:pt-8 lg:max-w-5xl lg:px-8 lg:pt-10",
              immersive ? "pb-12 sm:pb-16" : "pb-16 sm:pb-24",
            ].join(" ")}
          >
            {children}
          </div>
        </main>

        {immersive ? null : (
          <nav
            aria-label="Main"
            className="z-20 shrink-0 border-t border-stone-200/80 bg-[#f6f3ec]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-[#16130f]/95 lg:hidden"
          >
            <ul className="mx-auto grid max-w-4xl grid-cols-4 px-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <NavLink
                    href={link.href}
                    label={link.label}
                    pathname={pathname}
                    Icon={link.Icon}
                    stacked
                  />
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  pathname,
  Icon,
  stacked = false,
}: {
  href: string;
  label: string;
  pathname: string | null;
  Icon: typeof HomeIcon;
  stacked?: boolean;
}) {
  const active = href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-3 text-sm font-medium",
        stacked
          ? "mx-1 my-1.5 flex-col gap-1 rounded-2xl px-2 py-2.5 text-center"
          : "rounded-2xl px-3 py-2.5",
        active
          ? "bg-orbis-gold/15 text-orbis-gold-deep"
          : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
      ].join(" ")}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}
