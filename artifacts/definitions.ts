// artifacts/definitions.ts: The list of artifact types the right panel can show. An artifact's type is worked out from the data it carries.
export type ArtifactKind = "report" | "sheet" | "pdf" | "html";

export const artifactDefinitions: { kind: ArtifactKind; label: string }[] = [
  { kind: "report", label: "Report" },
  { kind: "sheet", label: "Sheet" },
  { kind: "pdf", label: "PDF" },
  { kind: "html", label: "Document" },
];

// Works out the type from the data: a spec is a report, csv is a sheet, html is a document, and pdf is a PDF.
export function artifactKindOf(artifact: { spec?: unknown; csv?: string; html?: string; pdf?: boolean }): ArtifactKind | null {
  if (artifact.spec) return "report";
  if (artifact.csv !== undefined) return "sheet";
  if (artifact.html !== undefined) return "html";
  if (artifact.pdf) return "pdf";
  return null;
}