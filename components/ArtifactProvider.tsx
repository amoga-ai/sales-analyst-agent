// components/ArtifactProvider.tsx: Shared artifact panel. ArtifactProvider puts the panel on the right of any chat screen, starting at half the window width. ReportCard shows a file-style row in the chat.
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import ArtifactPanel, { specToCsv } from "@/components/ArtifactPanel";

// An artifact is either a report (spec) or an HTML document (html).
type Artifact = { title: string; spec?: any; html?: string };

// Lets any card open an artifact in the panel.
const OpenArtifactContext = createContext<((artifact: Artifact) => void) | null>(null);

// Returns the function that opens an artifact in the panel, or null outside a provider.
export function useOpenArtifact() {
    return useContext(OpenArtifactContext);
}

// Wraps a chat screen: the chat stays on the left, and the artifact panel opens on the right at half the window width.
export function ArtifactProvider({ children }: { children: ReactNode }) {
    const [artifact, setArtifact] = useState<Artifact | null>(null);
    // Panel width in pixels. Starts at half the window, then follows the drag handle.
    const [width, setWidth] = useState(() =>
        typeof window === "undefined" ? 640 : Math.round(window.innerWidth / 2),
    );
    return (
        <OpenArtifactContext.Provider value={setArtifact}>
            <div className="flex">
                <div className="min-w-0 flex-1">{children}</div>
                {artifact && (
                    <>
                        <div
                            aria-hidden="true"
                            onClick={() => setArtifact(null)}
                            className="fixed inset-0 z-40 bg-black/40 md:hidden"
                        />
                        <ArtifactPanel
                            title={artifact.title}
                            spec={artifact.spec}
                            html={artifact.html}
                            onClose={() => setArtifact(null)}
                            width={width}
                            onWidthChange={setWidth}
                        />
                    </>
                )}
            </div>
        </OpenArtifactContext.Provider>
    );
}

// Saves the report as a CSV file, straight from the chat card.
function downloadCsv(title: string, spec: any) {
    const blob = new Blob([specToCsv(spec)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// A file-style row in the chat with a view button (opens the panel) and a download button.
export function ReportCard({ spec }: { spec: any }) {
    const [createdAt] = useState(() => new Date());
    const open = useOpenArtifact();
    const title: string = spec?.elements?.card?.props?.title ?? "Report";
    if (!open) return null;
    return (
        <div className="group flex w-full max-w-md items-center gap-3 rounded-xl border border-zinc-300 bg-white p-3 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800">
            <button
                type="button"
                onClick={() => open({ title, spec })}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18" />
                        <path d="M3 15h18" />
                        <path d="M9 3v18" />
                    </svg>
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">Report · CSV · {createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                </span>
            </button>
            <button
                type="button"
                onClick={() => open({ title, spec })}
                aria-label="View report"
                title="View report"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-zinc-600 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </button>
            <button
                type="button"
                onClick={() => downloadCsv(title, spec)}
                aria-label="Download CSV"
                title="Download CSV"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-zinc-600 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                </svg>
            </button>
        </div>
    );
}