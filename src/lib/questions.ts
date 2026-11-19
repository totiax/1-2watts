/**
 * Las consignas de la carga: cada foto viene con su pregunta. La respuesta es
 * el epígrafe de la polaroid en el inicio, donde todos apuestan de quién es.
 *
 * "escrache" es una foto de un compañero que lo escrache, con a quién (se
 * guarda en ESCRACHE_WHO). No se muestra en el inicio: es el premio del juego.
 */
export const PROMPTS = [
  {
    id: "mascota",
    title: "Tu mascota",
    emoji: "🐶",
    hint: "Perro, gato, planta, la del vecino. Si no tenés, la que te gustaría tener.",
    question: "¿Cómo se llama y qué puesto tendría en 25watts?",
    placeholder: "Ramón, Head of Siestas",
  },
  {
    id: "fiesta",
    title: "Una fiesta del año",
    emoji: "🪩",
    hint: "Casamiento, cumple, after, recital. La que más se haya ido de las manos.",
    question: "¿Qué pasó esa noche? (versión apta para Slack)",
    placeholder: "Le pedí el micrófono al DJ y no me lo devolvieron más",
  },
  {
    id: "viaje",
    title: "Un viaje o vacaciones",
    emoji: "🧳",
    hint: "Cerca o lejos, con o sin valija perdida.",
    question: "¿Qué salió mal en ese viaje?",
    placeholder: "Me olvidé el cargador y viví desconectado tres días",
  },
  {
    id: "escrache",
    title: "Escrache",
    emoji: "📸",
    hint: "Escrachá a quien quieras del equipo (con cariño). Es el premio del juego: solo la ven los que más acierten.",
    question: "Contá el contexto, sin piedad",
    placeholder: "Esto fue en la daily, se durmió con la cámara prendida",
  },
] as const;

export type PromptId = (typeof PROMPTS)[number]["id"];
/** Las que van en la tarjeta del inicio (el escrache queda guardado para la fiesta). */
export const CARD_PROMPTS = PROMPTS.filter((p) => p.id !== "escrache");
export type PhotoKind = PromptId | "selfie";
export const PHOTO_KINDS: readonly PhotoKind[] = [...PROMPTS.map((p) => p.id), "selfie"];
export const MAX_ANSWER = 200;
/** Respuesta donde se guarda el id del compañero escrachado. */
export const ESCRACHE_WHO = "escrache-quien";

export function isPhotoKind(v: unknown): v is PhotoKind {
  return typeof v === "string" && (PHOTO_KINDS as readonly string[]).includes(v);
}
