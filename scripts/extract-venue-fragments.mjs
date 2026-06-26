import fs from "node:fs";
const h = fs.readFileSync("data/venues/captured-venue-detail.html","utf8");
const main = h.slice(h.indexOf("<main"), h.indexOf('id="footer_section"'));

// Balanced-element slice using plain indexOf scanning (no regex escaping pitfalls).
function sliceEl(s, start){
  const tag = s.slice(start+1).match(/^[a-zA-Z0-9]+/)[0];
  const open = "<" + tag;
  const close = "</" + tag;
  let i = s.indexOf(">", start) + 1;
  let depth = 1;
  while (i < s.length && depth > 0){
    const no = s.indexOf(open, i);
    const nc = s.indexOf(close, i);
    if (nc === -1) return null;
    if (no !== -1 && no < nc){
      // ensure it's a real tag start: next char is space, > or /
      const ch = s[no + open.length];
      if (ch === " " || ch === ">" || ch === "\t" || ch === "\n" || ch === "/") { depth++; i = no + open.length; }
      else { i = no + open.length; }
    } else {
      depth--;
      i = s.indexOf(">", nc) + 1;
    }
  }
  return s.slice(start, i);
}
function byAnchor(anchor){ const i=main.indexOf(anchor); if(i<0) throw new Error("MISS "+anchor.slice(0,40)); return sliceEl(main, i); }

const frag = {};
function iconBefore(labelText){
  const li = main.indexOf(`>${labelText}</label>`);
  const svgStart = main.lastIndexOf("<svg", main.lastIndexOf("<label", li));
  return sliceEl(main, svgStart);
}
frag.ICON_PER_PLATE = iconBefore("PER PLATE");
frag.ICON_SEATING   = iconBefore("SEATING");
frag.ICON_ROOMS     = iconBefore("ROOMS");
frag.ICON_PARKING   = iconBefore("parking");
frag.ICON_PER_DAY   = iconBefore("PER DAY");
{ const aa = main.indexOf('id="area-available"'); frag.AREA_ICON = sliceEl(main, main.indexOf("<svg", aa)); }
{
  const card = main.indexOf("Oodles Chattarpur");
  frag.SIM_STAR = sliceEl(main, main.indexOf("<svg", main.indexOf('<div class="flex gap-2">', card)));
  frag.SIM_PIN  = sliceEl(main, main.indexOf("<svg", main.indexOf('<div class="flex space-x-1">', card)));
  const metaDiv = main.indexOf('<div class="flex gap-3">', card);
  frag.SIM_PLATE = sliceEl(main, main.indexOf("<svg", metaDiv));
  frag.SIM_GUEST = sliceEl(main, main.indexOf("<svg", main.indexOf("</svg>", metaDiv)));
}
frag.QUOTE_FORM = byAnchor('<div class="relative w-full max-w-[420px] text-primaryTextColor xs:h-[440px]');
frag.CALENDAR   = byAnchor('<section class="flex flex-col justify-between gap-y-8 bg-[#F6F2FF]');
frag.LOCK       = byAnchor('<div class="flex w-full flex-col px-6 py-8 text-white lg:flex-row lg:items-center lg:justify-between lg:px-20 lg:py-14" style="background-color:#3D2A5E">');
{
  const start = main.indexOf('<section class="mx-auto grid max-w-screen-2xl grid-cols-2 gap-6 bg-lightestPurple');
  const nearby = main.indexOf('Explore nearby venues');
  frag.WHYSTOP_TO_PLANNER = main.slice(start, main.lastIndexOf("<section", nearby));
}

const report={}; for(const k of Object.keys(frag)) report[k]= frag[k]? frag[k].length : "NULL";
console.log(JSON.stringify(report,null,1));
for(const k of Object.keys(frag)) if(!frag[k]) throw new Error("NULL fragment "+k);

let ts = "// AUTO-EXTRACTED from data/venues/captured-venue-detail.html — exact live markup.\n// Regenerate via: node scripts/extract-venue-fragments.mjs\n/* eslint-disable */\n\n";
for(const k of Object.keys(frag)) ts += `export const ${k} = ${JSON.stringify(frag[k])};\n\n`;
fs.writeFileSync("app/lib/venue-detail-fragments.ts", ts);
console.log("WROTE app/lib/venue-detail-fragments.ts", ts.length, "bytes");
