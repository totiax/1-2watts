/**
 * Lee una variable de entorno perdonando lo típico al pegarla en un panel:
 * espacios, comillas alrededor o el "NOMBRE=" metido dentro del valor.
 */
export function envValue(name: string): string {
  let v = (process.env[name] ?? "").trim();
  if (v.startsWith(`${name}=`)) v = v.slice(name.length + 1).trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v.at(-1) === v[0]) v = v.slice(1, -1).trim();
  return v;
}
