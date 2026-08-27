import { describe, expect, it } from "vitest";
import { getScenarioContent } from "@/content";
import { createSimulationState } from "./state";
import { selectVariant } from "./variants";
import {
  applyEvent,
  getEligibleEvents,
  selectEventToTrigger,
} from "./events";
import { applyObjectiveSignals } from "./objectives";
import { applyBranchChoice } from "./branches";
import { resolveMissionOutcome } from "./mission";
import { advanceSimulation } from "./advance";
import { practiceConceptsFor } from "./session";
import { hydrateSimulation } from "./session";
import type { ScenarioEvent, SimulationState } from "@/lib/shared/models";

const apartment = getScenarioContent("germany", "apartment_viewing", "de", "A2");
const restaurant = getScenarioContent("germany", "restaurant", "de", "A2");
const anmeldung = getScenarioContent("germany", "city_registration", "de", "A2");

function must<T>(value: T | null): T {
  if (!value) {
    throw new Error("expected content");
  }
  return value;
}

function apartmentState(variantId: string, overrides: Partial<SimulationState> = {}) {
  const content = must(apartment);
  const variant = content.variants.find((item) => item.id === variantId);
  if (!variant) {
    throw new Error(variantId);
  }
  return {
    content,
    variant,
    state: {
      ...createSimulationState({
        locationId: content.locationId,
        characterId: content.character.id,
        variant,
        objectives: content.mission.objectives,
      }),
      ...overrides,
    },
  };
}

describe("simulation state creation", () => {
  it("starts with pending objectives and variant variables", () => {
    const { state, variant } = apartmentState("available_later");
    expect(state.missionStatus).toBe("active");
    expect(state.turnCount).toBe(0);
    expect(state.triggeredEventIds).toEqual([]);
    expect(state.objectives.every((item) => item.status === "pending")).toBe(true);
    expect(state.variables.availableImmediately).toBe(false);
    expect(state.variantId).toBe(variant.id);
  });
});

describe("scenario variant selection", () => {
  it("is deterministic for the same learner and prior count", () => {
    const content = must(apartment);
    const first = selectVariant(content.variants, "learner-a", 0, content.mission);
    const again = selectVariant(content.variants, "learner-a", 0, content.mission);
    expect(first.id).toBe(again.id);
  });

  it("rotates when the same learner repeats the scenario", () => {
    const content = must(apartment);
    const ids = [0, 1, 2].map(
      (count) => selectVariant(content.variants, "learner-a", count, content.mission).id,
    );
    expect(new Set(ids).size).toBeGreaterThan(1);
  });
});

describe("event eligibility and triggering", () => {
  it("does not fire a later-availability event on turn 0", () => {
    const { state, content, variant } = apartmentState("available_later");
    expect(selectEventToTrigger(state, content.events, variant)).toBeNull();
  });

  it("fires the variant event once conditions match", () => {
    const { state, content, variant } = apartmentState("available_later", {
      turnCount: 2,
    });
    const eligible = getEligibleEvents(state, content.events, variant.id);
    expect(eligible.map((event) => event.id)).toContain("available_from_later_date");
    const selected = selectEventToTrigger(state, content.events, variant);
    expect(selected?.id).toBe("available_from_later_date");
    const next = applyEvent(state, selected as ScenarioEvent);
    expect(next.triggeredEventIds).toContain("available_from_later_date");
    expect(next.variables.availableFromLater).toBe(true);
    expect(next.unresolvedIssues).toContain("later_availability");
  });

  it("does not re-trigger an at-most-once event", () => {
    const { state, content, variant } = apartmentState("available_later", {
      turnCount: 4,
      triggeredEventIds: ["available_from_later_date"],
      lastEventTurn: 2,
      unresolvedIssues: [],
    });
    expect(selectEventToTrigger(state, content.events, variant)).toBeNull();
    const again = applyEvent(
      state,
      content.events.find((event) => event.id === "available_from_later_date") as ScenarioEvent,
    );
    expect(again.triggeredEventIds).toEqual(["available_from_later_date"]);
  });

  it("waits while an unresolved issue is open", () => {
    const { state, content, variant } = apartmentState("available_later", {
      turnCount: 5,
      unresolvedIssues: ["later_availability"],
      lastEventTurn: 2,
    });
    expect(selectEventToTrigger(state, content.events, variant)).toBeNull();
  });

  it("requires order_food before the unavailable-dish event", () => {
    const content = must(restaurant);
    const variant = content.variants.find((item) => item.id === "dish_unavailable");
    if (!variant) {
      throw new Error("variant");
    }
    const state = createSimulationState({
      locationId: content.locationId,
      characterId: content.character.id,
      variant,
      objectives: content.mission.objectives,
    });
    state.turnCount = 3;
    expect(selectEventToTrigger(state, content.events, variant)).toBeNull();
    state.objectives = state.objectives.map((objective) =>
      objective.id === "order_food"
        ? { ...objective, status: "completed" }
        : objective,
    );
    expect(selectEventToTrigger(state, content.events, variant)?.id).toBe(
      "dish_unavailable",
    );
  });
});

