export async function restRequest(path: string, init: RequestInit = {}) {
  const base = process.env.API_BASE_URL;
  const token = process.env.API_TOKEN;
  if (!base || !token) {
    // Name the missing variables only; never include their values.
    const missing = [!base && "API_BASE_URL", !token && "API_TOKEN"].filter(Boolean).join(", ");
    throw new Error(`API settings are missing: ${missing}. Set them in the environment (e.g. .env.local).`);
  }

  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}
