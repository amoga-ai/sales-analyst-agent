export function rangeFor(key: string): { from: string; to: string } | null {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (yr: number, mo: number, day: number) =>
    `${yr}-${pad(mo + 1)}-${pad(day)}`;
  const today = iso(y, m, now.getUTCDate());

  if (key === "all_time") return { from: "2000-01-01", to: today };
  if (key === "this_month") return { from: iso(y, m, 1), to: today };
  if (key === "last_month") {
    const py = m === 0 ? y - 1 : y;
    const pm = m === 0 ? 11 : m - 1;
    const lastDay = new Date(Date.UTC(py, pm + 1, 0)).getUTCDate();
    return { from: iso(py, pm, 1), to: iso(py, pm, lastDay) };
  }
  if (key === "this_year") return { from: iso(y, 0, 1), to: today };
  return null;
}