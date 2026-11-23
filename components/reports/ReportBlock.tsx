"use client";

// Shows a report in a chat: the report drawn with json-render, then a card that opens the report and the reply's text in the editor panel. Any agent can use it.
import { JSONUIProvider, Renderer } from "@json-render/react";
import { ReportCard } from "@/components/ArtifactProvider";
import { registry } from "@/lib/json-render/registry";

export function ReportBlock({ spec, text, suggestions }: { spec: any; text?: string; suggestions?: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <JSONUIProvider registry={registry}>
          <Renderer spec={spec as any} registry={registry} />
        </JSONUIProvider>
      </div>
      <ReportCard spec={spec} text={text} suggestions={suggestions} editable />
    </div>
  );
}