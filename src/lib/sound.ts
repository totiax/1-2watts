"use client";

import { isPlaylistId, type PlaylistId } from "./playlists";

/**
 * Música y efectos de ½ watts.
 *
 * - La música son las listas de storage/music, servidas por /api/music. Se pasan en orden aleatorio, con pausa, anterior, siguiente
 *   y volumen.
 * - Los efectos de la intro (zumbido, apagón, resorte) se sintetizan con Web
 *   Audio y suenan aunque se elija "Sin música".
 *
 * Los navegadores no dejan sonar nada hasta que la persona toca algo, así que
 * hay que llamar a unlock() dentro de un click o tecla.
 */

export type MusicChoice = PlaylistId | "none";

export type MusicState = {
  choice: MusicChoice;
  playing: boolean;
  /** Título de la canción actual (null si todavía no cargó ninguna). */
  title: string | null;
  volume: number;
  /** true: orden aleatorio; false: como están en la carpeta. */
  shuffle: boolean;
  error: string | null;
};

const PREF_KEY = "mw-musica";
const VOLUME_KEY = "mw-volumen";
const SHUFFLE_KEY = "mw-aleatorio";
const DEFAULT_CHOICE: PlaylistId = "cheta";

type Listener = (state: MusicState) => void;

function shuffled(n: number) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  /** El "crack" de la w (public/sounds/w-break.mp3), decodificado una vez. */
  private crack: AudioBuffer | null = null;
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<Listener>();
  private titles = new Map<PlaylistId, string[]>();
  private order: number[] = [];
  private pos = 0;
  private failures = 0;
  private wanted = false;
  state: MusicState = { choice: DEFAULT_CHOICE, playing: false, title: null, volume: 0.7, shuffle: true, error: null };

  constructor() {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved === "none" || isPlaylistId(saved)) this.state.choice = saved;
      const vol = Number(localStorage.getItem(VOLUME_KEY));
      if (localStorage.getItem(VOLUME_KEY) !== null && vol >= 0 && vol <= 1) this.state.volume = vol;
      this.state.shuffle = localStorage.getItem(SHUFFLE_KEY) !== "no";
    } catch {}
  }

  get unlocked() {
    return this.ctx !== null;
  }

  /** Llamar dentro de un click o tecla. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(ctx.destination);
        this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        void this.loadCrack(ctx);
      }
    }
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    this.player();
  }

  private async loadCrack(ctx: AudioContext) {
    try {
      const res = await fetch("/sounds/w-break.mp3");
      this.crack = await ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      // Sin el archivo quedan los sonidos sintetizados.
    }
  }

  /** Reproduce un pedazo del crack (desde `offset`, `dur` segundos). */
  private playCrack(offset: number, dur: number | undefined, vol: number, rate = 1) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.crack;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.master!);
    src.start(ctx.currentTime, offset, dur);
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private set(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }

  private player() {
    if (this.audio || typeof window === "undefined") return this.audio;
    const a = new Audio();
    a.preload = "auto";
    a.volume = this.state.volume;
    a.addEventListener("playing", () => {
      this.failures = 0;
      this.set({ playing: true, error: null });
    });
    a.addEventListener("pause", () => this.set({ playing: false }));
    a.addEventListener("ended", () => this.next());
    a.addEventListener("error", () => {
      // Si una canción no carga, pasa a la siguiente (sin quedar en loop si fallan todas).
      if (++this.failures < 3) this.next();
      else this.set({ playing: false, error: "No se pudo reproducir la música." });
    });
    this.audio = a;
    return a;
  }

  /** Trae los títulos de la lista elegida (una vez) y arma el orden. */
  private async load(id: PlaylistId) {
    if (!this.titles.has(id)) {
      const res = await fetch(`/api/music/${id}`, { redirect: "manual" });
      if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
        throw new Error("No se pudo cargar la lista.");
      }
      const { tracks } = (await res.json()) as { tracks: string[] };
      this.titles.set(id, tracks);
    }
    const n = this.titles.get(id)!.length;
    if (!n) throw new Error("La lista está vacía.");
    if (this.order.length !== n) {
      this.order = this.state.shuffle ? shuffled(n) : Array.from({ length: n }, (_, i) => i);
      this.pos = 0;
    }
  }

  /** Pone la canción de la posición actual y la hace sonar. */
  private async playCurrent() {
    const id = this.state.choice;
    const a = this.player();
    if (id === "none" || !a) return;
    const track = this.order[this.pos];
    const src = `/api/music/${id}/${track}`;
    if (!a.src.endsWith(src)) a.src = src;
    this.set({ title: this.titles.get(id)?.[track] ?? null });
    try {
      await a.play();
    } catch {
      // El navegador todavía no dejó sonar: queda listo para el próximo play.
      this.set({ playing: false });
    }
  }

  /** Cambia de lista (o la apaga) y la recuerda para la próxima. */
  choose(choice: MusicChoice) {
    try {
      localStorage.setItem(PREF_KEY, choice);
    } catch {}
    this.audio?.pause();
    this.order = [];
    // El evento "pause" llega después: marcarlo ya para que start() no lo saltee.
    this.set({ choice, title: null, error: null, playing: false });
    if (choice !== "none") {
      this.unlock();
      void this.start();
    }
  }

  /** Arranca (o sigue) la lista elegida, si hay una. */
  async start() {
    const id = this.state.choice;
    if (id === "none" || this.state.playing || this.wanted) return;
    this.wanted = true;
    try {
      await this.load(id);
      if (this.state.choice !== id) return;
      await this.playCurrent();
    } catch (e) {
      this.set({ error: e instanceof Error ? e.message : "No se pudo cargar la música." });
    } finally {
      this.wanted = false;
    }
  }

  pause() {
    this.audio?.pause();
  }

  toggle() {
    if (this.state.playing) this.pause();
    else void this.start();
  }

  async next() {
    if (this.state.choice === "none" || !this.order.length) return void this.start();
    this.pos = (this.pos + 1) % this.order.length;
    await this.playCurrent();
  }

  /** Si la canción ya avanzó, vuelve al principio; si no, a la anterior. */
  async prev() {
    if (this.state.choice === "none" || !this.order.length) return void this.start();
    if (this.audio && this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    this.pos = (this.pos - 1 + this.order.length) % this.order.length;
    await this.playCurrent();
  }

  /** Aleatorio o en orden, sin cortar la canción que suena. */
  setShuffle(shuffle: boolean) {
    try {
      localStorage.setItem(SHUFFLE_KEY, shuffle ? "si" : "no");
    } catch {}
    const n = this.order.length;
    if (n) {
      const track = this.order[this.pos];
      if (shuffle) {
        // La que suena queda primera y el resto se mezcla.
        this.order = [track, ...shuffled(n).filter((i) => i !== track)];
        this.pos = 0;
      } else {
        this.order = Array.from({ length: n }, (_, i) => i);
        this.pos = track;
      }
    }
    this.set({ shuffle });
  }

  setVolume(volume: number) {
    const v = Math.max(0, Math.min(1, volume));
    if (this.audio) this.audio.volume = v;
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {}
    this.set({ volume: v });
  }

  stop() {
    this.pause();
  }

  // ── Efectos de la intro (suenan aunque se elija "Sin música") ──────────

  private noiseBurst(t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, dest: AudioNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Zumbido que sube mientras carga la barra. */
  charge(duration: number) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(520, t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.3);
    g.gain.linearRampToValueAtTime(0.07, t + duration - 0.05);
    g.gain.linearRampToValueAtTime(0, t + duration);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.05);
  }

  /** Chisporroteo de corte de luz y el "piuuu" del apagón. */
  powerCut(flickers: number[]) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    let t = ctx.currentTime;
    flickers.forEach((d, i) => {
      t += d;
      if (i % 2 === 1) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = 55;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(d, 0.05));
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + d + 0.1);
      this.noiseBurst(t, 0.06, 0.12, "highpass", 3000, master);
    });
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.6);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.7);
  }

  /**
   * La w se suelta: salta el tornillo, la chapa cae y queda vibrando, se
   * hamaca con el resorte y termina con un chirrido. Dura lo mismo que la
   * hamacada elástica de la intro (~1,5 s).
   */
  snap() {
    if (!this.ctx || !this.master) return;
    // Con el archivo cargado: el crack entero.
    if (this.crack) return this.playCrack(0, undefined, 0.9);
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(this.master);
    const t = ctx.currentTime;

    // 1 · El tornillo: un clic seco y un "tin" chiquito que rebota al caer.
    this.noiseBurst(t, 0.025, 0.35, "highpass", 3500, out);
    [0, 0.16, 0.27].forEach((d, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(2600 - i * 180, t + 0.05 + d);
      g.gain.setValueAtTime(0.09 / (i + 1), t + 0.05 + d);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + d + 0.09);
      o.connect(g).connect(out);
      o.start(t + 0.05 + d);
      o.stop(t + 0.05 + d + 0.12);
    });

    // 2 · La chapa cae: golpe grave y parciales inarmónicos que suenan a metal.
    const hit = t + 0.08;
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.frequency.setValueAtTime(110, hit);
    thud.frequency.exponentialRampToValueAtTime(48, hit + 0.18);
    thudGain.gain.setValueAtTime(0.32, hit);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, hit + 0.25);
    thud.connect(thudGain).connect(out);
    thud.start(hit);
    thud.stop(hit + 0.3);
    this.noiseBurst(hit, 0.06, 0.18, "bandpass", 1800, out);
    for (const [freq, vol, decay] of [
      [431, 0.05, 1.1],
      [1093, 0.035, 0.8],
      [1789, 0.025, 0.55],
      [2617, 0.015, 0.35],
    ]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, hit);
      g.gain.exponentialRampToValueAtTime(0.0001, hit + decay);
      o.connect(g).connect(out);
      o.start(hit);
      o.stop(hit + decay + 0.05);
    }

    // 3 · El resorte: un "boiiing" cuya vibración se frena con la hamacada.
    const spring = t + 0.12;
    const o = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(240, spring);
    o.frequency.exponentialRampToValueAtTime(150, spring + 1.3);
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1400, spring);
    lp.frequency.exponentialRampToValueAtTime(380, spring + 1.3);
    lp.Q.value = 6;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.setValueAtTime(16, spring);
    lfo.frequency.exponentialRampToValueAtTime(5, spring + 1.3);
    depth.gain.setValueAtTime(70, spring);
    depth.gain.exponentialRampToValueAtTime(4, spring + 1.3);
    lfo.connect(depth).connect(o.frequency);
    g.gain.setValueAtTime(0, spring);
    g.gain.linearRampToValueAtTime(0.11, spring + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, spring + 1.4);
    o.connect(lp).connect(g).connect(out);
    o.start(spring);
    lfo.start(spring);
    o.stop(spring + 1.45);
    lfo.stop(spring + 1.45);

    // 4 · Chirrido de bisagra cuando se acomoda.
    this.creak(t + 1.05, 0.35, 0.035, out);
  }

  /** Chirrido metálico: tono que tiembla de forma irregular, filtrado. */
  private creak(t: number, dur: number, vol: number, dest: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(640, t);
    for (let k = 1; k <= 12; k++) {
      o.frequency.linearRampToValueAtTime(560 + Math.random() * 260, t + (dur * k) / 12);
    }
    bp.type = "bandpass";
    bp.frequency.value = 1300;
    bp.Q.value = 4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.linearRampToValueAtTime(vol * 0.7, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(bp).connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** La w hamacándose cuando la empujan (más suave que snap). */
  boing(strength = 1) {
    if (!this.ctx || !this.master) return;
    const s = Math.max(0.3, Math.min(1, strength));
    // Con el archivo: solo el crack chico del final, más bajo y con un tono
    // que cambia un poco cada vez para que no suene repetido.
    if (this.crack) return this.playCrack(0.62, 0.4, 0.25 + 0.35 * s, 0.9 + Math.random() * 0.25);
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(230, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.9);
    lp.type = "lowpass";
    lp.frequency.value = 1200;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.setValueAtTime(13, t);
    lfo.frequency.exponentialRampToValueAtTime(5, t + 0.9);
    depth.gain.setValueAtTime(45 * s, t);
    depth.gain.exponentialRampToValueAtTime(3, t + 0.9);
    lfo.connect(depth).connect(o.frequency);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * s, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    o.connect(lp).connect(g).connect(this.master);
    o.start(t);
    lfo.start(t);
    o.stop(t + 1.05);
    lfo.stop(t + 1.05);
    // Un toque de chapa al principio.
    const ring = ctx.createOscillator();
    const rg = ctx.createGain();
    ring.frequency.value = 1093;
    rg.gain.setValueAtTime(0.012 * s, t);
    rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    ring.connect(rg).connect(this.master);
    ring.start(t);
    ring.stop(t + 0.45);
  }
}

let engine: SoundEngine | null = null;
/** Motor de sonido compartido (solo en el navegador). */
export function sound() {
  engine ??= new SoundEngine();
  return engine;
}
