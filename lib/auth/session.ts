import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export type SessionUser = { id: string; name: string; email: string; role: string[] };

const COOKIE = "session";
const WEEK = 7 * 24 * 3600;

function sign(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is missing");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function setSession(user: SessionUser) {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + WEEK * 1000 })
  ).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set to true once the site uses HTTPS
    path: "/",
    maxAge: WEEK,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const good = sign(payload);
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) {
    return null;
  }
  const { exp, ...user } = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (exp < Date.now()) return null;
  return user as SessionUser;
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}