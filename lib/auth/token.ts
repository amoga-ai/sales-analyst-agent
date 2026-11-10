import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "session";

export function verifySessionToken(raw: string | undefined) {
  if (!raw) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;

  const good = createHmac("sha256", secret).update(payload).digest("base64url");
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) {
    return null;
  }

  const { exp, ...user } = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (exp < Date.now()) return null;
  return user;
}