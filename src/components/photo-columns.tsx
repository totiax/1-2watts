/**
 * El fondo de la sala de espera: columnas de fotos que suben y bajan sin fin,
 * en duotono negro y volt. Al pasar el mouse la foto se prende a color.
 * Es puro CSS (sin JS): la lista se duplica para que el loop no tenga corte.
 */
const COLUMNS = 5;
const SPEEDS = [70, 95, 80, 105, 75]; // segundos por vuelta, distinto en cada columna
const MIN_PER_COLUMN = 8;

export function PhotoColumns({ photoIds }: { photoIds: string[] }) {
  if (!photoIds.length) return null;

  const columns = Array.from({ length: COLUMNS }, (_, c) => {
    const own = photoIds.filter((_, i) => i % COLUMNS === c);
    const base = own.length ? own : photoIds;
    // Repite hasta llenar el alto y después duplica para el loop.
    const filled: string[] = [];
    for (let i = 0; filled.length < MIN_PER_COLUMN; i++) filled.push(base[(i + c) % base.length]);
    return [...filled, ...filled];
  });

  return (
    <div aria-hidden data-in="fondo" className="fixed inset-0 -z-0 overflow-hidden bg-ink">
      <div className="absolute -inset-x-4 inset-y-0 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {columns.map((list, c) => (
          <div key={c} className={`overflow-hidden ${c === 3 ? "hidden sm:block" : ""} ${c === 4 ? "hidden lg:block" : ""}`}>
            <ul
              className={`photo-column flex flex-col ${c % 2 ? "photo-column-down" : ""}`}
              style={{ animationDuration: `${SPEEDS[c % SPEEDS.length]}s` }}
            >
              {list.map((id, i) => (
                <li key={`${id}-${i}`} className="group relative mb-3 overflow-hidden rounded-xl bg-volt">
                  {/* eslint-disable-next-line @next/next/no-img-element -- fotos privadas servidas por la API */}
                  <img
                    src={`/api/photos/${id}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="block aspect-[3/4] w-full object-cover opacity-90 mix-blend-multiply grayscale contrast-125 transition-[filter,opacity,mix-blend-mode] duration-500 group-hover:opacity-100 group-hover:mix-blend-normal group-hover:grayscale-0 group-hover:contrast-100"
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {/* Velo para que se lea lo de adelante; deja pasar el mouse a las fotos. */}
      <div className="pointer-events-none absolute inset-0 bg-ink/70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(13,13,12,.85)_20%,transparent_75%)]" />
    </div>
  );
}
