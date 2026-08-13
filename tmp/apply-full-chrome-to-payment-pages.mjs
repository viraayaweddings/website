import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const homepage = fs.readFileSync(path.join(root, "site-public/index.html"), "utf8");
const header = (homepage.match(/<header\b[\s\S]*?<\/header>/i) || [])[0];
const footer = (homepage.match(/<footer\b[\s\S]*?<\/footer>/i) || [])[0];

if (!header || !footer) {
  throw new Error("Could not extract homepage header/footer");
}

for (const file of [
  "site-public/appointment/payment-success/index.html",
  "site-public/appointment/payment-failed/index.html",
]) {
  const fullPath = path.join(root, file);
  let html = fs.readFileSync(fullPath, "utf8");
  html = html.replace(/<header\b[\s\S]*?<\/header>/i, header);
  if (/<footer\b/i.test(html)) {
    html = html.replace(/<footer\b[\s\S]*?<\/footer>/i, footer);
  } else {
    html = html.replace(/\s*<\/main>/i, `\n    ${footer}\n  </main>`);
  }
  fs.writeFileSync(fullPath, html);
  console.log(`updated ${file}`);
}
