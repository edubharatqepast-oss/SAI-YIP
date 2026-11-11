import { readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "js");
let total = 0;
function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (p.endsWith(".js")) total += s.size;
  }
}
walk(root);
const kb = total / 1024;
console.log("JS total KB: " + kb.toFixed(1));
if (kb > 140) {
  console.error("budget exceeded: >140KB source (prod main must stay <36KB)");
  process.exit(1);
}
console.log("budget ok");
