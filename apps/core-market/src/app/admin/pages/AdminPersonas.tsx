/**
 * Las personas que administran tiendas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ES LA MISMA INFORMACIÓN QUE TIENDAS, MIRADA AL REVÉS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Desde Tiendas se ve una tienda y quiénes trabajan en ella. Desde acá se ve
 * una persona y en qué tiendas está.
 *
 * No es lo mismo con otro orden: es la vista que hace falta cuando alguien
 * escribe «no puedo entrar». Con la otra habría que abrir tienda por tienda
 * buscando en cuál figura, y si no figura en ninguna —que es la respuesta— no
 * hay forma de saberlo mirando tiendas.
 *
 * SE MIRA, NO SE CAMBIA
 * Agregar o sacar a alguien se hace en SU tienda, que es donde el cambio tiene
 * sentido: «sacar a Ana» sin decir de dónde no quiere decir nada. Por eso acá
 * no hay ninguna de las cuatro acciones, y el doble clic lleva a la tienda.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import { useShop } from "../components/AdminLayout";
import { Pantalla, usePantalla } from "../components/Pantalla";
import { Tabla, Columna, Fila, fecha } from "../components/Tabla";

interface Persona {
  user_id: string;
  correo: string;
  tiendas: number;
  roles: string | null;
  nombres: string | null;
  desde: string;
  ultimo_acceso: string | null;
}

const ROL = {
  duenio: "Dueño", administrador: "Administrador", operador: "Operador",
} as Record<string, string>;

/** «duenio · operador» → «Dueño · Operador». */
const rolesLegibles = (r: string | null) =>
  (r ?? "").split(" · ").filter(Boolean).map(x => ROL[x] ?? x).join(" · ") || "—";

export default function AdminPersonas() {
  const navegar = useNavigate();
  const p = usePantalla();
  const { setVista, setTopStats } = useShop();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busca, setBusca] = useState("");
  const [error, setError] = useState<string | null>(null);

  const traer = useCallback(async () => {
    const { data, error } = await supabase.rpc("personas_de_la_plataforma");
    setCargando(false);
    if (error) { setError(error.message); return; }
    setError(null);
    setPersonas((data ?? []) as Persona[]);
  }, []);

  useEffect(() => { void traer(); }, [traer]);

  /*
   * Dos contadores, y el segundo es el que importa: alguien que nunca entró
   * puede ser una invitación que no llegó, un correo mal escrito o una cuenta
   * que nadie usó. Sin contarlo, eso no se descubre hasta que la persona
   * reclama.
   */
  const nuncaEntraron = personas.filter(x => !x.ultimo_acceso).length;

  useEffect(() => {
    setVista("");
    setTopStats([
      { label: "Personas", value: personas.length, color: "#fff" },
      { label: "Nunca entraron", value: nuncaEntraron,
        color: nuncaEntraron > 0 ? "#F5C542" : "#4ADE80" },
    ]);
    return () => { setTopStats([]); setVista(""); };
  }, [personas.length, nuncaEntraron, setTopStats, setVista]);

  const q = busca.trim().toLowerCase();
  const visibles = !q ? personas : personas.filter(x =>
    `${x.correo} ${x.nombres ?? ""}`.toLowerCase().includes(q));

  const columnas: Columna[] = [
    { id: "correo", label: "Persona", ancho: 240 },
    { id: "tiendas_txt", label: "En qué vendedores" },
    { id: "roles", label: "Rol", ancho: 160 },
    { id: "cuantas", label: "Vendedores", numero: true, esUso: true, ancho: 70 },
    { id: "acceso", label: "Último acceso", rastro: true, ancho: 100,
      /* Se dice «nunca» y no se deja vacío: un hueco parece un dato que falta,
         y esto es un dato que está y dice algo. */
      ver: f => f.acceso ? fecha(f.acceso) : (
        <span style={{ color: "#B45309", fontWeight: 600 }}>nunca</span>
      ) },
    { id: "desde", label: "Desde", rastro: true, ancho: 80, ver: f => fecha(f.desde) },
  ];

  const filas: Fila[] = visibles.map(x => ({
    clave: x.user_id,
    correo: x.correo,
    tiendas_txt: x.nombres ?? "—",
    roles: rolesLegibles(x.roles),
    cuantas: x.tiendas,
    acceso: x.ultimo_acceso,
    desde: x.desde,
    persona: x,
  }));

  /* Sin las cuatro acciones: acá se mira. Agregar o sacar a alguien se hace en
     SU tienda —«sacar a Ana» sin decir de dónde no quiere decir nada—. */
  const nivel = p.tablas.nivel("personas", {
    columnas, filas,
    nombreDe: f => String(f.correo),
    onAbrir: () => navegar("/admin/tiendas"),
  });

  return (
    <Pantalla p={p}
      buscador={{ valor: busca, onCambio: setBusca }}
      explicacion="Quiénes operan a los vendedores, en cuáles y con qué rol. Se agrega y se saca desde cada uno."
      error={error}
      notificaciones={nuncaEntraron === 0 ? [] : [{
        tono: "atencion",
        texto: nuncaEntraron === 1
          ? "1 persona nunca entró: puede ser un correo mal escrito o una invitación que no llegó."
          : `${nuncaEntraron} personas nunca entraron: pueden ser correos mal escritos o invitaciones que no llegaron.`,
      }]}>

      {cargando ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--gray-400)" }}>
          Cargando…
        </div>
      ) : personas.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--gray-400)" }}>
          Todavía no hay nadie en ninguna tienda.
        </div>
      ) : (
        <Tabla {...nivel} />
      )}
    </Pantalla>
  );
}
