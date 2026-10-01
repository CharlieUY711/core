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
import {
  waGateService, normalizarNumero, urlPredefinida, validar,
} from "../meta-social/services/waGateService";
import type { WaGate, WaGateDraft, WaGateOption } from "../meta-social/types/waGate.types";

const opcionVacia = (n: number): WaGateOption => ({
  position: n, label: "", is_correct: false, action_url: urlPredefinida(n + 1), image_url: null,
});

const gateVacio = (): WaGateDraft => ({
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

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-gate`;
  const numeroConectado = wa.phoneNumber?.display_phone_number;
  const problema = useMemo(() => validar(edit), [edit]);

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
  const guardar = async () => {
    setOcupado(true);
    try {
      const id = await waGateService.guardar(edit);
      p.avisar("Guardado.");
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
      setEdit(gateVacio());
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
    { label: "Nuevo", onClick: () => setEdit(gateVacio()) },
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
          <p style={S.sub}>Elegí una para editarla.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {gates.map(g => (
              <button key={g.id} onClick={() => setEdit(g)}
                style={{ ...S.btn, ...(edit.id === g.id ? { borderColor: "var(--brand-madre)" } : {}) }}>
                {g.recipient_label || `+${g.recipient}`} · {g.enabled ? "activa" : "apagada"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Destinatario ───────────────────────────────────────────────── */}
      <div style={S.card}>
        <h3 style={S.h3}>Destinatario</h3>
        <p style={S.sub}>Sólo este número ve las opciones cuando escribe al WhatsApp conectado.</p>
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
          Activa (responde automáticamente a este número)
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
          <button style={S.btn} onClick={() => { void reiniciar(); }}
            title="Quien ya pasó o eligió vuelve a ver las opciones">Reiniciar conversaciones</button>
          <button style={{ ...S.btn, color: "#EF4444" }} onClick={() => { void eliminar(); }}>Eliminar</button>
        </div>
      )}
    </Pantalla>
  );
}
