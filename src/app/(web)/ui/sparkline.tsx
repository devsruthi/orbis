export function Sparkline({
  values,
  label,
}: {
  values: number[];
  label: string;
}) {
  if (values.length === 0) {
    return null;
  }
  const width = 280;
  const height = 72;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 8 - ((value - min) / range) * (height - 16);
    return `${x},${y}`;
  });

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      className="h-20 w-full max-w-md text-[#c45c26]"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(" ")}
      />
    </svg>
  );
}
