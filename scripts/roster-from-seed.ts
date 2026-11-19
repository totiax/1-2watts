/**
 * Arma data/roster.json a partir del seed de People (prisma/seed.ts), sin tocar la base.
 * Solo toma nombre, apodo y mail de la gente del área pedida.
 *
 *   npm run roster:seed -- ../people/backend-people/prisma/seed.ts "Tecnología"
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { memberIdFor } from "./member-id";

const [seedPath = "../people/backend-people/prisma/seed.ts", area = "Tecnología"] = process.argv.slice(2);

const source = readFileSync(path.resolve(seedPath), "utf8");
const field = (row: string, key: string) => row.match(new RegExp(`${key}: '([^']*)'`))?.[1]?.trim() ?? "";

const rows = source.split("\n").filter((l) => l.includes("cuil:") && l.includes(`department: '${area}'`));

const roster = rows
  .map((row) => {
    const email = field(row, "email").toLowerCase();
    return {
      id: memberIdFor(email),
      emails: [email],
      firstName: field(row, "firstName"),
      lastName: field(row, "lastName"),
      nickname: field(row, "nickname") || null,
    };
  })
  .filter((m) => m.emails[0].includes("@"))
  .sort((a, b) => a.firstName.localeCompare(b.firstName, "es"));

const out = path.join(process.cwd(), "data", "roster.json");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(roster, null, 2) + "\n");
console.log(`Listo: ${roster.length} personas de "${area}" en data/roster.json`);
