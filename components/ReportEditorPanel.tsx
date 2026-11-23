'use client';

// Side panel for one report: the editor with format buttons, and a preview of each exported file with a Download button.
import { useEffect, useRef, useState } from 'react';
import { PlateEditor } from '@/components/editor/plate-editor';
import type { FormatId } from '@/components/FormatButtons';
import { reportToPlateValue } from '@/lib/editor/report-to-plate';
import { textToBlocks } from '@/lib/editor/text-to-blocks';
import { plateToReport } from '@/lib/editor/plate-to-report';
import { WandSuggestionsContext } from '@/lib/editor/wand-suggestions';

type SavedFile = { id: string; fileName: string };

// Shows one exported file inline: PDF in a frame, Word/Excel/PPT from the preview route, CSV as text.
function FilePreview({ file }: { file: SavedFile }) {
  const ext = file.fileName.split('.').pop()?.toLowerCase();
  const [html, setHtml] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    // Loads the preview for this file when it changes.
    setHtml(null);
    setText(null);
    if (ext === 'xlsx' || ext === 'docx' || ext === 'pptx') {
      fetch(`/api/documents/${file.id}/preview`).then((r) => r.text()).then(setHtml);
    } else if (ext === 'csv') {
      fetch(`/api/documents/${file.id}`).then((r) => r.text()).then(setText);
    }
  }, [file.id, ext]);

  if (ext === 'pdf') {
    return <iframe title={file.fileName} src={`/api/documents/${file.id}?inline=1`} className="h-full w-full" />;
  }
  if (html !== null) {
    return <iframe title={file.fileName} srcDoc={html} sandbox="allow-scripts" className="h-full w-full bg-white" />;
  }
  if (text !== null) {
    return <pre className="whitespace-pre-wrap p-4 text-xs">{text}</pre>;
  }
  return <p className="p-4 text-sm text-zinc-500">Loading preview…</p>;
}

export default function ReportEditorPanel({ title, spec, text, suggestions = [], nonce, onClose }: { title: string; spec: any; text?: string; suggestions?: string[]; nonce?: number; onClose: () => void }) {  // Builds the starting content once, and keeps a handle on the editor for export.
  const [initialValue] = useState(() => {
    const [heading, ...rest] = reportToPlateValue(spec);
    return [heading, ...textToBlocks(text), ...rest, { type: 'p', children: [{ text: '' }] }];
  });
  const editorRef = useRef<any>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  useEffect(() => {
    setView('edit');
  }, [nonce]);
  const [file, setFile] = useState<SavedFile | null>(null);

  // Exports the editor's current content in the chosen format, then shows its preview.
  async function exportAs(format: FormatId) {
    if (busy || !editorRef.current) return;
    setBusy(true);
    try {
      const report = plateToReport(editorRef.current.children);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, template: 'daily-review', ...report }),
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const saved = await res.json();
      setFile({ id: saved.id, fileName: saved.fileName });
      setView('preview');
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <span className="text-sm font-medium">Edit: {title}</span>
        <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-900">
          Close
        </button>
      </div>

      {file && (
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="ml-auto flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setView('edit')}
              className={view === 'edit' ? 'font-medium text-zinc-900' : 'text-zinc-500'}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setView('preview')}
              className={view === 'preview' ? 'font-medium text-zinc-900' : 'text-zinc-500'}
            >
              Preview
            </button>
            {view === 'preview' && (
              // Downloads the file being previewed
              <a href={`/api/documents/${file.id}`} download={file.fileName} className="rounded-md border px-3 py-1 hover:bg-zinc-50">
                Download
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {/* The editor stays mounted while the preview shows, so edits are kept */}
        <div className={view === 'edit' ? 'h-full overflow-y-auto p-4' : 'hidden'}>
          <WandSuggestionsContext.Provider value={suggestions}>
            <PlateEditor initialValue={initialValue as any} editorRef={editorRef} />
        </WandSuggestionsContext.Provider>
        </div>
        {view === 'preview' && file && (
          <div className="h-full">
            <FilePreview file={file} />
          </div>
        )}
      </div>
    </div>
  );
}