/**
 * Herramientas y Apps.
 *
 * La vista es `CatalogoDeApps`, la misma que usa el configurador de CORE
 * Market. Acá se mira; allá se mira y se decide. Que sean dos componentes
 * distintos era garantizar que con el tiempo mostraran cosas distintas.
 */
import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase/client";
import { useShop } from "../components/AdminLayout";
import { usePantalla } from "../components/Pantalla";
import { CatalogoDeApps } from "../components/CatalogoDeApps";

export default function AdminAplicaciones() {
  const { setVista } = useShop();
  const p = usePantalla();

  /*
   * Para CORE Market, esta MISMA pantalla es el configurador: aparecen los
   * interruptores. Antes estaba también como sección del Dashboard, con la
   * misma vista — dos lugares para lo mismo, que es lo que veníamos sacando.
   */
  const [esPlataforma, setEsPlataforma] = useState(false);
  useEffect(() => {
    supabase.rpc("soy_la_plataforma").then(({ data, error }) => {
      if (!error) setEsPlataforma(data === true);
    });
  }, []);

  // La barra de arriba ya dice "Herramientas y Apps" por el módulo: repetirlo
  // como sección daria "Herramientas y Apps · Herramientas y Apps".
  useEffect(() => { setVista(""); }, [setVista]);

  return <CatalogoDeApps p={p} configurable={esPlataforma} />;
}
