import type { ScenarioVariant } from "@/lib/shared/models";
import { defaultVariant } from "./state";
import type { Mission } from "@/lib/shared/models";

export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function selectVariant(
  variants: ScenarioVariant[],
  learnerId: string,
  priorSessionCount: number,
  mission: Mission,
): ScenarioVariant {
  if (variants.length === 0) {
    return defaultVariant(mission);
  }
  const index = (hashString(`${learnerId}:${priorSessionCount}`) + priorSessionCount) % variants.length;
  return variants[index] ?? defaultVariant(mission);
}
