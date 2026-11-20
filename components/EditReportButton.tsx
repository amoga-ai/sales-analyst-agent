'use client';

// Pencil button that opens the editor for a report.
import { Pencil } from 'lucide-react';

export default function EditReportButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Edit report" className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100">
      <Pencil className="size-4" />
    </button>
  );
}