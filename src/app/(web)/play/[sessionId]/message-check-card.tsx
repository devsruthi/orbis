"use client";

import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "../../ui/page-header";
import type { PublicMessageCheck } from "@/lib/client/api";

const CATEGORY_LABEL: Record<PublicMessageCheck["issues"][number]["category"], string> = {
  spelling: "Spelling",
  grammar: "Grammar",
  tense: "Tense",
  word_order: "Word order",
  vocabulary: "Word choice",
};

export function MessageCheckIssues({
  issues,
}: {
  issues: PublicMessageCheck["issues"];
}) {
  if (issues.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-col gap-3">
      {issues.map((issue, index) => (
        <li
          key={`${issue.category}-${index}`}
          className="rounded-2xl bg-[#efe6d6] p-3 text-sm dark:bg-zinc-800"
        >
          <p className="mb-1 text-xs uppercase tracking-wide text-stone-500">
            {CATEGORY_LABEL[issue.category]}
          </p>
          <p>
            <span className="font-medium">{issue.original}</span>
            {" → "}
            <span className="font-medium">{issue.correction}</span>
          </p>
          <p className="mt-1 text-stone-600 dark:text-zinc-400">
            {issue.explanation}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function MessageCheckCard(props: {
  original: string;
  result: PublicMessageCheck;
  disabled?: boolean;
  onSendOriginal: () => void;
  onSendCorrection: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="orbis-card flex flex-col gap-3 p-4">
      <p className="text-sm font-medium text-stone-500">Before you send</p>
      <p className="font-serif text-lg leading-relaxed">“{props.original}”</p>
      <MessageCheckIssues issues={props.result.issues} />
      {props.result.corrected !== props.original ? (
        <p className="text-sm text-stone-600 dark:text-zinc-400">
          Suggested:{" "}
          <span className="font-medium text-foreground">
            {props.result.corrected}
          </span>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={props.onSendCorrection}
          disabled={props.disabled}
          className={PRIMARY_BUTTON}
        >
          Send correction
        </button>
        <button
          type="button"
          onClick={props.onSendOriginal}
          disabled={props.disabled}
          className={SECONDARY_BUTTON}
        >
          Send anyway
        </button>
        <button
          type="button"
          onClick={props.onEdit}
          disabled={props.disabled}
          className="min-h-11 rounded-full px-3 py-2 text-sm text-stone-500 underline"
        >
          Keep editing
        </button>
      </div>
    </div>
  );
}
