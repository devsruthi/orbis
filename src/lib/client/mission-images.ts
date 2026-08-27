const PEXELS = "https://images.pexels.com/photos";

function pexels(id: number): string {
  return `${PEXELS}/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=960&h=540&fit=crop`;
}

export function missionCoverFallback(scenarioId: string): string {
  return `https://picsum.photos/seed/orbis-${encodeURIComponent(scenarioId)}/960/540`;
}

const BY_SCENARIO: Record<string, string> = {
  apartment_viewing: pexels(1571460),
  find_apartment: pexels(1396122),
  contact_landlord: pexels(8134847),
  move_in: pexels(4246120),
  city_registration: pexels(1616470),
  bring_documents: pexels(7821915),
  waiting_number: pexels(8867482),
  pickup_certificate: pexels(6863254),
  restaurant: pexels(262978),
  residence_permit_appointment: pexels(5668858),
  apply_residence_permit: pexels(5668473),
  extend_residence_permit: pexels(6863183),
  permit_status: pexels(5673504),
  university_enrollment: pexels(256490),
  international_office: pexels(1181406),
  talk_to_professor: pexels(267885),
  exam_registration: pexels(159711),
  job_interview: pexels(3184465),
  first_day_at_work: pexels(380769),
  request_urlaub: pexels(346885),
  talk_to_hr: pexels(3184291),
  doctor_appointment: pexels(40568),
  doctor_reception: pexels(1170979),
  explain_symptoms: pexels(4225880),
  pharmacy: pexels(3683074),
  buy_train_ticket: pexels(279039),
  delayed_train: pexels(279039),
  ask_directions: pexels(210182),
  lost_property: pexels(1008155),
  supermarket: pexels(264636),
  cafe: pexels(302899),
  bakery: pexels(1775043),
};

const BY_CATEGORY: Record<string, string> = {
  housing: pexels(1571460),
  city_registration: pexels(1616470),
  residence: pexels(5668858),
  university: pexels(256490),
  work: pexels(3184465),
  healthcare: pexels(40568),
  transport: pexels(279039),
  everyday: pexels(262978),
};

export function missionCoverSrc(scenarioId: string, categoryId: string): string {
  return (
    BY_SCENARIO[scenarioId] ??
    BY_CATEGORY[categoryId] ??
    missionCoverFallback(scenarioId)
  );
}

export const WORLD_COVER_SRC = pexels(3184418);
