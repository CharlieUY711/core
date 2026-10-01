/**
 * Meta — Configuraciones y usos (EXPERIMENTAL).
 *
 * Elegís un número destinatario y definís las opciones que ve cuando le escribe
 * al WhatsApp conectado. Una sola opción es la correcta y deja seguir en el
 * chat; las demás lo mandan a su URL. Cada opción puede llevar una imagen.
 *
 * Esta pantalla sólo CONFIGURA. Quien conversa es la edge function
 * `whatsapp-gate`, que recibe los mensajes de Meta y lee lo que se guarda acá.
 *
 * Los hooks de Meta (`useMetaVault`, `useWhatsApp`) se usan para una sola
 * cosa: saber si hay un WhatsApp conectado y mostrar su número. Sin conexión
 * se puede configurar igual, pero la pantalla lo avisa: guardar un gate que no
 * puede responder es la forma más fácil de creer que funciona.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pantalla, usePantalla } from "../components/Pantalla";
import { ItemDeBarra } from "../components/BarraDeAcciones";
import { useMetaVault } from "../meta-social/hooks/useMetaVault";
import { useWhatsApp } from "../meta-social/hooks/useWhatsApp";
import { whatsappService } from "../meta-social/services/whatsappService";
import type { WhatsAppPhoneNumber } from "../meta-social/types/whatsapp.types";
import {
  waGateService, normalizarNumero, urlPredefinida, validar,
} from "../meta-social/services/waGateService";
import type { WaGate, WaGateDraft, WaGateOption } from "../meta-social/types/waGate.types";

const opcionVacia = (n: number): WaGateOption => ({
  position: n, label: "", is_correct: false, action_url: urlPredefinida(n + 1), image_url: null,
});

const gateVacio = (n = 1): WaGateDraft => ({
  name: `Configuración ${n}`, phone_number_id: null,
  recipient: "", recipient_label: "",
  prompt: "Elegí una opción para continuar:",
  success_text: "¡Listo! Ya podés seguir escribiendo.",
  enabled: false,
  options: [
    { ...opcionVacia(0), is_correct: true, action_url: null },
    opcionVacia(1),
  ],
});

const S = {
  card:  { background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 16 } as const,
  h3:    { margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#111" } as const,
  sub:   { margin: "0 0 12px", fontSize: 11, color: "var(--mute)" } as const,
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "var(--mute)", marginBottom: 4 } as const,
  input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 13,
           border: "1px solid var(--border)", borderRadius: 8, background: "#fff" } as const,
  btn:   { padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer",
           border: "1px solid var(--border)", background: "#fff" } as const,
};

export default function AdminMetaConfig() {
  const navegar = useNavigate();
  const p = usePantalla();

  const vault = useMetaVault();
  const wa = useWhatsApp(vault.whatsappCredentials);

  const [gates, setGates] = useState<WaGate[]>([]);
  /* Los teléfonos de la cuenta de Meta (WABA): son los que pueden responder. */
  const [telefonos, setTelefonos] = useState<WhatsAppPhoneNumber[]>([]);
  const [errorTelefonos, setErrorTelefonos] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [edit, setEdit] = useState<WaGateDraft>(gateVacio());
  const [ocupado, setOcupado] = useState(false);
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const opcionDeImagen = useRef<number>(0);

  const recargar = async (seleccionar?: string) => {
    try {
      const todos = await waGateService.cargar();
      setGates(todos);
      const elegido = todos.find(g => g.id === (seleccionar ?? edit.id));
      if (elegido) setEdit(elegido);
    } catch (e: any) {
      p.avisar(e.message ?? "No se pudo cargar la configuración.", false);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { void recargar(); /* eslint-disable-next-line */ }, []);

  const creds = vault.whatsappCredentials;
  useEffect(() => {
    if (!creds.accessToken || !creds.wabaId) { setTelefonos([]); return; }
    let vivo = true;
    void whatsappService.getPhoneNumbers(creds).then(r => {
      if (!vivo) return;
      if (r.ok) { setTelefonos(r.data?.data ?? []); setErrorTelefonos(null); }
      else { setTelefonos([]); setErrorTelefonos(r.error ?? "No se pudo leer la lista de teléfonos."); }
    });
    return () => { vivo = false; };
    // eslint-disable-next-line
  }, [creds.accessToken, creds.wabaId]);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-gate`;
  const numeroConectado = wa.phoneNumber?.display_phone_number;
  const problema = useMemo(() => validar(edit), [edit]);

  const etiquetaTelefono = (t: WhatsAppPhoneNumber) =>
    `${t.display_phone_number}${t.verified_name ? ` · ${t.verified_name}` : ""}`;
  /* Si la configuración apunta a un teléfono que ya no figura en la cuenta, se
     lo muestra igual: callarlo sería cambiarlo sin avisar al guardar. */
  const telefonoDesconocido = !!edit.phone_number_id
    && !telefonos.some(t => t.id === edit.phone_number_id);

  // ── Cambios sobre el borrador ──────────────────────────────────────────────
  const cambiar = (parche: Partial<WaGateDraft>) => setEdit(e => ({ ...e, ...parche }));

  const cambiarOpcion = (i: number, parche: Partial<WaGateOption>) =>
    setEdit(e => ({ ...e, options: e.options.map((o, k) => k === i ? { ...o, ...parche } : o) }));

  /* Una sola correcta: marcar una desmarca las demás. La correcta no lleva
     URL —no se va a ningún lado—, y al dejar de serlo vuelve a su predefinida. */
  const marcarCorrecta = (i: number) =>
    setEdit(e => ({
      ...e,
      options: e.options.map((o, k) => ({
        ...o,
        is_correct: k === i,
        action_url: k === i ? null : (o.action_url ?? urlPredefinida(k + 1)),
      })),
    }));

  const agregar = () =>
    setEdit(e => e.options.length >= 10 ? e
      : { ...e, options: [...e.options, opcionVacia(e.options.length)] });

  const quitar = (i: number) =>
    setEdit(e => {
      if (e.options.length <= 2) return e;
      const resto = e.options.filter((_, k) => k !== i);
      // Si se quitó la correcta, no queda ninguna: se pasa a la primera.
      if (!resto.some(o => o.is_correct)) resto[0] = { ...resto[0], is_correct: true, action_url: null };
      return { ...e, options: resto };
    });

  const generarUrls = () =>
    setEdit(e => ({
      ...e,
      options: e.options.map((o, k) => o.is_correct ? o : { ...o, action_url: urlPredefinida(k + 1) }),
    }));

  // ── Imagen ─────────────────────────────────────────────────────────────────
  const elegirImagen = (i: number) => { opcionDeImagen.current = i; archivo.current?.click(); };

  const alSubir = async (f?: File) => {
    if (!f) return;
    const i = opcionDeImagen.current;
    setSubiendo(i);
    try {
      cambiarOpcion(i, { image_url: await waGateService.subirImagen(f) });
    } catch (e: any) {
      p.avisar(e.message ?? "No se pudo subir la imagen.", false);
    } finally {
      setSubiendo(null);
      if (archivo.current) archivo.current.value = "";
    }
  };

  // ── Acciones ───────────────────────────────────────────────────────────────
  /** `activa` fuerza prender o apagar al guardar (botones Activar/Desactivar). */
  const guardar = async (activa?: boolean) => {
    setOcupado(true);
    try {
      const borrador = activa === undefined ? edit : { ...edit, enabled: activa };
      const id = await waGateService.guardar(borrador);
      p.avisar(activa === true ? "Guardada y activada: las demás de este destinatario quedaron apagadas."
        : activa === false ? "Guardada y apagada." : "Guardado.");
      await recargar(id);
    } catch (e: any) {
      p.avisar(e.message ?? "No se pudo guardar.", false);
    } finally { setOcupado(false); }
  };

  const eliminar = async () => {
    if (!edit.id || !confirm("¿Eliminar esta configuración?")) return;
    setOcupado(true);
    try {
      await waGateService.borrar(edit.id);
      setEdit(gateVacio(gates.length));
      await recargar();
      p.avisar("Eliminada.");
    } catch (e: any) { p.avisar(e.message, false); }
    finally { setOcupado(false); }
  };

  const reiniciar = async () => {
    if (!edit.id) return;
    try {
      await waGateService.reiniciarConversaciones(edit.id);
      p.avisar("Listo: la próxima vez que escriba, vuelve a ver las opciones.");
    } catch (e: any) { p.avisar(e.message, false); }
  };

  /* Copia la configuración abierta como una NUEVA y apagada: sirve para probar
     una variante sin perder la que anda. */
  const duplicar = () =>
    setEdit({
      ...edit, id: undefined, enabled: false,
      name: `${edit.name} (copia)`,
      options: edit.options.map(({ id: _id, ...o }) => ({ ...o })),
    });

  const copiar = async (t: string) => {
    try { await navigator.clipboard.writeText(t); p.avisar("Copiado."); }
    catch { p.avisar("No se pudo copiar; seleccionalo a mano.", false); }
  };

  const acciones: ItemDeBarra[] = [
    {
      label: ocupado ? "Guardando…" : "Guardar", destacado: true, color: "var(--brand-madre)",
      desactivada: ocupado || !!problema, motivo: problema ?? "",
      onClick: () => { void guardar(); },
    },
    { label: "Nueva", onClick: () => setEdit(gateVacio(gates.length + 1)) },
    { label: "Volver a Meta", onClick: () => navegar("/admin/meta") },
  ];

  return (
    <Pantalla p={p} extra={acciones}
      explicacion="Experimental: elegí quién puede seguir el chat y qué pasa con cada opción."
      notificaciones={[
        { tono: "atencion" as const,
          texto: "Función experimental. Sólo responde al número destinatario que configures acá; el resto de los chats no se toca." },
        ...(!vault.loading && !wa.isConfigured ? [{
          tono: "atencion" as const,
          texto: "No hay un WhatsApp conectado. Podés configurar, pero nada responderá hasta conectarlo en Meta.",
        }] : []),
      ]}>

      {/* ── Conexión y webhook ─────────────────────────────────────────── */}
      <div style={S.card}>
        <h3 style={S.h3}>WhatsApp conectado</h3>
        <p style={S.sub}>
          {numeroConectado
            ? `Los mensajes llegan al ${numeroConectado}.`
            : "Sin número conectado todavía."}
        </p>
        <label style={S.label}>URL del webhook (se registra una vez en Meta → WhatsApp → Configuración)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={S.input} readOnly value={webhookUrl} onFocus={e => e.target.select()} />
          <button style={S.btn} onClick={() => { void copiar(webhookUrl); }}>Copiar</button>
        </div>
        <p style={{ ...S.sub, margin: "6px 0 0" }}>
          Suscribite al campo <b>messages</b>. El token de verificación es el valor de <code>WA_GATE_VERIFY_TOKEN</code>.
        </p>
      </div>

      {/* ── Configuraciones guardadas ──────────────────────────────────── */}
      {!cargando && gates.length > 0 && (
        <div style={S.card}>
          <h3 style={S.h3}>Configuraciones</h3>
          <p style={S.sub}>
            Guardá las que quieras y elegí una para editarla. Sólo una puede estar activa por destinatario y
            teléfono: activar otra apaga la anterior, y podés volver a la anterior cuando quieras.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {gates.map(g => (
              <button key={g.id} onClick={() => setEdit(g)}
                style={{ ...S.btn, textAlign: "left", ...(edit.id === g.id ? { borderColor: "var(--brand-madre)", borderWidth: 2 } : {}) }}>
                <div style={{ fontWeight: 700 }}>{g.name || `+${g.recipient}`}</div>
                <div style={{ fontSize: 11, color: "var(--mute)", fontWeight: 500 }}>
                  +{g.recipient} · <span style={{ color: g.enabled ? "#15803D" : "var(--mute)" }}>
                    {g.enabled ? "● activa" : "apagada"}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Destinatario ───────────────────────────────────────────────── */}
      <div style={S.card}>
        <h3 style={S.h3}>Destinatario y teléfono</h3>
        <p style={S.sub}>Sólo este número ve las opciones cuando le escribe al teléfono que elijas.</p>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Nombre de esta configuración</label>
          <input style={S.input} value={edit.name} placeholder="Ej.: Prueba de promos"
            onChange={e => cambiar({ name: e.target.value })} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Teléfono que responde (los dados de alta en Meta)</label>
          <select style={S.input} value={edit.phone_number_id ?? ""}
            onChange={e => cambiar({ phone_number_id: e.target.value || null })}>
            <option value="">
              Automático: el WhatsApp conectado{numeroConectado ? ` (${numeroConectado})` : ""}
            </option>
            {telefonos.map(t => (
              <option key={t.id} value={t.id}>{etiquetaTelefono(t)}</option>
            ))}
            {telefonoDesconocido && (
              <option value={edit.phone_number_id!}>{edit.phone_number_id} · no figura en Meta</option>
            )}
          </select>
          {errorTelefonos && (
            <p style={{ ...S.sub, margin: "4px 0 0", color: "#B45309" }}>
              No pude leer la lista de teléfonos de Meta: {errorTelefonos}
            </p>
          )}
          {!errorTelefonos && telefonos.length === 0 && (
            <p style={{ ...S.sub, margin: "4px 0 0" }}>
              Sin lista de Meta. Conectá WhatsApp en Meta para que aparezcan los teléfonos de la cuenta.
            </p>
          )}
        </div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <label style={S.label}>Número (acepta 09X XXX XXX o con código de país)</label>
            <input style={S.input} placeholder="099 123 456"
              defaultValue={edit.recipient ? `+${edit.recipient}` : ""}
              key={edit.id ?? "nuevo"}
              onChange={e => cambiar({ recipient: normalizarNumero(e.target.value) })} />
            <p style={{ ...S.sub, margin: "4px 0 0" }}>
              {edit.recipient ? `Se guarda como +${edit.recipient}` : "Sin número"}
            </p>
          </div>
          <div>
            <label style={S.label}>Nombre (opcional)</label>
            <input style={S.input} value={edit.recipient_label ?? ""}
              onChange={e => cambiar({ recipient_label: e.target.value })} />
          </div>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 13 }}>
          <input type="checkbox" checked={edit.enabled} onChange={e => cambiar({ enabled: e.target.checked })} />
          Activa (responde a este número desde ese teléfono; apaga la que estaba activa para el mismo par)
        </label>
      </div>

      {/* ── Mensajes ───────────────────────────────────────────────────── */}
      <div style={S.card}>
        <h3 style={S.h3}>Mensajes</h3>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div>
            <label style={S.label}>Cuando escribe, se le muestra</label>
            <textarea style={{ ...S.input, minHeight: 60 }} value={edit.prompt}
              onChange={e => cambiar({ prompt: e.target.value })} />
          </div>
          <div>
            <label style={S.label}>Si elige la correcta</label>
            <textarea style={{ ...S.input, minHeight: 60 }} value={edit.success_text}
              onChange={e => cambiar({ success_text: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ── Opciones ───────────────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div>
            <h3 style={S.h3}>Opciones</h3>
            <p style={S.sub}>
              Hay una sola correcta, que deja seguir en el chat. Todas las demás (las que quieras) envían cada una a su URL
              (predefinidas como op1, op2… en {urlPredefinida(1).replace("https://op1.", "")}).
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <button style={S.btn} onClick={generarUrls} title="Rellena las URLs con op1, op2, op3…">
              Generar URLs
            </button>
            <button style={S.btn} onClick={agregar} disabled={edit.options.length >= 10}>
              + Opción
            </button>
          </div>
        </div>

        <input ref={archivo} type="file" accept="image/png,image/jpeg" hidden
          onChange={e => { void alSubir(e.target.files?.[0]); }} />

        {edit.options.map((o, i) => (
          <div key={i} style={{
            display: "grid", gap: 10, alignItems: "end", padding: "12px 0",
            borderTop: "1px solid var(--border)",
            gridTemplateColumns: "28px minmax(140px, 1fr) minmax(200px, 1.4fr) 120px 32px",
          }}>
            <input type="radio" name="correcta" checked={o.is_correct}
              onChange={() => marcarCorrecta(i)} title="Marcar como la correcta"
              style={{ marginBottom: 12 }} />

            <div>
              <label style={S.label}>Opción {i + 1} · {o.label.length}/20</label>
              <input style={S.input} maxLength={20} value={o.label}
                onChange={e => cambiarOpcion(i, { label: e.target.value })} />
            </div>

            <div>
              <label style={S.label}>{o.is_correct ? "Acción" : "URL de destino"}</label>
              {o.is_correct
                ? <input style={{ ...S.input, background: "var(--gray-50)" }} disabled
                    value="Habilita seguir en el chat" />
                : <input style={S.input} value={o.action_url ?? ""} placeholder={urlPredefinida(i + 1)}
                    onChange={e => cambiarOpcion(i, { action_url: e.target.value })} />}
            </div>

            <div>
              <label style={S.label}>Imagen</label>
              {o.image_url
                ? <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <img src={o.image_url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />
                    <button style={{ ...S.btn, padding: "4px 8px" }}
                      onClick={() => cambiarOpcion(i, { image_url: null })}>Quitar</button>
                  </div>
                : <button style={S.btn} onClick={() => elegirImagen(i)} disabled={subiendo === i}>
                    {subiendo === i ? "Subiendo…" : "Cargar"}
                  </button>}
            </div>

            <button style={{ ...S.btn, padding: "6px 8px", color: "#EF4444" }}
              onClick={() => quitar(i)} disabled={edit.options.length <= 2}
              title={edit.options.length <= 2 ? "Hacen falta al menos 2 opciones" : "Quitar"}>✕</button>
          </div>
        ))}

        {problema && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#B45309" }}>{problema}</p>}
      </div>

      {edit.id && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {edit.enabled
            ? <button style={S.btn} disabled={ocupado || !!problema}
                onClick={() => { void guardar(false); }}>Desactivar</button>
            : <button style={{ ...S.btn, borderColor: "var(--brand-madre)" }} disabled={ocupado || !!problema}
                title={problema ?? "Guarda y la pone en uso; apaga la que estaba activa para este destinatario y teléfono"}
                onClick={() => { void guardar(true); }}>Activar esta</button>}
          <button style={S.btn} onClick={duplicar}
            title="Crea una copia apagada para probar una variante sin perder esta">Duplicar</button>
          <button style={S.btn} onClick={() => { void reiniciar(); }}
            title="Quien ya pasó o eligió vuelve a ver las opciones">Reiniciar conversaciones</button>
          <button style={{ ...S.btn, color: "#EF4444" }} onClick={() => { void eliminar(); }}>Eliminar</button>
        </div>
      )}
    </Pantalla>
  );
}
