"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import ArtifactPanel from "@/components/ArtifactPanel";
import ExportPanel from "@/components/ExportPanel";
import { artifactDefinitions, artifactKindOf } from "@/artifacts/definitions";

type Artifact = { title: string; spec?: any; html?: string; csv?: string; kind?: "export" };
const OpenArtifactContext = createContext<((artifact: Artifact) => void) | null>(null);
export function useOpenArtifact() {
    return useContext(OpenArtifactContext);
}

function artifactKey(artifact: Artifact): string {
    const text = JSON.stringify([artifact.title, artifact.spec ?? null, artifact.html ?? null, artifact.csv ?? null]);
    let hash = 5381;
    for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
    return `${hash.toString(36)}-${text.length}`;
}

// Wraps a chat screen: the chat stays on the left, and the artifact panel opens on the right at half the window width.
export function ArtifactProvider({ children }: { children: ReactNode }) {
    const [artifact, setArtifact] = useState<Artifact | null>(null);
    const panelKey = useMemo(() => (artifact ? artifactKey(artifact) : ""), [artifact]);
    const [width, setWidth] = useState(() =>
        typeof window === "undefined" ? 640 : Math.round(window.innerWidth * 0.45),
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
                        {artifact.kind === "export" ? (
                            <ExportPanel
                                key={panelKey}
                                title={artifact.title}
                                spec={artifact.spec}
                                onClose={() => setArtifact(null)}
                                width={width}
                                onWidthChange={setWidth}
                            />
                        ) : (
                            <ArtifactPanel
                                key={panelKey}
                                title={artifact.title}
                                label={artifactDefinitions.find((d) => d.kind === artifactKindOf(artifact))?.label}
                                spec={artifact.spec}
                                html={artifact.html}
                                csv={artifact.csv}
                                onClose={() => setArtifact(null)}
                                width={width}
                                onWidthChange={setWidth}
                            />
                        )}
                    </>
                )}
            </div>
        </OpenArtifactContext.Provider>
    );
}

// A file-style row in the chat. The view button opens the panel. For the non-AI Eve agent (exportable), the panel shows the five file formats.
export function ReportCard({ spec, exportable = false }: { spec: any; exportable?: boolean }) {
    const [createdAt] = useState(() => new Date());
    const open = useOpenArtifact();
    const title: string = spec?.elements?.card?.props?.title ?? "Report";
    if (!open) return null;
    const openReport = () => open({ title, spec, kind: exportable ? "export" : undefined });
    return (
        <div className="group flex w-full max-w-2xl items-center gap-3 rounded-xl border border-zinc-300 bg-white p-3 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800">
            <button
                type="button"
                onClick={openReport}
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
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        Report · {createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                </span>
            </button>
            <button
                type="button"
                onClick={openReport}
                aria-label="View report"
                title="View report"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-zinc-600 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </button>
        </div>
    );
}