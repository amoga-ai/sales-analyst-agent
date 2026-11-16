// components/ApprovalCard.tsx: Approval request with one button per option, shared by the chat screens.
"use client";

export type ApprovalData = {
  requestId: string;
  prompt: string;
  purpose: string;
  options: { id: string; label: string }[];
};

// Shows the approval request with one button per option.
export default function ApprovalCard({
  data,
  answeredWith,
  disabled,
  onAnswer,
}: {
  data: ApprovalData;
  answeredWith?: string;
  disabled: boolean;
  onAnswer: (requestId: string, optionId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">This query is expensive and needs your approval.</p>
      {data.purpose && <p className="mt-1 text-zinc-700 dark:text-zinc-300">{data.purpose}</p>}
      {answeredWith ? (
        <p className="mt-3 text-xs text-zinc-500">Answered: {answeredWith}</p>
      ) : (
        <div className="mt-3 flex gap-2">
          {data.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer(data.requestId, option.id)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-zinc-800 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}