'use client';

// A pie chart block for the editor. It draws an SVG from the labels and values stored on the block, so no HTML from the model is rendered.
import * as React from 'react';

import type { PlateElementProps } from 'platejs/react';
import { PlateElement, useEditorRef } from 'platejs/react';
const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#64748b'];
export const TOP_CITY_TEST_DATA = {
    labels: ['Tokyo', 'Delhi', 'Shanghai', 'Dhaka', 'São Paulo', 'Mexico City', 'Beijing', 'Cairo', 'Mumbai', 'Osaka'],
    values: [37.1, 33.0, 29.9, 23.3, 22.6, 22.1, 21.8, 21.7, 21.4, 19.0],
};

const CX = 100;
const CY = 100;
const R = 90;

// Returns the SVG path for one slice, from angle start to angle end (radians).
function slicePath(start: number, end: number) {
    const x1 = CX + R * Math.cos(start);
    const y1 = CY + R * Math.sin(start);
    const x2 = CX + R * Math.cos(end);
    const y2 = CY + R * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

export function PieChartElement(props: PlateElementProps) {
    const editor = useEditorRef();
    const { labels = [], values = [] } = props.element as unknown as { labels?: string[]; values?: number[] };
    const total = values.reduce((sum, v) => sum + v, 0);

    // Saves one edited label or value back to this block, which redraws the chart.
    function update(index: number, field: 'label' | 'value', raw: string) {
        const nextLabels = [...labels];
        const nextValues = [...values];
        if (field === 'label') nextLabels[index] = raw;
        else nextValues[index] = Number(raw) || 0;
        editor.tf.setNodes({ labels: nextLabels, values: nextValues } as any, { at: props.path });
    }

    // Works out each slice's share and angles, starting at the top of the circle.
    let angle = -Math.PI / 2;
    const slices = values.map((value, i) => {
        const share = total ? value / total : 0;
        const start = angle;
        const end = angle + share * 2 * Math.PI;
        angle = end;
        return { label: labels[i] ?? `Item ${i + 1}`, share, path: slicePath(start, end), color: COLORS[i % COLORS.length] };
    });

    return (
        <PlateElement {...props}>
            <div contentEditable={false} className="my-4 flex flex-nowrap items-center gap-6">
                <svg viewBox="0 0 200 200" width={200} height={200} role="img" aria-label="Pie chart">
                    {slices.map((s, i) =>
                        s.share >= 0.9999 ? (
                            <circle key={i} cx={CX} cy={CY} r={R} fill={s.color} />
                        ) : (
                            <path key={i} d={s.path} fill={s.color} />
                        )
                    )}
                </svg>
                <ul className="space-y-1 text-sm">
                    {slices.map((s, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
                            <input
                                aria-label={`Label ${i + 1}`}
                                className="w-32 rounded border px-1 py-0.5"
                                value={s.label}
                                onChange={(e) => update(i, 'label', e.target.value)}
                            />
                            <input
                                aria-label={`Value ${i + 1}`}
                                type="number"
                                step="any"
                                className="w-24 rounded border px-1 py-0.5"
                                value={values[i] ?? 0}
                                onChange={(e) => update(i, 'value', e.target.value)}
                            />
                            <span className="w-14 text-right text-zinc-500">{(s.share * 100).toFixed(1)}%</span>
                        </li>
                    ))}
                </ul>
            </div>
            {props.children}
        </PlateElement>
    );
}