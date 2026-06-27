export const dynamic = "force-dynamic";

// Mirrors /availability-tool/probabilistic/ — date -> demand status. The live
// source is a private demand model; this serves a stable local equivalent so
// the original calendar component renders/behaves identically, fully offline.
function pad(n: number) {
  return String(n).padStart(2, "0");
}

function demandFor(d: Date): { isAuspicious: boolean; occasionName: string | null; availabilityStatus: string } {
  const dow = d.getDay();
  const dom = d.getDate();
  const month = d.getMonth();
  const seed = (d.getFullYear() * 372 + month * 31 + dom) % 17;
  const weddingSeason = month >= 9 || month <= 2; // Oct–Mar
  const weekend = dow === 0 || dow === 5 || dow === 6;
  let availabilityStatus = "low_demand";
  if (seed === 3 || seed === 11) availabilityStatus = "fully_booked";
  else if (weekend && weddingSeason) availabilityStatus = "peak_demand";
  else if (weekend || weddingSeason) availabilityStatus = "high_demand";
  const isAuspicious = seed === 5 || seed === 13;
  return { isAuspicious, occasionName: isAuspicious ? "Auspicious Day" : null, availabilityStatus };
}

export async function GET() {
  const out: Record<string, ReturnType<typeof demandFor>> = {};
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 545; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    out[key] = demandFor(d);
  }
  return Response.json(out, {
    headers: {
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow, noarchive"
    }
  });
}
