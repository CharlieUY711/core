/**
 * El asistente de credenciales. Uno solo, para todas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUÉ HACE, Y POR QUÉ NO ES UN INSTRUCTIVO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un instructivo delega el problema: le pide al usuario que haga de
 * intermediario entre dos sistemas que no conoce, y después lo deja solo cuando
 * pega el valor equivocado.
 *
 * Acá cada paso hace UNA cosa y el botón abre exactamente la pantalla que hay
 * que abrir. Lo que se copia se revisa antes de guardar —el identificador de
 * Meta son sólo números, el token de Mapbox empieza con «pk.»— y recién al
 * final se guarda todo junto, con los nombres exactos que el código busca.
 *
 * SE GUARDA AL FINAL, NO PASO A PASO
 * Guardar a medida dejaría credenciales a medio cargar si alguien abandona: la
 * pantalla las vería como configuradas y fallarían al usarlas. O está entera o
 * no está.
 *
 * LOS PASOS NO ESTÁN ACÁ
 * Están en `ui/comoObtener.ts`, uno por plataforma. Este componente no sabe de
 * ninguna plataforma en particular: si mañana hay que agregar una, se agrega
 * ahí y este archivo no se toca.
 */
import { useState } from "react";
import { useApiVault } from "../hooks/useApiVault";
import { GuiaDeCredencial, PasoDeCredencial } from "../ui/comoObtener";
import { BarraDeAccionesSuelta } from "./BarraDeAcciones";

const LINEA = "var(--border)";
const SUAVE = "var(--mute)";

function Enlace({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-block", marginTop: 8,
        background: "var(--brand-navy)", color: "#fff",
        borderRadius: 6, padding: "0.35rem 0.8rem",
        fontSize: "0.76rem", fontWeight: 700, textDecoration: "none" }}>
      {label} ↗
    </a>
  );
}

