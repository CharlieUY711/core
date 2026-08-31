/**
 * Qué herramientas y apps tiene habilitada una tienda.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SE VE TODO EL CATÁLOGO, NO SÓLO LO HABILITADO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Para poder prender algo hay que verlo apagado primero. Mostrar únicamente lo
 * habilitado es la misma trampa que ya corregimos dos veces hoy: una marca que
 * esconde la fila de la única pantalla desde la que se podría cambiar.
 *
 * LAS FUNCIONALIDADES NO ESTÁN ACÁ
 * Una funcionalidad es una pantalla —la Biblioteca, los Pedidos— y es parte del
 * producto: la tiene todo el mundo. Apagársela a una tienda sería venderle un
 * producto distinto, no configurar el mismo.
 *
 * ES LA TABLA DEL PANEL
 * Anidada, adentro de la fila de su tienda. Y sin las cuatro acciones: acá no
 * se agrega ni se borra nada — el catálogo lo define CORE Market en Herramientas
 * y Apps—, sólo se prende y se apaga.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";
import { Tabla, Columna, Fila, useControlDeTablas } from "./Tabla";

interface AppDeTienda {
  codigo: string;
  tipo: string;
  nombre: string;
  icono: string | null;
  para: string | null;
  vault_platforms: string[] | null;
  habilitada: boolean;
  /** No se puede apagar: es parte del producto o hace falta para operar. */
  obligatoria: boolean;
}

/* Los cuatro. Una CAPACIDAD no es una herramienta: no es un servicio, es
   permiso para gastar el que ya existe — y esa diferencia es la que importa
   cuando se factura. */
const TIPO: Record<string, string> = {
  funcionalidad: "Funcionalidad",
  capacidad:     "Capacidad",
  herramienta:   "Herramienta",
  app:           "App",
};

export function AppsDeTienda({ storeId, avisar }: {
  storeId: string;
  avisar: (texto: string, ok?: boolean) => void;
}) {
  const t = useControlDeTablas();
  const [apps, setApps] = useState<AppDeTienda[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const traer = useCallback(async () => {
    const { data, error } = await supabase.rpc("apps_de_tienda", { p_store_id: storeId });
    if (error) { avisar(error.message, false); return; }
    setApps((data ?? []) as AppDeTienda[]);
  }, [storeId, avisar]);

  useEffect(() => { void traer(); }, [traer]);

  const alternar = async (a: AppDeTienda) => {
    setOcupado(a.codigo);
    const { error } = await supabase.rpc("habilitar_app_de_tienda", {
      p_store_id: storeId, p_codigo: a.codigo, p_habilitada: !a.habilitada,
    });
    setOcupado(null);
    if (error) { avisar(error.message, false); return; }
    avisar(`${a.nombre}: ${a.habilitada ? "apagada" : "habilitada"}.`);
    await traer();
  };

  const columnas: Columna[] = [
    { id: "nombre", label: "Qué", ancho: 170 },
    { id: "para",   label: "Para qué" },
    { id: "tipo",   label: "Tipo", ancho: 90 },
    { id: "necesaria", label: "", ancho: 100,
      chip: f => (f.app as AppDeTienda).obligatoria
        ? { tono: "neutro" as const, texto: "SIEMPRE" }
        : null },
    {
      id: "habilitada", label: "Habilitada", ancho: 90,
      ver: f => {
        const a = f.app as AppDeTienda;
        /* Una obligatoria se ve marcada y NO se puede tocar, con el motivo al
           pasar el mouse. El servidor la rechaza igual —una pantalla se puede
           saltear— pero enterarse por un error después de haber apretado es
           enterarse tarde. */
        return (
          <input type="checkbox" checked={a.habilitada}
            disabled={ocupado !== null || a.obligatoria}
            title={a.obligatoria
              ? "No se puede apagar: hace falta para que el vendedor funcione"
              : undefined}
            onChange={() => { if (!a.obligatoria) void alternar(a); }}
            style={{ accentColor: "var(--brand-madre)" }} />
        );
      },
    },
  ];

  const filas: Fila[] = apps.map(a => ({
    clave: a.codigo,
    nombre: a.nombre,
    para: a.para ?? "",
    tipo: TIPO[a.tipo] ?? a.tipo,
    necesaria: "",
    app: a,
  }));

  /* Sin las cuatro acciones: acá no se crea, no se edita y no se borra. El
     catálogo lo define CORE Market en Herramientas y Apps; acá sólo se decide
     quién lo usa. */
  const nivel = t.nivel(`apps:${storeId}`, {
    columnas, filas, anidada: true,
    nombreDe: f => String(f.nombre),
    inactiva: f => !(f.app as AppDeTienda).habilitada,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Tabla {...nivel} />
      <div style={{ fontSize: "0.74rem", color: "var(--gray-400)", lineHeight: 1.5 }}>
        <b>Funcionalidad</b>: una pantalla del producto, la tiene toda tienda.
        {" "}<b>Capacidad</b>: lo que consume servicios que se cobran distinto.
        {" "}<b>Herramienta</b>: un servicio que trabaja adentro de otra pantalla.
        {" "}<b>App</b>: un sistema de terceros con tu cuenta del otro lado.
        {" "}Lo marcado <b>SIEMPRE</b> no se apaga: sin cotización, por ejemplo,
        un precio en otra moneda no se puede convertir.
      </div>
    </div>
  );
}

export default AppsDeTienda;
