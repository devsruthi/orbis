import { createDefaultLearner } from "@/lib/server/conversation/learner";
import { getPersistence } from "@/lib/server/persistence";
import { DEFAULT_CEFR_LEVEL } from "@/lib/shared/learning-options";
import { createId } from "@/lib/shared/ids";
import type { LearnerProfile } from "@/lib/shared/models";
import { getAuthAccount, saveAuthAccount } from "./accounts";

export type SyncLearnerInput = {
  providerAccountId: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  localLearnerId?: string | null;
};

export type SyncLearnerResult = {
  learnerId: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export async function syncLearnerForAuthUser(
  input: SyncLearnerInput,
): Promise<SyncLearnerResult> {
  const store = getPersistence();
  const now = new Date().toISOString();
  const existingAccount = await getAuthAccount(input.providerAccountId);

  let learnerId =
    existingAccount?.learnerId ??
    input.localLearnerId ??
    createId();

  let learner = await store.getLearner(learnerId);
  if (!learner && !existingAccount && !input.localLearnerId) {
    learner = await store.createLearner(
      createDefaultLearner({
        id: learnerId,
        targetLanguage: "de",
        cefrLevel: DEFAULT_CEFR_LEVEL,
        worldId: "germany",
      }),
    );
  } else if (learner) {
    learner = await store.saveLearner(
      applyAuthProfile(learner, input, now),
    );
  }

  await saveAuthAccount(input.providerAccountId, {
    learnerId,
    email: input.email ?? undefined,
    name: input.name ?? undefined,
    image: input.image ?? undefined,
    updatedAt: now,
  });

  const displayName =
    input.name?.trim() ||
    learner?.displayName?.trim() ||
    existingAccount?.name?.trim() ||
    null;

  return {
    learnerId,
    name: displayName,
    email: input.email?.trim() || learner?.email?.trim() || null,
    image: input.image?.trim() || learner?.image?.trim() || null,
  };
}

function applyAuthProfile(
  learner: LearnerProfile,
  input: SyncLearnerInput,
  updatedAt: string,
): LearnerProfile {
  return {
    ...learner,
    displayName: input.name?.trim() || learner.displayName,
    email: input.email?.trim() || learner.email,
    image: input.image?.trim() || learner.image,
    authProviderId: input.providerAccountId,
    updatedAt,
  };
}
