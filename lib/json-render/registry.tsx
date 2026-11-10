"use client";

import { defineRegistry } from "@json-render/react";
import { catalog } from "./catalog";

const gridCols: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold tracking-tight">{props.title}</h3>
        <div className="mt-5 flex flex-col gap-6">{children}</div>
      </section>
    ),
    Grid: ({ props, children }) => (
      <div className={`grid grid-cols-1 gap-4 ${gridCols[props.columns] ?? gridCols[2]}`}>
        {children}
      </div>
    ),
    Text: ({ props }) => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{props.content}</p>
    ),
    Button: ({ props, emit }) => (
      <button
        data-action-id={props.actionId}
        onClick={() => emit("press")}
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:border-zinc-500 dark:border-zinc-700"
      >
        {props.label}
      </button>
    ),
    MetricCard: ({ props }) => (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {props.label}
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{props.value}</p>
      </div>
    ),
    Table: ({ props }) => (
      <div>
        {props.title && (
          <h4 className="mb-3 text-sm font-semibold">{props.title}</h4>
        )}
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950">
              <tr>
                {props.columns.map((c, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 ${
                      i > 0 ? "text-right" : "text-left"
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {props.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 capitalize tabular-nums ${
                        i > 0 ? "text-right" : ""
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
    BarChart: ({ props }) => {
      const max = Math.max(1, ...props.values);
      return (
        <div>
          {props.title && (
            <h4 className="mb-3 text-sm font-semibold">{props.title}</h4>
          )}
          <div className="flex flex-col gap-3">
            {props.labels.map((label, i) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <span className="w-28 shrink-0 capitalize text-zinc-600 dark:text-zinc-400">
                  {label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-100"
                    style={{ width: `${(props.values[i] / max) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right font-medium tabular-nums">
                  {props.values[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    },
  },
});