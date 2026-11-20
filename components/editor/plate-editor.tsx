'use client';

import { normalizeStaticValue, type Value } from 'platejs'; import { Plate, usePlateEditor } from 'platejs/react';
import { BasicNodesKit } from '@/components/editor/plugins/basic-nodes-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { TableKit } from '@/components/editor/plugins/table-kit';
import { MediaKit } from '@/components/editor/plugins/media-kit';
import { TooltipProvider } from '@/components/ui/tooltip';

export function PlateEditor({ initialValue, editorRef }: { initialValue?: Value; editorRef?: { current: any } }) {
  const editor = usePlateEditor({
    plugins: [...BasicNodesKit, ...TableKit, ...MediaKit],
    value: initialValue ?? value
  });
  if (editorRef) editorRef.current = editor;
  return (
    <TooltipProvider>
      <Plate editor={editor}>
        <EditorContainer>
          <Editor variant="demo" placeholder="Type..." />
        </EditorContainer>
      </Plate>
    </TooltipProvider>
  );
}

const value = normalizeStaticValue([
  {
    children: [{ text: 'Basic Editor' }],
    type: 'h1',
  },
  {
    children: [{ text: 'Heading 2' }],
    type: 'h2',
  },
  {
    children: [{ text: 'Heading 3' }],
    type: 'h3',
  },
  {
    children: [
      {
        children: [{ text: 'This blockquote contains more than one block.' }],
        type: 'p',
      },
      {
        children: [
          {
            text: 'It can also wrap nested quotes instead of flattening them.',
          },
        ],
        type: 'p',
      },
      {
        children: [
          {
            children: [
              {
                text: 'Nested blockquotes keep the quote hierarchy intact.',
              },
            ],
            type: 'p',
          },
        ],
        type: 'blockquote',
      },
    ],
    type: 'blockquote',
  },
  {
    children: [
      { text: 'Basic marks: ' },
      { bold: true, text: 'bold' },
      { text: ', ' },
      { italic: true, text: 'italic' },
      { text: ', ' },
      { text: 'underline', underline: true },
      { text: ', ' },
      { strikethrough: true, text: 'strikethrough' },
      { text: '.' },
    ],
    type: 'p',
  },
]);
