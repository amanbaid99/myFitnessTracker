/**
 * Parses the Sheet CSV, prints the flagged-rows report and writes
 * supabase/seed.sql.
 *
 *   pnpm seed:generate                  # uses lib/__fixtures__/upper-lower.csv
 *   pnpm seed:generate path/to/export.csv
 *   pnpm seed:generate --check          # CI: fail if seed.sql is out of date
 */
import { readFileSync, writeFileSync } from "node:fs";
import { formatReport, importSheet } from "../lib/sheet-import";
import { generateSeedSql } from "../lib/seed-sql";

const args = process.argv.slice(2);
const check = args.includes("--check");
const csvPath = args.find((a) => !a.startsWith("--")) ?? "lib/__fixtures__/upper-lower.csv";
const outPath = "supabase/seed.sql";

const result = importSheet(readFileSync(csvPath, "utf8"));
const sql = generateSeedSql(result, csvPath);

if (check) {
  let current = "";
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    // Missing counts as out of date.
  }
  if (current !== sql) {
    console.error(`${outPath} is out of date. Run \`pnpm seed:generate\` and commit it.`);
    process.exit(1);
  }
  console.log(`${outPath} is up to date.`);
} else {
  console.log(formatReport(result));
  writeFileSync(outPath, sql);
  console.log(`\nWrote ${outPath}.`);
}
