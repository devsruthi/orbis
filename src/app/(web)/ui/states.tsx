"use client";

import Link from "next/link";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./page-header";

export function PageSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <p className="text-sm text-stone-500">{label}</p>
      <div className="h-28 animate-pulse rounded-3xl bg-stone-200/80 dark:bg-zinc-800" />
      <div className="h-40 animate-pulse rounded-3xl bg-stone-200/70 dark:bg-zinc-800" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-3xl bg-stone-200/60 dark:bg-zinc-800" />
        <div className="h-24 animate-pulse rounded-3xl bg-stone-200/60 dark:bg-zinc-800" />
        <div className="hidden h-24 animate-pulse rounded-3xl bg-stone-200/60 sm:block dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="orbis-card flex flex-col gap-3 p-5"
      role="alert"
    >
      <p className="font-medium">Something went wrong</p>
      <p className="text-sm text-stone-600 dark:text-zinc-400">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={`${SECONDARY_BUTTON} self-start`}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="orbis-card flex flex-col gap-3 p-5">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-stone-600 dark:text-zinc-400">{body}</p>
      {action ? (
        <Link href={action.href} className={`${PRIMARY_BUTTON} mt-2 w-full sm:w-auto`}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
