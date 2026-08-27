const MISSION_SEQUENCE: Record<string, number> = {
  find_apartment: 10,
  contact_landlord: 20,
  apartment_viewing: 30,
  move_in: 40,

  waiting_number: 10,
  bring_documents: 20,
  city_registration: 30,
  pickup_certificate: 40,

  apply_residence_permit: 10,
  residence_permit_appointment: 20,
  permit_status: 30,
  extend_residence_permit: 40,

  university_enrollment: 10,
  international_office: 20,
  talk_to_professor: 30,
  exam_registration: 40,

  job_interview: 10,
  first_day_at_work: 20,
  talk_to_hr: 30,
  request_urlaub: 40,

  doctor_appointment: 10,
  doctor_reception: 20,
  explain_symptoms: 30,
  pharmacy: 40,

  buy_train_ticket: 10,
  ask_directions: 20,
  delayed_train: 30,
  lost_property: 40,

  bakery: 10,
  supermarket: 20,
  cafe: 30,
  restaurant: 40,
};

export function missionSequence(scenarioId: string): number {
  return MISSION_SEQUENCE[scenarioId] ?? Number.MAX_SAFE_INTEGER;
}

export function sortMissionsByEventOrder<T extends { id: string }>(
  missions: T[],
): T[] {
  return [...missions].sort((a, b) => {
    const rank = missionSequence(a.id) - missionSequence(b.id);
    if (rank !== 0) {
      return rank;
    }
    return a.id.localeCompare(b.id);
  });
}
