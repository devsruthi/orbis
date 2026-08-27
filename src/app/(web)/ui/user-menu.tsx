"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useAuthSync } from "@/lib/client/use-auth-sync";
import { useLearnerDashboard } from "@/lib/client/use-dashboard";

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();
  useAuthSync();
  const { data } = useLearnerDashboard();

  const learnerName = data?.learner.name?.trim();
  const displayName =
    learnerName || session?.user?.name?.trim() || session?.user?.email?.trim();

  if (status === "loading") {
    return (
      <div
        className={[
          "rounded-2xl bg-stone-50 px-3 py-3 dark:bg-zinc-900/70",
          compact ? "text-xs" : "text-sm",
        ].join(" ")}
      >
        <p className="text-stone-400">Loading account…</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => void signIn("google")}
        className={[
          "flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white px-3 py-2 font-medium text-foreground transition hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:bg-zinc-900",
          compact ? "text-xs" : "w-full gap-3 py-3 text-left text-sm",
        ].join(" ")}
      >
        <span
          className={[
            "flex shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-zinc-300",
            compact ? "h-7 w-7" : "h-9 w-9",
          ].join(" ")}
        >
          <GoogleMark className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
        {compact ? (
          <span>Sign in</span>
        ) : (
          <span>
            <span className="block font-medium text-foreground">Sign in with Google</span>
            <span className="block text-xs text-stone-500">
              Save progress across devices.
            </span>
          </span>
        )}
      </button>
    );
  }

  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orbis-gold/20 text-xs font-medium text-orbis-gold-deep">
            {(displayName?.[0] ?? "?").toUpperCase()}
          </span>
        )}
        <span className="min-w-0 truncate text-xs font-medium text-foreground">
          {displayName ?? "Learner"}
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="shrink-0 rounded-xl px-2 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-2xl border border-stone-200/80 bg-stone-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/70",
        compact ? "text-xs" : "text-sm",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orbis-gold/20 text-sm font-medium text-orbis-gold-deep">
            {(displayName?.[0] ?? "?").toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">
            {displayName ?? "Learner"}
          </span>
          <span className="block truncate text-xs text-stone-500">
            Signed in with Google
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-3 w-full rounded-xl px-2 py-2 text-left text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        Sign out
      </button>
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
