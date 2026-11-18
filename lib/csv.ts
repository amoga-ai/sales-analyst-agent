// lib/csv.ts: Saves CSV text as a file in the browser. The file name is the title in lower case, with dashes for spaces.
export function downloadCsv(title: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
