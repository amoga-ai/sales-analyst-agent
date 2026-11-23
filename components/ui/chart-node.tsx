'use client';

// Editable bar chart block for the editor. Vertical bars drawn from the labels and values stored on the block, using the same colors as the chat charts.
import type { PlateElementProps } from 'platejs/react';

import { PlateElement, useEditorRef } from 'platejs/react';

const COLORS = ['#7c3aed', '#db2777', '#0891b2', '#f59e0b', '#16a34a', '#dc2626', '#64748b'];

export function ChartElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const { labels = [], values = [] } = props.element as unknown as {
    labels?: string[];
    values?: number[];
  };
  const maxValue = Math.max(1, ...values);

  // Saves one edited label or value back to this block, which redraws the bars.
  function update(index: number, field: 'label' | 'value', raw: string) {
    const nextLabels = [...labels];
    const nextValues = [...values];
    if (field === 'label') nextLabels[index] = raw;
    else nextValues[index] = Number(raw) || 0;
    editor.tf.setNodes({ labels: nextLabels, values: nextValues } as any, { at: props.path });
  }

  // Inputs look like plain text until they are clicked.
  const plainField = 'bg-transparent outline-none rounded px-1 focus:bg-zinc-100 dark:focus:bg-zinc-800';

  return (
    <PlateElement {...props}>
      <div contentEditable={false} className="my-6">
        <div className="flex items-end justify-around gap-4 px-2">
          {labels.map((label, i) => {
            const value = values[i] ?? 0;
            return (
              <div key={i} className="flex w-28 flex-col items-center gap-2">
                <input
                  aria-label={`Value ${i + 1}`}
                  type="number"
                  step="any"
                  className={`w-20 text-center text-sm font-medium tabular-nums ${plainField}`}
                  value={value}
                  onChange={(e) => update(i, 'value', e.target.value)}
                />
                <div className="flex h-40 w-full items-end">
                  <div
                    className="w-full rounded-t-md"
                    style={{ height: `${(value / maxValue) * 100}%`, background: COLORS[i % COLORS.length] }}
                  />
                </div>
                <input
                  aria-label={`Label ${i + 1}`}
                  className={`w-full text-center text-xs text-zinc-600 dark:text-zinc-400 ${plainField}`}
                  value={label}
                  onChange={(e) => update(i, 'label', e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>
      {props.children}
    </PlateElement>
  );
}