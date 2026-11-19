export const INTRO_KEY = "mw-intro-visto";
export const LOBBY_INTRO_KEY = "mw-intro-sala";
export const INTRO_DONE_EVENT = "mw:intro-done";

/**
 * Corre antes del primer pintado: si la intro ya se vio en esta sesión la
 * oculta por CSS; si no, marca <html data-intro="playing"> para que el resto
 * de la página espere.
 */
const boot = (key: string) =>
  `try{document.documentElement.dataset.intro=sessionStorage.getItem("${key}")?"seen":"playing"}catch(e){document.documentElement.dataset.intro="playing"}`;

export const INTRO_BOOT_SCRIPT = boot(INTRO_KEY);
/** Lo mismo para la intro de la sala de espera (se ve una vez por sesión). */
export const LOBBY_INTRO_BOOT_SCRIPT = boot(LOBBY_INTRO_KEY);
