/**
 * Datos de prueba para ver el inicio lleno: fotos de Pexels, selfies,
 * respuestas y "enchufados". Nunca toca a quien ya cargó cosas de verdad.
 *
 *   npm run demo                      → carga a todos menos los dos primeros del roster
 *   npm run demo -- --pending a@x,b@x → deja sin cargar a esos mails
 *   npm run demo -- clear             → borra todo lo que cargó este script
 *
 * Las fotos salen de storage/demo/pexels, por prefijo: m- mascota, f- fiesta,
 * v- viaje, e- escrache, s- selfie.
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { migrate } from "../src/lib/schema";
import { memberIdFor } from "./member-id";

type Member = { id: string; emails: string[]; firstName: string; nickname: string | null };

const ROOT = process.cwd();
const STORAGE = path.join(ROOT, "storage");
const UPLOADS = path.join(STORAGE, "uploads");
const SRC = path.join(STORAGE, "demo", "pexels");

// El mismo orden que la app: data/equipo.json, data/roster.json o el ejemplo.
type EquipoEntry = { email: string | string[]; nombre: string; apodo?: string | null };
const fromEquipo = (file: string): Member[] =>
  (JSON.parse(readFileSync(file, "utf8")) as EquipoEntry[]).map((e) => {
    const emails = (Array.isArray(e.email) ? e.email : [e.email]).map((m) => m.trim().toLowerCase());
    return { id: memberIdFor(emails[0]), emails, firstName: e.nombre, nickname: e.apodo ?? null };
  });
const roster: Member[] = existsSync(path.join(ROOT, "data/equipo.json"))
  ? fromEquipo(path.join(ROOT, "data/equipo.json"))
  : existsSync(path.join(ROOT, "data/roster.json"))
    ? (JSON.parse(readFileSync(path.join(ROOT, "data/roster.json"), "utf8")) as Member[])
    : fromEquipo(path.join(ROOT, "data/equipo.example.json"));

mkdirSync(UPLOADS, { recursive: true });
const db = new Database(path.join(STORAGE, "medio-watts.db"));
db.pragma("journal_mode = WAL");
migrate(db);

function clear() {
  const ids = (db.prepare("SELECT member_id FROM demo_members").all() as { member_id: string }[]).map((r) => r.member_id);
  db.transaction(() => {
    for (const id of ids) {
      for (const t of ["photos", "answers", "submissions", "demo_members"]) {
        db.prepare(`DELETE FROM ${t} WHERE member_id = ?`).run(id);
      }
      db.prepare("DELETE FROM votes WHERE voter_id = ? OR nominee_id = ?").run(id, id);
      db.prepare("DELETE FROM guesses WHERE voter_id = ? OR guess_id = ?").run(id, id);
      rmSync(path.join(UPLOADS, id), { recursive: true, force: true });
    }
  })();
  console.log(`Borrados ${ids.length} de prueba.`);
}

/** Ancho y alto de un JPEG leyendo el marcador SOF. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

const ANSWERS = {
  mascota: [
    "Ramón, Head of Siestas",
    "Pochola, QA: rompe todo lo que toca",
    "Tito, CTO (Chief Treat Officer)",
    "Mora, Scrum Master: muerde si no hay daily",
    "Fideo, DevOps: vive en el server (abajo del escritorio)",
    "Luna, Product Owner: decide qué se come",
    "Copito, Tech Lead de la cama",
    "Manchita, a cargo de bajar cosas de la mesa",
    "Simón, Head of Ladridos en las calls",
    "Lola, Customer Success: recibe a todos en la puerta",
    "Tofu, en pasantía eterna",
  ],
  fiesta: [
    "Le pedí el micrófono al DJ y no me lo devolvieron más",
    "Terminé enseñando a bailar cumbia a un alemán",
    "Me fui a las 23 “porque al otro día laburaba”. Volví a las 6",
    "Gané un karaoke cantando Arjona. No me enorgullece",
    "Perdí un zapato y encontré dos amigos",
    "Dije “una y me voy” cinco veces",
    "Me quedé dormido en el sillón del cumpleañero",
    "Hice un brindis de 12 minutos",
    "Choreé el centro de mesa (sigue en mi casa)",
    "Bailé con la novia más que el novio",
    "Arreglé el wifi del salón. Me aplaudieron",
  ],
  viaje: [
    "Me olvidé el cargador y viví desconectado tres días",
    "Perdí el vuelo por quedarme en el free shop",
    "Llovió los siete días. Los siete",
    "Me picaron 40 mosquitos en una noche",
    "La valija llegó dos días después que yo",
    "Pedí “agua sin gas” y me trajeron un pescado",
    "Me quemé tanto que parecía un semáforo",
    "Contesté mails desde la playa. Mal",
    "Alquilé un auto manual sin saber manejar manual",
    "El Airbnb no existía",
    "Me enfermé el primer día y volví sano el último",
  ],
  escrache: [
    "Esto fue en la daily, se durmió con la cámara prendida",
    "Juró que el bug no era suyo. Era suyo",
    "Llegó al after con la credencial colgada",
    "Pidió “una opinión rápida” y fueron 3 horas",
    "Estaba explicando un deploy y tenía el mute puesto",
    "Se comió mi tupper. Hay pruebas",
    "Así quedó después del cierre de sprint",
    "Dijo “ya lo subo” un viernes a las 18",
    "Le pusimos el fondo de pantalla de Arjona y no se dio cuenta en un mes",
    "Su cara cuando le dijeron que había reunión a las 9",
    "Presentando una demo que no andaba",
  ],
} as const;

const AWARD_IDS = ["companero", "maquina", "escuchan", "rapida", "fiesta", "bateria", "salvo"];
const YEAR = {
  "anio-cliente": ["El del “es un cambio chiquito”", "El que pidió el logo más grande", "El que manda audios de 9 minutos"],
  "anio-pedido": ["Hacelo como Netflix pero para ferreterías", "Una app que funcione sin internet ni datos", "Que el botón sea más… feliz"],
  "anio-frase": ["¿Lo podemos tener para mañana?", "Es un cambio chiquito", "¿Me escuchan?"],
  "anio-deadline": ["Un e-commerce entero para el viernes", "La migración un 23 de diciembre", "Una landing con login, pagos y chat en dos días"],
} as const;

const KINDS = { m: "mascota", f: "fiesta", v: "viaje", e: "escrache", s: "selfie" } as const;

function seed(pendingEmails: string[]) {
  const files = existsSync(SRC) ? readdirSync(SRC).sort() : [];
  const pool = Object.fromEntries(
    Object.entries(KINDS).map(([prefix, kind]) => [kind, files.filter((f) => f.startsWith(`${prefix}-`))]),
  ) as Record<(typeof KINDS)[keyof typeof KINDS], string[]>;
  const missing = Object.entries(pool).filter(([, list]) => !list.length);
  if (missing.length) {
    console.error(`Faltan fotos en ${path.relative(ROOT, SRC)}: ${missing.map(([k]) => k).join(", ")}.`);
    process.exit(1);
  }

  const demo = new Set(
    (db.prepare("SELECT member_id FROM demo_members").all() as { member_id: string }[]).map((r) => r.member_id),
  );
  const hasReal = (id: string) =>
    !demo.has(id) &&
    Boolean(
      db.prepare("SELECT 1 FROM photos WHERE member_id = ? UNION SELECT 1 FROM submissions WHERE member_id = ?").get(id, id),
    );

  const pending = new Set(
    pendingEmails.length
      ? roster.filter((m) => m.emails.some((e) => pendingEmails.includes(e.toLowerCase()))).map((m) => m.id)
      : roster.slice(0, 2).map((m) => m.id),
  );

  clear();
  let n = 0;
  const insertPhoto = db.prepare(
    "INSERT INTO photos (id, member_id, kind, file, width, height) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const add = (memberId: string, kind: string, file: string) => {
    const buf = readFileSync(path.join(SRC, file));
    const size = jpegSize(buf);
    const id = randomUUID();
    const rel = path.join(memberId, `${id}.jpg`);
    mkdirSync(path.join(UPLOADS, memberId), { recursive: true });
    copyFileSync(path.join(SRC, file), path.join(UPLOADS, rel));
    insertPhoto.run(id, memberId, kind, rel, size?.width ?? null, size?.height ?? null);
  };

  db.transaction(() => {
    roster.forEach((m, i) => {
      if (pending.has(m.id) || hasReal(m.id)) return;
      db.prepare("INSERT INTO demo_members (member_id) VALUES (?)").run(m.id);
      for (const kind of Object.values(KINDS)) add(m.id, kind, pool[kind][i % pool[kind].length]);
      for (const [q, answers] of Object.entries(ANSWERS)) {
        db.prepare("INSERT INTO answers (member_id, question_id, answer) VALUES (?, ?, ?)").run(m.id, q, answers[i % answers.length]);
      }
      for (const [q, answers] of Object.entries(YEAR)) {
        db.prepare("INSERT INTO answers (member_id, question_id, answer) VALUES (?, ?, ?)").run(m.id, q, answers[i % answers.length]);
      }
      // Votos (y a quién escrachó) al azar entre los demás del roster.
      const others = roster.filter((o) => o.id !== m.id);
      db.prepare("INSERT INTO answers (member_id, question_id, answer) VALUES (?, ?, ?)").run(
        m.id,
        "escrache-quien",
        others[(i * 7) % others.length].id,
      );
      AWARD_IDS.forEach((award, k) => {
        const nominee = others[(i * 3 + k * 5) % others.length];
        db.prepare("INSERT INTO votes (voter_id, award_id, nominee_id) VALUES (?, ?, ?)").run(m.id, award, nominee.id);
      });
      db.prepare("INSERT INTO submissions (member_id) VALUES (?)").run(m.id);
      n++;
    });
  })();

  const left = roster.filter((m) => pending.has(m.id)).map((m) => m.nickname || m.firstName);
  console.log(`Cargados ${n} de prueba. Sin enchufar: ${left.join(", ") || "nadie"}.`);
}

const args = process.argv.slice(2);
if (args[0] === "clear") clear();
else {
  const i = args.indexOf("--pending");
  seed(i >= 0 ? (args[i + 1] ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) : []);
}
db.close();
