import { start } from "workflow/api";
import { helloWorkflow } from "@/workflows/hello";

export async function POST(req: Request) {
  const { name } = await req.json();
  await start(helloWorkflow, [name]);
  return Response.json({ started: true });
}