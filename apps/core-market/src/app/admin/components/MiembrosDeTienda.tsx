/**
 * Quiénes trabajan en una tienda, y hasta dónde puede cada uno.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTO NO EXISTÍA Y HACÍA FALTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La pantalla dejaba cambiar «el dueño» y nada más, así que una tienda tenía
 * exactamente una persona. Un comercio con dos —quien atiende y quien
 * factura— no se podía armar. Y todas podían todo, porque no había roles.
 *
 * ES LA TABLA DEL PANEL, ANIDADA
 * Misma tabla que todo el resto, adentro de la fila de su tienda: los miembros
 * son de esa tienda, no una lista aparte que después hay que cruzar.
 *
 * EL ROL SE ELIGE EN LA CELDA
 * Con `opciones`, como cualquier otra columna que se edita. Tres valores y
 * ninguno se escribe: un rol tipeado a mano sería un rol que no existe.
 *
 * LO QUE NO SE PUEDE, NO SE PUEDE ACÁ TAMPOCO
 * El servidor impide dejar una tienda sin dueño —si no, queda viva, con gente
 * adentro y sin nadie que pueda dar de alta a nadie—. Acá se dice ANTES, con
 * el botón apagado y el motivo: enterarse por un error del servidor es
 * enterarse tarde.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";
import { Tabla, Columna, Fila, useControlDeTablas, fecha } from "./Tabla";
import { BarraDeAccionesSuelta } from "./BarraDeAcciones";
import { ROLES, nombreDeRol, QUE_PUEDE_CADA_ROL } from "../ui/roles";

interface Miembro {
  user_id: string;
  correo: string;
  rol: string;
  es_predeterminada: boolean;
  desde: string;
}

export function MiembrosDeTienda({ storeId, avisar, puedeAdministrar = true }: {
  storeId: string;
  avisar: (texto: string, ok?: boolean) => void;
  /**
   * Si quien mira puede tocar esto.
   *
   * Lo decide el servidor —`puede_administrar_miembros`: la plataforma o el
   * dueño de ese vendedor— y viaja con los datos del vendedor. Acá sólo se
   * apaga con el motivo: un operador que ve los botones encendidos se entera de
   * que no puede recién cuando el servidor lo rechaza.
   */
  puedeAdministrar?: boolean;
}) {
  const t = useControlDeTablas();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [correo, setCorreo] = useState("");
  const [rolNuevo, setRolNuevo] = useState("operador");
  const [ocupado, setOcupado] = useState(false);

  const traer = useCallback(async () => {
    const { data, error } = await supabase.rpc("miembros_de_tienda", { p_store_id: storeId });
    if (error) { avisar(error.message, false); return; }
    setMiembros((data ?? []) as Miembro[]);
  }, [storeId, avisar]);

  useEffect(() => { void traer(); }, [traer]);

  /* Cuántos dueños hay: de eso depende si se puede sacar o degradar a uno.
     El servidor lo impide igual; acá se dice antes. */
  const duenios = miembros.filter(m => m.rol === "duenio").length;

  /**
   * Sumar a alguien, tenga cuenta o no.
   *
   * UNA SOLA PUERTA. Quien la usa no tiene que averiguar antes si la persona ya
   * está registrada: escribe el correo y el servidor resuelve —la agrega si
   * existe, la invita si no—. Con dos botones habría que elegir uno antes de
   * saber cuál corresponde, y elegir mal devuelve un error que no explica nada.
   */
  const sumar = async () => {
    setOcupado(true);
    const { data, error } = await supabase.functions.invoke("invitar-persona", {
      body: {
        correo: correo.trim(), store_id: storeId, rol: rolNuevo,
        // A dónde vuelve quien acepta la invitación: al panel, no a la raíz.
        volver_a: `${window.location.origin}/admin`,
      },
    });
    setOcupado(false);

    const detalle = (data as { error?: string; mensaje?: string } | null);
    if (error || detalle?.error) {
      avisar(detalle?.error ?? error!.message, false);
      return;
    }
    avisar(detalle?.mensaje ?? "Listo.");
    setCorreo("");
    await traer();
  };

  const llamar = async (fn: string, params: Record<string, unknown>, ok: string) => {
    setOcupado(true);
    const { error } = await supabase.rpc(fn, params);
    setOcupado(false);
    /* El mensaje del servidor tal cual: explica el caso —"es el último dueño"—
       mucho mejor que un "no se pudo". */
    if (error) { avisar(error.message, false); return; }
    avisar(ok);
    await traer();
  };

  const columnas: Columna[] = [
    { id: "correo", label: "Persona" },
    {
      id: "rol", label: "Rol", editable: true, ancho: 130,
      opciones: ROLES,
      ver: f => nombreDeRol(String(f.rol)),
    },
    { id: "desde", label: "Desde", rastro: true, ancho: 80, ver: f => fecha(f.desde) },
  ];

  const filas: Fila[] = miembros.map(m => ({
    clave: m.user_id,
    correo: m.correo,
    rol: m.rol,
    desde: m.desde,
    esUltimoDuenio: m.rol === "duenio" && duenios === 1,
  }));

  const nivel = t.nivel(`miembros:${storeId}`, {
    columnas, filas, anidada: true,
    nombreDe: f => String(f.correo),
    /* Sin permiso no se ofrecen: `onGuardar` y `onBorrar` ausentes apagan los
       botones de la barra, que es el mismo mecanismo de toda tabla. */
    onGuardar: !puedeAdministrar ? undefined : async (f, valores) => {
      await llamar("cambiar_rol_miembro",
        { p_store_id: storeId, p_user_id: f.clave, p_rol: valores.rol },
        `${f.correo}: ahora es ${nombreDeRol(valores.rol).toLowerCase()}.`);
    },
    onBorrar: !puedeAdministrar ? undefined : async fs => {
      /* Se frena acá con el motivo, en vez de mandar la llamada y mostrar el
         error del servidor: es la misma respuesta, pero antes. */
      if (fs.some(f => f.esUltimoDuenio)) {
        avisar("Es el último dueño: el vendedor quedaría sin nadie que pueda administrarlo.", false);
        return;
      }
      for (const f of fs) {
        await llamar("sacar_miembro", { p_store_id: storeId, p_user_id: f.clave },
          `${f.correo} ya no pertenece a este vendedor.`);
      }
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <Tabla {...nivel} />

      {/* Sumar a alguien: si ya tiene cuenta se agrega, y si no se le manda una
          invitación. Antes había que pedirle que se registrara solo, esperar, y
          recordar volver a agregarlo — con el agravante de que quien invitaba
          no se enteraba de si el otro había llegado a hacerlo. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={correo}
          onChange={e => setCorreo(e.target.value)}
          disabled={!puedeAdministrar}
          placeholder="correo — si no tiene cuenta, se la invita"
          style={{ flex: "1 1 220px", minWidth: 0,
            border: "1.5px solid var(--border)", borderRadius: 8,
            padding: "0.4rem 0.65rem", fontSize: "0.82rem", outline: "none" }} />

        <select value={rolNuevo} onChange={e => setRolNuevo(e.target.value)}
          style={{ border: "1.5px solid var(--border)", borderRadius: 8,
            padding: "0.4rem 0.5rem", fontSize: "0.8rem", background: "#fff" }}>
          {ROLES.map(r => <option key={r.valor} value={r.valor}>{r.label}</option>)}
        </select>

        <BarraDeAccionesSuelta acciones={[{
          label: ocupado ? "Sumando…" : "Sumar persona",
          color: "var(--brand-madre)",
          desactivada: ocupado || !correo.trim() || !puedeAdministrar,
          motivo: !puedeAdministrar
            ? "Sólo el dueño agrega personas"
            : "Escribí el correo",
          onClick: () => { void sumar(); },
        }]} />
      </div>

      <div style={{ fontSize: "0.74rem", color: "var(--gray-400)", lineHeight: 1.5 }}>
        Si la persona no tiene cuenta, le llega una invitación por correo y
        entra directo a este vendedor.{" "}
        {QUE_PUEDE_CADA_ROL}
      </div>
    </div>
  );
}

export default MiembrosDeTienda;
