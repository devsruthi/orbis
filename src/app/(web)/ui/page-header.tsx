export const CARD =
  "orbis-card p-5";

export const PRIMARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-orbis-gold px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

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
      <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
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

export function LevelBadge({ level }: { level: string }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-full bg-orbis-lilac/15 px-2.5 py-0.5 text-xs font-semibold text-orbis-lilac">
      {level}
    </span>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
      {children}
    </h2>
  );
}
