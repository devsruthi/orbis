"use client";

import Link from "next/link";

export function PageSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <p className="text-sm text-stone-500">{label}</p>
      <div className="h-24 animate-pulse rounded-2xl bg-stone-200/80 dark:bg-zinc-800" />
      <div className="h-40 animate-pulse rounded-2xl bg-stone-200/70 dark:bg-zinc-800" />
      <div className="h-32 animate-pulse rounded-2xl bg-stone-200/60 dark:bg-zinc-800" />
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
    <div className="flex flex-col gap-3" role="alert">
      <p className="text-stone-700 dark:text-zinc-300">
        Something went wrong while loading this page. {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-full border border-stone-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
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
    <div className="flex flex-col gap-2 py-2">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-stone-600 dark:text-zinc-400">{body}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-1 inline-flex self-start rounded-full bg-stone-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
