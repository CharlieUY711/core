/**
 * Definiciones — qué existe: territorios, monedas, idiomas y la taxonomía.
 *
 * La barra, el buscador, el aviso y el ancho los define `Pantalla`, que es la
 * misma para todo el panel. Acá sólo se dice cuál es la pantalla.
 */
import { useEffect } from "react";
import { useShop } from "../components/AdminLayout";
import { usePantalla } from "../components/Pantalla";
import { Definiciones } from "../components/Definiciones";

export default function AdminDefiniciones() {
  const { setVista } = useShop();
  const p = usePantalla();

  useEffect(() => { setVista(""); }, [setVista]);

  return <Definiciones p={p} />;
}
