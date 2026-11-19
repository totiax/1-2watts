"use client";

/**
 * Script en línea que corre antes del primer pintado (patrón de la guía de Next).
 * Es componente de cliente para que, al renderizarse en el navegador, salga como
 * text/plain y React no avise por el <script>.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
