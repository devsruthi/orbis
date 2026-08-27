export type AchievementState = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

export function learnerAchievements(input: {
  completedSessions: number;
  answeredReviews: number;
  streakDays: number;
}): AchievementState[] {
  return [
    {
      id: "first_scenario",
      title: "First conversation",
      description: "Complete your first scenario.",
      unlocked: input.completedSessions >= 1,
    },
    {
      id: "five_scenarios",
      title: "Five conversations",
      description: "Complete five practice sessions.",
      unlocked: input.completedSessions >= 5,
    },
    {
      id: "ten_reviews",
      title: "Ten reviews",
      description: "Finish ten quick reviews.",
      unlocked: input.answeredReviews >= 10,
    },
    {
      id: "seven_day_streak",
      title: "Seven-day streak",
      description: "Practice on seven days in a row.",
      unlocked: input.streakDays >= 7,
    },
  ];
}
