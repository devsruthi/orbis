import type { Scenario } from "@/lib/shared/models";

type ComingSoonOptions = {
  disclaimer?: Scenario["disclaimer"];
  locationId?: string;
  character?: Scenario["character"];
  supportedConcepts?: string[];
  summary?: string;
  estimatedMinutes?: number;
  supportedLevels?: Scenario["supportedLevels"];
};

function comingSoon(
  id: string,
  categoryId: string,
  title: string,
  options: ComingSoonOptions = {},
): Scenario {
  return {
    id,
    worldId: "germany",
    categoryId,
    locationId: options.locationId,
    status: "coming_soon",
    supportedLevels: options.supportedLevels ?? ["A2"],
    supportedLanguages: ["de"],
    title: { en: title },
    character: options.character,
    disclaimer: options.disclaimer ?? "none",
    supportedConcepts: options.supportedConcepts ?? [],
    summary: options.summary ? { en: options.summary } : undefined,
    estimatedMinutes: options.estimatedMinutes,
  };
}

export const germanyComingSoonScenarios: Scenario[] = [
  comingSoon("apartment_search", "housing", "Searching for an apartment", {
    locationId: "apartment",
  }),
  comingSoon("contact_landlord", "housing", "Contacting a landlord", {
    locationId: "apartment",
  }),
  comingSoon("sign_rental_contract", "housing", "Signing a rental contract", {
    locationId: "apartment",
  }),
  comingSoon("report_apartment_problem", "housing", "Reporting a problem in an apartment", {
    locationId: "apartment",
  }),
  comingSoon("moving_in", "housing", "Moving into a new apartment", {
    locationId: "apartment",
  }),
  comingSoon("hausverwaltung", "housing", "Talking to a Hausverwaltung", {
    locationId: "apartment",
  }),
  comingSoon(
    "apply_residence_permit",
    "residence",
    "Applying for a residence permit",
    {
      disclaimer: "not_legal_advice",
      locationId: "auslaenderbehoerde",
    },
  ),
  comingSoon(
    "extend_residence_permit",
    "residence",
    "Extending a residence permit",
    {
      disclaimer: "not_legal_advice",
      locationId: "auslaenderbehoerde",
    },
  ),
  comingSoon(
    "residence_status_inquiry",
    "residence",
    "Asking about application status",
    {
      disclaimer: "not_legal_advice",
      locationId: "auslaenderbehoerde",
    },
  ),
  comingSoon("university_enrollment", "university", "University enrollment", {
    locationId: "university",
  }),
  comingSoon("international_office", "university", "International office", {
    locationId: "university",
  }),
  comingSoon("studentenwerk", "university", "Studentenwerk", {
    locationId: "university",
  }),
  comingSoon("talk_to_professor", "university", "Talking to a professor", {
    locationId: "university",
  }),
  comingSoon("exam_registration", "university", "Registering for an exam", {
    locationId: "university",
  }),
  comingSoon("group_project", "university", "Group project", {
    locationId: "university",
  }),
  comingSoon("job_interview", "work", "Job interview", {
    locationId: "workplace",
  }),
  comingSoon("working_student_interview", "work", "Working student interview", {
    locationId: "workplace",
  }),
  comingSoon("first_day_at_work", "work", "First day at work", {
    locationId: "workplace",
  }),
  comingSoon("request_urlaub", "work", "Asking for Urlaub", {
    locationId: "workplace",
  }),
  comingSoon("call_in_sick", "work", "Calling in sick", {
    locationId: "workplace",
  }),
  comingSoon("talk_to_hr", "work", "Talking to HR", {
    locationId: "workplace",
  }),
  comingSoon("make_doctor_appointment", "healthcare", "Making a doctor's appointment", {
    disclaimer: "not_medical_advice",
    locationId: "doctors_office",
  }),
  comingSoon("doctor_reception", "healthcare", "Reception at a doctor's office", {
    disclaimer: "not_medical_advice",
    locationId: "doctors_office",
  }),
  comingSoon("explain_symptoms", "healthcare", "Explaining symptoms", {
    disclaimer: "not_medical_advice",
    locationId: "doctors_office",
  }),
  comingSoon("pharmacy", "healthcare", "Pharmacy", {
    disclaimer: "not_medical_advice",
    locationId: "pharmacy",
  }),
  comingSoon("health_insurance", "healthcare", "Health insurance conversation", {
    disclaimer: "not_medical_advice",
    locationId: "doctors_office",
  }),
  comingSoon("buy_train_ticket", "transport", "Buying a train ticket", {
    locationId: "train_station",
  }),
  comingSoon("deutschlandticket", "transport", "Deutschlandticket", {
    locationId: "train_station",
  }),
  comingSoon("delayed_train", "transport", "Asking about a delayed train", {
    locationId: "train_station",
  }),
  comingSoon("ask_directions", "transport", "Asking for directions", {
    locationId: "train_station",
  }),
  comingSoon("lost_property", "transport", "Lost property", {
    locationId: "train_station",
  }),
  comingSoon("supermarket", "everyday", "Supermarket", {
    locationId: "supermarket",
  }),
  comingSoon("cafe", "everyday", "Café", {
    locationId: "restaurant",
  }),
  comingSoon("bakery", "everyday", "Bakery", {
    locationId: "supermarket",
  }),
  comingSoon("post_office", "everyday", "Post office", {
    locationId: "post_office",
  }),
  comingSoon("bank", "everyday", "Bank", {
    locationId: "bank",
  }),
  comingSoon("mobile_phone_shop", "everyday", "Mobile phone shop", {
    locationId: "supermarket",
  }),
  comingSoon("talking_to_neighbors", "everyday", "Talking to neighbors", {
    locationId: "apartment",
  }),
];
