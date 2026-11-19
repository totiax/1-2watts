/**
 * Exporta el equipo desde la base de People a data/roster.json.
 * Solo lee: empleados ACTIVE u ON_LEAVE sin borrar del área pedida, con su mail
 * de login y el de trabajo.
 *
 *   PEOPLE_DATABASE_URL=postgres://… npm run roster -- "Tecnología"
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { memberIdFor } from "./member-id";

const area = process.argv[2] ?? "Tecnología";

const url = process.env.PEOPLE_DATABASE_URL;
if (!url) {
  console.error("Falta PEOPLE_DATABASE_URL (ver .env.example).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("SET TRANSACTION READ ONLY").catch(() => {});
  const { rows } = await client.query<{
    id: string;
    first_name: string;
    last_name: string;
    nickname: string | null;
    login_email: string | null;
    work_email: string | null;
  }>(`
    SELECT e.id, e.first_name, e.last_name, e.nickname,
           u.email      AS login_email,
           c.work_email AS work_email
    FROM employees e
    LEFT JOIN users u ON u.employee_id = e.id AND u.deleted_at IS NULL AND u.is_active
    LEFT JOIN employee_contacts c ON c.employee_id = e.id
    JOIN employee_work w ON w.employee_id = e.id
    JOIN departments d ON d.id = w.department_id AND d.deleted_at IS NULL
    WHERE e.deleted_at IS NULL AND e.status IN ('ACTIVE', 'ON_LEAVE') AND d.name = $1
    ORDER BY e.first_name, e.last_name
  `, [area]);

  const roster = rows
    .map((r) => ({
      emails: [...new Set([r.login_email, r.work_email].filter(Boolean).map((e) => e!.trim().toLowerCase()))],
      firstName: r.first_name,
      lastName: r.last_name,
      nickname: r.nickname,
    }))
    .filter((m) => m.emails.length > 0)
    // El id sale del mail principal, igual que en roster-from-seed: no cambia entre exportaciones.
    .map((m) => ({ id: memberIdFor(m.emails[0]), ...m }));

  const out = path.join(process.cwd(), "data", "roster.json");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(roster, null, 2) + "\n");
  console.log(`Listo: ${roster.length} personas de "${area}" en data/roster.json (${rows.length - roster.length} sin mail quedaron afuera).`);
} finally {
  await client.end();
}
