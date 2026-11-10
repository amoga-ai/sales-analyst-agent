import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { restRequest } from "@/lib/api/rest";
import { hashPassword } from "@/lib/auth/password";
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
    const fullName = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const mobile = String(body.mobile ?? "").trim();
    const password = String(body.password ?? "");
    const retype = body.retype_password;

    if (!fullName || !email.includes("@") || !mobile) {
      return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (retype !== undefined && retype !== password) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    let existing: unknown[];
    try {
      const check = await restRequest(
        `/user_catalog?user_email=eq.${encodeURIComponent(email)}&select=user_uuid&limit=1`
      );
      if (!check.ok) {
        console.error("Signup: email check failed with status", check.status);
        return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
      }
      existing = await check.json();
    } catch (err) {
      console.error("Signup: email check error:", errorMessage(err));
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }
    if (Array.isArray(existing) && existing.length) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    let res: Response;
    try {
      res = await restRequest("/user_catalog", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_uuid: randomUUID(),
          full_name: fullName,
          user_email: email,
          user_mobile: mobile,
          password: passwordHash,
          roles_json: ["All"],
        }),
      });
    } catch (err) {
      console.error("Signup: insert error:", errorMessage(err));
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }
    if (!res.ok) {
      // Log only the status and error code: the response body can echo the
      // failing row (including the password hash).
      const detail = await res.json().catch(() => ({}));
      console.error("Signup: insert failed with status", res.status, detail?.code ?? "");
      return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
    }

    const [row] = await res.json();
    await setSession({
      id: row.user_uuid,
      name: row.full_name,
      email: row.user_email,
      role: row.roles_json ?? ["All"],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Signup: unexpected error:", errorMessage(err));
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
