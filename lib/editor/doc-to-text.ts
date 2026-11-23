// Turns the editor's content into plain text, so the AI wand can answer from the table and chart in the document.
export function docToText(nodes: any[] = []): string {
  return nodes.map(nodeToText).filter(Boolean).join('\n');
}

// Writes one block as text: a chart as label and value lines, a table as one line per row, anything else as its text.
function nodeToText(node: any): string {
  if (node.type === 'chart') {
    const labels: string[] = node.labels ?? [];
    const values: number[] = node.values ?? [];
    return labels.map((label, i) => `${label}: ${values[i] ?? 0}`).join('\n');
  }
  if (node.type === 'table') {
    return (node.children ?? [])
      .map((row: any) => (row.children ?? []).map(leafText).join(' | '))
      .join('\n');
  }
  return leafText(node);
}

// Joins the text inside a node, including text nested in cells and paragraphs.
function leafText(node: any): string {
  if (typeof node.text === 'string') return node.text;
  return (node.children ?? []).map(leafText).join('');
}