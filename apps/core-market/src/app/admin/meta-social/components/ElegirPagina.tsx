/**
 * Cuál de tus páginas queda conectada.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ANTES ELEGÍAMOS NOSOTROS, Y MAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El código tomaba la PRIMERA página que devolvía Meta. Alguien que administra
 * dos quedaba conectado a una al azar y no se enteraba: publicaba en la que no
 * quería, y no había nada en la pantalla que lo explicara.
 *
 * Es además lo que Meta exige demostrar para `pages_show_list`: que la persona
 * ve las páginas que administra y elige. Sin esta pantalla, el permiso se pide
 * para algo que la app no hace — y la grabación que piden mostraría otra cosa
 * que el texto de la solicitud.
 *
 * SE MUESTRA SIEMPRE, NO SÓLO CUANDO HAY VARIAS
 * Con una sola página no hay nada que decidir y la conexión ya la dejó puesta,
 * pero saber CUÁL quedó conectada importa igual. Y cambiarla después tiene que
 * ser posible sin desconectar todo.
 *
 * INSTAGRAM CUELGA DE LA PÁGINA
 * Por eso se muestra junto a cada una: elegir página es también elegir con qué
 * cuenta de Instagram se va a publicar, y eso no se puede descubrir después.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../utils/supabase/client";
import { BarraDeAccionesSuelta } from "../../components/BarraDeAcciones";

interface Pagina {
  id: string;
  nombre: string;
  instagram: string | null;
}

export function ElegirPagina({ avisar, alCambiar }: {
  avisar: (texto: string, ok?: boolean) => void;
  /** Para que la pantalla vuelva a leer el estado después de elegir. */
  alCambiar: () => void;
}) {
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [conectada, setConectada] = useState<string | null>(null);
  const [sinConectar, setSinConectar] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const llamar = useCallback(async (accion: string, extra: Record<string, unknown> = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) { avisar("La sesión venció. Volvé a entrar.", false); return null; }

    const base = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${base}/functions/v1/meta-oauth?action=${accion}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...extra }),
    });
    const r = await res.json().catch(() => ({}));
    if (!res.ok) { avisar(r.error ?? "No se pudo.", false); return null; }
    return r;
  }, [avisar]);

  const traer = useCallback(async () => {
    const r = await llamar("paginas");
    if (!r) return;
    setPaginas(r.paginas ?? []);
    setConectada(r.conectada ?? null);
    setSinConectar(!!r.sinConectar);
  }, [llamar]);

  useEffect(() => { void traer(); }, [traer]);

  /* Sin conexión no hay nada que mostrar: las páginas salen del token que deja
     el login. Un bloque vacío diciendo "no hay páginas" haría pensar que la
     cuenta no administra ninguna, que es otra cosa. */
  if (sinConectar || paginas.length === 0) return null;

  const elegir = async (p: Pagina) => {
    setOcupado(p.id);
    const r = await llamar("elegir_pagina", { page_id: p.id });
    setOcupado(null);
    if (!r) return;
    avisar(`Conectada: ${p.nombre}${p.instagram ? ` · @${p.instagram}` : ""}.`);
    await traer();
    alCambiar();
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12,
      background: "#fff", padding: "1rem 1.1rem",
      display: "flex", flexDirection: "column", gap: "0.8rem" }}>

      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#111" }}>
          {conectada ? "Página conectada" : "Elegí la página"}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--mute)" }}>
          {conectada
            ? "Es la página donde se publica. Podés cambiarla cuando quieras."
            : `Administrás ${paginas.length} páginas. Elegí en cuál publica esta tienda.`}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {paginas.map(p => {
          const esta = p.id === conectada;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10,
              padding: "0.6rem 0.75rem", borderRadius: 8,
              border: `1.5px solid ${esta ? "var(--brand-madre)" : "var(--border)"}`,
              background: esta
                ? "color-mix(in srgb, var(--brand-madre) 6%, #fff)" : "#fff" }}>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#111" }}>
                  {p.nombre}
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--mute)" }}>
                  {/* Se dice cuando NO tiene, no sólo cuando tiene: elegir una
                      página sin Instagram vinculado es elegir quedarse sin
                      Instagram, y eso hay que saberlo antes. */}
                  {p.instagram
                    ? `Instagram: @${p.instagram}`
                    : "Sin Instagram Business vinculado"}
                </div>
              </div>

              {esta ? (
                <span style={{ flex: "0 0 auto", fontSize: "0.68rem", fontWeight: 800,
                  letterSpacing: ".06em", padding: "0.22rem 0.6rem", borderRadius: 999,
                  background: "#DCFCE7", color: "#166534" }}>
                  CONECTADA
                </span>
              ) : (
                <BarraDeAccionesSuelta acciones={[{
                  label: ocupado === p.id ? "Conectando…" : "Usar esta",
                  color: "var(--brand-navy)",
                  desactivada: ocupado !== null,
                  onClick: () => { void elegir(p); },
                }]} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ElegirPagina;
