/**
 * El artículo abierto DENTRO de la lista de la Biblioteca.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ADENTRO Y NO EN OTRA PANTALLA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Porque cargar un artículo es ir y venir: se escribe el nombre, se mira cómo
 * queda la fila, se corrige. Sacando al usuario de la lista se pierde de vista
 * en qué anda y con qué filtros llegó hasta ahí.
 *
 * Es la fila desplegada de `Tabla` —la misma que usan Definiciones y las tablas
 * anidadas—, no una tabla propia: la Biblioteca no tiene un modo de mostrar
 * cosas distinto del resto del panel.
 *
 * ES EL MISMO FORMULARIO DE SIEMPRE
 * `AdminArticulos`, montado acá con el artículo ya resuelto. No hay una versión
 * "de la Biblioteca" y otra "de la ruta": la segunda implementación es la que
 * queda atrás, y en esta pantalla ya pasó dos veces —el editor de pestañas de
 * Publicaciones y el formulario de cuatro campos de la ficha—.
 */
import AdminArticulos from "../pages/AdminArticulos";
import { useArticuloDeFicha } from "../hooks/useArticuloDeFicha";

const AVISO: React.CSSProperties = {
  padding: "1.6rem", textAlign: "center", color: "var(--gray-400)",
  fontSize: "0.82rem",
};

export interface ResumenDeArticulo {
  nombre: string; precio: number; moneda: string; stock: number;
  imagen: string | null; estado: string; canales: string[]; tipo: string;
}

export function ArticuloEnLinea({ fichaId, tipo, onResumen, onCerrar, onGuardado }: {
  /** La ficha que se está editando, o `undefined` para un alta. */
  fichaId?: string;
  tipo?: "market" | "secondhand";
  /** Lo que se lleva cargado, para que la fila de arriba se vaya completando. */
  onResumen?: (r: ResumenDeArticulo) => void;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { articulo, cargando, error } = useArticuloDeFicha(fichaId);

  if (cargando) return <div style={AVISO}>Cargando el artículo…</div>;
  if (error) return (
    <div style={{ ...AVISO, color: "#B91C1C" }}>
      {/* El motivo, no un "no se pudo": la ficha puede no ser de esta tienda, y
          eso se arregla distinto que un error de red. */}
      {error}
    </div>
  );

  return (
    <div style={{ background: "#fff", borderRadius: 9, border: "1px solid var(--border)" }}>
      <AdminArticulos
        key={fichaId ?? "nuevo"}
        articulo={articulo}
        tipoInicial={tipo ?? "market"}
        onResumen={onResumen}
        onCancel={onCerrar}
        onFinish={onGuardado}
      />
    </div>
  );
}
