import type Database from "better-sqlite3";

/**
 * Esquema de la base local. Vive aparte de db.ts (que es server-only) para que
 * los scripts de consola (npm run demo) puedan crear las mismas tablas.
 */
export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS photos (
    id         TEXT PRIMARY KEY,
    member_id  TEXT NOT NULL,
    -- Una foto por consigna (ver questions.ts) más la selfie.
    kind       TEXT NOT NULL CHECK (kind IN ('mascota', 'fiesta', 'viaje', 'escrache', 'selfie')),
    file       TEXT NOT NULL,
    width      INTEGER,
    height     INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS photos_member_kind ON photos(member_id, kind);

  CREATE TABLE IF NOT EXISTS answers (
    member_id   TEXT NOT NULL,
    question_id TEXT NOT NULL,
    answer      TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (member_id, question_id)
  );

  -- Quien "enchufó" su batería: ya no puede cambiar nada y entra al inicio.
  CREATE TABLE IF NOT EXISTS submissions (
    member_id    TEXT PRIMARY KEY,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- "¿Quién dijo eso?": la apuesta de cada uno por el autor de cada post-it.
  -- note_id es un HMAC opaco (ver notes.ts): no deja deducir al autor.
  CREATE TABLE IF NOT EXISTS guesses (
    voter_id   TEXT NOT NULL,
    note_id    TEXT NOT NULL,
    guess_id   TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (voter_id, note_id)
  );

  -- Premios ½ watts: el voto de cada uno por categoría (ver awards.ts).
  CREATE TABLE IF NOT EXISTS votes (
    voter_id   TEXT NOT NULL,
    award_id   TEXT NOT NULL,
    nominee_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (voter_id, award_id)
  );

  -- Gente cargada por el script de prueba, para poder borrarla después.
  CREATE TABLE IF NOT EXISTS demo_members (
    member_id TEXT PRIMARY KEY
  );
`;

/** Crea las tablas y pasa la base vieja (fotos "del año") a las consignas nuevas. */
export function migrate(db: Database.Database) {
  const old = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'photos'").get() as
    | { sql: string }
    | undefined;
  if (old?.sql.includes("'year'")) {
    db.exec("ALTER TABLE photos RENAME TO photos_v1");
    db.exec(SCHEMA);
    db.exec("INSERT INTO photos SELECT * FROM photos_v1 WHERE kind = 'selfie'; DROP TABLE photos_v1;");
    return;
  }
  db.exec(SCHEMA);
}
