// lib/api/ids.ts: Checks IDs that come from the browser before they go into an upstream URL path, so a value like "../x" can't reach another endpoint.
// Letters, digits, "_", "-", "." and ":" only, and never just dots ("." or "..").
const SAFE_ID = /^(?!\.+$)[A-Za-z0-9_.:-]{1,128}$/;

export function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID.test(value);
}
