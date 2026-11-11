import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string().describe("Card heading") }),
      description: "A bordered panel with a heading and child elements",
    },
    Grid: {
      props: z.object({
        columns: z.number().describe("Number of columns on wide screens: 2, 3 or 4"),
      }),
      description: "Lays out child elements in a responsive grid",
    },
    Text: {
      props: z.object({ content: z.string() }),
      description: "A line of secondary text",
    },
    Button: {
      props: z.object({ label: z.string(), actionId: z.string() }),
      description: "A clickable button",
    },
    MetricCard: {
      props: z.object({ label: z.string(), value: z.string() }),
      description: "A labeled key number",
    },
    Table: {
      props: z.object({
        title: z.string(),
        columns: z.array(z.string()),
        rows: z.array(z.array(z.string())),
      }),
      description: "A table with column headers and rows of text",
    },
    BarChart: {
      props: z.object({
        title: z.string(),
        labels: z.array(z.string()),
        values: z.array(z.number()),
      }),
      description: "A horizontal bar chart with one bar per label",
    },
    DonutChart: {
      props: z.object({
        title: z.string(),
        labels: z.array(z.string()),
        values: z.array(z.number()),
      }),
      description: "A donut chart with a legend, one slice per label",
    },
    ScatterChart: {
      props: z.object({
        title: z.string(),
        points: z.array(z.object({ x: z.number(), y: z.number() })),
      }),
      description: "A scatter plot with one dot per point",
    },
      StoryCard: {
      props: z.object({
        title: z.string(),
        text: z.string(),
      }),
      description: "A story card with a title and paragraphs of narrative text",
    },
  },
  actions: {},
});