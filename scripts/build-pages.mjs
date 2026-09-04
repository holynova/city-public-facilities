import { cp, writeFile } from "node:fs/promises";

await cp("dist", "docs", { recursive: true, force: true });
await writeFile("docs/.nojekyll", "", "utf8");
console.log("Copied the unified dist/ artifact to docs/ for GitHub Pages.");
