export const CARD =
  "rounded-3xl border border-stone-200/70 bg-white/90 p-5 shadow-[0_18px_40px_-28px_rgba(61,42,34,0.55)] dark:border-zinc-800 dark:bg-zinc-900/80";

export const PRIMARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#c45c26] px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

export const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300/90 px-4 py-2 text-sm disabled:opacity-60 dark:border-zinc-700";

export function PageHeader({
  kicker,
  title,
  body,
}: {
  kicker?: string;
  title: string;
  body?: string;
}) {
  return (
    <header className="flex flex-col gap-3">
      {kicker ? (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          {kicker}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {body ? (
        <p className="max-w-xl text-base leading-relaxed text-stone-600 dark:text-zinc-400">
          {body}
        </p>
      ) : null}
    </header>
  );
}
