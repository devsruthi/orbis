export function humanizeConcept(concept: string): string {
  const stripped = concept.replace(/^vocabulary_/, "");
  return stripped
    .split("_")
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part,
    )
    .join(" ");
}

export function categoryMark(categoryId: string): string {
  const marks: Record<string, string> = {
    housing: "Housing",
    city_registration: "City office",
    residence: "Residence",
    university: "University",
    work: "Work",
    healthcare: "Health",
    transport: "Transport",
    everyday: "Everyday",
  };
  return marks[categoryId] ?? categoryId;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return iso;
  }
  const minutes = Math.round((now.getTime() - then) / 60_000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  const days = Math.round(hours / 24);
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  return new Date(then).toLocaleDateString();
}

export function formatDueLabel(iso: string, now: Date = new Date()): string {
  const days = Math.round((Date.parse(iso) - now.getTime()) / 86_400_000);
  if (Number.isNaN(days) || days <= 0) {
    return "Due today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  return `In ${days} days`;
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${Math.round(value)}%`;
}

export function accuracyPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${Math.round(value * 100)}%`;
}

export function trendLabel(
  trend: "improving" | "stable" | "declining" | "insufficient",
): string {
  if (trend === "improving") {
    return "Improving";
  }
  if (trend === "declining") {
    return "Needs attention";
  }
  if (trend === "stable") {
    return "Stable";
  }
  return "Not enough sessions yet";
}

export function attemptStatusLabel(
  status: "never" | "attempted" | "completed" | "recently_completed",
): string {
  if (status === "recently_completed") {
    return "Recently completed";
  }
  if (status === "completed") {
    return "Completed";
  }
  if (status === "attempted") {
    return "Attempted";
  }
  return "Not started";
}

export function languageFlag(code: string): string {
  if (code === "de") {
    return "🇩🇪";
  }
  return "";
}
