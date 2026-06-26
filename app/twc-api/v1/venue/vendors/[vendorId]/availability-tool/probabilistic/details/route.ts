export const dynamic = "force-dynamic";

// Mirrors /availability-tool/probabilistic/details/ — per-date availability
// detail shown when a date is selected in the calendar. Served locally.
function pad(n: number) {
  return String(n).padStart(2, "0");
}

export async function GET() {
  const out: Record<string, { showIsAvailable: boolean; countOfPeople: number }> = {};
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 545; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const seed = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % 17;
    out[key] = { showIsAvailable: seed !== 3 && seed !== 11, countOfPeople: 0 };
  }
  return Response.json(out);
}
