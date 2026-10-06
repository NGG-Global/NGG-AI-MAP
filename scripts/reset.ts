import fs from "node:fs";
import path from "node:path";

/** Deletes the local PGlite data directory. Refuses to run when DATABASE_URL points at a server. */
const url = process.env.DATABASE_URL?.trim();
if (url) {
  console.error("DATABASE_URL is set; reset only supports the local PGlite database.");
  process.exit(1);
}
const dir = path.join(process.cwd(), ".data", "pglite");
fs.rmSync(dir, { recursive: true, force: true });
console.log(`Removed ${dir}. Run \`npm run db:seed\` to recreate demo data.`);