export function Asistente({ guia, onCerrar, onIr, avisar }: {
  guia: GuiaDeCredencial;
  onCerrar: () => void;
  /** Llevar a una pantalla del panel: para las que se conectan con un botón. */
  onIr: (ruta: string) => void;
  avisar: (texto: string, ok?: boolean) => void;
}) {
  const { add } = useApiVault();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const conCampo = guia.pasos.filter((p): p is PasoDeCredencial & { campo: NonNullable<PasoDeCredencial["campo"]> } => !!p.campo);

  /* Los problemas se muestran mientras se escribe, no al apretar Guardar:
     enterarte al final de que el primer campo estaba mal es rehacer el camino. */
  const problemas = conCampo
    .map(p => ({ name: p.campo.name, problema: (valores[p.campo.name] ?? "").trim()
        ? p.campo.revisar?.(valores[p.campo.name]) ?? null
        : null }))
    .filter(x => x.problema);

  const faltan = conCampo.filter(p => !(valores[p.campo.name] ?? "").trim());

  const guardar = async () => {
    setGuardando(true);
    let bien = 0;
    for (const p of conCampo) {
      const ok = await add({
        name: p.campo.name,
        platform: guia.plataforma,
        type: p.campo.tipo ?? "api_key",
        value: valores[p.campo.name].trim(),
        env: "production",
        tags: ["asistente"],
        notes: null,
        expires_at: null,
        tenant_id: null,
        created_by: null,
      });
      if (ok) bien++;
    }
    setGuardando(false);

    if (bien === conCampo.length) {
      avisar(`${guia.plataforma}: ${bien === 1 ? "credencial guardada" : `${bien} credenciales guardadas`}.`);
      onCerrar();
    } else {
      /* Se dice cuántas entraron. "No se pudo guardar" a secas dejaría al
         usuario sin saber si tiene que cargar todo de nuevo o sólo una. */
      avisar(`Se guardaron ${bien} de ${conCampo.length}. Revisá el Vault antes de reintentar.`, false);
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
        zIndex: 9998, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "1rem" }}>

      <div style={{ background: "#fff", borderRadius: 14, width: "100%",
        maxWidth: 620, maxHeight: "88vh", display: "flex",
        flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${LINEA}` }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#111" }}>
            Cómo conseguir la credencial de {guia.plataforma}
          </div>
          <div style={{ fontSize: "0.78rem", color: SUAVE, marginTop: 2 }}>
            {guia.para}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "1.1rem 1.25rem",
          display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Se conecta con un botón: no se le pide nada al usuario. */}
          {guia.porBoton && (
            <div style={{ fontSize: "0.85rem", color: "#374151", lineHeight: 1.55 }}>
              {guia.porBoton.texto}
              <div style={{ marginTop: 10 }}>
                <BarraDeAccionesSuelta acciones={[{
                  label: "Ir a conectar", destacado: true, color: "var(--brand-madre)",
                  onClick: () => { onCerrar(); onIr(guia.porBoton!.ruta); },
                }]} />
              </div>
            </div>
          )}

          {/* Vive en el servidor: se dice, y no se muestra un formulario que no
              va a servir de nada. */}
          {guia.enElServidor && (
            <div style={{ fontSize: "0.82rem", color: "#374151", lineHeight: 1.55,
              background: "var(--gray-50)", border: `1px solid ${LINEA}`,
              borderRadius: 8, padding: "0.7rem 0.85rem" }}>
              {guia.enElServidor.texto}
              <code style={{ display: "block", marginTop: 8, overflowX: "auto",
                whiteSpace: "nowrap", background: "#fff",
                border: `1px solid ${LINEA}`, borderRadius: 6,
                padding: "0.4rem 0.6rem", fontSize: "0.74rem",
                fontFamily: "ui-monospace, Consolas, monospace" }}>
                {guia.enElServidor.comando}
              </code>
            </div>
          )}

          {guia.pasos.map((p, i) => (
            <div key={i} style={{ display: "grid",
              gridTemplateColumns: "1.7rem 1fr", gap: "0 0.7rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 800,
                color: "var(--brand-madre)", fontVariantNumeric: "tabular-nums" }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111" }}>
                  {p.titulo}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#374151", lineHeight: 1.55 }}>
                  {p.detalle}
                </div>

                {p.enlace && <Enlace {...p.enlace} />}

                {p.campo && (() => {
                  const v = valores[p.campo.name] ?? "";
                  const mal = v.trim() ? p.campo.revisar?.(v) ?? null : null;
                  return (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ display: "block", fontSize: "0.72rem",
                        fontWeight: 700, color: SUAVE, marginBottom: 3 }}>
                        {p.campo.label}
                      </label>
                      <input
                        value={v}
                        onChange={e => setValores(s => ({ ...s, [p.campo!.name]: e.target.value }))}
                        placeholder={p.campo.pista}
                        style={{ width: "100%", boxSizing: "border-box",
                          border: `1.5px solid ${mal ? "#EF4444" : LINEA}`,
                          borderRadius: 8, padding: "0.45rem 0.7rem",
                          fontSize: "0.82rem", outline: "none",
                          fontFamily: "ui-monospace, Consolas, monospace" }} />
                      {mal && (
                        <div style={{ marginTop: 4, fontSize: "0.74rem",
                          color: "#B91C1C", fontWeight: 600 }}>
                          {mal}
                        </div>
                      )}
                      <div style={{ marginTop: 3, fontSize: "0.7rem", color: SUAVE }}>
                        Se guarda como <code>{p.campo.name}</code>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "0.8rem 1.25rem", borderTop: `1px solid ${LINEA}`,
          display: "flex", justifyContent: "flex-end" }}>
          <BarraDeAccionesSuelta acciones={[
            { label: "Cerrar", onClick: onCerrar },
            ...(conCampo.length > 0 ? [{
              label: guardando ? "Guardando…" : "Guardar",
              destacado: true, color: "var(--brand-madre)",
              desactivada: guardando || faltan.length > 0 || problemas.length > 0,
              motivo: problemas.length > 0
                ? "Hay un valor que no tiene la forma esperada"
                : `Falta completar ${faltan.length}`,
              onClick: () => { void guardar(); },
            }] : []),
          ]} />
        </div>
      </div>
    </div>
  );
}

export default Asistente;