describe("objective transitions", () => {
  it("completes only known objectives with evidence", () => {
    const { state, content } = apartmentState("available_now");
    const next = applyObjectiveSignals(state, content.mission, [
      { objectiveId: "greet_landlord", satisfied: true, evidence: "Guten Tag" },
      { objectiveId: "invented", satisfied: true, evidence: "nope" },
      { objectiveId: "ask_about_rent", satisfied: true, evidence: "" },
    ]);
    expect(next.objectives.find((item) => item.id === "greet_landlord")?.status).toBe(
      "completed",
    );
    expect(next.objectives.find((item) => item.id === "invented")).toBeUndefined();
    expect(next.objectives.find((item) => item.id === "ask_about_rent")?.status).toBe(
      "in_progress",
    );
  });

  it("does not let Claude mark a completed objective failed", () => {
    const { state, content } = apartmentState("available_now");
    state.objectives = state.objectives.map((objective) =>
      objective.id === "greet_landlord"
        ? { ...objective, status: "completed" }
        : objective,
    );
    const next = applyObjectiveSignals(state, content.mission, [
      { objectiveId: "greet_landlord", satisfied: false, evidence: "ignore" },
    ]);
    expect(next.objectives.find((item) => item.id === "greet_landlord")?.status).toBe(
      "completed",
    );
  });
});

describe("mission success and failure", () => {
  it("succeeds when required objectives are done and no blocking issue remains", () => {
    const { state, content, variant } = apartmentState("available_now");
    state.objectives = state.objectives.map((objective) => ({
      ...objective,
      status: "completed",
    }));
    const next = resolveMissionOutcome(state, content.mission, content.events, variant);
    expect(next.missionStatus).toBe("successful");
  });

  it("stays active while a blocking issue is unresolved", () => {
    const { state, content, variant } = apartmentState("available_later");
    state.objectives = state.objectives.map((objective) => ({
      ...objective,
      status: "completed",
    }));
    state.unresolvedIssues = ["later_availability"];
    const next = resolveMissionOutcome(state, content.mission, content.events, variant);
    expect(next.missionStatus).toBe("active");
  });

  it("fails only when the learner declines a blocking path", () => {
    const { state, content } = apartmentState("available_later", {
      turnCount: 3,
      unresolvedIssues: ["later_availability"],
    });
    const next = applyBranchChoice(state, content.branches, "decline");
    expect(next.missionStatus).toBe("failed");
    expect(next.variables.declinedApartment).toBe(true);
  });

  it("ignores unknown branch choices", () => {
    const { state, content } = apartmentState("available_later", {
      unresolvedIssues: ["later_availability"],
    });
    const next = applyBranchChoice(state, content.branches, "teleport");
    expect(next.missionStatus).toBe("active");
    expect(next.unresolvedIssues).toEqual(["later_availability"]);
  });
});

describe("full turn pipeline", () => {
  it("can complete an Anmeldung after the missing-document issue is handled", () => {
    const content = must(anmeldung);
    const variant = content.variants.find((item) => item.id === "missing_document");
    if (!variant) {
      throw new Error("variant");
    }
    let state = createSimulationState({
      locationId: content.locationId,
      characterId: content.character.id,
      variant,
      objectives: content.mission.objectives,
    });

    const greet = advanceSimulation({
      state,
      mission: content.mission,
      events: content.events,
      variant,
      branches: content.branches,
      signals: [
        {
          objectiveId: "greet_employee",
          satisfied: true,
          evidence: "Guten Tag",
        },
      ],
    });
    expect(greet.triggeredEventId).toBeNull();
    state = greet.state;

    const issue = advanceSimulation({
      state,
      mission: content.mission,
      events: content.events,
      variant,
      branches: content.branches,
      signals: [
        {
          objectiveId: "explain_why_there",
          satisfied: true,
          evidence: "Anmeldung",
        },
      ],
    });
    expect(issue.triggeredEventId).toBe("missing_document");
    expect(issue.state.unresolvedIssues).toContain("missing_document");
    state = issue.state;

    const done = advanceSimulation({
      state,
      mission: content.mission,
      events: content.events,
      variant,
      branches: content.branches,
      signals: content.mission.objectives.map((objective) => ({
        objectiveId: objective.id,
        satisfied: true,
        evidence: objective.label.en,
      })),
      branchChoice: "acknowledge",
    });
    expect(done.state.missionStatus).toBe("successful");
    expect(done.state.unresolvedIssues).toEqual([]);
  });
});

describe("adaptive weakness integration", () => {
  it("only keeps weaknesses the scenario actually practices", () => {
    expect(
      practiceConceptsFor(
        ["dative", "vocabulary_housing"],
        ["dative", "perfect_tense", "dative"],
      ),
    ).toEqual(["dative"]);
  });
});

describe("legacy session hydration", () => {
  it("rebuilds simulation state from older session fields", () => {
    const content = must(apartment);
    const session = {
      firedEventIds: ["ask_about_employment"],
      pendingEventIds: [],
      mission: content.mission,
      missionProgress: [
        { objectiveId: "greet_landlord", status: "completed" as const },
      ],
      character: content.character,
      turns: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user" as const,
          text: "Guten Tag",
          inputType: "text" as const,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    const simulation = hydrateSimulation(session as never);
    expect(simulation.triggeredEventIds).toEqual(["ask_about_employment"]);
    expect(simulation.turnCount).toBe(1);
    expect(simulation.objectives.find((item) => item.id === "greet_landlord")?.status).toBe(
      "completed",
    );
  });
});
