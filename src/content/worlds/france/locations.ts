import type { Location } from "@/lib/shared/models";

export const franceLocations: Location[] = [
  {
    id: "apartment",
    worldId: "france",
    name: { en: "Apartment" },
    description: {
      en: "A rental apartment during a viewing with the landlady.",
    },
  },
  {
    id: "mairie",
    worldId: "france",
    name: { en: "Mairie" },
    description: {
      en: "A French town hall counter. Conversations are formal and brief.",
    },
  },
  {
    id: "restaurant",
    worldId: "france",
    name: { en: "Restaurant" },
    description: { en: "A casual restaurant during a meal." },
  },
  {
    id: "supermarket",
    worldId: "france",
    name: { en: "Supermarket" },
    description: { en: "A grocery store aisle or checkout." },
  },
  {
    id: "bakery",
    worldId: "france",
    name: { en: "Bakery" },
    description: { en: "A boulangerie counter in the morning." },
  },
];
