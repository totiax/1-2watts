/**
 * Los Premios ½ watts. En la carga cada uno vota a un compañero por categoría
 * (no se puede votar a sí mismo); los ganadores se revelan en la fiesta.
 */
export const AWARDS = [
  { id: "companero", emoji: "🏆", title: "Mejor compañero/a del año", hint: "El que siempre te salva" },
  { id: "maquina", emoji: "💻", title: "En mi máquina anda", hint: "Rey o reina de la excusa" },
  { id: "escuchan", emoji: "🎙️", title: "¿Me escuchan?", hint: "Habla con el mute puesto" },
  { id: "rapida", emoji: "⏱️", title: "Una pregunta rápida", hint: "Que duró tres horas" },
  { id: "fiesta", emoji: "🪩", title: "Alma de la fiesta", hint: "Sin esta persona no hay after" },
  { id: "bateria", emoji: "🪫", title: "Llegó a media batería", hint: "El más quemado de diciembre" },
  { id: "salvo", emoji: "💚", title: "Me salvó el año", hint: "El que más te ayudó, en serio" },
] as const;

export type AwardId = (typeof AWARDS)[number]["id"];

export function isAwardId(v: unknown): v is AwardId {
  return typeof v === "string" && AWARDS.some((a) => a.id === v);
}

/**
 * Premios "del año": no se vota a un compañero, cada uno escribe su candidato.
 * En la fiesta se muestran las respuestas y se vota la mejor. Se guardan en
 * la tabla de respuestas con el prefijo "anio-".
 */
export const YEAR_AWARDS = [
  {
    id: "anio-cliente",
    emoji: "💼",
    title: "Peor cliente del año",
    placeholder: "Sin nombres reales: el del “es un cambio chiquito”",
  },
  {
    id: "anio-pedido",
    emoji: "🤯",
    title: "El pedido más delirante",
    placeholder: "“Hacelo como Netflix pero para ferreterías”",
  },
  { id: "anio-frase", emoji: "💬", title: "La frase del año", placeholder: "“¿Lo podemos tener para mañana?”" },
  {
    id: "anio-deadline",
    emoji: "⏳",
    title: "El deadline imposible",
    placeholder: "Una landing con login, pagos y chat… para el viernes",
  },
] as const;
