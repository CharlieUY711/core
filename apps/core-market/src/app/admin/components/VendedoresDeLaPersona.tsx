/**
 * En qué vendedores está una persona, y con qué rol.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ES LA MISMA RELACIÓN QUE `MiembrosDeTienda`, MIRADA AL REVÉS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Desde el vendedor se ve quién trabaja ahí. Acá se ve una persona y dónde
 * está. No es lo mismo con otro orden: es la vista que hace falta cuando
 * alguien escribe «no puedo entrar». Con la otra habría que abrir vendedor por
 * vendedor buscando en cuál figura, y si no figura en ninguno —que es la
 * respuesta— no hay forma de saberlo mirando vendedores.
 *
 * NO ES UNA SEGUNDA IMPLEMENTACIÓN
 * Escribe con las MISMAS funciones que la otra vista —`agregar_miembro`,
 * `cambiar_rol_miembro`, `sacar_miembro`—, que ya tienen su guarda. Los roles
 * salen de `ui/roles.ts`, que es de las dos. Lo único propio es de qué lado se
 * mira, que es justamente el punto.
 *
 * DE ACÁ NO SE INVITA
 * Sumar a alguien que todavía no tiene cuenta se hace desde el vendedor, que es
 * donde se sabe a cuál. Acá la persona ya existe: lo que se decide es en qué
 * vendedor entra.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";
import { Tabla, Columna, Fila, useControlDeTablas, fecha } from "./Tabla";
import { BarraDeAccionesSuelta } from "./BarraDeAcciones";
import { ROLES, nombreDeRol, QUE_PUEDE_CADA_ROL } from "../ui/roles";

interface Pertenencia {
  store_id: string;
  nombre: string;
  codigo: string;
  es_plataforma: boolean;
  activa: boolean;
  rol: string;
  es_predeterminado: boolean;
  desde: string;
}

interface VendedorElegible { id: string; nombre: string; }

export function VendedoresDeLaPersona({ userId, correo, vendedores, avisar }: {
  userId: string;
  /** El correo, que es con lo que `agregar_miembro` identifica a la persona. */
  correo: string;
  /** Todos los vendedores, para elegir a cuál sumarla. Los trae la pantalla. */
  vendedores: VendedorElegible[];
  avisar: (texto: string, ok?: boolean) => void;
}) {
  const t = useControlDeTablas();
  const [donde, setDonde] = useState<Pertenencia[]>([]);
  const [aCual, setACual] = useState("");
  const [rolNuevo, setRolNuevo] = useState("operador");
  const [ocupado, setOcupado] = useState(false);

  const traer = useCallback(async () => {
    const { data, error } = await supabase
      .rpc("vendedores_de_la_persona", { p_user_id: userId });
    if (error) { avisar(error.message, false); return; }
    setDonde((data ?? []) as Pertenencia[]);
  }, [userId, avisar]);

  useEffect(() => { void traer(); }, [traer]);

  const llamar = async (fn: string, params: Record<string, unknown>, ok: string) => {
    setOcupado(true);
    const { error } = await supabase.rpc(fn, params);
    setOcupado(false);
    /* El mensaje del servidor tal cual: explica el caso —«es el último dueño»—
       mucho mejor que un «no se pudo». */
    if (error) { avisar(error.message, false); return; }
    avisar(ok);
    await traer();
  };

  const columnas: Columna[] = [
    { id: "vendedor", label: "Vendedor" },
    { id: "rol", label: "Rol", editable: true, ancho: 140,
      opciones: ROLES, ver: f => nombreDeRol(String(f.rol)) },
    { id: "estado", label: "Estado", ancho: 90,
      /* Que un vendedor esté desactivado explica por qué alguien «no puede
         entrar» aunque figure como miembro. Sin esto habría que ir a buscarlo
         a la otra pantalla. */
      ver: f => f.activa ? "Activo" : (
        <span style={{ color: "#B45309", fontWeight: 600 }}>desactivado</span>
      ) },
    { id: "desde", label: "Desde", rastro: true, ancho: 80, ver: f => fecha(f.desde) },
  ];

  const filas: Fila[] = donde.map(d => ({
    clave: d.store_id,
    vendedor: d.nombre + (d.es_plataforma ? " · plataforma" : ""),
    rol: d.rol,
    activa: d.activa,
    desde: d.desde,
  }));

  /* Sólo los que todavía no la tienen: ofrecer uno donde ya está sería ofrecer
     algo que no hace nada. */
  const disponibles = vendedores.filter(v => !donde.some(d => d.store_id === v.id));

  const nivel = t.nivel(`pertenencias:${userId}`, {
    columnas, filas, anidada: true,
    nombreDe: f => String(f.vendedor),
    onGuardar: async (f, valores) => {
      await llamar("cambiar_rol_miembro",
        { p_store_id: f.clave, p_user_id: userId, p_rol: valores.rol },
        `En ${f.vendedor}: ahora es ${nombreDeRol(valores.rol).toLowerCase()}.`);
    },
    onBorrar: async fs => {
      for (const f of fs) {
        await llamar("sacar_miembro", { p_store_id: f.clave, p_user_id: userId },
          `${correo} ya no pertenece a ${f.vendedor}.`);
      }
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {donde.length === 0 ? (
        /* Vacío no es un error, y es la respuesta a «no puedo entrar»: se dice
           en palabras en vez de dejar una tabla en blanco. */
        <div style={{ padding: "0.9rem", fontSize: "0.82rem", color: "#B45309",
          background: "rgba(245,158,11,.12)", borderRadius: 8, fontWeight: 600 }}>
          No está en ningún vendedor. Por eso no puede entrar al panel.
        </div>
      ) : <Tabla {...nivel} />}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={aCual} onChange={e => setACual(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 0, background: "#fff",
            border: "1.5px solid var(--border)", borderRadius: 8,
            padding: "0.4rem 0.5rem", fontSize: "0.82rem" }}>
          <option value="">Sumarla a un vendedor…</option>
          {disponibles.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>

        <select value={rolNuevo} onChange={e => setRolNuevo(e.target.value)}
          style={{ border: "1.5px solid var(--border)", borderRadius: 8,
            padding: "0.4rem 0.5rem", fontSize: "0.8rem", background: "#fff" }}>
          {ROLES.map(r => <option key={r.valor} value={r.valor}>{r.label}</option>)}
        </select>

        <BarraDeAccionesSuelta acciones={[{
          label: ocupado ? "Sumando…" : "Sumar",
          color: "var(--brand-madre)",
          desactivada: ocupado || !aCual,
          motivo: disponibles.length === 0
            ? "Ya está en todos los vendedores"
            : "Elegí a cuál",
          onClick: () => {
            const v = vendedores.find(x => x.id === aCual);
            void llamar("agregar_miembro",
              { p_store_id: aCual, p_correo: correo, p_rol: rolNuevo },
              `${correo} entra a ${v?.nombre ?? "el vendedor"} como ${nombreDeRol(rolNuevo).toLowerCase()}.`)
              .then(() => setACual(""));
          },
        }]} />
      </div>

      <div style={{ fontSize: "0.74rem", color: "var(--gray-400)", lineHeight: 1.5 }}>
        {QUE_PUEDE_CADA_ROL}
      </div>
    </div>
  );
}

export default VendedoresDeLaPersona;
