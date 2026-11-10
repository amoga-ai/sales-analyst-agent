import { NextResponse } from "next/server";
import { restRequest } from "@/lib/api/rest";
import { verifyPassword } from "@/lib/auth/password";
import { setSession } from "@/lib/auth/session";

const UNAVAILABLE = "The account service is unavailable. Please try again.";

// Log only the error message, never the request body, passwords or tokens.
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    let rows: { user_uuid: string; full_name: string; user_email: string; password: string | null; roles_json: string[] | null }[];
    try {
      const res = await restRequest(
        `/user_catalog?user_email=eq.${encodeURIComponent(email)}&select=user_uuid,full_name,user_email,password,roles_json&limit=1`
      );
      if (!res.ok) {
        console.error("Login: user lookup failed with status", res.status);
        return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
      }
      rows = await res.json();
    } catch (err) {
      console.error("Login: user lookup error:", errorMessage(err));
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }
    const user = Array.isArray(rows) ? rows[0] : undefined;

    if (!user || !user.password || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    await setSession({
      id: user.user_uuid,
      name: user.full_name,
      email: user.user_email,
      role: user.roles_json ?? ["All"],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Login: unexpected error:", errorMessage(err));
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
