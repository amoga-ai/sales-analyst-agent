export function previousDay(timeZone = process.env.STORE_TIMEZONE ?? "America/Toronto") {
    // Testing only: set REVIEW_DATE=YYYY-MM-DD in .env.local to review a chosen day.
    const override = process.env.REVIEW_DATE;
    if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
        return { from: override, to: override };
    }

    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date()); // "YYYY-MM-DD"

    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    const day = d.toISOString().slice(0, 10);
    return { from: day, to: day };
}   
export function shiftDay(day: string, days: number) {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}