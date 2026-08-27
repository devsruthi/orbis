import type { PublicEvaluation } from "@/lib/client/api";

const SCORE_LABELS: { key: keyof Pick<
  PublicEvaluation,
  | "taskCompletion"
  | "grammar"
  | "vocabulary"
  | "communication"
  | "naturalness"
>; label: string }[] = [
  { key: "taskCompletion", label: "Task completion" },
  { key: "grammar", label: "Grammar" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "communication", label: "Communication" },
  { key: "naturalness", label: "Naturalness" },
];

export function EvaluationPanel({ evaluation }: { evaluation: PublicEvaluation }) {
  return (
    <section className="orbis-card flex flex-col gap-5 p-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl">Your evaluation</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {evaluation.summary}
        </p>
      </header>

      <div>
        <p className="text-sm uppercase tracking-wide text-zinc-500">
          Overall score
        </p>
        <p className="font-serif text-4xl font-medium sm:text-5xl">{evaluation.overallScore}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {SCORE_LABELS.map((item) => (
          <div key={item.key}>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              {item.label}
            </dt>
            <dd className="text-lg font-medium">{evaluation[item.key]}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="mb-1 text-sm font-semibold">What you did well</h3>
        {evaluation.strengths.length === 0 ? (
          <p className="text-sm text-zinc-500">No strengths listed.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {evaluation.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">What to improve</h3>
        {evaluation.weaknesses.length === 0 ? (
          <p className="text-sm text-zinc-500">No focus areas listed.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {evaluation.weaknesses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Mistakes</h3>
        {evaluation.mistakes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No specific mistakes were flagged.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {evaluation.mistakes.map((mistake, index) => (
              <li
                key={`${mistake.concept}-${index}`}
                className="rounded-2xl bg-[#efe6d6] p-3 text-sm dark:bg-zinc-800"
              >
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                  {mistake.category}
                  {mistake.recurring ? " · recurring" : ""}
                </p>
                <p>
                  <span className="font-medium">Original: </span>
                  {mistake.original}
                </p>
                <p>
                  <span className="font-medium">Correction: </span>
                  {mistake.correction}
                </p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {mistake.explanation}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Useful vocabulary</h3>
        {evaluation.usefulVocabulary.length === 0 ? (
          <p className="text-sm text-zinc-500">No extra vocabulary listed.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {evaluation.usefulVocabulary.map((item) => (
              <li key={item.term}>
                <span className="font-medium">{item.term}</span>
                {" — "}
                {item.meaningEn}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
