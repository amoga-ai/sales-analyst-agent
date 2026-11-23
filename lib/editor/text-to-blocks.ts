// Turns a chat reply's text into editor blocks: markdown table lines become a table, and every other non-empty line becomes a paragraph.

// Builds one table cell holding a single paragraph of text.
function cell(text: string) {
  return { type: "td", children: [{ type: "p", children: [{ text }] }] };
}

// Removes the ** marks for bold, since the editor keeps the text plain here.
function plain(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1");
}

export function textToBlocks(text: string | undefined): any[] {
  if (!text?.trim()) return [];
  const lines = text.split("\n");
  const blocks: any[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => plain(c.trim()));
        // Skips the |---|---| separator line.
        if (!cells.every((c) => /^:?-{3,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push({ type: "table", children: rows.map((r) => ({ type: "tr", children: r.map((c) => cell(c)) })) });
      continue;
    }
    if (line) blocks.push({ type: "p", children: [{ text: plain(line) }] });
    i++;
  }
  return blocks;
}