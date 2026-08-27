import { describe, expect, it } from "vitest";
import { ScenarioLocaleContentSchema, ScenarioSchema } from "@/lib/shared/schemas";
import { residencePermitDeA2 } from "./worlds/germany";
import {
  getCefrProfile,
  getLanguage,
  getLocation,
  getScenario,
  getScenarioContent,
  getWorld,
  listLocations,
  listScenarios,
  listWorlds,
} from "./load";

describe("content loading", () => {
  it("loads the Germany world", () => {
    const worlds = listWorlds();
    expect(worlds.map((world) => world.id).sort()).toEqual(["france", "germany"]);
    const germany = getWorld("germany");
    expect(germany?.countryCode).toBe("DE");
    expect(germany?.defaultLanguage).toBe("de");
    expect(germany?.supportedLanguages).toEqual(["de"]);
    expect(germany?.description?.en).toMatch(/Germany/i);
    expect(germany?.locationIds).toEqual(
      expect.arrayContaining(["buergeramt", "apartment", "restaurant"]),
    );
    expect(germany?.categoryIds).toEqual([
      "housing",
      "city_registration",
      "residence",
      "university",
      "work",
      "healthcare",
      "transport",
      "everyday",
    ]);
  });

  it("loads German language tags as content, not engine enums", () => {
    const german = getLanguage("de");
    expect(german?.displayName.en).toBe("German");
    expect(german?.grammarTags).toEqual(
      expect.arrayContaining(["dativ", "articles", "word_order", "verb_position"]),
    );
    expect(german?.domainTags).toEqual(
      expect.arrayContaining([
        "vocabulary_housing",
        "vocabulary_administration",
        "vocabulary_restaurant",
      ]),
    );
  });

  it("enables exactly three scenarios", () => {
    const scenarios = listScenarios("germany");
    const enabled = scenarios.filter((scenario) => scenario.status === "enabled");
    expect(enabled.map((scenario) => scenario.id).sort()).toEqual([
      "apartment_viewing",
      "city_registration",
      "restaurant",
    ]);
    expect(scenarios.some((scenario) => scenario.status === "coming_soon")).toBe(
      true,
    );
    expect(getScenario("job_interview")?.status).toBe("coming_soon");
    expect(getScenario("residence_permit_appointment")?.status).toBe(
      "coming_soon",
    );
    expect(getScenario("residence_permit_appointment")?.locationId).toBe(
      "auslaenderbehoerde",
    );
  });

  it("loads German CEFR content for enabled scenarios", () => {
    for (const scenarioId of [
      "apartment_viewing",
      "city_registration",
      "restaurant",
    ]) {
      const scenario = getScenario(scenarioId);
      expect(scenario).not.toBeNull();
      expect(ScenarioSchema.parse(scenario)).toMatchObject({ id: scenarioId });
      expect(scenario?.supportedLevels).toEqual(["A1", "A2", "B1", "B2", "C1"]);
      for (const level of ["A1", "A2", "B1", "B2", "C1"] as const) {
        const content = getScenarioContent("germany", scenarioId, "de", level);
        expect(content).not.toBeNull();
        expect(ScenarioLocaleContentSchema.parse(content).level).toBe(level);
      }
    }
  });

  it("does not load missing locale or scenario combinations", () => {
    expect(getScenarioContent("germany", "apartment_viewing", "fr", "A2")).toBeNull();
    expect(getScenarioContent("france", "apartment_viewing", "de", "A2")).toBeNull();
    expect(getScenarioContent("germany", "job_interview", "de", "A2")).toBeNull();
  });

  it("keeps CEFR profiles generic", () => {
    const a2 = getCefrProfile("A2");
    expect(a2.sentenceComplexity).toBe("simple");
    expect(JSON.stringify(a2)).not.toMatch(/Miete|Anmeldung|Guten Tag/);
  });

  it("attaches the legal disclaimer to city registration", () => {
    const content = getScenarioContent(
      "germany",
      "city_registration",
      "de",
      "A2",
    );
    expect(content?.learnerFacingDisclaimer).toBe(
      "Language simulation — not legal advice.",
    );
    expect(getScenario("city_registration")?.disclaimer).toBe("not_legal_advice");
  });

  it("declares supported learning concepts on enabled scenarios", () => {
    expect(getScenario("apartment_viewing")?.supportedConcepts).toEqual(
      expect.arrayContaining(["dative", "vocabulary_housing"]),
    );
    expect(getScenario("apartment_viewing")?.summary?.en).toMatch(/landlord/i);
    expect(getScenario("apartment_viewing")?.estimatedMinutes).toBe(10);
    expect(getScenario("restaurant")?.supportedConcepts).toEqual(
      expect.arrayContaining(["accusative", "vocabulary_restaurant"]),
    );
    expect(getScenario("city_registration")?.supportedConcepts).toEqual(
      expect.arrayContaining(["vocabulary_administration", "formal_language"]),
    );
  });

  it("attaches locations to enabled scenarios", () => {
    expect(getScenario("apartment_viewing")?.locationId).toBe("apartment");
    expect(getScenario("city_registration")?.locationId).toBe("buergeramt");
    expect(getScenario("restaurant")?.locationId).toBe("restaurant");
    expect(getLocation("buergeramt", "germany")?.name.en).toBe("Bürgeramt");
    expect(listLocations("germany").map((location) => location.id)).toEqual(
      expect.arrayContaining(["auslaenderbehoerde", "university", "workplace"]),
    );
  });

  it("loads engine-compatible content with variants for enabled scenarios", () => {
    const content = getScenarioContent("germany", "apartment_viewing", "de", "A2");
    expect(content?.variants.map((variant) => variant.id).sort()).toEqual([
      "available_later",
      "available_now",
      "other_applicant",
    ]);
    expect(content?.locationId).toBe("apartment");
  });

  it("keeps the residence-permit definition compatible but not playable", () => {
    expect(getScenarioContent("germany", "residence_permit_appointment", "de", "A2")).toBeNull();
    const parsed = ScenarioLocaleContentSchema.parse(residencePermitDeA2);
    expect(parsed.locationId).toBe("auslaenderbehoerde");
    expect(parsed.mission.objectives.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "explain_reason_for_appointment",
        "understand_document_requests",
        "ask_about_next_steps",
      ]),
    );
    expect(parsed.learnerFacingDisclaimer).toMatch(/not legal advice/i);
  });

  it("loads the France world and French CEFR content", () => {
    const france = getWorld("france");
    expect(france?.countryCode).toBe("FR");
    expect(france?.defaultLanguage).toBe("fr");
    expect(getLanguage("fr")?.displayName.en).toBe("French");
    const enabled = listScenarios("france").filter(
      (scenario) => scenario.status === "enabled",
    );
    expect(enabled.map((scenario) => scenario.id).sort()).toEqual([
      "apartment_viewing",
      "city_registration",
      "restaurant",
    ]);
    for (const scenarioId of [
      "apartment_viewing",
      "city_registration",
      "restaurant",
    ]) {
      const content = getScenarioContent("france", scenarioId, "fr", "A1");
      expect(content).not.toBeNull();
      expect(ScenarioLocaleContentSchema.parse(content).language).toBe("fr");
    }
    expect(getLocation("mairie", "france")?.name.en).toBe("Mairie");
  });
});
