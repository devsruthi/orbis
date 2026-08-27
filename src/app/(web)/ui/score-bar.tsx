export function ScoreBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-stone-500">{Math.round(value)}</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
      >
        <div
          className="h-full rounded-full bg-[#c45c26]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
